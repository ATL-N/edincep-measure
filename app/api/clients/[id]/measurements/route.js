// app/api/clients/[id]/measurements/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// Helper function to count non-null measurement fields in a session
const countFilledMeasurements = (measurement) => {
  let count = 0;
  // List of keys to ignore (non-measurement fields)
  const ignoreKeys = [
    "id",
    "clientId",
    "client",
    "notes",
    "createdAt",
    "updatedAt",
  ];

  for (const key in measurement) {
    if (!ignoreKeys.includes(key) && measurement[key] !== null) {
      count++;
    }
  }
  return count;
};

// GET all measurements for a client, with search capability
export async function GET(request, { params }) {
  try {
    const { id: clientId } = params;
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

    // Build where clause for searching notes
    const where = { clientId };
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

// POST new measurement for a client (Corrected)
export async function POST(request, { params }) {
  try {
    const { id: clientId } = params;
    const body = await request.json(); // e.g., { notes: '...', measurements: { shoulderToChestSnug: '23' } }
    console.log('this is the body body:', body)
    // Destructure the parts from the request body
    const { notes, measurements } = body;

    if (!measurements || typeof measurements !== 'object') {
        return NextResponse.json({ error: "Measurements data is missing or not in the correct format." }, { status: 400 });
    }

    // --- THIS IS THE FIX ---
    // Create the final flat object for Prisma by spreading the 'measurements' object
    // and adding the other necessary fields.
    const dataToSave = {
      ...measurements, // Takes all key-value pairs from the measurements object
      notes: notes,
      clientId: clientId,
    };
    
    // Prisma expects numbers, but form inputs are strings. Let's parse them.
    // This loop ensures data integrity and prevents type errors.
    for (const key in dataToSave) {
        if (key !== 'notes' && key !== 'clientId') {
            const value = parseFloat(dataToSave[key]);
            // If the value is not a number (e.g., an empty string), save it as null.
            dataToSave[key] = isNaN(value) ? null : value;
        }
    }

    const newSession = await prisma.measurement.create({
      data: dataToSave, // Pass the corrected, flat object to Prisma
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Error creating measurement:", error);
    if (error instanceof Prisma.PrismaClientValidationError) {
        return NextResponse.json({ error: "Invalid data provided for measurement.", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create measurement session." }, { status: 500 });
  }
}
