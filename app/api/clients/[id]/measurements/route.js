// app/api/clients/[id]/measurements/route.js

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session"; // Ensure this path points to your auth helper
import { prisma } from "@/app/lib/prisma.js";
import { RecordStatus } from "@prisma/client";

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
    "orderStatus",
    "completionDeadline",
    "materialImageUrl",
    "designImageUrl",
    "totalMeasurementsCount",
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
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.ip;
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

    // Fix: Await params first, then access id
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

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
      status: 'ACTIVE', // <-- Exclude soft-deleted measurements
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
    if (
      !currentUser ||
      !currentUser.id ||
      (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") ||
      currentUser.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { error: "Unauthorized to create measurements" },
        { status: 401 }
      );
    }

    // 2. Fix: Await params first, then access id
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is missing" },
        { status: 400 }
      );
    }

    // 3. Verify client exists first
    const clientExists = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!clientExists) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // 4. Authorize: Verify the designer is assigned to this client (Admins can bypass)
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

    // 5. Get the request body
    // const body = await request.json();

    // 6. Get the request body and log it for debugging
    const body = await request.json();
    console.log("Request body received:", JSON.stringify(body, null, 2));
    console.log("Client ID from params:", clientId);
    console.log("Current User:", currentUser);

    // 7. Validate required IDs first
    if (!clientId) {
      console.error("Client ID is missing from params");
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    if (!currentUser?.id) {
      console.error("User ID is missing from currentUser:", currentUser);
      return NextResponse.json(
        { error: "User authentication failed" },
        { status: 401 }
      );
    }

    // 8. Separate fields - exclude fields that shouldn't be sent to Prisma
    const {
      notes = "",
      status, // This could be either RecordStatus or OrderStatus from frontend
      orderStatus, // This is OrderStatus (ORDER_CONFIRMED/IN_PROGRESS/etc)
      completionDeadline,
      materialImageUrl = "",
      designImageUrl = "",
      // Exclude these fields that shouldn't be in the create data
      id,
      createdAt,
      updatedAt,
      totalMeasurementsCount,
      client,
      creator,
      // Exclude any measurement history fields
      measurements,
      assignedDesigners,
      assignedClients,
      clientProfile,
      logs,
      accounts,
      createdMeasurements,
      user,
      ...measurementStrings
    } = body;

    // 9. Sanitize the measurement data
    const sanitizedMeasurements = {};
    for (const key in measurementStrings) {
      if (Object.prototype.hasOwnProperty.call(measurementStrings, key)) {
        const value = measurementStrings[key];
        if (typeof value === "string" && value.trim() !== "") {
          const num = parseFloat(value);
          sanitizedMeasurements[key] = isNaN(num) ? null : num;
        } else if (typeof value === "number" && !isNaN(value)) {
          sanitizedMeasurements[key] = value;
        } else {
          sanitizedMeasurements[key] = null;
        }
      }
    }

    // 10. Create the measurement data object with proper types
    // Handle the status field - frontend sends 'status' but we need 'orderStatus'
    const finalOrderStatus = orderStatus || status || "ORDER_CONFIRMED";

    const measurementData = {
      clientId: clientId, // Already validated as non-null
      creatorId: currentUser.id, // Already validated as non-null
      notes: notes || "",
      orderStatus: finalOrderStatus, // OrderStatus enum
      completionDeadline: completionDeadline
        ? new Date(completionDeadline)
        : null,
      materialImageUrl: materialImageUrl || "",
      designImageUrl: designImageUrl || "",
      ...sanitizedMeasurements,
    };

    // 11. Final validation and logging
    console.log(
      "Final measurement data:",
      JSON.stringify(measurementData, null, 2)
    );

    // 12. Create the new measurement record
    const newMeasurement = await prisma.measurement.create({
      data: measurementData,
    });

    // 13. Calculate totalMeasurementsCount for the response
    const totalMeasurementsCount2 = countFilledMeasurements(newMeasurement);

    // 14. Log the event
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

    // 15. Return the newly created measurement with count
    return NextResponse.json(
      {
        ...newMeasurement,
        totalMeasurementsCount2,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating measurement:", error);
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
    if (
      !currentUser ||
      !currentUser.id ||
      (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") ||
      currentUser.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fix: Await params first, then access id
    const resolvedParams = await params;
    const measurementId = resolvedParams.id;

    if (!measurementId) {
      return NextResponse.json(
        { error: "Measurement ID is missing" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 3. Sanitize incoming data
    const {
      notes,
      status,
      orderStatus,
      completionDeadline,
      materialImageUrl,
      designImageUrl,
      ...measurementStrings
    } = body;

    const dataToUpdate = {
      notes,
      orderStatus: orderStatus || status,
      completionDeadline: completionDeadline
        ? new Date(completionDeadline)
        : undefined,
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

    // Filter out undefined fields
    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    // 4. Authorize: Build the where clause
    const whereClause = {
      id: measurementId,
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
