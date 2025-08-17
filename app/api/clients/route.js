// /api/clients/route.js

import { PrismaClient, RecordStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

// GET all clients for the LOGGED-IN DESIGNER or all clients for ADMIN
export async function GET(request) {
  try {
    // 1. Authenticate the user using the session helper
    const user = await getCurrentUser(request);

    console.log("User from session:", user);

    // 2. Authorize the user: check if they are logged in
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sort");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    // 4. Build the 'where' clause based on user role
    const where = {
      status: RecordStatus.ACTIVE // <-- Default to only fetching ACTIVE clients
    };

    if (user.role === "DESIGNER") {
      where.assignedDesigners = {
        some: {
          designerId: user.id,
        },
      };
    } else if (user.role !== "ADMIN") {
      // If not an ADMIN or DESIGNER, they can't see any clients
      return NextResponse.json({ clients: [], pagination: { total: 0 } });
    }

    // Add search filters if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add status filter if provided, using the enum
    if (user.role === 'ADMIN' && status) {
      if (status === RecordStatus.ACTIVE || status === RecordStatus.DELETED) {
        where.status = status;
      } else if (status === 'All') {
        delete where.status;
      }
    } else if (status === RecordStatus.DELETED) {
       // Prevent non-admins from querying for deleted clients
       where.status = RecordStatus.ACTIVE;
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
    const sessionUser = await getCurrentUser(request);

    // 2. Authorize the user: check if they are logged in via session
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Fetch the user from the database to verify role and status
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });

    // 4. Authorize based on the database record
    if (!user || user.role !== "DESIGNER" || user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Unauthorized: Your account may be inactive or lacks the necessary permissions.",
        },
        { status: 401 }
      );
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
     if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }


    // 5. Upsert User and Create Client in a transaction
    const client = await prisma.$transaction(async (prisma) => {
      // Step 5a: Find or create the user
      let clientUser = await prisma.user.findUnique({
        where: { email },
      });

      if (clientUser) {
        // If user exists, update their details
        clientUser = await prisma.user.update({
          where: { email },
          data: { name },
        });
      } else {
        // If user does not exist, create a new one
        clientUser = await prisma.user.create({
          data: {
            name,
            email,
            role: 'CLIENT', // Assign CLIENT role
          },
        });
      }

      // Step 5b: Create the client and associate with the designer and user
      const newClient = await prisma.client.create({
        data: {
          name,
          phone,
          email,
          address,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          notes,
          status: status || "ACTIVE",
          user: {
            connect: { id: clientUser.id },
          },
          assignedDesigners: {
            create: {
              designerId: designerId,
            },
          },
        },
      });

      return newClient;
    });

    // Log the client creation event
    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: user.id,
        action: "CLIENT_CREATE",
        ipAddress,
        os,
        details: {
          clientId: client.id,
          clientName: client.name,
          designerId: designerId,
        },
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