// app/api/user/change-password/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    // 1. Authenticate the user using the session helper
    const sessionUser = await getCurrentUser(request);

    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the passwords from the request body
    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required." },
        { status: 400 }
      );
    }

    // 3. Validate that new passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 4. Fetch the full user from the DB to get their hashed password
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    // This case should be rare if session is valid, but it's good practice
    if (!user || !user.hashedPassword) {
        return NextResponse.json({ error: "User not found or password not set." }, { status: 404 });
    }

    // 5. Verify the current password
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.hashedPassword
    );

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "The current password you entered is incorrect." },
        { status: 401 }
      );
    }

    // 6. Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // 7. Update the user's password in the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword: hashedNewPassword,
      },
    });

    return NextResponse.json(
      { message: "Password updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change Password Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
