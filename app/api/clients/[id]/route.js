// app/api/clients/[id]/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";
import { requireStaff, canAccessClient } from "@/lib/authz";

// Helper function to count non-null measurement fields in a session
const countFilledMeasurements = (measurement) => {
  let count = 0;
  for (const key in measurement) {
    // A more robust way to count: only include keys that are actual measurement types
    if (
      (key.includes("Snug") ||
        key.includes("Static") ||
        key.includes("Dynamic")) &&
      measurement[key] !== null
    ) {
      count++;
    }
  }
  return count;
};

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

// GET single client with detailed measurements
export async function GET(request, { params }) {
  try {
    const { user, error } = await requireStaff(request, { requireActive: false });
    if (error) return error;

    const { id } = await params;

    if (!(await canAccessClient(user, id))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        measurements: {
          where: {
            status: 'ACTIVE', // <-- Exclude soft-deleted measurements
            ...(user.role === "DESIGNER" && { creatorId: user.id }),
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Augment each measurement session with a total count
    const processedMeasurements = client.measurements.map((m) => ({
      ...m,
      totalMeasurementsCount: countFilledMeasurements(m),
    }));

    const processedClient = { ...client, measurements: processedMeasurements };

    if (user.role === "DESIGNER") {
      const link = await prisma.clientDesigner.findUnique({
        where: { clientId_designerId: { clientId: id, designerId: user.id } },
        select: { notes: true },
      });
      processedClient.notes = link?.notes ?? null;
    }

    return NextResponse.json(processedClient);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

// PUT update client (NEW)
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, phone, email, address, notes, status } = body;
    
    // Combine first and last name for the update
    const name = `${firstName || ''} ${lastName || ''}`.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient || !(await canAccessClient(currentUser, id))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Shared profile fields live on the client; notes are private per designer.
    const isDesigner = currentUser.role === "DESIGNER";
    const updated = await prisma.client.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        ...(isDesigner ? {} : { notes }),
        // Designers can't change a shared client's status here (use DELETE).
        ...(isDesigner ? {} : { status }),
      },
    });
    if (isDesigner && notes !== undefined) {
      await prisma.clientDesigner.update({
        where: { clientId_designerId: { clientId: id, designerId: currentUser.id } },
        data: { notes },
      });
    }
    const client = isDesigner ? { ...updated, notes: notes ?? null } : updated;

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "CLIENT_UPDATE",
        ipAddress,
        os,
        details: {
          clientId: client.id,
          oldClientName: existingClient.name,
          newClientName: client.name,
          oldStatus: existingClient.status,
          newStatus: client.status,
        },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

// DELETE client
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient || !(await canAccessClient(currentUser, id))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // 2. Remove the client.
    // A designer only removes the client from THEIR list (and hides their own
    // measurements). The client record is soft-deleted only when no other
    // designer still works with them. Admins delete outright.
    if (currentUser.role === "DESIGNER") {
      await prisma.$transaction(async (tx) => {
        await tx.clientDesigner.delete({
          where: { clientId_designerId: { clientId: id, designerId: currentUser.id } },
        });
        await tx.measurement.updateMany({
          where: { clientId: id, creatorId: currentUser.id },
          data: { status: "DELETED" },
        });
        const remaining = await tx.clientDesigner.count({ where: { clientId: id } });
        if (remaining === 0) {
          await tx.client.update({ where: { id }, data: { status: "DELETED" } });
        }
      });
    } else {
      await prisma.client.update({
        where: { id },
        data: { status: 'DELETED' },
      });
    }

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "CLIENT_DELETE",
        ipAddress,
        os,
        details: {
          clientId: id,
          clientName: existingClient.name,
        },
      },
    });

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}