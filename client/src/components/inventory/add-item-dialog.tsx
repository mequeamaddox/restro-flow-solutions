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
import { ScanLine, Camera, Calculator } from "lucide-react";
import BarcodeScanner from "@/components/barcode/barcode-scanner";
import { useState, useEffect } from "react";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  vendors: Vendor[];
  editingItem?: any;
}

export default function AddItemDialog({ isOpen, onClose, onSuccess, categories, vendors, editingItem }: AddItemDialogProps) {
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
      costPerPurchaseUnit: undefined,
      purchaseUnit: undefined,
      recipeUnit: undefined,
      conversionFactor: undefined,
      servingsPerPurchaseUnit: undefined,
    },
  });

  // Populate form with editing item data
  useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name || "",
        description: editingItem.description ?? undefined,
        categoryId: editingItem.categoryId ?? undefined,
        locationId: editingItem.locationId || currentLocation?.id || "",
        quantity: editingItem.quantity?.toString() || "0",
        unit: editingItem.unit || "lbs",
        costPerUnit: editingItem.costPerUnit?.toString() || "0",
        reorderLevel: editingItem.reorderLevel?.toString() || "0",
        vendorId: editingItem.vendorId ?? undefined,
        barcode: editingItem.barcode ?? undefined,
        alcoholContent: editingItem.alcoholContent?.toString() ?? undefined,
        isAlcoholic: editingItem.isAlcoholic || false,
        bottleSize: editingItem.bottleSize ?? undefined,
        costPerPurchaseUnit: editingItem.costPerPurchaseUnit?.toString() ?? undefined,
        purchaseUnit: editingItem.purchaseUnit ?? undefined,
        recipeUnit: editingItem.recipeUnit ?? undefined,
        conversionFactor: editingItem.conversionFactor?.toString() ?? undefined,
        servingsPerPurchaseUnit: editingItem.servingsPerPurchaseUnit?.toString() ?? undefined,
      });
    } else {
      // Reset to default values when not editing
      form.reset({
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
        costPerPurchaseUnit: undefined,
        purchaseUnit: undefined,
        recipeUnit: undefined,
        conversionFactor: undefined,
        servingsPerPurchaseUnit: undefined,
      });
    }
  }, [editingItem, currentLocation?.id, form]);

  const createItemMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      if (editingItem) {
        await apiRequest('PUT', `/api/inventory/${editingItem.id}`, data);
      } else {
        await apiRequest('POST', '/api/inventory', data);
      }
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
          window.location.href = "/auth";
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </DialogTitle>
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

            {/* Multi-Unit Inventory Tracking Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-4 border-t border-slate-700">
                <Calculator className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-300">Multi-Unit Inventory Tracking</h3>
                <span className="text-xs text-slate-500">(Optional - for advanced cost tracking)</span>
              </div>
              <p className="text-xs text-slate-400">
                Track items in different units for purchasing vs recipes. Example: Buy chicken in 40lb cases, use in recipes by lbs/oz.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchaseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="How you buy this item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="case">case</SelectItem>
                          <SelectItem value="box">box</SelectItem>
                          <SelectItem value="bag">bag</SelectItem>
                          <SelectItem value="bulk">bulk</SelectItem>
                          <SelectItem value="pallet">pallet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPerPurchaseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Purchase Unit</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="45.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="recipeUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="How recipes use this" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lbs">lbs</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="cups">cups</SelectItem>
                          <SelectItem value="tbsp">tbsp</SelectItem>
                          <SelectItem value="tsp">tsp</SelectItem>
                          <SelectItem value="pieces">pieces</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="conversionFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Units per Purchase</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="40" {...field} />
                      </FormControl>
                      <p className="text-xs text-slate-500">How many recipe units in 1 purchase unit</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="servingsPerPurchaseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servings per Purchase</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" placeholder="160" {...field} />
                      </FormControl>
                      <p className="text-xs text-slate-500">Total servings from 1 purchase unit</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createItemMutation.isPending ? 
                  (editingItem ? "Updating..." : "Adding...") : 
                  (editingItem ? "Update Item" : "Add Item")
                }
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
