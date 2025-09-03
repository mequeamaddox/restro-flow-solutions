import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChefHat, DollarSign, Clock, Users, Trash2, Eye, AlertTriangle, Camera, FileText, Printer, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/hooks/useAuth";
import { ObjectUploader } from "@/components/ObjectUploader";
import { z } from "zod";

const recipeFormSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  servingSize: z.number().min(1, "Serving size must be at least 1"),
  prepTime: z.number().min(1, "Prep time must be at least 1 minute"),
  cookTime: z.number().min(0, "Cook time must be 0 or more minutes"),
  instructions: z.string().min(1, "Instructions are required"),
  sellingPrice: z.number().min(0, "Selling price must be 0 or more").optional()
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [ingredients, setIngredients] = useState([{ inventoryItemId: '', quantity: 0, unit: '' }]);
  const [targetFoodCost, setTargetFoodCost] = useState(30); // 30% default food cost
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [assignmentPriority, setAssignmentPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const { toast } = useToast();
  const { currentLocation } = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/recipes', currentLocation?.id],
    queryFn: () => apiRequest('GET', `/api/recipes?locationId=${currentLocation?.id}`).then(r => r.json()),
    enabled: !!currentLocation,
  });

  const { data: inventoryItems = [] } = useQuery<any[]>({
    queryKey: ['/api/inventory', currentLocation?.id],
    queryFn: () => apiRequest('GET', `/api/inventory?locationId=${currentLocation?.id}`).then(r => r.json()),
    enabled: !!currentLocation,
  });

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/employees'],
    enabled: !!currentLocation,
  });

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      servingSize: 1,
      prepTime: 15,
      cookTime: 0,
      instructions: "",
      sellingPrice: 0
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (data: RecipeFormData) => {
      const validIngredients = ingredients.filter(ing => ing.inventoryItemId && ing.quantity > 0);
      if (validIngredients.length === 0) {
        throw new Error('At least one ingredient is required');
      }
      await apiRequest('POST', '/api/recipes', {
        ...data,
        locationId: currentLocation?.id,
        ingredients: validIngredients
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes', currentLocation?.id] });
      setIsCreateDialogOpen(false);
      form.reset();
      setIngredients([{ inventoryItemId: '', quantity: 0, unit: '' }]);
      setTargetFoodCost(30);
      toast({
        title: "Success",
        description: "Recipe created successfully",
      });
    },
    onError: (error: any) => {
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
      console.error('Recipe creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create recipe",
        variant: "destructive",
      });
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes', currentLocation?.id] });
      setIsDetailsDialogOpen(false);
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ recipeId, imageUrl }: { recipeId: string; imageUrl: string }) => {
      await apiRequest('PUT', `/api/recipes/${recipeId}/photo`, { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes', currentLocation?.id] });
      toast({
        title: "Success",
        description: "Recipe photo uploaded successfully",
      });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    },
  });

  const assignRecipeMutation = useMutation({
    mutationFn: async (assignmentData: {
      employeeId: string;
      recipeId: string;
      priority: 'low' | 'medium' | 'high';
      dueDate?: string;
      notes?: string;
    }) => {
      const response = await apiRequest('POST', '/api/recipe-assignments', {
        body: {
          ...assignmentData,
          assignedBy: user?.id, // Current user as assigner
          dueDate: assignmentData.dueDate ? new Date(assignmentData.dueDate) : null,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      setIsAssignDialogOpen(false);
      setSelectedEmployeeId('');
      setAssignmentDueDate('');
      setAssignmentNotes('');
      setAssignmentPriority('medium');
      toast({
        title: "Recipe assigned",
        description: "The recipe has been assigned to the employee for training.",
      });
    },
    onError: (error) => {
      console.error('Assign recipe error:', error);
      toast({
        title: "Error",
        description: "Failed to assign recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateBuildSheet = async (recipe: any) => {
    console.log('Generating build sheet for recipe:', recipe);
    
    // Get full recipe data with ingredients
    const response = await fetch(`/api/recipes/${recipe.id}`);
    const fullRecipe = await response.json();
    console.log('Full recipe with ingredients:', fullRecipe);
    
    const ingredients = fullRecipe.ingredients || [];
    
    const buildSheetContent = `
═══════════════════════════════════════════════════════════════════════════
                           ${currentLocation?.name?.toUpperCase() || 'RESTAURANT'}
                              KITCHEN BUILD SHEET
═══════════════════════════════════════════════════════════════════════════

RECIPE: ${recipe.name.toUpperCase()}
Category: ${recipe.category?.charAt(0).toUpperCase() + recipe.category?.slice(1) || 'N/A'}
Serves: ${recipe.servingSize} portion${recipe.servingSize === 1 ? '' : 's'}
Prep Time: ${recipe.prepTime} min  |  Cook Time: ${recipe.cookTime} min

▓▓▓ INGREDIENTS ▓▓▓
${ingredients.map((ing: any, index: number) => {
  const itemName = ing.inventoryItem?.name || 'Unknown Item';
  return `${String(index + 1).padStart(2, '0')}. ${itemName.padEnd(25)} → ${ing.quantity} ${ing.unit}`;
}).join('\n')}

▓▓▓ PREPARATION INSTRUCTIONS ▓▓▓
${recipe.instructions}

═══════════════════════════════════════════════════════════════════════════
Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
Kitchen Use Only - Do Not Remove From Station
═══════════════════════════════════════════════════════════════════════════
    `.trim();

    // Create and download the build sheet - mobile-friendly approach
    const blob = new Blob([buildSheetContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.replace(/[^a-z0-9]/gi, '_')}_build_sheet.txt`;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    // Force download on mobile
    if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
      // For mobile, open in new window which allows saving
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.document.write(`<pre>${buildSheetContent}</pre>`);
        newWindow.document.title = `${recipe.name} Build Sheet`;
      }
    } else {
      a.click();
    }
    
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 100);

    // Also show preview for development testing
    setPreviewContent(buildSheetContent);
    setIsPreviewDialogOpen(true);

    toast({
      title: "Build Sheet Generated",
      description: `Downloaded ${recipe.name} build sheet for kitchen use`,
    });
  };

  const generateCostSheet = async (recipe: any) => {
    console.log('Generating cost sheet for recipe:', recipe);
    
    // Get full recipe data with ingredients
    const response = await fetch(`/api/recipes/${recipe.id}`);
    const fullRecipe = await response.json();
    console.log('Full recipe with ingredients:', fullRecipe);
    
    const ingredients = fullRecipe.ingredients || [];
    let totalCost = 0;
    
    const costSheetContent = `
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                        ${currentLocation?.name?.toUpperCase() || 'RESTAURANT'}
                       RECIPE COST ANALYSIS - CONFIDENTIAL
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

RECIPE: ${recipe.name.toUpperCase()}
Category: ${recipe.category?.charAt(0).toUpperCase() + recipe.category?.slice(1) || 'N/A'}
Serves: ${recipe.servingSize} portion${recipe.servingSize === 1 ? '' : 's'}
Prep: ${recipe.prepTime} min  |  Cook: ${recipe.cookTime} min
${recipe.sellingPrice ? `Menu Price: $${parseFloat(recipe.sellingPrice).toFixed(2)}` : 'Menu Price: NOT SET'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧾 INGREDIENT COSTS
${ingredients.map((ing: any, index: number) => {
  const itemName = ing.inventoryItem?.name || 'Unknown Item';
  const unitCost = ing.inventoryItem?.costPerUnit ? parseFloat(ing.inventoryItem.costPerUnit) : 0;
  const lineCost = parseFloat(ing.quantity) * unitCost;
  totalCost += lineCost;
  
  console.log(`Ingredient ${index + 1}:`, {
    name: itemName,
    quantity: ing.quantity,
    unit: ing.unit,
    unitCost,
    lineCost
  });
  
  return `${String(index + 1).padStart(2, '0')}. ${itemName.padEnd(25)} ${String(ing.quantity).padStart(6)} ${ing.unit.padEnd(8)} @ $${unitCost.toFixed(4)}  = $${lineCost.toFixed(2)}`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 FINANCIAL ANALYSIS
Total Recipe Cost:        $${totalCost.toFixed(2)}
Cost Per Serving:         $${(totalCost / recipe.servingSize).toFixed(2)}
${recipe.sellingPrice ? `
Menu Price Per Serving:   $${parseFloat(recipe.sellingPrice).toFixed(2)}
Food Cost Percentage:     ${((totalCost / recipe.servingSize) / parseFloat(recipe.sellingPrice) * 100).toFixed(1)}%
Profit Per Serving:       $${(parseFloat(recipe.sellingPrice) - (totalCost / recipe.servingSize)).toFixed(2)}
Target Food Cost (30%):   ${((totalCost / recipe.servingSize) / parseFloat(recipe.sellingPrice) * 100) <= 30 ? '✅ EXCELLENT' : ((totalCost / recipe.servingSize) / parseFloat(recipe.sellingPrice) * 100) <= 35 ? '⚠️  ACCEPTABLE' : '❌ TOO HIGH'}
` : `
Menu Price Per Serving:   NOT SET - PLEASE UPDATE
Food Cost Percentage:     Cannot calculate without menu price
Profit Analysis:          Requires menu price to be set
`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 PREPARATION NOTES
${recipe.instructions}

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
CONFIDENTIAL MANAGEMENT DOCUMENT - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
For Internal Use Only - Keep Secure
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    `.trim();

    // Create and download the cost sheet - mobile-friendly approach
    const blob = new Blob([costSheetContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.replace(/[^a-z0-9]/gi, '_')}_cost_sheet.txt`;
    a.style.display = 'none';
    document.body.appendChild(a);
    
    // Force download on mobile
    if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
      // For mobile, open in new window which allows saving
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.document.write(`<pre>${costSheetContent}</pre>`);
        newWindow.document.title = `${recipe.name} Cost Sheet`;
      }
    } else {
      a.click();
    }
    
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 100);

    // Also show preview for development testing
    setPreviewContent(costSheetContent);
    setIsPreviewDialogOpen(true);

    toast({
      title: "Cost Sheet Generated",
      description: `Downloaded ${recipe.name} cost analysis for management`,
    });
  };

  const onSubmit = (data: RecipeFormData) => {
    console.log("Form submitted successfully!");
    console.log("Form data:", data);
    console.log("Ingredients:", ingredients);
    
    // Check ingredients separately since they're not part of the form schema
    const validIngredients = ingredients.filter(ing => ing.inventoryItemId && ing.quantity > 0 && ing.unit);
    
    if (validIngredients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one ingredient with quantity and unit",
        variant: "destructive",
      });
      return;
    }
    
    // Check if any ingredients are missing units
    const incompleteIngredients = ingredients.filter(ing => ing.inventoryItemId && ing.quantity > 0 && !ing.unit);
    if (incompleteIngredients.length > 0) {
      toast({
        title: "Error",
        description: "Please select a unit for all ingredients",
        variant: "destructive",
      });
      return;
    }
    
    const submissionData = {
      ...data,
      // Convert sellingPrice to string as backend expects decimal as string
      sellingPrice: data.sellingPrice ? data.sellingPrice.toString() : undefined,
      ingredients: validIngredients
    } as any; // Type assertion to allow string sellingPrice
    
    console.log("Submitting:", submissionData);
    createRecipeMutation.mutate(submissionData);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { inventoryItemId: '', quantity: 0, unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
    
    // Auto-calculate selling price when ingredients change
    if (field === 'quantity' || field === 'inventoryItemId') {
      calculatePredictivePrice(updated);
    }
  };

  const calculatePredictivePrice = (currentIngredients: any[]) => {
    let totalCost = 0;
    
    currentIngredients.forEach(ingredient => {
      if (ingredient.inventoryItemId && ingredient.quantity > 0) {
        const item = inventoryItems.find((inv: any) => inv.id === ingredient.inventoryItemId);
        if (item) {
          totalCost += parseFloat(ingredient.quantity) * parseFloat(item.costPerUnit || 0);
        }
      }
    });
    
    // Calculate suggested selling price based on target food cost percentage
    const suggestedPrice = totalCost > 0 ? totalCost / (targetFoodCost / 100) : 0;
    
    // Update the form with suggested price
    if (suggestedPrice > 0) {
      form.setValue('sellingPrice', Math.round(suggestedPrice * 100) / 100);
    }
  };

  const handleViewDetails = async (recipe: any) => {
    try {
      const response = await apiRequest('GET', `/api/recipes/${recipe.id}`);
      const data = await response.json();
      setSelectedRecipe(data);
      setIsDetailsDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recipe details",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecipe = (recipeId: string) => {
    deleteRecipeMutation.mutate(recipeId);
  };

  const filteredRecipes = recipes.filter((recipe: any) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Recipes & Menu Costing</h1>
          <p className="text-gray-600">Manage recipes and calculate food costs</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary-600 hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]">
                <div className="flex-1 overflow-y-auto space-y-4 px-1 pr-3" style={{ maxHeight: 'calc(75vh - 80px)' }}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter recipe name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the recipe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="appetizer">Appetizer</SelectItem>
                            <SelectItem value="entree">Entree</SelectItem>
                            <SelectItem value="dessert">Dessert</SelectItem>
                            <SelectItem value="beverage">Beverage</SelectItem>
                            <SelectItem value="side">Side Dish</SelectItem>
                            <SelectItem value="sauce">Sauce/Dressing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="servingSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serving Size *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep Time (min) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="15"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 15)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cookTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cook Time (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => {
                      const currentCost = ingredients.reduce((total, ing) => {
                        if (ing.inventoryItemId && ing.quantity > 0) {
                          const item = inventoryItems.find((inv: any) => inv.id === ing.inventoryItemId);
                          return total + (parseFloat(String(ing.quantity)) * parseFloat(item?.costPerUnit || 0));
                        }
                        return total;
                      }, 0);
                      
                      const fieldValue = field.value || 0;
                      const currentFoodCostPercent = fieldValue > 0 ? (currentCost / fieldValue * 100) : 0;
                      const suggestedPrice = currentCost > 0 ? currentCost / (targetFoodCost / 100) : 0;
                      const profit = fieldValue > 0 ? fieldValue - currentCost : 0;
                      
                      return (
                        <FormItem>
                          <FormLabel>Selling Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              min="0"
                              placeholder="Auto-calculated"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          {currentCost > 0 && (
                            <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                              <div className="flex justify-between">
                                <span>Recipe Cost:</span>
                                <span className="font-medium">${currentCost.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Suggested ({targetFoodCost}%):</span>
                                <span className="font-medium text-blue-600">${suggestedPrice.toFixed(2)}</span>
                              </div>
                              {fieldValue > 0 && (
                                <>
                                  <div className="flex justify-between">
                                    <span>Food Cost %:</span>
                                    <span className={`font-medium ${
                                      currentFoodCostPercent <= 35 ? 'text-green-600' : 
                                      currentFoodCostPercent <= 45 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {currentFoodCostPercent.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Profit:</span>
                                    <span className={`font-medium ${
                                      profit > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      ${profit.toFixed(2)}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Step-by-step cooking instructions..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Pricing Strategy */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-blue-900">Pricing Strategy</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-blue-800">Target Food Cost %</label>
                      <select 
                        value={targetFoodCost}
                        onChange={(e) => {
                          const newTarget = parseInt(e.target.value);
                          setTargetFoodCost(newTarget);
                          calculatePredictivePrice(ingredients);
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                      >
                        <option value={25}>25% (Premium)</option>
                        <option value={30}>30% (Standard)</option>
                        <option value={35}>35% (Competitive)</option>
                        <option value={40}>40% (Budget)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-blue-800">Auto-Calculate Price</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => calculatePredictivePrice(ingredients)}
                        className="w-full mt-1"
                      >
                        Update Price
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Ingredients Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Recipe Ingredients</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIngredient}
                      data-testid="button-add-ingredient"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Ingredient
                    </Button>
                  </div>
                  
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Ingredient</label>
                        <Select
                          value={ingredient.inventoryItemId}
                          onValueChange={(value) => updateIngredient(index, 'inventoryItemId', value)}
                        >
                          <SelectTrigger data-testid={`select-ingredient-${index}`}>
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {(inventoryItems as any[])?.map((item: any) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-24">
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ingredient.quantity || ''}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>
                      
                      <div className="w-20">
                        <label className="text-sm font-medium">Unit</label>
                        <Select
                          value={ingredient.unit}
                          onValueChange={(value) => updateIngredient(index, 'unit', value)}
                        >
                          <SelectTrigger data-testid={`select-unit-${index}`}>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oz">oz</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="cup">cup</SelectItem>
                            <SelectItem value="tbsp">tbsp</SelectItem>
                            <SelectItem value="tsp">tsp</SelectItem>
                            <SelectItem value="piece">piece</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                        disabled={ingredients.length === 1}
                        data-testid={`button-remove-ingredient-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {ingredients.filter(ing => ing.inventoryItemId && ing.quantity > 0).length === 0 && (
                    <p className="text-sm text-gray-500">Add ingredients to calculate recipe cost</p>
                  )}
                </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t mt-4 bg-white">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createRecipeMutation.isPending}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe: any) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
              {/* Recipe Photo */}
              {recipe.imageUrl && (
                <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ChefHat className="h-5 w-5 text-primary-600" />
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {recipe.servingSize} {recipe.servingSize === 1 ? 'serving' : 'servings'}
                  </Badge>
                </div>
                {recipe.description && (
                  <p className="text-sm text-gray-600">{recipe.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Estimated Cost</span>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        {recipe.estimatedCost ? `$${recipe.estimatedCost.toFixed(2)}` : '$0.00'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Selling Price</span>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        {recipe.sellingPrice ? `$${parseFloat(recipe.sellingPrice).toFixed(2)}` : 'Not set'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Food Cost %</span>
                    <span className={`text-sm font-medium ${
                      recipe.estimatedCost && recipe.sellingPrice ? 
                        (recipe.estimatedCost / recipe.sellingPrice * 100) <= 35 ? 'text-green-600' : 
                        (recipe.estimatedCost / recipe.sellingPrice * 100) <= 45 ? 'text-yellow-600' : 'text-red-600'
                      : 'text-gray-500'
                    }`}>
                      {recipe.estimatedCost && recipe.sellingPrice ? 
                        `${(recipe.estimatedCost / recipe.sellingPrice * 100).toFixed(1)}%` : 
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Ingredients</span>
                    <span className="text-sm font-medium">
                      {recipe.ingredientCount || 0} items
                    </span>
                  </div>
                  <div className="pt-2 border-t space-y-2">
                    {/* Primary Actions Row */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewDetails(recipe)}
                        data-testid={`button-view-details-${recipe.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-${recipe.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{recipe.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRecipe(recipe.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {/* Recipe Sheets Row */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={async () => await generateBuildSheet(recipe)}
                        data-testid={`button-build-sheet-${recipe.id}`}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Build Sheet
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        onClick={async () => await generateCostSheet(recipe)}
                        data-testid={`button-cost-sheet-${recipe.id}`}
                      >
                        <Calculator className="h-4 w-4 mr-1" />
                        Cost Sheet
                      </Button>
                    </div>
                    {/* Assignment Row */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setIsAssignDialogOpen(true);
                        }}
                        data-testid={`button-assign-recipe-${recipe.id}`}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Assign to Employee
                      </Button>
                    </div>
                    {/* Photo Upload Row */}
                    <div className="flex gap-2">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={10485760} // 10MB
                        onGetUploadParameters={async () => {
                          try {
                            console.log('Getting upload parameters...');
                            const response = await apiRequest('POST', '/api/objects/upload');
                            const data = await response.json();
                            console.log('Upload parameters received:', data);
                            return {
                              method: 'PUT' as const,
                              url: data.uploadURL,
                            };
                          } catch (error) {
                            console.error('Error getting upload parameters:', error);
                            toast({
                              title: "Upload Error",
                              description: "Failed to get upload parameters",
                              variant: "destructive",
                            });
                            throw error;
                          }
                        }}
                        onComplete={(result) => {
                          console.log('Upload completed:', result);
                          if (result.successful?.[0]?.uploadURL) {
                            uploadPhotoMutation.mutate({
                              recipeId: recipe.id,
                              imageUrl: result.successful[0].uploadURL,
                            });
                          } else {
                            toast({
                              title: "Upload Error",
                              description: "Photo upload failed",
                              variant: "destructive",
                            });
                          }
                        }}
                        buttonClassName="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        {recipe.imageUrl ? 'Update Photo' : 'Add Photo'}
                      </ObjectUploader>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredRecipes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "No recipes match your search criteria." : "Start by creating your first recipe."}
            </p>
            <Button className="bg-primary-600 hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recipe Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {selectedRecipe?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedRecipe?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedRecipe && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Recipe Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Serves</p>
                  <p className="font-medium">{selectedRecipe.servingSize}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Prep Time</p>
                  <p className="font-medium">{selectedRecipe.prepTime} min</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Cook Time</p>
                  <p className="font-medium">{selectedRecipe.cookTime} min</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Selling Price</p>
                  <p className="font-medium">
                    {selectedRecipe.sellingPrice ? `$${parseFloat(selectedRecipe.sellingPrice).toFixed(2)}` : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="font-medium mb-3">Ingredients</h3>
                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <span className="font-medium">{ingredient.inventoryItem?.name}</span>
                        <span className="text-sm text-gray-600">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Estimated Cost:</span>
                        <span className="font-medium text-green-600">
                          ${selectedRecipe.ingredients.reduce((total: number, ing: any) => 
                            total + (parseFloat(ing.quantity) * parseFloat(ing.inventoryItem?.costPerUnit || 0)), 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No ingredients added yet</p>
                )}
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-medium mb-3">Instructions</h3>
                <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                  {selectedRecipe.instructions}
                </div>
              </div>

            </div>
          )}
          
          {/* Fixed Actions at Bottom */}
          {selectedRecipe && (
            <div className="flex justify-between pt-4 border-t flex-shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Recipe
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{selectedRecipe.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteRecipe(selectedRecipe.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet Preview Dialog for Development Testing */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Recipe Sheet Preview</DialogTitle>
            <DialogDescription>
              This is how the sheet will look when downloaded or printed
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[70vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 text-gray-900 p-4 rounded border">
              {previewContent}
            </pre>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setIsPreviewDialogOpen(false)}>
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Recipe to Employee
            </DialogTitle>
            <DialogDescription>
              Assign {selectedRecipe?.name} to an employee for training or daily prep
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={assignmentPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setAssignmentPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Due Date (Optional)</label>
              <Input
                type="date"
                value={assignmentDueDate}
                onChange={(e) => setAssignmentDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Training notes, prep instructions, or special requirements..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAssignDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedRecipe && selectedEmployeeId) {
                    assignRecipeMutation.mutate({
                      employeeId: selectedEmployeeId,
                      recipeId: selectedRecipe.id,
                      priority: assignmentPriority,
                      dueDate: assignmentDueDate || undefined,
                      notes: assignmentNotes || undefined,
                    });
                  }
                }}
                disabled={!selectedRecipe || !selectedEmployeeId || assignRecipeMutation.isPending}
                className="flex-1"
              >
                {assignRecipeMutation.isPending ? "Assigning..." : "Assign Recipe"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
