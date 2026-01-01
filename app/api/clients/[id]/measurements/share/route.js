// app/api/clients/[id]/measurements/share/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "DESIGNER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const designerId = session.user.id;

    // 1. Verify client existence and designer's access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        assignedDesigners: {
          where: { designerId: designerId }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // For DESIGNER role, ensure client is assigned to them
    if (session.user.role === "DESIGNER" && !client.assignedDesigners.length) {
      return NextResponse.json({ error: "Client not assigned to this designer" }, { status: 403 });
    }
    // ADMIN can share for any client, so no further checks needed for ADMIN

    // 2. Generate unique, secure token
    const token = crypto.randomBytes(32).toString("hex"); // 64-character hex string

    // 3. Set expiration for 3 days from now
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds

    // 4. Save the share link record
    const shareLink = await prisma.measurementShareLink.create({
      data: {
        token,
        expiresAt,
        clientId,
        designerId,
      },
    });

    // 5. Construct and return the sharable URL
    const appDomain = process.env.DOMAIN || 'localhost:3000'; // Ensure this is correctly set in .env
    const sharableUrl = `https://${appDomain}/measurements/fill?token=${token}`;

    return NextResponse.json({ sharableUrl, token: shareLink.token }, { status: 200 });

  } catch (error) {
    console.error("Error generating share link:", error);
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
  }
}
