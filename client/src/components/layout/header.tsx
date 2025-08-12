import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, MapPin, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@/contexts/LocationContext";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { currentLocation, setCurrentLocation, locations } = useLocation();

  const { data: lowStockItems } = useQuery({
    queryKey: ['/api/inventory/low-stock'],
  });

  const lowStockCount = (lowStockItems as any[])?.length || 0;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-4 lg:px-6">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden mr-2"
            onClick={onMobileMenuToggle}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          {/* App title on mobile */}
          <div className="lg:hidden">
            <h1 className="text-lg font-semibold text-gray-900">RestroFlow</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Location Selector - Hidden on mobile, shown in sidebar */}
          <div className="hidden lg:flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <Select 
              value={currentLocation?.id} 
              onValueChange={(value) => {
                const location = locations.find(l => l.id === value);
                if (location) setCurrentLocation(location);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search - Hidden on mobile, shown on md+ */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search inventory..."
              className="pl-10 pr-4 py-2 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5 text-gray-400" />
              {lowStockCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {lowStockCount > 99 ? '99+' : lowStockCount}
                </Badge>
              )}
            </Button>
          </div>
          
          {/* Mobile search button */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Search className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
      </div>
    </header>
  );
}
