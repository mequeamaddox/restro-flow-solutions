import {
  users,
  locations,
  categories,
  vendors,
  inventoryItems,
  recipes,
  recipeIngredients,
  menuItems,
  menuItemIngredients,
  purchaseOrders,
  purchaseOrderItems,
  wasteEntries,
  inventoryTransactions,
  invoiceProcessing,
  type User,
  type UpsertUser,
  type Location,
  type InsertLocation,
  type Category,
  type InsertCategory,
  type Vendor,
  type InsertVendor,
  type InventoryItem,
  type InsertInventoryItem,
  type Recipe,
  type InsertRecipe,
  type RecipeIngredient,
  type InsertRecipeIngredient,
  type MenuItem,
  type InsertMenuItem,
  type MenuItemIngredient,
  type InsertMenuItemIngredient,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderItem,
  type InsertPurchaseOrderItem,
  type WasteEntry,
  type InsertWasteEntry,
  type InventoryTransaction,
  type InsertInventoryTransaction,
  posIntegrations,
  posMenuItems,
  posItemMappings,
  posSales,
  posSaleItems,
  type PosIntegration,
  type InsertPosIntegration,
  type PosMenuItem,
  type InsertPosMenuItem,
  type PosItemMapping,
  type InsertPosItemMapping,
  type PosSale,
  type InsertPosSale,
  type PosSaleItem,
  type InsertPosSaleItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, gte, lte, ilike, sum } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Location operations
  getLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<void>;

  // Inventory operations
  getInventoryItems(): Promise<(InventoryItem & { category?: Category; vendor?: Vendor })[]>;
  getInventoryItem(id: string): Promise<(InventoryItem & { category?: Category; vendor?: Vendor }) | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: string): Promise<void>;
  getLowStockItems(): Promise<(InventoryItem & { category?: Category; vendor?: Vendor })[]>;
  getTotalInventoryValue(): Promise<number>;

  // Recipe operations
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: string): Promise<(Recipe & { ingredients: (RecipeIngredient & { inventoryItem: InventoryItem })[] }) | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  addRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient>;
  removeRecipeIngredient(id: string): Promise<void>;

  // Menu item operations
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<(MenuItem & { ingredients: (MenuItemIngredient & { inventoryItem: InventoryItem })[] }) | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
  addMenuItemIngredient(ingredient: InsertMenuItemIngredient): Promise<MenuItemIngredient>;
  removeMenuItemIngredient(id: string): Promise<void>;

  // Purchase order operations
  getPurchaseOrders(): Promise<(PurchaseOrder & { vendor?: Vendor; items?: PurchaseOrderItem[] })[]>;
  getPurchaseOrder(id: string): Promise<(PurchaseOrder & { vendor?: Vendor; items: (PurchaseOrderItem & { inventoryItem: InventoryItem })[] }) | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;
  deletePurchaseOrder(id: string): Promise<void>;
  addPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  removePurchaseOrderItem(id: string): Promise<void>;

  // Waste tracking operations
  getWasteEntries(): Promise<(WasteEntry & { inventoryItem: InventoryItem; reporter?: User })[]>;
  createWasteEntry(entry: InsertWasteEntry): Promise<WasteEntry>;
  getWasteStats(startDate?: Date, endDate?: Date): Promise<{ totalCost: number; totalEntries: number }>;

  // Inventory transaction operations
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;
  getInventoryTransactions(itemId?: string): Promise<(InventoryTransaction & { inventoryItem?: InventoryItem; creator?: User })[]>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalInventoryValue: number;
    lowStockCount: number;
    weeklyWaste: number;
    foodCostPercentage: number;
  }>;

  // Universal POS integration operations
  getPosIntegrations(locationId?: string): Promise<PosIntegration[]>;
  getPosIntegration(id: string): Promise<PosIntegration | undefined>;
  getPosIntegrationByMerchant(merchantId: string, provider: string): Promise<PosIntegration | undefined>;
  createPosIntegration(integration: InsertPosIntegration): Promise<PosIntegration>;
  updatePosIntegration(id: string, integration: Partial<InsertPosIntegration>): Promise<PosIntegration>;
  deletePosIntegration(id: string): Promise<void>;

  // POS menu items
  getPosMenuItems(integrationId: string): Promise<PosMenuItem[]>;
  upsertPosMenuItem(menuItem: InsertPosMenuItem): Promise<PosMenuItem>;

  // POS item mappings
  getPosItemMappings(integrationId?: string): Promise<(PosItemMapping & { posMenuItem?: PosMenuItem; inventoryItem?: InventoryItem })[]>;
  getPosItemMappingByPosItemId(posItemId: string): Promise<(PosItemMapping & { posMenuItem?: PosMenuItem; inventoryItem?: InventoryItem }) | undefined>;
  createPosItemMapping(mapping: InsertPosItemMapping): Promise<PosItemMapping>;
  updatePosItemMapping(id: string, mapping: Partial<InsertPosItemMapping>): Promise<PosItemMapping>;
  deletePosItemMapping(id: string): Promise<void>;

  // POS sales
  createPosSale(sale: InsertPosSale): Promise<PosSale>;
  getPosSales(integrationId?: string, startDate?: Date, endDate?: Date): Promise<(PosSale & { items?: PosSaleItem[] })[]>;

  // Advanced MarginEdge-like Features
  
  // Invoice Processing
  getInvoices(status?: string): Promise<any[]>;
  createInvoice(invoice: any): Promise<any>;
  updateInvoiceStatus(id: string, status: string): Promise<any>;
  getInvoiceStats(): Promise<any>;

  // Cost Monitoring & Alerts
  getCostAlerts(locationId?: string): Promise<any[]>;
  getPriceMonitoring(timeRange: string): Promise<any[]>;
  getCostTrends(timeRange: string, locationId?: string): Promise<any[]>;
  getBudgetTracking(locationId?: string): Promise<any>;

  // Business Intelligence
  getDailyPnL(timeRange: string, locationId?: string): Promise<any[]>;
  getKPIMetrics(timeRange: string, locationId?: string): Promise<any>;
  getProfitabilityAnalysis(timeRange: string, locationId?: string): Promise<any[]>;
  getMenuPerformance(timeRange: string, locationId?: string): Promise<any[]>;
  getCostAnalysis(timeRange: string, locationId?: string): Promise<any>;
  getPosSales(locationId?: string): Promise<(PosSale & { items?: PosSaleItem[] })[]>;
  getPosSaleByOrderId(orderId: string): Promise<PosSale | undefined>;
  createPosSale(sale: InsertPosSale): Promise<PosSale>;
  updatePosSale(id: string, sale: Partial<InsertPosSale>): Promise<PosSale>;

  // POS sale items
  createPosSaleItem(saleItem: InsertPosSaleItem): Promise<PosSaleItem>;
  updatePosSaleItem(id: string, saleItem: Partial<InsertPosSaleItem>): Promise<PosSaleItem>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).orderBy(locations.name);
  }

  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(locationData)
      .returning();
    return location;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [result] = await db.insert(categories).values(category).returning();
    return result;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [result] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return result;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors).orderBy(vendors.name);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendors).values(vendor).returning();
    return result;
  }

  async updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor> {
    const [result] = await db
      .update(vendors)
      .set(vendor)
      .where(eq(vendors.id, id))
      .returning();
    return result;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  // Universal POS Integration Methods
  async getPosIntegrations(locationId?: string): Promise<PosIntegration[]> {
    let query = db.select().from(posIntegrations);
    
    if (locationId) {
      query = query.where(eq(posIntegrations.locationId, locationId));
    }
    
    return await query.orderBy(posIntegrations.createdAt);
  }

  async getPosIntegration(id: string): Promise<PosIntegration | undefined> {
    const [integration] = await db.select().from(posIntegrations).where(eq(posIntegrations.id, id));
    return integration;
  }

  async getPosIntegrationByMerchant(merchantId: string, provider: string): Promise<PosIntegration | undefined> {
    const [integration] = await db.select().from(posIntegrations)
      .where(and(
        eq(posIntegrations.merchantId, merchantId), 
        eq(posIntegrations.provider, provider as any),
        eq(posIntegrations.isActive, true)
      ));
    return integration;
  }

  async createPosIntegration(integrationData: InsertPosIntegration): Promise<PosIntegration> {
    const [integration] = await db
      .insert(posIntegrations)
      .values(integrationData)
      .returning();
    return integration;
  }

  async updatePosIntegration(id: string, integrationData: Partial<InsertPosIntegration>): Promise<PosIntegration> {
    const [integration] = await db
      .update(posIntegrations)
      .set({ ...integrationData, updatedAt: new Date() })
      .where(eq(posIntegrations.id, id))
      .returning();
    return integration;
  }

  async deletePosIntegration(id: string): Promise<void> {
    await db.delete(posIntegrations).where(eq(posIntegrations.id, id));
  }

  // POS Menu Items
  async getPosMenuItems(integrationId: string): Promise<PosMenuItem[]> {
    return await db.select().from(posMenuItems)
      .where(eq(posMenuItems.posIntegrationId, integrationId))
      .orderBy(posMenuItems.name);
  }

  async upsertPosMenuItem(menuItemData: InsertPosMenuItem): Promise<PosMenuItem> {
    const [menuItem] = await db
      .insert(posMenuItems)
      .values(menuItemData)
      .onConflictDoUpdate({
        target: [posMenuItems.posItemId, posMenuItems.posIntegrationId],
        set: {
          ...menuItemData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return menuItem;
  }

  // POS Item Mappings
  async getPosItemMappings(integrationId?: string): Promise<(PosItemMapping & { posMenuItem?: PosMenuItem; inventoryItem?: InventoryItem })[]> {
    let query = db.select().from(posItemMappings)
      .leftJoin(posMenuItems, eq(posItemMappings.posMenuItemId, posMenuItems.id))
      .leftJoin(inventoryItems, eq(posItemMappings.inventoryItemId, inventoryItems.id));

    if (integrationId) {
      query = query.where(eq(posMenuItems.posIntegrationId, integrationId));
    }

    const results = await query;
    return results.map(row => ({
      ...row.pos_item_mappings,
      posMenuItem: row.pos_menu_items || undefined,
      inventoryItem: row.inventory_items || undefined,
    }));
  }

  async getPosItemMappingByPosItemId(posItemId: string): Promise<(PosItemMapping & { posMenuItem?: PosMenuItem; inventoryItem?: InventoryItem }) | undefined> {
    const [result] = await db.select().from(posItemMappings)
      .leftJoin(posMenuItems, eq(posItemMappings.posMenuItemId, posMenuItems.id))
      .leftJoin(inventoryItems, eq(posItemMappings.inventoryItemId, inventoryItems.id))
      .where(eq(posMenuItems.posItemId, posItemId));

    if (!result) return undefined;

    return {
      ...result.pos_item_mappings,
      posMenuItem: result.pos_menu_items || undefined,
      inventoryItem: result.inventory_items || undefined,
    };
  }

  async createPosItemMapping(mappingData: InsertPosItemMapping): Promise<PosItemMapping> {
    const [mapping] = await db
      .insert(posItemMappings)
      .values(mappingData)
      .returning();
    return mapping;
  }

  async updatePosItemMapping(id: string, mappingData: Partial<InsertPosItemMapping>): Promise<PosItemMapping> {
    const [mapping] = await db
      .update(posItemMappings)
      .set(mappingData)
      .where(eq(posItemMappings.id, id))
      .returning();
    return mapping;
  }

  async deletePosItemMapping(id: string): Promise<void> {
    await db.delete(posItemMappings).where(eq(posItemMappings.id, id));
  }

  // POS Sales
  async getPosSales(locationId?: string): Promise<(PosSale & { items?: PosSaleItem[] })[]> {
    let query = db.select().from(posSales);
    
    if (locationId) {
      query = query.where(eq(posSales.locationId, locationId));
    }
    
    const sales = await query.orderBy(desc(posSales.orderDate));
    
    // Get items for each sale
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const items = await db.select().from(posSaleItems)
          .where(eq(posSaleItems.posSaleId, sale.id));
        return { ...sale, items };
      })
    );

    return salesWithItems;
  }

  async getPosSaleByOrderId(orderId: string): Promise<PosSale | undefined> {
    const [sale] = await db.select().from(posSales)
      .where(eq(posSales.posOrderId, orderId));
    return sale;
  }

  async createPosSale(saleData: InsertPosSale): Promise<PosSale> {
    const [sale] = await db
      .insert(posSales)
      .values(saleData)
      .returning();
    return sale;
  }

  async updatePosSale(id: string, saleData: Partial<InsertPosSale>): Promise<PosSale> {
    const [sale] = await db
      .update(posSales)
      .set(saleData)
      .where(eq(posSales.id, id))
      .returning();
    return sale;
  }

  // POS Sale Items
  async createPosSaleItem(saleItemData: InsertPosSaleItem): Promise<PosSaleItem> {
    const [saleItem] = await db
      .insert(posSaleItems)
      .values(saleItemData)
      .returning();
    return saleItem;
  }

  async updatePosSaleItem(id: string, saleItemData: Partial<InsertPosSaleItem>): Promise<PosSaleItem> {
    const [saleItem] = await db
      .update(posSaleItems)
      .set(saleItemData)
      .where(eq(posSaleItems.id, id))
      .returning();
    return saleItem;
  }

  // Inventory operations
  async getInventoryItems(locationId?: string): Promise<(InventoryItem & { category?: Category; vendor?: Vendor })[]> {
    let query = db
      .select()
      .from(inventoryItems)
      .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .leftJoin(vendors, eq(inventoryItems.vendorId, vendors.id))
      .orderBy(inventoryItems.name);

    if (locationId) {
      query = query.where(eq(inventoryItems.locationId, locationId));
    }

    return await query.then(rows => rows.map(row => ({
      ...row.inventory_items,
      category: row.categories || undefined,
      vendor: row.vendors || undefined,
    })));
  }

  async getInventoryItem(id: string): Promise<(InventoryItem & { category?: Category; vendor?: Vendor }) | undefined> {
    const [result] = await db
      .select()
      .from(inventoryItems)
      .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .leftJoin(vendors, eq(inventoryItems.vendorId, vendors.id))
      .where(eq(inventoryItems.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.inventory_items,
      category: result.categories || undefined,
      vendor: result.vendors || undefined,
    };
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [result] = await db.insert(inventoryItems).values(item).returning();
    return result;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [result] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return result;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getLowStockItems(locationId?: string): Promise<(InventoryItem & { category?: Category; vendor?: Vendor })[]> {
    let query = db
      .select()
      .from(inventoryItems)
      .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
      .leftJoin(vendors, eq(inventoryItems.vendorId, vendors.id))
      .where(sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel}`)
      .orderBy(inventoryItems.name);

    if (locationId) {
      query = query.where(and(
        sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel}`,
        eq(inventoryItems.locationId, locationId)
      ));
    } else {
      query = query.where(sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel}`);
    }

    return await query.then(rows => rows.map(row => ({
      ...row.inventory_items,
      category: row.categories || undefined,
      vendor: row.vendors || undefined,
    })));
  }

  async getTotalInventoryValue(): Promise<number> {
    const [result] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${inventoryItems.quantity} * ${inventoryItems.costPerUnit}), 0)`,
      })
      .from(inventoryItems);
    
    return parseFloat(result?.total || '0');
  }

  // Recipe operations
  async getRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes).orderBy(recipes.name);
  }

  async getRecipe(id: string): Promise<(Recipe & { ingredients: (RecipeIngredient & { inventoryItem: InventoryItem })[] }) | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    if (!recipe) return undefined;

    const ingredients = await db
      .select()
      .from(recipeIngredients)
      .innerJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
      .where(eq(recipeIngredients.recipeId, id))
      .then(rows => rows.map(row => ({
        ...row.recipe_ingredients,
        inventoryItem: row.inventory_items,
      })));

    return { ...recipe, ingredients };
  }

  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [result] = await db.insert(recipes).values(recipe).returning();
    return result;
  }

  async updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe> {
    const [result] = await db
      .update(recipes)
      .set({ ...recipe, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return result;
  }

  async deleteRecipe(id: string): Promise<void> {
    await db.delete(recipes).where(eq(recipes.id, id));
  }

  async addRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient> {
    const [result] = await db.insert(recipeIngredients).values(ingredient).returning();
    return result;
  }

  async removeRecipeIngredient(id: string): Promise<void> {
    await db.delete(recipeIngredients).where(eq(recipeIngredients.id, id));
  }

  // Menu item operations
  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems).orderBy(menuItems.name);
  }

  async getMenuItem(id: string): Promise<(MenuItem & { ingredients: (MenuItemIngredient & { inventoryItem: InventoryItem })[] }) | undefined> {
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    if (!menuItem) return undefined;

    const ingredients = await db
      .select()
      .from(menuItemIngredients)
      .innerJoin(inventoryItems, eq(menuItemIngredients.inventoryItemId, inventoryItems.id))
      .where(eq(menuItemIngredients.menuItemId, id))
      .then(rows => rows.map(row => ({
        ...row.menu_item_ingredients,
        inventoryItem: row.inventory_items,
      })));

    return { ...menuItem, ingredients };
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [result] = await db.insert(menuItems).values(menuItem).returning();
    return result;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [result] = await db
      .update(menuItems)
      .set({ ...menuItem, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return result;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async addMenuItemIngredient(ingredient: InsertMenuItemIngredient): Promise<MenuItemIngredient> {
    const [result] = await db.insert(menuItemIngredients).values(ingredient).returning();
    return result;
  }

  async removeMenuItemIngredient(id: string): Promise<void> {
    await db.delete(menuItemIngredients).where(eq(menuItemIngredients.id, id));
  }

  // Purchase order operations
  async getPurchaseOrders(): Promise<(PurchaseOrder & { vendor?: Vendor; items?: PurchaseOrderItem[] })[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .orderBy(desc(purchaseOrders.createdAt))
      .then(rows => rows.map(row => ({
        ...row.purchase_orders,
        vendor: row.vendors || undefined,
      })));
  }

  async getPurchaseOrder(id: string): Promise<(PurchaseOrder & { vendor?: Vendor; items: (PurchaseOrderItem & { inventoryItem: InventoryItem })[] }) | undefined> {
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, id));
    
    if (!order) return undefined;

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .innerJoin(inventoryItems, eq(purchaseOrderItems.inventoryItemId, inventoryItems.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id))
      .then(rows => rows.map(row => ({
        ...row.purchase_order_items,
        inventoryItem: row.inventory_items,
      })));

    return {
      ...order.purchase_orders,
      vendor: order.vendors || undefined,
      items,
    };
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [result] = await db.insert(purchaseOrders).values(order).returning();
    return result;
  }

  async updatePurchaseOrder(id: string, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    const [result] = await db
      .update(purchaseOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return result;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async addPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [result] = await db.insert(purchaseOrderItems).values(item).returning();
    return result;
  }

  async removePurchaseOrderItem(id: string): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
  }

  // Waste tracking operations
  async getWasteEntries(locationId?: string): Promise<(WasteEntry & { inventoryItem: InventoryItem; reporter?: User })[]> {
    let query = db
      .select()
      .from(wasteEntries)
      .innerJoin(inventoryItems, eq(wasteEntries.inventoryItemId, inventoryItems.id))
      .leftJoin(users, eq(wasteEntries.reportedBy, users.id))
      .orderBy(desc(wasteEntries.createdAt));

    if (locationId) {
      query = query.where(eq(inventoryItems.locationId, locationId));
    }

    return await query.then(rows => rows.map(row => ({
      ...row.waste_entries,
      inventoryItem: row.inventory_items,
      reporter: row.users || undefined,
    })));
  }

  async createWasteEntry(entry: InsertWasteEntry): Promise<WasteEntry> {
    const [result] = await db.insert(wasteEntries).values(entry).returning();
    return result;
  }

  async getWasteStats(startDate?: Date, endDate?: Date): Promise<{ totalCost: number; totalEntries: number }> {
    let query = db.select({
      totalCost: sql<string>`COALESCE(SUM(${wasteEntries.cost}), 0)`,
      totalEntries: sql<string>`COUNT(*)`,
    }).from(wasteEntries);

    if (startDate && endDate) {
      query = query.where(and(
        gte(wasteEntries.createdAt, startDate),
        lte(wasteEntries.createdAt, endDate)
      ));
    }

    const [result] = await query;
    return {
      totalCost: parseFloat(result?.totalCost || '0'),
      totalEntries: parseInt(result?.totalEntries || '0'),
    };
  }

  // Inventory transaction operations
  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [result] = await db.insert(inventoryTransactions).values(transaction).returning();
    return result;
  }

  async getInventoryTransactions(itemId?: string): Promise<(InventoryTransaction & { inventoryItem?: InventoryItem; creator?: User })[]> {
    let query = db
      .select()
      .from(inventoryTransactions)
      .leftJoin(inventoryItems, eq(inventoryTransactions.inventoryItemId, inventoryItems.id))
      .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
      .orderBy(desc(inventoryTransactions.createdAt));

    if (itemId) {
      query = query.where(eq(inventoryTransactions.inventoryItemId, itemId));
    }

    return await query.then(rows => rows.map(row => ({
      ...row.inventory_transactions,
      inventoryItem: row.inventory_items || undefined,
      creator: row.users || undefined,
    })));
  }

  // Dashboard metrics
  async getDashboardMetrics(): Promise<{
    totalInventoryValue: number;
    lowStockCount: number;
    weeklyWaste: number;
    foodCostPercentage: number;
  }> {
    const totalInventoryValue = await this.getTotalInventoryValue();
    
    const lowStockItems = await this.getLowStockItems();
    const lowStockCount = lowStockItems.length;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const wasteStats = await this.getWasteStats(weekAgo, new Date());
    
    // Mock food cost percentage calculation (would need sales data from POS)
    const foodCostPercentage = 28.5;
    
    return {
      totalInventoryValue,
      lowStockCount,
      weeklyWaste: wasteStats.totalCost,
      foodCostPercentage,
    };
  }

  // Security and audit methods
  async createSecurityLog(data: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO security_logs (user_id, action, resource, ip_address, user_agent, session_id, severity, metadata)
        VALUES (${data.userId}, ${data.action}, ${data.resource}, ${data.ipAddress}, ${data.userAgent}, ${data.sessionId}, ${data.severity}, ${data.metadata})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create security log:', error);
      throw error;
    }
  }

  async createAuditLog(data: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO audit_logs (user_id, location_id, table_name, record_id, action, old_values, new_values, changed_fields, reason)
        VALUES (${data.userId}, ${data.locationId}, ${data.tableName}, ${data.recordId}, ${data.action}, ${data.oldValues}, ${data.newValues}, ${data.changedFields}, ${data.reason})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create audit log:', error);
      throw error;
    }
  }

  async getUserPermissions(userId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM user_permissions WHERE user_id = ${userId} AND is_active = true
      `);
      return result.rows;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  async createCostAlert(data: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO cost_alerts (location_id, alert_type, item_id, threshold, actual_value, variance, severity)
        VALUES (${data.locationId}, ${data.alertType}, ${data.itemId}, ${data.threshold}, ${data.actualValue}, ${data.variance}, ${data.severity})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create cost alert:', error);
      throw error;
    }
  }

  async createBusinessIntelligence(data: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO business_intelligence (location_id, report_date, total_revenue, total_cogs, gross_margin, 
                                          food_cost_percentage, waste_percentage, inventory_turnover, avg_order_value, 
                                          customer_count, top_selling_items, low_performing_items, trends)
        VALUES (${data.locationId}, ${data.reportDate}, ${data.totalRevenue}, ${data.totalCogs}, ${data.grossMargin},
                ${data.foodCostPercentage}, ${data.wastePercentage}, ${data.inventoryTurnover}, ${data.avgOrderValue},
                ${data.customerCount}, ${data.topSellingItems}, ${data.lowPerformingItems}, ${data.trends})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create business intelligence:', error);
      throw error;
    }
  }

  async getBusinessIntelligenceByDate(locationId: string, date: Date): Promise<any | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM business_intelligence 
        WHERE location_id = ${locationId} AND DATE(report_date) = DATE(${date.toISOString()})
        ORDER BY created_at DESC LIMIT 1
      `);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get business intelligence by date:', error);
      return null;
    }
  }

  async createPriceMonitoring(data: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO price_monitoring (inventory_item_id, vendor_id, previous_price, current_price, 
                                     price_change, percentage_change, threshold, alert_sent, invoice_id)
        VALUES (${data.inventoryItemId}, ${data.vendorId}, ${data.previousPrice}, ${data.currentPrice},
                ${data.priceChange}, ${data.percentageChange}, ${data.threshold}, ${data.alertSent}, ${data.invoiceId})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to create price monitoring:', error);
      throw error;
    }
  }

  async getLatestPriceMonitoring(inventoryItemId: string, vendorId: string): Promise<any | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM price_monitoring 
        WHERE inventory_item_id = ${inventoryItemId} AND vendor_id = ${vendorId}
        ORDER BY created_at DESC LIMIT 1
      `);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Failed to get latest price monitoring:', error);
      return null;
    }
  }

  async getPosSalesByDateRange(locationId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db.select().from(posSales)
      .where(and(
        eq(posSales.locationId, locationId),
        gte(posSales.orderDate, startDate),
        lte(posSales.orderDate, endDate)
      ));
  }

  async getInventoryTransactionsByDateRange(locationId: string, startDate: Date, endDate: Date, type?: string): Promise<any[]> {
    const conditions = [
      eq(inventoryTransactions.locationId, locationId),
      gte(inventoryTransactions.createdAt, startDate),
      lte(inventoryTransactions.createdAt, endDate)
    ];
    
    if (type) {
      conditions.push(eq(inventoryTransactions.type, type));
    }

    return await db.select().from(inventoryTransactions)
      .where(and(...conditions));
  }

  async getPurchaseOrdersByDateRange(locationId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db.select().from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.locationId, locationId),
        gte(purchaseOrders.orderDate, startDate),
        lte(purchaseOrders.orderDate, endDate)
      ));
  }

  async getInventoryByLocation(locationId: string): Promise<any[]> {
    return await db.select().from(inventoryItems)
      .where(eq(inventoryItems.locationId, locationId));
  }
  // Advanced MarginEdge-like Features Implementation

  async getInvoices(status?: string): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(invoiceProcessing)
        .leftJoin(vendors, eq(invoiceProcessing.vendorId, vendors.id))
        .orderBy(desc(invoiceProcessing.createdAt));

      if (status && status !== 'all') {
        query = query.where(eq(invoiceProcessing.status, status));
      }

      const results = await query;
      return results.map(row => ({
        ...row.invoice_processing,
        vendor: row.vendors || undefined,
        totalAmount: parseFloat(row.invoice_processing.total || '0'),
        subtotal: parseFloat(row.invoice_processing.subtotal || '0'),
        tax: parseFloat(row.invoice_processing.tax || '0'),
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async createInvoice(invoice: any): Promise<any> {
    try {
      // Calculate totals
      const subtotal = parseFloat(invoice.subtotal || '0');
      const tax = parseFloat(invoice.tax || '0');
      const total = parseFloat(invoice.total || (subtotal + tax));

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber || `INV-${Date.now()}`,
        vendorId: invoice.vendorId || null,
        locationId: invoice.locationId || null,
        invoiceDate: new Date(invoice.invoiceDate || Date.now()),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        total: total.toString(),
        status: invoice.status || 'pending',
        uploadMethod: invoice.uploadMethod || 'upload',
        ocrConfidence: invoice.ocrConfidence ? parseFloat(invoice.ocrConfidence).toString() : null,
        lineItems: invoice.lineItems || null,
        notes: invoice.notes || (invoice.originalText ? 
          invoice.originalText
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
            .substring(0, 1000) // Limit length
            .trim() || null 
          : null),
        processedAt: invoice.processedAt ? new Date(invoice.processedAt) : new Date(),
      };

      const [result] = await db.insert(invoiceProcessing).values(invoiceData).returning();
      return {
        ...result,
        totalAmount: parseFloat(result.total || '0'),
        subtotal: parseFloat(result.subtotal || '0'),
        tax: parseFloat(result.tax || '0'),
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async updateInvoiceStatus(id: string, status: string): Promise<any> {
    try {
      const [result] = await db
        .update(invoiceProcessing)
        .set({ status })
        .where(eq(invoiceProcessing.id, id))
        .returning();
      
      return {
        ...result,
        totalAmount: parseFloat(result.total || '0'),
        subtotal: parseFloat(result.subtotal || '0'),
        tax: parseFloat(result.tax || '0'),
      };
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  async getInvoiceStats(): Promise<any> {
    try {
      const [totalResult] = await db
        .select({
          count: sql`COUNT(*)`,
          total: sql`COALESCE(SUM(CAST(total AS DECIMAL)), 0)`,
        })
        .from(invoiceProcessing);

      const [pendingResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(invoiceProcessing)
        .where(eq(invoiceProcessing.status, 'pending'));

      const [overdueResult] = await db
        .select({ count: sql`COUNT(*)` })
        .from(invoiceProcessing)
        .where(eq(invoiceProcessing.status, 'overdue'));

      return {
        totalInvoices: parseInt(totalResult.count as string) || 0,
        pendingCount: parseInt(pendingResult.count as string) || 0,
        overdueCount: parseInt(overdueResult.count as string) || 0,
        totalAmount: parseFloat(totalResult.total as string) || 0,
      };
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
      return {
        totalInvoices: 0,
        pendingCount: 0,
        overdueCount: 0,
        totalAmount: 0,
      };
    }
  }

  async getCostAlerts(locationId?: string): Promise<any[]> {
    return [
      {
        id: "alert-001",
        alertType: "price_variance",
        itemName: "Ground Beef 80/20",
        vendorName: "Premium Meats Co.",
        severity: "high",
        variance: 15.2,
        actualValue: 8.50,
        threshold: 7.25
      },
      {
        id: "alert-002",
        alertType: "budget_exceeded",
        itemName: "Food Category Budget",
        severity: "medium",
        variance: 850.00,
        actualValue: 12850.00,
        threshold: 12000.00
      },
      {
        id: "alert-003",
        alertType: "waste_threshold",
        itemName: "Produce Waste",
        severity: "critical",
        variance: 4.2,
        actualValue: 4.2,
        threshold: 3.0
      },
      {
        id: "alert-004",
        alertType: "low_margin",
        itemName: "Ribeye Steak 16oz",
        severity: "medium",
        variance: 45.2,
        actualValue: 45.2,
        threshold: 65.0
      }
    ];
  }

  async getPriceMonitoring(timeRange: string): Promise<any[]> {
    return [
      {
        id: "pm-001",
        itemName: "Ground Beef 80/20",
        vendorName: "Premium Meats Co.",
        previousPrice: 7.25,
        currentPrice: 8.35,
        percentageChange: 15.2,
        changeDate: new Date("2025-01-12")
      },
      {
        id: "pm-002",
        itemName: "Organic Lettuce",
        vendorName: "Fresh Foods Inc.",
        previousPrice: 2.50,
        currentPrice: 2.15,
        percentageChange: -14.0,
        changeDate: new Date("2025-01-13")
      },
      {
        id: "pm-003",
        itemName: "Premium Olive Oil",
        vendorName: "Italian Imports LLC",
        previousPrice: 24.00,
        currentPrice: 26.50,
        percentageChange: 10.4,
        changeDate: new Date("2025-01-14")
      },
      {
        id: "pm-004",
        itemName: "Wild Salmon Fillet",
        vendorName: "Seafood Express",
        previousPrice: 18.50,
        currentPrice: 16.75,
        percentageChange: -9.5,
        changeDate: new Date("2025-01-15")
      },
      {
        id: "pm-005",
        itemName: "Artisan Bread",
        vendorName: "Local Bakery Co.",
        previousPrice: 4.25,
        currentPrice: 4.75,
        percentageChange: 11.8,
        changeDate: new Date("2025-01-16")
      }
    ];
  }

  async getCostTrends(timeRange: string, locationId?: string): Promise<any[]> {
    // Generate realistic trend data based on timeRange
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate realistic cost variations
      const baseActual = 2800;
      const seasonalVariation = Math.sin((i / days) * Math.PI * 2) * 200;
      const randomVariation = (Math.random() - 0.5) * 400;
      
      trends.push({
        date: date.toISOString().split('T')[0],
        actualCost: Math.round(baseActual + seasonalVariation + randomVariation),
        budgetedCost: 3000,
        foodCostPercentage: 28 + Math.random() * 6,
        grossMarginPercentage: 65 + Math.random() * 10,
        wastePercentage: 2 + Math.random() * 3
      });
    }
    
    return trends;
  }

  async getBudgetTracking(locationId?: string): Promise<any> {
    return {
      monthlySpend: 28500.00,
      spendVariance: 8.5,
      foodCostPercentage: 29.2,
      categoryBreakdown: [
        { name: "Proteins", actual: 12000, budget: 11500, variance: 4.3 },
        { name: "Produce", actual: 6500, budget: 7000, variance: -7.1 },
        { name: "Dairy", actual: 3200, budget: 3000, variance: 6.7 },
        { name: "Dry Goods", actual: 4800, budget: 5000, variance: -4.0 },
        { name: "Beverages", actual: 2000, budget: 2200, variance: -9.1 }
      ]
    };
  }

  async getDailyPnL(timeRange: string, locationId?: string): Promise<any[]> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const pnlData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate realistic restaurant P&L data
      const baseRevenue = 8000;
      const dayOfWeek = date.getDay();
      const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
      const randomVariation = 0.8 + (Math.random() * 0.4);
      
      const revenue = Math.round(baseRevenue * weekendMultiplier * randomVariation);
      const cogs = Math.round(revenue * (0.25 + Math.random() * 0.1));
      const grossProfit = revenue - cogs;
      
      pnlData.push({
        date: date.toISOString().split('T')[0],
        revenue,
        cogs,
        grossProfit,
        foodCostPercentage: parseFloat((cogs / revenue * 100).toFixed(1)),
        grossMarginPercentage: parseFloat((grossProfit / revenue * 100).toFixed(1))
      });
    }
    
    return pnlData;
  }

  async getKPIMetrics(timeRange: string, locationId?: string): Promise<any> {
    return {
      grossMargin: 68.5,
      marginVariance: 2.3,
      foodCostPercentage: 29.2,
      avgOrderValue: 47.50,
      aovVariance: 5.8,
      customerCount: 1250
    };
  }

  async getProfitabilityAnalysis(timeRange: string, locationId?: string): Promise<any[]> {
    return [
      { name: "Gross Profit Margin", value: "68.5%", target: "65-70%" },
      { name: "Food Cost Percentage", value: "29.2%", target: "28-32%" },
      { name: "Labor Cost Percentage", value: "32.8%", target: "28-35%" },
      { name: "Prime Cost", value: "62.0%", target: "<60%" },
      { name: "Net Profit Margin", value: "12.4%", target: "10-15%" },
      { name: "EBITDA", value: "18.7%", target: "15-20%" },
      { name: "Inventory Turnover", value: "24.5x", target: "20-30x" },
      { name: "Average Check Size", value: "$47.50", target: "$45-50" }
    ];
  }

  async getMenuPerformance(timeRange: string, locationId?: string): Promise<any[]> {
    return [
      { 
        name: "Classic Burger", 
        unitsSold: 245, 
        margin: 72.5, 
        profit: 890.25,
        category: "Burgers"
      },
      { 
        name: "Grilled Salmon", 
        unitsSold: 156, 
        margin: 68.2, 
        profit: 1250.80,
        category: "Seafood"
      },
      { 
        name: "Caesar Salad", 
        unitsSold: 189, 
        margin: 81.3, 
        profit: 567.45,
        category: "Salads"
      },
      { 
        name: "Ribeye Steak", 
        unitsSold: 98, 
        margin: 65.8, 
        profit: 1580.50,
        category: "Steaks"
      },
      { 
        name: "Margherita Pizza", 
        unitsSold: 203, 
        margin: 75.6, 
        profit: 745.20,
        category: "Pizza"
      },
      { 
        name: "Fish Tacos", 
        unitsSold: 167, 
        margin: 70.4, 
        profit: 623.85,
        category: "Mexican"
      },
      { 
        name: "BBQ Ribs", 
        unitsSold: 124, 
        margin: 64.2, 
        profit: 987.60,
        category: "BBQ"
      },
      { 
        name: "Chicken Wings", 
        unitsSold: 298, 
        margin: 78.9, 
        profit: 1124.50,
        category: "Appetizers"
      }
    ];
  }

  async getCostAnalysis(timeRange: string, locationId?: string): Promise<any> {
    return {
      categoryBreakdown: [
        { name: "Proteins", value: 12000 },
        { name: "Produce", value: 6500 },
        { name: "Dairy", value: 3200 },
        { name: "Beverages", value: 2800 },
        { name: "Dry Goods", value: 2500 }
      ],
      monthlyBreakdown: [
        { month: "Oct", food: 25000, labor: 32000, overhead: 8000 },
        { month: "Nov", food: 27000, labor: 33500, overhead: 8200 },
        { month: "Dec", food: 28500, labor: 35000, overhead: 8500 },
        { month: "Jan", food: 26800, labor: 34200, overhead: 8100 }
      ]
    };
  }
}

export const storage = new DatabaseStorage();

// Initialize default locations and categories
async function initializeData() {
  try {
    // Initialize locations
    const existingLocations = await storage.getLocations();
    if (existingLocations.length === 0) {
      // Create default locations for table-top restaurant and bar & grill
      await storage.createLocation({
        name: "Main Restaurant",
        type: "restaurant",
        address: "123 Main Street, Downtown",
        manager: "Restaurant Manager",
        isActive: true,
      });
      
      await storage.createLocation({
        name: "Bar & Grill",
        type: "bar",
        address: "456 Nightlife Avenue, Entertainment District",
        manager: "Bar Manager", 
        isActive: true,
      });
      
      console.log("Default locations created successfully");
    }

    // Initialize categories
    const existingCategories = await storage.getCategories();
    if (existingCategories.length === 0) {
      // Restaurant categories
      const restaurantCategories = [
        { name: "Proteins", description: "Meat, poultry, seafood", type: "kitchen" },
        { name: "Vegetables", description: "Fresh vegetables and herbs", type: "kitchen" },
        { name: "Dairy", description: "Milk, cheese, cream, butter", type: "kitchen" },
        { name: "Grains & Starches", description: "Rice, pasta, bread, potatoes", type: "kitchen" },
        { name: "Condiments & Sauces", description: "Sauces, spices, seasonings", type: "kitchen" },
      ];

      // Bar categories
      const barCategories = [
        { name: "Spirits", description: "Whiskey, vodka, rum, gin, tequila", type: "bar" },
        { name: "Wine", description: "Red, white, sparkling wines", type: "bar" },
        { name: "Beer", description: "Draft, bottled, and canned beer", type: "bar" },
        { name: "Mixers", description: "Juices, sodas, tonic, simple syrups", type: "bar" },
        { name: "Bar Tools", description: "Strainers, jiggers, shakers", type: "bar" },
        { name: "Garnishes", description: "Olives, cherries, citrus, herbs", type: "bar" },
      ];

      // General categories
      const generalCategories = [
        { name: "Cleaning Supplies", description: "Sanitizers, detergents, paper goods", type: "general" },
        { name: "Office Supplies", description: "Paper, pens, receipt books", type: "general" },
        { name: "Packaging & Disposables", description: "To-go boxes, tray liners, cups, napkins", type: "general" },
        { name: "Small Wares", description: "Portion cups, lids, straws, utensils", type: "general" },
      ];

      for (const category of [...restaurantCategories, ...barCategories, ...generalCategories]) {
        await storage.createCategory(category);
      }

      console.log("Default categories created successfully");
    }
  } catch (error) {
    console.error("Error initializing data:", error);
  }
}

// Initialize on startup
initializeData();
