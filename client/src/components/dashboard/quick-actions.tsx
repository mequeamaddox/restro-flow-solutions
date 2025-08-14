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
      className: "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-lg",
    },
    {
      title: "Scan Barcode",
      icon: ScanLine,
      href: "#",
      className: "bg-slate-700/50 text-orange-400 border border-orange-400/50 hover:bg-orange-400/10",
    },
    {
      title: "Create Purchase Order",
      icon: ShoppingCart,
      href: "/purchase-orders",
      className: "bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 hover:text-white",
    },
    {
      title: "Export Report",
      icon: FileText,
      href: "/analytics",
      className: "bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 hover:text-white",
    },
  ];

  return (
    <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            
            return (
              <Link key={index} href={action.href}>
                <Button 
                  className={`w-full justify-center transition-all duration-300 transform hover:scale-105 ${action.className}`}
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
