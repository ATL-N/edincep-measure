// /api/clients/route.js

import { RecordStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

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

    // 2. Authorize the user: check if they are logged in
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sort");
    // Clamp pagination input so a client can't request unbounded pages.
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12));
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
    // A unique tie-breaker (id) keeps page boundaries stable, so paging
    // through the list never skips or repeats a client.
    let orderBy;
    switch (sortBy) {
      case "name":
        orderBy = [{ name: "asc" }, { id: "asc" }];
        break;
      case "measurements":
        orderBy = [{ measurements: { _count: "desc" } }, { id: "asc" }];
        break;
      case "created":
        orderBy = [{ createdAt: "asc" }, { id: "asc" }];
        break;
      case "recent":
      default:
        orderBy = [{ updatedAt: "desc" }, { id: "asc" }];
        break;
    }

    // 6. Execute the database query with the secured 'where' clause
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          // Designers only see their own measurements and notes on shared clients.
          measurements: {
            where: {
              status: "ACTIVE",
              ...(user.role === "DESIGNER" && { creatorId: user.id }),
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              measurements: {
                where: {
                  status: "ACTIVE",
                  ...(user.role === "DESIGNER" && { creatorId: user.id }),
                },
              },
            },
          },
          ...(user.role === "DESIGNER" && {
            assignedDesigners: {
              where: { designerId: user.id },
              select: { notes: true },
            },
          }),
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    // 7. Return the successful response
    const visibleClients =
      user.role === "DESIGNER"
        ? clients.map(({ assignedDesigners, ...c }) => ({
            ...c,
            notes: assignedDesigners?.[0]?.notes ?? null,
          }))
        : clients;

    return NextResponse.json({
      clients: visibleClients,
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
      id, // Optional client-provided ID
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

    // Idempotency: the mobile app sends its own id and may retry after a
    // dropped response. If this designer already owns that client, return it.
    if (id) {
      const existing = await prisma.client.findUnique({
        where: { id },
        include: { assignedDesigners: { where: { designerId }, select: { designerId: true } } },
      });
      if (existing) {
        if (existing.assignedDesigners.length > 0) {
          const { assignedDesigners, ...rest } = existing;
          return NextResponse.json(rest, { status: 200 });
        }
        return NextResponse.json({ error: "Client id already in use." }, { status: 409 });
      }
    }

    // 5. Find-or-share the client.
    // Clients are shared between designers (one client record per phone
    // number), but measurements and private notes belong to each designer.
    const { client, shared } = await prisma.$transaction(async (tx) => {
      // 5a. Find or create the User account behind this client (keyed by phone).
      let clientUser = await tx.user.findUnique({ where: { phone } });
      if (!clientUser) {
        clientUser = await tx.user.create({
          data: { name, phone, email: email || null, role: "CLIENT" },
        });
      } else if (!clientUser.name || (!clientUser.email && email)) {
        // Only fill in blanks; never overwrite details another designer set.
        clientUser = await tx.user.update({
          where: { id: clientUser.id },
          data: {
            name: clientUser.name || name,
            email: clientUser.email || email || null,
          },
        });
      }

      // 5b. Does a client record already exist for this person?
      const existing =
        (await tx.client.findUnique({ where: { userId: clientUser.id } })) ||
        (await tx.client.findFirst({
          where: { phone, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        }));

      if (existing) {
        // Share it: link this designer (idempotent) with their own notes.
        await tx.clientDesigner.upsert({
          where: { clientId_designerId: { clientId: existing.id, designerId } },
          update: {},
          create: { clientId: existing.id, designerId, notes: notes || null },
        });
        const revived =
          existing.status === "ACTIVE"
            ? existing
            : await tx.client.update({
                where: { id: existing.id },
                data: { status: "ACTIVE" },
              });
        return { client: revived, shared: true };
      }

      // 5c. Brand-new client.
      const newClient = await tx.client.create({
        data: {
          id: id || undefined, // Use provided ID or let Prisma generate a CUID
          name,
          phone,
          email: email || null,
          address,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          status: status || "ACTIVE",
          user: { connect: { id: clientUser.id } },
          assignedDesigners: {
            create: { designerId, notes: notes || null },
          },
        },
      });
      return { client: newClient, shared: false };
    });

    // Log the client creation event
    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: user.id,
        action: shared ? "CLIENT_SHARED" : "CLIENT_CREATE",
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
    // `shared: true` tells the app this client already existed (possibly under
    // a different id than the one it sent) so it can re-point local records.
    return NextResponse.json(
      { ...client, notes: notes || null, shared, requestedId: id || null },
      { status: shared ? 200 : 201 }
    );
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