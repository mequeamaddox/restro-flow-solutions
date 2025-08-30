import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import pdf2pic from 'pdf2pic';

// Simple OCR service for invoice processing
export class OCRService {
  
  // Process image files with Tesseract
  static async extractTextFromImage(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Starting image OCR processing...');
      
      const worker = await createWorker('eng');
      
      // Enhanced Tesseract configuration for better invoice scanning
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$:-# \n\r\t',
        tessedit_ocr_engine_mode: 1, // Neural nets LSTM engine only
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
  
  // Process PDF files with text extraction and OCR fallback
  static async extractTextFromPDF(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Starting PDF text extraction...');
      
      // First try direct text extraction
      const data = await pdfParse(buffer);
      
      if (data.text && data.text.trim().length > 50) {
        console.log('PDF text extracted successfully');
        return { text: data.text.trim(), confidence: 85 };
      }
      
      // If minimal text found, convert to images and run OCR
      console.log('PDF appears to be scanned - converting to images for OCR...');
      return await this.extractTextFromScannedPDF(buffer);
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      return {
        text: `PDF processing failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}
        
Please try:
1. Uploading a clear, high-resolution image instead
2. Ensuring the PDF is not corrupted or password-protected
3. Using a different file format (JPG, PNG)`,
        confidence: 10
      };
    }
  }

  // Convert scanned PDF to images and run OCR
  private static async extractTextFromScannedPDF(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      console.log('Converting PDF pages to images for OCR processing...');
      
      // Convert PDF to images with high DPI for better OCR
      const convert = pdf2pic.fromBuffer(buffer, {
        density: 300, // Higher DPI for better quality
        saveFilename: "invoice",
        savePath: "/tmp",
        format: "png",
        width: 3000, // Higher resolution
        height: 3000
      });

      console.log('Attempting PDF to image conversion...');
      
      // Convert first page (most invoices are single page)
      const result = await convert(1, { responseType: "buffer" });
      
      console.log('PDF conversion result:', result ? 'Success' : 'Failed');
      
      if (!result || !result.buffer) {
        console.log('PDF conversion failed, trying with different settings...');
        
        // Try with more basic settings
        const basicConvert = pdf2pic.fromBuffer(buffer, {
          density: 150,
          format: "jpeg",
          quality: 100
        });
        
        const basicResult = await basicConvert(1, { responseType: "buffer" });
        
        if (!basicResult || !basicResult.buffer) {
          throw new Error('Failed to convert PDF to image with both high and basic quality settings');
        }
        
        console.log('PDF converted with basic settings, running OCR...');
        const ocrResult = await this.extractTextFromImage(basicResult.buffer);
        return {
          text: ocrResult.text,
          confidence: Math.max(ocrResult.confidence - 15, 0)
        };
      }

      console.log('PDF converted to image successfully, running OCR...');
      
      // Run OCR on the converted image
      const ocrResult = await this.extractTextFromImage(result.buffer);
      
      console.log(`OCR completed with ${ocrResult.confidence}% confidence`);
      
      return {
        text: ocrResult.text,
        confidence: Math.max(ocrResult.confidence - 5, 0) // Small confidence penalty for PDF conversion
      };
      
    } catch (error) {
      console.error('Scanned PDF OCR failed:', error);
      return {
        text: `Scanned PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}
        
This appears to be a scanned document. For best results:
1. Try uploading as JPG/PNG image instead
2. Ensure the scan has good contrast and resolution
3. Make sure text is clearly readable

The enhanced OCR system attempted automatic conversion but encountered issues.`,
        confidence: 5
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