import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: lowStockItems } = useQuery({
    queryKey: ['/api/inventory/low-stock'],
  });

  const lowStockCount = lowStockItems?.length || 0;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 lg:ml-0">
      <div className="flex items-center justify-between px-4 py-4 lg:px-6 lg:ml-0">
        <div className="flex items-center lg:ml-0">
          {/* Title is handled by individual pages */}
        </div>
        
        <div className="flex items-center space-x-4">
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
