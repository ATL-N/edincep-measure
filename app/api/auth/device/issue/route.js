// POST /api/auth/device/issue
// Called right after login. Requires a valid session; returns a long-lived
// device token the app stores securely to renew the session later.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { issueDeviceToken } from "@/lib/device-auth";

export async function POST(request) {
  const user = await getCurrentUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status && user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account inactive" }, { status: 403 });
  }
  let deviceName;
  try {
    ({ deviceName } = await request.json());
  } catch {}
  const { deviceToken, expiresAt } = await issueDeviceToken(user.id, { deviceName });
  return NextResponse.json({ deviceToken, expiresAt });
}
