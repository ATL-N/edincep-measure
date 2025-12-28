// app/api/measurements/[id]/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

// GET single measurement
export async function GET(request, { params }) {
  try {
    const awaitedparam = await params;
    const { id } = awaitedparam;

    const measurement = await prisma.measurement.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!measurement) {
      return NextResponse.json(
        { error: "Measurement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(measurement);
  } catch (error) {
    console.error("Error fetching measurement:", error);
    return NextResponse.json(
      { error: "Failed to fetch measurement" },
      { status: 500 }
    );
  }
}

// PUT update measurement (FIXED & SECURED)
export async function PUT(request, { params }) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get ID and body
    const awaitedparam = await params;
    const { id } = awaitedparam;
    const body = await request.json();

    // 3. Sanitize incoming data
    const {
      notes,
      orderStatus,
      completionDeadline,
      materialImageUrl,
      designImageUrl,
      ...measurementStrings
    } = body;

    const dataToUpdate = {
      notes,
      orderStatus,
      completionDeadline: completionDeadline
        ? new Date(completionDeadline)
        : undefined,
      materialImageUrl,
      designImageUrl,
    };

    // Sanitize numeric measurement fields
    for (const key in measurementStrings) {
      if (Object.prototype.hasOwnProperty.call(measurementStrings, key)) {
        const value = measurementStrings[key];
        if (typeof value === "string" && value.trim() !== "") {
          const num = parseFloat(value);
          dataToUpdate[key] = isNaN(num) ? null : num;
        } else if (typeof value === "number" && !isNaN(value)) {
          dataToUpdate[key] = value;
        } else {
          dataToUpdate[key] = null;
        }
      }
    }

    // Filter out any fields that are explicitly undefined
    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    // 4. Authorize: Ensure a designer can only update their own work
    const whereClause = {
      id,
      ...(currentUser.role === "DESIGNER" && { creatorId: currentUser.id }),
    };

    // 5. Update the measurement
    const updatedMeasurement = await prisma.measurement.update({
      where: whereClause,
      data: dataToUpdate,
    });

    // 6. Log the event
    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "MEASUREMENT_UPDATE",
        ipAddress,
        os,
        details: {
          measurementId: updatedMeasurement.id,
          clientId: updatedMeasurement.clientId,
        },
      },
    });

    return NextResponse.json(updatedMeasurement);
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Measurement not found or you don't have permission to edit it." },
        { status: 404 }
      );
    }
    console.error("Error updating measurement:", error);
    return NextResponse.json(
      { error: "Failed to update measurement" },
      { status: 500 }
    );
  }
}

// DELETE measurement
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const awaitedparam = await params;
    const { id } = awaitedparam;

    const deletedMeasurement = await prisma.measurement.delete({
      where: { id },
    });

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "MEASUREMENT_DELETE",
        ipAddress,
        os,
        details: {
          measurementId: deletedMeasurement.id,
          clientId: deletedMeasurement.clientId,
        },
      },
    });

    return NextResponse.json({ message: "Measurement deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Measurement not found" },
        { status: 404 }
      );
    }
    console.error("Error deleting measurement:", error);
    return NextResponse.json(
      { error: "Failed to delete measurement" },
      { status: 500 }
    );
  }
}