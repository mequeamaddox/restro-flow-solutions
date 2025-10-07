export interface PaycheckData {
  checkNumber: string;
  payDate: string;
  employeeName: string;
  employeeAddress: string;
  employeeNumber?: string;
  employeeSsn?: string;
  netPay: string;
  regularHours: string;
  overtimeHours: string;
  regularRate: string;
  overtimeRate: string;
  regularPay: string;
  overtimePay: string;
  grossPay: string;
  federalTax: string;
  stateTax: string;
  socialSecurity: string;
  medicare: string;
  totalDeductions: string;
  bonuses?: string;
  tips?: string;
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  companyEin?: string;
  bankName?: string;
  periodStart: string;
  periodEnd: string;
  // Layout and display settings from paycheck settings
  paycheckLayout?: string;
  displayBusinessName?: boolean;
  displayTaxFilingName?: boolean;
  taxFilingName?: string;
  printSignature?: boolean;
  displayLast4Ssn?: boolean;
}

function convertNumberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const thousands = ['', 'THOUSAND', 'MILLION'];

  if (num === 0) return 'ZERO';
  if (num < 0) return 'NEGATIVE ' + convertNumberToWords(-num);

  let result = '';
  let remaining = num;
  let thousandIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk !== 0) {
      let chunkWords = '';
      
      const hundreds = Math.floor(chunk / 100);
      if (hundreds > 0) {
        chunkWords += ones[hundreds] + ' HUNDRED ';
      }
      
      const remainder = chunk % 100;
      if (remainder >= 20) {
        chunkWords += tens[Math.floor(remainder / 10)] + ' ';
        if (remainder % 10 > 0) {
          chunkWords += ones[remainder % 10] + ' ';
        }
      } else if (remainder >= 10) {
        chunkWords += teens[remainder - 10] + ' ';
      } else if (remainder > 0) {
        chunkWords += ones[remainder] + ' ';
      }
      
      chunkWords += thousands[thousandIndex] + ' ';
      result = chunkWords + result;
    }
    
    remaining = Math.floor(remaining / 1000);
    thousandIndex++;
  }
  
  return result.trim();
}

function formatSSN(ssn: string, displayLast4: boolean): string {
  if (!displayLast4 || !ssn) return '';
  return `***-**-${ssn.slice(-4)}`;
}

export async function generatePaycheckPDF(data: PaycheckData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const layout = data.paycheckLayout || 'check_stub_only';
  
  // Route to appropriate generator based on layout
  switch (layout) {
    case 'no_printing':
      return generateDigitalOnlyPDF(data);
    case 'check_on_top':
      return generateCheckOnTopPDF(data);
    case 'check_on_bottom':
      return generateCheckOnBottomPDF(data);
    case 'check_stub_only':
    default:
      return generateStubOnlyPDF(data);
  }
}

// Digital Pay Stub Only (no check)
async function generateDigitalOnlyPDF(data: PaycheckData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  let y = 100;
  doc.fontSize(20).font('Helvetica-Bold').text('Digital Pay Stub Only', 306, y, { align: 'center' });
  y += 40;
  doc.fontSize(12).font('Helvetica').text('This paycheck is configured for digital-only distribution', 306, y, { align: 'center' });
  
  doc.end();
  return pdfPromise;
}

// Pay Stub Only (no check portion)
async function generateStubOnlyPDF(data: PaycheckData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  let y = 50;
  
  // Header
  doc.fontSize(14).font('Helvetica-Bold').text(
    data.displayBusinessName ? data.companyName : 'Pay Stub', 
    306, y, { align: 'center' }
  );
  if (data.displayTaxFilingName && data.taxFilingName) {
    y += 18;
    doc.fontSize(10).font('Helvetica').text(data.taxFilingName, 306, y, { align: 'center' });
  }
  
  y += 30;
  doc.moveTo(50, y).lineTo(562, y).stroke();
  
  // Employee Info (left) and Pay Info (right)
  y += 15;
  doc.fontSize(10).font('Helvetica-Bold').text(data.employeeName, 50, y);
  doc.fontSize(9).font('Helvetica').text(`Pay Period: ${new Date(data.periodStart).toLocaleDateString()} - ${new Date(data.periodEnd).toLocaleDateString()}`, 400, y);
  
  y += 15;
  doc.text(`Employee ID: ${data.employeeNumber || 'EMP001'}`, 50, y);
  doc.text(`Pay Date: ${new Date(data.payDate).toLocaleDateString()}`, 400, y);
  
  if (data.displayLast4Ssn && data.employeeSsn) {
    y += 15;
    doc.text(`SSN: ${formatSSN(data.employeeSsn, true)}`, 50, y);
  }
  if (data.checkNumber) {
    y += (data.displayLast4Ssn && data.employeeSsn) ? 0 : 15;
    doc.text(`Check #: ${data.checkNumber}`, 400, y);
  }
  
  // Earnings Section
  y += 30;
  doc.fontSize(10).font('Helvetica-Bold').text('Earnings', 50, y);
  doc.text('Hours', 280, y, { align: 'center' });
  doc.text('Amount', 480, y, { align: 'right' });
  
  y += 5;
  doc.moveTo(50, y).lineTo(562, y).stroke();
  
  y += 15;
  doc.fontSize(9).font('Helvetica').text('Regular Pay', 50, y);
  doc.text(parseFloat(data.regularHours).toFixed(2), 280, y, { align: 'center' });
  doc.text(`$${parseFloat(data.regularPay).toFixed(2)}`, 480, y, { align: 'right' });
  
  if (parseFloat(data.overtimeHours) > 0) {
    y += 15;
    doc.text('Overtime Pay', 50, y);
    doc.text(parseFloat(data.overtimeHours).toFixed(2), 280, y, { align: 'center' });
    doc.text(`$${parseFloat(data.overtimePay).toFixed(2)}`, 480, y, { align: 'right' });
  }
  
  y += 20;
  doc.moveTo(50, y).lineTo(562, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold').text('Gross Pay', 50, y);
  doc.text(`$${parseFloat(data.grossPay).toFixed(2)}`, 480, y, { align: 'right' });
  
  // Deductions Section
  y += 30;
  doc.fontSize(10).text('Deductions', 50, y);
  y += 5;
  doc.moveTo(50, y).lineTo(562, y).stroke();
  
  y += 15;
  doc.fontSize(9).font('Helvetica').text('Federal Tax:', 50, y);
  doc.text(`$${parseFloat(data.federalTax).toFixed(2)}`, 230, y, { align: 'right' });
  doc.text('Social Security:', 320, y);
  doc.text(`$${parseFloat(data.socialSecurity).toFixed(2)}`, 480, y, { align: 'right' });
  
  y += 15;
  doc.text('State Tax:', 50, y);
  doc.text(`$${parseFloat(data.stateTax).toFixed(2)}`, 230, y, { align: 'right' });
  doc.text('Medicare:', 320, y);
  doc.text(`$${parseFloat(data.medicare).toFixed(2)}`, 480, y, { align: 'right' });
  
  y += 20;
  doc.moveTo(50, y).lineTo(562, y).stroke();
  y += 10;
  doc.font('Helvetica-Bold').text('Total Deductions:', 50, y);
  doc.text(`$${parseFloat(data.totalDeductions).toFixed(2)}`, 480, y, { align: 'right' });
  
  // Net Pay
  y += 30;
  doc.rect(50, y, 512, 35).fillAndStroke('#e8f5e9', '#000000');
  y += 12;
  doc.fontSize(12).fillColor('#000000').text('NET PAY:', 60, y);
  doc.fontSize(16).fillColor('#2e7d32').text(`$${parseFloat(data.netPay).toFixed(2)}`, 480, y, { align: 'right' });
  
  doc.end();
  return pdfPromise;
}

// Check on Top Layout - matches ActualPaycheck preview
async function generateCheckOnTopPDF(data: PaycheckData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  const netAmount = parseFloat(data.netPay);
  const centsAmount = Math.round((netAmount % 1) * 100);
  const amountInWords = convertNumberToWords(Math.floor(netAmount));
  
  // CHECK PORTION (Top Section - 3.5 inches)
  let y = 36;
  
  // Top row: Business name (left), Bank name (center), Check number (right)
  doc.fontSize(10).font('Helvetica-Bold').text(data.companyName || 'Business Name', 50, y, { width: 200 });
  doc.fontSize(10).font('Helvetica-Bold').text(data.bankName || 'Bank Name', 250, y, { width: 150, align: 'center' });
  doc.fontSize(14).font('Helvetica-Bold').text(data.checkNumber, 450, y, { align: 'right' });
  
  y += 12;
  doc.fontSize(9).font('Helvetica').text(data.companyAddress || 'Business Address', 50, y, { width: 200 });
  
  y += 24;
  doc.fontSize(9).text(new Date(data.payDate).toLocaleDateString('en-US'), 500, y, { align: 'right' });
  
  // PAY TO THE ORDER OF
  y += 20;
  doc.fontSize(8).text('PAY TO THE ORDER OF', 50, y);
  y += 12;
  doc.fontSize(11).font('Helvetica-Bold').text(data.employeeName, 50, y);
  doc.moveTo(50, y + 14).lineTo(430, y + 14).stroke();
  
  // Amount in words and dollar box
  y += 22;
  doc.fontSize(8).font('Helvetica').text('AMOUNT IN WORDS', 50, y);
  y += 10;
  const amountText = `${amountInWords} DOLLARS AND ${String(centsAmount).padStart(2, '0')}/100 CENTS`;
  doc.fontSize(9).font('Helvetica-Bold').text(amountText, 50, y, { width: 350 });
  doc.moveTo(50, y + 12).lineTo(400, y + 12).stroke();
  
  // Dollar amount box
  doc.fontSize(8).font('Helvetica').text('$', 440, y - 10);
  doc.rect(455, y - 14, 100, 22).stroke();
  doc.fontSize(14).font('Helvetica-Bold').text(netAmount.toFixed(2), 465, y - 10);
  
  // Memo and signature
  y += 28;
  doc.fontSize(7).font('Helvetica').text('MEMO', 50, y);
  y += 8;
  doc.fontSize(8).text(`Payroll - ${new Date(data.periodStart).toLocaleDateString('en-US')} to ${new Date(data.periodEnd).toLocaleDateString('en-US')}`, 50, y);
  doc.moveTo(50, y + 12).lineTo(250, y + 12).stroke();
  
  if (data.printSignature) {
    doc.fontSize(7).text('AUTHORIZED SIGNATURE', 350, y + 12, { width: 200, align: 'center' });
  }
  doc.moveTo(350, y + 10).lineTo(550, y + 10).stroke();
  
  // MICR routing line
  y += 32;
  doc.fontSize(10).font('Courier').text(`C${data.checkNumber}C A053906041A 123456789C`, 200, y, { align: 'center' });
  
  // Dashed line separator
  y += 20;
  doc.moveTo(50, y).lineTo(560, y).dash(5, { space: 5 }).stroke().undash();
  
  // PAY STUB SECTION (Bottom)
  y += 20;
  doc.fontSize(12).font('Helvetica-Bold').text(data.companyName, 306, y, { align: 'center' });
  y += 15;
  doc.fontSize(9).font('Helvetica').text('Employee Pay Stub', 306, y, { align: 'center' });
  
  y += 25;
  const leftCol = 50;
  const rightCol = 320;
  
  // Employee info (left)
  doc.fontSize(10).font('Helvetica-Bold').text(data.employeeName, leftCol, y);
  y += 14;
  doc.fontSize(8).font('Helvetica').text(data.employeeAddress, leftCol, y, { width: 230 });
  
  // Business info (right)
  const businessY = y - 14;
  doc.fontSize(10).font('Helvetica-Bold').text(data.companyName, rightCol, businessY);
  doc.fontSize(8).font('Helvetica').text(data.companyAddress, rightCol, businessY + 14, { width: 230 });
  if (data.companyPhone) {
    doc.text(data.companyPhone, rightCol, businessY + 26);
  }
  if (data.companyEin) {
    doc.text(`SC EIN: ${data.companyEin}`, rightCol, businessY + (data.companyPhone ? 38 : 26));
  }
  
  y += 50;
  // Pay Period info box
  doc.rect(50, y, 512, 50).stroke();
  y += 10;
  doc.fontSize(8).font('Helvetica-Bold').text('Pay Period:', 60, y);
  doc.font('Helvetica').text(`${new Date(data.periodStart).toLocaleDateString('en-US')} - ${new Date(data.periodEnd).toLocaleDateString('en-US')}`, 120, y);
  
  doc.font('Helvetica-Bold').text('Pay Date:', 280, y);
  doc.font('Helvetica').text(new Date(data.payDate).toLocaleDateString('en-US'), 330, y);
  
  doc.font('Helvetica-Bold').text('Check Number:', 450, y);
  doc.font('Helvetica').text(data.checkNumber, 530, y);
  
  // EARNINGS section
  y += 40;
  doc.fontSize(9).font('Helvetica-Bold').text('EARNINGS', 50, y);
  doc.rect(50, y + 5, 512, 2).fill('#cccccc');
  
  y += 20;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Description', 60, y);
  doc.text('Hours', 240, y, { width: 60, align: 'right' });
  doc.text('Rate', 310, y, { width: 60, align: 'right' });
  doc.text('Amount', 480, y, { width: 70, align: 'right' });
  
  y += 15;
  doc.font('Helvetica');
  
  // Regular Pay
  doc.text('Regular Pay', 60, y);
  doc.text(parseFloat(data.regularHours).toFixed(2), 240, y, { width: 60, align: 'right' });
  doc.text(`$${parseFloat(data.regularRate).toFixed(2)}`, 310, y, { width: 60, align: 'right' });
  doc.text(`$${parseFloat(data.regularPay).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
  
  // Overtime Pay (if any)
  if (parseFloat(data.overtimeHours) > 0) {
    y += 15;
    doc.text('Overtime Pay', 60, y);
    doc.text(parseFloat(data.overtimeHours).toFixed(2), 240, y, { width: 60, align: 'right' });
    doc.text(`$${parseFloat(data.overtimeRate).toFixed(2)}`, 310, y, { width: 60, align: 'right' });
    doc.text(`$${parseFloat(data.overtimePay).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
  }
  
  y += 20;
  doc.moveTo(60, y).lineTo(550, y).stroke();
  y += 5;
  doc.font('Helvetica-Bold');
  doc.text('GROSS PAY', 60, y);
  doc.text(`$${parseFloat(data.grossPay).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
  
  // DEDUCTIONS section
  y += 25;
  doc.fontSize(9).font('Helvetica-Bold').text('DEDUCTIONS', 50, y);
  doc.rect(50, y + 5, 512, 2).fill('#cccccc');
  
  y += 20;
  doc.fontSize(8).font('Helvetica');
  
  const deductionCol1 = 60;
  const deductionCol2 = 320;
  
  doc.text('Federal Tax:', deductionCol1, y);
  doc.text(`$${parseFloat(data.federalTax).toFixed(2)}`, deductionCol1 + 120, y, { width: 70, align: 'right' });
  
  doc.text('Social Security:', deductionCol2, y);
  doc.text(`$${parseFloat(data.socialSecurity).toFixed(2)}`, deductionCol2 + 120, y, { width: 70, align: 'right' });
  
  y += 15;
  doc.text('State Tax:', deductionCol1, y);
  doc.text(`$${parseFloat(data.stateTax).toFixed(2)}`, deductionCol1 + 120, y, { width: 70, align: 'right' });
  
  doc.text('Medicare:', deductionCol2, y);
  doc.text(`$${parseFloat(data.medicare).toFixed(2)}`, deductionCol2 + 120, y, { width: 70, align: 'right' });
  
  y += 20;
  doc.moveTo(60, y).lineTo(550, y).stroke();
  y += 5;
  doc.font('Helvetica-Bold');
  doc.text('TOTAL DEDUCTIONS:', 60, y);
  doc.text(`$${parseFloat(data.totalDeductions).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
  
  // NET PAY section
  y += 25;
  doc.rect(50, y, 512, 30).fillAndStroke('#e8f5e9', '#000000');
  y += 10;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('NET PAY:', 60, y);
  doc.fontSize(14).fillColor('#2e7d32').text(`$${netAmount.toFixed(2)}`, 480, y, { width: 70, align: 'right' });
  
  doc.end();
  return pdfPromise;
}

// Check on Bottom (stub on top, check below)
async function generateCheckOnBottomPDF(data: PaycheckData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  const netAmount = parseFloat(data.netPay);
  const centsAmount = Math.round((netAmount % 1) * 100);
  const amountInWords = convertNumberToWords(Math.floor(netAmount));
  
  let y = 36;
  
  // PAY STUB SECTION (Top - abbreviated version)
  doc.fontSize(12).font('Helvetica-Bold').text(data.companyName, 306, y, { align: 'center' });
  y += 15;
  doc.fontSize(9).font('Helvetica').text('Employee Pay Stub', 306, y, { align: 'center' });
  
  y += 20;
  doc.fontSize(9).font('Helvetica-Bold').text(data.employeeName, 50, y);
  doc.font('Helvetica').text(`Period: ${new Date(data.periodStart).toLocaleDateString()} - ${new Date(data.periodEnd).toLocaleDateString()}`, 300, y);
  
  y += 15;
  doc.text(`Gross: $${parseFloat(data.grossPay).toFixed(2)}`, 50, y);
  doc.text(`Deductions: $${parseFloat(data.totalDeductions).toFixed(2)}`, 200, y);
  doc.font('Helvetica-Bold').text(`NET PAY: $${netAmount.toFixed(2)}`, 400, y);
  
  y += 30;
  // Dashed line separator
  doc.moveTo(50, y).lineTo(560, y).dash(5, { space: 5 }).stroke().undash();
  
  // CHECK PORTION (Bottom Section)
  y += 30;
  
  // Top row: Business name (left), Bank name (center), Check number (right)
  doc.fontSize(10).font('Helvetica-Bold').text(data.companyName || 'Business Name', 50, y, { width: 200 });
  doc.fontSize(10).font('Helvetica-Bold').text(data.bankName || 'Bank Name', 250, y, { width: 150, align: 'center' });
  doc.fontSize(14).font('Helvetica-Bold').text(data.checkNumber, 450, y, { align: 'right' });
  
  y += 12;
  doc.fontSize(9).font('Helvetica').text(data.companyAddress || 'Business Address', 50, y, { width: 200 });
  
  y += 24;
  doc.fontSize(9).text(new Date(data.payDate).toLocaleDateString('en-US'), 500, y, { align: 'right' });
  
  // PAY TO THE ORDER OF
  y += 20;
  doc.fontSize(8).text('PAY TO THE ORDER OF', 50, y);
  y += 12;
  doc.fontSize(11).font('Helvetica-Bold').text(data.employeeName, 50, y);
  doc.moveTo(50, y + 14).lineTo(430, y + 14).stroke();
  
  // Amount in words and dollar box
  y += 22;
  doc.fontSize(8).font('Helvetica').text('AMOUNT IN WORDS', 50, y);
  y += 10;
  const amountText = `${amountInWords} DOLLARS AND ${String(centsAmount).padStart(2, '0')}/100 CENTS`;
  doc.fontSize(9).font('Helvetica-Bold').text(amountText, 50, y, { width: 350 });
  doc.moveTo(50, y + 12).lineTo(400, y + 12).stroke();
  
  // Dollar amount box
  doc.fontSize(8).font('Helvetica').text('$', 440, y - 10);
  doc.rect(455, y - 14, 100, 22).stroke();
  doc.fontSize(14).font('Helvetica-Bold').text(netAmount.toFixed(2), 465, y - 10);
  
  // Memo and signature
  y += 28;
  doc.fontSize(7).font('Helvetica').text('MEMO', 50, y);
  y += 8;
  doc.fontSize(8).text(`Payroll - ${new Date(data.periodStart).toLocaleDateString('en-US')} to ${new Date(data.periodEnd).toLocaleDateString('en-US')}`, 50, y);
  doc.moveTo(50, y + 12).lineTo(250, y + 12).stroke();
  
  if (data.printSignature) {
    doc.fontSize(7).text('AUTHORIZED SIGNATURE', 350, y + 12, { width: 200, align: 'center' });
  }
  doc.moveTo(350, y + 10).lineTo(550, y + 10).stroke();
  
  // MICR routing line
  y += 32;
  doc.fontSize(10).font('Courier').text(`C${data.checkNumber}C A053906041A 123456789C`, 200, y, { align: 'center' });
  
  doc.end();
  return pdfPromise;
}
