import React from 'react';

interface ActualPaycheckProps {
  paycheck: {
    checkNumber: string;
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
    netPay: string;
    payDate: string;
    payPeriod: {
      startDate: string;
      endDate: string;
    };
    employee: {
      firstName: string;
      lastName: string;
      address: string;
      phone: string;
    };
  };
  settings?: {
    businessName?: string;
    taxFilingName?: string;
    lastCheckNumber?: string;
    displayBusinessName?: boolean;
    displayTaxFilingName?: boolean;
    printSignature?: boolean;
  };
}

export function ActualPaycheck({ paycheck, settings }: ActualPaycheckProps) {
  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Convert number to written words for check
  const convertNumberToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const thousands = ['', 'THOUSAND', 'MILLION'];

    if (num === 0) return 'ZERO';
    if (num < 0) return 'NEGATIVE ' + convertNumberToWords(-num);

    let result = '';
    let thousandIndex = 0;

    while (num > 0) {
      const chunk = num % 1000;
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
      
      num = Math.floor(num / 1000);
      thousandIndex++;
    }
    
    return result.trim();
  };

  const netAmount = parseFloat(paycheck.netPay);
  const dollarAmount = Math.floor(netAmount);
  const centsAmount = Math.round((netAmount % 1) * 100);
  const amountInWords = convertNumberToWords(dollarAmount);

  return (
    <div className="bg-white text-black font-mono print:p-0" style={{ width: '8.5in', margin: '0 auto' }}>
      {/* Professional Check Format */}
      <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4" style={{ height: '3.5in', padding: '0.5in' }}>
        
        {/* Top row: Business info, Bank, Check number */}
        <div className="flex justify-between items-start mb-4">
          <div className="text-sm font-bold leading-tight">
            {settings?.businessName || 'RestroFlow Restaurant'}<br/>
            123 Main Street<br/>
            Charleston, SC 29401
          </div>
          <div className="text-center">
            <div className="text-sm font-bold">First Citizens Bank</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{paycheck.checkNumber}</div>
            <div className="text-sm mt-2">{safeFormatDate(paycheck.payDate)}</div>
          </div>
        </div>

        {/* Pay to line */}
        <div className="mb-4">
          <div className="text-sm mb-1">PAY TO THE ORDER OF</div>
          <div className="text-lg font-bold border-b border-black pb-1">
            {paycheck.employee.firstName} {paycheck.employee.lastName}
          </div>
        </div>

        {/* Amount section */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1 mr-4">
            <div className="text-xs mb-1">AMOUNT IN WORDS</div>
            <div className="text-sm font-bold border-b border-black pb-1">
              {amountInWords} DOLLARS AND {centsAmount.toString().padStart(2, '0')}/100 CENTS
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs mb-1">$</div>
            <div className="text-xl font-bold border border-black px-2 py-1">
              {parseFloat(paycheck.netPay).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Memo and signature line */}
        <div className="flex justify-between items-end">
          <div>
            <div className="text-xs mb-1">MEMO</div>
            <div className="text-sm border-b border-black pb-1" style={{ width: '200px' }}>
              Payroll - {safeFormatDate(paycheck.payPeriod?.startDate)} to {safeFormatDate(paycheck.payPeriod?.endDate)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm border-b border-black pb-1" style={{ width: '200px' }}>
              {settings?.printSignature ? 'AUTHORIZED SIGNATURE' : ''}
            </div>
          </div>
        </div>

        {/* Check routing numbers */}
        <div className="mt-4 text-xs text-center">
          C{paycheck.checkNumber}C A053906041A 123456789C
        </div>
      </div>

      {/* Pay Stub - Employee Copy */}
      <div className="p-4 bg-gray-50" style={{ minHeight: '4.5in' }}>
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">{settings?.businessName || 'RestroFlow Restaurant'}</h2>
          <p className="text-sm">Employee Pay Stub</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Employee Info */}
          <div>
            <div className="font-bold mb-2">{paycheck.employee.firstName} {paycheck.employee.lastName}</div>
            <div className="text-sm space-y-1">
              <div>{paycheck.employee.address}</div>
              <div>{paycheck.employee.phone}</div>
            </div>
          </div>

          {/* Business Info */}
          <div>
            <div className="font-bold mb-2">{settings?.businessName || 'RestroFlow Restaurant'}</div>
            <div className="text-sm space-y-1">
              <div>123 Main Street</div>
              <div>Charleston, SC 29401</div>
              <div>(843) 555-0123</div>
              <div>SC EIN: 12-3456789</div>
            </div>
          </div>
        </div>

        {/* Pay Period and Check Info */}
        <div className="mt-6 mb-4 p-3 bg-white border rounded">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Pay Period:</strong><br/>
              {safeFormatDate(paycheck.payPeriod?.startDate)} - {safeFormatDate(paycheck.payPeriod?.endDate)}
            </div>
            <div>
              <strong>Pay Date:</strong><br/>
              {safeFormatDate(paycheck.payDate)}
            </div>
            <div>
              <strong>Check Number:</strong><br/>
              {paycheck.checkNumber}
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="mb-4">
          <h3 className="font-bold text-sm mb-2 bg-gray-200 p-2">EARNINGS</h3>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="font-semibold">Description</div>
            <div className="font-semibold text-right">Hours</div>
            <div className="font-semibold text-right">Rate</div>
            <div className="font-semibold text-right">Amount</div>
            
            <div>Regular Pay</div>
            <div className="text-right">{parseFloat(paycheck.regularHours).toFixed(2)}</div>
            <div className="text-right">${parseFloat(paycheck.regularRate).toFixed(2)}</div>
            <div className="text-right">${parseFloat(paycheck.regularPay).toFixed(2)}</div>
            
            {parseFloat(paycheck.overtimeHours) > 0 && (
              <>
                <div>Overtime Pay</div>
                <div className="text-right">{parseFloat(paycheck.overtimeHours).toFixed(2)}</div>
                <div className="text-right">${parseFloat(paycheck.overtimeRate).toFixed(2)}</div>
                <div className="text-right">${parseFloat(paycheck.overtimePay).toFixed(2)}</div>
              </>
            )}
            
            <div className="border-t pt-1 font-semibold">GROSS PAY</div>
            <div className="border-t pt-1"></div>
            <div className="border-t pt-1"></div>
            <div className="border-t pt-1 text-right font-semibold">${parseFloat(paycheck.grossPay).toFixed(2)}</div>
          </div>
        </div>

        {/* Deductions */}
        <div className="mb-4">
          <h3 className="font-bold text-sm mb-2 bg-gray-200 p-2">DEDUCTIONS</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Federal Tax:</span>
                <span>${parseFloat(paycheck.federalTax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>State Tax:</span>
                <span>${parseFloat(paycheck.stateTax).toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Social Security:</span>
                <span>${parseFloat(paycheck.socialSecurity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Medicare:</span>
                <span>${parseFloat(paycheck.medicare).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>TOTAL DEDUCTIONS:</span>
              <span>${parseFloat(paycheck.totalDeductions).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">NET PAY:</span>
            <span className="text-xl font-bold text-green-600">${parseFloat(paycheck.netPay).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}