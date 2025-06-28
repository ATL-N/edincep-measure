// app/api/clients/[id]/measurements/[sessionId]/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

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
    const { id: clientId, sessionId } = params;

    const session = await prisma.measurement.findUnique({
      where: { id: sessionId, clientId: clientId }, // Ensure session belongs to the client
      include: { client: { select: { name: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Measurement session not found" },
        { status: 404 }
      );
    }

    const { client, ...sessionData } = session;
    const transformedMeasurements = transformMeasurementData(sessionData);

    const responsePayload = {
      client: { name: client.name },
      session: {
        id: sessionData.id,
        createdAt: sessionData.createdAt,
        notes: sessionData.notes,
        measurements: transformedMeasurements,
      },
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Error fetching measurement session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// DELETE single measurement session
export async function DELETE(request, { params }) {
  try {
    const { id: clientId, sessionId } = params;

    // First, verify the session exists and belongs to the client before deleting
    const session = await prisma.measurement.findUnique({
      where: { id: sessionId, clientId: clientId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Measurement session not found" },
        { status: 404 }
      );
    }

    await prisma.measurement.delete({
      where: { id: sessionId },
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

// We can add PUT later for editing a session
