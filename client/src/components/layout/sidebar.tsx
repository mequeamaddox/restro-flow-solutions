import { useState } from "react";
import { Link, useLocation as useWouterLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/contexts/LocationContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LayoutDashboard, 
  Package, 
  ChefHat, 
  ShoppingCart, 
  Building2, 
  BarChart3, 
  Trash2, 
  Settings,
  Menu,
  X,
  Utensils,
  CreditCard,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Recipes', href: '/recipes', icon: ChefHat },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Waste Tracking', href: '/waste-tracking', icon: Trash2 },
  { name: 'POS Integration', href: '/pos-integration', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({ isMobileMenuOpen = false, setIsMobileMenuOpen }: SidebarProps = {}) {
  const [currentPath] = useWouterLocation();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { currentLocation, setCurrentLocation, locations, isLoading } = useLocation();
  
  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = isMobileMenuOpen || internalMobileMenuOpen;
  const setMobileMenuOpen = setIsMobileMenuOpen || setInternalMobileMenuOpen;

  return (
    <>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <Utensils className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-primary-800">RestroFlow</h1>
              <p className="text-sm text-gray-600">Inventory Management</p>
            </div>
          </div>
          
          {/* Location Switcher */}
          <div className="space-y-2">
            <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              <MapPin className="h-3 w-3 mr-1" />
              Current Location
            </div>
            <Select 
              value={currentLocation?.id || ""} 
              onValueChange={(value) => {
                const location = locations.find(loc => loc.id === value);
                if (location) setCurrentLocation(location);
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center">
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        location.type === 'restaurant' ? 'bg-blue-500' : 
                        location.type === 'bar' ? 'bg-purple-500' : 'bg-gray-500'
                      )}></div>
                      {location.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = currentPath === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer",
                        isActive && "bg-primary-50 border-r-4 border-primary-500 text-primary-700"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {(user as any)?.firstName ? (user as any).firstName.charAt(0) : (user as any)?.email?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {(user as any)?.firstName || (user as any)?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {(user as any)?.role || 'Staff'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
