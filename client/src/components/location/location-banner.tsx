import { useLocation } from "@/contexts/LocationContext";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LocationBanner() {
  const { currentLocation } = useLocation();

  if (!currentLocation) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <MapPin className="h-5 w-5 text-amber-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              Please select a location from the sidebar to view inventory data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant': return 'bg-blue-100 text-blue-800';
      case 'bar': return 'bg-purple-100 text-purple-800';
      case 'cafe': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-primary-50 border-l-4 border-primary-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <MapPin className="h-5 w-5 text-primary-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-primary-800">
              Current Location: {currentLocation.name}
            </h3>
            <p className="text-xs text-primary-600">
              {currentLocation.address || 'No address provided'}
            </p>
          </div>
        </div>
        <Badge className={cn("text-xs", getLocationTypeColor(currentLocation.type))}>
          {currentLocation.type.charAt(0).toUpperCase() + currentLocation.type.slice(1)}
        </Badge>
      </div>
    </div>
  );
}