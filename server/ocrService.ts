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

    // Check if buffer size is reasonable for Textract (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Document too large for AWS Textract (max 10MB)');
    }

    // Check if buffer appears to be a valid PDF/image
    const fileSignature = buffer.subarray(0, 4);
    const isPdf = fileSignature.toString() === '%PDF';
    const isJpeg = fileSignature[0] === 0xFF && fileSignature[1] === 0xD8;
    const isPng = fileSignature.toString('hex') === '89504e47';
    
    if (!isPdf && !isJpeg && !isPng) {
      throw new Error('Unsupported document format for AWS Textract');
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
      console.log('Converting PDF to images for enhanced OCR...');
      
      // Try PDF-to-image conversion first (proper approach for scanned PDFs)
      try {
        // Write buffer to temporary file for pdf2pic
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');
        
        const tempDir = os.tmpdir();
        const tempPdfPath = path.join(tempDir, `temp_pdf_${Date.now()}.pdf`);
        
        await fs.writeFile(tempPdfPath, buffer);
        
        // Convert PDF to images using pdf2pic with better error handling
        const convert = pdf2pic.fromPath(tempPdfPath, {
          density: 300,           // Higher DPI for better OCR
          saveFilename: "page",
          savePath: tempDir,
          format: "png",
          width: 2480,           // A4 at 300 DPI
          height: 3508,
          quality: 100
        });
        
        console.log('Converting PDF pages to images...');
        const results = await convert.bulk(-1, { responseType: 'image' }); // Convert all pages
        
        let combinedText = '';
        let totalConfidence = 0;
        let pageCount = 0;
        
        // Process each page image with Tesseract
        for (const result of results) {
          if (result.path) {
            console.log(`Processing page ${pageCount + 1} image...`);
            
            try {
              const imageBuffer = await fs.readFile(result.path);
              const pageResult = await this.extractTextFromImage(imageBuffer);
              
              if (pageResult.text && pageResult.confidence > 20) {
                combinedText += pageResult.text + '\n\n';
                totalConfidence += pageResult.confidence;
                pageCount++;
                console.log(`Page ${pageCount} processed with ${pageResult.confidence}% confidence`);
              }
              
              // Clean up temporary image file
              try {
                await fs.unlink(result.path);
              } catch (cleanupError) {
                console.log('Failed to clean up temporary image:', cleanupError);
              }
            } catch (pageError) {
              console.error(`Failed to process page ${pageCount + 1}:`, pageError);
            }
          }
        }
        
        // Clean up temporary PDF file
        try {
          await fs.unlink(tempPdfPath);
        } catch (cleanupError) {
          console.log('Failed to clean up temporary PDF:', cleanupError);
        }
        
        if (pageCount > 0) {
          const averageConfidence = totalConfidence / pageCount;
          console.log(`PDF-to-image OCR completed: ${pageCount} pages processed with ${averageConfidence.toFixed(1)}% average confidence`);
          
          return {
            text: combinedText.trim(),
            confidence: Math.round(averageConfidence)
          };
        }
        
        console.log('PDF-to-image conversion produced no usable text');
        
      } catch (conversionError) {
        console.error('PDF-to-image conversion failed:', conversionError);
        console.log('This may be due to missing ImageMagick/GraphicsMagick. Falling back to direct text extraction...');
      }
      
      // Fallback: Try direct Tesseract on PDF (last resort)
      console.log('Attempting direct OCR on PDF as fallback...');
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
        
        console.log(`Direct PDF OCR low confidence (${confidence}%), providing user guidance...`);
        
      } catch (directError) {
        console.log('Direct PDF OCR failed, providing user guidance...');
      }
      
      // Return user guidance when all OCR methods fail
      return {
        text: `Enhanced OCR processing encountered limitations with this PDF format.

For the best results with scanned invoices:

1. **Convert PDF to Image**: Use any online PDF to JPG converter
2. **Upload as Image**: Upload the converted JPG/PNG file instead
3. **Ensure Quality**: Make sure the image has good contrast and is clearly readable

Alternative: Take a clear photo of the invoice with your phone camera and upload that instead.

The system attempted advanced PDF processing but encountered technical limitations with this specific document format.`,
        confidence: 25
      };
      
    } catch (error) {
      console.error('Scanned PDF processing failed completely:', error);
      return {
        text: `Advanced PDF processing not available. 

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
  
  // Line scoring system following ChatGPT's recommendations
  private static calculateLineScore(line: string, index: number, allLines: string[]): number {
    let score = 0;
    
    // 1. Has price pattern (decimal or integer) - strong indicator
    const hasDecimalPrice = /\$(\d+\.\d{2})/.test(line);
    const hasIntegerPrice = /^\d{3,6}$/.test(line) && parseInt(line) > 50 && parseInt(line) < 100000;
    if (hasDecimalPrice || hasIntegerPrice) score += 1.0;
    
    // 2. Food-related keywords - strong indicator for restaurants
    const foodKeywords = ['beef', 'pork', 'chicken', 'fish', 'salmon', 'shrimp', 'clam', 'crab', 'crawfish', 'cheese', 'milk', 'bread', 'rice', 'oil', 'sauce', 'spice', 'fillet', 'farmed', 'fresh', 'frozen'];
    const hasFoodKeyword = foodKeywords.some(keyword => line.toLowerCase().includes(keyword));
    if (hasFoodKeyword) score += 0.8;
    
    // 3. Complex invoice line patterns (like Inland Foods) - very strong indicator
    // Pattern: "12051.LB FILLET, FARMED CHILEAN. v 1000 LB. 5 rm 128008 $8.87AB $113.54 SALMON FILLET PBO 34"
    const complexInvoicePattern = /\d+\.?LB|FILLET|FARMED|\$\d+\.\d{2}.*\$\d+\.\d{2}|LB\.\s*\d+/i;
    if (complexInvoicePattern.test(line)) {
      score += 1.2;
      console.log(`🎯 Complex invoice pattern detected in: "${line.substring(0, 50)}..."`);
    }
    
    // 4. Multiple prices in one line (unit + total) - strong indicator
    const priceMatches = line.match(/\$\d+\.\d{2}/g);
    if (priceMatches && priceMatches.length >= 2) {
      score += 1.0;
      console.log(`💰 Multiple prices found in: "${line.substring(0, 50)}..."`);
    }
    
    // 5. Near other potential item lines - clustering indicator
    const nearbyProductLines = OCRService.countNearbyProductLines(index, allLines);
    if (nearbyProductLines >= 2) score += 0.5;
    
    // 6. Not blacklisted headers/footers - negative indicator
    const blacklist = ['subtotal', 'total', 'tax', 'invoice', 'thank', 'customer', 'address', 'phone', 'email', 'date', 'order', 'quantity', 'description', 'amount'];
    const isBlacklisted = blacklist.some(word => line.toLowerCase().includes(word.toLowerCase()));
    if (isBlacklisted) score -= 1.5;
    
    // 7. Looks like product description - positive indicator
    const looksLikeProduct = /^[A-Za-z0-9][A-Za-z\s&\/\-0-9',\.]{3,50}/.test(line) && line.length >= 5;
    if (looksLikeProduct) score += 0.4;
    
    // 8. Position-based scoring - items usually in middle section
    const middleSection = index > allLines.length * 0.2 && index < allLines.length * 0.8;
    if (middleSection) score += 0.2;
    
    // 9. Contains both weight/quantity and food terms
    const hasWeight = /\d+\.?\d*\s*(LB|lb|OZ|oz|KG|kg|EA|each)/i.test(line);
    if (hasWeight && hasFoodKeyword) score += 0.6;
    
    return Math.max(0, score); // Don't allow negative scores
  }
  
  private static countNearbyProductLines(index: number, allLines: string[]): number {
    let count = 0;
    const checkRange = 3; // Check 3 lines before and after
    
    for (let i = Math.max(0, index - checkRange); i <= Math.min(allLines.length - 1, index + checkRange); i++) {
      if (i === index) continue;
      const line = allLines[i].trim();
      
      // Count lines that look like products
      if (/^[A-Za-z][A-Za-z\s&\/\-0-9]{3,}/.test(line) && line.length >= 5) {
        count++;
      }
    }
    
    return count;
  }
  
  private static extractLineItemFromScoredLine(scoredLine: any, allLines: string[]): any | null {
    // Try to extract from high-confidence lines using multiple strategies
    const line = scoredLine.text;
    const index = scoredLine.index;
    
    // Strategy 1: Line contains both product and price  
    const singleLineMatch = line.match(/^(.+?)\s+\$?(\d+\.\d{2})\s*$/);
    if (singleLineMatch) {
      const description = singleLineMatch[1].trim();
      const price = parseFloat(singleLineMatch[2]);
      
      // Check if this is a fee first (for separate IRS tracking)
      if (OCRService.isValidFee(description, price)) {
        return {
          type: 'fee',
          description: description.substring(0, 50),
          amount: price
        };
      }
      
      // Otherwise check if it's a valid product
      if (OCRService.isValidProduct(description, price)) {
        return {
          type: 'line_item',
          description: description.substring(0, 100),
          quantity: 1,
          unitPrice: price,
          totalPrice: price
        };
      }
    }
    
    // Strategy 2: Look for quantity before and price after (C&C Seafood style)
    let quantity = 1;
    let foundPrice = 0;
    
    // Check lines before for quantity (1-3 lines back)
    for (let qtyOffset = -3; qtyOffset <= -1; qtyOffset++) {
      if (index + qtyOffset >= 0) {
        const checkLine = allLines[index + qtyOffset].trim();
        const qtyMatch = checkLine.match(/^(\d{1,4})$/);
        if (qtyMatch && parseInt(qtyMatch[1]) >= 1 && parseInt(qtyMatch[1]) <= 9999) {
          quantity = parseInt(qtyMatch[1]);
          console.log(`🔢 Found quantity ${quantity} for "${line}"`);
          break;
        }
      }
    }
    
    // Look for price in nearby lines (1-3 lines after)
    for (let offset = 1; offset <= 3; offset++) {
      if (index + offset < allLines.length) {
        const nextLine = allLines[index + offset].trim();
        
        // Check for decimal price
        const decimalMatch = nextLine.match(/^\$?(\d+\.\d{2})/);
        // Check for integer price (like "1199" = $11.99)
        const integerMatch = nextLine.match(/^(\d{3,6})$/) && parseInt(nextLine) > 50 && parseInt(nextLine) < 100000;
        
        if (decimalMatch || integerMatch) {
          foundPrice = decimalMatch ? parseFloat(decimalMatch[1]) : parseInt(nextLine) / 100;
          console.log(`💰 Found price $${foundPrice} for "${line}"`);
          break;
        }
      }
    }
    
    if (foundPrice > 0) {
      // Check if this is a fee first
      if (OCRService.isValidFee(line, foundPrice)) {
        return {
          type: 'fee',
          description: line.substring(0, 50),
          amount: foundPrice
        };
      }
      
      // Otherwise check if it's a valid product
      if (OCRService.isValidProduct(line, foundPrice)) {
        // Calculate unit price if we have quantity > 1
        let unitPrice = foundPrice;
        let totalPrice = foundPrice;
        
        if (quantity > 1) {
          // Check if foundPrice might be total price or unit price
          const possibleUnitPrice = foundPrice / quantity;
          if (possibleUnitPrice >= 0.50 && possibleUnitPrice <= 200) {
            // Price seems reasonable as total, calculate unit price
            unitPrice = Math.round(possibleUnitPrice * 100) / 100;
            totalPrice = foundPrice;
          } else {
            // Price seems like unit price, calculate total
            unitPrice = foundPrice;
            totalPrice = Math.round(quantity * foundPrice * 100) / 100;
          }
        }
        
        console.log(`📊 Final calculation: "${line}" - Qty: ${quantity}, Unit: $${unitPrice}, Total: $${totalPrice}`);
        
        return {
          type: 'line_item',
          description: line.substring(0, 100),
          quantity,
          unitPrice,
          totalPrice
        };
      }
    }
    
    return null;
  }
  
  private static extractLineItemWithFallbacks(scoredLine: any, allLines: string[], existingItems: any[]): any | null {
    // More flexible extraction for medium-confidence lines
    const line = scoredLine.text;
    const index = scoredLine.index;
    
    // Check if we already extracted this item
    const alreadyExists = existingItems.some(item => 
      item.description.toLowerCase().includes(line.toLowerCase().substring(0, 10))
    );
    if (alreadyExists) return null;
    
    // DISABLED: Fallback extraction picks up too much garbage (addresses, phone numbers, etc.)
    // For now, only use high-confidence extraction to prevent false positives
    return null;
  }

  // Helper function to detect if a line represents a fee/charge (for separate IRS tracking)
  private static isValidFee(description: string, amount: number): boolean {
    const feePatterns = [
      /^(DELIVERY|SHIPPING|HANDLING|FREIGHT|TRANSPORT|FUEL)(\s+(CHARGE|FEE|COST))?$/i,
      /(DELIVERY|SHIPPING|HANDLING|FREIGHT|TRANSPORT|FUEL)\s+(CHARGE|FEE|COST)/i,
      /^(TAX|SALES\s+TAX|STATE\s+TAX|LOCAL\s+TAX)$/i,
      /^(SERVICE\s+)?(CHARGE|FEE)$/i,
      /^MISC(\.|ELLANEOUS)?\s+(CHARGE|FEE)$/i,
      /^(PROCESSING|ADMIN|ADMINISTRATIVE)\s+(CHARGE|FEE)$/i
    ];
    
    const isFee = feePatterns.some(pattern => pattern.test(description));
    const validAmount = amount > 0 && amount <= 200; // Fees typically under $200
    const validLength = description.length >= 3 && description.length <= 50;
    
    if (isFee && validAmount && validLength) {
      console.log(`💳 Detected fee: "${description}" - $${amount}`);
      return true;
    }
    
    return false;
  }

  // Helper function to validate if a line represents a valid product
  private static isValidProduct(description: string, totalPrice: number): boolean {
    // Filter out obvious non-products - MUCH MORE STRICT
    const excludePatterns = [
      /^(MEAT|DAIRY|PRODUCE|SUBTOTAL|TOTAL|TAX|SAVINGS?|CHANGE|CASH|BALANCE|TICKET|STORE|REGISTER|CASHIER|CUSTOMER|SERVICE|DEPARTMENT)$/i,
      /^(THANK|PLEASE|VISIT|WEBSITE|PHONE|EMAIL|ADDRESS|CITY|STATE|ZIP|DATE|TIME|RECEIPT|TRANSACTION)$/i,
      /^(CREDIT|DEBIT|PAYMENT|REFUND|DISCOUNT|COUPON|LOYALTY|REWARDS|POINTS)$/i,
      /^(NAME|PRICE|AMOUNT|QUANTITY|DESCRIPTION|ORDER|SOLD|ACCT|RETD|PAID|CASH|COD|CHARGE)$/i,
      /^(CUSTOMER|VENDOR|INVOICE|NUMBER|BILLING|CONTACT)$/i,
      /^(EXT|EXTENDED|UNIT|EACH|PER|LB|OZ|KG|NOTES|PRODUCT|PRODUCTS|FARMED|FRESH|FROZEN)$/i, // Single words
      /^\d+$/, // Just numbers
      /^[A-Z]{1,3}$/, // Short codes
      /^(A-\d+|T-\d+|\d+-\d+)$/, // Reference codes
      /^\$\d+\.\d{2}$/, // Just prices like "$86.77"
      /^[\d\.\s]+(LB|OZ|KG|EA)$/i, // Just weights like "12.00 LB"
      /saving/i,
      /discount/i,
      /promotion/i,
      /special/i,
      /slip/i,
      /reference/i,
      /from:/i,
      /notes:/i
    ];
    
    // Check if description matches any exclude pattern
    for (const pattern of excludePatterns) {
      if (pattern.test(description)) {
        console.log(`❌ Skipped "${description}" - matches exclude pattern`);
        return false;
      }
    }
    
    // Basic validation - MORE STRICT
    if (description.length < 5 || description.length > 100) { // Minimum 5 chars now
      console.log(`❌ Skipped "${description}" - invalid length`);
      return false;
    }
    
    if (totalPrice <= 0 || totalPrice >= 500) { // Lower max price
      console.log(`❌ Skipped "${description}" - invalid price: $${totalPrice}`);
      return false;
    }
    
    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(description)) {
      console.log(`❌ Skipped "${description}" - no letters found`);
      return false;
    }
    
    // Must look like an actual product (not just random words)
    // Require at least 2 words OR contain clear food indicators
    const wordCount = description.trim().split(/\s+/).length;
    const hasFoodIndicators = /(salmon|fish|beef|pork|chicken|cheese|bread|oil|sauce|fillet|shrimp|crab|clam)/i.test(description);
    
    if (wordCount < 2 && !hasFoodIndicators) {
      console.log(`❌ Skipped "${description}" - too short or not food-related`);
      return false;
    }
    
    return true;
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
    fees: Array<{
      description: string;
      amount: number;
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
      
      // Look for invoice numbers - multiple patterns with better validation
      const invoicePatterns = [
        /invoice\s*#?\s*:?\s*(\w+)/i,
        /inv\s*#?\s*:?\s*(\w+)/i,
        /^(\d{4,8})$/,  // Standalone number 4-8 digits (like 177132)
        /#\s*(\d+)/,    // Number with # prefix
        /order\s*no\.?\s*(\d+)/i,  // Order number
        /customer['']?s?\s*order\s*no\.?\s*(\d+)/i, // Customer's order no
        /invoice\s*number\s*:?\s*(\w+)/i,
        /document\s*#?\s*:?\s*(\w+)/i,
        /ref\s*#?\s*:?\s*(\w+)/i,
      ];
      
      // Special check for standalone numbers at start of line (common invoice format)
      if (line.match(/^\d{4,8}$/) && i < 15 && invoiceNumber === 'N/A') { // First 15 lines, 4-8 digits like "177132"
        invoiceNumber = line;
        console.log(`Found standalone invoice number: ${line} at line ${i}`);
      }
      
      // Check for invoice patterns with more context awareness
      for (const pattern of invoicePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const candidate = match[1].trim();
          // Better validation: should be alphanumeric, reasonable length
          if (candidate.length >= 3 && candidate.length <= 15 && 
              candidate.match(/^[A-Za-z0-9\-_]+$/) && 
              !candidate.match(/^(total|amount|tax|subtotal)$/i)) {
            invoiceNumber = candidate;
            console.log(`Found invoice number: ${candidate} in line: "${line}"`);
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
        /balance\s+due[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // Food Lion "BALANCE DUE"
        /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*$/, // Dollar amount at end of line
        /(\d+\.\d{2})\s*$/, // Decimal amount at end of line (like "150.75")
        /grand[\s\-]*total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /net[\s\-]*amount[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /invoice[\s\-]*total[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /payment[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /due[\s:$]*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
        /\$(\d+(?:,\d{3})*(?:\.\d{2})?)(?!.*\d)/, // Dollar amount not followed by more digits
        /^(\d+\.\d{2})\s*[A-Z]?\s*$/, // Amount followed by single letter (like "150.75 T")
      ];
      
      // Look for amounts in various positions with priority for context
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > 0 && amount < 100000) { // Reasonable range
            // Priority scoring: total/amount keywords get higher priority
            let priority = 0;
            if (line.toLowerCase().includes('balance due')) priority = 4; // Food Lion specific
            else if (line.toLowerCase().includes('total')) priority = 3;
            else if (line.toLowerCase().includes('amount')) priority = 2;
            else if (i > lines.length / 2) priority = 1; // Bottom half gets some priority
            
            if (total === 0 || (amount > total && priority >= 1) || priority > 2) {
              total = amount;
              console.log(`Found total amount: $${amount} (priority: ${priority}) in line: "${line}"`);
            }
          }
        }
      }
      
      // Look for dates - multiple formats with better validation
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,     // MM/DD/YYYY
        /(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD  
        /(\d{1,2}-\d{1,2}-\d{4})/,       // MM-DD-YYYY
        /(\d{1,2}\/\d{1,2}\/\d{2})/,     // MM/DD/YY
        /(\d{1,2}-\d{1,2}-\d{2})/,       // MM-DD-YY (like 4-15-25)
        /date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i, // "Date: MM/DD/YYYY"
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{1,2})[\s,]+(\d{4})/i, // "January 15, 2025"
        /(\d{2}[A-Z]{3}\d{4})/, // "15APR2025" format
      ];
      
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          let dateStr = match[1];
          
          // Handle month name format
          if (match.length > 3) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = monthNames.findIndex(m => match[1].toLowerCase().startsWith(m.toLowerCase()));
            if (monthIndex >= 0) {
              dateStr = `${monthIndex + 1}/${match[2]}/${match[3]}`;
            }
          }
          
          // Handle "15APR2025" format specifically
          if (match[1] && match[1].match(/\d{2}[A-Z]{3}\d{4}/)) {
            const day = match[1].substring(0, 2);
            const monthAbbr = match[1].substring(2, 5);
            const year = match[1].substring(5, 9);
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const monthIndex = monthNames.indexOf(monthAbbr.toUpperCase());
            if (monthIndex >= 0) {
              dateStr = `${monthIndex + 1}/${day}/${year}`;
            }
          }
          
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2020 && parsedDate.getFullYear() <= 2030) {
            invoiceDate = parsedDate.toISOString().split('T')[0];
            console.log(`Found invoice date: ${invoiceDate} from line: "${line}"`);
            break;
          }
        }
      }
    }
    
    // Multi-pass parsing pipeline following ChatGPT suggestions
    console.log('🔍 Starting multi-pass parsing pipeline...');
    
    // PASS 1: Line Scoring - Score each line for likelihood of being a product
    const scoredLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 2) continue;
      
      const score = OCRService.calculateLineScore(line, i, lines);
      scoredLines.push({ index: i, text: line, score });
      
      if (score > 0.3) {
        console.log(`📊 Line ${i} score: ${score.toFixed(2)} - "${line}"`);
      }
    }
    
    // PASS 2: Extract high-confidence line items and fees
    const highConfidenceLines = scoredLines.filter(line => line.score >= 0.8);
    console.log(`🎯 Found ${highConfidenceLines.length} high-confidence product lines`);
    
    const fees: Array<{ description: string; amount: number }> = [];
    
    for (const scoredLine of highConfidenceLines) {
      const extracted = OCRService.extractLineItemFromScoredLine(scoredLine, lines);
      if (extracted) {
        if (extracted.type === 'fee') {
          fees.push({ description: extracted.description, amount: extracted.amount });
          console.log(`💳 High-confidence fee: ${extracted.description} - $${extracted.amount.toFixed(2)}`);
        } else if (extracted.type === 'line_item') {
          lineItems.push({
            description: extracted.description,
            quantity: extracted.quantity,
            unitPrice: extracted.unitPrice,
            totalPrice: extracted.totalPrice
          });
          console.log(`✅ High-confidence: ${extracted.description} - $${extracted.totalPrice.toFixed(2)}`);
        }
      }
    }
    
    // PASS 3: Try medium-confidence lines with fallback strategies
    const mediumConfidenceLines = scoredLines.filter(line => line.score >= 0.4 && line.score < 0.8);
    console.log(`🔄 Trying ${mediumConfidenceLines.length} medium-confidence lines with fallbacks`);
    
    for (const scoredLine of mediumConfidenceLines) {
      const extracted = OCRService.extractLineItemWithFallbacks(scoredLine, lines, lineItems);
      if (extracted) {
        lineItems.push(extracted);
        console.log(`✅ Fallback success: ${extracted.description} - $${extracted.totalPrice.toFixed(2)}`);
      }
    }
    
    // Also try traditional patterns for Food Lion style invoices
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Food Lion pattern: ALL CAPS product name followed by price with decimal
      const foodLionMatch = line.match(/^([A-Z][A-Z\s&\/\-0-9]{3,})\s*$/);
      
      if (foodLionMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const priceMatch = nextLine.match(/^(\d+\.\d{2})\s*[A-Z*\s]*$/);
        
        if (priceMatch) {
          const description = foodLionMatch[1].trim();
          const totalPrice = parseFloat(priceMatch[1]);
          
          // Check if we already added this item
          const alreadyAdded = lineItems.some(item => item.description === description);
          
          if (!alreadyAdded && OCRService.isValidProduct(description, totalPrice)) {
            lineItems.push({
              description,
              quantity: 1,
              unitPrice: totalPrice,
              totalPrice
            });
            
            console.log(`✅ Food Lion pattern: ${description} - $${totalPrice.toFixed(2)}`);
            i++; // Skip the price line
          }
        }
      }
      
      // Also check for single-line items with embedded prices (but be more selective)
      const singleLinePatterns = [
        // Only match lines that clearly look like product entries with prices
        /^(.+?)\s+(\d+)\s*@\s*\$?(\d+\.\d{2})\s*=?\s*\$?(\d+\.\d{2})\s*$/ // "DESCRIPTION QTY @ PRICE = TOTAL"
      ];
      
      for (const pattern of singleLinePatterns) {
        const match = line.match(pattern);
        if (match && match.length === 5) {
          const description = match[1].trim();
          const quantity = parseFloat(match[2]) || 1;
          const unitPrice = parseFloat(match[3]);
          const totalPrice = parseFloat(match[4]);
          
          // Only add if it looks like a real product (not savings, discounts, etc.)
          if (description && description.length > 2 && totalPrice && totalPrice > 0 && unitPrice && unitPrice > 0 &&
              !description.toLowerCase().includes('saving') &&
              !description.toLowerCase().includes('discount') &&
              !description.toLowerCase().includes('tax') &&
              !description.toLowerCase().includes('total')) {
            
            lineItems.push({
              description: description.substring(0, 100), // Limit length
              quantity: quantity || 1,
              unitPrice: Math.round(unitPrice * 100) / 100,
              totalPrice
            });
            
            console.log(`Found line item: ${description} - Qty: ${quantity || 1} @ $${unitPrice.toFixed(2)} = $${totalPrice.toFixed(2)}`);
          }
        }
      }
    }
    
    // Calculate totals correctly - use actual invoice totals, not line item sums
    if (lineItems.length > 0) {
      const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
      console.log(`Line items subtotal: $${calculatedSubtotal.toFixed(2)} from ${lineItems.length} items`);
      
      // Set subtotal from line items if we don't have one
      if (subtotal === 0) {
        subtotal = calculatedSubtotal;
        console.log(`Set subtotal from line items: $${calculatedSubtotal.toFixed(2)}`);
      }
      
      // For Food Lion receipts, look for the actual balance due amount
      // This should be the real total the customer paid
      let actualTotal = total;
      
      // If we found a total that's reasonable compared to line items, use it
      if (total > 0 && total >= calculatedSubtotal * 0.8 && total <= calculatedSubtotal * 1.3) {
        // Total is reasonable (within 20% variance for tax/discounts)
        actualTotal = total;
        console.log(`Using extracted total: $${total.toFixed(2)}`);
      } else {
        // Use line item total if extracted total doesn't make sense
        actualTotal = calculatedSubtotal;
        console.log(`Using calculated total from line items: $${calculatedSubtotal.toFixed(2)}`);
      }
      
      total = actualTotal;
    }
    
    return {
      vendorName,
      vendorPhone,
      vendorAddress,
      invoiceNumber,
      invoiceDate,
      total,
      subtotal,
      lineItems,
      fees
    };
  }
}