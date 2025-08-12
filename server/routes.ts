import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertLocationSchema,
  insertCategorySchema,
  insertVendorSchema,
  insertInventoryItemSchema,
  insertRecipeSchema,
  insertRecipeIngredientSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertWasteEntrySchema,
  insertInventoryTransactionSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Locations
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locationData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(400).json({ message: "Failed to create location" });
    }
  });

  // Dashboard metrics
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Categories
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Vendors
  app.get('/api/vendors', isAuthenticated, async (req, res) => {
    try {
      const vendors = await storage.getVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const vendor = await storage.getVendor(id);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post('/api/vendors', isAuthenticated, async (req, res) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(vendorData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(400).json({ message: "Failed to create vendor" });
    }
  });

  app.put('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const vendorData = insertVendorSchema.partial().parse(req.body);
      const vendor = await storage.updateVendor(id, vendorData);
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(400).json({ message: "Failed to update vendor" });
    }
  });

  app.delete('/api/vendors/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVendor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(400).json({ message: "Failed to delete vendor" });
    }
  });

  // Inventory Items
  app.get('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const items = await storage.getInventoryItems(locationId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get('/api/inventory/low-stock', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const items = await storage.getLowStockItems(locationId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post('/api/inventory', isAuthenticated, async (req, res) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      const item = await storage.createInventoryItem(itemData);
      
      // Create inventory transaction for initial stock
      await storage.createInventoryTransaction({
        inventoryItemId: item.id,
        type: "in",
        quantity: itemData.quantity,
        reference: "Initial stock",
        createdBy: req.user?.claims?.sub,
      });
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(400).json({ message: "Failed to create inventory item" });
    }
  });

  app.put('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const itemData = insertInventoryItemSchema.partial().parse(req.body);
      const item = await storage.updateInventoryItem(id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(400).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete('/api/inventory/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInventoryItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(400).json({ message: "Failed to delete inventory item" });
    }
  });

  // Recipes
  app.get('/api/recipes', isAuthenticated, async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recipe = await storage.getRecipe(id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/recipes', isAuthenticated, async (req, res) => {
    try {
      const recipeData = insertRecipeSchema.parse(req.body);
      const recipe = await storage.createRecipe(recipeData);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(400).json({ message: "Failed to create recipe" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recipeData = insertRecipeSchema.partial().parse(req.body);
      const recipe = await storage.updateRecipe(id, recipeData);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(400).json({ message: "Failed to update recipe" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecipe(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(400).json({ message: "Failed to delete recipe" });
    }
  });

  // Recipe ingredients
  app.post('/api/recipes/:id/ingredients', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const ingredientData = insertRecipeIngredientSchema.parse({
        ...req.body,
        recipeId: id,
      });
      const ingredient = await storage.addRecipeIngredient(ingredientData);
      res.status(201).json(ingredient);
    } catch (error) {
      console.error("Error adding recipe ingredient:", error);
      res.status(400).json({ message: "Failed to add recipe ingredient" });
    }
  });

  app.delete('/api/recipe-ingredients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeRecipeIngredient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing recipe ingredient:", error);
      res.status(400).json({ message: "Failed to remove recipe ingredient" });
    }
  });

  // Purchase Orders
  app.get('/api/purchase-orders', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getPurchaseOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getPurchaseOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post('/api/purchase-orders', isAuthenticated, async (req, res) => {
    try {
      const orderData = insertPurchaseOrderSchema.parse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      const order = await storage.createPurchaseOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(400).json({ message: "Failed to create purchase order" });
    }
  });

  app.put('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const orderData = insertPurchaseOrderSchema.partial().parse(req.body);
      const order = await storage.updatePurchaseOrder(id, orderData);
      res.json(order);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(400).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete('/api/purchase-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePurchaseOrder(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(400).json({ message: "Failed to delete purchase order" });
    }
  });

  // Purchase order items
  app.post('/api/purchase-orders/:id/items', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const itemData = insertPurchaseOrderItemSchema.parse({
        ...req.body,
        purchaseOrderId: id,
      });
      const item = await storage.addPurchaseOrderItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding purchase order item:", error);
      res.status(400).json({ message: "Failed to add purchase order item" });
    }
  });

  app.delete('/api/purchase-order-items/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removePurchaseOrderItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing purchase order item:", error);
      res.status(400).json({ message: "Failed to remove purchase order item" });
    }
  });

  // Waste Tracking
  app.get('/api/waste', isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const entries = await storage.getWasteEntries(locationId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching waste entries:", error);
      res.status(500).json({ message: "Failed to fetch waste entries" });
    }
  });

  app.post('/api/waste', isAuthenticated, async (req, res) => {
    try {
      const wasteData = insertWasteEntrySchema.parse({
        ...req.body,
        reportedBy: req.user?.claims?.sub,
      });
      const entry = await storage.createWasteEntry(wasteData);
      
      // Create inventory transaction for waste
      await storage.createInventoryTransaction({
        inventoryItemId: wasteData.inventoryItemId!,
        type: "out",
        quantity: wasteData.quantity,
        reference: `Waste: ${wasteData.reason}`,
        notes: wasteData.notes,
        createdBy: req.user?.claims?.sub,
      });
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating waste entry:", error);
      res.status(400).json({ message: "Failed to create waste entry" });
    }
  });

  app.get('/api/waste/stats', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const stats = await storage.getWasteStats(start, end);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching waste stats:", error);
      res.status(500).json({ message: "Failed to fetch waste stats" });
    }
  });

  // Inventory Transactions
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.query;
      const transactions = await storage.getInventoryTransactions(itemId as string);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching inventory transactions:", error);
      res.status(500).json({ message: "Failed to fetch inventory transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const transactionData = insertInventoryTransactionSchema.parse({
        ...req.body,
        createdBy: req.user?.claims?.sub,
      });
      const transaction = await storage.createInventoryTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating inventory transaction:", error);
      res.status(400).json({ message: "Failed to create inventory transaction" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
