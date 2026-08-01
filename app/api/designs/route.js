// GET /api/designs            — the signed-in designer's designs (for sync,
//                               includes deleted ones so devices can remove them)
// GET /api/designs?measurementId=…  — live designs linked to one order
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { requireStaff } from "@/lib/authz";

export async function GET(request) {
  const { user, error } = await requireStaff(request, { requireActive: false });
  if (error) return error;
  const measurementId = new URL(request.url).searchParams.get("measurementId");
  const designs = await prisma.design.findMany({
    where: {
      designerId: user.id,
      ...(measurementId ? { measurementId, deletedAt: null } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  return NextResponse.json({ designs });
}
