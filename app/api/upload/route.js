// app/api/upload/route.js

import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getCurrentUser } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to get IP and OS from request
const getClientInfo = (request) => {
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip;
  const os = request.headers.get("user-agent");
  return { ipAddress, os };
};

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser || (currentUser.role !== "DESIGNER" && currentUser.role !== "ADMIN") || currentUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.formData();
    const file = data.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${Date.now()}-${file.name}`;
    const path = join(process.cwd(), "public/uploads", filename);

    await writeFile(path, buffer);

    // Construct the full URL for the uploaded file
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host");
    const fullUrl = `${protocol}://${host}/uploads/${filename}`;

    const { ipAddress, os } = getClientInfo(request);
    await prisma.log.create({
      data: {
        userId: currentUser.id,
        action: "FILE_UPLOAD",
        ipAddress,
        os,
        details: {
          filename: file.name,
          filePath: fullUrl, // Log the full URL
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      path: fullUrl // Return the full URL
    });
    
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
