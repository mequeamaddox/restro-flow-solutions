import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Users,
  ShoppingCart,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart, 
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function BusinessIntelligence() {
  const [timeRange, setTimeRange] = useState("30d");
  const [locationFilter, setLocationFilter] = useState("all");
  const [reportType, setReportType] = useState("daily");

  // Queries
  const { data: dailyPnL = [] } = useQuery({
    queryKey: ["/api/business-intelligence/daily-pnl", timeRange, locationFilter],
    queryFn: () => apiRequest("GET", `/api/business-intelligence/daily-pnl?range=${timeRange}&location=${locationFilter}`).then(r => r.json()),
  });

  const { data: kpiMetrics } = useQuery({
    queryKey: ["/api/business-intelligence/kpis", timeRange, locationFilter],
    queryFn: () => apiRequest("GET", `/api/business-intelligence/kpis?range=${timeRange}&location=${locationFilter}`).then(r => r.json()),
  });

  const { data: profitabilityAnalysis = [] } = useQuery({
    queryKey: ["/api/business-intelligence/profitability", timeRange, locationFilter],
    queryFn: () => apiRequest("GET", `/api/business-intelligence/profitability?range=${timeRange}&location=${locationFilter}`).then(r => r.json()),
  });

  const { data: menuPerformance = [] } = useQuery({
    queryKey: ["/api/business-intelligence/menu-performance", timeRange, locationFilter],
    queryFn: () => apiRequest("GET", `/api/business-intelligence/menu-performance?range=${timeRange}&location=${locationFilter}`).then(r => r.json()),
  });

  const { data: costAnalysis } = useQuery({
    queryKey: ["/api/business-intelligence/cost-analysis", timeRange, locationFilter],
    queryFn: () => apiRequest("GET", `/api/business-intelligence/cost-analysis?range=${timeRange}&location=${locationFilter}`).then(r => r.json()),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: () => apiRequest("GET", "/api/locations").then(r => r.json()),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return "text-red-400";
    if (variance > 0) return "text-orange-400";
    if (variance > -5) return "text-green-400";
    return "text-emerald-400";
  };

  const COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4', '#84CC16'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Business Intelligence</h1>
          <p className="text-slate-300 mt-2">Advanced analytics and profit optimization</p>
        </div>
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 bg-slate-700 border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="1y">1 year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location: any) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button className="bg-orange-500 hover:bg-orange-600">
            <Calendar className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Gross Profit Margin</p>
                <p className="text-2xl font-bold text-white">
                  {formatPercentage(kpiMetrics?.grossMargin || 0)}
                </p>
                <div className="flex items-center text-xs mt-1">
                  {(kpiMetrics?.marginVariance || 0) > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
                  )}
                  <span className={getVarianceColor(kpiMetrics?.marginVariance || 0)}>
                    {Math.abs(kpiMetrics?.marginVariance || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Food Cost %</p>
                <p className="text-2xl font-bold text-white">
                  {formatPercentage(kpiMetrics?.foodCostPercentage || 0)}
                </p>
                <div className="flex items-center text-xs mt-1">
                  <span className="text-slate-400">Target: 28-32%</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Average Order Value</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(kpiMetrics?.avgOrderValue || 0)}
                </p>
                <div className="flex items-center text-xs mt-1">
                  {(kpiMetrics?.aovVariance || 0) > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
                  )}
                  <span className={getVarianceColor(kpiMetrics?.aovVariance || 0)}>
                    {formatPercentage(Math.abs(kpiMetrics?.aovVariance || 0))}
                  </span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Customer Count</p>
                <p className="text-2xl font-bold text-white">
                  {kpiMetrics?.customerCount?.toLocaleString() || 0}
                </p>
                <div className="flex items-center text-xs mt-1">
                  <span className="text-slate-400">vs last period</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="profitability" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="profitability" className="data-[state=active]:bg-slate-700">
            P&L Analysis
          </TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-slate-700">
            Menu Performance
          </TabsTrigger>
          <TabsTrigger value="costs" className="data-[state=active]:bg-slate-700">
            Cost Breakdown
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-slate-700">
            Trend Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="space-y-6">
          {/* Daily P&L Chart */}
          <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Daily Controllable P&L
              </CardTitle>
              <CardDescription className="text-slate-400">
                Revenue, costs, and profitability trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis stroke="#9CA3AF" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                    labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3}
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cogs" 
                    stackId="2"
                    stroke="#F97316" 
                    fill="#F97316" 
                    fillOpacity={0.3}
                    name="Cost of Goods"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="grossProfit" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="Gross Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profitability Analysis Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Profitability Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profitabilityAnalysis.map((metric: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-slate-300">{metric.name}</span>
                      <div className="text-right">
                        <span className="text-white font-bold">{metric.value}</span>
                        {metric.target && (
                          <div className="text-xs text-slate-400">
                            Target: {metric.target}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Performance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                    <div>
                      <p className="text-white text-sm font-medium">Food cost within target</p>
                      <p className="text-green-400 text-xs">29.2% (Target: 28-32%)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 rounded-lg bg-orange-900/20 border border-orange-500/30">
                    <AlertTriangle className="h-5 w-5 text-orange-400 mr-3" />
                    <div>
                      <p className="text-white text-sm font-medium">Labor cost trending high</p>
                      <p className="text-orange-400 text-xs">34.8% (+2.3% vs target)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                    <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                    <div>
                      <p className="text-white text-sm font-medium">Waste above threshold</p>
                      <p className="text-red-400 text-xs">4.2% (Target: &lt;3%)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Items */}
            <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Top Performing Items</CardTitle>
                <CardDescription className="text-slate-400">
                  Highest profit margin and volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {menuPerformance.slice(0, 8).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center mr-3">
                          <span className="text-green-400 text-sm font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          <p className="text-slate-400 text-xs">
                            {item.unitsSold} sold • {formatPercentage(item.margin)} margin
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{formatCurrency(item.profit)}</p>
                        <p className="text-green-400 text-xs">profit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Menu Category Performance */}
            <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={costAnalysis?.categoryBreakdown || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(costAnalysis?.categoryBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Cost Structure Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={costAnalysis?.monthlyBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="food" stackId="a" fill="#F97316" name="Food Costs" />
                  <Bar dataKey="labor" stackId="a" fill="#3B82F6" name="Labor Costs" />
                  <Bar dataKey="overhead" stackId="a" fill="#8B5CF6" name="Overhead" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Key Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="foodCostPercentage" 
                    stroke="#F97316" 
                    strokeWidth={2}
                    name="Food Cost %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="grossMarginPercentage" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Gross Margin %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="wastePercentage" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Waste %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}