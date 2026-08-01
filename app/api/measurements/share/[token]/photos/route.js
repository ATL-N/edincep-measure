// POST /api/measurements/share/[token]/photos
// Public (token-protected): the client uploads a FRONT or SIDE photo while
// filling in their measurement form. Photos are attached to the measurement
// when the form is submitted.
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isRateLimited } from "@/app/lib/rate-limiter";
import { savePhotoFromForm } from "@/lib/photo-storage";

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
    const limit = await isRateLimited(`share_photo:${token}:${ip}`, 12, 60 * 60);
    if (limit.isLimited) {
      return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
    }

    const link = await prisma.measurementShareLink.findUnique({ where: { token } });
    if (!link) return NextResponse.json({ error: "Share link not found or invalid." }, { status: 404 });

    const now = new Date();
    const open = link.measurementId
      ? link.updateWindowEnd && link.updateWindowEnd >= now
      : link.expiresAt >= now;
    if (!open) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

    // A leaked link must not become free storage: cap photos per link.
    const already = await prisma.measurementPhoto.count({ where: { shareLinkId: link.id } });
    if (already >= 20) {
      return NextResponse.json({ error: "Photo limit reached for this link." }, { status: 429 });
    }

    const { photo, error } = await savePhotoFromForm(req, { clientId: link.clientId, shareLinkId: link.id });
    if (error) return error;
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Share photo upload failed:", error);
    return NextResponse.json({ error: "Could not upload the photo." }, { status: 500 });
  }
}
