
// @/app/api/client/measurements/[sessionId]/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// const prisma = new PrismaClient(); // Replaced with shared client

export async function GET(request, { params }) {
  const { sessionId } = await params;
  console.log('session_iddddddddddddddddddddddddddddddddd:', sessionId)
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find the client profile associated with the logged-in user to ensure authorization
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

    const measurement = await prisma.measurement.findFirst({
      where: {
        id: sessionId,
        clientId: clientProfile.id, // Authorize by checking against the user's client ID
      },
    });

    if (!measurement) {
      return NextResponse.json(
        { error: "Measurement not found or you do not have permission to view it." },
        { status: 404 }
      );
    }

    return NextResponse.json(measurement);
  } catch (error) {
    console.error("Error fetching measurement details:", error);
    return NextResponse.json(
      { error: "Failed to fetch measurement details" },
      { status: 500 }
    );
  }
}
