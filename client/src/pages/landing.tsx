import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, BarChart3, Package, Receipt, Truck, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Utensils className="h-12 w-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">RestroFlow Inventory</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive restaurant inventory management system with recipe costing, vendor management, and real-time analytics.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Package className="h-8 w-8 text-primary-600 mb-2" />
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Track ingredients and finished goods in real-time with low stock alerts and automated reorder suggestions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Receipt className="h-8 w-8 text-primary-600 mb-2" />
              <CardTitle>Recipe Costing</CardTitle>
              <CardDescription>
                Calculate precise costs per dish and profit margins based on current ingredient prices.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Truck className="h-8 w-8 text-primary-600 mb-2" />
              <CardTitle>Vendor Management</CardTitle>
              <CardDescription>
                Manage supplier relationships, create purchase orders, and track deliveries efficiently.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary-600 mb-2" />
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Get insights into food costs, waste tracking, and inventory valuation with exportable reports.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-8 w-8 text-primary-600 mb-2" />
              <CardTitle>Multi-User Access</CardTitle>
              <CardDescription>
                Role-based permissions for admins, managers, and staff with secure authentication.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Package className="h-8 w-8 text-primary-600 mb-2" />
              <CardTitle>Mobile Ready</CardTitle>
              <CardDescription>
                Responsive design works seamlessly on desktop and mobile devices for on-the-go access.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Ready to streamline your inventory?</CardTitle>
            <CardDescription>
              Sign in to access your restaurant's inventory management dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button 
              size="lg" 
              className="bg-primary-600 hover:bg-primary-700"
              onClick={() => window.location.href = '/api/login'}
            >
              Sign In to Get Started
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2024 RestroFlow Inventory. Built for modern restaurants.</p>
        </div>
      </div>
    </div>
  );
}
