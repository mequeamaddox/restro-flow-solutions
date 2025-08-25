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
  credentials: any;
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
  const { currentLocation: selectedLocation } = useLocation();
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

  // Fetch webhook status
  const { data: webhookStatus = [], isLoading: webhookStatusLoading } = useQuery({
    queryKey: ["/api/pos/webhook-status"],
  });

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: async (data: typeof newIntegration) => {
      const response = await fetch("/api/pos/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: data.provider,
          name: data.name,
          merchantId: data.merchantId,
          credentials: data.credentials,
          environment: data.environment,
          locationId: selectedLocation?.id,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "POS integration created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/integrations"] });
      setNewIntegration({
        provider: "spoton",
        name: "",
        merchantId: "",
        credentials: {
          accessToken: "",
          apiKey: "",
        },
        environment: "sandbox",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create POS integration",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await fetch(`/api/pos/integrations/${integrationId}/test`);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.success 
          ? "Successfully connected to POS API" 
          : "Failed to connect to POS API. Check your credentials.",
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  // Sync menu items mutation
  const syncMenuItemsMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await fetch(`/api/pos/integrations/${integrationId}/sync`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "Menu items synced successfully from POS",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/integrations"] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync menu items from POS",
        variant: "destructive",
      });
    },
  });

  // Toggle integration status
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/pos/integrations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Integration status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/integrations"] });
    },
  });

  if (!selectedLocation) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a location to manage POS integrations.
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
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
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
                Connect a new POS system to start syncing sales and inventory data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">POS Provider</Label>
                  <Select
                    value={newIntegration.provider}
                    onValueChange={(value: "spoton" | "clover" | "square" | "toast" | "revel") =>
                      setNewIntegration({ ...newIntegration, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spoton">SpotOn POS</SelectItem>
                      <SelectItem value="clover">Clover POS</SelectItem>
                      <SelectItem value="square">Square POS</SelectItem>
                      <SelectItem value="toast">Toast POS</SelectItem>
                      <SelectItem value="revel">Revel POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Bar Location - SpotOn"
                    value={newIntegration.name}
                    onChange={(e) =>
                      setNewIntegration({ ...newIntegration, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchantId">Merchant ID</Label>
                  <Input
                    id="merchantId"
                    placeholder="Enter your POS Merchant ID"
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
                  placeholder="Enter your POS API access token"
                  value={newIntegration.credentials.accessToken}
                  onChange={(e) =>
                    setNewIntegration({ 
                      ...newIntegration, 
                      credentials: { ...newIntegration.credentials, accessToken: e.target.value }
                    })
                  }
                />
              </div>
              <Button
                onClick={() => createIntegrationMutation.mutate(newIntegration)}
                disabled={
                  !newIntegration.name ||
                  !newIntegration.merchantId ||
                  !newIntegration.credentials.accessToken ||
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
                    Create your first POS integration to start syncing sales data.
                  </p>
                </CardContent>
              </Card>
            ) : (
              integrations.map((integration: PosIntegration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Link2 className="h-5 w-5" />
                          {integration.name} ({integration.provider.toUpperCase()})
                        </CardTitle>
                        <CardDescription>
                          Merchant ID: {integration.merchantId} | Environment: {integration.environment}
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

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure webhook URLs in your POS system to enable real-time inventory sync
              </CardDescription>
            </CardHeader>
            <CardContent>
              {webhookStatusLoading ? (
                <div className="flex items-center justify-center p-6">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading webhook status...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhookStatus.map((webhook: any) => (
                    <div key={webhook.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{webhook.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {webhook.provider} Integration
                          </p>
                        </div>
                        <Badge variant={webhook.isActive ? "default" : "secondary"}>
                          {webhook.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <Label className="text-sm font-medium">Webhook URL</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input 
                              value={webhook.webhookUrl} 
                              readOnly 
                              className="bg-muted text-sm"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(webhook.webhookUrl);
                                toast({
                                  title: "Copied!",
                                  description: "Webhook URL copied to clipboard",
                                });
                              }}
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        
                        {webhook.lastSyncAt && (
                          <div>
                            <Label className="text-sm font-medium">Last Webhook Received</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(webhook.lastSyncAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {webhook.provider === 'clover' && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Clover Setup:</strong> In your Clover dashboard, configure webhooks for these events:
                            ORDER_CREATED, ORDER_UPDATED, PAYMENT_CREATED, INVENTORY_UPDATED
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                  
                  {webhookStatus.length === 0 && (
                    <div className="text-center p-6">
                      <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Webhook Integrations</h3>
                      <p className="text-muted-foreground">
                        Create a POS integration first to configure webhooks for real-time sync.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
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
                  {sales.map((sale: PosSale) => (
                    <div
                      key={sale.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Order #{sale.posOrderId}</p>
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
                              {item.quantity}x {item.itemName} - ${item.unitPrice}
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