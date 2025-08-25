import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Download, Sync, AlertCircle, CheckCircle, Clock, ExternalLink, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PayrollIntegration {
  id: string;
  provider: string;
  name: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncFrequency: string;
  autoSync: boolean;
  createdAt: string;
}

interface PayrollSyncLog {
  id: string;
  syncType: string;
  status: string;
  recordsProcessed: number;
  recordsTotal: number;
  errorMessage?: string;
  syncStartedAt: string;
  syncCompletedAt?: string;
}

interface PayrollExport {
  id: string;
  exportType: string;
  dateFrom: string;
  dateTo: string;
  fileName: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

const PAYROLL_PROVIDERS = [
  {
    id: 'gusto',
    name: 'Gusto',
    description: 'Full-service payroll, benefits, and HR platform',
    logo: '💰',
    features: ['Automated payroll', 'Tax filing', 'Benefits management', 'Time tracking sync']
  },
  {
    id: 'sevenShifts',
    name: '7shifts',
    description: 'Restaurant scheduling and labor management',
    logo: '📅',
    features: ['Employee scheduling', 'Labor cost tracking', 'Time clock integration', 'Shift planning']
  },
  {
    id: 'homebase',
    name: 'Homebase',
    description: 'Team scheduling and time tracking',
    logo: '🏠',
    features: ['Scheduling', 'Time tracking', 'Team messaging', 'Payroll preparation']
  },
  {
    id: 'adp',
    name: 'ADP',
    description: 'Enterprise payroll and HR solutions',
    logo: '🏢',
    features: ['Payroll processing', 'HR management', 'Compliance', 'Reporting']
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks Payroll',
    description: 'Accounting-integrated payroll solution',
    logo: '📊',
    features: ['Payroll processing', 'Tax preparation', 'Accounting sync', 'Reporting']
  }
];

export default function HRPayroll() {
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({
    type: 'time_entries',
    dateFrom: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd')
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch payroll integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['/api/hr/payroll/integrations'],
  });

  // Fetch sync logs
  const { data: syncLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['/api/hr/payroll/sync-logs'],
  });

  // Fetch exports
  const { data: exports = [], isLoading: exportsLoading } = useQuery({
    queryKey: ['/api/hr/payroll/exports'],
  });

  // Connect integration mutation
  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/hr/payroll/integrations', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/integrations'] });
      setShowConnectDialog(false);
      setSelectedProvider(null);
      toast({
        title: "Integration Connected",
        description: "Payroll provider has been successfully connected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect payroll provider",
        variant: "destructive",
      });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await apiRequest('POST', `/api/hr/payroll/integrations/${integrationId}/sync`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/integrations'] });
      toast({
        title: "Sync Started",
        description: "Payroll data sync has been initiated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to start payroll sync",
        variant: "destructive",
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/hr/payroll/exports', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/exports'] });
      setShowExportDialog(false);
      toast({
        title: "Export Generated",
        description: "Payroll data export has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to generate export",
        variant: "destructive",
      });
    },
  });

  // Delete integration mutation
  const deleteMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      await apiRequest('DELETE', `/api/hr/payroll/integrations/${integrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/payroll/integrations'] });
      toast({
        title: "Integration Removed",
        description: "Payroll integration has been disconnected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove integration",
        variant: "destructive",
      });
    },
  });

  const handleConnect = (provider: any) => {
    setSelectedProvider(provider);
    setShowConnectDialog(true);
  };

  const handleSubmitConnection = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const credentials: any = {};
    const settings: any = {};
    
    // Extract form data based on provider
    switch (selectedProvider.id) {
      case 'gusto':
        credentials.apiToken = formData.get('apiToken');
        credentials.companyId = formData.get('companyId');
        settings.syncEmployees = formData.get('syncEmployees') === 'on';
        settings.syncTimeEntries = formData.get('syncTimeEntries') === 'on';
        break;
      case 'sevenShifts':
        credentials.apiKey = formData.get('apiKey');
        credentials.companyId = formData.get('companyId');
        settings.syncSchedules = formData.get('syncSchedules') === 'on';
        break;
      case 'homebase':
        credentials.apiToken = formData.get('apiToken');
        credentials.companyId = formData.get('companyId');
        break;
      default:
        credentials.apiKey = formData.get('apiKey');
        credentials.apiSecret = formData.get('apiSecret');
    }

    connectMutation.mutate({
      provider: selectedProvider.id,
      name: formData.get('name'),
      credentials,
      settings,
      environment: formData.get('environment'),
      syncFrequency: formData.get('syncFrequency'),
      autoSync: formData.get('autoSync') === 'on'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  const getProviderInfo = (provider: string) => {
    return PAYROLL_PROVIDERS.find(p => p.id === provider) || { name: provider, logo: '⚙️' };
  };

  if (integrationsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="hr-payroll-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Payroll Integrations</h1>
          <p className="text-muted-foreground">Connect and sync with payroll providers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowExportDialog(true)} variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
          <TabsTrigger value="sync-logs" data-testid="tab-sync-logs">Sync Logs</TabsTrigger>
          <TabsTrigger value="exports" data-testid="tab-exports">Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Connected Integrations</h2>
              <div className="grid gap-4">
                {integrations.map((integration: PayrollIntegration) => {
                  const providerInfo = getProviderInfo(integration.provider);
                  return (
                    <Card key={integration.id} data-testid={`integration-card-${integration.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">{providerInfo.logo}</div>
                            <div>
                              <h3 className="font-semibold">{integration.name}</h3>
                              <p className="text-sm text-muted-foreground">{providerInfo.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={integration.isActive ? "default" : "secondary"}>
                                  {integration.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {integration.autoSync && (
                                  <Badge variant="outline">Auto Sync</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {integration.lastSyncAt && (
                              <div className="text-sm text-muted-foreground text-right">
                                Last sync:<br />
                                {format(new Date(integration.lastSyncAt), 'MMM dd, HH:mm')}
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncMutation.mutate(integration.id)}
                              disabled={syncMutation.isPending}
                              data-testid={`button-sync-${integration.id}`}
                            >
                              <Sync className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(integration.id)}
                              data-testid={`button-delete-${integration.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Providers */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Available Providers</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PAYROLL_PROVIDERS.map((provider) => {
                const isConnected = integrations.some((i: PayrollIntegration) => i.provider === provider.id);
                return (
                  <Card key={provider.id} className={isConnected ? "opacity-50" : ""} data-testid={`provider-card-${provider.id}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{provider.logo}</div>
                        <div>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          <CardDescription>{provider.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {provider.features.map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                        <Button 
                          onClick={() => handleConnect(provider)} 
                          disabled={isConnected}
                          className="w-full"
                          data-testid={`button-connect-${provider.id}`}
                        >
                          {isConnected ? "Connected" : "Connect"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sync-logs" className="space-y-4">
          <h2 className="text-xl font-semibold">Sync History</h2>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {syncLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sync logs available
                </div>
              ) : (
                syncLogs.map((log: PayrollSyncLog) => (
                  <Card key={log.id} data-testid={`sync-log-${log.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status)}`} />
                          <div>
                            <div className="font-medium">{log.syncType.replace('_', ' ').toUpperCase()}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(log.syncStartedAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {log.recordsProcessed}/{log.recordsTotal} records
                          </div>
                          {log.status === 'failed' && log.errorMessage && (
                            <div className="text-sm text-red-500">{log.errorMessage}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exports" className="space-y-4">
          <h2 className="text-xl font-semibold">Data Exports</h2>
          {exportsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-2">
              {exports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No exports available
                </div>
              ) : (
                exports.map((exportItem: PayrollExport) => (
                  <Card key={exportItem.id} data-testid={`export-item-${exportItem.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{exportItem.fileName}</div>
                          <div className="text-sm text-muted-foreground">
                            {exportItem.exportType.replace('_', ' ').toUpperCase()} • {exportItem.dateFrom} to {exportItem.dateTo}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created {format(new Date(exportItem.createdAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={exportItem.status === 'generated' ? 'default' : 'secondary'}>
                            {exportItem.status}
                          </Badge>
                          <Button variant="outline" size="sm" data-testid={`button-download-${exportItem.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Connect Provider Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-connect-provider">
          <DialogHeader>
            <DialogTitle>Connect {selectedProvider?.name}</DialogTitle>
            <DialogDescription>
              Enter your {selectedProvider?.name} credentials to connect your payroll system.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitConnection} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Integration Name</Label>
              <Input
                id="name"
                name="name"
                placeholder={`${selectedProvider?.name} Integration`}
                defaultValue={`${selectedProvider?.name} Integration`}
                required
                data-testid="input-integration-name"
              />
            </div>

            {/* Provider-specific credential fields */}
            {selectedProvider?.id === 'gusto' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiToken">API Token</Label>
                  <Input
                    id="apiToken"
                    name="apiToken"
                    type="password"
                    placeholder="Enter your Gusto API token"
                    required
                    data-testid="input-api-token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company ID</Label>
                  <Input
                    id="companyId"
                    name="companyId"
                    placeholder="Enter your Gusto company ID"
                    required
                    data-testid="input-company-id"
                  />
                </div>
              </>
            )}

            {selectedProvider?.id === 'sevenShifts' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    type="password"
                    placeholder="Enter your 7shifts API key"
                    required
                    data-testid="input-api-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company ID</Label>
                  <Input
                    id="companyId"
                    name="companyId"
                    placeholder="Enter your 7shifts company ID"
                    required
                    data-testid="input-company-id"
                  />
                </div>
              </>
            )}

            {selectedProvider?.id === 'homebase' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiToken">API Token</Label>
                  <Input
                    id="apiToken"
                    name="apiToken"
                    type="password"
                    placeholder="Enter your Homebase API token"
                    required
                    data-testid="input-api-token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company ID</Label>
                  <Input
                    id="companyId"
                    name="companyId"
                    placeholder="Enter your Homebase company ID"
                    required
                    data-testid="input-company-id"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select name="environment" defaultValue="sandbox">
                <SelectTrigger data-testid="select-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Sync Frequency</Label>
              <Select name="syncFrequency" defaultValue="weekly">
                <SelectTrigger data-testid="select-sync-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="autoSync" name="autoSync" data-testid="switch-auto-sync" />
              <Label htmlFor="autoSync">Enable automatic sync</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowConnectDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={connectMutation.isPending} data-testid="button-submit-connection">
                {connectMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-export-data">
          <DialogHeader>
            <DialogTitle>Export Payroll Data</DialogTitle>
            <DialogDescription>
              Generate an export of your payroll data for external processing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exportType">Export Type</Label>
              <Select
                value={exportForm.type}
                onValueChange={(value) => setExportForm({ ...exportForm, type: value })}
              >
                <SelectTrigger data-testid="select-export-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_entries">Time Entries</SelectItem>
                  <SelectItem value="employees">Employee Data</SelectItem>
                  <SelectItem value="full_payroll">Full Payroll Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={exportForm.dateFrom}
                  onChange={(e) => setExportForm({ ...exportForm, dateFrom: e.target.value })}
                  data-testid="input-date-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={exportForm.dateTo}
                  onChange={(e) => setExportForm({ ...exportForm, dateTo: e.target.value })}
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => exportMutation.mutate(exportForm)}
              disabled={exportMutation.isPending}
              data-testid="button-generate-export"
            >
              {exportMutation.isPending ? "Generating..." : "Generate Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}