// app/api/upload/route.js

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import S3 from "aws-sdk/clients/s3";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });


const prisma = new PrismaClient();

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

    const data = await request.formData();
    const file = data.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${Date.now()}-${file.name}`;

    // Upload to Backblaze B2
    const params = {
      Bucket: process.env.B2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
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