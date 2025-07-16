// @/app/api/admin/analytics/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const totalUsers = await prisma.user.count();
    const totalClients = await prisma.client.count();
    const totalMeasurements = await prisma.measurement.count();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersLast7Days = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    const userRegistrationChart = await prisma.user.groupBy({
      by: ["createdAt"],
      _count: {
        createdAt: true,
      },
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: {
        createdAt: "asc",
      },
    });

    const formattedChartData = userRegistrationChart.map((data) => ({
      date: new Date(data.createdAt).toLocaleDateString(),
      count: data._count.createdAt,
    }));

    return NextResponse.json({
      totalUsers,
      totalClients,
      totalMeasurements,
      newUsersLast7Days,
      userRegistrationChart: formattedChartData,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching analytics data." },
      { status: 500 }
    );
  }
}
