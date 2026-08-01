// lib/photo-storage.js
// Private storage for body photos (Backblaze B2 via the S3 API).
// Photos are never given public URLs: they are stored under random keys and
// only streamed back through authenticated API routes.
import crypto from "crypto";
import S3 from "aws-sdk/clients/s3";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { sanitizeImage, ImageRejected } from "@/lib/image-safety";

let s3;
const client = () =>
  (s3 ??= new S3({
    endpoint: `https://s3.${process.env.B2_BUCKET_REGION}.backblazeb2.com`,
    accessKeyId: process.env.B2_APPLICATION_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
    signatureVersion: "v4",
  }));

export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const PHOTO_KINDS = ["FRONT", "SIDE"];
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Identify JPEG/PNG/WEBP from the file's bytes (never trust the filename). */
export function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Validates a multipart upload (fields: file, kind, analysis, width, height)
 * and stores it. Returns { photo } or { error: NextResponse }.
 */
export async function savePhotoFromForm(request, { clientId, shareLinkId = null, uploadedById = null, measurementId = null }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return { error: NextResponse.json({ error: "Expected a photo upload." }, { status: 400 }) };
  }
  const file = form.get("file");
  const kind = String(form.get("kind") || "").toUpperCase();
  if (!PHOTO_KINDS.includes(kind)) {
    return { error: NextResponse.json({ error: "kind must be FRONT or SIDE." }, { status: 400 }) };
  }
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return { error: NextResponse.json({ error: "No photo uploaded." }, { status: 400 }) };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: NextResponse.json({ error: "Photo is too large (max 6 MB)." }, { status: 413 }) };
  }
  const raw = Buffer.from(await file.arrayBuffer());
  if (!sniffImageType(raw)) {
    return { error: NextResponse.json({ error: "Only JPEG, PNG or WEBP photos are allowed." }, { status: 415 }) };
  }
  // Decode + re-encode: strips hidden payloads and metadata, blocks pixel bombs.
  let clean;
  try {
    clean = await sanitizeImage(raw, { maxSide: 2048 });
  } catch (e) {
    if (e instanceof ImageRejected) {
      return { error: NextResponse.json({ error: e.message }, { status: 415 }) };
    }
    throw e;
  }
  const { buffer, contentType } = clean;

  let analysis = null;
  const rawAnalysis = form.get("analysis");
  if (typeof rawAnalysis === "string" && rawAnalysis.length > 0) {
    if (rawAnalysis.length > 50_000) {
      return { error: NextResponse.json({ error: "Analysis data too large." }, { status: 413 }) };
    }
    try {
      analysis = JSON.parse(rawAnalysis);
    } catch {
      analysis = null;
    }
  }
  const toInt = (v) => {
    const n = parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) && n > 0 && n < 20000 ? n : null;
  };

  const storageKey = `body-photos/${clientId}/${Date.now()}-${crypto.randomUUID()}.${EXT[contentType]}`;
  await client()
    .putObject({ Bucket: process.env.B2_BUCKET_NAME, Key: storageKey, Body: buffer, ContentType: contentType })
    .promise();

  const photo = await prisma.measurementPhoto.create({
    data: {
      clientId,
      shareLinkId,
      uploadedById,
      measurementId,
      kind,
      storageKey,
      contentType,
      // Real dimensions of what we stored (the client-sent ones are only hints).
      width: clean.width ?? toInt(form.get("width")),
      height: clean.height ?? toInt(form.get("height")),
      analysis,
    },
    select: { id: true, kind: true },
  });
  return { photo };
}

/** Streams a stored photo back as an HTTP response. */
export async function photoResponse(photo) {
  const obj = await client()
    .getObject({ Bucket: process.env.B2_BUCKET_NAME, Key: photo.storageKey })
    .promise();
  return new NextResponse(obj.Body, {
    status: 200,
    headers: {
      "Content-Type": photo.contentType,
      // Private: may be cached by the viewer's browser, never by shared caches.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // Defence in depth: even if opened directly, the response can't run
      // scripts or be treated as a document.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      "Content-Disposition": `inline; filename="photo-${photo.id}.jpg"`,
      "Cross-Origin-Resource-Policy": "same-site",
    },
  });
}

/**
 * Attaches uploaded photos to a measurement. Only photos matching `owner`
 * (same share link, or uploaded by the same designer for the same client)
 * and not yet attached elsewhere are linked.
 */
export async function attachPhotos(photoIds, measurementId, owner) {
  if (!Array.isArray(photoIds) || photoIds.length === 0) return 0;
  const ids = photoIds.filter((x) => typeof x === "string").slice(0, 10);
  const res = await prisma.measurementPhoto.updateMany({
    where: { id: { in: ids }, measurementId: null, ...owner },
    data: { measurementId },
  });
  return res.count;
}
