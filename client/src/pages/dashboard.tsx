import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, TrendingUp, Trash2 } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import MetricsCards from "@/components/dashboard/metrics-cards";
import LowStockAlerts from "@/components/dashboard/low-stock-alerts";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickActions from "@/components/dashboard/quick-actions";
import InventoryTable from "@/components/inventory/inventory-table";
import LocationBanner from "@/components/location/location-banner";
import QuickAddDashboard from "@/components/dashboard/quick-add-dashboard";

export default function Dashboard() {
  const { currentLocation } = useLocation();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics', currentLocation?.id],
    enabled: !!currentLocation,
  });

  const { data: lowStockItems = [], isLoading: lowStockLoading } = useQuery({
    queryKey: ['/api/inventory/low-stock', currentLocation?.id],
    enabled: !!currentLocation,
  });

  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/inventory', currentLocation?.id],
    enabled: !!currentLocation,
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Location Banner */}
      <LocationBanner />
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-300">
          {currentLocation ? `Overview of ${currentLocation.name} inventory` : 'Select a location to view dashboard'}
        </p>
      </div>

      {/* Key Metrics */}
      <MetricsCards metrics={metrics} isLoading={metricsLoading} />

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Trends Chart Placeholder */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Weekly Usage Trends</CardTitle>
              <select className="text-sm border border-slate-600 bg-slate-700/50 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-slate-700/30 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-300">Chart visualization will be implemented</p>
                  <p className="text-sm text-slate-400 mt-2">Shows ingredient usage over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <QuickActions />
          <QuickAddDashboard />
        </div>
      </div>

      {/* Low Stock Alerts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockAlerts items={lowStockItems} isLoading={lowStockLoading} />
        <RecentActivity />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryTable 
            items={inventoryItems} 
            isLoading={inventoryLoading}
            showPagination={true}
            maxItems={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
