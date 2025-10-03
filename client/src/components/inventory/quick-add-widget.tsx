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
          window.location.href = "/auth";
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
          <p className="text-sm text-muted-foreground">Select a location to use quick-add</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center">
              <Camera className="h-5 w-5 mr-2 text-blue-500" />
              <span className="text-white">Quick Add Inventory</span>
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
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!currentLocation}
            data-testid="button-scan-barcode"
          >
            <Camera className="h-5 w-5 mr-2" />
            Scan Barcode to Add Item
          </Button>

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-white">Scanned Items</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-slate-300 hover:text-white"
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
                      item.status === 'success' && "border-green-600 bg-green-950/30",
                      item.status === 'error' && "border-red-600 bg-red-950/30",
                      item.status === 'adding' && "border-blue-600 bg-blue-950/30",
                      item.status === 'pending' && "border-slate-600 bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className="text-xs font-mono text-slate-400">{item.barcode}</span>
                      </div>
                      {item.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.barcode)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
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
                          className="text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            value={item.quantity}
                            onChange={(e) => updateItem(item.barcode, 'quantity', e.target.value)}
                            placeholder="Qty"
                            type="number"
                            className="text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          />
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(item.barcode, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          />
                          <Input
                            value={item.costPerUnit}
                            onChange={(e) => updateItem(item.barcode, 'costPerUnit', e.target.value)}
                            placeholder="Cost"
                            type="number"
                            step="0.01"
                            className="text-sm bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          />
                        </div>
                        <Button
                          onClick={() => addToInventory(item)}
                          size="sm"
                          className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={!item.name || !item.quantity || !item.costPerUnit}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to Inventory
                        </Button>
                      </div>
                    )}

                    {!isExpanded && (
                      <div className="text-sm">
                        <p className="font-medium truncate text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          {item.quantity} {item.unit} @ ${item.costPerUnit}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bulk Actions */}
              {(pendingCount > 0 || successCount > 0) && (
                <div className="flex space-x-2 pt-2 border-t border-slate-600">
                  {pendingCount > 0 && (
                    <Button
                      onClick={addAllToInventory}
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Add All ({pendingCount})
                    </Button>
                  )}
                  {successCount > 0 && (
                    <Button
                      onClick={clearCompleted}
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      Clear Done ({successCount})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location Indicator */}
          <div className="text-xs text-slate-400 text-center">
            Adding to: <span className="text-blue-400 font-medium">{currentLocation.name}</span>
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