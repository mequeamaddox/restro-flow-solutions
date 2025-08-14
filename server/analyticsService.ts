import { storage } from './storage';
import { posService } from './posService';

export class AnalyticsService {
  
  // Generate daily business intelligence report
  async generateDailyReport(locationId: string, date: Date = new Date()): Promise<void> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get sales data from POS integrations
      const sales = await storage.getPosSalesByDateRange(locationId, startOfDay, endOfDay);
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
      const customerCount = sales.length;
      const avgOrderValue = customerCount > 0 ? totalRevenue / customerCount : 0;

      // Calculate food costs (COGS)
      const inventoryTransactions = await storage.getInventoryTransactionsByDateRange(
        locationId, 
        startOfDay, 
        endOfDay,
        'sale'
      );
      const totalCogs = Math.abs(inventoryTransactions.reduce((sum, txn) => sum + txn.totalCost, 0));

      // Calculate margins
      const grossMargin = totalRevenue - totalCogs;
      const foodCostPercentage = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;

      // Get waste data
      const wasteTransactions = await storage.getInventoryTransactionsByDateRange(
        locationId,
        startOfDay,
        endOfDay,
        'waste'
      );
      const totalWaste = Math.abs(wasteTransactions.reduce((sum, txn) => sum + txn.totalCost, 0));
      const wastePercentage = totalRevenue > 0 ? (totalWaste / totalRevenue) * 100 : 0;

      // Calculate inventory turnover (simplified daily calculation)
      const inventory = await storage.getInventoryByLocation(locationId);
      const totalInventoryValue = inventory.reduce((sum, item) => 
        sum + (item.quantity * item.costPerUnit), 0
      );
      const inventoryTurnover = totalInventoryValue > 0 ? totalCogs / totalInventoryValue : 0;

      // Analyze top selling items
      const itemSales = this.calculateItemSales(sales);
      const topSellingItems = itemSales
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Identify low performing items
      const lowPerformingItems = itemSales
        .filter(item => item.quantity > 0 && item.margin < 20) // Less than 20% margin
        .sort((a, b) => a.margin - b.margin)
        .slice(0, 10);

      // Calculate trends (compare with previous periods)
      const trends = await this.calculateTrends(locationId, date);

      // Save business intelligence report
      await storage.createBusinessIntelligence({
        locationId,
        reportDate: date,
        totalRevenue: totalRevenue.toString(),
        totalCogs: totalCogs.toString(),
        grossMargin: grossMargin.toString(),
        foodCostPercentage: foodCostPercentage.toString(),
        laborCostPercentage: "0", // Will be enhanced with labor data
        wastePercentage: wastePercentage.toString(),
        inventoryTurnover: inventoryTurnover.toString(),
        avgOrderValue: avgOrderValue.toString(),
        customerCount,
        topSellingItems: JSON.stringify(topSellingItems),
        lowPerformingItems: JSON.stringify(lowPerformingItems),
        trends: JSON.stringify(trends),
      });

      // Check for cost alerts
      await this.checkCostAlerts(locationId, {
        foodCostPercentage,
        wastePercentage,
        grossMargin: (grossMargin / totalRevenue) * 100
      });

    } catch (error) {
      console.error('Failed to generate daily report:', error);
      throw error;
    }
  }

  private calculateItemSales(sales: any[]): any[] {
    const itemMap = new Map();

    sales.forEach(sale => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          const key = item.itemName;
          if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.quantity += item.quantity;
            existing.revenue += parseFloat(item.totalPrice);
          } else {
            itemMap.set(key, {
              name: item.itemName,
              quantity: item.quantity,
              revenue: parseFloat(item.totalPrice),
              margin: 0 // Will be calculated with recipe costing
            });
          }
        });
      }
    });

    return Array.from(itemMap.values());
  }

  private async calculateTrends(locationId: string, currentDate: Date): Promise<any> {
    try {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = new Date(currentDate);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const currentReport = await storage.getBusinessIntelligenceByDate(locationId, currentDate);
      const yesterdayReport = await storage.getBusinessIntelligenceByDate(locationId, yesterday);
      const lastWeekReport = await storage.getBusinessIntelligenceByDate(locationId, lastWeek);

      const trends = {
        revenue: {
          dayOverDay: this.calculatePercentageChange(
            yesterdayReport?.totalRevenue || 0,
            currentReport?.totalRevenue || 0
          ),
          weekOverWeek: this.calculatePercentageChange(
            lastWeekReport?.totalRevenue || 0,
            currentReport?.totalRevenue || 0
          )
        },
        foodCost: {
          dayOverDay: this.calculatePercentageChange(
            yesterdayReport?.foodCostPercentage || 0,
            currentReport?.foodCostPercentage || 0
          ),
          weekOverWeek: this.calculatePercentageChange(
            lastWeekReport?.foodCostPercentage || 0,
            currentReport?.foodCostPercentage || 0
          )
        },
        customerCount: {
          dayOverDay: this.calculatePercentageChange(
            yesterdayReport?.customerCount || 0,
            currentReport?.customerCount || 0
          ),
          weekOverWeek: this.calculatePercentageChange(
            lastWeekReport?.customerCount || 0,
            currentReport?.customerCount || 0
          )
        }
      };

      return trends;
    } catch (error) {
      console.error('Failed to calculate trends:', error);
      return {};
    }
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  // Monitor costs and create alerts
  async checkCostAlerts(locationId: string, metrics: {
    foodCostPercentage: number;
    wastePercentage: number;
    grossMargin: number;
  }): Promise<void> {
    try {
      // Check food cost threshold (typically 28-35% for restaurants)
      if (metrics.foodCostPercentage > 35) {
        await storage.createCostAlert({
          locationId,
          alertType: 'budget_exceeded',
          threshold: "35.00",
          actualValue: metrics.foodCostPercentage.toString(),
          variance: (metrics.foodCostPercentage - 35).toString(),
          severity: metrics.foodCostPercentage > 40 ? 'critical' : 'high',
        });
      }

      // Check waste threshold (typically should be under 5%)
      if (metrics.wastePercentage > 5) {
        await storage.createCostAlert({
          locationId,
          alertType: 'waste_threshold',
          threshold: "5.00",
          actualValue: metrics.wastePercentage.toString(),
          variance: (metrics.wastePercentage - 5).toString(),
          severity: metrics.wastePercentage > 10 ? 'critical' : 'high',
        });
      }

      // Check low margin threshold (typically should be above 60%)
      if (metrics.grossMargin < 60) {
        await storage.createCostAlert({
          locationId,
          alertType: 'low_margin',
          threshold: "60.00",
          actualValue: metrics.grossMargin.toString(),
          variance: (60 - metrics.grossMargin).toString(),
          severity: metrics.grossMargin < 50 ? 'critical' : 'high',
        });
      }

    } catch (error) {
      console.error('Failed to check cost alerts:', error);
    }
  }

  // Monitor price changes from invoices
  async monitorPriceChanges(inventoryItemId: string, vendorId: string, newPrice: number, invoiceId?: string): Promise<void> {
    try {
      const previousMonitoring = await storage.getLatestPriceMonitoring(inventoryItemId, vendorId);
      
      if (previousMonitoring) {
        const priceChange = newPrice - parseFloat(previousMonitoring.currentPrice);
        const percentageChange = (priceChange / parseFloat(previousMonitoring.currentPrice)) * 100;
        
        // Create monitoring record
        await storage.createPriceMonitoring({
          inventoryItemId,
          vendorId,
          previousPrice: previousMonitoring.currentPrice,
          currentPrice: newPrice.toString(),
          priceChange: priceChange.toString(),
          percentageChange: percentageChange.toString(),
          invoiceId,
          alertSent: Math.abs(percentageChange) > parseFloat(previousMonitoring.threshold || "10")
        });

        // Send alert if price change exceeds threshold
        if (Math.abs(percentageChange) > parseFloat(previousMonitoring.threshold || "10")) {
          const item = await storage.getInventoryItem(inventoryItemId);
          await storage.createCostAlert({
            locationId: item?.locationId || null,
            alertType: 'price_variance',
            itemId: inventoryItemId,
            threshold: previousMonitoring.threshold,
            actualValue: percentageChange.toString(),
            variance: percentageChange.toString(),
            severity: Math.abs(percentageChange) > 25 ? 'critical' : 'high',
          });
        }
      } else {
        // First time monitoring this item
        await storage.createPriceMonitoring({
          inventoryItemId,
          vendorId,
          currentPrice: newPrice.toString(),
          priceChange: "0",
          percentageChange: "0",
          invoiceId,
          alertSent: false
        });
      }
    } catch (error) {
      console.error('Failed to monitor price changes:', error);
    }
  }

  // Generate comprehensive P&L report
  async generateProfitLossReport(locationId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get all relevant data for the period
      const sales = await storage.getPosSalesByDateRange(locationId, startDate, endDate);
      const purchases = await storage.getPurchaseOrdersByDateRange(locationId, startDate, endDate);
      const waste = await storage.getInventoryTransactionsByDateRange(locationId, startDate, endDate, 'waste');
      
      // Calculate revenue
      const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
      
      // Calculate COGS
      const totalPurchases = purchases.reduce((sum, po) => sum + parseFloat(po.total), 0);
      const beginningInventory = await this.getInventoryValueAtDate(locationId, startDate);
      const endingInventory = await this.getInventoryValueAtDate(locationId, endDate);
      const cogs = beginningInventory + totalPurchases - endingInventory;
      
      // Calculate waste costs
      const wasteCosts = Math.abs(waste.reduce((sum, txn) => sum + txn.totalCost, 0));
      
      // Calculate margins
      const grossProfit = totalRevenue - cogs;
      const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      
      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        revenue: {
          total: totalRevenue,
          transactionCount: sales.length,
          averageTicket: sales.length > 0 ? totalRevenue / sales.length : 0
        },
        cogs: {
          beginningInventory,
          purchases: totalPurchases,
          endingInventory,
          total: cogs,
          percentage: totalRevenue > 0 ? (cogs / totalRevenue) * 100 : 0
        },
        waste: {
          total: wasteCosts,
          percentage: totalRevenue > 0 ? (wasteCosts / totalRevenue) * 100 : 0
        },
        margins: {
          grossProfit,
          grossMarginPercentage
        }
      };
    } catch (error) {
      console.error('Failed to generate P&L report:', error);
      throw error;
    }
  }

  private async getInventoryValueAtDate(locationId: string, date: Date): Promise<number> {
    try {
      // This would require historical inventory tracking
      // For now, return current inventory value as approximation
      const inventory = await storage.getInventoryByLocation(locationId);
      return inventory.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
    } catch (error) {
      console.error('Failed to get inventory value at date:', error);
      return 0;
    }
  }
}

export const analyticsService = new AnalyticsService();