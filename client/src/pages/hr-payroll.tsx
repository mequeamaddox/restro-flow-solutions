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
import { Calendar, Plus, Download, DollarSign, Users, Clock, TrendingUp, FileText, Eye, Check, Calculator } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import type { PayPeriod, Paystub, PayrollDeduction, Employee } from '@shared/schema';

export default function HRPayroll() {
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriod | null>(null);
  const [showCreatePeriodDialog, setShowCreatePeriodDialog] = useState(false);
  const [showPaystubDialog, setShowPaystubDialog] = useState(false);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  const [payPeriodForm, setPayPeriodForm] = useState({
    name: '',
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    payDate: format(addDays(endOfWeek(new Date(), { weekStartsOn: 1 }), 3), 'yyyy-MM-dd')
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pay periods
  const { data: payPeriods = [], isLoading: periodsLoading } = useQuery<PayPeriod[]>({
    queryKey: ['/api/hr/payroll/pay-periods'],
  });

  // Fetch paystubs for selected period
  const { data: paystubs = [], isLoading: paystubsLoading } = useQuery<(Paystub & { employee?: Employee })[]>({
    queryKey: ['/api/hr/payroll/paystubs', selectedPayPeriod?.id],
    queryFn: async () => {
      if (!selectedPayPeriod?.id) return [];
      const response = await apiRequest('GET', `/api/hr/payroll/paystubs/${selectedPayPeriod.id}`);
      return response.json();
    },
    enabled: !!selectedPayPeriod?.id,
  });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/hr/employees'],
  });

  // Fetch deductions
  const { data: deductions = [], isLoading: deductionsLoading } = useQuery<PayrollDeduction[]>({
    queryKey: ['/api/hr/payroll/deductions'],
  });

  // Fetch payroll summary
  const { data: payrollSummary } = useQuery<{ totalEmployees: number; monthlyPayroll: number; avgHourlyRate: number; laborCostPercentage: number }>({
    queryKey: ['/api/hr/payroll/summary'],
  });

  // Create pay period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/hr/payroll/pay-periods', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/pay-periods'] });
      setShowCreatePeriodDialog(false);
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

  // Calculate payroll mutation
  const calculatePayrollMutation = useMutation({
    mutationFn: async (payPeriodId: string) => {
      const response = await apiRequest('POST', `/api/hr/payroll/pay-periods/${payPeriodId}/calculate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/paystubs', selectedPayPeriod?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/pay-periods'] });
      toast({
        title: "Payroll Calculated",
        description: "Payroll has been calculated for all employees.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate payroll",
        variant: "destructive",
      });
    },
  });

  // Approve payroll mutation
  const approvePayrollMutation = useMutation({
    mutationFn: async (payPeriodId: string) => {
      const response = await apiRequest('POST', `/api/hr/payroll/pay-periods/${payPeriodId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/pay-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/summary'] });
      toast({
        title: "Payroll Approved",
        description: "Payroll has been approved and is ready for payment.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve payroll",
        variant: "destructive",
      });
    },
  });

  // Recalculate payroll mutation
  const recalculatePayrollMutation = useMutation({
    mutationFn: async (payPeriodId: string) => {
      const response = await apiRequest('POST', `/api/hr/payroll/pay-periods/${payPeriodId}/recalculate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/paystubs', selectedPayPeriod?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/pay-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/summary'] });
      toast({
        title: "Payroll Recalculated",
        description: "Payroll has been recalculated with correct numbers.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Recalculation Failed",
        description: error.message || "Failed to recalculate payroll",
        variant: "destructive",
      });
    },
  });

  const handleCreatePeriod = () => {
    const data = {
      ...payPeriodForm,
      name: payPeriodForm.name || `Week of ${format(new Date(payPeriodForm.startDate), 'MMM dd')} - ${format(new Date(payPeriodForm.endDate), 'MMM dd, yyyy')}`
    };
    createPeriodMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'approved': return 'bg-blue-500';
      case 'calculated': return 'bg-yellow-500';
      case 'calculating': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp: Employee) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  if (periodsLoading || employeesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="hr-payroll-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Payroll Management</h1>
          <p className="text-muted-foreground">Manage employee payroll and paystubs</p>
        </div>
        <Button onClick={() => setShowCreatePeriodDialog(true)} data-testid="button-create-period">
          <Plus className="h-4 w-4 mr-2" />
          New Pay Period
        </Button>
      </div>

      {/* Payroll Summary Cards */}
      {payrollSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-total-employees">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{payrollSummary.totalEmployees || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-monthly-payroll">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
                  <p className="text-2xl font-bold">{formatCurrency(payrollSummary.monthlyPayroll || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-hourly-rate">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Hourly Rate</p>
                  <p className="text-2xl font-bold">{formatCurrency(payrollSummary.avgHourlyRate || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-labor-cost-percentage">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Labor Cost %</p>
                  <p className="text-2xl font-bold">{(payrollSummary.laborCostPercentage || 0).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pay-periods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pay-periods" data-testid="tab-pay-periods">Pay Periods</TabsTrigger>
          <TabsTrigger value="paystubs" data-testid="tab-paystubs">Paystubs</TabsTrigger>
          <TabsTrigger value="deductions" data-testid="tab-deductions">Deductions</TabsTrigger>
        </TabsList>

        <TabsContent value="pay-periods" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pay Periods</h2>
          </div>

          <div className="grid gap-4">
            {payPeriods.length === 0 ? (
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
              payPeriods.map((period: PayPeriod) => (
                <Card 
                  key={period.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedPayPeriod?.id === period.id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedPayPeriod(period)}
                  data-testid={`pay-period-card-${period.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{period.name}</h3>
                        <p className="text-muted-foreground">
                          {format(new Date(period.startDate), 'MMM dd')} - {format(new Date(period.endDate), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
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
                            calculatePayrollMutation.mutate(period.id);
                          }}
                          disabled={calculatePayrollMutation.isPending}
                          data-testid={`button-calculate-${period.id}`}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate Payroll
                        </Button>
                      </div>
                    )}

                    {period.status === 'calculated' && (
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            approvePayrollMutation.mutate(period.id);
                          }}
                          disabled={approvePayrollMutation.isPending}
                          data-testid={`button-approve-${period.id}`}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve Payroll
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            recalculatePayrollMutation.mutate(period.id);
                          }}
                          disabled={recalculatePayrollMutation.isPending}
                          data-testid={`button-recalculate-${period.id}`}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Recalculate
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="paystubs" className="space-y-4">
          {selectedPayPeriod ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Paystubs - {selectedPayPeriod.name}</h2>
                <Button variant="outline" data-testid="button-download-paystubs">
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              </div>

              {paystubsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {paystubs.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Paystubs Generated</h3>
                        <p className="text-muted-foreground">Calculate payroll first to generate paystubs for employees.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    paystubs.map((paystub: Paystub) => (
                      <Card key={paystub.id} data-testid={`paystub-card-${paystub.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{getEmployeeName(paystub.employeeId)}</h3>
                              <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Regular Hours:</span>
                                  <div className="font-medium">{Number(paystub.regularHours).toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Overtime Hours:</span>
                                  <div className="font-medium">{Number(paystub.overtimeHours).toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Gross Pay:</span>
                                  <div className="font-medium">{formatCurrency(paystub.grossPay)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Net Pay:</span>
                                  <div className="font-bold text-green-600">{formatCurrency(paystub.netPay)}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant={paystub.status === 'paid' ? 'default' : 'secondary'}>
                                {paystub.status.charAt(0).toUpperCase() + paystub.status.slice(1)}
                              </Badge>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedPaystub(paystub);
                                  setShowPaystubDialog(true);
                                }}
                                data-testid={`button-view-paystub-${paystub.id}`}
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
                <p className="text-muted-foreground">Choose a pay period from the Pay Periods tab to view paystubs.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deductions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Payroll Deductions</h2>
            <Button variant="outline" data-testid="button-add-deduction">
              <Plus className="h-4 w-4 mr-2" />
              Add Deduction
            </Button>
          </div>

          {deductionsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid gap-4">
              {deductions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Deductions Configured</h3>
                    <p className="text-muted-foreground">Set up payroll deductions like taxes, benefits, and other withholdings.</p>
                  </CardContent>
                </Card>
              ) : (
                deductions.map((deduction: PayrollDeduction) => (
                  <Card key={deduction.id} data-testid={`deduction-card-${deduction.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{deduction.name}</h3>
                          <p className="text-muted-foreground">{deduction.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">{deduction.type}</Badge>
                            <Badge variant="outline">{deduction.calculationType}</Badge>
                            {deduction.isPreTax && <Badge variant="secondary">Pre-tax</Badge>}
                            {deduction.isEmployerPaid && <Badge variant="secondary">Employer Paid</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {deduction.calculationType === 'percentage' 
                              ? `${Number(deduction.amount).toFixed(2)}%`
                              : formatCurrency(deduction.amount || 0)
                            }
                          </div>
                          <Badge variant={deduction.isActive ? 'default' : 'secondary'}>
                            {deduction.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Pay Period Dialog */}
      <Dialog open={showCreatePeriodDialog} onOpenChange={setShowCreatePeriodDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-create-pay-period">
          <DialogHeader>
            <DialogTitle>Create Pay Period</DialogTitle>
            <DialogDescription>
              Set up a new pay period for payroll processing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="periodName">Period Name (Optional)</Label>
              <Input
                id="periodName"
                value={payPeriodForm.name}
                onChange={(e) => setPayPeriodForm({ ...payPeriodForm, name: e.target.value })}
                placeholder="Will auto-generate from dates"
                data-testid="input-period-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={payPeriodForm.startDate}
                  onChange={(e) => setPayPeriodForm({ ...payPeriodForm, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={payPeriodForm.endDate}
                  onChange={(e) => setPayPeriodForm({ ...payPeriodForm, endDate: e.target.value })}
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payDate">Pay Date</Label>
              <Input
                id="payDate"
                type="date"
                value={payPeriodForm.payDate}
                onChange={(e) => setPayPeriodForm({ ...payPeriodForm, payDate: e.target.value })}
                data-testid="input-pay-date"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreatePeriodDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePeriod} 
              disabled={createPeriodMutation.isPending}
              data-testid="button-submit-period"
            >
              {createPeriodMutation.isPending ? "Creating..." : "Create Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paystub Detail Dialog */}
      <Dialog open={showPaystubDialog} onOpenChange={setShowPaystubDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-paystub-detail">
          {selectedPaystub && (
            <>
              <DialogHeader>
                <DialogTitle>Paystub Details</DialogTitle>
                <DialogDescription>
                  {getEmployeeName(selectedPaystub.employeeId)} - {selectedPayPeriod?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Earnings Section */}
                <div>
                  <h3 className="font-semibold mb-3">Earnings</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Regular Hours ({Number(selectedPaystub.regularHours).toFixed(2)}h @ {formatCurrency(selectedPaystub.regularRate)}):</span>
                      <span className="font-medium">{formatCurrency(selectedPaystub.regularPay)}</span>
                    </div>
                    {Number(selectedPaystub.overtimeHours) > 0 && (
                      <div className="flex justify-between">
                        <span>Overtime Hours ({Number(selectedPaystub.overtimeHours).toFixed(2)}h @ {formatCurrency(selectedPaystub.overtimeRate || 0)}):</span>
                        <span className="font-medium">{formatCurrency(selectedPaystub.overtimePay)}</span>
                      </div>
                    )}
                    {Number(selectedPaystub.bonuses) > 0 && (
                      <div className="flex justify-between">
                        <span>Bonuses:</span>
                        <span className="font-medium">{formatCurrency(selectedPaystub.bonuses)}</span>
                      </div>
                    )}
                    {Number(selectedPaystub.tips) > 0 && (
                      <div className="flex justify-between">
                        <span>Tips:</span>
                        <span className="font-medium">{formatCurrency(selectedPaystub.tips)}</span>
                      </div>
                    )}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Gross Pay:</span>
                    <span>{formatCurrency(selectedPaystub.grossPay)}</span>
                  </div>
                </div>

                {/* Deductions Section */}
                <div>
                  <h3 className="font-semibold mb-3">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Federal Tax:</span>
                      <span>-{formatCurrency(selectedPaystub.federalTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>State Tax:</span>
                      <span>-{formatCurrency(selectedPaystub.stateTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Social Security:</span>
                      <span>-{formatCurrency(selectedPaystub.socialSecurity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Medicare:</span>
                      <span>-{formatCurrency(selectedPaystub.medicare)}</span>
                    </div>
                    {Number(selectedPaystub.otherDeductions) > 0 && (
                      <div className="flex justify-between">
                        <span>Other Deductions:</span>
                        <span>-{formatCurrency(selectedPaystub.otherDeductions)}</span>
                      </div>
                    )}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total Deductions:</span>
                    <span>-{formatCurrency(selectedPaystub.totalDeductions)}</span>
                  </div>
                </div>

                {/* Net Pay */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Pay:</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(selectedPaystub.netPay)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaystubDialog(false)}>
                  Close
                </Button>
                <Button data-testid="button-download-paystub">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}