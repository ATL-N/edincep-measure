
// @/app/api/client/measurements/[sessionId]/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  const { sessionId } = await params;
  console.log('session_iddddddddddddddddddddddddddddddddd:', sessionId)
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const measurement = await prisma.measurement.findFirst({
      where: {
        id: sessionId,
        clientId: user.clientId,
      },
    });

      // console.log("session_iddddddddddddddddddddddddddddddddd 8886666666666666:", measurement);


    if (!measurement) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
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
