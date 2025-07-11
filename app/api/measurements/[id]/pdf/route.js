// app/api/measurements/[id]/pdf/route.js

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { Readable } from "stream";

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

export async function GET(request, { params }) {
  try {
    const { id: sessionId } = params;

    const session = await prisma.measurement.findUnique({
      where: { id: sessionId },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      return new NextResponse("Measurement session not found", { status: 404 });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Measurement Session for ${session.client.name}`,
        Author: "Edincep Measure",
      },
    });

    const stream = new Readable();
    stream._read = () => {}; // _read is required but can be a no-op
    doc.on("data", (chunk) => stream.push(chunk));
    doc.on("end", () => stream.push(null));

    // Header
    doc.fontSize(24).font("Helvetica-Bold").text("Edincep Measure", { align: "center" });
    doc.fontSize(12).font("Helvetica").text("Precision Tailoring & Design", { align: "center" });
    doc.moveDown();

    // Client Information
    doc.fontSize(16).font("Helvetica-Bold").text(`Client: ${session.client.name}`);
    doc.fontSize(10).font("Helvetica").text(`Email: ${session.client.email || 'N/A'}`);
    doc.text(`Phone: ${session.client.phone || 'N/A'}`);
    doc.moveDown();

    // Session Details
    doc.fontSize(14).font("Helvetica-Bold").text("Session Details");
    doc.fontSize(10).font("Helvetica").text(`Session ID: ${session.id}`);
    doc.text(`Created By: ${session.creator.name || 'N/A'} (${session.creator.email || 'N/A'})`);
    doc.text(`Date: ${new Date(session.createdAt).toLocaleDateString()}`);
    doc.text(`Order Status: ${session.status.replace(/_/g, ' ')}`);
    doc.text(`Completion Deadline: ${session.completionDeadline ? new Date(session.completionDeadline).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    // Notes
    if (session.notes) {
      doc.fontSize(12).font("Helvetica-Bold").text("Notes:");
      doc.fontSize(10).font("Helvetica").text(session.notes);
      doc.moveDown();
    }

    // Images
    if (session.materialImageUrl || session.designImageUrl) {
      doc.fontSize(12).font("Helvetica-Bold").text("Associated Images:");
      if (session.materialImageUrl) {
        // For local files, you might need to adjust the path to be absolute
        // For simplicity, this example assumes the image is accessible via a URL or a direct path from the server's perspective
        // In a real app, you'd likely fetch the image and embed it, or use a full URL.
        // For now, just display the URL.
        doc.fontSize(10).font("Helvetica").text(`Material Image: ${process.cwd()}/public${session.materialImageUrl}`);
        // Example of embedding an image (requires 'fs' or 'https' to read the image data)
        // doc.image(`${process.cwd()}/public${session.materialImageUrl}`, { fit: [200, 200], align: 'center' });
      }
      if (session.designImageUrl) {
        doc.fontSize(10).font("Helvetica").text(`Design Image: ${process.cwd()}/public${session.designImageUrl}`);
        // doc.image(`${process.cwd()}/public${session.designImageUrl}`, { fit: [200, 200], align: 'center' });
      }
      doc.moveDown();
    }

    // Measurements
    doc.fontSize(14).font("Helvetica-Bold").text("Measurements");
    const transformedMeasurements = transformMeasurementData(session);

    for (const category in transformedMeasurements) {
      doc.fontSize(12).font("Helvetica-Bold").text(`${category.charAt(0).toUpperCase() + category.slice(1)} Measurements:`);
      doc.moveDown(0.5);

      transformedMeasurements[category].forEach((m) => {
        doc.fontSize(10).font("Helvetica-Bold").text(`${m.name}:`);
        doc.font("Helvetica").text(`  Snug: ${m.snug || 'N/A'} ${m.unit}`);
        doc.text(`  Static: ${m.static || 'N/A'} ${m.unit}`);
        doc.text(`  Dynamic: ${m.dynamic || 'N/A'} ${m.unit}`);
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    doc.end();

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="measurement_session_${sessionId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
