// lib/admin-guard.js — checks shared by the admin backup routes.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

export const fail = (status, error) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Returns { admin } for an active admin calling from our own pages, else { response }. */
export async function requireAdmin(request) {
  const sessionUser = await getCurrentUser(request);
  if (!sessionUser || sessionUser.role !== "ADMIN") return { response: fail(401, "Unauthorized") };
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return { response: fail(403, "Forbidden") };
  }
  const admin = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") return { response: fail(401, "Unauthorized") };
  return { admin };
}

/** Re-confirms identity for sensitive actions: password, or "BACKUP" for password-less accounts. */
export async function confirmIdentity(admin, body) {
  if (admin.hashedPassword) {
    return typeof body.password === "string" && (await bcrypt.compare(body.password, admin.hashedPassword));
  }
  return body.confirm === "BACKUP";
}

export function clientIp(request) {
  return (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "").split(",")[0].trim() || null;
}
