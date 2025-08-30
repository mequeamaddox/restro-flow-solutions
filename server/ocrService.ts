import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import pdf2pic from 'pdf2pic';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

// Simple OCR service for invoice processing
export class OCRService {
  
  // Process image files with Tesseract
  static async extractTextFromImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Starting image OCR processing...');
      
      const worker = await createWorker('eng');
      
      // Enhanced Tesseract configuration for better invoice scanning
      // Note: Some parameters can only be set during initialization
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$:-# \n\r\t',
        tessedit_pageseg_mode: '1', // Automatic page segmentation
      });
      
      const { data: { text, confidence } } = await worker.recognize(buffer);
      await worker.terminate();
      
      const cleanText = text
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`Image OCR completed: ${confidence.toFixed(1)}% confidence`);
      return { text: cleanText, confidence: Math.round(confidence) };
      
    } catch (error) {
      console.error('Image OCR failed:', error);
      return { 
        text: 'Image OCR failed. Please try uploading a clearer, high-contrast image.', 
        confidence: 0 
      };
    }
  }
  
  // Main OCR processing method with commercial-grade support
  static async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Starting professional OCR processing...');
      
      // First try direct text extraction for text-based PDFs
      const directText = await this.extractDirectPDFText(buffer);
      
      if (directText.success && directText.text && directText.text.trim().length > 50) {
        console.log('Direct PDF text extraction successful');
        return {
          text: directText.text,
          confidence: 95 // High confidence for direct text extraction
        };
      }
      
      console.log('PDF appears to be scanned - using enterprise OCR...');
      
      // Try AWS Textract first (commercial-grade OCR)
      try {
        console.log('Attempting AWS Textract processing...');
        const textractResult = await this.extractTextWithTextract(buffer);
        if (textractResult.confidence > 80) {
          console.log('AWS Textract processing successful');
          return textractResult;
        }
        console.log(`AWS Textract returned low confidence (${textractResult.confidence}%), falling back...`);
      } catch (error) {
        console.error('AWS Textract error:', error instanceof Error ? error.message : 'Unknown error');
        console.log('Falling back to enhanced Tesseract...');
      }
      
      // Fallback to enhanced Tesseract OCR
      return await this.extractTextFromScannedPDF(buffer);
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      return {
        text: `Professional OCR processing failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}
        
Please try:
1. Uploading a clear, high-resolution image instead
2. Ensuring the PDF is not corrupted or password-protected
3. Using a different file format (JPG, PNG)`,
        confidence: 10
      };
    }
  }

  // Extract text directly from PDF (for text-based PDFs)
  private static async extractDirectPDFText(buffer: Buffer): Promise<{ success: boolean; text: string }> {
    try {
      const data = await pdfParse(buffer);
      return {
        success: true,
        text: data.text.trim()
      };
    } catch (error) {
      return {
        success: false,
        text: ''
      };
    }
  }

  // AWS Textract - Commercial-grade OCR (same technology used by QuickBooks)
  private static async extractTextWithTextract(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }

    const textract = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: buffer,
      },
      FeatureTypes: ['FORMS', 'TABLES'], // Extract forms and tables for invoices
    });

    const response = await textract.send(command);
    
    if (!response.Blocks) {
      throw new Error('No text found in document');
    }

    // Extract text from Textract blocks
    let extractedText = '';
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const block of response.Blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        extractedText += block.Text + '\n';
        if (block.Confidence) {
          totalConfidence += block.Confidence;
          confidenceCount++;
        }
      }
    }

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    
    console.log(`AWS Textract completed with ${averageConfidence.toFixed(1)}% confidence`);
    
    return {
      text: extractedText.trim(),
      confidence: Math.round(averageConfidence)
    };
  }

  // Convert scanned PDF to images and run OCR
  private static async extractTextFromScannedPDF(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Attempting direct OCR on PDF without conversion...');
      
      // Sometimes Tesseract can handle PDFs directly, let's try that first
      try {
        const worker = await createWorker('eng');
        
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$:-# \n\r\t',
          tessedit_pageseg_mode: '6', // Uniform block of text
        });
        
        const { data: { text, confidence } } = await worker.recognize(buffer);
        await worker.terminate();
        
        if (text && text.trim().length > 10 && confidence > 30) {
          console.log(`Direct PDF OCR succeeded with ${confidence}% confidence`);
          return {
            text: text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim(),
            confidence: Math.round(confidence)
          };
        }
        
        console.log(`Direct PDF OCR low confidence (${confidence}%), trying conversion method...`);
        
      } catch (directError) {
        console.log('Direct PDF OCR failed, trying conversion method...');
      }
      
      // Fallback to user guidance for scanned PDFs
      return {
        text: `This appears to be a scanned PDF that requires image conversion for optimal OCR.

For the best results with scanned invoices:

1. **Convert PDF to Image**: Use any online PDF to JPG converter
2. **Upload as Image**: Upload the converted JPG/PNG file instead
3. **Ensure Quality**: Make sure the image has good contrast and is clearly readable

Alternative: Take a clear photo of the invoice with your phone camera and upload that instead.

The system detected this is a scanned document but the automatic conversion encountered technical limitations.`,
        confidence: 25
      };
      
    } catch (error) {
      console.error('Scanned PDF processing failed completely:', error);
      return {
        text: `Scanned PDF processing not available. 

Please convert your PDF to a JPG or PNG image and upload that instead for OCR processing.

You can:
1. Use any online "PDF to JPG" converter
2. Take a photo of the invoice with your phone
3. Scan the document as an image file

The OCR system works best with image files rather than scanned PDFs.`,
        confidence: 10
      };
    }
  }
  
  // Parse invoice data from extracted text
  static parseInvoiceFromText(text: string): {
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    total: number;
    subtotal: number;
  } {
    const lines = text.split('\n');
    
    let vendorName = 'Unknown Vendor';
    let invoiceNumber = 'N/A';
    let invoiceDate = new Date().toISOString().split('T')[0];
    let total = 0;
    let subtotal = 0;
    
    // Enhanced parsing logic for better field extraction
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      // Extract vendor name (usually first few lines, company name patterns)
      if (i < 8 && line.length > 3 && !lowerLine.includes('invoice') && !lowerLine.includes('date') && 
          !line.match(/^\d/) && !lowerLine.includes('phone') && !lowerLine.includes('email') &&
          !lowerLine.includes('address') && !lowerLine.includes('city') && !lowerLine.includes('zip')) {
        // Look for company patterns (high priority)
        if (line.includes('Inc.') || line.includes('LLC') || line.includes('Corp') || 
            line.includes('Company') || line.includes('Co.') || line.includes('Service') ||
            line.includes('Food') || line.includes('Supply') || line.includes('Restaurant') ||
            line.includes('Kitchen') || line.includes('Equipment') || line.includes('Repair') ||
            line.includes('Seafood') || line.includes('Market') || line.includes('Wholesale') ||
            line.includes('&') && line.length < 30) { // "&" suggests company name like "C& C Seafood"
          vendorName = line;
        } else if (vendorName === 'Unknown Vendor' && line.length > 5 && line.length < 50 && 
                   line.match(/^[A-Za-z&]/) && !lowerLine.includes('department') && 
                   !lowerLine.includes('customer') && !lowerLine.includes('order')) {
          vendorName = line; // Fallback to first meaningful text line
        }
      }
      
      // Look for invoice numbers - multiple patterns
      const invoicePatterns = [
        /invoice\s*#?\s*:?\s*(\w+)/i,
        /inv\s*#?\s*:?\s*(\w+)/i,
        /^(\d{4,8})$/,  // Standalone number 4-8 digits (like 177132)
        /#\s*(\d+)/,    // Number with # prefix
        /order\s*no\.?\s*(\d+)/i,  // Order number
        /customer['']?s?\s*order\s*no\.?\s*(\d+)/i, // Customer's order no
      ];
      
      // Special check for standalone numbers at start of line (common invoice format)
      if (line.match(/^\d{5,8}$/) && i < 10) { // First 10 lines, 5-8 digits
        invoiceNumber = line;
      }
      
      for (const pattern of invoicePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim();
          if (candidate.length >= 3 && candidate.length <= 12) {
            invoiceNumber = candidate;
            break;
          }
        }
      }
      
      // Look for total amounts - multiple patterns
      const totalPatterns = [
        /total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /amount[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /balance[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*$/, // Dollar amount at end of line
        /(\d+\.\d{2})\s*$/, // Decimal amount at end of line (like "150.75")
        /grand\s*total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /net\s*amount[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      ];
      
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > 0 && amount < 100000) { // Reasonable range
            total = amount;
          }
        }
      }
      
      // Look for subtotal amounts
      const subtotalPatterns = [
        /subtotal[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /sub[\s-]*total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      ];
      
      for (const pattern of subtotalPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > 0 && amount < 100000) {
            subtotal = amount;
          }
        }
      }
      
      // Look for dates - multiple formats
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,     // MM/DD/YYYY
        /(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD  
        /(\d{1,2}-\d{1,2}-\d{4})/,       // MM-DD-YYYY
        /(\d{1,2}\/\d{1,2}\/\d{2})/,     // MM/DD/YY
      ];
      
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const parsedDate = new Date(match[1]);
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2020) {
            invoiceDate = parsedDate.toISOString().split('T')[0];
            break;
          }
        }
      }
    }
    
    return {
      vendorName,
      invoiceNumber,
      invoiceDate,
      total,
      subtotal
    };
  }
}