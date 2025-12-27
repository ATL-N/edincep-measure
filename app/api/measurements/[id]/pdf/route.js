// @/app/api/measurements/[id]/pdf/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  const awaitedparam = await params;
      const { id } = awaitedparam;;
  const user = await getCurrentUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch both the measurement and the user's preference in parallel
    const [measurement, userPrefs] = await Promise.all([
      prisma.measurement.findFirst({
        where: { id: id },
        include: { client: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { measurementUnit: true },
      }),
    ]);

    if (!measurement) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
    }

    const doc = new jsPDF();
    
    // --- Unit Conversion Logic ---
    const unitPreference = userPrefs?.measurementUnit || "INCH";
    const displayUnit = unitPreference === "CENTIMETER" ? "cm" : "in";

    const convertValue = (valueInInches) => {
      if (valueInInches === null || valueInInches === undefined) return '-';
      if (unitPreference === 'CENTIMETER') {
        return (valueInInches * 2.54).toFixed(2);
      }
      // Round inches to two decimal places as well for consistency
      return parseFloat(valueInInches).toFixed(2);
    };
    
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
    const nonMeasurementKeys = new Set(['id', 'clientId', 'creatorId', 'status', 'orderStatus', 'completionDeadline', 'materialImageUrl', 'designImageUrl', 'notes', 'createdAt', 'updatedAt', 'client']);
    
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
        
        // Apply conversion here
        categorizedData[category][displayName][fitType] = convertValue(measurement[key]);
    }

    // --- PDF Generation ---
    doc.setFontSize(20);
    doc.text("Measurement Details", 14, 22);
    doc.setFontSize(11);
    doc.text(`Client: ${measurement.client.name}`, 14, 32);
    doc.text(`Date: ${new Date(measurement.createdAt).toLocaleDateString()}`, 14, 38);
    doc.text(`Status: ${measurement.orderStatus.replace(/_/g, ' ').toLowerCase()}`, 14, 44);

    let yPos = 55;

    if (measurement.notes) {
        doc.setFontSize(12);
        doc.text("Session Notes:", 14, yPos);
        yPos += 7;
        doc.setFontSize(10);
        const notesLines = doc.splitTextToSize(measurement.notes, 180);
        doc.text(notesLines, 14, yPos);
        yPos += (notesLines.length * 4) + 10;
    }

    const tableData = [];
    const categoryOrder = ['Lengths & Heights', 'Widths', 'Circumferences', 'Sleeves', 'Other'];

    for (const category of categoryOrder) {
        if (!categorizedData[category]) continue;

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
        head: [[
            'Measurement',
            `Snug (${displayUnit})`,
            `Static (${displayUnit})`,
            `Dynamic (${displayUnit})`
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        didParseCell: function (data) {
            if (data.row.raw?.[0]?.styles) {
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