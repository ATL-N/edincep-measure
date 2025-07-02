import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // --- Date Calculations ---
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // --- Parallel Data Fetching ---
    const [
      totalClients,
      newClientsThisMonth,
      totalMeasurements,
      activeClients,
      recentClientsData,
      measurementsThisWeek,
      newClientsThisWeek,
    ] = await Promise.all([
      // Stat: Total Clients
      prisma.client.count(),
      // Stat: New Clients This Month
      prisma.client.count({ where: { createdAt: { gte: oneMonthAgo } } }),
      // Stat: Total Measurements
      prisma.measurement.count(),
      // Stat: Active Projects/Clients
      prisma.client.count({ where: { status: "Active" } }),
      // Recent Clients (last 4 updated)
      prisma.client.findMany({
        take: 4,
        orderBy: { updatedAt: "desc" },
        include: {
          measurements: {
            orderBy: { createdAt: "desc" },
            take: 1, // Get only the most recent measurement for the date
          },
        },
      }),
      // Activity: Measurements this week
      prisma.measurement.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      // Activity: New clients this week
      prisma.client.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    ]);

    // Format recent clients to include a simplified lastMeasured date
    const recentClients = recentClientsData.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      status: client.status,
      // Use the creation date of the latest measurement, or null if none exist
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
        // Appointments are mocked on the frontend as they are not in the schema
        appointmentsThisWeek: 8,
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
