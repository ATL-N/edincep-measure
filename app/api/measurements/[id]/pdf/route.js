// @/app/api/measurements/[id]/pdf/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  const { id } = params;
  const user = await getCurrentUser(request);
  console.log('sdsfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', id)

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const measurement = await prisma.measurement.findFirst({
      where: { id: id },
      include: { client: true },
    });

    if (!measurement) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
    }

    const doc = new jsPDF();
    
    // --- Helper Functions ---
    const formatName = (key) => {
        return key.replace(/([A-Z])/g, ' $1').trim();
    };

    const getCategory = (name) => {
        const lowerCaseName = name.toLowerCase();
        if (lowerCaseName.includes('sleeve')) return 'Sleeves';
        if (lowerCaseName.includes('length') || lowerCaseName.includes('seam') || lowerCaseName.startsWith('shoulder') || lowerCaseName.startsWith('waistto')) return 'Lengths & Heights';
        if (lowerCaseName.includes('width') || lowerCaseName.includes('nipple')) return 'Widths';
        const circumferences = ['bust', 'underbust', 'waist', 'hip', 'thigh', 'knee', 'ankle', 'neck', 'arm', 'elbow', 'wrist'];
        if (circumferences.some(c => lowerCaseName.includes(c))) return 'Circumferences';
        return 'Other';
    };

    // --- Data Restructuring ---
    const categorizedData = {};
    const nonMeasurementKeys = new Set(['id', 'clientId', 'creatorId', 'status', 'completionDeadline', 'materialImageUrl', 'designImageUrl', 'notes', 'createdAt', 'updatedAt', 'client']);
    
    for (const key in measurement) {
        if (nonMeasurementKeys.has(key) || measurement[key] === null) continue;

        let baseName = key;
        let fitType = 'value';

        if (key.endsWith('Snug')) {
            baseName = key.slice(0, -4);
            fitType = 'Snug';
        } else if (key.endsWith('Static')) {
            baseName = key.slice(0, -6);
            fitType = 'Static';
        } else if (key.endsWith('Dynamic')) {
            baseName = key.slice(0, -7);
            fitType = 'Dynamic';
        }

        const category = getCategory(baseName);
        const displayName = formatName(baseName);

        if (!categorizedData[category]) categorizedData[category] = {};
        if (!categorizedData[category][displayName]) categorizedData[category][displayName] = {};
        
        categorizedData[category][displayName][fitType] = measurement[key];
    }

    // --- PDF Generation ---
    // const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Measurement Details", 14, 22);
    doc.setFontSize(11);
    doc.text(`Client: ${measurement.client.name}`, 14, 32);
    doc.text(`Date: ${new Date(measurement.createdAt).toLocaleDateString()}`, 14, 38);
    doc.text(`Status: ${measurement.status.replace(/_/g, ' ').toLowerCase()}`, 14, 44);

    let yPos = 55;

    if (measurement.notes) {
        doc.setFontSize(12);
        doc.text("Session Notes:", 14, yPos);
        yPos += 7;
        doc.setFontSize(10);
        const notesLines = doc.splitTextToSize(measurement.notes, 180);
        doc.text(notesLines, 14, yPos);
        yPos += (notesLines.length * 4) + 10; // Adjust space after notes
    }

    const tableData = [];
    const categoryOrder = ['Lengths & Heights', 'Widths', 'Circumferences', 'Sleeves', 'Other'];

    for (const category of categoryOrder) {
        if (!categorizedData[category]) continue;

        // Add a header row for the category
        tableData.push([{ content: category, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }]);

        for (const name in categorizedData[category]) {
            const fits = categorizedData[category][name];
            tableData.push([
                name,
                fits.Snug !== undefined ? fits.Snug : '-',
                fits.Static !== undefined ? fits.Static : '-',
                fits.Dynamic !== undefined ? fits.Dynamic : '-',
            ]);
        }
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Measurement', 'Snug', 'Static', 'Dynamic']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        didParseCell: function (data) {
            if (data.row.raw?.[0]?.styles) { // Check for our category row
                data.cell.styles.halign = 'center';
            }
        }
    });

    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="measurement-${id}.pdf"`,
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