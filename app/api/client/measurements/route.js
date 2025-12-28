
// @/app/api/client/measurements/route.js
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
      select: { id: true }, // We only need the ID for the next query
    });

    // If no client profile is found for this user, return an error
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
    return NextResponse.json(measurements);
  } catch (error) {
    console.error("Error fetching client measurements:", error);
    return NextResponse.json(
      { error: "Failed to fetch measurements" },
      { status: 500 }
    );
  }
}
