import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, BarChart3, Package, Receipt, Truck, Users, Shield, Smartphone, DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Schema.org structured data for better SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Restaurant Inventory Management Software - RestroFlow",
          "description": "Professional restaurant inventory management software with real-time food cost tracking, recipe costing, and waste reduction features.",
          "mainEntity": {
            "@type": "SoftwareApplication",
            "name": "RestroFlow",
            "applicationCategory": "Restaurant Management Software",
            "operatingSystem": "Web-based"
          }
        })
      }} />
      
      <div className="container mx-auto px-4 py-16">
        {/* SEO-Optimized Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Utensils className="h-12 w-12 text-primary-600 mr-3" />
            <h1 className="text-5xl font-bold text-gray-900">
              Restaurant Inventory Management Software
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-primary-700 mb-4">
            RestroFlow - The Complete Solution for Food Cost Control
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Streamline your restaurant operations with our comprehensive <strong>inventory management software</strong>. 
            Track food costs in real-time, manage vendors efficiently, reduce waste by up to 30%, 
            and optimize your menu pricing with precise <strong>recipe costing tools</strong>.
          </p>
          
          {/* Key Benefits Banner */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              ✓ Reduce Food Costs by 15-30%
            </span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              ✓ Real-Time Inventory Tracking
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
              ✓ Multi-Location Support
            </span>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
              ✓ POS Integration
            </span>
          </div>
        </header>

        {/* Main Features Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose RestroFlow Inventory Management Software?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our restaurant inventory software is designed specifically for food service businesses, 
              helping you control costs, reduce waste, and maximize profitability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary-500">
              <CardHeader>
                <Package className="h-8 w-8 text-primary-600 mb-2" />
                <CardTitle>Real-Time Inventory Tracking</CardTitle>
                <CardDescription>
                  Advanced <strong>inventory management system</strong> that tracks ingredients and finished goods in real-time. 
                  Get instant low stock alerts, automated reorder points, and precise inventory valuation for better cost control.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <CardHeader>
                <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Recipe Costing & Profit Analysis</CardTitle>
                <CardDescription>
                  Calculate exact food costs per dish with our <strong>recipe costing software</strong>. 
                  Track ingredient price changes, analyze profit margins, and optimize menu pricing for maximum profitability.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardHeader>
                <Truck className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Vendor & Purchase Order Management</CardTitle>
                <CardDescription>
                  Streamline your supply chain with comprehensive <strong>vendor management tools</strong>. 
                  Create purchase orders, track deliveries, compare supplier prices, and maintain optimal inventory levels.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>Advanced Analytics & Reporting</CardTitle>
                <CardDescription>
                  Powerful <strong>restaurant analytics software</strong> with detailed reports on food costs, 
                  waste tracking, inventory turnover, and profitability. Export data for accounting and management review.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
              <CardHeader>
                <Shield className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle>Multi-Location & User Management</CardTitle>
                <CardDescription>
                  Enterprise-grade <strong>restaurant management software</strong> with role-based permissions, 
                  multi-location support, and secure authentication. Perfect for restaurant chains and franchise operations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-teal-500">
              <CardHeader>
                <Smartphone className="h-8 w-8 text-teal-600 mb-2" />
                <CardTitle>Mobile-First Design & POS Integration</CardTitle>
                <CardDescription>
                  Access your <strong>inventory management system</strong> anywhere with our mobile-responsive design. 
                  Seamless integration with popular POS systems including Clover, SpotOn, and more.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20 bg-white rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Proven Results for Restaurant Inventory Management
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of restaurants that have improved their bottom line with RestroFlow
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="p-6">
              <div className="text-3xl font-bold text-primary-600 mb-2">30%</div>
              <div className="text-sm text-gray-600">Average Food Waste Reduction</div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-green-600 mb-2">15%</div>
              <div className="text-sm text-gray-600">Average Cost Savings</div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">2hrs</div>
              <div className="text-sm text-gray-600">Daily Time Saved on Inventory</div>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">99%</div>
              <div className="text-sm text-gray-600">Inventory Accuracy Rate</div>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Stop Losing Money on Food Costs
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Overstocking & Food Waste</h3>
                    <p className="text-gray-600">Manual inventory tracking leads to overordering and spoilage</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Inaccurate Recipe Costing</h3>
                    <p className="text-gray-600">Without precise costing, you can't optimize menu pricing</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Time-Consuming Manual Processes</h3>
                    <p className="text-gray-600">Hours spent on spreadsheets instead of growing your business</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">RestroFlow Solution</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                  <span>Automated inventory tracking with real-time updates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                  <span>Precise recipe costing with automatic price updates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                  <span>Streamlined workflows saving hours every week</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                  <span>Comprehensive analytics for data-driven decisions</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="mb-16">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                Start Optimizing Your Restaurant Inventory Today
              </CardTitle>
              <CardDescription className="text-lg text-gray-700 max-w-2xl mx-auto">
                Join thousands of restaurants using RestroFlow to reduce food costs, eliminate waste, 
                and maximize profitability with our comprehensive <strong>inventory management software</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <Button 
                  size="lg" 
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 text-lg font-semibold"
                  onClick={() => window.location.href = '/api/login'}
                >
                  Start Free Trial - Sign In Now
                </Button>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Setup in under 15 minutes</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 max-w-lg mx-auto">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>No contracts</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-500">✓</span>
                  <span>24/7 support</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SEO-Rich Footer */}
        <footer className="text-center mt-20 border-t border-gray-200 pt-12">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              RestroFlow - Restaurant Inventory Management Software
            </h3>
            <p className="text-gray-600 max-w-3xl mx-auto text-sm leading-relaxed">
              RestroFlow is the leading <strong>restaurant inventory management software</strong> designed specifically for 
              food service businesses. Our comprehensive platform includes real-time inventory tracking, 
              recipe costing, vendor management, waste tracking, and advanced analytics. 
              Perfect for restaurants, cafes, bars, and multi-location food service operations.
            </p>
          </div>
          
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <span>Restaurant Inventory Software</span>
              <span>•</span>
              <span>Food Cost Management</span>
              <span>•</span>
              <span>Recipe Costing Tools</span>
              <span>•</span>
              <span>Vendor Management</span>
              <span>•</span>
              <span>POS Integration</span>
              <span>•</span>
              <span>Multi-Location Support</span>
            </div>
          </div>
          
          <div className="text-gray-500 text-sm">
            <p>&copy; 2025 RestroFlow. The complete restaurant inventory management solution for modern food service businesses.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
