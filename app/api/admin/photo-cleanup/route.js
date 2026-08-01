// POST /api/admin/photo-cleanup?dryRun=1 — run the abandoned-photo cleanup now
// (admins only). It also runs automatically every 6 hours.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { runPhotoCleanup } from "@/lib/photo-cleanup";

export async function POST(request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  try {
    const report = await runPhotoCleanup({ dryRun });
    return NextResponse.json({ dryRun, report });
  } catch (e) {
    console.error("Manual photo cleanup failed:", e);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
