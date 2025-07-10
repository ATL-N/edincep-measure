// app/api/clients/route.js

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

// GET all clients for the LOGGED-IN DESIGNER
export async function GET(request) {
  try {
    // 1. Authenticate the user using the session helper
    const user = await getCurrentUser(request);

    console.log("User from session:", user);

    // 2. Authorize the user: check if they are logged in and have the correct role
    if (!user || user.role !== "DESIGNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const designerId = user.id;

    // 3. Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sort");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    // 4. Build the 'where' clause, starting with the mandatory designerId
    const where = {
      designerId: designerId, // This is the core of multi-tenancy
    };

    // Add search filters if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add status filter if provided
    if (status && status !== "All") {
      where.status = status;
    }

    // 5. Build the 'orderBy' clause
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

    // 6. Execute the database query with the secured 'where' clause
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

    // 7. Return the successful response
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

// POST a new client for the LOGGED-IN DESIGNER
export async function POST(request) {
  try {
    // 1. Authenticate the user using the session helper
    const user = await getCurrentUser(request);

    console.log("User from session in POST:", user);

    // 2. Authorize the user
    if (!user || user.role !== "DESIGNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const designerId = user.id;

    // 3. Get the request body
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

    // 4. Validate required fields
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

    // 5. Create the new client, ensuring the designerId is set
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        notes,
        status: status || "Active",
        designerId: designerId, // Assign the client to the logged-in designer
      },
    });

    // 6. Return the newly created client
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    if (error.code === "P2002") {
      // Handle cases where a unique field (like email, if you set it to unique) already exists
      return NextResponse.json(
        { error: `A client with this information might already exist.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
