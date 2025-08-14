import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';

// Simple OCR service for invoice processing
export class OCRService {
  
  // Process image files with Tesseract
  static async extractTextFromImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Starting image OCR processing...');
      
      const worker = await createWorker('eng');
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
  
  // Process PDF files with text extraction
  static async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Starting PDF text extraction...');
      
      const data = await pdfParse(buffer);
      
      if (data.text && data.text.trim().length > 50) {
        console.log('PDF text extracted successfully');
        return { text: data.text.trim(), confidence: 85 };
      }
      
      return {
        text: `PDF contains minimal readable text.
        
For scanned invoices, please:
1. Convert PDF to JPG/PNG images using an online converter
2. Upload each page as a separate image file
3. Ensure images are clear and high-contrast

The OCR system works best with image files rather than scanned PDFs.`,
        confidence: 20
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      return {
        text: `PDF processing failed.
        
Please try:
1. Converting PDF to image format (JPG/PNG)
2. Uploading individual pages as images
3. Ensuring the file is not corrupted

For best results, use clear images instead of PDFs.`,
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
    const lines = text.toLowerCase().split('\n');
    
    let vendorName = 'Unknown Vendor';
    let invoiceNumber = 'N/A';
    let invoiceDate = new Date().toISOString().split('T')[0];
    let total = 0;
    let subtotal = 0;
    
    // Simple parsing logic
    for (const line of lines) {
      // Look for vendor names (common food suppliers)
      if (line.includes('sysco') || line.includes('us foods') || line.includes('performance food')) {
        vendorName = line.trim();
      }
      
      // Look for invoice numbers
      const invoiceMatch = line.match(/(?:invoice|inv)[\s#]*(\w+)/i);
      if (invoiceMatch) {
        invoiceNumber = invoiceMatch[1];
      }
      
      // Look for total amounts
      const totalMatch = line.match(/total[\s:$]*(\d+(?:\.\d{2})?)/i);
      if (totalMatch) {
        total = parseFloat(totalMatch[1]);
      }
      
      // Look for subtotal amounts
      const subtotalMatch = line.match(/subtotal[\s:$]*(\d+(?:\.\d{2})?)/i);
      if (subtotalMatch) {
        subtotal = parseFloat(subtotalMatch[1]);
      }
      
      // Look for dates
      const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[1]);
        if (!isNaN(parsedDate.getTime())) {
          invoiceDate = parsedDate.toISOString().split('T')[0];
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