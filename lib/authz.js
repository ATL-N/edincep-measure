// lib/authz.js
// Shared authorization helpers for API routes.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

/**
 * Returns the signed-in DESIGNER/ADMIN user, or a NextResponse to return early.
 * Usage:
 *   const { user, error } = await requireStaff(request);
 *   if (error) return error;
 */
export async function requireStaff(request, { requireActive = true } = {}) {
  const user = await getCurrentUser(request);
  if (!user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role !== "DESIGNER" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (requireActive && user.status && user.status !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Account inactive" }, { status: 403 }) };
  }
  return { user };
}

/**
 * True when the user may read/modify the given client.
 * Admins can access every client; designers only clients assigned to them.
 */
export async function canAccessClient(user, clientId) {
  if (!user || !clientId) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "DESIGNER") return false;
  const link = await prisma.clientDesigner.findUnique({
    where: { clientId_designerId: { clientId, designerId: user.id } },
    select: { clientId: true },
  });
  return !!link;
}

export const notFound = (what = "Resource") =>
  NextResponse.json({ error: `${what} not found` }, { status: 404 });
