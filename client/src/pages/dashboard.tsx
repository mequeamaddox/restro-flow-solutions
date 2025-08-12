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
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          {currentLocation ? `Overview of ${currentLocation.name} inventory` : 'Select a location to view dashboard'}
        </p>
      </div>

      {/* Key Metrics */}
      <MetricsCards metrics={metrics} isLoading={metricsLoading} />

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Trends Chart Placeholder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Weekly Usage Trends</CardTitle>
              <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart visualization will be implemented</p>
                  <p className="text-sm text-gray-400 mt-2">Shows ingredient usage over time</p>
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
