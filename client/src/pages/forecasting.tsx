import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { 
  Brain, 
  TrendingUp, 
  Calendar, 
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ChefHat
} from 'lucide-react';

export default function Forecasting() {
  const [selectedItem, setSelectedItem] = useState('ground-beef');
  const [timeRange, setTimeRange] = useState('30d');

  const { data: inventory = [] } = useQuery({
    queryKey: ['/api/inventory'],
  }) as { data: any[] };

  // Mock forecasting data for demonstration
  const forecastData = [
    { date: '2025-08-01', actual: 85, predicted: 82, confidence: 95 },
    { date: '2025-08-02', actual: 92, predicted: 89, confidence: 93 },
    { date: '2025-08-03', actual: 78, predicted: 81, confidence: 91 },
    { date: '2025-08-04', actual: 105, predicted: 102, confidence: 89 },
    { date: '2025-08-05', actual: 88, predicted: 91, confidence: 94 },
    { date: '2025-08-06', actual: null, predicted: 95, confidence: 87 },
    { date: '2025-08-07', actual: null, predicted: 103, confidence: 85 },
    { date: '2025-08-08', actual: null, predicted: 87, confidence: 88 },
    { date: '2025-08-09', actual: null, predicted: 99, confidence: 82 },
    { date: '2025-08-10', actual: null, predicted: 112, confidence: 79 },
  ];

  const demandDrivers = [
    { factor: 'Weather', impact: '+15%', description: 'Hot weather increases beverage demand' },
    { factor: 'Day of Week', impact: '+35%', description: 'Friday-Sunday higher consumption' },
    { factor: 'Events', impact: '+22%', description: 'Local events drive foot traffic' },
    { factor: 'Seasonality', impact: '+8%', description: 'Summer grilling season boost' },
    { factor: 'Promotions', impact: '+42%', description: 'Happy hour specials drive sales' }
  ];

  const forecastAccuracy = {
    overall: 91,
    byCategory: [
      { category: 'Proteins', accuracy: 94, items: 12 },
      { category: 'Vegetables', accuracy: 89, items: 18 },
      { category: 'Beverages', accuracy: 87, items: 24 },
      { category: 'Dry Goods', accuracy: 96, items: 8 },
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-400" />
            Demand Forecasting
          </h1>
          <p className="text-slate-400 mt-2">
            AI-powered demand prediction using sales history, weather, events, and seasonality
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          Enterprise AI
        </Badge>
      </div>

      {/* Forecast Accuracy Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{forecastAccuracy.overall}%</div>
            <div className="text-sm text-slate-400">Overall Accuracy</div>
            <div className="text-xs text-green-400 mt-1">↑ 3% vs last month</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">$8,200</div>
            <div className="text-sm text-slate-400">Cost Savings</div>
            <div className="text-xs text-green-400 mt-1">Reduced waste</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">2.3%</div>
            <div className="text-sm text-slate-400">Stockout Rate</div>
            <div className="text-xs text-green-400 mt-1">↓ 1.2% improvement</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">14 days</div>
            <div className="text-sm text-slate-400">Forecast Horizon</div>
            <div className="text-xs text-slate-400 mt-1">High confidence</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Forecast Display */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Demand Forecast</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ground-beef">Ground Beef</SelectItem>
                  <SelectItem value="chicken-breast">Chicken Breast</SelectItem>
                  <SelectItem value="lettuce">Lettuce</SelectItem>
                  <SelectItem value="craft-beer">Craft Beer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="14d">14 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Actual Usage"
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Predicted Usage"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-slate-300">Actual Usage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 4px)' }}></div>
              <span className="text-slate-300">Predicted Usage</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              <span className="text-slate-300">87% confidence this week</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Drivers */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Demand Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demandDrivers.map((driver, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div>
                    <div className="font-medium text-white">{driver.factor}</div>
                    <div className="text-sm text-slate-400">{driver.description}</div>
                  </div>
                  <Badge variant={driver.impact.includes('+') ? "default" : "secondary"}>
                    {driver.impact}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Forecast Accuracy by Category */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-green-400" />
              Accuracy by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecastAccuracy.byCategory.map((cat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{cat.items} items</span>
                      <Badge variant="outline" className="border-green-500 text-green-400">
                        {cat.accuracy}%
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${cat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights and Recommendations */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <div className="font-semibold text-green-400">Optimization Success</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Your chicken breast orders are perfectly optimized. Current ordering pattern 
                    maintains 97% availability with minimal waste.
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-1" />
                <div>
                  <div className="font-semibold text-yellow-400">Upcoming Demand Spike</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Local food festival this weekend will increase lettuce demand by 45%. 
                    Recommend ordering 30% more on Thursday.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-400 mt-1" />
                <div>
                  <div className="font-semibold text-blue-400">Seasonal Trend</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Ice cream demand typically increases 60% in the next 2 weeks. 
                    Consider adding seasonal flavors to your inventory.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-purple-400 mt-1" />
                <div>
                  <div className="font-semibold text-purple-400">Cost Optimization</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Switching to bi-weekly produce orders could reduce costs by $340/month 
                    while maintaining 95% availability.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}