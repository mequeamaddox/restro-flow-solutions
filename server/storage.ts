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
