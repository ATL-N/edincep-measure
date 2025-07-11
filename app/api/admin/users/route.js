// app/api/admin/users/route.js

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

// GET all users (ADMIN only)
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
