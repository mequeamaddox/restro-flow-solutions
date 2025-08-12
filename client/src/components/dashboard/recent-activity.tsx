import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, ShoppingCart, Trash2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Mock activity data - in a real app this would come from an API
const mockActivities = [
  {
    id: 1,
    type: 'add',
    description: 'Added Organic Chicken Breast to inventory',
    user: 'John Doe',
    timestamp: '2 minutes ago',
    icon: Plus,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    id: 2,
    type: 'edit',
    description: 'Updated price for Salmon Fillet',
    user: 'Sarah Wilson',
    timestamp: '15 minutes ago',
    icon: Edit,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 3,
    type: 'purchase',
    description: 'Created purchase order #PO-001',
    user: 'Mike Johnson',
    timestamp: '1 hour ago',
    icon: ShoppingCart,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    id: 4,
    type: 'waste',
    description: 'Logged waste: 5 lbs lettuce',
    user: 'John Doe',
    timestamp: '3 hours ago',
    icon: Trash2,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-100',
  },
];

export default function RecentActivity() {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const Icon = activity.icon;
            
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 ${activity.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`${activity.iconColor} text-xs h-4 w-4`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {activity.timestamp} • {activity.user}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {mockActivities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No recent activity</h3>
            <p className="text-xs text-gray-500">Activity will appear here as you use the system.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
