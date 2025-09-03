import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/contexts/LocationContext';
import { Calendar, Plus, Download, DollarSign, Users, Clock, TrendingUp, FileText, Eye, Check, Calculator, Printer, Mail } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';

interface PayrollPeriod {
  id: string;
  locationId: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: string;
  totalGrossPay: string;
  totalNetPay: string;
  totalDeductions: string;
  createdBy: string;
  createdAt: string;
}

interface Paycheck {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  checkNumber?: string;
  regularHours: string;
  overtimeHours: string;
  hourlyRate: string;
  regularPay: string;
  overtimePay: string;
  grossPay: string;
  federalTax: string;
  stateTax: string;
  socialSecurity: string;
  medicare: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
  status: string;
  issuedAt?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    hourlyWage: string;
  };
}

export default function HRPayroll() {
  // Patriot Software 3-step workflow state
  const [currentStep, setCurrentStep] = useState<'setup' | 'hours' | 'review' | 'finalize'>('setup');
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayrollPeriod | null>(null);
  const [payrollData, setPayrollData] = useState<Record<string, any>>({});
  
  // Dialog states
  const [showCreatePeriodDialog, setShowCreatePeriodDialog] = useState(false);
  const [showPaystubDialog, setShowPaystubDialog] = useState(false);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // Form state
  const [payPeriodForm, setPayPeriodForm] = useState({
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    payDate: format(addDays(endOfWeek(new Date(), { weekStartsOn: 1 }), 3), 'yyyy-MM-dd'),
    frequency: 'biweekly'
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentLocation } = useLocation();

  // Fetch payroll periods
  const { data: payrollPeriods = [], isLoading: periodsLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ['/api/payroll-periods', currentLocation?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/payroll-periods?locationId=${currentLocation?.id}`);
      return response.json();
    },
    enabled: !!currentLocation,
  });

  // Fetch paychecks for selected period
  const { data: paychecks = [], isLoading: paychecksLoading } = useQuery<Paycheck[]>({
    queryKey: ['/api/payroll-periods', selectedPayPeriod?.id, 'paychecks'],
    queryFn: async () => {
      if (!selectedPayPeriod?.id) return [];
      const response = await apiRequest('GET', `/api/payroll-periods/${selectedPayPeriod.id}/paychecks`);
      return response.json();
    },
    enabled: !!selectedPayPeriod?.id,
  });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ['/api/employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employees');
      return response.json();
    },
  });

  // Create pay period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: any) => {
      const periodData = {
        locationId: currentLocation?.id,
        startDate: data.startDate,
        endDate: data.endDate,
        payDate: data.payDate,
      };
      const response = await apiRequest('POST', '/api/payroll-periods', { body: periodData });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setShowCreatePeriodDialog(false);
      setPayPeriodForm({
        startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        payDate: format(addDays(endOfWeek(new Date(), { weekStartsOn: 1 }), 3), 'yyyy-MM-dd'),
        frequency: 'biweekly'
      });
      toast({
        title: "Pay Period Created",
        description: "New pay period has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create pay period",
        variant: "destructive",
      });
    },
  });

  // Process payroll mutation (calculate for all employees)
  const processPayrollMutation = useMutation({
    mutationFn: async (payPeriodId: string) => {
      // Calculate payroll for all employees in the period
      const paycheckPromises = employees.map(async (employee) => {
        // Get time entries for this employee in the pay period
        const timeResponse = await apiRequest('GET', 
          `/api/employees/${employee.id}/time-entries?startDate=${selectedPayPeriod?.startDate}&endDate=${selectedPayPeriod?.endDate}`
        );
        const timeEntries = await timeResponse.json();

        // Calculate total hours from time entries
        const totalHours = timeEntries.reduce((sum: number, entry: any) => {
          const hours = parseFloat(entry.totalHours || '0');
          return sum + hours;
        }, 0);
        
        // Determine overtime threshold based on pay frequency
        let overtimeThreshold = 40; // Default weekly/biweekly threshold
        if (selectedPayPeriod?.frequency === 'monthly') {
          overtimeThreshold = 173; // ~40 hours/week * 4.33 weeks/month
        } else if (selectedPayPeriod?.frequency === 'weekly') {
          overtimeThreshold = 40;
        }
        
        let regularHours = totalHours;
        let overtimeHours = 0;
        let regularPay = 0;
        let overtimePay = 0;
        let grossPay = 0;

        // Handle salary vs hourly employees
        if (employee.salary && selectedPayPeriod?.frequency === 'salary') {
          // Salaried employee - calculate based on annual salary
          const annualSalary = parseFloat(employee.salary);
          grossPay = annualSalary / 26; // Biweekly salary amount
          regularPay = grossPay;
          regularHours = 80; // Standard biweekly hours for salary
        } else {
          // Hourly employee - calculate based on hours worked
          const hourlyRate = parseFloat(employee.hourlyRate || '15.00');
          
          if (totalHours > overtimeThreshold) {
            regularHours = overtimeThreshold;
            overtimeHours = totalHours - overtimeThreshold;
          }
          
          regularPay = regularHours * hourlyRate;
          overtimePay = overtimeHours * hourlyRate * 1.5;
          grossPay = regularPay + overtimePay;
        }

        // Calculate deductions using South Carolina 2025 tax rates
        const federalTax = grossPay * 0.12; // 12% federal (standard bracket for most restaurant workers)
        const stateTax = grossPay * 0.05; // 5% SC state tax (average of 3% and 6.2% brackets)
        const socialSecurity = grossPay * 0.062; // 6.2% Social Security (mandatory)
        const medicare = grossPay * 0.0145; // 1.45% Medicare (mandatory)
        const scUnemployment = grossPay * 0.006; // 0.6% SC unemployment (employer portion estimated)
        const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
        const netPay = grossPay - totalDeductions;

        const paycheckData = {
          payrollPeriodId,
          employeeId: employee.id,
          checkNumber: `${employee.id.slice(-4)}-${format(new Date(), 'yyMMdd')}`,
          regularHours: regularHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          hourlyRate: hourlyRate.toFixed(2),
          regularPay: regularPay.toFixed(2),
          overtimePay: overtimePay.toFixed(2),
          grossPay: grossPay.toFixed(2),
          federalTax: federalTax.toFixed(2),
          stateTax: stateTax.toFixed(2),
          socialSecurity: socialSecurity.toFixed(2),
          medicare: medicare.toFixed(2),
          otherDeductions: '0.00',
          totalDeductions: totalDeductions.toFixed(2),
          netPay: netPay.toFixed(2),
          status: 'pending'
        };

        return apiRequest('POST', '/api/paychecks', { body: paycheckData });
      });

      await Promise.all(paycheckPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods', selectedPayPeriod?.id, 'paychecks'] });
      toast({
        title: "Payroll Processed",
        description: "Payroll has been calculated for all employees.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process payroll",
        variant: "destructive",
      });
    },
  });

  const generatePayStubSheet = (paychecks: Paycheck[]) => {
    let content = '';
    const chunks = [];
    
    // Group paychecks into chunks of 3 for 3-per-page template
    for (let i = 0; i < paychecks.length; i += 3) {
      chunks.push(paychecks.slice(i, i + 3));
    }

    chunks.forEach((chunk, pageIndex) => {
      if (pageIndex > 0) content += '\\n\\n--- PAGE BREAK ---\\n\\n';
      
      content += `╔═══════════════════════════════════════════════════════════════════════════════╗
║                           ${currentLocation?.name?.toUpperCase() || 'COMPANY NAME'}                            ║
║                                PAYROLL STUBS                                  ║
║                         Pay Period: ${selectedPayPeriod ? format(new Date(selectedPayPeriod.startDate), 'MM/dd/yyyy') : ''} - ${selectedPayPeriod ? format(new Date(selectedPayPeriod.endDate), 'MM/dd/yyyy') : ''}                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

`;

      chunk.forEach((paycheck, index) => {
        const employee = paycheck.employee;
        content += `
┌─────────────────────────────────────────────────────────────────────────────┐
│ EMPLOYEE: ${(employee.firstName + ' ' + employee.lastName).padEnd(25)} CHECK #: ${(paycheck.checkNumber || 'N/A').padEnd(12)} │
│ PAY DATE: ${selectedPayPeriod ? format(new Date(selectedPayPeriod.payDate), 'MM/dd/yyyy').padEnd(25) : ''.padEnd(25)} PERIOD: ${selectedPayPeriod ? format(new Date(selectedPayPeriod.startDate), 'MM/dd') + ' - ' + format(new Date(selectedPayPeriod.endDate), 'MM/dd') : ''.padEnd(12)} │
├─────────────────────────────────────────────────────────────────────────────┤
│                               EARNINGS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Regular Hours:    ${parseFloat(paycheck.regularHours).toFixed(2).padStart(8)} @ $${parseFloat(paycheck.hourlyRate).toFixed(2).padStart(6)} = $${parseFloat(paycheck.regularPay).toFixed(2).padStart(8)} │
│ Overtime Hours:   ${parseFloat(paycheck.overtimeHours).toFixed(2).padStart(8)} @ $${(parseFloat(paycheck.hourlyRate) * 1.5).toFixed(2).padStart(6)} = $${parseFloat(paycheck.overtimePay).toFixed(2).padStart(8)} │
│                                                                             │
│ GROSS PAY:                                                $${parseFloat(paycheck.grossPay).toFixed(2).padStart(10)} │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DEDUCTIONS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Federal Tax:                                              $${parseFloat(paycheck.federalTax).toFixed(2).padStart(10)} │
│ State Tax:                                                $${parseFloat(paycheck.stateTax).toFixed(2).padStart(10)} │
│ Social Security:                                          $${parseFloat(paycheck.socialSecurity).toFixed(2).padStart(10)} │
│ Medicare:                                                 $${parseFloat(paycheck.medicare).toFixed(2).padStart(10)} │
│ Other Deductions:                                         $${parseFloat(paycheck.otherDeductions).toFixed(2).padStart(10)} │
│                                                                             │
│ TOTAL DEDUCTIONS:                                         $${parseFloat(paycheck.totalDeductions).toFixed(2).padStart(10)} │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ NET PAY:                                                  $${parseFloat(paycheck.netPay).toFixed(2).padStart(10)} │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

`;
        
        // Add spacing between paystubs on the same page
        if (index < chunk.length - 1) {
          content += '\\n';
        }
      });
    });

    return content;
  };

  const handlePrintPayStubs = () => {
    const content = generatePayStubSheet(paychecks);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Pay Stubs - ${selectedPayPeriod ? format(new Date(selectedPayPeriod.startDate), 'MM/dd/yyyy') : ''}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 10px; 
                margin: 0.5in; 
                white-space: pre-wrap;
                line-height: 1.2;
              }
              @media print {
                body { margin: 0.25in; }
                .page-break { page-break-before: always; }
              }
            </style>
          </head>
          <body>${content.replace(/--- PAGE BREAK ---/g, '<div class="page-break"></div>')}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'processed': return 'bg-blue-500';
      case 'calculated': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  // Helper calculation functions for Patriot-style payroll
  const calculateGrossPay = (employee: any, data: any = {}) => {
    const regularHours = parseFloat(data.regularHours || '0');
    const overtimeHours = parseFloat(data.overtimeHours || '0');
    const bonus = parseFloat(data.bonus || '0');
    const hourlyRate = parseFloat(employee.hourlyRate || employee.hourlyWage || '15.00');
    
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    
    return regularPay + overtimePay + bonus;
  };

  const calculateDeductions = (grossPay: number) => {
    const federalTax = grossPay * 0.12;
    const stateTax = grossPay * 0.05;
    const socialSecurity = grossPay * 0.062;
    const medicare = grossPay * 0.0145;
    
    return {
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      total: federalTax + stateTax + socialSecurity + medicare
    };
  };

  const getTotalGrossPay = () => {
    return employees.reduce((total, employee) => {
      return total + calculateGrossPay(employee, payrollData[employee.id] || {});
    }, 0);
  };

  const getTotalDeductions = () => {
    return employees.reduce((total, employee) => {
      const grossPay = calculateGrossPay(employee, payrollData[employee.id] || {});
      return total + calculateDeductions(grossPay).total;
    }, 0);
  };

  const getTotalNetPay = () => {
    return getTotalGrossPay() - getTotalDeductions();
  };

  // Import hours from time clock mutation
  const importHoursMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayPeriod) throw new Error('No pay period selected');
      const response = await apiRequest('GET', `/api/payroll-periods/${selectedPayPeriod.id}/calculated-hours`);
      return response.json();
    },
    onSuccess: (calculatedHours: any[]) => {
      const newPayrollData: { [key: string]: any } = {};
      
      calculatedHours.forEach((emp) => {
        newPayrollData[emp.employeeId] = {
          regularHours: emp.regularHours.toString(),
          overtimeHours: emp.overtimeHours.toString(),
          bonus: '0'
        };
      });
      
      setPayrollData(newPayrollData);
      toast({
        title: "Hours Imported Successfully",
        description: `Imported timesheet data for ${calculatedHours.length} employees from time clock system.`,
      });
    },
    onError: (error: any) => {
      console.error('Error importing hours:', error);
      toast({
        title: "Import Failed",
        description: "Could not import hours from time clock. Please check if employees have time entries for this pay period.",
        variant: "destructive"
      });
    }
  });

  const handleImportHoursFromTimeClock = () => {
    importHoursMutation.mutate();
  };

  if (periodsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Patriot Software-style step renderer
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'setup':
        return renderPayrollSetup();
      case 'hours':
        return renderEnterHours();
      case 'review':
        return renderReviewApprove();
      case 'finalize':
        return renderFinalizePayment();
      default:
        return renderPayrollSetup();
    }
  };

  const renderPayrollSetup = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to Run Payroll?</h2>
        <p className="text-muted-foreground mb-6">Select or create a pay period to get started</p>
        
        <Button 
          size="lg" 
          className="text-lg px-8 py-4 h-auto"
          onClick={() => {
            if (payrollPeriods.length === 0) {
              setShowCreatePeriodDialog(true);
            } else {
              setCurrentStep('hours');
            }
          }}
          data-testid="button-run-payroll"
        >
          <Calculator className="h-5 w-5 mr-2" />
          Run Payroll
        </Button>
      </div>

      {/* Existing Pay Periods */}
      {payrollPeriods.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Pay Periods</h3>
          <div className="grid gap-4">
            {payrollPeriods.slice(0, 3).map((period) => (
              <Card 
                key={period.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedPayPeriod(period);
                  setCurrentStep('hours');
                }}
                data-testid={`period-card-${period.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{period.name || `${period.frequency} Period`}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(period.startDate), 'MMM dd')} - {format(new Date(period.endDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={period.status === 'paid' ? 'default' : 'secondary'}>
                        {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                      </Badge>
                      <p className="text-lg font-bold mt-1">{formatCurrency(period.totalNetPay || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderEnterHours = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 1: Enter Hours & Money</h2>
          <p className="text-muted-foreground">
            {selectedPayPeriod ? 
              `${selectedPayPeriod.name} - Pay Date: ${format(new Date(selectedPayPeriod.payDate), 'MMM dd, yyyy')}` :
              'Enter employee hours and additional payments'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('setup')}>
            Back
          </Button>
          <Button 
            variant="outline" 
            onClick={handleImportHoursFromTimeClock}
            disabled={!selectedPayPeriod}
            data-testid="button-import-hours"
          >
            <Clock className="h-4 w-4 mr-2" />
            Import Hours from Time Clock
          </Button>
          <Button onClick={() => setCurrentStep('review')} data-testid="button-proceed-review">
            Review & Approve
          </Button>
        </div>
      </div>

      {/* Employee Hours Entry */}
      <div className="grid gap-4">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="col-span-2">
                  <h4 className="font-semibold">{employee.firstName} {employee.lastName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {employee.departmentName || 'General'} • ${employee.hourlyWage || '15.00'}/hr
                  </p>
                </div>
                <div>
                  <Label htmlFor={`regular-${employee.id}`}>Regular Hours</Label>
                  <Input 
                    id={`regular-${employee.id}`}
                    type="number" 
                    step="0.25"
                    placeholder="40.00"
                    value={payrollData[employee.id]?.regularHours || ''}
                    onChange={(e) => setPayrollData(prev => ({
                      ...prev,
                      [employee.id]: { ...prev[employee.id], regularHours: e.target.value }
                    }))}
                    data-testid={`input-regular-hours-${employee.id}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`overtime-${employee.id}`}>Overtime Hours</Label>
                  <Input 
                    id={`overtime-${employee.id}`}
                    type="number" 
                    step="0.25"
                    placeholder="0.00"
                    value={payrollData[employee.id]?.overtimeHours || ''}
                    onChange={(e) => setPayrollData(prev => ({
                      ...prev,
                      [employee.id]: { ...prev[employee.id], overtimeHours: e.target.value }
                    }))}
                    data-testid={`input-overtime-hours-${employee.id}`}
                  />
                </div>
                <div>
                  <Label htmlFor={`bonus-${employee.id}`}>Tips/Bonus</Label>
                  <Input 
                    id={`bonus-${employee.id}`}
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={payrollData[employee.id]?.bonus || ''}
                    onChange={(e) => setPayrollData(prev => ({
                      ...prev,
                      [employee.id]: { ...prev[employee.id], bonus: e.target.value }
                    }))}
                    data-testid={`input-bonus-${employee.id}`}
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Gross Pay</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(calculateGrossPay(employee, payrollData[employee.id] || {}))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderReviewApprove = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 2: Review & Approve</h2>
          <p className="text-muted-foreground">Review calculations and approve payroll for processing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('hours')}>
            Back to Hours
          </Button>
          <Button onClick={() => setCurrentStep('finalize')} data-testid="button-approve-payroll">
            Approve Payroll
          </Button>
        </div>
      </div>

      {/* Payroll Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{employees.length}</p>
            <p className="text-sm text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalGrossPay())}
            </p>
            <p className="text-sm text-muted-foreground">Gross Pay</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(getTotalDeductions())}
            </p>
            <p className="text-sm text-muted-foreground">Total Deductions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(getTotalNetPay())}
            </p>
            <p className="text-sm text-muted-foreground">Net Pay</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Review List */}
      <div className="space-y-2">
        {employees.map((employee) => {
          const employeeData = payrollData[employee.id] || {};
          const grossPay = calculateGrossPay(employee, employeeData);
          const deductions = calculateDeductions(grossPay);
          const netPay = grossPay - deductions.total;
          
          return (
            <Card key={employee.id}>
              <CardContent className="p-4">
                <div className="grid grid-cols-6 gap-4 items-center">
                  <div>
                    <h4 className="font-semibold">{employee.firstName} {employee.lastName}</h4>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{(parseFloat(employeeData.regularHours || '0') + parseFloat(employeeData.overtimeHours || '0')).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{formatCurrency(grossPay)}</p>
                    <p className="text-xs text-muted-foreground">Gross</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-red-600">{formatCurrency(deductions.total)}</p>
                    <p className="text-xs text-muted-foreground">Deductions</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-green-600">{formatCurrency(netPay)}</p>
                    <p className="text-xs text-muted-foreground">Net Pay</p>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline">Ready</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderFinalizePayment = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Step 3: Finalize Payment</h2>
          <p className="text-muted-foreground">Process direct deposits and print checks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('review')}>
            Back to Review
          </Button>
          <Button 
            onClick={() => {
              processPayrollMutation.mutate(selectedPayPeriod?.id || '');
              setCurrentStep('setup');
            }}
            disabled={processPayrollMutation.isPending}
            data-testid="button-finalize-payroll"
          >
            {processPayrollMutation.isPending ? 'Processing...' : 'Finalize Payroll'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Direct Deposit</CardTitle>
            <CardDescription>Automatic bank transfers (recommended)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Employees with Direct Deposit:</span>
                <span className="font-semibold">{employees.filter(e => e.directDeposit).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(getTotalNetPay())}</span>
              </div>
              <Button className="w-full" disabled>
                <Check className="h-4 w-4 mr-2" />
                Ready for Processing
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Print Checks</CardTitle>
            <CardDescription>For employees without direct deposit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Check Recipients:</span>
                <span className="font-semibold">{employees.filter(e => !e.directDeposit).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(0)}</span>
              </div>
              <Button variant="outline" className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                Print Checks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6" data-testid="hr-payroll-page">
      {/* Patriot-style Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Payroll Processing</h1>
          <p className="text-muted-foreground">Professional payroll management powered by Patriot Software methodology</p>
        </div>
        
        {currentStep !== 'setup' && (
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep === 'hours' ? 'text-blue-600 font-semibold' : currentStep === 'review' || currentStep === 'finalize' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
                currentStep === 'hours' ? 'border-blue-600 bg-blue-100' :
                currentStep === 'review' || currentStep === 'finalize' ? 'border-green-600 bg-green-100' :
                'border-gray-300'
              }`}>1</div>
              <span>Hours & Money</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${currentStep === 'review' ? 'text-blue-600 font-semibold' : currentStep === 'finalize' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
                currentStep === 'review' ? 'border-blue-600 bg-blue-100' :
                currentStep === 'finalize' ? 'border-green-600 bg-green-100' :
                'border-gray-300'
              }`}>2</div>
              <span>Review & Approve</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${currentStep === 'finalize' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
                currentStep === 'finalize' ? 'border-blue-600 bg-blue-100' : 'border-gray-300'
              }`}>3</div>
              <span>Finalize Payment</span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Content Based on Current Step */}
      {renderCurrentStep()}

      {/* Payroll Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-employees">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pay-periods">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pay Periods</p>
                <p className="text-2xl font-bold">{payrollPeriods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-payroll">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Payroll</p>
                <p className="text-2xl font-bold">
                  {payrollPeriods.filter(p => p.status === 'draft').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-payroll">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    payrollPeriods.reduce((sum, p) => sum + parseFloat(p.totalNetPay || '0'), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pay-periods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pay-periods" data-testid="tab-pay-periods">Pay Periods</TabsTrigger>
          <TabsTrigger value="paychecks" data-testid="tab-paychecks">Paychecks</TabsTrigger>
        </TabsList>

        <TabsContent value="pay-periods" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pay Periods</h2>
          </div>

          <div className="grid gap-4">
            {payrollPeriods.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Pay Periods</h3>
                  <p className="text-muted-foreground mb-4">Create your first pay period to start processing payroll.</p>
                  <Button onClick={() => setShowCreatePeriodDialog(true)} data-testid="button-create-first-period">
                    Create Pay Period
                  </Button>
                </CardContent>
              </Card>
            ) : (
              payrollPeriods.map((period: PayrollPeriod) => (
                <Card 
                  key={period.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedPayPeriod?.id === period.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedPayPeriod(period)}
                  data-testid={`pay-period-card-${period.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          Pay Period: {format(new Date(period.startDate), 'MMM dd')} - {format(new Date(period.endDate), 'MMM dd, yyyy')}
                        </h3>
                        <p className="text-muted-foreground">
                          Pay Date: {format(new Date(period.payDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(period.status)}`} />
                          <Badge variant={period.status === 'paid' ? 'default' : 'secondary'}>
                            {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(period.totalNetPay || 0)}</div>
                        <div className="text-sm text-muted-foreground">Net Pay</div>
                      </div>
                    </div>

                    {period.status === 'draft' && (
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayPeriod(period);
                            processPayrollMutation.mutate(period.id);
                          }}
                          disabled={processPayrollMutation.isPending}
                          data-testid={`button-process-${period.id}`}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Process Payroll
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="paychecks" className="space-y-4">
          {selectedPayPeriod ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Paychecks - {format(new Date(selectedPayPeriod.startDate), 'MMM dd')} - {format(new Date(selectedPayPeriod.endDate), 'MMM dd, yyyy')}
                </h2>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePrintPayStubs}
                    disabled={paychecks.length === 0}
                    data-testid="button-print-paystubs"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Pay Stubs (3 per page)
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={paychecks.length === 0}
                    data-testid="button-download-paystubs"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                </div>
              </div>

              {paychecksLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {paychecks.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Paychecks Generated</h3>
                        <p className="text-muted-foreground">Process payroll first to generate paychecks for employees.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    paychecks.map((paycheck: Paycheck) => (
                      <Card key={paycheck.id} data-testid={`paycheck-card-${paycheck.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">
                                {paycheck.employee.firstName} {paycheck.employee.lastName}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                Check #{paycheck.checkNumber}
                              </p>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Regular Hours:</span>
                                  <div className="font-medium">{parseFloat(paycheck.regularHours).toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Overtime Hours:</span>
                                  <div className="font-medium">{parseFloat(paycheck.overtimeHours).toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Gross Pay:</span>
                                  <div className="font-medium">{formatCurrency(paycheck.grossPay)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Net Pay:</span>
                                  <div className="font-bold text-green-600">{formatCurrency(paycheck.netPay)}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant={paycheck.status === 'issued' ? 'default' : 'secondary'}>
                                {paycheck.status.charAt(0).toUpperCase() + paycheck.status.slice(1)}
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedPaycheck(paycheck);
                                  setShowPaystubDialog(true);
                                }}
                                data-testid={`button-view-paycheck-${paycheck.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Pay Period</h3>
                <p className="text-muted-foreground">Choose a pay period from the Pay Periods tab to view paychecks.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Pay Period Dialog */}
      <Dialog open={showCreatePeriodDialog} onOpenChange={setShowCreatePeriodDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Pay Period</DialogTitle>
            <DialogDescription>
              Set up a new pay period for processing payroll.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={payPeriodForm.startDate}
                onChange={(e) => setPayPeriodForm(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={payPeriodForm.endDate}
                onChange={(e) => setPayPeriodForm(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
            
            <div>
              <Label htmlFor="payDate">Pay Date</Label>
              <Input
                id="payDate"
                type="date"
                value={payPeriodForm.payDate}
                onChange={(e) => setPayPeriodForm(prev => ({ ...prev, payDate: e.target.value }))}
                data-testid="input-pay-date"
              />
            </div>
            
            <div>
              <Label htmlFor="frequency">Pay Frequency</Label>
              <Select value={payPeriodForm.frequency} onValueChange={(value) => setPayPeriodForm(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue placeholder="Select pay frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="salary">Salary (Annual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePeriodDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createPeriodMutation.mutate(payPeriodForm)}
              disabled={createPeriodMutation.isPending}
              data-testid="button-create-period-confirm"
            >
              {createPeriodMutation.isPending ? "Creating..." : "Create Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paycheck Details Dialog */}
      <Dialog open={showPaystubDialog} onOpenChange={setShowPaystubDialog}>
        <DialogContent className="max-w-2xl">
          {selectedPaycheck && (
            <>
              <DialogHeader>
                <DialogTitle>Pay Stub Details</DialogTitle>
                <DialogDescription>
                  {selectedPaycheck.employee.firstName} {selectedPaycheck.employee.lastName} - Check #{selectedPaycheck.checkNumber}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Earnings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Regular Hours ({parseFloat(selectedPaycheck.regularHours).toFixed(2)} @ {formatCurrency(selectedPaycheck.hourlyRate)}):</span>
                        <span>{formatCurrency(selectedPaycheck.regularPay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime Hours ({parseFloat(selectedPaycheck.overtimeHours).toFixed(2)} @ {formatCurrency(parseFloat(selectedPaycheck.hourlyRate) * 1.5)}):</span>
                        <span>{formatCurrency(selectedPaycheck.overtimePay)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Gross Pay:</span>
                        <span>{formatCurrency(selectedPaycheck.grossPay)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Deductions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Federal Tax:</span>
                        <span>{formatCurrency(selectedPaycheck.federalTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>State Tax:</span>
                        <span>{formatCurrency(selectedPaycheck.stateTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Social Security:</span>
                        <span>{formatCurrency(selectedPaycheck.socialSecurity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medicare:</span>
                        <span>{formatCurrency(selectedPaycheck.medicare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other:</span>
                        <span>{formatCurrency(selectedPaycheck.otherDeductions)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Deductions:</span>
                        <span>{formatCurrency(selectedPaycheck.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />
                
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    Net Pay: {formatCurrency(selectedPaycheck.netPay)}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}