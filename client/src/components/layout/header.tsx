import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, MapPin, Menu, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@assets/IMG_20250812_004328_1754973838131.png";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { currentLocation, setCurrentLocation, locations } = useLocation();
  const { user } = useAuth();

  const { data: lowStockItems } = useQuery({
    queryKey: ['/api/inventory/low-stock'],
  });

  // Get employee profile for location filtering
  const userId = (user as any)?.id || (user as any)?.claims?.sub;
  const isEmployee = (user as any)?.role === 'employee';
  const { data: employeeProfile } = useQuery({
    queryKey: [`/api/employees/${userId}/profile`],
    enabled: !!userId && isEmployee,
  });

  // Filter locations for employees - they should only see their assigned location
  const availableLocations = isEmployee && (employeeProfile as any)?.employee?.department?.location 
    ? [(employeeProfile as any).employee.department.location] 
    : locations;

  const lowStockCount = (lowStockItems as any[])?.length || 0;

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm shadow-2xl border-b border-slate-700/50 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-4 lg:px-6">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden mr-2 text-slate-300 hover:text-white hover:bg-slate-700/50"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          {/* App logo and title on mobile */}
          <div className="lg:hidden flex items-center">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 mr-2 shadow-lg">
              <Search className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-white">RestroFlow</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Location Selector - Hidden for employees */}
          {!isEmployee && (
            <div className="hidden lg:flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <Select 
                value={currentLocation?.id} 
                onValueChange={(value) => {
                  const location = locations.find(l => l.id === value);
                  if (location) setCurrentLocation(location);
                }}
              >
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600 text-slate-200">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search - Hidden for employees */}
          {!isEmployee && (
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search inventory..."
                className="pl-10 pr-4 py-2 w-64 bg-slate-800/50 border-slate-600 text-slate-200 placeholder-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative text-slate-300 hover:text-white hover:bg-slate-700/50">
              <Bell className="h-5 w-5" />
              {lowStockCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-gradient-to-r from-orange-500 to-red-600"
                >
                  {lowStockCount > 99 ? '99+' : lowStockCount}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* Mobile search button - Hidden for employees */}
          {!isEmployee && (
            <Button variant="ghost" size="sm" className="md:hidden text-slate-300 hover:text-white hover:bg-slate-700/50">
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
