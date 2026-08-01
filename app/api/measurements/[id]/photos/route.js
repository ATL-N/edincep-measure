// GET /api/measurements/[id]/photos — photos (and what the estimator saw)
// for one measurement. Only the designer who owns the measurement (and is
// still linked to the client) or an admin may see them.
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { requireStaff, canAccessClient } from "@/lib/authz";
import { savePhotoFromForm } from "@/lib/photo-storage";
import { isRateLimited } from "@/app/lib/rate-limiter";

export async function GET(request, { params }) {
  const { user, error } = await requireStaff(request, { requireActive: false });
  if (error) return error;
  const { id } = await params;

  const measurement = await prisma.measurement.findUnique({
    where: { id },
    select: { id: true, clientId: true, creatorId: true },
  });
  const allowed =
    measurement &&
    (user.role === "ADMIN" ||
      (measurement.creatorId === user.id && (await canAccessClient(user, measurement.clientId))));
  if (!allowed) return NextResponse.json({ error: "Measurement not found" }, { status: 404 });

  const photos = await prisma.measurementPhoto.findMany({
    where: { measurementId: id },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    select: { id: true, kind: true, width: true, height: true, analysis: true, createdAt: true, shareLinkId: true },
  });

  return NextResponse.json({
    photos: photos.map(({ shareLinkId, ...p }) => ({
      ...p,
      takenBy: shareLinkId ? "client" : "designer",
      url: `/api/measurement-photos/${p.id}`,
    })),
  });
}

// POST /api/measurements/[id]/photos — the app uploads a photo taken (maybe
// offline) for "measure from photos", after the measurement itself synced.
export async function POST(request, { params }) {
  try {
    const { user, error } = await requireStaff(request);
    if (error) return error;
    const { id } = await params;
    const measurement = await prisma.measurement.findUnique({
      where: { id },
      select: { id: true, clientId: true, creatorId: true },
    });
    const allowed =
      measurement &&
      (user.role === "ADMIN" ||
        (measurement.creatorId === user.id && (await canAccessClient(user, measurement.clientId))));
    if (!allowed) return NextResponse.json({ error: "Measurement not found" }, { status: 404 });

    const limit = await isRateLimited(`designer_photo:${user.id}`, 40, 60 * 60);
    if (limit.isLimited) {
      return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
    }
    // At most a handful of photos per measurement (front/side, retakes).
    const existing = await prisma.measurementPhoto.count({ where: { measurementId: id } });
    if (existing >= 6) {
      return NextResponse.json({ error: "Photo limit reached for this measurement." }, { status: 429 });
    }

    const { photo, error: uploadError } = await savePhotoFromForm(request, {
      clientId: measurement.clientId,
      uploadedById: user.id,
      measurementId: id,
    });
    if (uploadError) return uploadError;
    return NextResponse.json(photo, { status: 201 });
  } catch (e) {
    console.error("Measurement photo upload failed:", e);
    return NextResponse.json({ error: "Could not upload the photo." }, { status: 500 });
  }
}
