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
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/contexts/LocationContext';
import { Calendar, Plus, DollarSign, Users, Calculator, Eye } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ActualPaycheck } from '@/components/payroll/actual-paycheck';

interface PayrollPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: string;
  totalGrossPay: string;
  totalNetPay: string;
  frequency: string;
}

interface Paycheck {
  id: string;
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
    id: string;
    firstName: string;
    lastName: string;
    address: string;
    phone: string;
  };
}

export default function HRPayroll() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaycheckDialog, setShowPaycheckDialog] = useState(false);
  const [selectedPaycheck, setSelectedPaycheck] = useState<Paycheck | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  
  const [newPeriod, setNewPeriod] = useState({
    startDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    payDate: format(addDays(endOfWeek(new Date(), { weekStartsOn: 1 }), 3), 'yyyy-MM-dd'),
    frequency: 'weekly'
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentLocation } = useLocation();

  // Fetch payroll periods
  const { data: periods = [] } = useQuery<PayrollPeriod[]>({
    queryKey: ['/api/payroll-periods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payroll-periods');
      return response.json();
    },
  });

  // Fetch paychecks for selected period
  const { data: paychecks = [] } = useQuery<Paycheck[]>({
    queryKey: ['/api/payroll-periods', selectedPeriod?.id, 'paychecks'],
    queryFn: async () => {
      if (!selectedPeriod?.id) return [];
      const response = await apiRequest('GET', `/api/payroll-periods/${selectedPeriod.id}/paychecks`);
      return response.json();
    },
    enabled: !!selectedPeriod?.id,
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
  const createPeriod = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/payroll-periods', { body: data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      setShowCreateDialog(false);
      toast({ title: "Pay Period Created", description: "New payroll period created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pay period", variant: "destructive" });
    },
  });

  // Calculate payroll (process paychecks)
  const calculatePayroll = useMutation({
    mutationFn: async (periodId: string) => {
      const response = await apiRequest('POST', `/api/hr/payroll/pay-periods/${periodId}/calculate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll-periods', selectedPeriod?.id, 'paychecks'] });
      toast({ title: "Payroll Calculated", description: "Paychecks generated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Calculation Failed", description: error.message || "Failed to calculate payroll", variant: "destructive" });
    },
  });

  const handleCreatePeriod = () => {
    createPeriod.mutate({
      body: {
        ...newPeriod,
        locationId: currentLocation?.id
      }
    });
  };

  const handleCalculatePayroll = () => {
    if (selectedPeriod) {
      calculatePayroll.mutate(selectedPeriod.id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Professional payroll processing for your restaurant</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Pay Period
        </Button>
      </div>

      {/* Pay Periods List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pay Periods
          </CardTitle>
          <CardDescription>Select a pay period to view or process payroll</CardDescription>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pay periods found. Create your first pay period to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPeriod?.id === period.id ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{period.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(period.startDate), 'MMM d')} - {format(new Date(period.endDate), 'MMM d, yyyy')}
                        • Pay Date: {format(new Date(period.payDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={period.status === 'calculated' ? 'default' : 'secondary'}>
                        {period.status}
                      </Badge>
                      {period.status === 'calculated' && (
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

      {/* Selected Period Actions */}
      {selectedPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Payroll Actions
            </CardTitle>
            <CardDescription>Process payroll for {selectedPeriod.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            {selectedPeriod.status === 'draft' ? (
              <Button 
                onClick={handleCalculatePayroll}
                disabled={calculatePayroll.isPending}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" />
                {calculatePayroll.isPending ? 'Calculating...' : 'Calculate Payroll'}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <Calculator className="w-4 h-4" />
                <span>Payroll calculated - {paychecks.length} paychecks generated</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Paychecks List */}
      {selectedPeriod && paychecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Generated Paychecks
            </CardTitle>
            <CardDescription>View and manage paychecks for {selectedPeriod.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paychecks.map((paycheck) => (
                <div key={paycheck.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{paycheck.employee.firstName} {paycheck.employee.lastName}</h4>
                    <p className="text-sm text-muted-foreground">
                      Check #{paycheck.checkNumber} • {parseFloat(paycheck.regularHours).toFixed(1)}h regular, {parseFloat(paycheck.overtimeHours).toFixed(1)}h overtime
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">${parseFloat(paycheck.netPay).toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">${parseFloat(paycheck.grossPay).toFixed(2)} gross</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPaycheck(paycheck);
                        setShowPaycheckDialog(true);
                      }}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Period Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pay Period</DialogTitle>
            <DialogDescription>Set up a new payroll period for your employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Frequency</Label>
              <Select value={newPeriod.frequency} onValueChange={(value) => setNewPeriod({...newPeriod, frequency: value})}>
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
                  value={newPeriod.startDate}
                  onChange={(e) => setNewPeriod({...newPeriod, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newPeriod.endDate}
                  onChange={(e) => setNewPeriod({...newPeriod, endDate: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Pay Date</Label>
              <Input
                type="date"
                value={newPeriod.payDate}
                onChange={(e) => setNewPeriod({...newPeriod, payDate: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod} disabled={createPeriod.isPending}>
              {createPeriod.isPending ? 'Creating...' : 'Create Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paycheck View Dialog */}
      <Dialog open={showPaycheckDialog} onOpenChange={setShowPaycheckDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Paycheck Details</DialogTitle>
            <DialogDescription>
              {selectedPaycheck && `Paycheck for ${selectedPaycheck.employee.firstName} ${selectedPaycheck.employee.lastName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPaycheck && (
            <div className="py-4">
              <ActualPaycheck paycheck={selectedPaycheck} settings={settings} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaycheckDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}