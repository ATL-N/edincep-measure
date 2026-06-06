// app/api/user/profile/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PUT(req) {
  try {
    const user = await getCurrentUser(req);

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, phone } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email: email || undefined,
        phone: phone || undefined,
      },
    });

    return NextResponse.json({ 
        message: "Profile updated successfully.",
        user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            image: updatedUser.image,
            role: updatedUser.role,
            measurementUnit: updatedUser.measurementUnit
        }
    }, { status: 200 });

  } catch (error) {
    if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
            return NextResponse.json(
                { error: "This email address is already registered to another account." },
                { status: 400 }
            );
        }
        if (error.meta?.target?.includes('phone')) {
            return NextResponse.json(
                { error: "This phone number is already registered to another account." },
                { status: 400 }
            );
        }
    }
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
