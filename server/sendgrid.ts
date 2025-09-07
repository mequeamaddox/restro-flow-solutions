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
    console.log('📧 [SendGrid] Starting email send process...');
    console.log('📧 [SendGrid] API Key present:', !!process.env.SENDGRID_API_KEY);
    console.log('📧 [SendGrid] API Key length:', process.env.SENDGRID_API_KEY?.length || 0);
    
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

    console.log('📧 [SendGrid] Sending email with data:', { 
      to: mailData.to, 
      from: mailData.from, 
      subject: mailData.subject, 
      hasText: !!mailData.text, 
      hasHtml: !!mailData.html 
    });
    
    const result = await mailService.send(mailData);
    console.log('📧 [SendGrid] Email sent successfully! Response:', result[0]?.statusCode);
    return true;
  } catch (error) {
    console.error('❌ [SendGrid] Email sending failed:', error);
    console.error('❌ [SendGrid] Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}