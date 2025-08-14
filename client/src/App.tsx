import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Pricing from "@/pages/pricing";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Recipes from "@/pages/recipes";
import Vendors from "@/pages/vendors";
import PurchaseOrders from "@/pages/purchase-orders";
import Reports from "@/pages/reports";
import WasteTracking from "@/pages/waste-tracking";
import PosIntegration from "@/pages/pos-integration";
import Analytics from "@/pages/analytics";
import BarcodeTest from "@/pages/barcode-test";
import Settings from "@/pages/settings";
import InvoiceProcessing from "@/pages/invoice-processing";
import CostMonitoring from "@/pages/cost-monitoring";
import BusinessIntelligence from "@/pages/business-intelligence";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/pricing" component={Pricing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <LocationProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-orange-400 blur-3xl"></div>
          <div className="absolute top-40 right-32 w-24 h-24 rounded-full bg-green-400 blur-2xl"></div>
          <div className="absolute bottom-32 left-1/3 w-40 h-40 rounded-full bg-yellow-400 blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 rounded-full bg-red-400 blur-2xl"></div>
        </div>
        
        <div className="relative z-10 flex w-full">
          <Sidebar 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen} 
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            <main className="flex-1 overflow-y-auto">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/inventory" component={Inventory} />
                <Route path="/recipes" component={Recipes} />
                <Route path="/vendors" component={Vendors} />
                <Route path="/purchase-orders" component={PurchaseOrders} />
                <Route path="/waste-tracking" component={WasteTracking} />
                <Route path="/pos-integration" component={PosIntegration} />
                <Route path="/analytics" component={Analytics} />
                <Route path="/reports" component={Analytics} />
                <Route path="/invoice-processing" component={InvoiceProcessing} />
                <Route path="/cost-monitoring" component={CostMonitoring} />
                <Route path="/business-intelligence" component={BusinessIntelligence} />
                <Route path="/barcode-test" component={BarcodeTest} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </div>
    </LocationProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
