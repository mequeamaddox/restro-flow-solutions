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
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'thousand', 'million'];

  if (num === 0) return 'Zero';
  
  let result = '';
  const dollarsPart = Math.floor(num);
  let remaining = dollarsPart;
  let place = 0;
  
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk !== 0) {
      let chunkStr = '';
      
      const hundreds = Math.floor(chunk / 100);
      if (hundreds > 0) {
        chunkStr += ones[hundreds] + ' hundred ';
      }
      
      const tensOnes = chunk % 100;
      if (tensOnes >= 20) {
        chunkStr += tens[Math.floor(tensOnes / 10)] + ' ';
        if (tensOnes % 10 > 0) chunkStr += ones[tensOnes % 10].toLowerCase() + ' ';
      } else if (tensOnes >= 10) {
        chunkStr += teens[tensOnes - 10].toLowerCase() + ' ';
      } else if (tensOnes > 0) {
        chunkStr += ones[tensOnes].toLowerCase() + ' ';
      }
      
      result = chunkStr + (thousands[place] ? thousands[place] + ', ' : '') + result;
    }
    remaining = Math.floor(remaining / 1000);
    place++;
  }
  
  return result.trim().replace(/,\s*$/, '') || 'Zero';
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
  const centsAmount = Math.round((netAmount % 1) * 100);
  const amountInWords = convertNumberToWords(Math.floor(netAmount));
  
  // CHECK PORTION (Top Section)
  let y = 40;
  
  // Company name on left, Bank name on right, Check number far right
  doc.fontSize(11).font('Helvetica-Bold').text(data.companyName, 50, y);
  doc.fontSize(10).font('Helvetica').text('First Citizens Bank', 350, y, { align: 'right', width: 150 });
  doc.fontSize(11).font('Helvetica-Bold').text(data.checkNumber, 510, y, { align: 'right' });
  
  y += 15;
  doc.fontSize(9).font('Helvetica').text(data.companyAddress, 50, y);
  
  y += 30;
  doc.fontSize(9).text(new Date(data.payDate).toLocaleDateString('en-US'), 510, y, { align: 'right' });
  
  y += 15;
  doc.fontSize(9).text('PAY TO THE', 50, y);
  doc.text('ORDER OF', 50, y + 10);
  
  y += 10;
  doc.fontSize(11).font('Helvetica-Bold').text(data.employeeName, 110, y);
  
  y += 20;
  const amountText = `${amountInWords} and ${String(centsAmount).padStart(2, '0')}/100 Dollars`;
  doc.fontSize(9).font('Helvetica').text(amountText, 50, y, { width: 380 });
  doc.fontSize(12).font('Helvetica-Bold').text(`$${netAmount.toFixed(2)}`, 480, y - 20, { align: 'right' });
  
  y += 15;
  doc.fontSize(9).font('Helvetica').text(data.employeeName, 50, y);
  
  y += 30;
  doc.fontSize(8).text('AUTHORIZED SIGNATURE', 350, y);
  doc.moveTo(350, y - 5).lineTo(520, y - 5).stroke();
  
  // MICR line (simulated banking info)
  y += 25;
  doc.fontSize(9).font('Courier').text(`C${data.checkNumber}C A053906041A 9166868409C`, 150, y);
  
  // STUB PORTION (Bottom Section)
  y += 35;
  
  // Employee info (left) and Company info (right)
  doc.fontSize(9).font('Helvetica').text(data.employeeName, 50, y);
  doc.text(data.companyName, 300, y);
  
  y += 12;
  const employeeAddressLines = data.employeeAddress.split(',');
  employeeAddressLines.forEach(line => {
    doc.text(line.trim(), 50, y);
    y += 12;
  });
  
  const companyY = y - (employeeAddressLines.length * 12);
  const companyAddressLines = data.companyAddress.split(',');
  let companyLineY = companyY + 12;
  companyAddressLines.forEach(line => {
    doc.text(line.trim(), 300, companyLineY);
    companyLineY += 12;
  });
  
  // Pay period info (right side)
  doc.fontSize(9).font('Helvetica-Bold').text('Pay Period', 420, companyY + 12);
  doc.font('Helvetica').text(`${new Date(data.periodStart).toLocaleDateString('en-US')} - ${new Date(data.periodEnd).toLocaleDateString('en-US')}`, 420, companyY + 24);
  doc.font('Helvetica-Bold').text('Pay Type       Pay Date         Check#', 420, companyY + 36);
  doc.font('Helvetica').text(`Hourly         ${new Date(data.payDate).toLocaleDateString('en-US')}        ${data.checkNumber}`, 420, companyY + 48);
  
  y = Math.max(y, companyLineY + 20);
  
  // Tables section - 2 columns layout
  const leftColX = 50;
  const rightColX = 310;
  const colWidth = 240;
  
  // HOURS & EARNINGS (Left Column)
  doc.fontSize(9).font('Helvetica-Bold').text('HOURS', leftColX, y, { width: colWidth, underline: true });
  y += 15;
  
  // Hours table header
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Description', leftColX, y, { width: 80 });
  doc.text('Hours', leftColX + 80, y, { width: 40 });
  doc.text('Rate', leftColX + 120, y, { width: 40 });
  doc.text('Pay Period', leftColX + 160, y, { width: 40 });
  doc.text('YTD', leftColX + 200, y, { width: 40 });
  
  y += 12;
  doc.font('Helvetica');
  
  // Regular hours
  if (parseFloat(data.regularHours) > 0) {
    doc.text('Regular', leftColX, y, { width: 80 });
    doc.text(parseFloat(data.regularHours).toFixed(2), leftColX + 80, y, { width: 40 });
    doc.text(`$${parseFloat(data.regularRate).toFixed(2)}`, leftColX + 120, y, { width: 40 });
    doc.text(`$${parseFloat(data.regularPay).toFixed(2)}`, leftColX + 160, y, { width: 40 });
    doc.text(`$${parseFloat(data.regularPay).toFixed(2)}`, leftColX + 200, y, { width: 40 });
    y += 12;
  }
  
  // Overtime hours
  if (parseFloat(data.overtimeHours) > 0) {
    doc.text('Overtime', leftColX, y, { width: 80 });
    doc.text(parseFloat(data.overtimeHours).toFixed(2), leftColX + 80, y, { width: 40 });
    doc.text(`$${parseFloat(data.overtimeRate).toFixed(2)}`, leftColX + 120, y, { width: 40 });
    doc.text(`$${parseFloat(data.overtimePay).toFixed(2)}`, leftColX + 160, y, { width: 40 });
    doc.text(`$${parseFloat(data.overtimePay).toFixed(2)}`, leftColX + 200, y, { width: 40 });
    y += 12;
  }
  
  // Tips
  if (data.tips && parseFloat(data.tips) > 0) {
    doc.text('Tips - Already Paid', leftColX, y, { width: 80 });
    doc.text('', leftColX + 80, y, { width: 40 });
    doc.text('', leftColX + 120, y, { width: 40 });
    doc.text(`$${parseFloat(data.tips).toFixed(2)}`, leftColX + 160, y, { width: 40 });
    doc.text(`$${parseFloat(data.tips).toFixed(2)}`, leftColX + 200, y, { width: 40 });
    y += 12;
  }
  
  y += 3;
  doc.font('Helvetica-Bold');
  const totalHours = parseFloat(data.regularHours) + parseFloat(data.overtimeHours);
  const totalEarnings = parseFloat(data.regularPay) + parseFloat(data.overtimePay);
  doc.text('Totals', leftColX, y, { width: 80 });
  doc.text(totalHours.toFixed(2), leftColX + 80, y, { width: 40 });
  doc.text('', leftColX + 120, y, { width: 40 });
  doc.text(`$${totalEarnings.toFixed(2)}`, leftColX + 160, y, { width: 40 });
  doc.text(`$${totalEarnings.toFixed(2)}`, leftColX + 200, y, { width: 40 });
  
  // EMPLOYEE TAXES (Right Column)
  const taxY = y - (12 * (data.tips && parseFloat(data.tips) > 0 ? 3 : 2)) - 15;
  doc.fontSize(9).font('Helvetica-Bold').text('EMPLOYEE TAXES', rightColX, taxY, { width: colWidth, underline: true });
  
  let taxRowY = taxY + 15;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Description', rightColX, taxRowY, { width: 140 });
  doc.text('Pay Period', rightColX + 140, taxRowY, { width: 50 });
  doc.text('YTD', rightColX + 190, taxRowY, { width: 50 });
  
  taxRowY += 12;
  doc.font('Helvetica');
  
  if (parseFloat(data.federalTax) > 0) {
    doc.text('Federal Income Tax', rightColX, taxRowY, { width: 140 });
    doc.text(`$${parseFloat(data.federalTax).toFixed(2)}`, rightColX + 140, taxRowY, { width: 50 });
    doc.text(`$${parseFloat(data.federalTax).toFixed(2)}`, rightColX + 190, taxRowY, { width: 50 });
    taxRowY += 12;
  }
  
  doc.text('Social Security', rightColX, taxRowY, { width: 140 });
  doc.text(`$${parseFloat(data.socialSecurity).toFixed(2)}`, rightColX + 140, taxRowY, { width: 50 });
  doc.text(`$${parseFloat(data.socialSecurity).toFixed(2)}`, rightColX + 190, taxRowY, { width: 50 });
  taxRowY += 12;
  
  doc.text('Medicare', rightColX, taxRowY, { width: 140 });
  doc.text(`$${parseFloat(data.medicare).toFixed(2)}`, rightColX + 140, taxRowY, { width: 50 });
  doc.text(`$${parseFloat(data.medicare).toFixed(2)}`, rightColX + 190, taxRowY, { width: 50 });
  taxRowY += 12;
  
  if (parseFloat(data.stateTax) > 0) {
    doc.text('State Tax', rightColX, taxRowY, { width: 140 });
    doc.text(`$${parseFloat(data.stateTax).toFixed(2)}`, rightColX + 140, taxRowY, { width: 50 });
    doc.text(`$${parseFloat(data.stateTax).toFixed(2)}`, rightColX + 190, taxRowY, { width: 50 });
    taxRowY += 12;
  }
  
  taxRowY += 3;
  doc.font('Helvetica-Bold');
  const totalTaxes = parseFloat(data.federalTax) + parseFloat(data.socialSecurity) + parseFloat(data.medicare) + parseFloat(data.stateTax);
  doc.text('Totals', rightColX, taxRowY, { width: 140 });
  doc.text(`$${totalTaxes.toFixed(2)}`, rightColX + 140, taxRowY, { width: 50 });
  doc.text(`$${totalTaxes.toFixed(2)}`, rightColX + 190, taxRowY, { width: 50 });
  
  y += 25;
  
  // DEDUCTIONS & EMPLOYER CONTRIBUTIONS (Second row)
  doc.fontSize(9).font('Helvetica-Bold').text('DEDUCTIONS', leftColX, y, { width: colWidth, underline: true });
  doc.text('EMPLOYER CONTRIBUTIONS', rightColX, y, { width: colWidth, underline: true });
  
  y += 15;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Description', leftColX, y, { width: 140 });
  doc.text('Pay Period', leftColX + 140, y, { width: 50 });
  doc.text('YTD', leftColX + 190, y, { width: 50 });
  
  doc.text('Description', rightColX, y, { width: 140 });
  doc.text('Pay Period', rightColX + 140, y, { width: 50 });
  doc.text('YTD', rightColX + 190, y, { width: 50 });
  
  y += 12;
  doc.font('Helvetica');
  
  // Deductions (left)
  if (data.tips && parseFloat(data.tips) > 0) {
    doc.text('Tips - Already Paid', leftColX, y, { width: 140 });
    doc.text(`$${parseFloat(data.tips).toFixed(2)}`, leftColX + 140, y, { width: 50 });
    doc.text(`$${parseFloat(data.tips).toFixed(2)}`, leftColX + 190, y, { width: 50 });
  } else {
    doc.text('No deductions', leftColX, y, { width: 140 });
    doc.text('-', leftColX + 140, y, { width: 50 });
    doc.text('-', leftColX + 190, y, { width: 50 });
  }
  
  // Employer contributions (right)
  doc.text('No Contributions', rightColX, y, { width: 140 });
  doc.text('-', rightColX + 140, y, { width: 50 });
  doc.text('-', rightColX + 190, y, { width: 50 });
  
  y += 15;
  doc.font('Helvetica-Bold');
  const totalDeductions = data.tips ? parseFloat(data.tips) : 0;
  doc.text('Totals', leftColX, y, { width: 140 });
  doc.text(`$${totalDeductions.toFixed(2)}`, leftColX + 140, y, { width: 50 });
  doc.text(`$${totalDeductions.toFixed(2)}`, leftColX + 190, y, { width: 50 });
  
  doc.text('Totals', rightColX, y, { width: 140 });
  doc.text('$0.00', rightColX + 140, y, { width: 50 });
  doc.text('$0.00', rightColX + 190, y, { width: 50 });
  
  y += 25;
  
  // CHECK TOTALS & DIRECT DEPOSIT (Bottom row)
  doc.fontSize(9).font('Helvetica-Bold').text('CHECK TOTALS', leftColX, y, { width: colWidth, underline: true });
  doc.text('DIRECT DEPOSIT / CHECK DETAILS', rightColX, y, { width: colWidth, underline: true });
  
  y += 15;
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Description', leftColX, y, { width: 140 });
  doc.text('Pay Period', leftColX + 140, y, { width: 50 });
  doc.text('YTD', leftColX + 190, y, { width: 50 });
  
  doc.text('Description', rightColX, y, { width: 140 });
  doc.text('Pay Period', rightColX + 140, y, { width: 50 });
  doc.text('YTD', rightColX + 190, y, { width: 50 });
  
  y += 12;
  doc.font('Helvetica');
  
  // Check totals (left)
  doc.text('Gross Pay', leftColX, y, { width: 140 });
  doc.text(`$${parseFloat(data.grossPay).toFixed(2)}`, leftColX + 140, y, { width: 50 });
  doc.text(`$${parseFloat(data.grossPay).toFixed(2)}`, leftColX + 190, y, { width: 50 });
  
  // Check details (right)
  doc.text(`Check #${data.checkNumber}`, rightColX, y, { width: 140 });
  doc.text(`$${netAmount.toFixed(2)}`, rightColX + 140, y, { width: 50 });
  doc.text('-', rightColX + 190, y, { width: 50 });
  
  y += 12;
  doc.text('Total Deductions', leftColX, y, { width: 140 });
  doc.text(`$${totalDeductions.toFixed(2)}`, leftColX + 140, y, { width: 50 });
  doc.text(`$${totalDeductions.toFixed(2)}`, leftColX + 190, y, { width: 50 });
  
  doc.font('Helvetica-Bold');
  doc.text('Total Net Pay', rightColX, y, { width: 140 });
  doc.text(`$${netAmount.toFixed(2)}`, rightColX + 140, y, { width: 50 });
  doc.text(`$${netAmount.toFixed(2)}`, rightColX + 190, y, { width: 50 });
  
  y += 12;
  doc.font('Helvetica');
  doc.text('Total Employee Taxes', leftColX, y, { width: 140 });
  doc.text(`$${totalTaxes.toFixed(2)}`, leftColX + 140, y, { width: 50 });
  doc.text(`$${totalTaxes.toFixed(2)}`, leftColX + 190, y, { width: 50 });
  
  y += 12;
  doc.font('Helvetica-Bold');
  doc.text('Total Net Pay', leftColX, y, { width: 140 });
  doc.text(`$${netAmount.toFixed(2)}`, leftColX + 140, y, { width: 50 });
  doc.text(`$${netAmount.toFixed(2)}`, leftColX + 190, y, { width: 50 });
  
  doc.end();
  return pdfPromise;
}
