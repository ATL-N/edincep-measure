// app/api/admin/users/[id]/route.js

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

// PUT update user role and status (ADMIN only)
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { role, status } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role, status },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
