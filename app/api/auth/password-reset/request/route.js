// app/api/auth/password-reset/request/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';


export async function POST(req) {
  try {
    const { email } = await req.json();

    // 1. Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // If no user is found, we send a generic success response
    // to prevent user enumeration attacks.
    if (!user) {
      return NextResponse.json(
        { message: "If an account with this email exists, a reset code has been sent." },
        { status: 200 }
      );
    }

    // 2. Generate a secure 6-digit token
    const resetToken = crypto.randomInt(100000, 1000000).toString();
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // 3. Set an expiration date (e.g., 10 minutes from now)
    const tokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    // 4. Update the user record with the hashed token and expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpires: tokenExpires,
      },
    });

    // 5. Send the email using Resend
    const appDomain = process.env.DOMAIN || 'localhost:3000';
    const resetLink = `https://${appDomain}/reset-password?email=${encodeURIComponent(user.email)}`;

    await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: "Your Password Reset Code",
      html: `
        <div>
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Please use the following 6-digit code:</p>
          <h2 style="font-size: 24px; letter-spacing: 2px; margin: 20px 0;">${resetToken}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>Please click the link below and enter the code to set a new password:</p>
          <a href="${resetLink}" target="_blank">Reset Your Password</a>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: "If an account with this email exists, a reset code has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password Reset Request Error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
