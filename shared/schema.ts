import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  pgEnum,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Locations table
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // restaurant, bar, cafe, etc.
  address: text("address"),
  phone: varchar("phone"),
  manager: varchar("manager"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription plans enum
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "professional", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "inactive", "cancelled", "past_due"]);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("staff"), // admin, manager, staff
  defaultLocationId: uuid("default_location_id").references(() => locations.id),
  // Subscription fields
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").default("free"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("inactive"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  ocrCreditsUsed: integer("ocr_credits_used").default(0),
  ocrCreditsLimit: integer("ocr_credits_limit").default(5), // Free tier gets 5 OCR processes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories for inventory items
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).default("general"), // general, bar, kitchen, cleaning, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  contactPerson: varchar("contact_person", { length: 100 }),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory items
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: varchar("unit", { length: 20 }).notNull(), // lbs, kg, L, pieces, bottles, cases, etc.
  costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
  reorderLevel: decimal("reorder_level", { precision: 10, scale: 2 }).notNull().default("0"),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  barcode: varchar("barcode"),
  // Bar-specific fields
  alcoholContent: decimal("alcohol_content", { precision: 5, scale: 2 }), // ABV percentage
  isAlcoholic: boolean("is_alcoholic").default(false),
  bottleSize: varchar("bottle_size"), // 750ml, 1L, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipes
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  servingSize: integer("serving_size").notNull().default(1),
  prepTime: integer("prep_time").notNull(), // minutes
  cookTime: integer("cook_time").notNull().default(0), // minutes
  instructions: text("instructions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipe ingredients (junction table)
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
});

// Bar menu items (cocktails, beers, wines)
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // cocktail, beer, wine, spirit, non-alcoholic
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu item ingredients (for cocktails and mixed drinks)
export const menuItemIngredients = pgTable("menu_item_ingredients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // oz, ml, etc.
  unit: varchar("unit", { length: 20 }).notNull(),
});

// Purchase orders
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["draft", "sent", "confirmed", "delivered", "cancelled"]);

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  status: purchaseOrderStatusEnum("status").default("draft"),
  orderDate: timestamp("order_date").defaultNow(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase order items
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
});

// Waste tracking
export const wasteReasons = pgEnum("waste_reason", ["expired", "spoiled", "damaged", "overproduction", "preparation_error", "other"]);

export const wasteEntries = pgTable("waste_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  reason: wasteReasons("reason").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  reportedBy: varchar("reported_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory transactions
export const transactionTypeEnum = pgEnum("transaction_type", ["in", "out", "adjustment"]);

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  reference: varchar("reference"), // PO number, recipe name, etc.
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const locationsRelations = relations(locations, ({ many }) => ({
  users: many(users),
  inventoryItems: many(inventoryItems),
  menuItems: many(menuItems),
  purchaseOrders: many(purchaseOrders),
  wasteEntries: many(wasteEntries),
  inventoryTransactions: many(inventoryTransactions),
}));

export const usersRelations = relations(users, ({ one }) => ({
  defaultLocation: one(locations, {
    fields: [users.defaultLocationId],
    references: [locations.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  inventoryItems: many(inventoryItems),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  inventoryItems: many(inventoryItems),
  purchaseOrders: many(purchaseOrders),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [inventoryItems.categoryId],
    references: [categories.id],
  }),
  vendor: one(vendors, {
    fields: [inventoryItems.vendorId],
    references: [vendors.id],
  }),
  location: one(locations, {
    fields: [inventoryItems.locationId],
    references: [locations.id],
  }),
  recipeIngredients: many(recipeIngredients),
  menuItemIngredients: many(menuItemIngredients),
  purchaseOrderItems: many(purchaseOrderItems),
  wasteEntries: many(wasteEntries),
  transactions: many(inventoryTransactions),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  location: one(locations, {
    fields: [menuItems.locationId],
    references: [locations.id],
  }),
  ingredients: many(menuItemIngredients),
}));

export const menuItemIngredientsRelations = relations(menuItemIngredients, ({ one }) => ({
  menuItem: one(menuItems, {
    fields: [menuItemIngredients.menuItemId],
    references: [menuItems.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [menuItemIngredients.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [recipeIngredients.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  location: one(locations, {
    fields: [purchaseOrders.locationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [purchaseOrderItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const wasteEntriesRelations = relations(wasteEntries, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [wasteEntries.inventoryItemId],
    references: [inventoryItems.id],
  }),
  location: one(locations, {
    fields: [wasteEntries.locationId],
    references: [locations.id],
  }),
  reporter: one(users, {
    fields: [wasteEntries.reportedBy],
    references: [users.id],
  }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryTransactions.inventoryItemId],
    references: [inventoryItems.id],
  }),
  location: one(locations, {
    fields: [inventoryTransactions.locationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [inventoryTransactions.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuItemIngredientSchema = createInsertSchema(menuItemIngredients).omit({ id: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });
export const insertWasteEntrySchema = createInsertSchema(wasteEntries).omit({ id: true, createdAt: true });
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, createdAt: true });

// Types
// Universal POS Integration Tables
export const posProviderEnum = pgEnum("pos_provider", ["clover", "spoton", "square", "toast", "revel"]);

export const posIntegrations = pgTable("pos_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  provider: posProviderEnum("provider").notNull(),
  name: varchar("name").notNull(), // User-friendly name for this integration
  merchantId: varchar("merchant_id").notNull(),
  credentials: jsonb("credentials").notNull(), // Store API keys, tokens, etc. as JSON
  environment: varchar("environment").default("sandbox"), // sandbox or production
  webhookUrl: varchar("webhook_url"), // Generated webhook URL for this integration
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Universal POS Menu Items
export const posMenuItems = pgTable("pos_menu_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  posItemId: varchar("pos_item_id").notNull(), // ID from the POS system
  posIntegrationId: uuid("pos_integration_id").references(() => posIntegrations.id).notNull(),
  name: varchar("name").notNull(),
  category: varchar("category"),
  price: decimal("price", { precision: 10, scale: 2 }),
  sku: varchar("sku"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mapping between POS menu items and inventory items
export const posItemMappings = pgTable("pos_item_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  posMenuItemId: uuid("pos_menu_item_id").references(() => posMenuItems.id).notNull(),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantityUsed: decimal("quantity_used", { precision: 10, scale: 3 }).notNull(), // Amount of inventory used per menu item
  unit: varchar("unit").notNull(),
  notes: text("notes"), // Additional mapping notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Universal POS Sales transactions
export const posSales = pgTable("pos_sales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  posOrderId: varchar("pos_order_id").notNull(),
  posIntegrationId: uuid("pos_integration_id").references(() => posIntegrations.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  tip: decimal("tip", { precision: 10, scale: 2 }),
  orderDate: timestamp("order_date").notNull(),
  processedAt: timestamp("processed_at"),
  inventoryProcessed: boolean("inventory_processed").default(false),
  metadata: jsonb("metadata"), // Store additional POS-specific data
  createdAt: timestamp("created_at").defaultNow(),
});

// Universal POS Sale items
export const posSaleItems = pgTable("pos_sale_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  posSaleId: uuid("pos_sale_id").references(() => posSales.id).notNull(),
  posMenuItemId: uuid("pos_menu_item_id").references(() => posMenuItems.id),
  itemName: varchar("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb("modifiers"), // Store item modifications as JSON
  createdAt: timestamp("created_at").defaultNow(),
});

// POS Integration schema exports
export const insertPosIntegrationSchema = createInsertSchema(posIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPosMenuItemSchema = createInsertSchema(posMenuItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPosItemMappingSchema = createInsertSchema(posItemMappings).omit({ id: true, createdAt: true });
export const insertPosSaleSchema = createInsertSchema(posSales).omit({ id: true, createdAt: true });
export const insertPosSaleItemSchema = createInsertSchema(posSaleItems).omit({ id: true, createdAt: true });

// Relations for POS tables
export const posIntegrationsRelations = relations(posIntegrations, ({ one, many }) => ({
  location: one(locations, {
    fields: [posIntegrations.locationId],
    references: [locations.id],
  }),
  menuItems: many(posMenuItems),
  sales: many(posSales),
}));

export const posMenuItemsRelations = relations(posMenuItems, ({ one, many }) => ({
  integration: one(posIntegrations, {
    fields: [posMenuItems.posIntegrationId],
    references: [posIntegrations.id],
  }),
  mappings: many(posItemMappings),
  saleItems: many(posSaleItems),
}));

export const posItemMappingsRelations = relations(posItemMappings, ({ one }) => ({
  posMenuItem: one(posMenuItems, {
    fields: [posItemMappings.posMenuItemId],
    references: [posMenuItems.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [posItemMappings.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const posSalesRelations = relations(posSales, ({ one, many }) => ({
  integration: one(posIntegrations, {
    fields: [posSales.posIntegrationId],
    references: [posIntegrations.id],
  }),
  location: one(locations, {
    fields: [posSales.locationId],
    references: [locations.id],
  }),
  items: many(posSaleItems),
}));

export const posSaleItemsRelations = relations(posSaleItems, ({ one }) => ({
  sale: one(posSales, {
    fields: [posSaleItems.posSaleId],
    references: [posSales.id],
  }),
  posMenuItem: one(posMenuItems, {
    fields: [posSaleItems.posMenuItemId],
    references: [posMenuItems.id],
  }),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Security and Audit Tables
export const securityLogs = pgTable("security_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // login, logout, access_denied, data_export, etc.
  resource: varchar("resource", { length: 255 }), // table/endpoint accessed
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  sessionId: varchar("session_id"),
  severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("low"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  locationId: varchar("location_id").references(() => locations.id),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id").notNull(),
  action: varchar("action", { enum: ["create", "update", "delete"] }).notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changedFields: jsonb("changed_fields"),
  reason: varchar("reason", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const costAlerts = pgTable("cost_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").references(() => locations.id),
  alertType: varchar("alert_type", { enum: ["price_variance", "budget_exceeded", "waste_threshold", "low_margin"] }).notNull(),
  itemId: varchar("item_id").references(() => inventoryItems.id),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  actualValue: decimal("actual_value", { precision: 10, scale: 2 }),
  variance: decimal("variance", { precision: 8, scale: 2 }),
  severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  isActive: boolean("is_active").default(true),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessIntelligence = pgTable("business_intelligence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").references(() => locations.id),
  reportDate: timestamp("report_date").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  totalCogs: decimal("total_cogs", { precision: 12, scale: 2 }).default("0"),
  grossMargin: decimal("gross_margin", { precision: 8, scale: 2 }).default("0"),
  foodCostPercentage: decimal("food_cost_percentage", { precision: 5, scale: 2 }).default("0"),
  laborCostPercentage: decimal("labor_cost_percentage", { precision: 5, scale: 2 }).default("0"),
  wastePercentage: decimal("waste_percentage", { precision: 5, scale: 2 }).default("0"),
  inventoryTurnover: decimal("inventory_turnover", { precision: 8, scale: 2 }).default("0"),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }).default("0"),
  customerCount: integer("customer_count").default(0),
  topSellingItems: jsonb("top_selling_items"),
  lowPerformingItems: jsonb("low_performing_items"),
  trends: jsonb("trends"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceProcessing = pgTable("invoice_processing", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => vendors.id),
  locationId: uuid("location_id").references(() => locations.id),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { enum: ["pending", "approved", "paid", "disputed", "cancelled"] }).default("pending"),
  paymentMethod: varchar("payment_method", { enum: ["check", "ach", "wire", "credit_card"] }),
  paymentDate: timestamp("payment_date"),
  uploadMethod: varchar("upload_method", { enum: ["photo", "email", "upload", "edi"] }),
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }),
  lineItems: jsonb("line_items"),
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const priceMonitoring = pgTable("price_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inventoryItemId: varchar("inventory_item_id").references(() => inventoryItems.id),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  previousPrice: decimal("previous_price", { precision: 10, scale: 2 }),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  priceChange: decimal("price_change", { precision: 10, scale: 2 }),
  percentageChange: decimal("percentage_change", { precision: 8, scale: 2 }),
  threshold: decimal("threshold", { precision: 8, scale: 2 }).default("10.00"),
  alertSent: boolean("alert_sent").default(false),
  invoiceId: varchar("invoice_id").references(() => invoiceProcessing.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPermissions = pgTable("user_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  locationId: varchar("location_id").references(() => locations.id),
  role: varchar("role", { enum: ["owner", "manager", "assistant_manager", "kitchen_manager", "staff", "accountant"] }).notNull(),
  permissions: jsonb("permissions").notNull(), // Array of permission strings
  isActive: boolean("is_active").default(true),
  grantedBy: varchar("granted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").references(() => locations.id),
  category: varchar("category", { enum: ["food", "beverage", "labor", "utilities", "marketing", "maintenance"] }).notNull(),
  period: varchar("period", { enum: ["daily", "weekly", "monthly", "quarterly", "yearly"] }).notNull(),
  budgetAmount: decimal("budget_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: decimal("actual_amount", { precision: 12, scale: 2 }).default("0"),
  variance: decimal("variance", { precision: 12, scale: 2 }).default("0"),
  variancePercentage: decimal("variance_percentage", { precision: 8, scale: 2 }).default("0"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SecurityLog = typeof securityLogs.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type CostAlert = typeof costAlerts.$inferSelect;
export type BusinessIntelligence = typeof businessIntelligence.$inferSelect;
export type InvoiceProcessing = typeof invoiceProcessing.$inferSelect;
export type PriceMonitoring = typeof priceMonitoring.$inferSelect;
export type UserPermission = typeof userPermissions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;

export type InsertSecurityLog = typeof securityLogs.$inferInsert;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertCostAlert = typeof costAlerts.$inferInsert;
export type InsertBusinessIntelligence = typeof businessIntelligence.$inferInsert;
export type InsertInvoiceProcessing = typeof invoiceProcessing.$inferInsert;
export type InsertPriceMonitoring = typeof priceMonitoring.$inferInsert;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
export type InsertBudget = typeof budgets.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Category = typeof categories.$inferSelect;
export type PosIntegration = typeof posIntegrations.$inferSelect;
export type InsertPosIntegration = z.infer<typeof insertPosIntegrationSchema>;
export type PosMenuItem = typeof posMenuItems.$inferSelect;
export type InsertPosMenuItem = z.infer<typeof insertPosMenuItemSchema>;
export type PosItemMapping = typeof posItemMappings.$inferSelect;
export type InsertPosItemMapping = z.infer<typeof insertPosItemMappingSchema>;
export type PosSale = typeof posSales.$inferSelect;
export type InsertPosSale = z.infer<typeof insertPosSaleSchema>;
export type PosSaleItem = typeof posSaleItems.$inferSelect;
export type InsertPosSaleItem = z.infer<typeof insertPosSaleItemSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItemIngredient = typeof menuItemIngredients.$inferSelect;
export type InsertMenuItemIngredient = z.infer<typeof insertMenuItemIngredientSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type WasteEntry = typeof wasteEntries.$inferSelect;
export type InsertWasteEntry = z.infer<typeof insertWasteEntrySchema>;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;


