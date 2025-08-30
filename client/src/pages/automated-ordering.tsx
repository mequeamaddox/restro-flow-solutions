import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AutomatedOrdering() {
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [editingRule, setEditingRule] = useState<any>(null);
  const [editRuleName, setEditRuleName] = useState('');
  const [editReorderPoint, setEditReorderPoint] = useState(50);
  const [editOrderQuantity, setEditOrderQuantity] = useState(100);
  const [editFrequency, setEditFrequency] = useState('weekly');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: autoOrderRules = [] } = useQuery({
    queryKey: ['/api/auto-ordering/rules'],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['/api/vendors'],
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['/api/inventory'],
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const response = await apiRequest("POST", "/api/auto-ordering/rules", ruleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-ordering/rules'] });
      toast({ title: "Auto-ordering rule created successfully" });
    }
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) => {
      const response = await apiRequest("PATCH", `/api/auto-ordering/rules/${ruleId}`, { enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auto-ordering/rules'] });
    }
  });

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

  const handleCreateRule = () => {
    if (!ruleName || !selectedItem || !selectedVendor || !triggerType) {
      toast({ 
        title: "Please fill in all fields", 
        variant: "destructive" 
      });
      return;
    }

    const ruleData = {
      ruleName,
      itemId: selectedItem,
      vendorId: selectedVendor,
      triggerType,
      reorderPoint: 50, // Default values
      orderQuantity: 100,
      frequency: 'weekly'
    };

    createRuleMutation.mutate(ruleData);
    
    // Reset form
    setRuleName('');
    setSelectedItem('');
    setSelectedVendor('');
    setTriggerType('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bot className="h-8 w-8 text-blue-400" />
            Automated Ordering
          </h1>
          <p className="text-slate-400 mt-2">
            AI-powered automatic purchase orders based on consumption patterns and reorder points
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          Enterprise Feature
        </Badge>
      </div>

      {/* System Status */}
      <Card className="bg-slate-800/50 border-slate-700">
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
              <div className="text-2xl font-bold text-purple-400">24</div>
              <div className="text-sm text-slate-400">Active Rules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">2.3hrs</div>
              <div className="text-sm text-slate-400">Time Saved/Week</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Auto-Order Rules */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Active Auto-Order Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {autoOrderRules.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{rule.ruleName || rule.name}</h3>
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                    <div>
                      <span className="font-medium">Item:</span> {rule.itemName || rule.item}
                    </div>
                    <div>
                      <span className="font-medium">Vendor:</span> {rule.vendorName || rule.vendor}
                    </div>
                    <div>
                      <span className="font-medium">Trigger:</span> {rule.triggerType || rule.trigger}
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
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={rule.enabled}
                    onCheckedChange={(enabled) => 
                      toggleRuleMutation.mutate({ ruleId: rule.id, enabled })
                    }
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setEditRuleName(rule.ruleName || rule.name);
                          setEditReorderPoint(rule.reorderPoint || 50);
                          setEditOrderQuantity(rule.orderQuantity || 100);
                          setEditFrequency(rule.frequency || 'weekly');
                        }}
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
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-300">Order Quantity</Label>
                            <Input 
                              type="number"
                              value={editOrderQuantity}
                              onChange={(e) => setEditOrderQuantity(Number(e.target.value))}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Frequency</Label>
                          <Select value={editFrequency} onValueChange={setEditFrequency}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                          className="w-full"
                          disabled={updateRuleMutation.isPending}
                        >
                          {updateRuleMutation.isPending ? 'Updating...' : 'Update Rule'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create New Rule */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Create Auto-Order Rule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Rule Name</Label>
              <Input 
                placeholder="e.g., Chicken Breast Auto-Order"
                className="bg-slate-700 border-slate-600 text-white"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Inventory Item</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select inventory item" />
                </SelectTrigger>
                <SelectContent>
                  {(inventory as any[]).slice(0, 5).map((item: any) => (
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
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
            <div className="space-y-2">
              <Label className="text-slate-300">Trigger Type</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" className="border-slate-600 text-slate-300">
              Preview Rule
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCreateRule}
              disabled={createRuleMutation.isPending}
            >
              {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            AI Ordering Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-green-400 mt-1" />
                <div>
                  <div className="font-semibold text-green-400">Optimization Opportunity</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Your Ground Beef orders could be optimized by switching to 50lb orders every 3 days 
                    instead of 100lb weekly orders. This would reduce waste by 12% and save $67/month.
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mt-1" />
                <div>
                  <div className="font-semibold text-yellow-400">Demand Spike Detected</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Weekend consumption for Chicken Wings increased 35% vs last month. 
                    Consider increasing Friday orders by 20lbs to avoid stockouts.
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-blue-400 mt-1" />
                <div>
                  <div className="font-semibold text-blue-400">Cost Savings Alert</div>
                  <div className="text-sm text-slate-300 mt-1">
                    Sysco is offering 8% bulk discount on produce orders over $500. 
                    Combine your daily orders into bi-weekly orders to qualify.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}