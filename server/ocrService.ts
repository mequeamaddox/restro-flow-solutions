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
    vendorPhone: string;
    vendorAddress: string;
    invoiceNumber: string;
    invoiceDate: string;
    total: number;
    subtotal: number;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  } {
    const lines = text.split('\n');
    
    let vendorName = 'Unknown Vendor';
    let vendorPhone = '';
    let vendorAddress = '';
    let invoiceNumber = 'N/A';
    let invoiceDate = new Date().toISOString().split('T')[0];
    let total = 0;
    let subtotal = 0;
    let lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];
    
    // Enhanced parsing logic for better field extraction
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      // Extract vendor name (look for company patterns anywhere in first 15 lines)
      if (i < 15 && line.length > 3) {
        // High priority company patterns
        if ((line.includes('Inc.') || line.includes('LLC') || line.includes('Corp') || 
            line.includes('Company') || line.includes('Co.') || line.includes('Service') ||
            line.includes('Food') || line.includes('Supply') || line.includes('Restaurant') ||
            line.includes('Kitchen') || line.includes('Equipment') || line.includes('Repair') ||
            line.includes('Seafood') || line.includes('Market') || line.includes('Wholesale')) && 
            !lowerLine.includes('customer') && !lowerLine.includes('order') && !lowerLine.includes('department')) {
          vendorName = line;
        }
        // Special pattern for "C& C Seafood" type names
        else if (line.match(/^[A-Z]&?\s*[A-Z]/i) && line.includes('&') && line.length < 30 && 
                 !lowerLine.includes('customer') && !lowerLine.includes('order')) {
          vendorName = line;
        }
        // Generic company name pattern (fallback)
        else if (vendorName === 'Unknown Vendor' && line.length > 5 && line.length < 50 && 
                 line.match(/^[A-Za-z]/) && !lowerLine.includes('invoice') && !lowerLine.includes('date') && 
                 !line.match(/^\d/) && !lowerLine.includes('phone') && !lowerLine.includes('email') &&
                 !lowerLine.includes('address') && !lowerLine.includes('city') && !lowerLine.includes('zip') &&
                 !lowerLine.includes('department') && !lowerLine.includes('customer') && !lowerLine.includes('order')) {
          vendorName = line;
        }
      }
      
      // Phone number detection (look for patterns like (843) 237-4464 or 843-237-4464)
      const phoneMatch = line.match(/\(?\d{3}\)?\s*[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch && !vendorPhone) {
        vendorPhone = phoneMatch[0];
        console.log(`Found vendor phone: ${vendorPhone}`);
      }
      
      // Address detection (look for street addresses - numbers + street name)
      const addressMatch = line.match(/^\d+\s+[A-Za-z\s]+(Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Hwy|Highway|Pkwy|Parkway|Ct|Court|Pl|Place)/i);
      if (addressMatch && !vendorAddress) {
        vendorAddress = line;
        // Check if next line has city, state, zip
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.match(/^[A-Za-z\s]+,?\s+[A-Z]{2}\s*\d{5}/)) {
            vendorAddress += ', ' + nextLine;
          }
        }
        console.log(`Found vendor address: ${vendorAddress}`);
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
      if (line.match(/^\d{5,8}$/) && i < 15 && invoiceNumber === 'N/A') { // First 15 lines, 5-8 digits like "177132"
        invoiceNumber = line;
        console.log(`Found standalone invoice number: ${line} at line ${i}`);
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
      
      // Look for subtotal amounts
      const subtotalPatterns = [
        /subtotal[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /sub[\s-]?total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /net[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      ];
      
      for (const pattern of subtotalPatterns) {
        const match = line.match(pattern);
        if (match && subtotal === 0) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > 0 && amount < 10000) {
            subtotal = amount;
            console.log(`Found subtotal: $${amount} in line: "${line}"`);
            break;
          }
        }
      }
      
      // Look for tax amounts
      const taxPatterns = [
        /tax[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /(\d+\.?\d*)\s*%?\s*tax/i,
        /sales\s*tax[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      ];
      
      // Special handling for Food Lion format: "0 00% Tax 1" followed by amount
      if (line.match(/\d+\s+\d+%\s+tax/i) && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const taxAmount = parseFloat(nextLine);
        if (!isNaN(taxAmount) && taxAmount >= 0) {
          // Don't set tax here, we'll calculate it from total - subtotal
          console.log(`Found tax amount: $${taxAmount} in line: "${nextLine}"`);
        }
      }
      
      // Food Lion specific subtotal detection: look for amount before "0 00% Tax"
      if (line.match(/\d+\s+\d+%\s+tax/i) && i > 0) {
        const prevLine = lines[i - 1].trim();
        const subtotalAmount = parseFloat(prevLine);
        if (!isNaN(subtotalAmount) && subtotalAmount > 0 && subtotal === 0) {
          subtotal = subtotalAmount;
          console.log(`Found Food Lion subtotal: $${subtotalAmount} in line: "${prevLine}"`);
        }
      }
      
      // Look for total amounts - multiple patterns (enhanced for various invoice formats)
      const totalPatterns = [
        /total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /amount[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /balance[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*$/, // Dollar amount at end of line
        /(\d+\.\d{2})\s*$/, // Decimal amount at end of line (like "150.75")
        /grand\s*total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /net\s*amount[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /invoice\s*total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /payment[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /due[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // Any dollar amount in the document
      ];
      
      // Look for amounts in various positions (bottom half of document usually has totals)
      if (i > lines.length / 2) { // Focus on bottom half for financial totals
        for (const pattern of totalPatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (amount > 0 && amount < 100000) { // Reasonable range
              if (total === 0 || amount > total) { // Take the largest reasonable amount
                total = amount;
                console.log(`Found potential total amount: $${amount} in line: "${line}"`);
              }
            }
          }
        }
      }
      
      // Look for dates - multiple formats
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,     // MM/DD/YYYY
        /(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD  
        /(\d{1,2}-\d{1,2}-\d{4})/,       // MM-DD-YYYY
        /(\d{1,2}\/\d{1,2}\/\d{2})/,     // MM/DD/YY
        /(\d{1,2}-\d{1,2}-\d{2})/,       // MM-DD-YY (like 4-15-25)
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
    
    // Extract line items (products with prices)
    console.log('Starting line item extraction...');
    console.log('Total lines to process:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Debug: Log each line being processed
      if (line.length > 2) {
        console.log(`Line ${i}: "${line}"`);
      }
      
      // Food Lion specific pattern matching
      // Look for product lines that are ALL CAPS with specific patterns
      const foodLionProductMatch = line.match(/^([A-Z][A-Z\s&\/\-0-9]{2,})\s*$/);
      
      if (foodLionProductMatch && i + 1 < lines.length) {
        const description = foodLionProductMatch[1].trim();
        const nextLine = lines[i + 1].trim();
        
        console.log(`Checking potential product: "${description}"`);
        console.log(`Next line: "${nextLine}"`);
        
        // Look for price pattern: "10.99 A *" or just "10.99"
        const priceMatch = nextLine.match(/^(\d+\.\d{2})\s*[A-Z*\s]*$/);
        
        if (priceMatch) {
          const totalPrice = parseFloat(priceMatch[1]);
          
          // Filter out obvious non-products
          if (!description.match(/^(MEAT|DAIRY|PRODUCE|SUBTOTAL|TOTAL|TAX|SAVINGS?|CHANGE|CASH|BALANCE|TICKET|STORE|REGISTER|CASHIER|CUSTOMER|SERVICE)$/i) && 
              description.length >= 5 && 
              totalPrice > 0 && 
              totalPrice < 1000) { // Reasonable price range
            
            lineItems.push({
              description,
              quantity: 1,
              unitPrice: totalPrice,
              totalPrice
            });
            
            console.log(`✅ Found line item: ${description} - $${totalPrice.toFixed(2)}`);
            i++; // Skip the price line since we just processed it
          } else {
            console.log(`❌ Skipped "${description}" - appears to be section header or invalid`);
          }
        } else {
          console.log(`❌ No price match for "${nextLine}"`);
        }
      }
      
      // Also check for single-line items with embedded prices
      const singleLinePatterns = [
        // Generic pattern: "ITEM NAME 1.23 A" or "ITEM NAME $1.23"
        /^(.+?)\s+(\d+\.?\d*)\s*[A-Z*]*\s*\$?(\d+\.\d{2})\s*$/,
        // Alternative: "DESCRIPTION QTY @ PRICE = TOTAL"
        /^(.+?)\s+(\d+)\s*@\s*\$?(\d+\.\d{2})\s*=?\s*\$?(\d+\.\d{2})\s*$/
      ];
      
      for (const pattern of singleLinePatterns) {
        const match = line.match(pattern);
        if (match) {
          let description, quantity, unitPrice, totalPrice;
          
          if (match.length === 4) { // Pattern with quantity
            description = match[1].trim();
            quantity = parseFloat(match[2]) || 1;
            totalPrice = parseFloat(match[3]);
            unitPrice = totalPrice / quantity;
          } else if (match.length === 5) { // Full pattern with separate total
            description = match[1].trim();
            quantity = parseFloat(match[2]) || 1;
            unitPrice = parseFloat(match[3]);
            totalPrice = parseFloat(match[4]);
          }
          
          if (description && description.length > 2 && totalPrice > 0) {
            lineItems.push({
              description: description.substring(0, 100), // Limit length
              quantity,
              unitPrice: Math.round(unitPrice * 100) / 100,
              totalPrice
            });
            
            console.log(`Found line item: ${description} - Qty: ${quantity} @ $${unitPrice.toFixed(2)} = $${totalPrice.toFixed(2)}`);
          }
        }
      }
    }
    
    // Calculate total from line items if we found any
    if (lineItems.length > 0) {
      const calculatedTotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      // Use calculated total from line items as subtotal (before tax)
      if (subtotal === 0) {
        subtotal = calculatedTotal;
        console.log(`Set subtotal from line items: $${calculatedTotal.toFixed(2)}`);
      }
      // If we have a different total extracted, the difference might be tax
      if (total > 0 && total !== calculatedTotal) {
        const taxAmount = total - calculatedTotal;
        if (taxAmount >= 0 && taxAmount < calculatedTotal) { // Reasonable tax amount
          console.log(`Calculated tax: $${taxAmount.toFixed(2)} (Total: $${total.toFixed(2)} - Subtotal: $${calculatedTotal.toFixed(2)})`);
        } else {
          // If tax calculation doesn't make sense, use calculated total
          total = calculatedTotal;
          console.log(`Used calculated total from line items: $${calculatedTotal.toFixed(2)}`);
        }
      } else {
        total = calculatedTotal;
        console.log(`Set total from line items: $${calculatedTotal.toFixed(2)}`);
      }
    }
    
    return {
      vendorName,
      vendorPhone,
      vendorAddress,
      invoiceNumber,
      invoiceDate,
      total,
      subtotal,
      lineItems
    };
  }
}