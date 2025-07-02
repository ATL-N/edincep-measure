import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// Helper function to calculate percentage change safely
const calculateChange = (current, previous) => {
  if (previous === 0) {
    // If previous month had 0, any new amount is a huge increase.
    // Can represent as 100% or just show the new number.
    // Returning 100 for any non-zero current value.
    return current > 0 ? 100.0 : 0.0;
  }
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

export async function GET() {
  try {
    // --- Date Ranges ---
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = thisMonthStart;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // --- Parallel Data Fetching ---
    const [
      totalClients,
      totalMeasurements,
      thisMonthClients,
      thisMonthMeasurements,
      lastMonthClients,
      lastMonthMeasurements,
      recentClients,
      recentMeasurements,
      monthlyStatsRaw,
      clientsWithMostMeasurements,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.measurement.count(),
      prisma.client.count({ where: { createdAt: { gte: thisMonthStart } } }),
      prisma.measurement.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      prisma.client.count({
        where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
      }),
      prisma.measurement.count({
        where: { createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
      }),
      prisma.client.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { measurements: true } } },
      }),
      prisma.measurement.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { client: { select: { id: true, name: true } } },
      }),
      prisma.measurement.groupBy({
        by: ["createdAt"],
        where: { createdAt: { gte: sixMonthsAgo } },
        _count: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.client.findMany({
        include: { _count: { select: { measurements: true } } },
        orderBy: { measurements: { _count: "desc" } },
        take: 5,
      }),
    ]);

    // Process raw monthly stats into a formatted structure
    const monthlyStatsMap = new Map();
    monthlyStatsRaw.forEach((item) => {
      const month = new Date(item.createdAt).toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      if (!monthlyStatsMap.has(month)) {
        monthlyStatsMap.set(month, { month, count: 0 });
      }
      monthlyStatsMap.get(month).count += item._count.id;
    });

    const monthlyStats = Array.from(monthlyStatsMap.values());

    // --- Calculations ---
    const clientChange = calculateChange(thisMonthClients, lastMonthClients);
    const measurementChange = calculateChange(
      thisMonthMeasurements,
      lastMonthMeasurements
    );

    return NextResponse.json({
      summaryStats: {
        totalClients: { value: totalClients },
        totalMeasurements: { value: totalMeasurements },
        thisMonthClients: { value: thisMonthClients, change: clientChange },
        thisMonthMeasurements: {
          value: thisMonthMeasurements,
          change: measurementChange,
        },
      },
      recentClients: recentClients.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        measurementCount: c._count.measurements,
      })),
      recentMeasurements,
      monthlyGrowth: monthlyStats,
      topClients: clientsWithMostMeasurements.map((client) => ({
        id: client.id,
        name: client.name,
        measurementCount: client._count.measurements,
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
