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
            {/* Check portion on top */}
            <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-bold">{settings?.businessName || 'Business Name'}</div>
                  {settings?.displayTaxFilingName && (
                    <div className="text-sm text-gray-600">{settings?.taxFilingName}</div>
                  )}
                </div>
                <div className="text-right">
                  {settings?.showLastCheckNumber && (
                    <div className="text-sm">Check #{settings?.lastCheckNumber || 1000}</div>
                  )}
                  <div className="text-xl font-mono">${paycheck?.netPay || '0.00'}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <div className="font-semibold">{employee?.firstName} {employee?.lastName}</div>
                  {settings?.displayLast4Ssn && employee?.ssn && (
                    <div className="text-sm">SSN: {formatSSN(employee.ssn)}</div>
                  )}
                </div>
                <div className="text-right">
                  <div>Pay Date: {paycheck?.payDate || new Date().toLocaleDateString()}</div>
                  {settings?.printSignature && (
                    <div className="mt-2 text-sm italic">Electronically Signed</div>
                  )}
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
            {/* Check portion on bottom */}
            <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-bold">{settings?.businessName || 'Business Name'}</div>
                  {settings?.displayTaxFilingName && (
                    <div className="text-sm text-gray-600">{settings?.taxFilingName}</div>
                  )}
                </div>
                <div className="text-right">
                  {settings?.showLastCheckNumber && (
                    <div className="text-sm">Check #{settings?.lastCheckNumber || 1000}</div>
                  )}
                  <div className="text-xl font-mono">${paycheck?.netPay || '0.00'}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <div className="font-semibold">{employee?.firstName} {employee?.lastName}</div>
                  {settings?.displayLast4Ssn && employee?.ssn && (
                    <div className="text-sm">SSN: {formatSSN(employee.ssn)}</div>
                  )}
                </div>
                <div className="text-right">
                  <div>Pay Date: {paycheck?.payDate || new Date().toLocaleDateString()}</div>
                  {settings?.printSignature && (
                    <div className="mt-2 text-sm italic">Electronically Signed</div>
                  )}
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