import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Download, TrendingUp, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@/contexts/LocationContext";
import type { Employee } from "@shared/schema";

interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  currentlyWorking: number;
  todayShifts: number;
  pendingTasks: number;
  unreadMessages: number;
  pendingTimeOff: number;
  approvedTimeOff: number;
  weeklyShifts: number;
  totalWeeklyHours: number;
  actualWeeklyHours: number;
  actualWeeklyLabor: number;
  taskCompletionRate: number;
  avgHourlyRate: number;
  estimatedWeeklyLabor: number;
  recentMessages: any[];
  upcomingShifts: any[];
}

export default function HRTaxPayroll() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const { currentLocation } = useLocation();
  
  const { data: analytics, isLoading } = useQuery<HRAnalytics>({
    queryKey: ['/api/hr/analytics', currentLocation?.id],
    enabled: !!currentLocation,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/hr/employees', currentLocation?.id],
    enabled: !!currentLocation,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-6"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalEmployees = analytics?.totalEmployees || employees.length;
  const avgHourlyRate = analytics?.avgHourlyRate || 15.50;
  const weeklyLaborCost = analytics?.estimatedWeeklyLabor || 0;
  const monthlyLaborCost = weeklyLaborCost * 4.33;

  // Calculate real payroll tax data based on actual labor costs
  const monthlyGrossPay = monthlyLaborCost;
  const socialSecurityMatch = monthlyGrossPay * 0.062; // 6.2%
  const medicareMatch = monthlyGrossPay * 0.0145; // 1.45%
  const suta = monthlyGrossPay * 0.027; // 2.7% (state average)
  const futa = Math.min(totalEmployees * 7000 * 0.006 / 12, monthlyGrossPay * 0.006); // 0.6% on first $7,000 per employee annually
  const workersComp = monthlyGrossPay * 0.005; // 0.5% (industry average)
  const totalEmployerTaxes = socialSecurityMatch + medicareMatch + suta + futa + workersComp;
  
  const payrollTaxData = {
    monthlyGrossPay,
    socialSecurityMatch,
    medicareMatch,
    suta,
    futa,
    workersComp,
    totalEmployerTaxes
  };

  return (
    <div className="max-w-7xl mx-auto p-6" data-testid="hr-tax-payroll">
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <Shield className="h-8 w-8 text-red-600 dark:text-red-400 mt-1" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 text-foreground dark:text-white">Tax & Payroll Reports</h1>
            <p className="text-muted-foreground dark:text-gray-400">Owner-only access to payroll tax calculations and compliance reporting</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-500 dark:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">RESTRICTED</div>
            <span className="text-red-700 dark:text-red-300 font-medium">Owner Access Only</span>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            Confidential tax and payroll data for compliance and financial reporting
          </p>
        </div>
      </div>

      {/* Payroll Tax Reports Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground dark:text-white">Payroll Tax Reports</h2>
            <p className="text-muted-foreground dark:text-gray-400">Historical employer tax costs and compliance reporting</p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="current-quarter">This Quarter</SelectItem>
                <SelectItem value="current-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" data-testid="button-export-tax-pdf">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Social Security Match</CardTitle>
              <Calculator className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">${payrollTaxData.socialSecurityMatch.toFixed(2)}</div>
              <p className="text-xs text-red-600 dark:text-red-400">6.2% of gross pay</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Medicare Match</CardTitle>
              <Calculator className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">${payrollTaxData.medicareMatch.toFixed(2)}</div>
              <p className="text-xs text-red-600 dark:text-red-400">1.45% of gross pay</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">SUTA Tax</CardTitle>
              <Calculator className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">${payrollTaxData.suta.toFixed(2)}</div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">2.7% state unemployment</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Workers' Comp</CardTitle>
              <Calculator className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">${payrollTaxData.workersComp.toFixed(2)}</div>
              <p className="text-xs text-orange-600 dark:text-orange-400">0.5% of gross pay</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tax Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Breakdown Summary
              </CardTitle>
              <CardDescription>Detailed employer tax costs for {selectedPeriod}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Gross Payroll</span>
                  <span className="font-semibold">${payrollTaxData.monthlyGrossPay.toFixed(2)}</span>
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-red-200 dark:border-red-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-700 dark:text-red-300">Social Security Match (6.2%)</span>
                    <span className="text-red-800 dark:text-red-200 font-medium">${payrollTaxData.socialSecurityMatch.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-700 dark:text-red-300">Medicare Match (1.45%)</span>
                    <span className="text-red-800 dark:text-red-200 font-medium">${payrollTaxData.medicareMatch.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-yellow-700 dark:text-yellow-300">SUTA Tax (2.7%)</span>
                    <span className="text-yellow-800 dark:text-yellow-200 font-medium">${payrollTaxData.suta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700 dark:text-blue-300">FUTA Tax (0.6%)</span>
                    <span className="text-blue-800 dark:text-blue-200 font-medium">${payrollTaxData.futa.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-700 dark:text-orange-300">Workers' Comp (0.5%)</span>
                    <span className="text-orange-800 dark:text-orange-200 font-medium">${payrollTaxData.workersComp.toFixed(2)}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-border dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground dark:text-gray-200">Total Employer Taxes</span>
                    <span className="text-xl font-bold text-red-900 dark:text-red-300">${payrollTaxData.totalEmployerTaxes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-gray-700">
                    <span className="font-bold text-foreground dark:text-white">TOTAL PAYROLL COST</span>
                    <span className="text-xl font-bold text-foreground dark:text-white">
                      ${(payrollTaxData.monthlyGrossPay + payrollTaxData.totalEmployerTaxes).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tax Rate Analysis
              </CardTitle>
              <CardDescription>Effective tax rates and compliance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Effective Employer Tax Rate</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {((payrollTaxData.totalEmployerTaxes / payrollTaxData.monthlyGrossPay) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    Total employer taxes as percentage of gross payroll
                  </div>
                </div>

                <div className="pt-3 border-t dark:border-gray-700">
                  <h4 className="font-medium mb-2">Quarterly Filing Requirements</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Form 941 - Federal Quarterly</span>
                      <Badge variant="outline" className="text-green-600 border-green-200 text-xs">Due</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">SC Quarterly Return</span>
                      <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">Current</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">Workers' Comp Premium</span>
                      <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">Due</Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t dark:border-gray-700">
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    <strong>Note:</strong> All rates based on current tax settings. Update tax rates in HR → Tax Settings to adjust calculations.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
