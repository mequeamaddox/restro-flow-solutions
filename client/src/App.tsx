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
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <LocationProvider>
      <div className="flex h-screen bg-gray-50">
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
              <Route path="/barcode-test" component={BarcodeTest} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </main>
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
