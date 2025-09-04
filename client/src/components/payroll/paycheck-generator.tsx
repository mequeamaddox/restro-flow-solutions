import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface PaycheckGeneratorProps {
  settings: any;
  employee: any;
  paycheck: any;
}

export function PaycheckGenerator({ settings, employee, paycheck }: PaycheckGeneratorProps) {
  const formatSSN = (ssn: string) => {
    if (!settings?.displayLast4Ssn || !ssn) return '';
    return `***-**-${ssn.slice(-4)}`;
  };

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

  const renderPaycheckLayout = () => {
    const commonStyles = "p-6 border border-gray-300 bg-white text-black print:shadow-none";
    
    switch (settings?.paycheckLayout) {
      case 'no_printing':
        return (
          <div className={`${commonStyles} text-center`}>
            <div className="text-2xl font-bold mb-4">Digital Pay Stub Only</div>
            <p className="text-gray-600">This paycheck is configured for digital-only distribution</p>
          </div>
        );

      case 'check_on_top':
        return (
          <div className={commonStyles}>
            {/* Professional Check Format - Top */}
            <div className="border-b-2 border-dashed border-gray-400 pb-6 mb-6">
              {/* Header row with company and check info */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <div className="text-lg font-bold">{settings?.businessName || 'Your Business Name'}</div>
                  <div className="text-sm text-gray-700">123 Business Address</div>
                  <div className="text-sm text-gray-700">City, State 12345</div>
                  {settings?.displayTaxFilingName && (
                    <div className="text-xs text-gray-600 mt-2">DBA: {settings?.taxFilingName}</div>
                  )}
                </div>
                <div className="text-right space-y-2">
                  {settings?.showLastCheckNumber && (
                    <div className="text-lg font-mono border border-gray-400 px-3 py-1">
                      Check #{(settings?.lastCheckNumber || 1000) + 1}
                    </div>
                  )}
                  <div className="text-sm">
                    Date: {paycheck?.payDate || new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Pay to the order of line */}
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">PAY TO THE ORDER OF</span>
                  <div className="flex-1 border-b border-black pb-1">
                    <span className="text-base font-semibold ml-2">
                      {employee?.firstName} {employee?.lastName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount boxes */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1 mr-4">
                  <div className="border border-black p-2 text-center">
                    <div className="text-lg font-mono font-bold">${paycheck?.netPay || '0.00'}</div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">DOLLARS</span>
                </div>
              </div>

              {/* Written amount line */}
              <div className="mb-4">
                <div className="border-b border-black pb-1">
                  <span className="text-sm ml-2">
                    {convertNumberToWords(parseFloat(paycheck?.netPay || '0'))} DOLLARS
                  </span>
                </div>
              </div>

              {/* Memo and signature line */}
              <div className="flex justify-between items-end">
                <div className="flex-1 mr-8">
                  <div className="text-xs mb-1">MEMO</div>
                  <div className="border-b border-black pb-1">
                    <span className="text-sm ml-2">
                      Payroll for {new Date(paycheck?.payDate || new Date()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-b border-black pb-1 w-48">
                    {settings?.printSignature && (
                      <span className="text-sm italic">Electronically Authorized</span>
                    )}
                  </div>
                  <div className="text-xs mt-1">SIGNATURE</div>
                </div>
              </div>
            </div>
            {/* Stub details below */}
            <PayStubDetails settings={settings} employee={employee} paycheck={paycheck} />
          </div>
        );

      case 'check_on_bottom':
        return (
          <div className={commonStyles}>
            {/* Stub details on top */}
            <PayStubDetails settings={settings} employee={employee} paycheck={paycheck} />
            {/* Professional Check Format - Bottom */}
            <div className="border-t-2 border-dashed border-gray-400 pt-6 mt-6">
              {/* Header row with company and check info */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <div className="text-lg font-bold">{settings?.businessName || 'Your Business Name'}</div>
                  <div className="text-sm text-gray-700">123 Business Address</div>
                  <div className="text-sm text-gray-700">City, State 12345</div>
                  {settings?.displayTaxFilingName && (
                    <div className="text-xs text-gray-600 mt-2">DBA: {settings?.taxFilingName}</div>
                  )}
                </div>
                <div className="text-right space-y-2">
                  {settings?.showLastCheckNumber && (
                    <div className="text-lg font-mono border border-gray-400 px-3 py-1">
                      Check #{(settings?.lastCheckNumber || 1000) + 1}
                    </div>
                  )}
                  <div className="text-sm">
                    Date: {paycheck?.payDate || new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Pay to the order of line */}
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">PAY TO THE ORDER OF</span>
                  <div className="flex-1 border-b border-black pb-1">
                    <span className="text-base font-semibold ml-2">
                      {employee?.firstName} {employee?.lastName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount boxes */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1 mr-4">
                  <div className="border border-black p-2 text-center">
                    <div className="text-lg font-mono font-bold">${paycheck?.netPay || '0.00'}</div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">DOLLARS</span>
                </div>
              </div>

              {/* Written amount line */}
              <div className="mb-4">
                <div className="border-b border-black pb-1">
                  <span className="text-sm ml-2">
                    {convertNumberToWords(parseFloat(paycheck?.netPay || '0'))} DOLLARS
                  </span>
                </div>
              </div>

              {/* Memo and signature line */}
              <div className="flex justify-between items-end">
                <div className="flex-1 mr-8">
                  <div className="text-xs mb-1">MEMO</div>
                  <div className="border-b border-black pb-1">
                    <span className="text-sm ml-2">
                      Payroll for {new Date(paycheck?.payDate || new Date()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-b border-black pb-1 w-48">
                    {settings?.printSignature && (
                      <span className="text-sm italic">Electronically Authorized</span>
                    )}
                  </div>
                  <div className="text-xs mt-1">SIGNATURE</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'check_stub_only':
      default:
        return (
          <div className={commonStyles}>
            <PayStubDetails settings={settings} employee={employee} paycheck={paycheck} />
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Paycheck Preview</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.print()}
              data-testid="print-paycheck"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="download-paycheck"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Layout: <span className="font-semibold capitalize">{settings?.paycheckLayout?.replace('_', ' ')}</span>
          </div>
          {renderPaycheckLayout()}
        </div>
      </CardContent>
    </Card>
  );
}

function PayStubDetails({ settings, employee, paycheck }: any) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center border-b pb-2">
        <div className="text-lg font-bold">
          {settings?.displayBusinessName ? settings?.businessName : 'Pay Stub'}
        </div>
        {settings?.displayTaxFilingName && (
          <div className="text-sm text-gray-600">{settings?.taxFilingName}</div>
        )}
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold">{employee?.firstName} {employee?.lastName}</div>
          <div>Employee ID: {employee?.employeeId || 'EMP001'}</div>
          {settings?.displayLast4Ssn && employee?.ssn && (
            <div>SSN: ***-**-{employee.ssn.slice(-4)}</div>
          )}
        </div>
        <div className="text-right">
          <div>Pay Period: {paycheck?.payPeriodStart} - {paycheck?.payPeriodEnd}</div>
          <div>Pay Date: {paycheck?.payDate || new Date().toLocaleDateString()}</div>
          {settings?.showLastCheckNumber && (
            <div>Check #: {settings?.lastCheckNumber || 1000}</div>
          )}
        </div>
      </div>

      {/* Earnings */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="font-semibold border-b">Earnings</div>
        <div className="font-semibold border-b text-center">Hours</div>
        <div className="font-semibold border-b text-right">Amount</div>
        
        <div>Regular Pay</div>
        <div className="text-center">{paycheck?.regularHours || '40.00'}</div>
        <div className="text-right">${paycheck?.regularPay || '800.00'}</div>
        
        <div>Overtime Pay</div>
        <div className="text-center">{paycheck?.overtimeHours || '0.00'}</div>
        <div className="text-right">${paycheck?.overtimePay || '0.00'}</div>
        
        <div className="font-semibold border-t pt-2">Gross Pay</div>
        <div className="border-t pt-2"></div>
        <div className="font-semibold border-t pt-2 text-right">${paycheck?.grossPay || '800.00'}</div>
      </div>

      {/* Deductions */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="font-semibold border-b">Deductions</div>
        <div className="font-semibold border-b text-right">Amount</div>
        
        <div>Federal Tax</div>
        <div className="text-right">${paycheck?.federalTax || '120.00'}</div>
        
        <div>State Tax</div>
        <div className="text-right">${paycheck?.stateTax || '40.00'}</div>
        
        <div>Social Security</div>
        <div className="text-right">${paycheck?.socialSecurity || '49.60'}</div>
        
        <div>Medicare</div>
        <div className="text-right">${paycheck?.medicare || '11.60'}</div>
        
        <div className="font-semibold border-t pt-2">Total Deductions</div>
        <div className="font-semibold border-t pt-2 text-right">${paycheck?.totalDeductions || '221.20'}</div>
      </div>

      {/* Net Pay */}
      <div className="grid grid-cols-2 gap-4 text-lg font-bold border-t pt-4">
        <div>NET PAY</div>
        <div className="text-right">${paycheck?.netPay || '578.80'}</div>
      </div>

      {/* Signature */}
      {settings?.printSignature && (
        <div className="text-center text-sm italic pt-4 border-t">
          This paycheck has been electronically processed and authorized
        </div>
      )}
    </div>
  );
}