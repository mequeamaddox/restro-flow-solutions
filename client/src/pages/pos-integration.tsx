import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings, 
  Plus, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Link2, 
  DollarSign,
  Activity,
  AlertTriangle,
  CreditCard
} from "lucide-react";

interface PosIntegration {
  id: string;
  locationId: string;
  provider: string;
  name: string;
  merchantId: string;
  environment: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface PosSale {
  id: string;
  posOrderId: string;
  total: string;
  orderDate: string;
  inventoryProcessed: boolean;
  items?: Array<{
    itemName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
}

export default function PosIntegration() {
  const { toast } = useToast();
  const { selectedLocation } = useLocation();
  const [newIntegration, setNewIntegration] = useState({
    provider: "spoton" as "spoton" | "clover" | "square" | "toast" | "revel",
    name: "",
    merchantId: "",
    credentials: {
      accessToken: "",
      apiKey: "",
    },
    environment: "sandbox" as "sandbox" | "production",
  });

  // Fetch integrations for current location
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ["/api/pos/integrations", selectedLocation?.id],
    enabled: !!selectedLocation?.id,
  });

  // Fetch recent sales data
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["/api/pos/sales", selectedLocation?.id],
    enabled: !!selectedLocation?.id,
  });

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: async (data: typeof newIntegration) => {
      return apiRequest("/api/clover/integrations", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          locationId: selectedLocation?.id,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Clover integration created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clover/integrations"] });
      setNewIntegration({
        merchantId: "",
        accessToken: "",
        environment: "sandbox",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Clover integration",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return apiRequest(`/api/clover/integrations/${integrationId}/test`, {
        method: "POST",
      });
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.success 
          ? "Successfully connected to Clover API" 
          : "Failed to connect to Clover API. Check your credentials.",
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  // Sync menu items mutation
  const syncMenuItemsMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      return apiRequest(`/api/clover/integrations/${integrationId}/sync`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "Menu items synced successfully from Clover",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clover/integrations"] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync menu items from Clover",
        variant: "destructive",
      });
    },
  });

  // Toggle integration status
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/clover/integrations/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Integration status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clover/integrations"] });
    },
  });

  if (!selectedLocation) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a location to manage Clover integrations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">POS Integration</h1>
          <p className="text-muted-foreground">
            Connect your POS systems (SpotOn, Clover, Square, etc.) for automatic inventory deduction
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="sales">Recent Sales</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Create New Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Integration
              </CardTitle>
              <CardDescription>
                Connect a new Clover merchant account to this location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchantId">Merchant ID</Label>
                  <Input
                    id="merchantId"
                    placeholder="Enter your Clover Merchant ID"
                    value={newIntegration.merchantId}
                    onChange={(e) =>
                      setNewIntegration({ ...newIntegration, merchantId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select
                    value={newIntegration.environment}
                    onValueChange={(value: "sandbox" | "production") =>
                      setNewIntegration({ ...newIntegration, environment: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Textarea
                  id="accessToken"
                  placeholder="Enter your Clover API access token"
                  value={newIntegration.accessToken}
                  onChange={(e) =>
                    setNewIntegration({ ...newIntegration, accessToken: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={() => createIntegrationMutation.mutate(newIntegration)}
                disabled={
                  !newIntegration.merchantId ||
                  !newIntegration.accessToken ||
                  createIntegrationMutation.isPending
                }
              >
                {createIntegrationMutation.isPending ? "Creating..." : "Create Integration"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Integrations */}
          <div className="grid gap-4">
            {integrationsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading integrations...</span>
                  </div>
                </CardContent>
              </Card>
            ) : integrations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Integrations Found</h3>
                  <p className="text-muted-foreground">
                    Create your first Clover integration to start syncing sales data.
                  </p>
                </CardContent>
              </Card>
            ) : (
              integrations.map((integration: CloverIntegration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Link2 className="h-5 w-5" />
                          Merchant ID: {integration.merchantId}
                        </CardTitle>
                        <CardDescription>
                          Environment: {integration.environment}
                          {integration.lastSyncAt && (
                            <span className="ml-2">
                              • Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant={integration.isActive ? "default" : "secondary"}>
                        {integration.isActive ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {integration.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate(integration.id)}
                        disabled={testConnectionMutation.isPending}
                      >
                        {testConnectionMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncMenuItemsMutation.mutate(integration.id)}
                        disabled={syncMenuItemsMutation.isPending}
                      >
                        {syncMenuItemsMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Sync Menu Items
                      </Button>
                      <Button
                        variant={integration.isActive ? "destructive" : "default"}
                        size="sm"
                        onClick={() =>
                          toggleIntegrationMutation.mutate({
                            id: integration.id,
                            isActive: !integration.isActive,
                          })
                        }
                        disabled={toggleIntegrationMutation.isPending}
                      >
                        {integration.isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Recent Clover Sales
              </CardTitle>
              <CardDescription>
                Sales data automatically synced from your Clover POS system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="flex items-center justify-center p-6">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading sales data...</span>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center p-6">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Sales Data</h3>
                  <p className="text-muted-foreground">
                    Sales will appear here once your Clover integration starts receiving webhook events.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale: CloverSale) => (
                    <div
                      key={sale.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Order #{sale.cloverOrderId}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.orderDate).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${sale.total}</p>
                          <Badge variant={sale.inventoryProcessed ? "default" : "secondary"}>
                            {sale.inventoryProcessed ? "Processed" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                      {sale.items && sale.items.length > 0 && (
                        <div className="border-t pt-2">
                          <p className="text-sm font-medium mb-1">Items:</p>
                          {sale.items.map((item, index) => (
                            <div key={index} className="text-sm text-muted-foreground">
                              {item.quantity}x {item.itemName} - ${item.price}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Clover Integration Setup Guide</CardTitle>
              <CardDescription>
                Follow these steps to connect your Clover POS system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-2">Step 1: Get Your Merchant ID</h3>
                  <p className="text-sm text-muted-foreground">
                    Log in to your Clover dashboard and find your Merchant ID in the account settings.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-2">Step 2: Generate API Access Token</h3>
                  <p className="text-sm text-muted-foreground">
                    Create an API access token in your Clover developer dashboard with the following permissions:
                    orders:read, items:read, merchants:read
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-2">Step 3: Configure Webhook</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Set up a webhook in your Clover app to send order events to:
                  </p>
                  <code className="bg-muted p-2 rounded text-sm block">
                    {window.location.origin}/api/clover/webhook
                  </code>
                  <p className="text-sm text-muted-foreground mt-2">
                    Subscribe to the "ORDER" event type to enable automatic inventory deduction.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-2">Step 4: Test Connection</h3>
                  <p className="text-sm text-muted-foreground">
                    After creating the integration, use the "Test Connection" button to verify everything is working correctly.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-2">Step 5: Sync Menu Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the "Sync Menu Items" button to import your Clover menu items, then map them to your inventory items for automatic deduction.
                  </p>
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Start with the sandbox environment for testing. Only switch to production after thorough testing.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}