
// @/app/api/client/dashboard/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// const prisma = new PrismaClient(); // Replaced with shared client

export async function GET(request) {
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the client profile associated with the logged-in user
    const clientProfile = await prisma.client.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!clientProfile) {
      return NextResponse.json(
        { error: "Client profile not found for this user." },
        { status: 404 }
      );
    }

    const measurements = await prisma.measurement.findMany({
      where: { clientId: clientProfile.id },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      measurements: measurements.length,
      lastMeasurement: measurements.length > 0 ? measurements[0].createdAt : null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching client dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
