// app/api/admin/users/[id]/summary/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req, { params }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const { id } = await params;

    // 1. Get user with basic info
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        measurementUnit: true,
        createdAt: true,
        updatedAt: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = { user, finance: null, clients: null, measurements: null };

    // 2. Designer-specific data
    if (user.role === "DESIGNER") {
      // Client count and list
      const clientAssignments = await prisma.clientDesigner.findMany({
        where: { designerId: id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              createdAt: true,
              status: true,
              _count: { select: { measurements: true } },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      });

      result.clients = {
        total: clientAssignments.length,
        active: clientAssignments.filter((a) => a.client.status === "ACTIVE").length,
        list: clientAssignments.map((a) => ({
          ...a.client,
          measurementCount: a.client._count.measurements,
          assignedAt: a.assignedAt,
        })),
      };

      // Measurement count created by this designer
      const measurementCount = await prisma.measurement.count({
        where: { creatorId: id },
      });
      result.measurements = { total: measurementCount };

      // Finance summary
      const allTransactions = await prisma.transaction.findMany({
        where: { designerId: id, type: { not: "USAGE" } },
        include: { category: { select: { name: true, type: true } } },
        orderBy: { date: "desc" },
      });

      if (allTransactions.length > 0) {
        let totalRevenue = 0;
        let totalExpenses = 0;
        const byYear = {};
        const byCategory = {};
        const monthlyData = {};

        for (const tx of allTransactions) {
          const year = tx.date.getFullYear();
          const month = tx.date.getMonth() + 1;
          const monthKey = `${year}-${String(month).padStart(2, "0")}`;
          const isRevenue = tx.type === "REVENUE";

          if (isRevenue) {
            totalRevenue += tx.amount;
          } else {
            totalExpenses += tx.amount;
          }

          // By year
          if (!byYear[year]) {
            byYear[year] = { revenue: 0, expenses: 0, count: 0 };
          }
          byYear[year].count++;
          if (isRevenue) byYear[year].revenue += tx.amount;
          else byYear[year].expenses += tx.amount;

          // By category
          const catKey = tx.category.name;
          if (!byCategory[catKey]) {
            byCategory[catKey] = { name: catKey, type: tx.category.type, txType: tx.type, total: 0, count: 0 };
          }
          byCategory[catKey].total += tx.amount;
          byCategory[catKey].count++;

          // Monthly
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, revenue: 0, expenses: 0 };
          }
          if (isRevenue) monthlyData[monthKey].revenue += tx.amount;
          else monthlyData[monthKey].expenses += tx.amount;
        }

        // Round everything
        totalRevenue = Math.round(totalRevenue * 100) / 100;
        totalExpenses = Math.round(totalExpenses * 100) / 100;

        for (const y of Object.keys(byYear)) {
          byYear[y].revenue = Math.round(byYear[y].revenue * 100) / 100;
          byYear[y].expenses = Math.round(byYear[y].expenses * 100) / 100;
          byYear[y].profit = Math.round((byYear[y].revenue - byYear[y].expenses) * 100) / 100;
          byYear[y].margin = byYear[y].revenue > 0
            ? Math.round((byYear[y].profit / byYear[y].revenue) * 10000) / 100
            : 0;
        }

        // Sort categories by total
        const topRevenueCategories = Object.values(byCategory)
          .filter((c) => c.txType === "REVENUE")
          .sort((a, b) => b.total - a.total)
          .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }));

        const topExpenseCategories = Object.values(byCategory)
          .filter((c) => c.txType === "EXPENSE")
          .sort((a, b) => b.total - a.total)
          .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }));

        // Sort monthly data
        const monthly = Object.values(monthlyData)
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((m) => ({
            ...m,
            revenue: Math.round(m.revenue * 100) / 100,
            expenses: Math.round(m.expenses * 100) / 100,
            profit: Math.round((m.revenue - m.expenses) * 100) / 100,
          }));

        // Recent transactions (last 10)
        const recentTransactions = allTransactions.slice(0, 10).map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          notes: tx.notes,
          categoryName: tx.category.name,
          categoryType: tx.category.type,
        }));

        // Job costing count
        const jobCostingCount = await prisma.jobCosting.count({
          where: { transaction: { designerId: id } },
        });

        result.finance = {
          totalRevenue,
          totalExpenses,
          netProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
          overallMargin: totalRevenue > 0
            ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 10000) / 100
            : 0,
          transactionCount: allTransactions.length,
          jobCostingCount,
          byYear,
          topRevenueCategories,
          topExpenseCategories,
          monthly,
          recentTransactions,
        };
      } else {
        result.finance = {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          overallMargin: 0,
          transactionCount: 0,
          jobCostingCount: 0,
          byYear: {},
          topRevenueCategories: [],
          topExpenseCategories: [],
          monthly: [],
          recentTransactions: [],
        };
      }
    }

    // 3. Client-specific data
    if (user.role === "CLIENT") {
      const clientProfile = await prisma.client.findUnique({
        where: { userId: id },
        include: {
          _count: { select: { measurements: true } },
          assignedDesigners: {
            include: {
              designer: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (clientProfile) {
        result.clientProfile = {
          id: clientProfile.id,
          measurementCount: clientProfile._count.measurements,
          designers: clientProfile.assignedDesigners.map((a) => a.designer),
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("User Summary GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
