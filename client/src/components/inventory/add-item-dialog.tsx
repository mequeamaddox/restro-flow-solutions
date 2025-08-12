import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertInventoryItemSchema, type InsertInventoryItem, type Category, type Vendor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "@/contexts/LocationContext";
import { Checkbox } from "@/components/ui/checkbox";
import { ScanLine, Camera } from "lucide-react";
import BarcodeScanner from "@/components/barcode/barcode-scanner";
import { useState } from "react";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  vendors: Vendor[];
}

export default function AddItemDialog({ isOpen, onClose, onSuccess, categories, vendors }: AddItemDialogProps) {
  const { toast } = useToast();
  const { currentLocation } = useLocation();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const form = useForm<InsertInventoryItem>({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: {
      name: "",
      description: undefined,
      categoryId: undefined,
      locationId: currentLocation?.id || "",
      quantity: "0",
      unit: "lbs",
      costPerUnit: "0",
      reorderLevel: "0",
      vendorId: undefined,
      barcode: undefined,
      alcoholContent: undefined,
      isAlcoholic: false,
      bottleSize: undefined,
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      await apiRequest('POST', '/api/inventory', data);
    },
    onSuccess: () => {
      onSuccess();
      form.reset();
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
        description: "Failed to create inventory item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInventoryItem) => {
    createItemMutation.mutate(data);
  };

  const handleBarcodeScanned = (barcode: string) => {
    form.setValue("barcode", barcode);
    setIsScannerOpen(false);
    toast({
      title: "Barcode Scanned",
      description: `Barcode ${barcode} added to the form`,
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Chicken Breast" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.length > 0 ? (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-categories" disabled>
                            No categories available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="25.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lbs">lbs</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="gallons">gallons</SelectItem>
                        <SelectItem value="pieces">pieces</SelectItem>
                        <SelectItem value="cases">cases</SelectItem>
                        <SelectItem value="boxes">boxes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per Unit *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="8.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.length > 0 ? (
                          vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-vendors" disabled>
                            No vendors available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorderLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="5.0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode (Optional)</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input placeholder="Scan or enter barcode" {...field} className="flex-1" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      placeholder="Additional details about the item..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createItemMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {createItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      
      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </Dialog>
  );
}
