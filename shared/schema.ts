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

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("staff"), // admin, manager, staff
  defaultLocationId: uuid("default_location_id").references(() => locations.id),
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
  servingSize: integer("serving_size").notNull().default(1),
  instructions: text("instructions"),
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
// Clover POS Integration Tables
export const cloverIntegrations = pgTable("clover_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  merchantId: varchar("merchant_id").notNull(),
  accessToken: varchar("access_token").notNull(),
  environment: varchar("environment").default("sandbox"), // sandbox or production
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clover Menu Items mapping to inventory
export const cloverMenuItems = pgTable("clover_menu_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cloverItemId: varchar("clover_item_id").notNull(),
  cloverIntegrationId: uuid("clover_integration_id").references(() => cloverIntegrations.id).notNull(),
  name: varchar("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mapping between Clover menu items and inventory items
export const cloverItemMappings = pgTable("clover_item_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cloverMenuItemId: uuid("clover_menu_item_id").references(() => cloverMenuItems.id).notNull(),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantityUsed: decimal("quantity_used", { precision: 10, scale: 3 }).notNull(), // Amount of inventory used per menu item
  unit: varchar("unit").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales transactions from Clover
export const cloverSales = pgTable("clover_sales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cloverOrderId: varchar("clover_order_id").notNull(),
  cloverIntegrationId: uuid("clover_integration_id").references(() => cloverIntegrations.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  orderDate: timestamp("order_date").notNull(),
  processedAt: timestamp("processed_at"),
  inventoryProcessed: boolean("inventory_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Line items from Clover sales
export const cloverSaleItems = pgTable("clover_sale_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cloverSaleId: uuid("clover_sale_id").references(() => cloverSales.id).notNull(),
  cloverMenuItemId: uuid("clover_menu_item_id").references(() => cloverMenuItems.id),
  itemName: varchar("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Category = typeof categories.$inferSelect;
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

// Clover POS types
export const insertCloverIntegrationSchema = createInsertSchema(cloverIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCloverMenuItemSchema = createInsertSchema(cloverMenuItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCloverItemMappingSchema = createInsertSchema(cloverItemMappings).omit({ id: true, createdAt: true });
export const insertCloverSaleSchema = createInsertSchema(cloverSales).omit({ id: true, createdAt: true });
export const insertCloverSaleItemSchema = createInsertSchema(cloverSaleItems).omit({ id: true, createdAt: true });

export type CloverIntegration = typeof cloverIntegrations.$inferSelect;
export type InsertCloverIntegration = z.infer<typeof insertCloverIntegrationSchema>;
export type CloverMenuItem = typeof cloverMenuItems.$inferSelect;
export type InsertCloverMenuItem = z.infer<typeof insertCloverMenuItemSchema>;
export type CloverItemMapping = typeof cloverItemMappings.$inferSelect;
export type InsertCloverItemMapping = z.infer<typeof insertCloverItemMappingSchema>;
export type CloverSale = typeof cloverSales.$inferSelect;
export type InsertCloverSale = z.infer<typeof insertCloverSaleSchema>;
export type CloverSaleItem = typeof cloverSaleItems.$inferSelect;
export type InsertCloverSaleItem = z.infer<typeof insertCloverSaleItemSchema>;
