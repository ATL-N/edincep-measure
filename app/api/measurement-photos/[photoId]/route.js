// GET /api/measurement-photos/[photoId] — streams one body photo.
// Access: the designer who owns the measurement (still linked to the client),
// the designer who uploaded a not-yet-saved photo, or an admin.
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { requireStaff, canAccessClient } from "@/lib/authz";
import { photoResponse } from "@/lib/photo-storage";

export async function GET(request, { params }) {
  try {
    const { user, error } = await requireStaff(request, { requireActive: false });
    if (error) return error;
    const { photoId } = await params;

    const photo = await prisma.measurementPhoto.findUnique({
      where: { id: photoId },
      include: { measurement: { select: { creatorId: true } } },
    });
    if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

    let allowed = user.role === "ADMIN";
    if (!allowed && (await canAccessClient(user, photo.clientId))) {
      allowed = photo.measurement
        ? photo.measurement.creatorId === user.id
        : photo.uploadedById === user.id;
    }
    if (!allowed) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

    return await photoResponse(photo);
  } catch (e) {
    console.error("Photo fetch failed:", e);
    return NextResponse.json({ error: "Could not load the photo." }, { status: 500 });
  }
}
