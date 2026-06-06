// app/api/finance/categories/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // Optional filter by type
    const query = searchParams.get("query"); // For fuzzy search

    const where = {
      OR: [
        { isGlobal: true },
        { designerId: user.id }
      ]
    };

    if (type) where.type = type;
    if (query) {
      where.name = {
        contains: query,
        mode: 'insensitive'
      };
    }

    const categories = await prisma.financeCategory.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' }
      ],
      include: {
        stock: true
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Finance Categories GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, type, unit } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    // Check for existing (case-insensitive)
    const existing = await prisma.financeCategory.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        type,
        OR: [
          { isGlobal: true },
          { designerId: user.id }
        ]
      }
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const category = await prisma.financeCategory.create({
      data: {
        name,
        type,
        unit: unit || "unit",
        designerId: user.id,
        isGlobal: false
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Finance Categories POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
