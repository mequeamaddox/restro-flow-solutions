import React from 'react';

interface ActualPaycheckProps {
  settings: any;
  employee: any;
  paycheck: any;
}

export function ActualPaycheck({ settings, employee, paycheck }: ActualPaycheckProps) {
  // Convert number to written words for check
  const convertNumberToWords = (num: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const thousands = ['', 'THOUSAND', 'MILLION', 'BILLION'];

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

  return (
    <div className="bg-white text-black font-mono print:p-0" style={{ width: '8.5in', margin: '0 auto' }}>
      {/* Actual Check Format - Matches Pawleys Fish Camp */}
      <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4" style={{ height: '3.5in', padding: '0.5in' }}>
        
        {/* Top row: Business name, Bank name, Check number */}
        <div className="flex justify-between items-start mb-4">
          <div className="text-sm font-bold leading-tight">
            {settings?.businessName || 'Pawleys Fish Camp'}<br/>
            10744 Ocean Hwy<br/>
            G<br/>
            Pawleys Island, SC 29585
          </div>
          <div className="text-center">
            <div className="text-sm font-bold">First Citizens Bank</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{paycheck?.checkNumber || (settings?.lastCheckNumber || '3461')}</div>
            <div className="text-sm mt-2">{paycheck?.payDate || new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* PAY TO THE ORDER OF section */}
        <div className="mt-8 mb-4">
          <div className="text-xs font-bold mb-1">PAY TO THE</div>
          <div className="text-xs font-bold mb-2">ORDER OF</div>
          <div className="border-b border-black pb-1">
            <span className="text-base font-bold ml-4">{employee?.firstName} {employee?.lastName}</span>
          </div>
        </div>

        {/* Amount in words and dollar box */}
        <div className="flex justify-between items-center my-6">
          <div className="flex-1">
            <div className="border-b border-black pb-1">
              <span className="text-sm capitalize">
                {convertNumberToWords(parseFloat(paycheck?.netPay || '0')).toLowerCase()} and {String(parseFloat(paycheck?.netPay || '0')).split('.')[1]?.padEnd(2, '0') || '00'}/100 Dollars
              </span>
            </div>
          </div>
          <div className="ml-4 border border-black px-3 py-1">
            <span className="text-lg font-bold">${paycheck?.netPay || '0.00'}</span>
          </div>
        </div>

        {/* Employee name and signature line */}
        <div className="flex justify-between items-end mt-8">
          <div className="text-sm">
            {employee?.firstName} {employee?.lastName}
          </div>
          <div className="text-right">
            <div className="border-b border-black w-64 pb-2 mb-1">
              {settings?.printSignature && (
                <span className="text-sm">AUTHORIZED SIGNATURE</span>
              )}
            </div>
          </div>
        </div>

        {/* Bank routing numbers at bottom */}
        <div className="mt-4 text-center font-mono text-xs">
          C{paycheck?.checkNumber || (settings?.lastCheckNumber || '3461')}C A053906041A 9166868409C
        </div>
      </div>

      {/* Pay Stub Section - Detailed breakdown */}
      <div className="grid grid-cols-3 gap-6 text-xs p-4">
        {/* Employee Info */}
        <div>
          <div className="font-bold mb-2">{employee?.firstName} {employee?.lastName}</div>
          <div>{employee?.address || '19 Yellow Kelp Ct'}</div>
          <div>{employee?.city || 'Hopkins'}, {employee?.state || 'SC'} {employee?.zipCode || '29061'}</div>
        </div>

        {/* Business Info */}
        <div>
          <div className="font-bold mb-2">{settings?.businessName || 'Pawleys Fish Camp'}</div>
          <div>10744 Ocean Hwy</div>
          <div>G</div>
          <div>Pawleys Island, SC 29585</div>
          <div>(864) 247-7655</div>
          <div>SC EIN: 11993268-0</div>
        </div>

        {/* Pay Period Info */}
        <div>
          <div className="font-bold mb-2">Pay Period</div>
          <div>{paycheck?.payPeriodStart || '8/18/2025'} - {paycheck?.payPeriodEnd || '8/31/2025'}</div>
          <div className="mt-2">
            <div><span className="font-semibold">Pay Type:</span> {employee?.payType || 'Hourly'}</div>
            <div><span className="font-semibold">Pay Date:</span> {paycheck?.payDate || new Date().toLocaleDateString()}</div>
            <div><span className="font-semibold">Check#:</span> {paycheck?.checkNumber || (settings?.lastCheckNumber || '3461')}</div>
          </div>
        </div>
      </div>

      {/* Detailed Pay Information */}
      <div className="grid grid-cols-4 gap-4 text-xs p-4 border-t border-gray-300">
        {/* Hours */}
        <div>
          <div className="font-bold border-b mb-2">HOURS</div>
          <div className="space-y-1">
            <div className="font-semibold">Description</div>
            <div>Regular</div>
            <div>Server</div>
          </div>
        </div>

        {/* Earnings */}
        <div>
          <div className="font-bold border-b mb-2">EARNINGS</div>
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-1 text-xs font-semibold">
              <span>Hours</span>
              <span>Rate</span>
              <span>Pay Period</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span>{parseFloat(paycheck?.regularHours || '0').toFixed(2)}</span>
              <span>${parseFloat(paycheck?.hourlyRate || '0').toFixed(2)}</span>
              <span>${parseFloat(paycheck?.regularPay || '0').toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Employee Taxes */}
        <div>
          <div className="font-bold border-b mb-2">EMPLOYEE TAXES</div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs font-semibold">
              <span>Description</span>
              <span>Pay Period</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span>Social Security</span>
              <span>${parseFloat(paycheck?.socialSecurity || '0').toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span>Medicare</span>
              <span>${parseFloat(paycheck?.medicare || '0').toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span>South Carolina State Tax</span>
              <span>${parseFloat(paycheck?.stateTax || '0').toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-semibold border-t pt-1">
              <span>Totals</span>
              <span>${parseFloat(paycheck?.totalDeductions || '0').toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Check Totals */}
        <div>
          <div className="font-bold border-b mb-2">CHECK TOTALS</div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs font-semibold">
              <span>Description</span>
              <span>Pay Period</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span>Gross Pay</span>
              <span>${parseFloat(paycheck?.grossPay || '0').toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <span>Total Employee Taxes</span>
              <span>${parseFloat(paycheck?.totalDeductions || '0').toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-semibold border-t pt-1">
              <span>Check #{paycheck?.checkNumber || (settings?.lastCheckNumber || '3461')}</span>
              <span>${parseFloat(paycheck?.netPay || '0').toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-semibold">
              <span>Total Net Pay</span>
              <span>${parseFloat(paycheck?.netPay || '0').toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}