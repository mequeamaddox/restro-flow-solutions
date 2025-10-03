import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { ActualPaycheck } from './actual-paycheck';

interface PaycheckGeneratorProps {
  settings: any;
  employee: any;
  paycheck: any;
}

export function PaycheckGenerator({ settings, employee, paycheck }: PaycheckGeneratorProps) {
  // Transform paycheck data to match ActualPaycheck interface
  const transformedPaycheck = {
    ...paycheck,
    employee: {
      ...employee,
      address: employee.address || '',
      phone: employee.phone || '',
      ssn: employee.ssn,
      employeeNumber: employee.employeeNumber,
    },
    payPeriod: {
      startDate: paycheck.payPeriodStart || paycheck.payPeriod?.startDate || '',
      endDate: paycheck.payPeriodEnd || paycheck.payPeriod?.endDate || '',
    },
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
          <div className="text-sm text-muted-foreground mb-4">
            Layout: <span className="font-semibold capitalize">{settings?.paycheckLayout?.replace('_', ' ') || 'Check On Top'}</span>
          </div>
          {/* Use ActualPaycheck component for consistent rendering */}
          <ActualPaycheck paycheck={transformedPaycheck} settings={settings} />
        </div>
      </CardContent>
    </Card>
  );
}
