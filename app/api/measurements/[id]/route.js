// app/api/measurements/[id]/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

// GET single measurement
export async function GET(request, { params }) {
  try {
    const { id } = params;

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

// PUT update measurement
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const {
      shoulderToChest,
      shoulderToBust,
      shoulderToUnderbust,
      shoulderToWaistFront,
      shoulderToWaistBack,
      waistToHip,
      shoulderToKnee,
      shoulderToDressLength,
      shoulderToAnkle,
      shoulderWidth,
      nippleToNipple,
      offShoulder,
      bust,
      underBust,
      waist,
      hip,
      thigh,
      knee,
      ankle,
      neck,
      shirtSleeve,
      elbowLength,
      longSleeves,
      aroundArm,
      elbow,
      wrist,
      inSeam,
      outSeam,
      measurementType,
      notes,
    } = body;

    const measurement = await prisma.measurement.update({
      where: { id },
      data: {
        shoulderToChest: shoulderToChest ? parseFloat(shoulderToChest) : null,
        shoulderToBust: shoulderToBust ? parseFloat(shoulderToBust) : null,
        shoulderToUnderbust: shoulderToUnderbust
          ? parseFloat(shoulderToUnderbust)
          : null,
        shoulderToWaistFront: shoulderToWaistFront
          ? parseFloat(shoulderToWaistFront)
          : null,
        shoulderToWaistBack: shoulderToWaistBack
          ? parseFloat(shoulderToWaistBack)
          : null,
        waistToHip: waistToHip ? parseFloat(waistToHip) : null,
        shoulderToKnee: shoulderToKnee ? parseFloat(shoulderToKnee) : null,
        shoulderToDressLength: shoulderToDressLength
          ? parseFloat(shoulderToDressLength)
          : null,
        shoulderToAnkle: shoulderToAnkle ? parseFloat(shoulderToAnkle) : null,
        shoulderWidth: shoulderWidth ? parseFloat(shoulderWidth) : null,
        nippleToNipple: nippleToNipple ? parseFloat(nippleToNipple) : null,
        offShoulder: offShoulder ? parseFloat(offShoulder) : null,
        bust: bust ? parseFloat(bust) : null,
        underBust: underBust ? parseFloat(underBust) : null,
        waist: waist ? parseFloat(waist) : null,
        hip: hip ? parseFloat(hip) : null,
        thigh: thigh ? parseFloat(thigh) : null,
        knee: knee ? parseFloat(knee) : null,
        ankle: ankle ? parseFloat(ankle) : null,
        neck: neck ? parseFloat(neck) : null,
        shirtSleeve: shirtSleeve ? parseFloat(shirtSleeve) : null,
        elbowLength: elbowLength ? parseFloat(elbowLength) : null,
        longSleeves: longSleeves ? parseFloat(longSleeves) : null,
        aroundArm: aroundArm ? parseFloat(aroundArm) : null,
        elbow: elbow ? parseFloat(elbow) : null,
        wrist: wrist ? parseFloat(wrist) : null,
        inSeam: inSeam ? parseFloat(inSeam) : null,
        outSeam: outSeam ? parseFloat(outSeam) : null,
        measurementType: measurementType || "snug",
        notes,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "MEASUREMENT_UPDATE",
        ipAddress,
        os,
        details: {
          measurementId: measurement.id,
          clientId: measurement.clientId,
        },
      },
    });

    return NextResponse.json(measurement);
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Measurement not found" },
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

    const { id } = params;

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