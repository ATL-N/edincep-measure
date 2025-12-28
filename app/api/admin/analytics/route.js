// @/app/api/admin/analytics/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { getCurrentUser } from "@/lib/session";

// const prisma = new PrismaClient(); // Removed local instance


export async function GET(request) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalClients,
      totalMeasurements,
      userRoleDistribution,
      clientGrowthData,
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.measurement.count({ where: { status: 'ACTIVE' } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true,
        },
        where: { status: 'ACTIVE' },
      }),
      prisma.client.groupBy({
        by: ['createdAt'],
        _count: {
          id: true,
        },
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    const clientGrowthChart = clientGrowthData.map(item => ({
      date: item.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      count: item._count.id,
    }));

    const roleDistribution = userRoleDistribution.reduce((acc, role) => {
      acc[role.role] = role._count.id;
      return acc;
    }, {});

    return NextResponse.json({
      totalUsers,
      totalClients,
      totalMeasurements,
      roleDistribution,
      clientGrowthChart,
    });

  } catch (error) {
    console.error("Admin Analytics Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin analytics data." },
      { status: 500 }
    );
  }
}
