// POST /api/auth/device/refresh  { deviceToken }
// Exchanges a device token for a fresh session cookie + a rotated token.
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { isRateLimited } from "@/app/lib/rate-limiter";
import { rotateDeviceToken, setSessionCookie, clientIp } from "@/lib/device-auth";

export async function POST(request) {
  const ip = clientIp(request);
  const limit = await isRateLimited(`device_refresh:${ip}`, 30, 10 * 60);
  if (limit.isLimited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let deviceToken;
  try {
    ({ deviceToken } = await request.json());
  } catch {}

  const result = await rotateDeviceToken(deviceToken);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { user } = result;
  try {
    await prisma.log.create({
      data: {
        userId: user.id,
        action: "SESSION_RENEWED_DEVICE",
        ipAddress: ip,
        os: request.headers.get("user-agent"),
      },
    });
  } catch {}

  const response = NextResponse.json({
    deviceToken: result.deviceToken,
    expiresAt: result.expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      status: user.status,
      measurementUnit: user.measurementUnit,
    },
  });
  return setSessionCookie(response, user);
}
