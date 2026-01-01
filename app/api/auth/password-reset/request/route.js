// app/api/auth/password-reset/request/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { isRateLimited } from "@/app/lib/rate-limiter";
import { sendSms } from "@/app/lib/sms";

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';


export async function POST(req) {
  // Get IP address for rate limiting
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || '127.0.0.1';
  
  const RATE_LIMIT_LIMIT = 3;
  const RATE_LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds

  try {
    // Only apply rate limiting in production
    if (process.env.NODE_ENV === 'production') {
      const { isLimited, reset } = await isRateLimited(ip, RATE_LIMIT_LIMIT, RATE_LIMIT_WINDOW);
      
      if (isLimited) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((reset.getTime() - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }
    
    const { identifier, method } = await req.json(); // 'identifier' is email or phone, 'method' is 'email' or 'sms'

    if (!identifier || !method) {
        return NextResponse.json({ error: "Identifier and method are required." }, { status: 400 });
    }

    // 1. Find the user by email or phone
    const isEmail = identifier.includes('@');
    const whereClause = isEmail ? { email: identifier } : { phone: identifier };
    const user = await prisma.user.findUnique({ where: whereClause });

    // If no user is found, or if the user is soft-deleted, send a generic success response
    if (!user || user.status === 'DELETED') {
      return NextResponse.json({ message: "If an account with this identifier exists, a reset code has been sent." }, { status: 200 });
    }

    // 2. Generate a secure 6-digit token
    const resetToken = crypto.randomInt(100000, 1000000).toString();
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const tokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Update the user record with the hashed token and expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpires: tokenExpires,
      },
    });

    // 4. Send the notification via the chosen method
    if (method === 'email') {
        if (!user.email) {
            return NextResponse.json({ error: "This user does not have a registered email address." }, { status: 400 });
        }
        const appDomain = process.env.DOMAIN || 'localhost:3000';
        const resetLink = `https://${appDomain}/reset-password?email=${encodeURIComponent(user.email)}`;
        await resend.emails.send({
            from: fromEmail,
            to: user.email,
            subject: "Your Password Reset Code",
            html: `<p>Your password reset code is: <strong>${resetToken}</strong>. It expires in 10 minutes. Click here to reset: <a href="${resetLink}">Reset Password</a></p>`,
        });
    } else if (method === 'sms') {
        if (!user.phone) {
            return NextResponse.json({ error: "This user does not have a registered phone number." }, { status: 400 });
        }
        const shortMessage = `Your password reset code is: ${resetToken}. It expires in 10 mins.`;
        await sendSms(user.phone, shortMessage);
    } else {
        return NextResponse.json({ error: "Invalid delivery method specified." }, { status: 400 });
    }

    return NextResponse.json({ message: "If an account with this identifier exists, a reset code has been sent." }, { status: 200 });

  } catch (error) {
    console.error("Password Reset Request Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
