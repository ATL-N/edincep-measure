// app/api/sms/send/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendSms } from "@/app/lib/sms";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || (session.user.role !== "DESIGNER" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber, message } = await req.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({ error: "Phone number and message are required." }, { status: 400 });
    }

    const success = await sendSms(phoneNumber, message);

    if (success) {
      return NextResponse.json({ message: "SMS sent successfully." }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Failed to send SMS." }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in send-sms endpoint:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
