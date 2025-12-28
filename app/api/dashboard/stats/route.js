import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user || (user.role !== "DESIGNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let whereClause = {};
    if (user.role === "DESIGNER") {
      whereClause = {
        assignedDesigners: {
          some: {
            designerId: user.id,
          },
        },
        status: 'ACTIVE',
      };
    } else {
      whereClause = {
        status: 'ACTIVE',
      };
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalClients,
      totalMeasurements,
      thisMonthClients,
      lastMonthClients,
      thisMonthMeasurements,
      lastMonthMeasurements,
      monthlyGrowth,
      topClients,
      recentMeasurements,
    ] = await Promise.all([
      prisma.client.count({ where: whereClause }),
      prisma.measurement.count({ where: { client: whereClause } }),
      prisma.client.count({ where: { ...whereClause, createdAt: { gte: thisMonthStart } } }),
      prisma.client.count({ where: { ...whereClause, createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
      prisma.measurement.count({ where: { client: whereClause, createdAt: { gte: thisMonthStart } } }),
      prisma.measurement.count({ where: { client: whereClause, createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
      prisma.measurement.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: { client: whereClause },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.client.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { measurements: true },
          },
        },
        orderBy: {
          measurements: {
            _count: 'desc',
          },
        },
        take: 5,
      }),
      prisma.measurement.findMany({
        where: { client: whereClause },
        include: {
          client: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const summaryStats = {
      totalClients: { value: totalClients },
      totalMeasurements: { value: totalMeasurements },
      thisMonthClients: {
        value: thisMonthClients,
        change: calculateChange(thisMonthClients, lastMonthClients),
      },
      thisMonthMeasurements: {
        value: thisMonthMeasurements,
        change: calculateChange(thisMonthMeasurements, lastMonthMeasurements),
      },
    };

    const formattedTopClients = topClients.map(c => ({
      id: c.id,
      name: c.name,
      measurementCount: c._count.measurements,
    }));

    return NextResponse.json({
      summaryStats,
      monthlyGrowth: monthlyGrowth.map(m => ({ month: new Date(m.createdAt).toLocaleString('default', { month: 'short' }), count: m._count.id })),
      topClients: formattedTopClients,
      recentMeasurements,
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}