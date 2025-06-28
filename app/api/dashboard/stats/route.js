// app/api/dashboard/stats/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get basic counts
    const [totalClients, totalMeasurements, recentClients, recentMeasurements] =
      await Promise.all([
        prisma.client.count(),
        prisma.measurement.count(),
        prisma.client.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            measurements: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        }),
        prisma.measurement.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

    // Get monthly statistics for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as count
      FROM measurements 
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    // Get clients with most measurements
    const clientsWithMostMeasurements = await prisma.client.findMany({
      include: {
        _count: {
          select: {
            measurements: true,
          },
        },
      },
      orderBy: {
        measurements: {
          _count: "desc",
        },
      },
      take: 5,
    });

    // Calculate this month's stats
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [thisMonthClients, thisMonthMeasurements] = await Promise.all([
      prisma.client.count({
        where: {
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
      prisma.measurement.count({
        where: {
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalClients,
      totalMeasurements,
      thisMonthClients,
      thisMonthMeasurements,
      recentClients,
      recentMeasurements,
      monthlyStats: monthlyStats.map((stat) => ({
        month: stat.month,
        count: Number(stat.count),
      })),
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
