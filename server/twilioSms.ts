import { Twilio } from 'twilio';

// Initialize Twilio client
let twilioClient: Twilio | null = null;

function getTwilioClient(): Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set');
    }
    
    twilioClient = new Twilio(accountSid, authToken);
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
    
    console.log('✅ SMS sent successfully:', message.sid);
    return true;
  } catch (error) {
    console.error('❌ Twilio SMS error:', error);
    throw error;
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add +1 if it's a 10-digit US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // Add + if it's missing
  if (cleaned.length > 10 && !phone.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return phone;
}