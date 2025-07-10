// app/api/clients/[id]/route.js
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

// GET single client with detailed measurements
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        measurements: {
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

    return NextResponse.json(processedClient);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

// export async function GET(request, { params }) {
//   try {
//     const { id } = params;

//     const client = await prisma.client.findUnique({
//       where: { id },
//       include: {
//         // This is the key change: we include the most recent measurement
//         measurements: {
//           orderBy: { createdAt: "desc" },
//           take: 1,
//         },
//       },
//     });

//     if (!client) {
//       return NextResponse.json({ error: "Client not found" }, { status: 404 });
//     }

//     // The client object will now have a `measurements` array
//     // with either one item (the latest) or be empty.
//     return NextResponse.json(client);
//   } catch (error) {
//     console.error("Error fetching client:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch client" },
//       { status: 500 }
//     );
//   }
// }



// PUT update client (NEW)
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { firstName, lastName, phone, email, address, notes, status } = body;
    
    // Combine first and last name for the update
    const name = `${firstName || ''} ${lastName || ''}`.trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        notes,
        status,
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
    const { id } = params;

    await prisma.client.delete({
      where: { id },
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
