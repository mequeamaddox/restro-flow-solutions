import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bot, Settings, Zap, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AutomatedOrdering() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [reorderPoint, setReorderPoint] = useState(50);
  const [orderQuantity, setOrderQuantity] = useState(100);
  const [frequency, setFrequency] = useState('weekly');
  
  // Edit dialog state
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editRuleName, setEditRuleName] = useState('');
  const [editReorderPoint, setEditReorderPoint] = useState(50);
  const [editOrderQuantity, setEditOrderQuantity] = useState(100);
  const [editFrequency, setEditFrequency] = useState('weekly');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: autoOrderRules = [], isLoading } = useQuery({
    queryKey: ['/api/auto-ordering/rules'],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/vendors'],
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['/api/inventory'],
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const response = await apiRequest("POST", "/api/auto-ordering/rules", ruleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-ordering/rules'] });
      toast({ title: "Auto-ordering rule created successfully" });
      setIsDialogOpen(false);
      // Reset form
      setRuleName('');
      setSelectedItem('');
      setSelectedVendor('');
      setTriggerType('');
      setReorderPoint(50);
      setOrderQuantity(100);
      setFrequency('weekly');
    }
  });

  // Toggle rule mutation
  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      console.log("Toggling rule:", ruleId, "to enabled:", enabled);
      const response = await apiRequest("PATCH", `/api/auto-ordering/rules/${ruleId}`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-ordering/rules'] });
      toast({ title: "Rule updated successfully" });
    },
    onError: (error) => {
      console.error("Toggle error:", error);
      toast({ title: "Failed to update rule", variant: "destructive" });
    }
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await apiRequest("PATCH", `/api/auto-ordering/rules/${updateData.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-ordering/rules'] });
      setEditingRule(null);
      toast({ title: "Rule updated successfully" });
    }
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      console.log("Deleting rule:", ruleId);
      const response = await apiRequest("DELETE", `/api/auto-ordering/rules/${ruleId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-ordering/rules'] });
      toast({ title: "Rule deleted successfully" });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({ title: "Failed to delete rule", variant: "destructive" });
    }
  });

  const openEditDialog = (rule: any) => {
    setEditingRule(rule);
    setEditRuleName(rule.ruleName);
    setEditReorderPoint(rule.reorderPoint || 50);
    setEditOrderQuantity(rule.orderQuantity || 100);
    setEditFrequency(rule.frequency || 'weekly');
  };

  const handleCreateRule = () => {
    if (!ruleName || !selectedItem || !selectedVendor || !triggerType) {
      toast({ 
        title: "Please fill in all fields", 
        variant: "destructive" 
      });
      return;
    }

    createRuleMutation.mutate({
      ruleName,
      itemId: selectedItem,
      vendorId: selectedVendor,
      triggerType,
      reorderPoint,
      orderQuantity,
      frequency
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-400" />
            Automated Ordering
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">AUTO</Badge>
          </h1>
          <p className="text-slate-400 mt-2">
            AI-powered automatic purchase orders based on consumption patterns
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" data-testid="button-create-new-rule">
              Create New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Auto-Order Rule</DialogTitle>
              <DialogDescription className="text-slate-400">
                Set up automated ordering based on inventory levels or schedules
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Rule Name</Label>
                <Input 
                  placeholder="e.g., Chicken Breast Auto-Order"
                  className="bg-slate-700 border-slate-600 text-white"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  data-testid="input-rule-name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Inventory Item</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-inventory-item">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {(inventory as any[]).map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Vendor</Label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-vendor">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(vendors as any[]).map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Trigger Type</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-trigger-type">
                    <SelectValue placeholder="When to order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low_stock">Stock falls below threshold</SelectItem>
                    <SelectItem value="scheduled">Scheduled (daily/weekly)</SelectItem>
                    <SelectItem value="consumption">Based on consumption rate</SelectItem>
                    <SelectItem value="forecast">AI demand forecast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Reorder Point</Label>
                  <Input 
                    type="number"
                    placeholder="50"
                    className="bg-slate-700 border-slate-600 text-white"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(Number(e.target.value))}
                    data-testid="input-reorder-point"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Order Quantity</Label>
                  <Input 
                    type="number"
                    placeholder="100"
                    className="bg-slate-700 border-slate-600 text-white"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    data-testid="input-order-quantity"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateRule}
                className="w-full bg-orange-600 hover:bg-orange-700"
                disabled={createRuleMutation.isPending}
                data-testid="button-create-rule"
              >
                {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Auto-Order Intelligence Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">87%</div>
              <div className="text-sm text-slate-400">Prediction Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">$12,400</div>
              <div className="text-sm text-slate-400">Monthly Savings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{autoOrderRules.length}</div>
              <div className="text-sm text-slate-400">Active Rules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">2.3hrs</div>
              <div className="text-sm text-slate-400">Time Saved/Week</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Active Auto-Order Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-slate-400">Loading rules...</div>
          ) : autoOrderRules.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No auto-order rules created yet</p>
              <p className="text-slate-500 text-sm">Click "Create New Rule" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {autoOrderRules.map((rule: any) => (
                <div key={rule.id} className="p-4 bg-slate-700/30 rounded-lg" data-testid={`rule-card-${rule.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{rule.ruleName}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.enabled ? "default" : "secondary"} data-testid={`badge-status-${rule.id}`}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </Badge>
                      <Switch 
                        checked={rule.enabled}
                        onCheckedChange={(enabled) => {
                          console.log("Toggle clicked for rule:", rule.id, "new state:", enabled);
                          toggleRuleMutation.mutate({ ruleId: rule.id, enabled });
                        }}
                        data-testid={`toggle-rule-${rule.id}`}
                        disabled={toggleRuleMutation.isPending}
                      />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                            data-testid={`settings-button-${rule.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">Edit Rule Settings</DialogTitle>
                            <DialogDescription className="text-slate-400">
                              Modify the parameters for your automated ordering rule
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-slate-300">Rule Name</Label>
                              <Input 
                                value={editRuleName}
                                onChange={(e) => setEditRuleName(e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white"
                                data-testid="input-edit-rule-name"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-slate-300">Reorder Point</Label>
                                <Input 
                                  type="number"
                                  value={editReorderPoint}
                                  onChange={(e) => setEditReorderPoint(Number(e.target.value))}
                                  className="bg-slate-700 border-slate-600 text-white"
                                  data-testid="input-edit-reorder-point"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-slate-300">Order Quantity</Label>
                                <Input 
                                  type="number"
                                  value={editOrderQuantity}
                                  onChange={(e) => setEditOrderQuantity(Number(e.target.value))}
                                  className="bg-slate-700 border-slate-600 text-white"
                                  data-testid="input-edit-order-quantity"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-slate-300">Frequency</Label>
                              <Select value={editFrequency} onValueChange={setEditFrequency}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-edit-frequency">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => {
                                  if (editingRule) {
                                    updateRuleMutation.mutate({
                                      id: editingRule.id,
                                      ruleName: editRuleName,
                                      reorderPoint: editReorderPoint,
                                      orderQuantity: editOrderQuantity,
                                      frequency: editFrequency
                                    });
                                  }
                                }}
                                className="flex-1 bg-orange-600 hover:bg-orange-700"
                                disabled={updateRuleMutation.isPending}
                                data-testid="button-update-rule"
                              >
                                {updateRuleMutation.isPending ? 'Updating...' : 'Update Rule'}
                              </Button>
                              <Button 
                                onClick={() => {
                                  if (editingRule) {
                                    deleteRuleMutation.mutate(editingRule.id);
                                  }
                                }}
                                variant="destructive"
                                disabled={deleteRuleMutation.isPending}
                                data-testid="button-delete-rule-settings"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                        disabled={deleteRuleMutation.isPending}
                        data-testid={`delete-button-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-400 mb-2">
                    <div>
                      <span className="font-medium">Item:</span> {rule.itemName}
                    </div>
                    <div>
                      <span className="font-medium">Vendor:</span> {rule.vendorName}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-400 mb-2">
                    <div>
                      <span className="font-medium">Trigger:</span> {
                        rule.triggerType === 'low_stock' ? `Stock below ${rule.reorderPoint}` : 
                        rule.triggerType === 'scheduled' ? rule.frequency : 
                        rule.triggerType
                      }
                    </div>
                    <div>
                      <span className="font-medium">Quantity:</span> {rule.orderQuantity}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <span>Last triggered: {rule.lastTriggered || "Never"}</span>
                    <span className="text-green-400">Saves: ${rule.estimatedSavings}/month</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}