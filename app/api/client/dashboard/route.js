
// @/app/api/client/dashboard/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

export async function GET(request) {
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const measurements = await prisma.measurement.findMany({
      where: { clientId: user.clientId },
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
