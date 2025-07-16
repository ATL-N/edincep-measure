// app/api/clients/[id]/measurements/route.js

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session"; // Ensure this path points to your auth helper

const prisma = new PrismaClient();

// Helper function to count non-null measurement fields in a session
const countFilledMeasurements = (measurement) => {
  let count = 0;
  // Updated list of keys to ignore (non-measurement fields)
  const ignoreKeys = [
    "id",
    "clientId",
    "creatorId",
    "client", // relation field
    "creator", // relation field
    "notes",
    "createdAt",
    "updatedAt",
    "status",
    "completionDeadline",
    "materialImageUrl",
    "designImageUrl",
  ];

  for (const key in measurement) {
    if (!ignoreKeys.includes(key) && measurement[key] !== null) {
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

// GET all measurements for a client (SECURED)
export async function GET(request, { params }) {
  try {
    // Authenticate the user
    const user = await getCurrentUser(request);
    if (!user || (user.role !== "DESIGNER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fix: Access params.id directly to avoid Next.js warning
    const clientId = params.id;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    // Verify client exists and get their name
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Build where clause for searching, including authorization logic
    const where = {
      clientId,
      // Security: Designers can only see measurements they created. Admins see all.
      ...(user.role === "DESIGNER" && { creatorId: user.id }),
    };
    if (search) {
      where.notes = { contains: search, mode: "insensitive" };
    }

    const measurements = await prisma.measurement.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Augment each measurement session with a total count
    const processedMeasurements = measurements.map((m) => ({
      ...m,
      totalMeasurementsCount: countFilledMeasurements(m),
    }));

    return NextResponse.json({
      client,
      measurements: processedMeasurements,
    });
  } catch (error) {
    console.error("Error fetching measurements:", error);
    return NextResponse.json(
      { error: "Failed to fetch measurements" },
      { status: 500 }
    );
  }
}

// POST new measurement for a client (FIXED & SECURED)
export async function POST(request, { params }) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Unauthorized to create measurements" },
        { status: 401 }
      );
    }

    // 2. Fix: Access params.id directly
    const clientId = params.id;

    // 3. Authorize: Verify the designer is assigned to this client (Admins can bypass)
    if (currentUser.role === "DESIGNER") {
      const isAssigned = await prisma.clientDesigner.findUnique({
        where: {
          clientId_designerId: { clientId, designerId: currentUser.id },
        },
      });
      if (!isAssigned) {
        return NextResponse.json(
          { error: "You are not assigned to this client" },
          { status: 403 }
        );
      }
    }

    // 4. Get the request body
    const body = await request.json();

    // 5. Separate non-measurement fields from measurement fields which are strings
    const {
      notes,
      status,
      completionDeadline,
      materialImageUrl,
      designImageUrl,
      ...measurementStrings
    } = body;

    // 6. CRITICAL FIX: Sanitize the measurement data, converting strings to Floats or null
    const sanitizedMeasurements = {};
    for (const key in measurementStrings) {
      if (Object.prototype.hasOwnProperty.call(measurementStrings, key)) {
        const value = measurementStrings[key];
        // Check if the value is a non-empty string that can be parsed
        if (typeof value === "string" && value.trim() !== "") {
          const num = parseFloat(value);
          sanitizedMeasurements[key] = isNaN(num) ? null : num;
        } else if (typeof value === "number" && !isNaN(value)) {
          // If it's already a number, keep it
          sanitizedMeasurements[key] = value;
        } else {
          // For empty strings, null, or undefined, set the value to null
          sanitizedMeasurements[key] = null;
        }
      }
    }

    // 7. Create the new measurement record in the database
    const newMeasurement = await prisma.measurement.create({
      data: {
        clientId,
        creatorId: currentUser.id,
        notes,
        status: status || "ORDER_CONFIRMED",
        completionDeadline: completionDeadline
          ? new Date(completionDeadline)
          : null,
        materialImageUrl,
        designImageUrl,
        // Spread the sanitized, correctly-typed measurement data
        ...sanitizedMeasurements,
      },
    });

    // Log the measurement creation event
    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "MEASUREMENT_CREATE",
        ipAddress,
        os,
        details: {
          measurementId: newMeasurement.id,
          clientId: clientId,
        },
      },
    });

    // 8. Return the newly created measurement
    return NextResponse.json(newMeasurement, { status: 201 });
  } catch (error) {
    console.error("Error creating measurement:", error);
    // Provide more detailed error response in development if needed
    return NextResponse.json(
      { error: "Failed to create measurement", details: error.message },
      { status: 500 }
    );
  }
}

// PUT update a measurement (FIXED & SECURED)
export async function PUT(request, { params }) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fix: Access params directly
    const { measurementId } = params;
    const body = await request.json();

    // 3. Sanitize incoming data just like in the POST request
    const {
      notes,
      status,
      completionDeadline,
      materialImageUrl,
      designImageUrl,
      ...measurementStrings
    } = body;

    const dataToUpdate = {
      notes,
      status,
      completionDeadline: completionDeadline
        ? new Date(completionDeadline)
        : undefined, // Keep as undefined if null to avoid overwriting
      materialImageUrl,
      designImageUrl,
    };

    // Sanitize numeric fields
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

    // Filter out any fields that are explicitly undefined, so they don't get updated
    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    // 4. Authorize: Build the where clause to ensure a designer can only update their own work
    const whereClause = {
      id: measurementId,
      // Security: Admins can update any measurement, designers only their own
      ...(currentUser.role === "DESIGNER" && { creatorId: currentUser.id }),
    };

    // 5. Update the measurement
    const updatedMeasurement = await prisma.measurement.update({
      where: whereClause,
      data: dataToUpdate,
    });

    // Log the measurement update event
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
    // Prisma throws P2025 error if the record to update is not found
    if (error.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Measurement not found or you don't have permission to edit it.",
        },
        { status: 404 }
      );
    }
    console.error("Error updating measurement:", error);
    return NextResponse.json(
      { error: "Failed to update measurement", details: error.message },
      { status: 500 }
    );
  }
}