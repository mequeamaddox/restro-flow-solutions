import cron from "node-cron";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { posSales, posSaleItems, purchaseOrders, wasteEntries, businessIntelligence } from "../../shared/schema";

export function startAnalyticsScheduler() {
  console.log("Starting Analytics ETL scheduler...");

  // Run hourly at 5 minutes past the hour
  cron.schedule("5 * * * *", async () => {
    console.log("🔄 Starting hourly business intelligence ETL...");
    
    try {
      await computeBusinessIntelligence();
      console.log("✅ Business intelligence ETL completed successfully");
    } catch (error) {
      console.error("❌ Business intelligence ETL failed:", error);
    }
  });

  // Run nightly full recompute at 2 AM to correct any drift
  cron.schedule("0 2 * * *", async () => {
    console.log("🔄 Starting nightly business intelligence full recompute...");
    
    try {
      await computeBusinessIntelligence(true);
      console.log("✅ Nightly business intelligence recompute completed successfully");
    } catch (error) {
      console.error("❌ Nightly business intelligence recompute failed:", error);
    }
  });

  console.log("Analytics ETL scheduler started successfully");
}

async function computeBusinessIntelligence(fullRecompute = false) {
  // Get all locations
  const locations = await db.execute(sql`SELECT id FROM locations`);
  
  for (const location of locations.rows) {
    const locationId = location.id as string;
    
    // Determine date range to process
    let dateCondition;
    if (fullRecompute) {
      // Full recompute: process all data from the beginning
      dateCondition = sql`TRUE`;
    } else {
      // Incremental: process last 2 days to handle late-arriving data
      dateCondition = sql`DATE(${posSales.orderDate}) >= CURRENT_DATE - INTERVAL '2 days'`;
    }
    
    // Get distinct dates that have sales data for this location
    const datesResult = await db
      .selectDistinct({ date: sql<string>`DATE(${posSales.orderDate})` })
      .from(posSales)
      .where(sql`${posSales.locationId} = ${locationId} AND ${dateCondition}`)
      .orderBy(sql`DATE(${posSales.orderDate})`);
    
    for (const dateRow of datesResult) {
      const reportDate = dateRow.date;
      
      try {
        await computeDailyMetrics(locationId, reportDate);
      } catch (error) {
        console.error(`Failed to compute metrics for ${locationId} on ${reportDate}:`, error);
      }
    }
  }
}

async function computeDailyMetrics(locationId: string, reportDate: string) {
  // 1. Calculate revenue metrics from POS sales
  const revenueData = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${posSales.total} AS DECIMAL)), 0)`,
      orderCount: sql<number>`COUNT(*)`,
      customerCount: sql<number>`COUNT(DISTINCT ${posSales.posOrderId})`,
    })
    .from(posSales)
    .where(
      sql`${posSales.locationId} = ${locationId} 
      AND DATE(${posSales.orderDate}) = ${reportDate}::date`
    );
  
  const revenue = revenueData[0] || { totalRevenue: 0, orderCount: 0, customerCount: 0 };
  const totalRevenue = Number(revenue.totalRevenue);
  const orderCount = Number(revenue.orderCount);
  const customerCount = Number(revenue.customerCount);
  const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  
  // 2. Calculate COGS from purchase orders delivered on this date
  const cogsData = await db
    .select({
      totalCogs: sql<number>`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS DECIMAL)), 0)`,
    })
    .from(purchaseOrders)
    .where(
      sql`${purchaseOrders.locationId} = ${locationId}
      AND DATE(${purchaseOrders.orderDate}) = ${reportDate}::date
      AND ${purchaseOrders.status} = 'delivered'`
    );
  
  const totalCogs = Number(cogsData[0]?.totalCogs || 0);
  
  // 3. Calculate waste metrics
  const wasteData = await db
    .select({
      totalWaste: sql<number>`COALESCE(SUM(CAST(${wasteEntries.cost} AS DECIMAL)), 0)`,
    })
    .from(wasteEntries)
    .where(
      sql`${wasteEntries.locationId} = ${locationId}
      AND DATE(${wasteEntries.createdAt}) = ${reportDate}::date`
    );
  
  const totalWaste = Number(wasteData[0]?.totalWaste || 0);
  
  // 4. Calculate derived metrics
  const grossMargin = totalRevenue - totalCogs;
  const foodCostPercentage = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
  const wastePercentage = totalRevenue > 0 ? (totalWaste / totalRevenue) * 100 : 0;
  
  // 5. Get top selling items from pos_sale_items joined with pos_sales
  const topItems = await db
    .select({
      name: posSaleItems.itemName,
      quantity: sql<number>`SUM(${posSaleItems.quantity})`,
      revenue: sql<number>`COALESCE(SUM(CAST(${posSaleItems.totalPrice} AS DECIMAL)), 0)`,
    })
    .from(posSaleItems)
    .innerJoin(posSales, sql`${posSaleItems.posSaleId} = ${posSales.id}`)
    .where(
      sql`${posSales.locationId} = ${locationId}
      AND DATE(${posSales.orderDate}) = ${reportDate}::date`
    )
    .groupBy(posSaleItems.itemName)
    .orderBy(sql`SUM(${posSaleItems.quantity}) DESC`)
    .limit(10);
  
  const topSellingItems = topItems.map(item => ({
    name: item.name,
    quantity: Number(item.quantity),
    revenue: Number(item.revenue),
  }));
  
  // 6. Check if record exists for this location/date
  const existing = await db
    .select({ id: businessIntelligence.id })
    .from(businessIntelligence)
    .where(
      sql`${businessIntelligence.locationId} = ${locationId}
      AND DATE(${businessIntelligence.reportDate}) = ${reportDate}::date`
    )
    .limit(1);
  
  const metrics = {
    locationId,
    reportDate: new Date(reportDate),
    totalRevenue: totalRevenue.toFixed(2),
    totalCogs: totalCogs.toFixed(2),
    grossMargin: grossMargin.toFixed(2),
    foodCostPercentage: foodCostPercentage.toFixed(2),
    wastePercentage: wastePercentage.toFixed(2),
    avgOrderValue: avgOrderValue.toFixed(2),
    customerCount,
    topSellingItems,
    lowPerformingItems: [],
    trends: {},
  };
  
  if (existing.length > 0) {
    // Update existing record
    await db
      .update(businessIntelligence)
      .set(metrics)
      .where(sql`${businessIntelligence.id} = ${existing[0].id}`);
    
    console.log(`📊 Updated BI metrics for ${locationId} on ${reportDate}`);
  } else {
    // Insert new record
    await db.insert(businessIntelligence).values(metrics);
    
    console.log(`📊 Created BI metrics for ${locationId} on ${reportDate}`);
  }
}
