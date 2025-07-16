// app/api/register/route.js
import { PrismaClient, Role } from "@prisma/client"; // <-- IMPORTANT: Import the Role enum
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 1. Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    // You can add more specific validation here if you like (e.g., password length)
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
      ); // 409 Conflict
    }

    // 3. Hash the password for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create the new user in the database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: Role.DESIGNER, // <-- THIS IS THE KEY CHANGE
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

    // We don't want to return the hashed password to the client
    const { hashedPassword: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Registration Error:", error);
    // Handle potential database errors, like unique constraint violations if the check somehow fails
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
