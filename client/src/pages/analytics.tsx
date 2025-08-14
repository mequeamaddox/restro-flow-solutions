import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "@/contexts/LocationContext";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  Users,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  Target
} from "lucide-react";

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  threshold: string;
  actualValue: string;
  variance: string;
  createdAt: string;
  item?: {
    name: string;
  };
}

interface BusinessIntelligence {
  id: string;
  reportDate: string;
  totalRevenue: string;
  totalCogs: string;
  grossMargin: string;
  foodCostPercentage: string;
  wastePercentage: string;
  inventoryTurnover: string;
  avgOrderValue: string;
  customerCount: number;
  topSellingItems: any[];
  lowPerformingItems: any[];
  trends: any;
}

export default function Analytics() {
  const { currentLocation } = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today");

  // Fetch cost alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/analytics/alerts", currentLocation?.id],
    enabled: !!currentLocation?.id,
  });

  // Fetch business intelligence data
  const { data: biData, isLoading: biLoading } = useQuery({
    queryKey: ["/api/analytics/business-intelligence", currentLocation?.id, selectedPeriod],
    enabled: !!currentLocation?.id,
  });

  // Fetch P&L report
  const { data: plReport, isLoading: plLoading } = useQuery({
    queryKey: ["/api/analytics/profit-loss", currentLocation?.id, selectedPeriod],
    enabled: !!currentLocation?.id,
  });

  if (!currentLocation) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Location Selected</h2>
          <p className="text-muted-foreground">Please select a location to view analytics.</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num || 0);
  };

  const formatPercentage = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num || 0).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and cost control for {currentLocation.name}
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cost Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cost Alerts
          </CardTitle>
          <CardDescription>
            Active alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="text-center py-8">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active alerts
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert: Alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {alert.alertType.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {alert.item?.name && `${alert.item.name} - `}
                        Threshold: {formatPercentage(alert.threshold)}, 
                        Actual: {formatPercentage(alert.actualValue)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profit-loss">P&L Report</TabsTrigger>
          <TabsTrigger value="cost-analysis">Cost Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(biData?.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Food Cost %</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(biData?.foodCostPercentage || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: 28-32%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(biData?.avgOrderValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +5.2% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Count</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {biData?.customerCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% from last period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>Most popular menu items</CardDescription>
              </CardHeader>
              <CardContent>
                {biData?.topSellingItems?.length > 0 ? (
                  <div className="space-y-3">
                    {biData.topSellingItems.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No sales data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Performing Items</CardTitle>
                <CardDescription>Items with low margins or sales</CardDescription>
              </CardHeader>
              <CardContent>
                {biData?.lowPerformingItems?.length > 0 ? (
                  <div className="space-y-3">
                    {biData.lowPerformingItems.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPercentage(item.margin)} margin
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {item.quantity} sold
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No underperforming items</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profit-loss" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <CardDescription>
                Financial performance for {selectedPeriod}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plLoading ? (
                <div className="text-center py-8">Loading P&L report...</div>
              ) : plReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Revenue</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Total Sales</span>
                          <span>{formatCurrency(plReport.revenue?.total || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Average Ticket</span>
                          <span>{formatCurrency(plReport.revenue?.averageTicket || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Cost of Goods Sold</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Total COGS</span>
                          <span>{formatCurrency(plReport.cogs?.total || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>COGS %</span>
                          <span>{formatPercentage(plReport.cogs?.percentage || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <hr />
                  <div>
                    <h4 className="font-semibold mb-2">Gross Profit</h4>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Gross Profit</span>
                      <span className="text-green-600">
                        {formatCurrency(plReport.margins?.grossProfit || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Gross Margin %</span>
                      <span>{formatPercentage(plReport.margins?.grossMarginPercentage || 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No P&L data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Current period cost analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Food Cost</span>
                    <span className="font-medium">
                      {formatPercentage(biData?.foodCostPercentage || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Waste</span>
                    <span className="font-medium">
                      {formatPercentage(biData?.wastePercentage || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Inventory Turnover</span>
                    <span className="font-medium">
                      {parseFloat(biData?.inventoryTurnover || '0').toFixed(2)}x
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Targets</CardTitle>
                <CardDescription>Industry benchmarks and goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Food Cost Target</span>
                    <span className="text-muted-foreground">28-32%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Waste Target</span>
                    <span className="text-muted-foreground">{'< 5%'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Gross Margin Target</span>
                    <span className="text-muted-foreground">{'> 60%'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Week-over-week and month-over-month changes</CardDescription>
            </CardHeader>
            <CardContent>
              {biData?.trends ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Revenue Trends</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Day over day</span>
                        <div className="flex items-center gap-1">
                          {biData.trends.revenue?.dayOverDay > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-sm font-medium">
                            {formatPercentage(Math.abs(biData.trends.revenue?.dayOverDay || 0))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Week over week</span>
                        <div className="flex items-center gap-1">
                          {biData.trends.revenue?.weekOverWeek > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-sm font-medium">
                            {formatPercentage(Math.abs(biData.trends.revenue?.weekOverWeek || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Food Cost Trends</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Day over day</span>
                        <div className="flex items-center gap-1">
                          {biData.trends.foodCost?.dayOverDay > 0 ? (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-sm font-medium">
                            {formatPercentage(Math.abs(biData.trends.foodCost?.dayOverDay || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Customer Trends</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Day over day</span>
                        <div className="flex items-center gap-1">
                          {biData.trends.customerCount?.dayOverDay > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-sm font-medium">
                            {formatPercentage(Math.abs(biData.trends.customerCount?.dayOverDay || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}