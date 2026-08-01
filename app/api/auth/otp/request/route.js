// app/api/auth/otp/request/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendSms } from "@/app/lib/sms";
import { isRateLimited } from "@/app/lib/rate-limiter";

export async function POST(req) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string" || !/^\+?[0-9]{7,15}$/.test(phone.replace(/[\s-]/g, ""))) {
      return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
    }

    // Throttle SMS sending: per phone number and per IP.
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
    const [perPhone, perIp] = await Promise.all([
      isRateLimited(`otp_req:phone:${phone}`, 3, 10 * 60),
      isRateLimited(`otp_req:ip:${ip}`, 10, 60 * 60),
    ]);
    if (perPhone.isLimited || perIp.isLimited) {
      return NextResponse.json(
        { error: "Too many code requests. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    // 1. Find or create the user
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // Create a "Draft" user if they don't exist yet
      user = await prisma.user.create({
        data: {
          phone,
          role: 'DESIGNER', // Default role for PWA users
          status: 'ACTIVE',
        },
      });
    }

    if (user.status === 'DELETED') {
      return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
    }

    // 2. Generate a secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Update user with hashed OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: hashedOtp,
        otpExpires: otpExpires,
      },
    });

    // 4. Send the SMS
    const message = `Your Edmeasure verification code is: ${otp}. It expires in 10 mins.`;
    const smsSent = await sendSms(phone, message);

    if (!smsSent) {
       // Note: In development, we return the OTP in the error message for convenience
       if (process.env.NODE_ENV === 'development') {
         return NextResponse.json({ 
           message: `(Dev Mode) SMS failed, but here is your code: ${otp}`,
           isNewUser: !user.name 
         }, { status: 200 });
       }
        
       return NextResponse.json({ error: "Failed to send verification code. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ 
        message: "Verification code sent successfully.",
        isNewUser: !user.name // Let the frontend know if it needs to show the Profile Setup screen
    }, { status: 200 });

  } catch (error) {
    console.error("OTP Request Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
