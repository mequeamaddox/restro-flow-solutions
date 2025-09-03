import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Download, Eye, FileText, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface PayStub {
  id: string;
  paycheckId: string;
  employeeId: string;
  stubData: string;
  viewedAt?: string;
  downloadedAt?: string;
  createdAt: string;
}

interface PaycheckData {
  id: string;
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
  payPeriod?: {
    startDate: string;
    endDate: string;
    payDate: string;
  };
}

export default function EmployeePayStubs() {
  const [selectedPayStub, setSelectedPayStub] = useState<PayStub | null>(null);
  const [showPayStubDialog, setShowPayStubDialog] = useState(false);
  const [payStubData, setPayStubData] = useState<PaycheckData | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch employee's pay stubs
  const { data: payStubs = [], isLoading, error } = useQuery<PayStub[]>({
    queryKey: ['/api/employees', user?.id, 'pay-stubs'],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/employees/${user.id}/pay-stubs`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Mark pay stub as viewed mutation
  const markViewedMutation = useMutation({
    mutationFn: async (payStubId: string) => {
      await apiRequest('PUT', `/api/pay-stubs/${payStubId}/viewed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', user?.id, 'pay-stubs'] });
    },
  });

  const handleViewPayStub = async (payStub: PayStub) => {
    try {
      setSelectedPayStub(payStub);
      
      // Parse the stub data
      const stubData = JSON.parse(payStub.stubData) as PaycheckData;
      setPayStubData(stubData);
      
      // Mark as viewed if not already viewed
      if (!payStub.viewedAt) {
        markViewedMutation.mutate(payStub.id);
      }
      
      setShowPayStubDialog(true);
    } catch (error) {
      console.error('Error parsing pay stub data:', error);
      toast({
        title: "Error",
        description: "Failed to load pay stub details",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPayStub = (payStub: PayStub) => {
    try {
      const stubData = JSON.parse(payStub.stubData) as PaycheckData;
      
      // Generate pay stub content
      const content = `
═══════════════════════════════════════════════════════════════════════════
                              PAY STUB
                        ${user?.email || 'Employee'}
═══════════════════════════════════════════════════════════════════════════

Check Number: ${stubData.checkNumber || 'N/A'}
Pay Period: ${stubData.payPeriod ? format(new Date(stubData.payPeriod.startDate), 'MM/dd/yyyy') + ' - ' + format(new Date(stubData.payPeriod.endDate), 'MM/dd/yyyy') : 'N/A'}
Pay Date: ${stubData.payPeriod ? format(new Date(stubData.payPeriod.payDate), 'MM/dd/yyyy') : 'N/A'}

───────────────────────────────────────────────────────────────────────────
                               EARNINGS
───────────────────────────────────────────────────────────────────────────
Regular Hours:    ${parseFloat(stubData.regularHours).toFixed(2).padStart(8)} @ $${parseFloat(stubData.hourlyRate).toFixed(2).padStart(6)} = $${parseFloat(stubData.regularPay).toFixed(2).padStart(8)}
Overtime Hours:   ${parseFloat(stubData.overtimeHours).toFixed(2).padStart(8)} @ $${(parseFloat(stubData.hourlyRate) * 1.5).toFixed(2).padStart(6)} = $${parseFloat(stubData.overtimePay).toFixed(2).padStart(8)}

GROSS PAY:                                                $${parseFloat(stubData.grossPay).toFixed(2).padStart(10)}

───────────────────────────────────────────────────────────────────────────
                              DEDUCTIONS
───────────────────────────────────────────────────────────────────────────
Federal Tax:                                              $${parseFloat(stubData.federalTax).toFixed(2).padStart(10)}
State Tax:                                                $${parseFloat(stubData.stateTax).toFixed(2).padStart(10)}
Social Security:                                          $${parseFloat(stubData.socialSecurity).toFixed(2).padStart(10)}
Medicare:                                                 $${parseFloat(stubData.medicare).toFixed(2).padStart(10)}
Other Deductions:                                         $${parseFloat(stubData.otherDeductions).toFixed(2).padStart(10)}

TOTAL DEDUCTIONS:                                         $${parseFloat(stubData.totalDeductions).toFixed(2).padStart(10)}

───────────────────────────────────────────────────────────────────────────

NET PAY:                                                  $${parseFloat(stubData.netPay).toFixed(2).padStart(10)}

═══════════════════════════════════════════════════════════════════════════
      `;

      // Create and download the file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `paystub-${stubData.checkNumber || format(new Date(payStub.createdAt), 'yyyyMMdd')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Complete",
        description: "Pay stub has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading pay stub:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download pay stub",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  // Calculate summary statistics
  const totalEarnings = payStubs.reduce((sum, stub) => {
    try {
      const data = JSON.parse(stub.stubData) as PaycheckData;
      return sum + parseFloat(data.grossPay || '0');
    } catch {
      return sum;
    }
  }, 0);

  const totalDeductions = payStubs.reduce((sum, stub) => {
    try {
      const data = JSON.parse(stub.stubData) as PaycheckData;
      return sum + parseFloat(data.totalDeductions || '0');
    } catch {
      return sum;
    }
  }, 0);

  const totalNetPay = payStubs.reduce((sum, stub) => {
    try {
      const data = JSON.parse(stub.stubData) as PaycheckData;
      return sum + parseFloat(data.netPay || '0');
    } catch {
      return sum;
    }
  }, 0);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to Load Pay Stubs</h3>
            <p className="text-muted-foreground">There was an error loading your pay stubs. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="employee-pay-stubs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">My Pay Stubs</h1>
          <p className="text-muted-foreground">View and download your pay stubs and earnings history</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-earnings">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-deductions">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDeductions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-net-pay">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Net Pay</p>
                <p className="text-2xl font-bold">{formatCurrency(totalNetPay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pay Stubs List */}
      <Card>
        <CardHeader>
          <CardTitle>Pay Stubs History</CardTitle>
          <CardDescription>
            View and download your pay stubs from recent pay periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payStubs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pay Stubs Available</h3>
              <p className="text-muted-foreground">
                Your pay stubs will appear here after payroll is processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payStubs.map((payStub) => {
                let stubData: PaycheckData | null = null;
                try {
                  stubData = JSON.parse(payStub.stubData) as PaycheckData;
                } catch (error) {
                  console.error('Error parsing pay stub data:', error);
                }

                return (
                  <Card key={payStub.id} data-testid={`pay-stub-card-${payStub.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              Check #{stubData?.checkNumber || 'N/A'}
                            </h3>
                            {!payStub.viewedAt && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Pay Period: {stubData?.payPeriod ? 
                              `${format(new Date(stubData.payPeriod.startDate), 'MM/dd/yyyy')} - ${format(new Date(stubData.payPeriod.endDate), 'MM/dd/yyyy')}` : 
                              format(new Date(payStub.createdAt), 'MM/dd/yyyy')
                            }
                          </p>
                          {stubData && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Gross Pay:</span>
                                <div className="font-medium">{formatCurrency(stubData.grossPay)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Deductions:</span>
                                <div className="font-medium">{formatCurrency(stubData.totalDeductions)}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Net Pay:</span>
                                <div className="font-bold text-green-600">{formatCurrency(stubData.netPay)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewPayStub(payStub)}
                            data-testid={`button-view-pay-stub-${payStub.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPayStub(payStub)}
                            data-testid={`button-download-pay-stub-${payStub.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Stub Details Dialog */}
      <Dialog open={showPayStubDialog} onOpenChange={setShowPayStubDialog}>
        <DialogContent className="max-w-2xl">
          {selectedPayStub && payStubData && (
            <>
              <DialogHeader>
                <DialogTitle>Pay Stub Details</DialogTitle>
                <DialogDescription>
                  Check #{payStubData.checkNumber || 'N/A'} - {payStubData.payPeriod ? 
                    `${format(new Date(payStubData.payPeriod.startDate), 'MM/dd/yyyy')} - ${format(new Date(payStubData.payPeriod.endDate), 'MM/dd/yyyy')}` : 
                    format(new Date(selectedPayStub.createdAt), 'MM/dd/yyyy')
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Earnings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Regular Hours ({parseFloat(payStubData.regularHours).toFixed(2)} @ {formatCurrency(payStubData.hourlyRate)}):</span>
                        <span>{formatCurrency(payStubData.regularPay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime Hours ({parseFloat(payStubData.overtimeHours).toFixed(2)} @ {formatCurrency(parseFloat(payStubData.hourlyRate) * 1.5)}):</span>
                        <span>{formatCurrency(payStubData.overtimePay)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Gross Pay:</span>
                        <span>{formatCurrency(payStubData.grossPay)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Deductions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Federal Tax:</span>
                        <span>{formatCurrency(payStubData.federalTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>State Tax:</span>
                        <span>{formatCurrency(payStubData.stateTax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Social Security:</span>
                        <span>{formatCurrency(payStubData.socialSecurity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medicare:</span>
                        <span>{formatCurrency(payStubData.medicare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other:</span>
                        <span>{formatCurrency(payStubData.otherDeductions)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Deductions:</span>
                        <span>{formatCurrency(payStubData.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />
                
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    Net Pay: {formatCurrency(payStubData.netPay)}
                  </div>
                  {payStubData.payPeriod && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Pay Date: {format(new Date(payStubData.payPeriod.payDate), 'MMMM dd, yyyy')}
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={() => handleDownloadPayStub(selectedPayStub)}
                    data-testid="button-download-current-stub"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download This Pay Stub
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}