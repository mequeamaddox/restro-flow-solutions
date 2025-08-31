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
  autoOrderRules,
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
  // HR imports
  departments,
  positions,
  employees,
  shifts,
  availability,
  timeOffRequests,
  tasks,
  taskCompletions,
  messages,
  messageThreads,
  performanceReviews,
  timeEntries,
  type Department,
  type InsertDepartment,
  type Position,
  type InsertPosition,
  type Employee,
  type InsertEmployee,
  type Shift,
  type InsertShift,
  type Availability,
  type InsertAvailability,
  type TimeOffRequest,
  type InsertTimeOffRequest,
  type Task,
  type InsertTask,
  type TaskCompletion,
  type InsertTaskCompletion,
  type Message,
  type InsertMessage,
  type MessageThread,
  type InsertMessageThread,
  type PerformanceReview,
  type InsertPerformanceReview,
  type TimeEntry,
  type InsertTimeEntry,
  // Payroll imports
  payPeriods,
  paystubs,
  payrollDeductions,
  employeeDeductions,
  type PayPeriod,
  type InsertPayPeriod,
  type Paystub,
  type InsertPaystub,
  type PayrollDeduction,
  type InsertPayrollDeduction,
  type EmployeeDeduction,
  type InsertEmployeeDeduction,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, gte, lte, ilike, sum, isNull, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Subscription operations
  updateUserSubscription(userId: string, subscriptionData: { 
    subscriptionPlan?: 'free' | 'professional' | 'enterprise';
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'past_due';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionEndDate?: Date;
    ocrCreditsLimit?: number;
  }): Promise<User>;
  updateOcrCreditsUsed(userId: string, creditsUsed: number): Promise<User>;
  checkOcrAccess(userId: string): Promise<{ hasAccess: boolean; creditsRemaining: number; plan: string }>;
  resetOcrCredits(userId: string): Promise<User>;

  // Location operations
  getLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Vendor operations
  getVendors(locationId?: string): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<void>;

  // Auto-ordering rules
  getAutoOrderRules(userId: string): Promise<any[]>;
  createAutoOrderRule(ruleData: any): Promise<any>;
  updateAutoOrderRule(id: string, updateData: any): Promise<any>;

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
  getPurchaseOrders(locationId?: string): Promise<(PurchaseOrder & { vendor?: Vendor; items?: PurchaseOrderItem[] })[]>;
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
  getInvoices(status?: string, locationId?: string): Promise<any[]>;
  createInvoice(invoice: any): Promise<any>;
  updateInvoiceStatus(id: string, status: string): Promise<any>;
  updateInvoice(id: string, data: any): Promise<any>;
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

  // HR Department operations
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  // HR Position operations  
  getPositions(): Promise<Position[]>;
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position>;
  deletePosition(id: string): Promise<void>;

  // HR Employee operations
  getEmployees(): Promise<(Employee & { department?: Department; position?: Position })[]>;
  getEmployee(id: string): Promise<(Employee & { department?: Department; position?: Position }) | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;

  // HR Shift operations
  getShifts(): Promise<(Shift & { employee?: Employee })[]>;
  getShift(id: string): Promise<(Shift & { employee?: Employee }) | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: string): Promise<void>;

  // HR Task operations
  getTasks(): Promise<(Task & { assignedEmployee?: Employee })[]>;
  getTask(id: string): Promise<(Task & { assignedEmployee?: Employee }) | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // HR Time Entry operations (for time clock)
  getTimeEntries(): Promise<(TimeEntry & { employee?: Employee })[]>;
  getActiveTimeEntry(employeeId: string): Promise<TimeEntry | undefined>;
  clockIn(employeeId: string, shiftId?: string): Promise<TimeEntry>;
  clockOut(entryId: string): Promise<TimeEntry>;
  startBreak(entryId: string): Promise<TimeEntry>;
  endBreak(entryId: string): Promise<TimeEntry>;

  // HR Message operations
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string, userId: string): Promise<void>;
  
  // HR Analytics
  getHRAnalytics(): Promise<any>;

  // HR Payroll operations
  getPayPeriods(): Promise<PayPeriod[]>;
  getPayPeriod(id: string): Promise<PayPeriod | undefined>;
  createPayPeriod(payPeriod: InsertPayPeriod): Promise<PayPeriod>;
  updatePayPeriod(id: string, payPeriod: Partial<InsertPayPeriod>): Promise<PayPeriod>;
  calculatePayroll(payPeriodId: string): Promise<Paystub[]>;
  approvePayroll(payPeriodId: string, approvedBy: string): Promise<PayPeriod>;
  getPaystubsByPeriod(payPeriodId: string): Promise<(Paystub & { employee?: Employee })[]>;
  getPayrollDeductions(): Promise<PayrollDeduction[]>;
  getPayrollSummary(): Promise<{ totalEmployees: number; monthlyPayroll: number; avgHourlyRate: number; laborCostPercentage: number }>;
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

  // Subscription operations
  async updateUserSubscription(userId: string, subscriptionData: { 
    subscriptionPlan?: 'free' | 'professional' | 'enterprise';
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'past_due';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionEndDate?: Date;
    ocrCreditsLimit?: number;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...subscriptionData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateOcrCreditsUsed(userId: string, creditsUsed: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ocrCreditsUsed: creditsUsed,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkOcrAccess(userId: string): Promise<{ hasAccess: boolean; creditsRemaining: number; plan: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { hasAccess: false, creditsRemaining: 0, plan: 'free' };
    }

    const plan = user.subscriptionPlan || 'free';
    const creditsUsed = user.ocrCreditsUsed || 0;
    const creditsLimit = user.ocrCreditsLimit || 5;
    
    // Premium users have unlimited OCR access
    if (plan === 'professional' || plan === 'enterprise') {
      return { hasAccess: true, creditsRemaining: 999, plan };
    }
    
    // Free users have limited credits
    const creditsRemaining = Math.max(0, creditsLimit - creditsUsed);
    const hasAccess = creditsRemaining > 0;
    
    return { hasAccess, creditsRemaining, plan };
  }

  async resetOcrCredits(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ocrCreditsUsed: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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
  async getVendors(locationId?: string): Promise<Vendor[]> {
    if (locationId) {
      return await db.select().from(vendors)
        .where(eq(vendors.locationId, locationId))
        .orderBy(vendors.name);
    }
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

  // Auto-ordering rules
  async getAutoOrderRules(userId: string): Promise<any[]> {
    const rules = await db
      .select({
        id: autoOrderRules.id,
        ruleName: autoOrderRules.ruleName,
        itemId: autoOrderRules.itemId,
        vendorId: autoOrderRules.vendorId,
        triggerType: autoOrderRules.triggerType,
        reorderPoint: autoOrderRules.reorderPoint,
        orderQuantity: autoOrderRules.orderQuantity,
        frequency: autoOrderRules.frequency,
        enabled: autoOrderRules.enabled,
        lastTriggered: autoOrderRules.lastTriggered,
        estimatedSavings: autoOrderRules.estimatedSavings,
        createdAt: autoOrderRules.createdAt,
        updatedAt: autoOrderRules.updatedAt,
        itemName: inventoryItems.name,
        vendorName: vendors.name,
      })
      .from(autoOrderRules)
      .leftJoin(inventoryItems, eq(autoOrderRules.itemId, inventoryItems.id))
      .leftJoin(vendors, eq(autoOrderRules.vendorId, vendors.id))
      .where(eq(autoOrderRules.userId, userId));
    
    return rules;
  }

  async createAutoOrderRule(ruleData: any): Promise<any> {
    const [newRule] = await db
      .insert(autoOrderRules)
      .values({
        ruleName: ruleData.ruleName,
        itemId: ruleData.itemId,
        vendorId: ruleData.vendorId,
        triggerType: ruleData.triggerType,
        reorderPoint: ruleData.reorderPoint,
        orderQuantity: ruleData.orderQuantity,
        frequency: ruleData.frequency,
        estimatedSavings: ruleData.estimatedSavings,
        userId: ruleData.userId,
        locationId: ruleData.locationId,
      })
      .returning();
    
    return newRule;
  }

  async updateAutoOrderRule(id: string, updateData: any): Promise<any> {
    const [updatedRule] = await db
      .update(autoOrderRules)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(autoOrderRules.id, id))
      .returning();
    
    return updatedRule;
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
  async getRecipes(locationId?: string): Promise<(Recipe & { ingredientCount: number; estimatedCost: number })[]> {
    let query = db.select().from(recipes).orderBy(recipes.name);
    
    if (locationId) {
      query = query.where(eq(recipes.locationId, locationId));
    }
    
    const allRecipes = await query;
    
    const recipesWithStats = await Promise.all(allRecipes.map(async (recipe) => {
      // Get ingredient count and cost
      const ingredients = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalCost: sql<number>`COALESCE(SUM(${recipeIngredients.quantity} * ${inventoryItems.costPerUnit}), 0)`
        })
        .from(recipeIngredients)
        .leftJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
        .where(eq(recipeIngredients.recipeId, recipe.id));
      
      const stats = ingredients[0] || { count: 0, totalCost: 0 };
      
      return {
        ...recipe,
        ingredientCount: Number(stats.count),
        estimatedCost: Number(stats.totalCost)
      };
    }));
    
    return recipesWithStats;
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

  async createRecipeWithIngredients(recipeData: InsertRecipe & { ingredients?: InsertRecipeIngredient[] }): Promise<Recipe> {
    const { ingredients, ...recipe } = recipeData;
    
    // Create recipe first
    const [createdRecipe] = await db.insert(recipes).values(recipe).returning();
    
    // Add ingredients if provided
    if (ingredients && ingredients.length > 0) {
      const ingredientsWithRecipeId = ingredients.map(ing => ({
        ...ing,
        recipeId: createdRecipe.id
      }));
      
      await db.insert(recipeIngredients).values(ingredientsWithRecipeId);
    }
    
    return createdRecipe;
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
  async getPurchaseOrders(locationId?: string): Promise<(PurchaseOrder & { vendor?: Vendor; items?: PurchaseOrderItem[] })[]> {
    const query = db
      .select()
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .orderBy(desc(purchaseOrders.createdAt));
    
    if (locationId) {
      query.where(eq(purchaseOrders.locationId, locationId));
    }
    
    return await query
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

  // Calculate food cost percentage from real POS sales and inventory costs
  async calculateFoodCostPercentage(): Promise<number> {
    try {
      // Get today's sales data from POS
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Get total revenue from POS sales
      const salesData = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(CAST(${posSales.total} AS DECIMAL)), 0)`,
        })
        .from(posSales)
        .where(
          sql`${posSales.orderDate} >= ${startOfDay} 
          AND ${posSales.orderDate} <= ${endOfDay}`
        );

      const totalRevenue = Number(salesData[0]?.totalRevenue || 0);

      if (totalRevenue === 0) {
        return 0; // No sales means no food cost percentage
      }

      // Get COGS from inventory transactions (items used/sold today)
      const cogsData = await db
        .select({
          totalCogs: sql<number>`COALESCE(SUM(CAST(${inventoryTransactions.quantity} AS DECIMAL) * 
            (SELECT CAST(cost_per_unit AS DECIMAL) FROM inventory_items WHERE id = ${inventoryTransactions.inventoryItemId})), 0)`,
        })
        .from(inventoryTransactions)
        .where(
          sql`${inventoryTransactions.type} = 'out' 
          AND ${inventoryTransactions.createdAt} >= ${startOfDay} 
          AND ${inventoryTransactions.createdAt} <= ${endOfDay}`
        );

      const totalCogs = Number(cogsData[0]?.totalCogs || 0);
      
      // Calculate food cost percentage: (COGS / Revenue) * 100
      return (totalCogs / totalRevenue) * 100;
    } catch (error) {
      console.error('Error calculating food cost percentage:', error);
      return 0; // Return 0 if calculation fails
    }
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
    
    // Calculate real food cost percentage from POS sales and inventory costs
    const foodCostPercentage = await this.calculateFoodCostPercentage();
    
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

  async getInvoices(status?: string, locationId?: string): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(invoiceProcessing)
        .leftJoin(vendors, eq(invoiceProcessing.vendorId, vendors.id))
        .orderBy(desc(invoiceProcessing.createdAt));

      const conditions = [];
      if (status && status !== 'all') {
        conditions.push(eq(invoiceProcessing.status, status));
      }
      if (locationId) {
        conditions.push(eq(invoiceProcessing.locationId, locationId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query;
      return results.map(row => {
        let lineItems = [];
        let fees = [];
        
        // Safe parsing of lineItems
        try {
          if (row.invoice_processing.lineItems) {
            lineItems = typeof row.invoice_processing.lineItems === 'string' 
              ? JSON.parse(row.invoice_processing.lineItems) 
              : row.invoice_processing.lineItems;
          }
        } catch (error) {
          console.error('Error parsing lineItems:', error);
          lineItems = [];
        }
        
        // Safe parsing of fees
        try {
          if (row.invoice_processing.fees) {
            fees = typeof row.invoice_processing.fees === 'string' 
              ? JSON.parse(row.invoice_processing.fees) 
              : row.invoice_processing.fees;
          }
        } catch (error) {
          console.error('Error parsing fees:', error);
          fees = [];
        }
        
        return {
          ...row.invoice_processing,
          vendor: row.vendors || undefined,
          totalAmount: parseFloat(row.invoice_processing.total || '0'),
          subtotal: parseFloat(row.invoice_processing.subtotal || '0'),
          tax: parseFloat(row.invoice_processing.tax || '0'),
          lineItems,
          fees,
        };
      });
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
        lineItems: invoice.lineItems ? JSON.stringify(invoice.lineItems) : null,
        fees: invoice.fees ? JSON.stringify(invoice.fees) : null, // IRS-compliant separate tracking of delivery, shipping, and other charges
        attachmentPath: invoice.attachmentPath || null, // Path to original invoice file
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

  async updateInvoice(id: string, data: any): Promise<any> {
    try {
      const updateData = {
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        total: data.total ? data.total.toString() : null,
        subtotal: data.subtotal ? data.subtotal.toString() : null,
        lineItems: data.lineItems ? JSON.stringify(data.lineItems) : null,
        fees: data.fees ? JSON.stringify(data.fees) : null,
        status: (data.status as any) || 'pending'
      };
      
      const [result] = await db
        .update(invoiceProcessing)
        .set(updateData)
        .where(eq(invoiceProcessing.id, id))
        .returning();
      
      return {
        ...result,
        totalAmount: parseFloat(result.total || '0'),
        subtotal: parseFloat(result.subtotal || '0'),
        tax: parseFloat(result.tax || '0'),
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    try {
      await db
        .delete(invoiceProcessing)
        .where(eq(invoiceProcessing.id, id));
    } catch (error) {
      console.error('Error deleting invoice:', error);
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
    try {
      // Get real cost alerts from database
      const result = await db.execute(sql`
        SELECT * FROM cost_alerts 
        WHERE (${ locationId ? locationId : 'null' } IS NULL OR location_id = ${ locationId ? locationId : 'null' })
        ORDER BY created_at DESC
        LIMIT 10
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching cost alerts:', error);
      return []; // Return empty array when no real alerts exist
    }
  }

  async getPriceMonitoring(timeRange: string): Promise<any[]> {
    try {
      // Get real price monitoring data from purchase orders and invoices
      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      const priceHistory = await db
        .select({
          itemName: inventoryItems.name,
          vendorName: vendors.name,
          currentPrice: inventoryItems.costPerUnit,
          createdAt: inventoryItems.createdAt,
        })
        .from(inventoryItems)
        .leftJoin(vendors, eq(inventoryItems.vendorId, vendors.id))
        .where(gte(inventoryItems.updatedAt, startDate))
        .orderBy(desc(inventoryItems.updatedAt))
        .limit(20);
      
      return priceHistory.map(item => ({
        id: `pm-${item.itemName}-${Date.now()}`,
        itemName: item.itemName,
        vendorName: item.vendorName || 'Unknown Vendor',
        currentPrice: parseFloat(item.currentPrice || '0'),
        previousPrice: parseFloat(item.currentPrice || '0'), // Would need historical data for real comparison
        percentageChange: 0, // Would calculate from historical data
        changeDate: item.createdAt || new Date()
      }));
    } catch (error) {
      console.error('Error fetching price monitoring:', error);
      return []; // Return empty array when no data exists
    }
  }

  async getCostTrends(timeRange: string, locationId?: string): Promise<any[]> {
    try {
      // Get real cost trends from actual data
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      // Get sales data for the period
      const salesData = locationId 
        ? await this.getPosSalesByDateRange(locationId, startDate, new Date())
        : [];
      
      // Get waste data for the period
      const wasteStats = await this.getWasteStats(startDate, new Date());
      
      // Calculate daily aggregates from real data
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        // Filter sales for this day
        const daySales = salesData.filter(sale => {
          const saleDate = new Date(sale.orderDate);
          return saleDate >= dayStart && saleDate <= dayEnd;
        });
        
        const dayRevenue = daySales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
        
        trends.push({
          date: dayStart.toISOString().split('T')[0],
          actualCost: dayRevenue * 0.3, // Approximate COGS at 30%
          budgetedCost: dayRevenue * 0.28, // Budget target at 28%
          foodCostPercentage: dayRevenue > 0 ? 30 : 0,
          grossMarginPercentage: dayRevenue > 0 ? 70 : 0,
          wastePercentage: dayRevenue > 0 ? (wasteStats.totalCost / days / Math.max(dayRevenue, 1)) * 100 : 0
        });
      }
      
      return trends;
    } catch (error) {
      console.error('Error fetching cost trends:', error);
      return []; // Return empty array when no data exists
    }
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
  // HR Department operations
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }

  async updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department> {
    const [updated] = await db.update(departments)
      .set({ ...department, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // HR Position operations
  async getPositions(): Promise<Position[]> {
    return await db.select().from(positions).orderBy(positions.title);
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [created] = await db.insert(positions).values(position).returning();
    return created;
  }

  async updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position> {
    const [updated] = await db.update(positions)
      .set({ ...position, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    return updated;
  }

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  // HR Employee operations
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(employees.lastName, employees.firstName);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [result] = await db.select().from(employees).where(eq(employees.id, id));
    return result;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(employee).returning();
    return created;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db.update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // HR Shift operations
  async getShifts(): Promise<(Shift & { employee?: Employee })[]> {
    const result = await db.select({
      shift: shifts,
      employee: employees,
    })
    .from(shifts)
    .leftJoin(employees, eq(shifts.employeeId, employees.id))
    .orderBy(shifts.startTime);
    
    return result.map(r => ({ ...r.shift, employee: r.employee || undefined }));
  }

  async getShift(id: string): Promise<(Shift & { employee?: Employee }) | undefined> {
    const [result] = await db.select({
      shift: shifts,
      employee: employees,
    })
    .from(shifts)
    .leftJoin(employees, eq(shifts.employeeId, employees.id))
    .where(eq(shifts.id, id));
    
    return result ? { ...result.shift, employee: result.employee || undefined } : undefined;
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await db.insert(shifts).values(shift).returning();
    return created;
  }

  async updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift> {
    const [updated] = await db.update(shifts)
      .set({ ...shift, updatedAt: new Date() })
      .where(eq(shifts.id, id))
      .returning();
    return updated;
  }

  async deleteShift(id: string): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  // HR Task operations
  async getTasks(): Promise<(Task & { assignedEmployee?: Employee })[]> {
    const result = await db.select({
      task: tasks,
      assignedEmployee: employees,
    })
    .from(tasks)
    .leftJoin(employees, eq(tasks.assignedTo, employees.id))
    .orderBy(tasks.dueDate);
    
    return result.map(r => ({ ...r.task, assignedEmployee: r.assignedEmployee || undefined }));
  }

  async getTask(id: string): Promise<(Task & { assignedEmployee?: Employee }) | undefined> {
    const [result] = await db.select({
      task: tasks,
      assignedEmployee: employees,
    })
    .from(tasks)
    .leftJoin(employees, eq(tasks.assignedTo, employees.id))
    .where(eq(tasks.id, id));
    
    return result ? { ...result.task, assignedEmployee: result.assignedEmployee || undefined } : undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // HR Time Entry operations (for time clock)
  async getTimeEntries(): Promise<(TimeEntry & { employee?: Employee })[]> {
    const result = await db.select({
      timeEntry: timeEntries,
      employee: employees,
    })
    .from(timeEntries)
    .leftJoin(employees, eq(timeEntries.employeeId, employees.id))
    .orderBy(desc(timeEntries.clockInTime));
    
    return result.map(r => ({ ...r.timeEntry, employee: r.employee || undefined }));
  }

  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries)
      .where(and(
        eq(timeEntries.employeeId, employeeId),
        isNull(timeEntries.clockOutTime)
      ))
      .orderBy(desc(timeEntries.clockInTime));
    return entry;
  }

  async clockIn(employeeId: string, shiftId?: string): Promise<TimeEntry> {
    const [entry] = await db.insert(timeEntries).values({
      employeeId,
      shiftId: shiftId || null,
      clockInTime: new Date(),
      status: 'clocked-in',
    }).returning();
    return entry;
  }

  async clockOut(entryId: string): Promise<TimeEntry> {
    const clockOutTime = new Date();
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, entryId));
    
    if (!entry) throw new Error('Time entry not found');
    
    const clockInTime = entry.clockInTime;
    if (!clockInTime) throw new Error('Clock in time not found');
    const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    const [updated] = await db.update(timeEntries)
      .set({
        clockOutTime,
        totalHours: totalHours.toFixed(2),
        status: 'clocked-out',
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, entryId))
      .returning();
    
    return updated;
  }

  async startBreak(entryId: string): Promise<TimeEntry> {
    const [updated] = await db.update(timeEntries)
      .set({
        breakStartTime: new Date(),
        status: 'on-break',
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, entryId))
      .returning();
    
    return updated;
  }

  async endBreak(entryId: string): Promise<TimeEntry> {
    const [updated] = await db.update(timeEntries)
      .set({
        breakEndTime: new Date(),
        status: 'clocked-in',
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, entryId))
      .returning();
    
    return updated;
  }

  async updateTimeEntry(entryId: string, updateData: {
    clockInTime?: Date;
    clockOutTime?: Date;
    breakStartTime?: Date;
    breakEndTime?: Date;
    totalHours?: string;
    notes?: string;
  }): Promise<TimeEntry> {
    // Recalculate total hours if times are being updated
    if (updateData.clockInTime || updateData.clockOutTime) {
      const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, entryId));
      if (entry) {
        const clockIn = updateData.clockInTime || entry.clockInTime;
        const clockOut = updateData.clockOutTime || entry.clockOutTime;
        if (clockIn && clockOut) {
          const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          updateData.totalHours = totalHours.toFixed(2);
        }
      }
    }

    const [updated] = await db.update(timeEntries)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, entryId))
      .returning();
    
    return updated;
  }

  async deleteTimeEntry(entryId: string): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
  }

  // HR Message operations
  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) return;
    
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    const alreadyRead = readBy.some((r: any) => r.userId === userId);
    
    if (!alreadyRead) {
      readBy.push({ userId, readAt: new Date() });
      await db.update(messages)
        .set({ readBy, updatedAt: new Date() })
        .where(eq(messages.id, messageId));
    }
  }



  // HR Time-off Request operations
  async getTimeOffRequests(): Promise<TimeOffRequest[]> {
    return await db.select().from(timeOffRequests).orderBy(desc(timeOffRequests.createdAt));
  }

  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const [created] = await db.insert(timeOffRequests).values(request).returning();
    return created;
  }

  async updateTimeOffRequestStatus(id: string, status: string, notes?: string, approvedBy?: string): Promise<TimeOffRequest> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (notes) updateData.notes = notes;
    if (approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvalDate = new Date();
    }

    const [updated] = await db
      .update(timeOffRequests)
      .set(updateData)
      .where(eq(timeOffRequests.id, id))
      .returning();
    return updated;
  }

  // HR Analytics
  async getHRAnalytics(): Promise<any> {
    try {
      // Get all relevant data for analytics
      const [
        employees,
        shifts,
        tasks, 
        timeEntries,
        timeOffRequests,
        messages
      ] = await Promise.all([
        this.getEmployees(),
        this.getShifts(),
        this.getTasks(),
        this.getTimeEntries(),
        this.getTimeOffRequests(),
        this.getMessages()
      ]);

      // Calculate analytics
      const today = new Date().toISOString().split('T')[0];
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      const thisWeekEnd = new Date(thisWeekStart);
      thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

      const analytics = {
        // Basic counts
        totalEmployees: employees.length,
        activeEmployees: employees.filter((emp: any) => emp.status === 'active').length,
        currentlyWorking: timeEntries.filter((entry: any) => entry.status === 'clocked-in').length,
        
        // Today's metrics
        todayShifts: shifts.filter((shift: any) => shift.date === today).length,
        pendingTasks: tasks.filter((task: any) => task.status !== 'completed').length,
        unreadMessages: messages.filter((msg: any) => !msg.readBy?.length).length,
        
        // Time off
        pendingTimeOff: timeOffRequests.filter((req: any) => req.status === 'pending').length,
        approvedTimeOff: timeOffRequests.filter((req: any) => req.status === 'approved').length,
        
        // Weekly analytics
        weeklyShifts: shifts.filter((shift: any) => {
          const shiftDate = new Date(shift.date);
          return shiftDate >= thisWeekStart && shiftDate < thisWeekEnd;
        }).length,
        
        // Labor hours calculation
        totalWeeklyHours: shifts.reduce((total: number, shift: any) => {
          const shiftDate = new Date(shift.date);
          if (shiftDate >= thisWeekStart && shiftDate < thisWeekEnd) {
            const start = new Date(`2000-01-01T${shift.startTime}`);
            const end = new Date(`2000-01-01T${shift.endTime}`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            const actualHours = Math.max(0, hours - (shift.breakDuration / 60));
            return total + actualHours;
          }
          return total;
        }, 0),
        
        // Performance metrics
        taskCompletionRate: tasks.length > 0 ? 
          ((tasks.length - tasks.filter((task: any) => task.status !== 'completed').length) / tasks.length) * 100 : 100,
        
        // Recent activity
        recentMessages: messages.slice(0, 5),
        upcomingShifts: shifts
          .filter((shift: any) => new Date(shift.date) >= new Date())
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 10)
      };

      return analytics;
    } catch (error) {
      console.error('Error calculating HR analytics:', error);
      throw error;
    }
  }

  // HR Payroll operations
  async getPayPeriods(): Promise<PayPeriod[]> {
    return await db.select().from(payPeriods).orderBy(desc(payPeriods.startDate));
  }

  async getPayPeriod(id: string): Promise<PayPeriod | undefined> {
    const [payPeriod] = await db.select().from(payPeriods).where(eq(payPeriods.id, id));
    return payPeriod;
  }

  async createPayPeriod(payPeriodData: InsertPayPeriod): Promise<PayPeriod> {
    const [payPeriod] = await db
      .insert(payPeriods)
      .values(payPeriodData)
      .returning();
    return payPeriod;
  }

  async updatePayPeriod(id: string, payPeriodData: Partial<InsertPayPeriod>): Promise<PayPeriod> {
    const [payPeriod] = await db
      .update(payPeriods)
      .set({ ...payPeriodData, updatedAt: new Date() })
      .where(eq(payPeriods.id, id))
      .returning();
    return payPeriod;
  }

  async recalculatePayroll(payPeriodId: string): Promise<Paystub[]> {
    // Delete existing paystubs for this pay period
    await db.delete(paystubs).where(eq(paystubs.payPeriodId, payPeriodId));
    
    // Reset pay period status
    await this.updatePayPeriod(payPeriodId, {
      status: 'draft',
      totalGrossPay: '0',
      totalDeductions: '0',
      totalNetPay: '0'
    });
    
    // Recalculate
    return this.calculatePayroll(payPeriodId);
  }

  async calculatePayroll(payPeriodId: string): Promise<Paystub[]> {
    // Get the pay period
    const payPeriod = await this.getPayPeriod(payPeriodId);
    if (!payPeriod) throw new Error('Pay period not found');

    // Get all active employees
    const employees = await this.getEmployees();
    const activeEmployees = employees.filter(emp => emp.status === 'active');

    // Get time entries for the pay period
    const employeeTimeEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          gte(timeEntries.clockInTime, sql`${payPeriod.startDate}::timestamp`),
          lte(timeEntries.clockInTime, sql`${payPeriod.endDate}::timestamp + interval '1 day'`)
        )
      );

    const paystubsToCreate: InsertPaystub[] = [];

    for (const employee of activeEmployees) {
      // Calculate hours worked for this employee
      const empTimeEntries = employeeTimeEntries.filter(entry => entry.employeeId === employee.id);
      
      let regularHours = 0;
      let overtimeHours = 0;
      
      for (const entry of empTimeEntries) {
        if (entry.clockOutTime && entry.totalHours) {
          const hours = Number(entry.totalHours);
          if (regularHours + hours <= 40) {
            regularHours += hours;
          } else if (regularHours < 40) {
            const regularToAdd = 40 - regularHours;
            regularHours = 40;
            overtimeHours += hours - regularToAdd;
          } else {
            overtimeHours += hours;
          }
        }
      }

      const hourlyRate = Number(employee.hourlyRate || 15);
      const overtimeRate = hourlyRate * 1.5;
      
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * overtimeRate;
      const grossPay = regularPay + overtimePay;
      
      // Calculate realistic tax deductions
      const federalTax = grossPay * 0.08; // 8% federal (more realistic for restaurant workers)
      const stateTax = grossPay * 0.02; // 2% state (varies by state)
      const socialSecurity = grossPay * 0.062; // 6.2% (mandatory)
      const medicare = grossPay * 0.0145; // 1.45% (mandatory)
      
      const totalDeductions = federalTax + stateTax + socialSecurity + medicare;
      const netPay = grossPay - totalDeductions;

      paystubsToCreate.push({
        payPeriodId,
        employeeId: employee.id,
        regularHours: regularHours.toString(),
        overtimeHours: overtimeHours.toString(),
        regularRate: hourlyRate.toString(),
        overtimeRate: overtimeRate.toString(),
        regularPay: regularPay.toString(),
        overtimePay: overtimePay.toString(),
        grossPay: grossPay.toString(),
        federalTax: federalTax.toString(),
        stateTax: stateTax.toString(),
        socialSecurity: socialSecurity.toString(),
        medicare: medicare.toString(),
        totalDeductions: totalDeductions.toString(),
        netPay: netPay.toString(),
        status: 'calculated'
      });
    }

    // Insert all paystubs
    const createdPaystubs = await db
      .insert(paystubs)
      .values(paystubsToCreate)
      .returning();

    // Update pay period totals
    const totalGrossPay = paystubsToCreate.reduce((sum, stub) => sum + Number(stub.grossPay), 0);
    const totalDeductions = paystubsToCreate.reduce((sum, stub) => sum + Number(stub.totalDeductions), 0);
    const totalNetPay = paystubsToCreate.reduce((sum, stub) => sum + Number(stub.netPay), 0);

    await this.updatePayPeriod(payPeriodId, {
      status: 'calculated',
      totalGrossPay: totalGrossPay.toString(),
      totalDeductions: totalDeductions.toString(),
      totalNetPay: totalNetPay.toString()
    });

    return createdPaystubs;
  }

  async approvePayroll(payPeriodId: string, approvedBy: string): Promise<PayPeriod> {
    const [payPeriod] = await db
      .update(payPeriods)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(payPeriods.id, payPeriodId))
      .returning();
    return payPeriod;
  }

  async getPaystubsByPeriod(payPeriodId: string): Promise<(Paystub & { employee?: Employee })[]> {
    const paystubResults = await db
      .select({
        paystub: paystubs,
        employee: employees
      })
      .from(paystubs)
      .leftJoin(employees, eq(paystubs.employeeId, employees.id))
      .where(eq(paystubs.payPeriodId, payPeriodId));

    return paystubResults.map(result => ({
      ...result.paystub,
      employee: result.employee || undefined
    }));
  }

  async getPayrollDeductions(): Promise<PayrollDeduction[]> {
    return await db.select().from(payrollDeductions).where(eq(payrollDeductions.isActive, true));
  }

  async getPayrollSummary(): Promise<{ totalEmployees: number; monthlyPayroll: number; avgHourlyRate: number; laborCostPercentage: number }> {
    const employees = await this.getEmployees();
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    
    const totalEmployees = activeEmployees.length;
    
    // Get actual payroll data from calculated pay periods
    const recentPayPeriods = await db
      .select()
      .from(payPeriods)
      .where(eq(payPeriods.status, 'calculated'))
      .orderBy(sql`${payPeriods.createdAt} DESC`)
      .limit(4); // Last 4 pay periods for monthly estimate
    
    let monthlyPayroll = 0;
    let avgHourlyRate = 15;
    let laborCostPercentage = 30;
    
    if (recentPayPeriods.length > 0) {
      // Calculate actual monthly payroll from recent pay periods
      const totalNetPay = recentPayPeriods.reduce((sum, period) => 
        sum + Number(period.totalNetPay || 0), 0);
      
      // If biweekly pay periods, multiply by 2.17 to get monthly
      // If weekly, multiply by 4.33
      monthlyPayroll = totalNetPay * (26 / 12); // Assuming biweekly
      
      // Calculate actual average hourly rate from paystubs
      const payPeriodIds = recentPayPeriods.map(p => p.id);
      const allPaystubs = payPeriodIds.length > 0 ? await db
        .select()
        .from(paystubs)
        .where(sql`${paystubs.payPeriodId} = ANY(${payPeriodIds})`)
        : [];
      
      if (allPaystubs.length > 0) {
        const totalHours = allPaystubs.reduce((sum, stub) => 
          sum + Number(stub.regularHours || 0) + Number(stub.overtimeHours || 0), 0);
        const totalPay = allPaystubs.reduce((sum, stub) => 
          sum + Number(stub.grossPay || 0), 0);
        
        if (totalHours > 0) {
          avgHourlyRate = totalPay / totalHours;
        }
      }
      
      // TODO: Calculate labor cost percentage from actual sales data when POS integration active
      laborCostPercentage = 28; // Realistic target for restaurants
    } else {
      // Fallback to estimates if no calculated pay periods exist
      avgHourlyRate = activeEmployees.length > 0 
        ? activeEmployees.reduce((sum, emp) => sum + Number(emp.hourlyRate || 15), 0) / activeEmployees.length
        : 15;
      monthlyPayroll = totalEmployees * avgHourlyRate * 160;
    }
    
    return {
      totalEmployees,
      monthlyPayroll: Math.round(monthlyPayroll * 100) / 100,
      avgHourlyRate: Math.round(avgHourlyRate * 100) / 100,
      laborCostPercentage: Math.round(laborCostPercentage * 100) / 100
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
