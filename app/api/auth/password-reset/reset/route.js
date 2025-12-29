// app/api/auth/password-reset/reset/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: "Email, token, and new password are required." },
        { status: 400 }
      );
    }

    // 1. Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token. Please try again." },
        { status: 400 }
      );
    }

    // 2. Check if the token is valid and not expired
    if (
      !user.passwordResetToken ||
      !user.passwordResetTokenExpires ||
      user.passwordResetTokenExpires < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired token. Please try again." },
        { status: 400 }
      );
    }

    // 3. Compare the provided token with the hashed token in the database
    const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);

    if (!isTokenValid) {
      return NextResponse.json(
        { error: "Invalid or expired token. Please try again." },
        { status: 400 }
      );
    }

    // 4. Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update the user's password and clear the reset token fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword: hashedNewPassword,
        passwordResetToken: null,
        passwordResetTokenExpires: null,
      },
    });

    return NextResponse.json(
      { message: "Password has been reset successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password Reset Error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
