// /api/auth/register/route.js
import { prisma } from "@/app/lib/prisma.js";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

export async function POST(request) {
  try {
    let name, email, phone, password;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = body.name;
      email = body.email;
      phone = body.phone;
      password = body.password;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      name = formData.get('name');
      email = formData.get('email');
      phone = formData.get('phone');
      password = formData.get('password');
    } else {
      return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
    }

    // 1. Validate input
    if (!name || (!email && !phone) || !password) {
      return NextResponse.json(
        { error: "Name, password, and either an email or phone number are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 2. Check if user already exists with the given email or phone
    const whereClause = [];
    if (email) whereClause.push({ email });
    if (phone) whereClause.push({ phone });

    if (whereClause.length > 0) {
        const existingUser = await prisma.user.findFirst({
            where: { OR: whereClause },
        });

        if (existingUser) {
            if (email && existingUser.email === email) {
                return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
            }
            if (phone && existingUser.phone === phone) {
                return NextResponse.json({ error: "A user with this phone number already exists." }, { status: 409 });
            }
        }
    }


    // 3. Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create the new user in the database
    const userData = {
      name,
      hashedPassword,
      role: Role.DESIGNER,
    };
    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    const user = await prisma.user.create({
      data: userData,
    });

    // 5. Log the registration event
    const ip = request.headers.get("x-forwarded-for");
    const os = request.headers.get("user-agent");
    await prisma.log.create({
      data: {
        userId: user.id,
        action: "USER_REGISTRATION",
        ipAddress: ip,
        os: os,
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Registration Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // This can still catch race conditions if two requests come in at the same time
      if (error.code === "P2002") {
        const target = error.meta?.target || [];
        if (target.includes('email')) {
             return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
        }
        if (target.includes('phone')) {
             return NextResponse.json({ error: "A user with this phone number already exists." }, { status: 409 });
        }
      }
    }
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
