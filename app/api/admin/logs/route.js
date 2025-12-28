// @/app/api/admin/logs/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";

// const prisma = new PrismaClient(); // Replaced with shared client

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get("search");
    const filterAction = searchParams.get("action");

    const whereClause = {};

    if (filterAction) {
      whereClause.action = filterAction;
    }

    if (searchTerm) {
      whereClause.OR = [
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { ipAddress: { contains: searchTerm, mode: "insensitive" } },
        { action: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const logs = await prisma.log.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true } } }, // Include email for search
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Logs Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching logs." },
      { status: 500 }
    );
  }
}