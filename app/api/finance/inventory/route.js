// app/api/finance/inventory/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stocks = await prisma.inventoryStock.findMany({
      where: { designerId: user.id },
      include: {
        category: true
      },
      orderBy: { category: { name: 'asc' } }
    });

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("Inventory GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { stockId, lowStockThreshold, currentQuantity } = await req.json();

    const updated = await prisma.inventoryStock.update({
      where: { 
        id: stockId,
        designerId: user.id // Safety check
      },
      data: {
        lowStockThreshold: lowStockThreshold !== undefined ? parseFloat(lowStockThreshold) : undefined,
        currentQuantity: currentQuantity !== undefined ? parseFloat(currentQuantity) : undefined,
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Inventory PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
