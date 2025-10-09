// twilio.ts (or wherever this lives)
import twilio from "twilio";

// Type the client based on the factory's return type
type TwilioClient = ReturnType<typeof twilio>;

let twilioClient: TwilioClient | null = null;

function getTwilioClient(): TwilioClient {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set",
      );
    }

    // ✅ use factory, not `new Twilio(...)`
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

interface SmsParams {
  to: string;
  from: string;
  body: string;
}

export async function sendSms(params: SmsParams): Promise<boolean> {
  try {
    const client = getTwilioClient();

    const message = await client.messages.create({
      to: params.to,
      from: params.from,
      body: params.body,
    });

    console.log("✅ SMS sent successfully:", message.sid);
    return true;
  } catch (error) {
    console.error("❌ Twilio SMS error:", error);
    throw error;
  }
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length > 10 && !phone.startsWith("+")) return `+${cleaned}`;
  return phone;
}
