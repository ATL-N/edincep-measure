// app/api/clients/[id]/measurements/[sessionId]/route.js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/app/lib/prisma.js";

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};


// A mapping to define categories and display names for each measurement field.
const measurementDefinitions = {
  // Vertical Measurements
  shoulderToChest: {
    category: "length",
    name: "Shoulder to Chest",
    description: "From shoulder top to the chest line.",
  },
  shoulderToBust: {
    category: "length",
    name: "Shoulder to Bust",
    description: "Shoulder to the fullest part of the bust.",
  },
  shoulderToUnderbust: {
    category: "length",
    name: "Shoulder to Underbust",
    description: "Shoulder to underbust line over the bust.",
  },
  shoulderToWaistFront: {
    category: "length",
    name: "Shoulder to Waist (Front)",
    description: "Shoulder at the neck to waist over the bust.",
  },
  shoulderToWaistBack: {
    category: "length",
    name: "Shoulder to Waist (Back)",
    description: "From the nape of the neck to the waist.",
  },
  waistToHip: {
    category: "length",
    name: "Waist to Hip",
    description: "From natural waist to the fullest part of the hip.",
  },
  shoulderToKnee: {
    category: "length",
    name: "Shoulder to Knee",
    description: "From shoulder top to the knee.",
  },
  shoulderToDressLength: {
    category: "length",
    name: "Dress Length",
    description: "Shoulder to the desired dress length.",
  },
  shoulderToAnkle: {
    category: "length",
    name: "Shoulder to Ankle",
    description: "From shoulder top to the ankle.",
  },

  // Width Measurements
  shoulderWidth: {
    category: "width",
    name: "Shoulder Width",
    description: "From one shoulder edge to the other.",
  },
  nippleToNipple: {
    category: "width",
    name: "Nipple to Nipple",
    description: "Distance between the bust points.",
  },
  offShoulder: {
    category: "width",
    name: "Off Shoulder",
    description: "Measurement for off-shoulder styles.",
  },

  // Circumference Measurements
  bust: {
    category: "circumference",
    name: "Bust",
    description: "Around the fullest part of the bust.",
  },
  underBust: {
    category: "circumference",
    name: "Under Bust",
    description: "Around the torso, directly under the bust.",
  },
  waist: {
    category: "circumference",
    name: "Waist",
    description: "Around the natural waistline.",
  },
  hip: {
    category: "circumference",
    name: "Hip",
    description: "Around the fullest part of the hips.",
  },
  thigh: {
    category: "circumference",
    name: "Thigh",
    description: "Around the fullest part of the thigh.",
  },
  knee: {
    category: "circumference",
    name: "Knee",
    description: "Around the knee.",
  },
  ankle: {
    category: "circumference",
    name: "Ankle",
    description: "Around the ankle bone.",
  },
  neck: {
    category: "circumference",
    name: "Neck",
    description: "Around the base of the neck.",
  },

  // Arm Measurements
  shirtSleeve: {
    category: "arm",
    name: "Shirt Sleeve",
    description: "Shoulder to the desired short sleeve length.",
  },
  elbowLength: {
    category: "arm",
    name: "Elbow Length",
    description: "Shoulder to the elbow.",
  },
  longSleeves: {
    category: "arm",
    name: "Long Sleeves",
    description: "Shoulder to the wrist.",
  },
  aroundArm: {
    category: "arm",
    name: "Around Arm",
    description: "Around the fullest part of the bicep.",
  },
  elbow: {
    category: "arm",
    name: "Elbow Circumference",
    description: "Around the elbow.",
  },
  wrist: {
    category: "arm",
    name: "Wrist",
    description: "Around the wrist bone.",
  },

  // Leg Measurements
  inSeam: {
    category: "leg",
    name: "Inseam",
    description: "From the crotch to the desired pants length.",
  },
  outSeam: {
    category: "leg",
    name: "Outseam",
    description: "From the waist to the desired pants length.",
  },
};

// Function to transform flat Prisma data into the categorized structure for the UI.
function transformMeasurementData(measurement) {
  const categorized = {};

  for (const baseName in measurementDefinitions) {
    const snugField = `${baseName}Snug`;
    const staticField = `${baseName}Static`;
    const dynamicField = `${baseName}Dynamic`;

    if (
      measurement[snugField] !== null ||
      measurement[staticField] !== null ||
      measurement[dynamicField] !== null
    ) {
      const { category, name, description } = measurementDefinitions[baseName];
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push({
        name,
        description,
        snug: measurement[snugField],
        static: measurement[staticField],
        dynamic: measurement[dynamicField],
        unit: "in", // Assuming inches, can be made dynamic if needed
      });
    }
  }
  return categorized;
}

// GET single measurement session
export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    const { id: clientId, sessionId } = await params;

    const session = await prisma.measurement.findFirst({
      where: {
        id: sessionId,
        clientId: clientId,
        status: "ACTIVE",
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Measurement session not found" },
        { status: 404 }
      );
    }

    // --- LOGGING ADDED ---
    console.log("RAW SESSION DATA FROM DB:", session);

    const { client, ...sessionData } = session;

    // If format=raw is requested, return the flat data for the edit page
    if (format === "raw") {
      console.log("RETURNING RAW DATA FOR EDIT FORM");
      return NextResponse.json({
        client: { name: client.name },
        session: sessionData,
      });
    }

    // Otherwise, return the transformed data for the details page
    const transformedMeasurements = transformMeasurementData(sessionData);

    const responsePayload = {
      client: { name: client.name, phone: client.phone, email: client.email },
      session: {
        id: sessionData.id,
        createdAt: sessionData.createdAt,
        notes: sessionData.notes,
        orderStatus: sessionData.orderStatus,
        completionDeadline: sessionData.completionDeadline,
        materialImageUrl: sessionData.materialImageUrl,
        designImageUrl: sessionData.designImageUrl,
        measurements: transformedMeasurements,
      },
    };

    console.log("RETURNING TRANSFORMED DATA FOR DETAILS PAGE:", responsePayload);
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Error fetching measurement session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// DELETE single measurement session (Soft Delete)
export async function DELETE(request, { params }) {
  try {
    // 1. Authenticate and authorize the user
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, sessionId } = params;

    // 2. Build the where clause for authorization
    const whereClause = {
      id: sessionId,
      clientId: clientId,
      // Designers can only delete measurements they created
      ...(currentUser.role === "DESIGNER" && { creatorId: currentUser.id }),
    };

    // 3. Verify the session exists and the user has permission
    const session = await prisma.measurement.findFirst({
      where: whereClause,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Measurement session not found or you do not have permission to delete it." },
        { status: 404 }
      );
    }

    // 4. Perform the soft delete by updating the status
    await prisma.measurement.update({
      where: { id: sessionId },
      data: { status: "DELETED" },
    });

    // 5. Log the event
    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "MEASUREMENT_DELETE",
        ipAddress,
        os,
        details: {
          measurementId: sessionId,
          clientId: clientId,
        },
      },
    });

    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

// PUT - Update a measurement session
export async function PUT(request, { params }) {
  try {
    // 1. Authenticate and authorize the user
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, sessionId } = await params;
    const body = await request.json();

    // 2. Build the where clause for authorization
    const whereClause = {
      id: sessionId,
      clientId: clientId,
      // Designers can only edit measurements they created
      ...(currentUser.role === "DESIGNER" && { creatorId: currentUser.id }),
    };

    // 3. Verify the session exists and the user has permission
    const session = await prisma.measurement.findFirst({
      where: whereClause,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Measurement session not found or you do not have permission to edit it." },
        { status: 404 }
      );
    }

    // 4. Prepare the data for update
    const { notes, orderStatus, completionDeadline, materialImageUrl, designImageUrl, ...measurements } = body;

    // Convert numeric measurement values from string to float
    const measurementData = {};
    for (const key in measurements) {
      // Skip read-only fields that might be in the body
      if (key === 'id' || key === 'clientId' || key === 'createdAt' || key === 'updatedAt' || key === 'creatorId') {
        continue;
      }
      if (measurements[key] !== null && measurements[key] !== "") {
        const parsedValue = parseFloat(measurements[key]);
        if (!isNaN(parsedValue)) {
          measurementData[key] = parsedValue;
        }
      } else {
        measurementData[key] = null;
      }
    }

    const updateData = {
      notes,
      orderStatus,
      completionDeadline: completionDeadline ? new Date(completionDeadline) : null,
      materialImageUrl,
      designImageUrl,
      ...measurementData,
    };

    // 5. Perform the update
    const updatedSession = await prisma.measurement.update({
      where: { id: sessionId },
      data: updateData,
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
          measurementId: sessionId,
          clientId: clientId,
          updatedFields: Object.keys(body),
        },
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
