import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const mailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) {
      mailData.text = params.text;
    }
    
    if (params.html) {
      mailData.html = params.html;
    }
    
    // Ensure at least one content type is present
    if (!params.text && !params.html) {
      mailData.text = params.subject; // Fallback to subject as text
    }

    await mailService.send(mailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    throw error;
  }
}