import { useLocation } from "@/contexts/LocationContext";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LocationBanner() {
  const { currentLocation } = useLocation();

  if (!currentLocation) {
    return (
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-xl backdrop-blur-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <MapPin className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-200">
              Please select a location from the sidebar to view inventory data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant': return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-400/30';
      case 'bar': return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30';
      case 'cafe': return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border border-green-400/30';
      default: return 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 text-slate-300 border border-slate-400/30';
    }
  };

  return (
    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-l-4 border-orange-400 p-4 mb-6 rounded-r-xl backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 text-orange-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-white">
              Current Location: {currentLocation.name}
            </h3>
            <p className="text-xs text-orange-200">
              {currentLocation.address || 'No address provided'}
            </p>
          </div>
        </div>
        <Badge className={cn("text-xs px-3 py-1 rounded-full", getLocationTypeColor(currentLocation.type))}>
          {currentLocation.type.charAt(0).toUpperCase() + currentLocation.type.slice(1)}
        </Badge>
      </div>
    </div>
  );
}