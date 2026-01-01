// app/lib/sms.js
import { NextResponse } from "next/server";

/**
 * Sends an SMS using the Arkesel API.
 * @param {string} phoneNumber - The recipient's phone number.
 * @param {string} message - The SMS message content.
 * @returns {Promise<boolean>} - True if the SMS was sent successfully, false otherwise.
 */
export async function sendSms(phoneNumber, message) {
    console.log(
      "arkesel api and sender ids:",
      process.env.ARKESEL_API_KEY,
      process.env.ARKESEL_SENDER_ID
    );
    if (!process.env.ARKESEL_API_KEY || !process.env.ARKESEL_SENDER_ID) {
      console.error(
        "Arkesel API Key or Sender ID is not configured in environment variables."
      );
      return false;
    }
    
    try {
        const response = await fetch(
          "https://sms.arkesel.com/api/v2/sms/send",
          {
            method: "POST",
            headers: {
              "api-key": process.env.ARKESEL_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sender: process.env.ARKESEL_SENDER_ID,
              message: message,
              recipients: [phoneNumber],
            }),
          }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Arkesel API responded with an error:", errorData);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Failed to make Arkesel API call:", error);
        return false;
    }
}
