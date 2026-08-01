// app/api/upload/route.js

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";
import S3 from "aws-sdk/clients/s3";
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { sanitizeImage, ImageRejected } from "@/lib/image-safety";
import { isRateLimited } from "@/app/lib/rate-limiter";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heif": "heif",
};

// Identify the real image type from the file's magic bytes rather than
// trusting the client-supplied Content-Type or filename.
const sniffImageType = (buf) => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
};

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Configure AWS S3 client for Backblaze B2
const s3 = new S3({
  endpoint: `https://s3.${process.env.B2_BUCKET_REGION}.backblazeb2.com`,
  accessKeyId: process.env.B2_APPLICATION_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  signatureVersion: "v4",
});

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser ||
      (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") ||
      currentUser.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Limit upload volume per user (storage / processing abuse).
    const limit = await isRateLimited(`upload:${currentUser.id}`, 60, 60 * 60);
    if (limit.isLimited) {
      return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
    }

    const data = await request.formData();
    const file = data.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Invalid file." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large (max 8 MB)." }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedType = sniffImageType(buffer);
    if (!detectedType || !ALLOWED_TYPES[detectedType]) {
      return NextResponse.json({ error: "Only JPEG, PNG or WEBP images are allowed." }, { status: 415 });
    }

    // Decode + re-encode to a fresh JPEG: strips hidden payloads (polyglots),
    // EXIF/GPS metadata and decoder exploits; rejects pixel bombs.
    let clean;
    try {
      clean = await sanitizeImage(buffer, { maxSide: 2560 });
    } catch (e) {
      if (e instanceof ImageRejected) {
        return NextResponse.json({ error: e.message }, { status: 415 });
      }
      throw e;
    }

    // Server-generated name: never trust the uploaded filename.
    const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`;

    // Upload to Backblaze B2
    const params = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: filename,
      Body: clean.buffer,
      ContentType: clean.contentType,
    };

    await s3.upload(params).promise();

    const fileUrl = `${process.env.B2_BUCKET_URL}/${filename}`;

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "FILE_UPLOAD",
        ipAddress,
        os,
        details: {
          filename: file.name,
          filePath: fileUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      path: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}