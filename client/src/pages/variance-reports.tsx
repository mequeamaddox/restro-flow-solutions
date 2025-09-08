import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  Calendar,
  Package,
  ChefHat,
  Eye,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface VarianceReport {
  itemId: string;
  itemName: string;
  theoreticalUsage: number;
  actualUsage: number;
  variance: number;
  variancePercentage: number;
  varianceCost: number;
  category: 'acceptable' | 'high' | 'critical';
}

interface ProductionVariance {
  recipeId: string;
  recipeName: string;
  quantityProduced: number;
  theoreticalCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
}

interface VarianceSummary {
  totalVarianceCost: number;
  criticalVariances: number;
  highVariances: number;
  totalAnalyzedItems: number;
}

export default function VarianceReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [productionQuantity, setProductionQuantity] = useState<string>('');

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
  });

  // Fetch recipes for production recording
  const { data: recipes = [] } = useQuery({
    queryKey: ['/api/recipes'],
  });

  // Set default location
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  // Fetch variance summary
  const { data: varianceSummary } = useQuery<VarianceSummary>({
    queryKey: ['/api/variance/summary', selectedLocation],
    enabled: !!selectedLocation,
  });

  // Fetch variance report
  const { data: varianceReport = [], isLoading: isVarianceLoading } = useQuery<VarianceReport[]>({
    queryKey: ['/api/variance/report', selectedLocation, dateRange.startDate, dateRange.endDate],
    enabled: !!selectedLocation,
  });

  // Fetch production variance
  const { data: productionVariance = [] } = useQuery<ProductionVariance[]>({
    queryKey: ['/api/variance/production', selectedLocation, dateRange.startDate, dateRange.endDate],
    enabled: !!selectedLocation,
  });

  // Record recipe production mutation
  const recordProductionMutation = useMutation({
    mutationFn: async (data: { recipeId: string; quantity: number; batchNumber?: string }) => {
      return apiRequest('/api/variance/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: data.recipeId,
          locationId: selectedLocation,
          quantityProduced: data.quantity,
          batchNumber: data.batchNumber
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/variance'] });
      setSelectedRecipe('');
      setProductionQuantity('');
    },
  });

  // Generate new variance report
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/variance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocation,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/variance'] });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      default: return <Package className="h-4 w-4 text-green-600" />;
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Variance Analysis
          </h1>
          <p className="text-gray-600">Enterprise-level theoretical vs actual usage analysis</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generateReportMutation.isPending ? 'animate-spin' : ''}`} />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location: any) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {varianceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Total Variance Cost</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${varianceSummary.totalVarianceCost.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Critical Variances</p>
                  <p className="text-2xl font-bold text-red-500">
                    {varianceSummary.criticalVariances}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">High Variances</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {varianceSummary.highVariances}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Items Analyzed</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {varianceSummary.totalAnalyzedItems}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventory Variance</TabsTrigger>
          <TabsTrigger value="production">Production Variance</TabsTrigger>
          <TabsTrigger value="record">Record Production</TabsTrigger>
        </TabsList>

        {/* Inventory Variance Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Usage Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isVarianceLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : varianceReport.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No variance data available for the selected period
                </div>
              ) : (
                <div className="space-y-4">
                  {varianceReport.map((item) => (
                    <div key={item.itemId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(item.category)}
                          <div>
                            <h3 className="font-medium">{item.itemName}</h3>
                            <div className="flex gap-4 text-sm text-gray-600">
                              <span>Theoretical: {item.theoreticalUsage.toFixed(2)}</span>
                              <span>Actual: {item.actualUsage.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge className={getCategoryColor(item.category)}>
                              {item.variancePercentage > 0 ? '+' : ''}{item.variancePercentage.toFixed(1)}%
                            </Badge>
                            <p className="text-sm mt-1">
                              Cost Impact: <span className={item.varianceCost > 0 ? 'text-red-600' : 'text-green-600'}>
                                ${Math.abs(item.varianceCost).toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Usage Progress</span>
                          <span>{((item.actualUsage / item.theoreticalUsage) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={Math.min((item.actualUsage / item.theoreticalUsage) * 100, 100)}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Variance Tab */}
        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Recipe Production Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productionVariance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No production data available for the selected period
                </div>
              ) : (
                <div className="space-y-4">
                  {productionVariance.map((recipe) => (
                    <div key={recipe.recipeId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{recipe.recipeName}</h3>
                          <p className="text-sm text-gray-600">
                            Produced: {recipe.quantityProduced} servings
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex gap-4 text-sm">
                            <span>Theoretical: ${recipe.theoreticalCost.toFixed(2)}</span>
                            <span>Actual: ${recipe.actualCost.toFixed(2)}</span>
                          </div>
                          <Badge className={recipe.variancePercentage > 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {recipe.variancePercentage > 0 ? '+' : ''}{recipe.variancePercentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Record Production Tab */}
        <TabsContent value="record">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Record Recipe Production
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Recipe</Label>
                  <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                    <SelectTrigger data-testid="select-recipe">
                      <SelectValue placeholder="Select recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe: any) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Quantity Produced</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.1"
                    value={productionQuantity}
                    onChange={(e) => setProductionQuantity(e.target.value)}
                    placeholder="Servings produced"
                    data-testid="input-production-quantity"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={() => recordProductionMutation.mutate({
                      recipeId: selectedRecipe,
                      quantity: parseFloat(productionQuantity)
                    })}
                    disabled={!selectedRecipe || !productionQuantity || recordProductionMutation.isPending}
                    className="w-full"
                    data-testid="button-record-production"
                  >
                    {recordProductionMutation.isPending ? 'Recording...' : 'Record Production'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}