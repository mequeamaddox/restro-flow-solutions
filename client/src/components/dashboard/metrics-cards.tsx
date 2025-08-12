import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertTriangle, TrendingUp, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardMetrics {
  totalInventoryValue: number;
  lowStockCount: number;
  weeklyWaste: number;
  foodCostPercentage: number;
}

interface MetricsCardsProps {
  metrics?: DashboardMetrics;
  isLoading: boolean;
}

export default function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Inventory Value",
      value: `$${Number(metrics?.totalInventoryValue || 0).toLocaleString()}`,
      icon: DollarSign,
      iconColor: "text-primary-600",
      bgColor: "bg-primary-100",
    },
    {
      title: "Low Stock Items",
      value: Number(metrics?.lowStockCount || 0),
      icon: AlertTriangle,
      iconColor: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Food Cost %",
      value: `${Number(metrics?.foodCostPercentage || 0).toFixed(1)}%`,
      icon: TrendingUp,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Weekly Waste",
      value: `$${Number(metrics?.weeklyWaste || 0).toFixed(0)}`,
      icon: Trash2,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`${card.iconColor} text-xl h-6 w-6`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {card.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
