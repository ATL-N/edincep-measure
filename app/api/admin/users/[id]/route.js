// app/api/admin/users/[id]/route.js

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

// PUT update user details (ADMIN only)
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser ||
      currentUser.role !== "ADMIN" ||
      currentUser.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { role, status, email, phone } = await request.json();

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate and build the data to update
    const dataToUpdate = {};
    const logDetails = { updatedUserId: id };

    if (role && role !== existingUser.role) {
      dataToUpdate.role = role;
      logDetails.oldRole = existingUser.role;
      logDetails.newRole = role;
    }
    if (status && status !== existingUser.status) {
      dataToUpdate.status = status;
      logDetails.oldStatus = existingUser.status;
      logDetails.newStatus = status;
    }
    if (email && email !== existingUser.email) {
      // Check if the new email is already taken
      const emailExists = await prisma.user.findFirst({
        where: { email: email, NOT: { id: id } },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: "Email is already in use by another account." },
          { status: 409 }
        );
      }
      dataToUpdate.email = email;
      logDetails.oldEmail = existingUser.email;
      logDetails.newEmail = email;
    }
    if (phone && phone !== existingUser.phone) {
      dataToUpdate.phone = phone;
      logDetails.oldPhone = existingUser.phone;
      logDetails.newPhone = phone;
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { message: "No changes provided" },
        { status: 200 }
      );
    }


    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "USER_UPDATE",
        ipAddress,
        os,
        details: logDetails,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'Email is already in use.' }, { status: 409 });
    }
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

    if (
      !currentUser ||
      currentUser.role !== "ADMIN" ||
      currentUser.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // You might want to prevent an admin from deleting themselves.
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account." },
        { status: 403 }
      );
    }

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