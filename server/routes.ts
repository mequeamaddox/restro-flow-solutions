import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { posService } from "./posService";
import {
  insertLocationSchema,
  insertCategorySchema,
  insertVendorSchema,
  insertInventoryItemSchema,
  insertMenuItemSchema,
  insertMenuItemIngredientSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema,
  insertWasteEntrySchema,
  insertInventoryTransactionSchema,
  insertPosIntegrationSchema,
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

  // Menu Items & Recipes
  app.get('/api/recipes', isAuthenticated, async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.get('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const menuItem = await storage.getMenuItem(id);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      console.error("Error fetching menu item:", error);
      res.status(500).json({ message: "Failed to fetch menu item" });
    }
  });

  app.post('/api/recipes', isAuthenticated, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(400).json({ message: "Failed to create menu item" });
    }
  });

  app.put('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const menuItemData = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, menuItemData);
      res.json(menuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(400).json({ message: "Failed to update menu item" });
    }
  });

  app.delete('/api/recipes/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMenuItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(400).json({ message: "Failed to delete menu item" });
    }
  });

  // Menu item ingredients
  app.post('/api/recipes/:id/ingredients', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const ingredientData = insertMenuItemIngredientSchema.parse({
        ...req.body,
        menuItemId: id,
      });
      const ingredient = await storage.addMenuItemIngredient(ingredientData);
      res.status(201).json(ingredient);
    } catch (error) {
      console.error("Error adding menu item ingredient:", error);
      res.status(400).json({ message: "Failed to add menu item ingredient" });
    }
  });

  app.delete('/api/menu-item-ingredients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeMenuItemIngredient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing menu item ingredient:", error);
      res.status(400).json({ message: "Failed to remove menu item ingredient" });
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
      // Generate order number
      const orderNumber = `PO-${Date.now()}`;
      
      // Convert string dates to Date objects and prepare data
      const orderData = {
        orderNumber,
        vendorId: req.body.vendorId,
        locationId: req.body.locationId,
        status: req.body.status || "draft",
        orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
        expectedDeliveryDate: req.body.expectedDeliveryDate ? new Date(req.body.expectedDeliveryDate) : null,
        totalAmount: req.body.totalAmount,
        notes: req.body.notes || null,
        createdBy: req.user?.claims?.sub,
      };
      
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

  // Universal POS Integration Routes
  app.get("/api/pos/integrations", isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const integrations = await storage.getPosIntegrations(locationId);
      res.json(integrations);
    } catch (error) {
      console.error("Error fetching POS integrations:", error);
      res.status(500).json({ message: "Failed to fetch POS integrations" });
    }
  });

  app.post("/api/pos/integrations", isAuthenticated, async (req, res) => {
    try {
      const integrationData = insertPosIntegrationSchema.parse(req.body);
      const integration = await storage.createPosIntegration(integrationData);
      res.status(201).json(integration);
    } catch (error) {
      console.error("Error creating POS integration:", error);
      res.status(500).json({ message: "Failed to create POS integration" });
    }
  });

  app.get("/api/pos/integrations/:id/test", isAuthenticated, async (req, res) => {
    try {
      const success = await posService.testConnection(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error testing POS connection:", error);
      res.status(500).json({ message: "Failed to test POS connection" });
    }
  });

  app.post("/api/pos/integrations/:id/sync", isAuthenticated, async (req, res) => {
    try {
      await posService.syncMenuItems(req.params.id);
      res.json({ message: "Menu items synced successfully" });
    } catch (error) {
      console.error("Error syncing menu items:", error);
      res.status(500).json({ message: "Failed to sync menu items" });
    }
  });

  app.put("/api/pos/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      const integrationData = insertPosIntegrationSchema.partial().parse(req.body);
      const integration = await storage.updatePosIntegration(req.params.id, integrationData);
      res.json(integration);
    } catch (error) {
      console.error("Error updating POS integration:", error);
      res.status(500).json({ message: "Failed to update POS integration" });
    }
  });

  app.delete("/api/pos/integrations/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePosIntegration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting POS integration:", error);
      res.status(500).json({ message: "Failed to delete POS integration" });
    }
  });

  // POS Sales data
  app.get("/api/pos/sales", isAuthenticated, async (req, res) => {
    try {
      const locationId = req.query.locationId as string;
      const sales = await storage.getPosSales(locationId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching POS sales:", error);
      res.status(500).json({ message: "Failed to fetch POS sales" });
    }
  });

  // Universal POS webhook endpoint (not protected by auth)
  app.post("/api/pos/webhook", async (req, res) => {
    try {
      console.log('Received POS webhook:', req.body);
      await posService.processOrderWebhook(req.body);
      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Error processing POS webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = req.query.locationId;
      const result = await db.execute(sql`
        SELECT * FROM cost_alerts 
        WHERE location_id = ${locationId}::uuid AND is_active = true
        ORDER BY severity DESC, created_at DESC
        LIMIT 20
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get('/api/analytics/business-intelligence', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = req.query.locationId;
      const period = req.query.period || 'today';
      
      let dateCondition = sql`DATE(report_date) = CURRENT_DATE`;
      if (period === 'week') {
        dateCondition = sql`report_date >= CURRENT_DATE - INTERVAL '7 days'`;
      } else if (period === 'month') {
        dateCondition = sql`report_date >= CURRENT_DATE - INTERVAL '30 days'`;
      }
      
      const result = await db.execute(sql`
        SELECT * FROM business_intelligence 
        WHERE location_id = ${locationId}::uuid AND report_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY report_date DESC
        LIMIT 1
      `);
      
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error("Error fetching business intelligence:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  app.get('/api/analytics/profit-loss', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = req.query.locationId;
      const period = req.query.period || 'today';
      
      // Calculate date range
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get sales data
      const salesResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total_revenue,
               COUNT(*) as transaction_count
        FROM pos_sales 
        WHERE location_id = ${locationId}::uuid 
        AND order_date BETWEEN ${startDate.toISOString()}::timestamp AND ${endDate.toISOString()}::timestamp
      `);

      // Get purchase data
      const purchaseResult = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(total AS DECIMAL)), 0) as total_purchases
        FROM purchase_orders 
        WHERE location_id = ${locationId}::uuid 
        AND order_date BETWEEN ${startDate.toISOString()}::timestamp AND ${endDate.toISOString()}::timestamp
        AND status = 'completed'
      `);

      const sales = salesResult.rows[0];
      const purchases = purchaseResult.rows[0];
      
      const totalRevenue = parseFloat(sales.total_revenue) || 0;
      const totalPurchases = parseFloat(purchases.total_purchases) || 0;
      const grossProfit = totalRevenue - totalPurchases;
      const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      
      const report = {
        period: { startDate, endDate },
        revenue: {
          total: totalRevenue,
          transactionCount: parseInt(sales.transaction_count) || 0,
          averageTicket: sales.transaction_count > 0 ? totalRevenue / parseInt(sales.transaction_count) : 0
        },
        cogs: {
          total: totalPurchases,
          percentage: totalRevenue > 0 ? (totalPurchases / totalRevenue) * 100 : 0
        },
        margins: {
          grossProfit,
          grossMarginPercentage
        }
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating P&L report:", error);
      res.status(500).json({ message: "Failed to generate P&L report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
