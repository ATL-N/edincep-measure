
// @/app/api/client/profile/route.js
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const prisma = new PrismaClient();

export async function GET(request) {
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clientProfile = await prisma.client.findUnique({
      where: { id: user.clientId },
    });
    if (!clientProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(clientProfile);
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const user = await getCurrentUser(request);

  if (!user || user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, address } = body;

    const updatedProfile = await prisma.client.update({
      where: { id: user.clientId },
      data: { name, phone, address },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating client profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
