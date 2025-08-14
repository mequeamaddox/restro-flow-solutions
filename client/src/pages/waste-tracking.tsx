import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, AlertTriangle, DollarSign, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWasteEntrySchema, type InsertWasteEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useLocation } from "@/contexts/LocationContext";

export default function WasteTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentLocation } = useLocation();

  const { data: wasteEntries, isLoading } = useQuery({
    queryKey: ['/api/waste', currentLocation?.id],
    queryFn: () => {
      const params = currentLocation?.id ? `?locationId=${currentLocation.id}` : '';
      return fetch(`/api/waste${params}`, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json());
    },
    enabled: !!currentLocation,
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ['/api/inventory', currentLocation?.id],
    queryFn: () => {
      const params = currentLocation?.id ? `?locationId=${currentLocation.id}` : '';
      return fetch(`/api/inventory${params}`, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json());
    },
    enabled: !!currentLocation,
  });

  const { data: wasteStats } = useQuery({
    queryKey: ['/api/waste/stats', currentLocation?.id],
    queryFn: () => {
      const params = currentLocation?.id ? `?locationId=${currentLocation.id}` : '';
      return fetch(`/api/waste/stats${params}`, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json());
    },
    enabled: !!currentLocation,
  });

  const form = useForm<InsertWasteEntry>({
    resolver: zodResolver(insertWasteEntrySchema),
    defaultValues: {
      inventoryItemId: "",
      quantity: "0",
      unit: "",
      reason: "expired",
      cost: "0",
      notes: "",
    },
  });

  const createWasteMutation = useMutation({
    mutationFn: async (data: InsertWasteEntry) => {
      await apiRequest('POST', '/api/waste', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waste'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waste/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Waste entry logged successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to log waste entry",
        variant: "destructive",
      });
    },
  });

  const filteredEntries = wasteEntries?.filter((entry: any) => {
    const matchesSearch = entry.inventoryItem?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesReason = !reasonFilter || entry.reason === reasonFilter;
    return matchesSearch && matchesReason;
  }) || [];

  const onSubmit = (data: InsertWasteEntry) => {
    const selectedItem = inventoryItems?.find(item => item.id === data.inventoryItemId);
    if (selectedItem) {
      const calculatedCost = parseFloat(data.quantity) * parseFloat(selectedItem.costPerUnit);
      createWasteMutation.mutate({
        ...data,
        unit: selectedItem.unit,
        cost: calculatedCost.toString(),
      });
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'expired': return 'bg-red-100 text-red-800';
      case 'spoiled': return 'bg-orange-100 text-orange-800';
      case 'damaged': return 'bg-yellow-100 text-yellow-800';
      case 'overproduction': return 'bg-blue-100 text-blue-800';
      case 'preparation_error': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Waste Tracking</h1>
          <p className="text-gray-600">Monitor and reduce food waste costs</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-600 hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Log Waste
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Log Waste Entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="inventoryItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Item *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inventoryItems?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.quantity} {item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Wasted *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="spoiled">Spoiled</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="overproduction">Overproduction</SelectItem>
                            <SelectItem value="preparation_error">Preparation Error</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional details..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createWasteMutation.isPending}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    {createWasteMutation.isPending ? "Logging..." : "Log Waste"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Waste Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waste Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${wasteStats?.totalCost?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waste Entries</CardTitle>
            <Trash2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wasteStats?.totalEntries || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search waste entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={reasonFilter || "all"} onValueChange={(value) => setReasonFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="spoiled">Spoiled</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="overproduction">Overproduction</SelectItem>
                <SelectItem value="preparation_error">Preparation Error</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Waste Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-20 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredEntries && filteredEntries.length > 0 ? (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium">{entry.inventoryItem.name}</div>
                      <div className="text-sm text-gray-600">
                        {entry.quantity} {entry.unit} wasted • ${parseFloat(entry.cost).toFixed(2)}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getReasonColor(entry.reason)}>
                      {getReasonLabel(entry.reason)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(entry.createdAt!), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No waste entries found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || reasonFilter ? "No entries match your search criteria." : "Start logging waste to track food costs."}
              </p>
              <Button 
                className="bg-primary-600 hover:bg-primary-700"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Waste
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
