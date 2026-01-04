// app/api/admin/users/route.js

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// GET all users (ADMIN only) with pagination, search, and sort
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = (page - 1) * limit;

    // Whitelist of sortable columns
    const validSortColumns = [
      "name",
      "email",
      "phone",
      "role",
      "status",
      "createdAt",
      "measurementUnit",
    ];
    if (!validSortColumns.includes(sortBy)) {
      return NextResponse.json(
        { error: "Invalid sort column" },
        { status: 400 }
      );
    }

    const whereClause = searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { email: { contains: searchQuery, mode: "insensitive" } },
            { phone: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {};

    const [users, totalUsers] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { [sortBy]: order },
        skip: skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return NextResponse.json({ users, totalUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
