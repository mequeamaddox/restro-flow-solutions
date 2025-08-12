import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ScanLine, ShoppingCart, FileText } from "lucide-react";
import { Link } from "wouter";

export default function QuickActions() {
  const actions = [
    {
      title: "Add Inventory Item",
      icon: Plus,
      href: "/inventory",
      className: "bg-primary-600 text-white hover:bg-primary-700",
    },
    {
      title: "Scan Barcode",
      icon: ScanLine,
      href: "#",
      className: "bg-white text-primary-600 border border-primary-600 hover:bg-primary-50",
    },
    {
      title: "Create Purchase Order",
      icon: ShoppingCart,
      href: "/purchase-orders",
      className: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    },
    {
      title: "Export Report",
      icon: FileText,
      href: "/reports",
      className: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <Link key={index} href={action.href}>
                <Button 
                  className={`w-full justify-center transition-colors ${action.className}`}
                  variant={index === 0 ? "default" : "outline"}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {action.title}
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
