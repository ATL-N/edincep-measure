// app/api/admin/users/[id]/route.js

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// const prisma = new PrismaClient(); // Replaced with shared client

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

// PUT update user role and status (ADMIN only)
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || currentUser.role !== "ADMIN" || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { role, status } = await request.json();

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role, status },
    });

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "USER_UPDATE",
        ipAddress,
        os,
        details: {
          updatedUserId: id,
          oldRole: existingUser.role,
          newRole: updatedUser.role,
          oldStatus: existingUser.status,
          newStatus: updatedUser.status,
        },
      },
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

// DELETE user (ADMIN only)
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || currentUser.role !== "ADMIN" || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const deletedUser = await prisma.user.delete({
      where: { id },
    });

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "USER_DELETE",
        ipAddress,
        os,
        details: {
          deletedUserId: id,
          deletedUserEmail: deletedUser.email,
        },
      },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}