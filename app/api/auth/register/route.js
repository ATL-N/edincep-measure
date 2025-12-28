// /api/auth/register/route.js
import { prisma } from "@/app/lib/prisma.js";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

export async function POST(request) {
  try {
    let name, email, password;
    const contentType = request.headers.get("content-type") || "";

    // Check content type and parse body accordingly
    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = body.name;
      email = body.email;
      password = body.password;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      name = formData.get('name');
      email = formData.get('email');
      password = formData.get('password');
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 415 }
      );
    }

    // 1. Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A designer with this email already exists." },
        { status: 409 }
      );
    }

    // 3. Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create the new user in the database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: Role.DESIGNER,
      },
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
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A designer with this email already exists." },
          { status: 409 }
        );
      }
    }
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
