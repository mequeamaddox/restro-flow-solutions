import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, MapPin, Settings as SettingsIcon, Trash2, Edit, Save, X, Building2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertLocationSchema, type InsertLocation, type Location } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    defaultLocationId: "",
    currency: "USD",
    timezone: "America/New_York",
  });

  const { toast } = useToast();
  const { user, isLoading: userLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations, isLoading: locationsLoading, error: locationsError } = useQuery({
    queryKey: ["/api/locations"],
    retry: false,
  });

  // Add location form
  const addLocationForm = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      name: "",
      address: "",
      type: "restaurant",
    },
  });

  // Edit location form
  const editLocationForm = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: {
      name: "",
      address: "",
      type: "restaurant",
    },
  });

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      await apiRequest('POST', '/api/locations', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Location added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsAddLocationOpen(false);
      addLocationForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to add location",
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertLocation> }) => {
      await apiRequest('PATCH', `/api/locations/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setEditingLocation(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update location", 
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/locations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  const onAddLocation = (data: InsertLocation) => {
    addLocationMutation.mutate(data);
  };

  const onUpdateLocation = (data: InsertLocation) => {
    if (editingLocation) {
      updateLocationMutation.mutate({
        id: editingLocation.id,
        data,
      });
    }
  };

  const startEditLocation = (location: Location) => {
    setEditingLocation(location);
    editLocationForm.reset({
      name: location.name,
      address: location.address || "",
      type: location.type,
    });
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm("Are you sure you want to delete this location? This action cannot be undone.")) {
      deleteLocationMutation.mutate(id);
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case "restaurant":
        return "bg-blue-100 text-blue-800";
      case "bar":
        return "bg-purple-100 text-purple-800";
      case "warehouse":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your locations and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {(user as any).profileImageUrl && (
                    <img
                      src={(user as any).profileImageUrl}
                      alt="Profile"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium">
                      {(user as any).firstName} {(user as any).lastName}
                    </p>
                    <p className="text-sm text-gray-600">{(user as any).email}</p>
                  </div>
                </div>
                <Separator />
                <div className="text-sm text-gray-600">
                  <p>User ID: {(user as any).id}</p>
                  <p>Joined: {new Date((user as any).createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">Please log in to view profile</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Locations Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Locations
              </CardTitle>
              <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Location</DialogTitle>
                  </DialogHeader>
                  <Form {...addLocationForm}>
                    <form onSubmit={addLocationForm.handleSubmit(onAddLocation)} className="space-y-4">
                      <FormField
                        control={addLocationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Main Restaurant" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addLocationForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="restaurant">Restaurant</SelectItem>
                                <SelectItem value="bar">Bar & Grill</SelectItem>
                                <SelectItem value="warehouse">Warehouse</SelectItem>
                                <SelectItem value="kitchen">Kitchen</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addLocationForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street, City, State" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddLocationOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={addLocationMutation.isPending}
                        >
                          {addLocationMutation.isPending ? "Adding..." : "Add Location"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading locations...</p>
              </div>
            ) : (locations as Location[])?.length > 0 ? (
              <div className="space-y-3">
                {(locations as Location[]).map((location: Location) => (
                  <div key={location.id} className="border rounded-lg p-4">
                    {editingLocation?.id === location.id ? (
                      <Form {...editLocationForm}>
                        <form onSubmit={editLocationForm.handleSubmit(onUpdateLocation)} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FormField
                              control={editLocationForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Location name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editLocationForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="restaurant">Restaurant</SelectItem>
                                      <SelectItem value="bar">Bar & Grill</SelectItem>
                                      <SelectItem value="warehouse">Warehouse</SelectItem>
                                      <SelectItem value="kitchen">Kitchen</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={editLocationForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input placeholder="Address" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingLocation(null)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={updateLocationMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {updateLocationMutation.isPending ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <div>
                              <h3 className="font-medium">{location.name}</h3>
                              {location.address && (
                                <p className="text-sm text-gray-600">{location.address}</p>
                              )}
                            </div>
                            <Badge className={getLocationTypeColor(location.type)}>
                              {location.type}
                            </Badge>
                          </div>

                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditLocation(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No locations added yet</p>
                <p className="text-sm text-gray-500">Add your first location to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="font-medium">Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications" className="text-sm">
                      Email Notifications
                    </Label>
                    <Switch
                      id="email-notifications"
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="low-stock-alerts" className="text-sm">
                      Low Stock Alerts
                    </Label>
                    <Switch
                      id="low-stock-alerts"
                      checked={preferences.lowStockAlerts}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, lowStockAlerts: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* System Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">System</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="currency" className="text-sm">Currency</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(value) =>
                        setPreferences(prev => ({ ...prev, currency: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences(prev => ({ ...prev, timezone: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Default Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Defaults</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="default-location" className="text-sm">Default Location</Label>
                    <Select
                      value={preferences.defaultLocationId}
                      onValueChange={(value) =>
                        setPreferences(prev => ({ ...prev, defaultLocationId: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select default location" />
                      </SelectTrigger>
                      <SelectContent>
                        {(locations as Location[])?.map((location: Location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button>
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}