// app/api/auth/profile-setup/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, measurementUnit } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email: email || undefined,
        measurementUnit: measurementUnit || 'INCH',
      },
    });

    return NextResponse.json({ 
        message: "Profile updated successfully.",
        user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            measurementUnit: updatedUser.measurementUnit
        }
    }, { status: 200 });

  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json(
        { error: "This email address is already registered to another account." },
        { status: 400 }
      );
    }
    console.error("Profile Setup Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
