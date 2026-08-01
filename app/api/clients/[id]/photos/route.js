// POST /api/clients/[id]/photos — a designer uploads a FRONT/SIDE photo of a
// client while measuring from photos. Attached to the measurement on save.
import { NextResponse } from "next/server";
import { requireStaff, canAccessClient } from "@/lib/authz";
import { savePhotoFromForm } from "@/lib/photo-storage";
import { isRateLimited } from "@/app/lib/rate-limiter";

export async function POST(request, { params }) {
  try {
    const { user, error } = await requireStaff(request);
    if (error) return error;
    const { id: clientId } = await params;
    if (!(await canAccessClient(user, clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const limit = await isRateLimited(`designer_photo:${user.id}`, 40, 60 * 60);
    if (limit.isLimited) {
      return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
    }
    const { photo, error: uploadError } = await savePhotoFromForm(request, { clientId, uploadedById: user.id });
    if (uploadError) return uploadError;
    return NextResponse.json(photo, { status: 201 });
  } catch (e) {
    console.error("Designer photo upload failed:", e);
    return NextResponse.json({ error: "Could not upload the photo." }, { status: 500 });
  }
}
