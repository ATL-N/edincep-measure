import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    // If no user, or user is not a designer/admin, deny access.
    if (!user || (user.role !== "DESIGNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Create a base 'where' clause for authorization ---
    let whereClause = {};
    if (user.role === "DESIGNER") {
      whereClause = {
        assignedDesigners: {
          some: {
            designerId: user.id,
          },
        },
      };
    }
    
    // --- Date Calculations ---
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // --- Parallel Data Fetching (Scoped to the user) ---
    const [
      totalClients,
      newClientsThisMonth,
      totalMeasurements,
      activeClients,
      recentClientsData,
      measurementsThisWeek,
      newClientsThisWeek,
    ] = await Promise.all([
      prisma.client.count({ where: { ...whereClause, status: "ACTIVE" } }),
      prisma.client.count({ where: { ...whereClause, status: "ACTIVE", createdAt: { gte: oneMonthAgo } } }),
      prisma.measurement.count({ where: { client: { ...whereClause, status: "ACTIVE" } } }),
      prisma.client.count({ where: { ...whereClause, status: "ACTIVE" } }),
      prisma.client.findMany({
        where: { ...whereClause, status: "ACTIVE" },
        take: 4,
        orderBy: { updatedAt: "desc" },
        include: {
          measurements: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.measurement.count({ where: { client: { ...whereClause, status: "ACTIVE" }, createdAt: { gte: oneWeekAgo } } }),
      prisma.client.count({ where: { ...whereClause, status: "ACTIVE", createdAt: { gte: oneWeekAgo } } }),
    ]);

    // Format recent clients (logic remains the same)
    const recentClients = recentClientsData.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      status: client.status,
      lastMeasured: client.measurements[0]?.createdAt || null,
    }));
    
    // --- Assemble Response ---
    const responseData = {
      stats: {
        totalClients,
        newClientsThisMonth,
        totalMeasurements,
        activeClients,
      },
      recentClients,
      activitySummary: {
        measurementsThisWeek,
        newClientsThisWeek,
        appointmentsThisWeek: 8, // Mocked data
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
