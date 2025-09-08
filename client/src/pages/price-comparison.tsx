import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter,
  AlertTriangle,
  Star,
  Calendar,
  Truck,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  History
} from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import LocationBanner from "@/components/location/location-banner";

const addVendorPriceSchema = z.object({
  inventoryItemId: z.string().min(1, "Item is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  costPerUnit: z.string().min(1, "Cost per unit is required"),
  unit: z.string().min(1, "Unit is required"),
  minimumOrderQuantity: z.string().optional(),
  leadTimeDays: z.string().optional(),
  isPreferredVendor: z.boolean().default(false),
  notes: z.string().optional(),
});

type AddVendorPriceForm = z.infer<typeof addVendorPriceSchema>;

export default function PriceComparison() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVendorForImport, setSelectedVendorForImport] = useState("");
  const [showImportHistory, setShowImportHistory] = useState(false);
  const { currentLocation } = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddVendorPriceForm>({
    resolver: zodResolver(addVendorPriceSchema),
    defaultValues: {
      inventoryItemId: "",
      vendorId: "",
      costPerUnit: "",
      unit: "lbs",
      minimumOrderQuantity: "1",
      leadTimeDays: "0",
      isPreferredVendor: false,
      notes: "",
    },
  });

  // Fetch price comparison data
  const { data: priceComparison, isLoading } = useQuery({
    queryKey: ['/api/price-comparison', currentLocation?.id],
    enabled: !!currentLocation?.id,
  });

  // Fetch inventory items for the form
  const { data: inventoryItems } = useQuery({
    queryKey: ['/api/inventory', currentLocation?.id],
    enabled: !!currentLocation?.id,
  });

  // Fetch vendors for the form
  const { data: vendors } = useQuery({
    queryKey: ['/api/vendors', currentLocation?.id],
    enabled: !!currentLocation?.id,
  });

  // Fetch price import history
  const { data: priceImports, refetch: refetchImports } = useQuery({
    queryKey: ['/api/price-imports'],
    enabled: showImportHistory,
  });

  const addVendorPriceMutation = useMutation({
    mutationFn: async (data: AddVendorPriceForm) => {
      return apiRequest('POST', '/api/vendor-prices', {
        ...data,
        costPerUnit: parseFloat(data.costPerUnit),
        minimumOrderQuantity: data.minimumOrderQuantity ? parseFloat(data.minimumOrderQuantity) : 1,
        leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-comparison'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Vendor price added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add vendor price",
        variant: "destructive",
      });
    },
  });

  const uploadPriceImportMutation = useMutation({
    mutationFn: async ({ file, vendorId }: { file: File; vendorId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendorId', vendorId);
      
      const response = await fetch('/api/price-imports/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['/api/price-imports'] });
      setIsImportDialogOpen(false);
      setSelectedFile(null);
      setSelectedVendorForImport("");
      toast({
        title: "Success",
        description: `Price import started successfully. Import ID: ${data.importId}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to upload price import: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const filteredComparison = priceComparison?.filter((item: any) =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPotentialSavings = filteredComparison.reduce(
    (sum: number, item: any) => sum + (item.potentialSavings || 0), 
    0
  );

  const itemsWithSavings = filteredComparison.filter((item: any) => (item.potentialSavings || 0) > 0);

  if (!currentLocation) {
    return (
      <div className="container mx-auto p-6">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Location Selected</h2>
            <p className="text-slate-400">Please select a location to view price comparison data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <LocationBanner />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Vendor Price Comparison</h1>
          <p className="text-slate-400 mt-1">Compare prices across vendors to optimize costs</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-add-vendor-price">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor Price
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Vendor Price</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => addVendorPriceMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="inventoryItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Item</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {(inventoryItems as any[])?.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {(vendors as any[])?.map((vendor: any) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
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
                    name="costPerUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost per Unit ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" className="bg-slate-800 border-slate-600" />
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
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-slate-800 border-slate-600" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minimumOrderQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-slate-800 border-slate-600" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="leadTimeDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Time (days)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-slate-800 border-slate-600" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isPreferredVendor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-slate-600"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Preferred Vendor</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={addVendorPriceMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {addVendorPriceMutation.isPending ? "Adding..." : "Add Price"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Import Button */}
        <Button 
          onClick={() => setIsImportDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white" 
          data-testid="button-import-prices"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import Prices
        </Button>

        {/* Import History Button */}
        <Button 
          onClick={() => setShowImportHistory(!showImportHistory)}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-800" 
          data-testid="button-import-history"
        >
          <History className="h-4 w-4 mr-2" />
          Import History
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total Potential Savings</p>
                <p className="text-2xl font-bold text-white">${totalPotentialSavings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Items with Savings</p>
                <p className="text-2xl font-bold text-white">{itemsWithSavings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Filter className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-400">Total Items</p>
                <p className="text-2xl font-bold text-white">{filteredComparison.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Table */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Price Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-400">Loading price comparison...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Item</TableHead>
                    <TableHead className="text-slate-300">Category</TableHead>
                    <TableHead className="text-slate-300">Current Price</TableHead>
                    <TableHead className="text-slate-300">Current Vendor</TableHead>
                    <TableHead className="text-slate-300">Alternative Prices</TableHead>
                    <TableHead className="text-slate-300">Potential Savings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComparison.map((item: any) => (
                    <TableRow key={item.itemId} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="font-medium text-white">{item.itemName}</TableCell>
                      <TableCell className="text-slate-300">
                        {item.categoryName && (
                          <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                            {item.categoryName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        ${parseFloat(item.currentCost || 0).toFixed(2)} / {item.itemUnit}
                      </TableCell>
                      <TableCell className="text-slate-300">{item.currentVendor || "No vendor"}</TableCell>
                      <TableCell>
                        {item.vendorPrices?.length > 0 ? (
                          <div className="space-y-1">
                            {item.vendorPrices.slice(0, 3).map((price: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <span className="text-slate-300">
                                  ${parseFloat(price.costPerUnit).toFixed(2)} / {price.unit}
                                </span>
                                <span className="text-slate-400">({price.vendorName})</span>
                                {price.isPreferredVendor && (
                                  <Star className="h-3 w-3 text-yellow-500" />
                                )}
                              </div>
                            ))}
                            {item.vendorPrices.length > 3 && (
                              <div className="text-xs text-slate-400">
                                +{item.vendorPrices.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No alternative prices</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.potentialSavings > 0 ? (
                          <div className="flex items-center gap-1">
                            <TrendingDown className="h-4 w-4 text-green-500" />
                            <span className="text-green-500 font-medium">
                              ${item.potentialSavings.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredComparison.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No items found</p>
                  <p className="text-sm text-slate-500">Try adjusting your search terms</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Vendor Prices</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Vendor
              </label>
              <Select value={selectedVendorForImport} onValueChange={setSelectedVendorForImport}>
                <SelectTrigger className="bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {vendors?.map((vendor: any) => (
                    <SelectItem key={vendor.id} value={vendor.id} className="text-slate-300">
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload CSV File
              </label>
              <div 
                className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors"
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  const csvFile = files.find(f => f.name.endsWith('.csv'));
                  if (csvFile) setSelectedFile(csvFile);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div className="text-left">
                      <p className="text-slate-300 font-medium">{selectedFile.name}</p>
                      <p className="text-slate-500 text-sm">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-300">Drop CSV file here or click to browse</p>
                    <p className="text-slate-500 text-sm mt-1">CSV format with columns: item_name, price, unit</p>
                  </div>
                )}
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedFile && selectedVendorForImport) {
                  uploadPriceImportMutation.mutate({
                    file: selectedFile,
                    vendorId: selectedVendorForImport
                  });
                }
              }}
              disabled={!selectedFile || !selectedVendorForImport || uploadPriceImportMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploadPriceImportMutation.isPending ? "Importing..." : "Import Prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import History */}
      {showImportHistory && (
        <Card className="bg-slate-900/50 border-slate-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="h-5 w-5" />
              Price Import History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priceImports?.map((importRecord: any) => (
                <div key={importRecord.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {importRecord.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {importRecord.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {importRecord.status === 'processing' && (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium">{importRecord.fileName}</p>
                      <p className="text-slate-500 text-sm">
                        {new Date(importRecord.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        importRecord.status === 'completed' ? 'default' : 
                        importRecord.status === 'failed' ? 'destructive' : 
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {importRecord.status}
                    </Badge>
                    {importRecord.status === 'completed' && (
                      <p className="text-slate-400 text-sm mt-1">
                        {importRecord.matchedItems} matched, {importRecord.priceUpdates} updated
                      </p>
                    )}
                  </div>
                </div>
              )) || (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No import history found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}