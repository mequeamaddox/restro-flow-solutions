export interface PaycheckData {
  checkNumber: string;
  payDate: string;
  employeeName: string;
  employeeAddress: string;
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
  periodStart: string;
  periodEnd: string;
}

function convertNumberToWords(num: number): string {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  if (num === 0) return 'ZERO';
  let result = '';
  const dollarsPart = Math.floor(num);
  
  if (dollarsPart >= 1000) {
    const thousands = Math.floor(dollarsPart / 1000);
    if (thousands < 20 && thousands >= 10) result += teens[thousands - 10] + ' THOUSAND ';
    else if (thousands >= 20) result += tens[Math.floor(thousands / 10)] + ' ' + ones[thousands % 10] + ' THOUSAND ';
    else result += ones[thousands] + ' THOUSAND ';
  }
  
  const hundreds = Math.floor((dollarsPart % 1000) / 100);
  if (hundreds > 0) result += ones[hundreds] + ' HUNDRED ';
  
  const remainder = dollarsPart % 100;
  if (remainder >= 20) {
    result += tens[Math.floor(remainder / 10)] + ' ';
    if (remainder % 10 > 0) result += ones[remainder % 10];
  } else if (remainder >= 10) {
    result += teens[remainder - 10];
  } else if (remainder > 0) {
    result += ones[remainder];
  }
  
  return result.trim() || 'ZERO';
}

export async function generatePaycheckPDF(data: PaycheckData): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  
  const netAmount = parseFloat(data.netPay);
  const dollarAmount = Math.floor(netAmount);
  const centsAmount = Math.round((netAmount % 1) * 100);
  const amountInWords = convertNumberToWords(dollarAmount);
  
  // Check section
  doc.fontSize(16).font('Helvetica-Bold').text(data.companyName, 50, 50);
  doc.fontSize(10).font('Helvetica').text(data.companyAddress, 50, 70);
  
  doc.fontSize(12).text(`Check #${data.checkNumber}`, 450, 50, { align: 'right' });
  doc.fontSize(10).text(`Date: ${new Date(data.payDate).toLocaleDateString()}`, 50, 100);
  
  doc.fontSize(10).text('PAY TO THE ORDER OF:', 50, 130);
  doc.fontSize(12).font('Helvetica-Bold').text(data.employeeName, 50, 145);
  
  doc.rect(450, 130, 100, 25).stroke();
  doc.fontSize(12).text(`$${parseFloat(data.netPay).toFixed(2)}`, 455, 138);
  
  doc.fontSize(10).font('Helvetica').text(`${amountInWords} DOLLARS AND ${centsAmount}/100`, 50, 180);
  doc.moveTo(50, 195).lineTo(550, 195).stroke();
  
  doc.fontSize(8).text('Authorized Signature', 350, 240);
  doc.moveTo(350, 235).lineTo(500, 235).stroke();
  
  // Dashed line separator
  doc.dash(5, { space: 5 }).moveTo(50, 280).lineTo(550, 280).stroke().undash();
  
  // Pay stub section
  doc.fontSize(12).font('Helvetica-Bold').text('PAY STUB - EMPLOYEE COPY', 50, 300);
  
  doc.fontSize(10).font('Helvetica-Bold').text(data.employeeName, 50, 325);
  doc.fontSize(9).font('Helvetica').text(data.employeeAddress, 50, 340);
  
  doc.fontSize(9).text(`Pay Period: ${new Date(data.periodStart).toLocaleDateString()} - ${new Date(data.periodEnd).toLocaleDateString()}`, 350, 325, { align: 'right' });
  doc.text(`Pay Date: ${new Date(data.payDate).toLocaleDateString()}`, 350, 340, { align: 'right' });
  doc.text(`Check #: ${data.checkNumber}`, 350, 355, { align: 'right' });
  
  // Earnings table
  let y = 380;
  doc.fontSize(10).font('Helvetica-Bold').text('EARNINGS', 50, y);
  y += 20;
  
  doc.fontSize(9);
  doc.rect(50, y, 500, 20).fill('#f0f0f0');
  doc.fillColor('#000').font('Helvetica-Bold');
  doc.text('Description', 55, y + 5);
  doc.text('Rate/Hours', 300, y + 5);
  doc.text('Amount', 480, y + 5);
  
  y += 20;
  doc.font('Helvetica');
  doc.text('Regular Pay', 55, y);
  doc.text(`$${data.regularRate}/hr × ${data.regularHours}hrs`, 300, y);
  doc.text(`$${parseFloat(data.regularPay).toFixed(2)}`, 480, y);
  
  if (parseFloat(data.overtimeHours) > 0) {
    y += 15;
    doc.text('Overtime Pay', 55, y);
    doc.text(`$${data.overtimeRate}/hr × ${data.overtimeHours}hrs`, 300, y);
    doc.text(`$${parseFloat(data.overtimePay).toFixed(2)}`, 480, y);
  }
  
  if (data.bonuses && parseFloat(data.bonuses) > 0) {
    y += 15;
    doc.text('Bonuses', 55, y);
    doc.text(`$${parseFloat(data.bonuses).toFixed(2)}`, 480, y);
  }
  
  if (data.tips && parseFloat(data.tips) > 0) {
    y += 15;
    doc.text('Tips', 55, y);
    doc.text(`$${parseFloat(data.tips).toFixed(2)}`, 480, y);
  }
  
  y += 15;
  doc.rect(50, y, 500, 18).fill('#f9f9f9');
  doc.fillColor('#000').font('Helvetica-Bold');
  doc.text('GROSS PAY', 55, y + 3);
  doc.text(`$${parseFloat(data.grossPay).toFixed(2)}`, 480, y + 3);
  
  // Deductions table
  y += 35;
  doc.fontSize(10).text('DEDUCTIONS', 50, y);
  y += 20;
  
  doc.fontSize(9);
  doc.rect(50, y, 500, 20).fill('#f0f0f0');
  doc.fillColor('#000').font('Helvetica-Bold');
  doc.text('Description', 55, y + 5);
  doc.text('Amount', 480, y + 5);
  
  y += 20;
  doc.font('Helvetica');
  doc.text('Federal Tax', 55, y);
  doc.text(`-$${parseFloat(data.federalTax).toFixed(2)}`, 480, y);
  
  y += 15;
  doc.text('State Tax', 55, y);
  doc.text(`-$${parseFloat(data.stateTax).toFixed(2)}`, 480, y);
  
  y += 15;
  doc.text('Social Security', 55, y);
  doc.text(`-$${parseFloat(data.socialSecurity).toFixed(2)}`, 480, y);
  
  y += 15;
  doc.text('Medicare', 55, y);
  doc.text(`-$${parseFloat(data.medicare).toFixed(2)}`, 480, y);
  
  y += 15;
  doc.rect(50, y, 500, 18).fill('#f9f9f9');
  doc.fillColor('#000').font('Helvetica-Bold');
  doc.text('TOTAL DEDUCTIONS', 55, y + 3);
  doc.text(`-$${parseFloat(data.totalDeductions).toFixed(2)}`, 480, y + 3);
  
  // Net pay
  y += 25;
  doc.rect(50, y, 500, 25).fill('#e0e0e0');
  doc.fillColor('#000').fontSize(12).font('Helvetica-Bold');
  doc.text('NET PAY', 55, y + 6);
  doc.text(`$${parseFloat(data.netPay).toFixed(2)}`, 480, y + 6);
  
  doc.end();
  return pdfPromise;
}
