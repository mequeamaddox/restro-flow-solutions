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
import { Calendar, Plus, DollarSign, Users, Clock, Calculator, Eye, CheckCircle, AlertCircle, FileText, Printer } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ActualPaycheck } from '@/components/payroll/actual-paycheck';

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
  totalGrossPay: string;
  totalNetPay: string;
  totalDeductions: string;
  frequency: string;
  locationId: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface Paystub {
  id: string;
  payPeriodId: string;
  employeeId: string;
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
  checkNumber: string;
  payDate: string;
  status: 'draft' | 'calculated' | 'paid';
  bonuses?: string;
  tips?: string;
  notes?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    phone: string;
  };
}

type WorkflowStep = 'setup' | 'calculate' | 'review' | 'approve';

export default function HRPayroll() {
  // Patriot Software 3-Step Workflow State
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('setup');
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  
  // Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaystubDialog, setShowPaystubDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showManualPayrollDialog, setShowManualPayrollDialog] = useState(false);
  const [editingPaystub, setEditingPaystub] = useState<Paystub | null>(null);
  
  // Form State
  const [newPeriodForm, setNewPeriodForm] = useState({
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    payDate: format(addDays(endOfWeek(new Date(), { weekStartsOn: 1 }), 3), 'yyyy-MM-dd'),
    frequency: 'weekly'
  });
  
  const [manualPayrollForm, setManualPayrollForm] = useState({
    employeeId: '',
    regularHours: '',
    overtimeHours: '',
    regularRate: '',
    bonuses: '',
    tips: '',
    customDeductions: '',
    notes: ''
  });

  // Bulk Payroll Real-time Calculation State
  const [bulkPayrollInputs, setBulkPayrollInputs] = useState<Record<string, {
    hours: string;
    tips: string;
    bonus: string;
    overtime: string;
    deduction: string;
    notes: string;
  }>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentLocation } = useLocation();

  // Helper function to calculate gross pay for real-time display
  const calculateEmployeeGrossPay = (employee: any, inputs: any) => {
    const hours = parseFloat(inputs.hours || '0');
    const tips = parseFloat(inputs.tips || '0');
    const bonus = parseFloat(inputs.bonus || '0');
    const overtime = parseFloat(inputs.overtime || '0');
    const deduction = parseFloat(inputs.deduction || '0');
    const hourlyRate = parseFloat(employee.hourlyRate || '0');

    const regularPay = hours * hourlyRate;
    const overtimePay = overtime * hourlyRate * 1.5; // 1.5x for overtime
    const grossPay = regularPay + overtimePay + tips + bonus - deduction;

    return Math.max(0, grossPay);
  };

  // Handler for bulk payroll input changes
  const handleBulkInputChange = (employeeId: string, field: string, value: string) => {
    setBulkPayrollInputs(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  // Fetch payroll periods
  const { data: periods = [], isLoading: periodsLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ['/api/payroll-periods', currentLocation?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/payroll-periods?locationId=${currentLocation?.id}`);
      return response.json();
    },
    enabled: !!currentLocation,
  });

  // Fetch paystubs for selected period
  const { data: paystubs = [], isLoading: paystubsLoading } = useQuery<Paystub[]>({
    queryKey: ['/api/payroll-periods', selectedPeriod?.id, 'paychecks'],
    queryFn: async () => {
      if (!selectedPeriod?.id) return [];
      const response = await apiRequest('GET', `/api/payroll-periods/${selectedPeriod.id}/paychecks`);
      return response.json();
    },
    enabled: !!selectedPeriod?.id,
  });

  // Fetch employees for manual entry
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/hr/employees'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/hr/employees');
      return response.json();
    },
  });

  // Get paycheck settings
  const { data: settings } = useQuery({
    queryKey: ['/api/payroll/paycheck-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payroll/paycheck-settings');
      return response.json();
    },
  });

  // Create payroll period
  const createPeriodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/payroll-periods', { body: data });
      return response.json();
    },
    onSuccess: (newPeriod) => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setSelectedPeriod(newPeriod);
      setCurrentStep('calculate');
      setShowCreateDialog(false);
      toast({ 
        title: "Pay Period Created", 
        description: `${newPeriod.name} created successfully. Ready for payroll calculation.` 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create pay period", 
        variant: "destructive" 
      });
    },
  });

  // Calculate payroll (Patriot Software Step 2)
  const calculatePayrollMutation = useMutation({
    mutationFn: async (periodId: string) => {
      const response = await apiRequest('POST', `/api/hr/payroll/pay-periods/${periodId}/calculate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods', selectedPeriod?.id, 'paychecks'] });
      setCurrentStep('review');
      toast({ 
        title: "Payroll Calculated", 
        description: "All employee paychecks calculated and saved successfully." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Calculation Failed", 
        description: error.message || "Failed to calculate payroll", 
        variant: "destructive" 
      });
    },
  });

  // Approve payroll (Patriot Software Step 3)
  const approvePayrollMutation = useMutation({
    mutationFn: async ({ periodId, notes }: { periodId: string; notes?: string }) => {
      const response = await apiRequest('POST', `/api/hr/payroll/pay-periods/${periodId}/approve`, { 
        body: { notes } 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setCurrentStep('setup');
      setSelectedPeriod(null);
      setShowApprovalDialog(false);
      toast({ 
        title: "Payroll Approved", 
        description: "Payroll has been approved and is ready for payment processing." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Approval Failed", 
        description: error.message || "Failed to approve payroll", 
        variant: "destructive" 
      });
    },
  });

  // Manual payroll entry
  const createManualPayrollMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/payroll-periods/${selectedPeriod?.id}/manual-paycheck`, { 
        body: data 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods', selectedPeriod?.id, 'paychecks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setShowManualPayrollDialog(false);
      resetManualForm();
      toast({ 
        title: "Manual Paycheck Created", 
        description: "Manual paycheck entry has been saved successfully." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Create", 
        description: error.message || "Failed to create manual paycheck", 
        variant: "destructive" 
      });
    },
  });

  // Update existing paycheck
  const updatePaycheckMutation = useMutation({
    mutationFn: async ({ paycheckId, data }: { paycheckId: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/paychecks/${paycheckId}`, { 
        body: data 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods', selectedPeriod?.id, 'paychecks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setEditingPaystub(null);
      toast({ 
        title: "Paycheck Updated", 
        description: "Paycheck has been updated successfully." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Update Failed", 
        description: error.message || "Failed to update paycheck", 
        variant: "destructive" 
      });
    },
  });

  const handleCreatePeriod = () => {
    createPeriodMutation.mutate({
      ...newPeriodForm,
      locationId: currentLocation?.id
    });
  };

  const resetManualForm = () => {
    setManualPayrollForm({
      employeeId: '',
      regularHours: '',
      overtimeHours: '',
      regularRate: '',
      bonuses: '',
      tips: '',
      customDeductions: '',
      notes: ''
    });
  };

  const handleCreateManualPayroll = () => {
    createManualPayrollMutation.mutate(manualPayrollForm);
  };

  const handleBulkManualPayroll = () => {
    const employeeEntries = employees.filter((emp: any) => emp.status === 'active').map((employee: any) => {
      const inputs = bulkPayrollInputs[employee.id] || {};
      
      return {
        employeeId: employee.id,
        regularHours: inputs.hours || '',
        overtimeHours: inputs.overtime || '',
        regularRate: employee.hourlyRate || '',
        bonuses: inputs.bonus || '',
        tips: inputs.tips || '',
        customDeductions: inputs.deduction || '',
        notes: inputs.notes || ''
      };
    });

    // Process each employee's payroll entry
    employeeEntries.forEach(entry => {
      if (entry.regularHours || entry.tips || entry.bonuses || entry.overtimeHours || entry.customDeductions || entry.notes) {
        createManualPayrollMutation.mutate(entry);
      }
    });

    setShowManualPayrollDialog(false);
    setBulkPayrollInputs({}); // Clear all inputs after processing
  };

  const handleEditPaystub = (paystub: Paystub) => {
    setEditingPaystub(paystub);
    setManualPayrollForm({
      employeeId: paystub.employeeId,
      regularHours: paystub.regularHours,
      overtimeHours: paystub.overtimeHours,
      regularRate: paystub.regularRate,
      bonuses: paystub.bonuses || '0',
      tips: paystub.tips || '0',
      customDeductions: '0',
      notes: paystub.notes || ''
    });
  };

  const handleSelectPeriod = (period: PayrollPeriod) => {
    setSelectedPeriod(period);
    if (period.status === 'draft') {
      setCurrentStep('calculate');
    } else if (period.status === 'calculated') {
      setCurrentStep('review');
    } else {
      setCurrentStep('approve');
    }
  };

  const getStepStatus = (step: WorkflowStep) => {
    const stepOrder: WorkflowStep[] = ['setup', 'calculate', 'review', 'approve'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  // Calculate totals for display
  const periodTotals = paystubs.reduce((totals, paystub) => ({
    grossPay: totals.grossPay + parseFloat(paystub.grossPay || '0'),
    deductions: totals.deductions + parseFloat(paystub.totalDeductions || '0'),
    netPay: totals.netPay + parseFloat(paystub.netPay || '0')
  }), { grossPay: 0, deductions: 0, netPay: 0 });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Professional payroll processing like Patriot Software</p>
        </div>
        {currentStep === 'setup' && (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2" size="lg">
            <Plus className="w-4 h-4" />
            New Pay Period
          </Button>
        )}
      </div>

      {/* Patriot Software 3-Step Progress */}
      {selectedPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Payroll Processing: {selectedPeriod.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              {(['setup', 'calculate', 'review', 'approve'] as WorkflowStep[]).map((step, index) => {
                const status = getStepStatus(step);
                const stepLabels = {
                  setup: 'Setup Period',
                  calculate: 'Calculate Payroll',
                  review: 'Review & Verify',
                  approve: 'Approve & Finalize'
                };
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                      status === 'current' ? 'bg-blue-500 border-blue-500 text-white' :
                      'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : index + 1}
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className={`text-sm font-medium ${
                        status === 'current' ? 'text-blue-600' : 
                        status === 'completed' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {stepLabels[step]}
                      </p>
                    </div>
                    {index < 3 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Actions */}
            <div className="flex gap-4">
              {currentStep === 'calculate' && (
                <>
                  <Button 
                    onClick={() => calculatePayrollMutation.mutate(selectedPeriod.id)}
                    disabled={calculatePayrollMutation.isPending}
                    size="lg"
                    className="gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    {calculatePayrollMutation.isPending ? 'Calculating...' : 'Calculate Payroll'}
                  </Button>
                  <Button 
                    onClick={() => setShowManualPayrollDialog(true)}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Manual Entry
                  </Button>
                </>
              )}
              
              {currentStep === 'review' && paystubs.length > 0 && (
                <div className="flex gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Payroll Calculated</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {paystubs.length} paychecks • ${periodTotals.netPay.toFixed(2)} total net pay
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowApprovalDialog(true)}
                    size="lg"
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Approve Payroll
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={currentStep === 'setup' ? 'periods' : 'current'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="periods" onClick={() => { setCurrentStep('setup'); setSelectedPeriod(null); }}>
            Pay Periods
          </TabsTrigger>
          <TabsTrigger value="current" disabled={!selectedPeriod}>
            Current Payroll
          </TabsTrigger>
        </TabsList>

        {/* Pay Periods List */}
        <TabsContent value="periods">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Payroll Periods
              </CardTitle>
              <CardDescription>Select or create a pay period to begin payroll processing</CardDescription>
            </CardHeader>
            <CardContent>
              {periodsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading pay periods...</div>
              ) : periods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pay periods found. Create your first pay period to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {periods.map((period) => (
                    <div
                      key={period.id}
                      className="p-4 border rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => handleSelectPeriod(period)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{period.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Pay Date: {format(new Date(period.payDate), 'MMM d, yyyy')} • {period.frequency}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            period.status === 'approved' ? 'default' : 
                            period.status === 'calculated' ? 'secondary' : 'outline'
                          }>
                            {period.status}
                          </Badge>
                          {period.status !== 'draft' && (
                            <div className="text-right text-sm">
                              <div className="font-medium">${parseFloat(period.totalNetPay || '0').toFixed(2)} Net</div>
                              <div className="text-muted-foreground">${parseFloat(period.totalGrossPay || '0').toFixed(2)} Gross</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Current Payroll Processing */}
        <TabsContent value="current">
          {selectedPeriod && (
            <div className="space-y-6">
              {/* Payroll Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payroll Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${periodTotals.grossPay.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Gross Pay</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        ${periodTotals.deductions.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Deductions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ${periodTotals.netPay.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Net Pay</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Paystubs */}
              {paystubs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Employee Paychecks ({paystubs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {paystubs.map((paystub) => (
                        <div key={paystub.id} className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">
                              {paystub.employee.firstName} {paystub.employee.lastName}
                            </h4>
                            <div className="text-sm text-muted-foreground flex items-center gap-4">
                              <span>Check #{paystub.checkNumber}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {parseFloat(paystub.regularHours).toFixed(1)}h regular
                              </span>
                              {parseFloat(paystub.overtimeHours) > 0 && (
                                <span className="text-orange-600">
                                  +{parseFloat(paystub.overtimeHours).toFixed(1)}h overtime
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-medium">${parseFloat(paystub.netPay).toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">
                                ${parseFloat(paystub.grossPay).toFixed(2)} gross
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPaystub(paystub);
                                  setShowPaystubDialog(true);
                                }}
                                className="gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                              {selectedPeriod?.status === 'calculated' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditPaystub(paystub)}
                                  className="gap-2"
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pay Period</DialogTitle>
            <DialogDescription>Set up a new payroll period for your employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pay Frequency</Label>
              <Select 
                value={newPeriodForm.frequency} 
                onValueChange={(value) => setNewPeriodForm({...newPeriodForm, frequency: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newPeriodForm.startDate}
                  onChange={(e) => setNewPeriodForm({...newPeriodForm, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newPeriodForm.endDate}
                  onChange={(e) => setNewPeriodForm({...newPeriodForm, endDate: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={newPeriodForm.payDate}
                onChange={(e) => setNewPeriodForm({...newPeriodForm, payDate: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePeriod} 
              disabled={createPeriodMutation.isPending}
            >
              {createPeriodMutation.isPending ? 'Creating...' : 'Create Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payroll</DialogTitle>
            <DialogDescription>
              Review and approve payroll for {selectedPeriod?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Once approved, this payroll cannot be modified. Please review all paychecks carefully.
              </AlertDescription>
            </Alert>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Employees:</span>
                <span className="font-medium">{paystubs.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Gross Pay:</span>
                <span className="font-medium">${periodTotals.grossPay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Deductions:</span>
                <span className="font-medium">${periodTotals.deductions.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Net Pay:</span>
                <span className="font-semibold">${periodTotals.netPay.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => approvePayrollMutation.mutate({ periodId: selectedPeriod!.id })}
              disabled={approvePayrollMutation.isPending}
            >
              {approvePayrollMutation.isPending ? 'Approving...' : 'Approve Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paystub View Dialog */}
      <Dialog open={showPaystubDialog} onOpenChange={setShowPaystubDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Paycheck Details</DialogTitle>
            <DialogDescription>
              {selectedPaystub && `Paycheck for ${selectedPaystub.employee.firstName} ${selectedPaystub.employee.lastName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPaystub && (
            <div className="py-4">
              <ActualPaycheck paycheck={selectedPaystub} settings={settings} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaystubDialog(false)}>Close</Button>
            <Button className="gap-2">
              <Printer className="w-4 h-4" />
              Print Paycheck
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Manual Payroll Entry Dialog */}
      <Dialog open={showManualPayrollDialog} onOpenChange={(open) => {
        setShowManualPayrollDialog(open);
        if (!open) setBulkPayrollInputs({}); // Clear inputs when closing dialog
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Manual Payroll Entry</DialogTitle>
            <DialogDescription>
              Enter hours, tips, and bonuses for all employees. Only enter values for fields that need adjustments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-3">
              {employees.filter((emp: any) => emp.status === 'active').map((employee: any) => (
                <div key={employee.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  {/* Employee Info */}
                  <div className="w-40">
                    <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                    <div className="text-sm text-gray-600">${employee.hourlyRate || 'N/A'}/hr</div>
                    {bulkPayrollInputs[employee.id] && (
                      <div className="text-sm font-medium text-green-600">
                        ${calculateEmployeeGrossPay(employee, bulkPayrollInputs[employee.id] || {}).toFixed(2)}
                      </div>
                    )}
                  </div>
                  
                  {/* Hours */}
                  <div className="w-20">
                    <Label className="text-xs">Hours</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="Hours"
                      value={bulkPayrollInputs[employee.id]?.hours || ''}
                      className="text-sm"
                      id={`hours-${employee.id}`}
                      onChange={(e) => handleBulkInputChange(employee.id, 'hours', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  
                  {/* Tips */}
                  <div className="w-20">
                    <Label className="text-xs">Tips ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder=""
                      value={bulkPayrollInputs[employee.id]?.tips || ''}
                      className="text-sm"
                      id={`tips-${employee.id}`}
                      onChange={(e) => handleBulkInputChange(employee.id, 'tips', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  
                  {/* Bonuses */}
                  <div className="w-20">
                    <Label className="text-xs">Bonus ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder=""
                      value={bulkPayrollInputs[employee.id]?.bonus || ''}
                      className="text-sm"
                      id={`bonus-${employee.id}`}
                      onChange={(e) => handleBulkInputChange(employee.id, 'bonus', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  
                  {/* Overtime */}
                  <div className="w-20">
                    <Label className="text-xs">OT Hours</Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder=""
                      value={bulkPayrollInputs[employee.id]?.overtime || ''}
                      className="text-sm"
                      id={`overtime-${employee.id}`}
                      onChange={(e) => handleBulkInputChange(employee.id, 'overtime', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  
                  {/* Deductions */}
                  <div className="w-20">
                    <Label className="text-xs">Deduct ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder=""
                      value={bulkPayrollInputs[employee.id]?.deduction || ''}
                      className="text-sm"
                      id={`deduction-${employee.id}`}
                      onChange={(e) => handleBulkInputChange(employee.id, 'deduction', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  
                  {/* Notes */}
                  <div className="flex-1">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      placeholder="Optional note..."
                      value={bulkPayrollInputs[employee.id]?.notes || ''}
                      className="text-sm"
                      id={`notes-${employee.id}`}
                      onChange={(e) => handleBulkInputChange(employee.id, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowManualPayrollDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkManualPayroll}
              disabled={createManualPayrollMutation.isPending}
            >
              Process All Entries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Single Paycheck Dialog */}
      <Dialog open={editingPaystub !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingPaystub(null);
          resetManualForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Paycheck</DialogTitle>
            <DialogDescription>
              {editingPaystub && `Editing ${editingPaystub.employee.firstName} ${editingPaystub.employee.lastName}'s paycheck`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={manualPayrollForm.regularHours}
                  onChange={(e) => setManualPayrollForm({...manualPayrollForm, regularHours: e.target.value})}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <Label>Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPayrollForm.regularRate}
                  onChange={(e) => setManualPayrollForm({...manualPayrollForm, regularRate: e.target.value})}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bonus ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPayrollForm.bonuses}
                  onChange={(e) => setManualPayrollForm({...manualPayrollForm, bonuses: e.target.value})}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <Label>Tips ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPayrollForm.tips}
                  onChange={(e) => setManualPayrollForm({...manualPayrollForm, tips: e.target.value})}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={manualPayrollForm.notes}
                onChange={(e) => setManualPayrollForm({...manualPayrollForm, notes: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditingPaystub(null);
                resetManualForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => updatePaycheckMutation.mutate({ paycheckId: editingPaystub!.id, data: manualPayrollForm })}
              disabled={updatePaycheckMutation.isPending}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}