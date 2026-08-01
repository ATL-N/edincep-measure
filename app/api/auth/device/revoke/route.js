// POST /api/auth/device/revoke  { deviceToken }
// Called on logout so the device can no longer renew its session.
import { NextResponse } from "next/server";
import { revokeDeviceToken } from "@/lib/device-auth";

export async function POST(request) {
  try {
    const { deviceToken } = await request.json();
    await revokeDeviceToken(deviceToken);
  } catch {}
  return NextResponse.json({ ok: true });
}
