import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET all clients (no changes needed here)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // 'Active' or 'Inactive'
    const sortBy = searchParams.get("sort"); // 'name', 'recent', 'measurements'
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && status !== "All") {
      where.status = status;
    }

    let orderBy = {};
    switch (sortBy) {
      case "name":
        orderBy = { name: "asc" };
        break;
      case "measurements":
        orderBy = { measurements: { _count: "desc" } };
        break;
      case "recent":
      default:
        orderBy = { updatedAt: "desc" };
        break;
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          measurements: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: { measurements: true },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST new client (MODIFIED)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      dateOfBirth,
      notes,
      status,
    } = body;

    const name = `${firstName || ""} ${lastName || ""}`.trim();

    if (!name) {
      return NextResponse.json(
        { error: "First and last name are required." },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        address,
        // Handle dateOfBirth: convert to Date object if provided, otherwise null
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        notes,
        status: status || "Active",
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    // Provide a more specific error for unique constraint violations if needed
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: `A client with this information already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
