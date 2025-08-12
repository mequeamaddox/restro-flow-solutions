import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, TrendingUp, DollarSign, Package } from "lucide-react";
import { DateRange } from "react-day-picker";

export default function Reports() {
  const [reportType, setReportType] = useState("inventory-valuation");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: inventoryItems } = useQuery({
    queryKey: ['/api/inventory'],
  });

  const { data: wasteStats } = useQuery({
    queryKey: ['/api/waste/stats'],
  });

  const reportTypes = [
    { value: "inventory-valuation", label: "Inventory Valuation", icon: DollarSign },
    { value: "low-stock", label: "Low Stock Items", icon: Package },
    { value: "waste-tracking", label: "Waste Analysis", icon: TrendingUp },
    { value: "usage-trends", label: "Usage Trends", icon: BarChart3 },
  ];

  const handleExport = (format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log(`Exporting ${reportType} as ${format}`);
  };

  const calculateInventoryValue = () => {
    if (!inventoryItems) return 0;
    return inventoryItems.reduce((total, item) => {
      return total + (parseFloat(item.quantity) * parseFloat(item.costPerUnit));
    }, 0);
  };

  const getLowStockItems = () => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(item => 
      parseFloat(item.quantity) <= parseFloat(item.reorderLevel)
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate insights and export data</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <DatePickerWithRange 
              date={dateRange} 
              setDate={setDateRange}
              placeholder="Select date range"
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportType === "inventory-valuation" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary-600" />
                <span>Inventory Valuation Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">
                    ${calculateInventoryValue().toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Inventory Value</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {inventoryItems?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {getLowStockItems().length}
                  </div>
                  <div className="text-sm text-gray-600">Low Stock Items</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Items by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryItems?.slice(0, 10).map((item) => {
                  const value = parseFloat(item.quantity) * parseFloat(item.costPerUnit);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} {item.unit} × ${parseFloat(item.costPerUnit).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${value.toFixed(2)}</div>
                        {parseFloat(item.quantity) <= parseFloat(item.reorderLevel) && (
                          <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "low-stock" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span>Low Stock Alert Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getLowStockItems().length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All items are well stocked</h3>
                <p className="text-gray-600">No items are currently below their reorder levels.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getLowStockItems().map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        Current: {item.quantity} {item.unit} | Reorder at: {item.reorderLevel} {item.unit}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">Low Stock</Badge>
                      <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
                        Reorder
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportType === "waste-tracking" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <span>Waste Analysis Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  ${wasteStats?.totalCost?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-gray-600">Total Waste Cost</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {wasteStats?.totalEntries || 0}
                </div>
                <div className="text-sm text-gray-600">Waste Entries</div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Detailed waste tracking data will be displayed here. This includes waste by category, 
                reasons for waste, and trends over time.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === "usage-trends" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Usage Trends Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart visualization will be implemented</p>
                <p className="text-sm text-gray-400 mt-2">Shows ingredient usage trends over time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
