import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChefHat, DollarSign, Clock, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";

const recipeFormSchema = z.object({
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  servingSize: z.number().min(1, "Serving size must be at least 1"),
  prepTime: z.number().min(1, "Prep time must be at least 1 minute"),
  cookTime: z.number().min(0, "Cook time must be 0 or more minutes"),
  instructions: z.string().min(1, "Instructions are required"),
  ingredients: z.array(z.object({
    inventoryItemId: z.string().min(1, "Please select an ingredient"),
    quantity: z.number().min(0.01, "Quantity must be greater than 0"),
    unit: z.string().min(1, "Unit is required")
  })).min(1, "At least one ingredient is required")
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [ingredients, setIngredients] = useState([{ inventoryItemId: '', quantity: 0, unit: '' }]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['/api/recipes'],
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['/api/inventory'],
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
      ingredients: [{ inventoryItemId: '', quantity: 0, unit: '' }]
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (data: RecipeFormData) => {
      await apiRequest('POST', '/api/recipes', {
        ...data,
        ingredients: ingredients.filter(ing => ing.inventoryItemId && ing.quantity > 0)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      setIsCreateDialogOpen(false);
      form.reset();
      setIngredients([{ inventoryItemId: '', quantity: 0, unit: '' }]);
      toast({
        title: "Success",
        description: "Recipe created successfully",
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
        description: "Failed to create recipe",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecipeFormData) => {
    createRecipeMutation.mutate(data);
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep Time (minutes) *</FormLabel>
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
                        <FormLabel>Cook Time (minutes)</FormLabel>
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
                            {inventoryItems?.map((item: any) => (
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
                
                <div className="flex justify-end space-x-2 pt-4">
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
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
                    <span className="text-sm text-gray-500">Ingredients</span>
                    <span className="text-sm font-medium">
                      {recipe.ingredientCount || 0} items
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
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
    </div>
  );
}
