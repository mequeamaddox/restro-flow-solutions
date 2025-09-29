import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3,
  Menu,
  Clock,
  MessageSquare,
  Calendar,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

export default function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const [currentPath, navigate] = useLocation();
  const { user } = useAuth();
  
  const isEmployee = (user as any)?.role === 'employee';

  const adminNavItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Orders', href: '/purchase-orders', icon: ShoppingCart },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Menu', icon: Menu, onClick: onMenuClick },
  ];

  const employeeNavItems = [
    { name: 'Home', href: '/employee/dashboard', icon: Home },
    { name: 'Clock', href: '/employee/time-clock', icon: Clock },
    { name: 'Schedule', href: '/employee/schedule', icon: Calendar },
    { name: 'Messages', href: '/employee/messages', icon: MessageSquare },
    { name: 'Menu', icon: Menu, onClick: onMenuClick },
  ];

  const navItems = isEmployee ? employeeNavItems : adminNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-800/95 backdrop-blur-md border-t border-slate-700/50 lg:hidden shadow-2xl">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.href && (
            currentPath === item.href || 
            (isEmployee && currentPath === '/' && item.href === '/employee/dashboard')
          );
          const Icon = item.icon;
          
          if (item.onClick) {
            return (
              <button
                key={item.name}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-white transition-colors duration-200",
                  "active:bg-slate-700/50"
                )}
                data-testid={`button-mobile-nav-${item.name.toLowerCase()}`}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          }

          return (
            <button
              key={item.name}
              onClick={() => item.href && navigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200",
                isActive 
                  ? "text-orange-400" 
                  : "text-slate-400 hover:text-white",
                "active:bg-slate-700/50"
              )}
              data-testid={`button-mobile-nav-${item.name.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className="h-6 w-6 mb-1" />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-400 rounded-full"></div>
                )}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
