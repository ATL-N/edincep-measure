// @/app/api/user/preferences/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

/**
 * GET handler to fetch the current user's preferences.
 */
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We can fetch the full user object here, but for now, we only need the unit.
    const userPreferences = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        measurementUnit: true,
      },
    });

    if (!userPreferences) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(userPreferences);
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch user preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT handler to update the current user's preferences.
 */
export async function PUT(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { measurementUnit } = await request.json();

    // Basic validation to ensure the provided unit is valid.
    if (!["INCH", "CENTIMETER"].includes(measurementUnit)) {
      return NextResponse.json({ error: "Invalid measurement unit" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        measurementUnit: measurementUnit,
      },
    });

    return NextResponse.json({
      measurementUnit: updatedUser.measurementUnit,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update user preferences" },
      { status: 500 }
    );
  }
}
