// app/api/measurements/share/[token]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendSms } from "@/app/lib/sms"; // Import the SMS utility

// Helper to convert display names to camelCase DB fields
const toCamelCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

// Simplified measurement categories to know which fields to expect
const measurementCategories = {
  length: [
    "Shoulder to Chest", "Shoulder to Bust", "Shoulder to Underbust",
    "Shoulder to Waist Front", "Shoulder to Waist Back", "Waist to Hip",
    "Shoulder to Knee", "Shoulder to Dress Length", "Shoulder to Ankle",
  ],
  width: ["Shoulder Width", "Nipple to Nipple", "Off Shoulder"],
  circumference: [
    "Bust", "Under Bust", "Waist", "Hip", "Thigh", "Knee", "Ankle", "Neck",
  ],
  arm: [
    "Shirt Sleeve", "Elbow Length", "Long Sleeves", "Around Arm", "Elbow", "Wrist",
  ],
  leg: ["In Seam", "Out Seam"],
};

export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // 1. Find the share link by token
    const shareLink = await prisma.measurementShareLink.findUnique({
      where: { token },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        designer: {
          select: { id: true, name: true, measurementUnit: true }, // Get designer's preferred unit for client
        },
        measurement: true, // Include existing measurement if any
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found or invalid." }, { status: 404 });
    }

    const now = new Date();

    // 2. Check link expiration based on state
    if (shareLink.measurementId) {
      // Link has been used for initial submission, now checking for update window
      if (!shareLink.updateWindowEnd || shareLink.updateWindowEnd < now) {
        return NextResponse.json({ error: "Update window has expired. Link is no longer valid." }, { status: 410 });
      }
      // If within update window, proceed
    } else {
      // Link has not been used for initial submission, checking creation window
      if (shareLink.expiresAt < now) {
        return NextResponse.json({ error: "Link for initial submission has expired." }, { status: 410 });
      }
      // If within creation window, proceed
    }

    // 3. Return relevant data for the form
    return NextResponse.json(
      {
        clientName: shareLink.client.name,
        designerName: shareLink.designer.name,
        measurementUnit: shareLink.designer.measurementUnit, // Client will use designer's unit
        measurement: shareLink.measurement, // Null if creation mode, object if update mode
        expiresAt: shareLink.expiresAt, // Original link expiry
        updateWindowEnd: shareLink.updateWindowEnd, // For client-side display
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error validating share link (GET):", error);
    return NextResponse.json({ error: "Failed to validate share link." }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { token } = await params;
    
    // 1. Find and validate the share link
    const shareLink = await prisma.measurementShareLink.findUnique({
      where: { token },
      include: {
        client: {
          select: { id: true, name: true, phone: true },
        },
        designer: { // needed for creatorId
          select: { id: true }
        }
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Share link not found or invalid." }, { status: 404 });
    }

    const now = new Date();

    // 2. Re-validate the expiration logic before writing data
    if (shareLink.measurementId) {
      if (!shareLink.updateWindowEnd || shareLink.updateWindowEnd < now) {
        return NextResponse.json({ error: "Update window has expired. Link is no longer valid." }, { status: 410 });
      }
    } else {
      if (shareLink.expiresAt < now) {
        return NextResponse.json({ error: "Link for initial submission has expired." }, { status: 410 });
      }
    }

    // 3. Get the data from the request body
    // The client has already formatted the data correctly (e.g., { waistStatic: 28.0 })
    const body = await req.json();
    const { notes, ...measurementData } = body;

    let resultMeasurement;
    let message;

    if (shareLink.measurementId) {
      // UPDATE existing measurement
      resultMeasurement = await prisma.measurement.update({
        where: { id: shareLink.measurementId },
        data: {
          notes,
          ...measurementData, // Use the data directly from the client
          updatedAt: now,
        },
      });
      message = "Measurements updated successfully!";
      // No SMS on update as per requirements

    } else {
      // CREATE new measurement
      const updateWindowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      resultMeasurement = await prisma.measurement.create({
        data: {
          clientId: shareLink.clientId,
          creatorId: shareLink.designerId,
          notes,
          ...measurementData, // Use the data directly from the client
          createdAt: now,
          updatedAt: now,
        },
      });

      // Link the new measurement to the share link and set the update window
      await prisma.measurementShareLink.update({
        where: { id: shareLink.id },
        data: {
          measurementId: resultMeasurement.id,
          updateWindowEnd: updateWindowEnd,
        },
      });

      message = "Measurements submitted successfully!";

      // Send SMS confirmation for initial submission
      if (shareLink.client.phone) {
        const smsMessage = `Hello ${shareLink.client.name}, your measurements have been submitted! You have a 2-hour window to make corrections using the same link.`;
        await sendSms(shareLink.client.phone, smsMessage);
      }
    }

    return NextResponse.json({ message, measurementId: resultMeasurement.id }, { status: 200 });

  } catch (error) {
    console.error("Error submitting measurements (POST):", error);
    return NextResponse.json({ error: "Failed to submit measurements." }, { status: 500 });
  }
}
