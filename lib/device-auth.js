// lib/device-auth.js
// "Remember this device" support for the Flutter app (Android, iOS and PWA).
//
// Flow:
//  1. After a normal login, the app calls /api/auth/device/issue and stores the
//     returned device token in secure storage.
//  2. When the NextAuth session cookie has expired (API returns 401), the app
//     calls /api/auth/device/refresh with that token. The server rotates the
//     token and sets a fresh session cookie, so the user never sees a login
//     screen while they keep using the app.
//  3. Logout (or a password change) revokes the token.
import crypto from "crypto";
import { encode } from "next-auth/jwt";
import { prisma } from "@/app/lib/prisma.js";

export const DEVICE_TOKEN_TTL_DAYS = 180;
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export async function issueDeviceToken(userId, { deviceName, familyId } = {}) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.deviceToken.create({
    data: {
      userId,
      familyId: familyId || crypto.randomUUID(),
      tokenHash: sha256(raw),
      deviceName: deviceName ? String(deviceName).slice(0, 120) : null,
      expiresAt,
    },
  });
  return { deviceToken: raw, expiresAt };
}

/**
 * Validates and rotates a device token.
 * Returns { user, deviceToken, expiresAt } or { error, status }.
 */
export async function rotateDeviceToken(raw) {
  if (!raw || typeof raw !== "string" || raw.length > 200) {
    return { error: "Invalid device token.", status: 401 };
  }
  const record = await prisma.deviceToken.findUnique({
    where: { tokenHash: sha256(raw) },
    include: { user: true },
  });
  if (!record) return { error: "Invalid device token.", status: 401 };

  if (record.revokedAt) {
    // A rotated-out token was used again: it may have been stolen.
    // Kill the whole family so both copies stop working.
    await revokeFamily(record.familyId);
    return { error: "Device token reused. Please log in again.", status: 401 };
  }
  if (record.expiresAt < new Date()) {
    return { error: "Device token expired. Please log in again.", status: 401 };
  }
  const user = record.user;
  if (!user || user.status !== "ACTIVE") {
    await revokeFamily(record.familyId);
    return { error: "Account is not active.", status: 403 };
  }

  // Rotate: revoke old, issue new in the same family (atomic).
  const rawNext = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const revoked = await prisma.$transaction(async (tx) => {
    const res = await tx.deviceToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: now, lastUsedAt: now },
    });
    if (res.count === 0) return false; // lost a race with another refresh
    await tx.deviceToken.create({
      data: {
        userId: user.id,
        familyId: record.familyId,
        tokenHash: sha256(rawNext),
        deviceName: record.deviceName,
        expiresAt,
      },
    });
    return true;
  });
  if (!revoked) return { error: "Device token already used.", status: 409 };

  return { user, deviceToken: rawNext, expiresAt };
}

export async function revokeFamily(familyId) {
  await prisma.deviceToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeDeviceToken(raw) {
  if (!raw || typeof raw !== "string") return;
  const record = await prisma.deviceToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (record) await revokeFamily(record.familyId);
}

/** Revoke every remembered device for a user (e.g. after a password change). */
export async function revokeAllDeviceTokens(userId) {
  await prisma.deviceToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Builds the same token the NextAuth `jwt` callback produces and sets it as
 * the session cookie on `response`, exactly like a normal login would.
 */
export async function setSessionCookie(response, user) {
  const clientProfile = await prisma.client.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const token = {
    sub: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.image,
    image: user.image,
    role: user.role,
    status: user.status,
    measurementUnit: user.measurementUnit,
    phone: user.phone,
    clientId: clientProfile?.id || null,
  };
  const value = await encode({
    token,
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const secure = (process.env.NEXTAUTH_URL || "").startsWith("https://");
  response.cookies.set({
    name: secure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export const clientIp = (req) =>
  (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
