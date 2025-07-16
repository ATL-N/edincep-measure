
// @/app/api/client/measurements/[sessionId]/pdf/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { jsPDF } from "jspdf";

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  const { sessionId } = params;
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const measurement = await prisma.measurement.findFirst({
      where: {
        id: sessionId,
        clientId: user.clientId,
      },
      include: {
        client: true,
      },
    });

    if (!measurement) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
    }

    const doc = new jsPDF();
    doc.text("Measurement Details", 20, 20);
    doc.text(`Client: ${measurement.client.name}`, 20, 30);
    doc.text(`Date: ${new Date(measurement.createdAt).toLocaleDateString()}`, 20, 40);
    doc.text("Measurements:", 20, 50);
    doc.text(JSON.stringify(measurement.data, null, 2), 20, 60);

    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="measurement-${sessionId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
