import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Plus, Check, X, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import BarcodeScanner from "@/components/barcode/barcode-scanner";
import { cn } from "@/lib/utils";

interface QuickAddItem {
  barcode: string;
  name: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  status: 'pending' | 'adding' | 'success' | 'error';
}

export default function QuickAddWidget() {
  const [items, setItems] = useState<QuickAddItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const { currentLocation } = useLocation();
  const queryClient = useQueryClient();

  const addItemMutation = useMutation({
    mutationFn: async (item: QuickAddItem) => {
      const data = {
        name: item.name,
        barcode: item.barcode,
        quantity: item.quantity,
        unit: item.unit,
        costPerUnit: item.costPerUnit,
        locationId: currentLocation?.id,
        reorderLevel: "0",
      };
      await apiRequest('POST', '/api/inventory', data);
    },
    onSuccess: (_, item) => {
      setItems(prev => prev.map(i => 
        i.barcode === item.barcode ? { ...i, status: 'success' } : i
      ));
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    },
    onError: (error, item) => {
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
      setItems(prev => prev.map(i => 
        i.barcode === item.barcode ? { ...i, status: 'error' } : i
      ));
      toast({
        title: "Error",
        description: `Failed to add ${item.name}`,
        variant: "destructive",
      });
    },
  });

  const handleBarcodeScanned = (barcode: string) => {
    setIsScannerOpen(false);
    
    // Check if barcode already exists
    if (items.some(item => item.barcode === barcode)) {
      toast({
        title: "Duplicate Barcode",
        description: "This barcode is already in the list",
        variant: "destructive",
      });
      return;
    }

    // Add new item with defaults
    const newItem: QuickAddItem = {
      barcode,
      name: `Product ${barcode.slice(-4)}`, // Default name using last 4 digits
      quantity: "1",
      unit: "pieces",
      costPerUnit: "0.00",
      status: 'pending'
    };

    setItems(prev => [...prev, newItem]);
    setIsExpanded(true);
    
    toast({
      title: "Item Added",
      description: "Fill in details and click add to inventory",
    });
  };

  const updateItem = (barcode: string, field: keyof QuickAddItem, value: string) => {
    setItems(prev => prev.map(item => 
      item.barcode === barcode ? { ...item, [field]: value } : item
    ));
  };

  const addToInventory = (item: QuickAddItem) => {
    if (!item.name || !item.quantity || !item.costPerUnit) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setItems(prev => prev.map(i => 
      i.barcode === item.barcode ? { ...i, status: 'adding' } : i
    ));
    addItemMutation.mutate(item);
  };

  const removeItem = (barcode: string) => {
    setItems(prev => prev.filter(item => item.barcode !== barcode));
  };

  const addAllToInventory = () => {
    const pendingItems = items.filter(item => item.status === 'pending');
    pendingItems.forEach(item => addToInventory(item));
  };

  const clearCompleted = () => {
    setItems(prev => prev.filter(item => item.status !== 'success'));
  };

  const getStatusIcon = (status: QuickAddItem['status']) => {
    switch (status) {
      case 'adding':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-400" />;
    }
  };

  const pendingCount = items.filter(item => item.status === 'pending').length;
  const successCount = items.filter(item => item.status === 'success').length;

  if (!currentLocation) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Select a location to use quick-add</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center">
              <Camera className="h-5 w-5 mr-2 text-primary-600" />
              Quick Add Inventory
            </div>
            {items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Scan Button */}
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="w-full h-12 text-base bg-primary-600 hover:bg-primary-700"
            disabled={!currentLocation}
          >
            <Camera className="h-5 w-5 mr-2" />
            Scan Barcode to Add Item
          </Button>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-gray-700">Scanned Items</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </div>

              <div className={cn(
                "space-y-2 transition-all duration-200",
                isExpanded ? "max-h-96 overflow-y-auto" : "max-h-20 overflow-hidden"
              )}>
                {items.map((item) => (
                  <div
                    key={item.barcode}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      item.status === 'success' && "border-green-200 bg-green-50",
                      item.status === 'error' && "border-red-200 bg-red-50",
                      item.status === 'adding' && "border-blue-200 bg-blue-50",
                      item.status === 'pending' && "border-gray-200 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className="text-xs font-mono text-gray-500">{item.barcode}</span>
                      </div>
                      {item.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.barcode)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {isExpanded && item.status === 'pending' && (
                      <div className="space-y-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.barcode, 'name', e.target.value)}
                          placeholder="Product name"
                          className="text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            value={item.quantity}
                            onChange={(e) => updateItem(item.barcode, 'quantity', e.target.value)}
                            placeholder="Qty"
                            type="number"
                            className="text-sm"
                          />
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(item.barcode, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="text-sm"
                          />
                          <Input
                            value={item.costPerUnit}
                            onChange={(e) => updateItem(item.barcode, 'costPerUnit', e.target.value)}
                            placeholder="Cost"
                            type="number"
                            step="0.01"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          onClick={() => addToInventory(item)}
                          size="sm"
                          className="w-full h-8 text-xs"
                          disabled={!item.name || !item.quantity || !item.costPerUnit}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to Inventory
                        </Button>
                      </div>
                    )}

                    {!isExpanded && (
                      <div className="text-sm">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} {item.unit} @ ${item.costPerUnit}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bulk Actions */}
              {(pendingCount > 0 || successCount > 0) && (
                <div className="flex space-x-2 pt-2 border-t border-gray-100">
                  {pendingCount > 0 && (
                    <Button
                      onClick={addAllToInventory}
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Add All ({pendingCount})
                    </Button>
                  )}
                  {successCount > 0 && (
                    <Button
                      onClick={clearCompleted}
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs"
                    >
                      Clear Done ({successCount})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location Indicator */}
          <div className="text-xs text-gray-500 text-center">
            Adding to: {currentLocation.name}
          </div>
        </CardContent>
      </Card>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}