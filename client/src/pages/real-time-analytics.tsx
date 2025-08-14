import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Users,
  ShoppingCart,
  Clock,
  Zap,
  Target,
  Eye
} from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';

export default function RealTimeAnalytics() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentLocation } = useLocation();

  // Update time every second for live feel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Mock real-time data that would come from WebSocket/SSE
  const [realTimeData, setRealTimeData] = useState({
    currentSales: 2847.50,
    ordersToday: 127,
    avgOrderValue: 22.43,
    activeTables: 18,
    kitchenWaitTime: 8.5,
    topSellingItems: [
      { name: 'Chicken Caesar Salad', sold: 23, revenue: 437 },
      { name: 'Craft Beer Flight', sold: 19, revenue: 285 },
      { name: 'Fish & Chips', sold: 17, revenue: 289 }
    ]
  });

  const salesTrendData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    sales: Math.random() * 500 + 100,
    orders: Math.floor(Math.random() * 20 + 5),
    avgOrder: Math.random() * 15 + 20
  }));

  const inventoryAlerts = [
    { item: 'Salmon Fillets', current: 3, min: 8, severity: 'high', location: 'Main Kitchen' },
    { item: 'Draft Beer - IPA', current: 15, min: 20, severity: 'medium', location: 'Bar' },
    { item: 'Romaine Lettuce', current: 8, min: 12, severity: 'low', location: 'Prep Station' }
  ];

  const wasteData = [
    { category: 'Food Prep', amount: 12.5, cost: 47, color: '#EF4444' },
    { category: 'Plate Waste', amount: 8.3, cost: 31, color: '#F59E0B' },
    { category: 'Spoilage', amount: 4.7, cost: 18, color: '#10B981' },
    { category: 'Overproduction', amount: 6.2, cost: 24, color: '#8B5CF6' }
  ];

  const costAlerts = [
    {
      type: 'price_increase',
      item: 'Ground Beef',
      change: '+12%',
      impact: '$127/week',
      vendor: 'Sysco Foods',
      severity: 'high'
    },
    {
      type: 'waste_spike',
      item: 'Mixed Greens',
      change: '+34%',
      impact: '$45/week',
      cause: 'Overordering',
      severity: 'medium'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Live Updates */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="h-8 w-8 text-green-400" />
            Real-Time Analytics
          </h1>
          <p className="text-slate-400 mt-2">
            Live performance dashboard • Last update: {currentTime.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Live</span>
          </div>
          <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
            {currentLocation?.name || 'All Locations'}
          </Badge>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-green-400">
              ${realTimeData.currentSales.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Sales Today</div>
            <div className="text-xs text-green-400 mt-1">↑ 15% vs yesterday</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <ShoppingCart className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{realTimeData.ordersToday}</div>
            <div className="text-xs text-slate-400">Orders Today</div>
            <div className="text-xs text-blue-400 mt-1">↑ 8% vs avg</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white">${realTimeData.avgOrderValue}</div>
            <div className="text-xs text-slate-400">Avg Order</div>
            <div className="text-xs text-green-400 mt-1">↑ $2.15</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{realTimeData.activeTables}</div>
            <div className="text-xs text-slate-400">Active Tables</div>
            <div className="text-xs text-orange-400 mt-1">78% capacity</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white">{realTimeData.kitchenWaitTime}m</div>
            <div className="text-xs text-slate-400">Kitchen Time</div>
            <div className="text-xs text-green-400 mt-1">↓ 2m faster</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-pink-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-white">97.3%</div>
            <div className="text-xs text-slate-400">Item Availability</div>
            <div className="text-xs text-green-400 mt-1">Excellent</div>
          </CardContent>
        </Card>
      </div>

      {/* Live Sales Trend */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Live Sales Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9CA3AF"
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151', 
                    borderRadius: '6px',
                    color: '#F3F4F6'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10B981"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-Time Inventory Alerts */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Live Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventoryAlerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-500/10 border-red-500' :
                  alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500' :
                  'bg-blue-500/10 border-blue-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{alert.item}</div>
                      <div className="text-sm text-slate-400">{alert.location}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        alert.severity === 'high' ? 'text-red-400' :
                        alert.severity === 'medium' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {alert.current} left
                      </div>
                      <div className="text-xs text-slate-400">min: {alert.min}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Items Today */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Top Performers Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realTimeData.topSellingItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="text-sm text-slate-400">{item.sold} sold today</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-400">${item.revenue}</div>
                    <div className="text-xs text-slate-400">revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Monitoring Alerts */}
      <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Live Cost Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costAlerts.map((alert, index) => (
              <div key={index} className="flex items-start justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {alert.type === 'price_increase' ? 'Price Alert' : 'Waste Alert'}
                    </Badge>
                    <span className="text-white font-medium">{alert.item}</span>
                  </div>
                  <div className="text-sm text-slate-300">
                    {alert.type === 'price_increase' 
                      ? `${alert.vendor} increased prices by ${alert.change}`
                      : `Waste increased by ${alert.change} due to ${alert.cause}`
                    }
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Financial impact: {alert.impact}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Waste Monitoring */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-400" />
            Today's Waste Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wasteData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({category, amount}) => `${category}: ${amount}lbs`}
                  >
                    {wasteData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {wasteData.map((waste, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: waste.color }}
                    />
                    <div>
                      <div className="text-white font-medium">{waste.category}</div>
                      <div className="text-sm text-slate-400">{waste.amount} lbs</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-semibold">${waste.cost}</div>
                    <div className="text-xs text-slate-400">cost</div>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-600">
                <div className="flex justify-between text-white font-semibold">
                  <span>Total Waste Today:</span>
                  <span className="text-red-400">${wasteData.reduce((sum, w) => sum + w.cost, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}