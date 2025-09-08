import { db } from './db.js';
import { 
  recipes, recipeIngredients, inventoryItems, recipeProductions, 
  varianceAnalysis, recipeCostHistory, inventoryTransactions,
  type InsertRecipeProduction, type InsertVarianceAnalysis, type InsertRecipeCostHistory
} from '@shared/schema.js';
import { sql, eq, and, desc, gte, lte, sum } from 'drizzle-orm';

export interface RecipeCalculation {
  recipeId: string;
  totalCost: number;
  costPerServing: number;
  ingredients: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }>;
}

export interface VarianceReport {
  itemId: string;
  itemName: string;
  theoreticalUsage: number;
  actualUsage: number;
  variance: number;
  variancePercentage: number;
  varianceCost: number;
  category: 'acceptable' | 'high' | 'critical';
}

export interface ProductionVariance {
  recipeId: string;
  recipeName: string;
  quantityProduced: number;
  theoreticalCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
}

/**
 * Enterprise-level Variance Service for theoretical vs actual consumption tracking
 * Provides comprehensive cost analysis and variance reporting for restaurant operations
 */
export class VarianceService {

  /**
   * Calculate theoretical recipe cost based on current ingredient prices
   */
  async calculateRecipeCost(recipeId: string, locationId: string): Promise<RecipeCalculation | null> {
    try {
      const result = await db
        .select({
          recipeId: recipes.id,
          recipeName: recipes.name,
          servingSize: recipes.servingSize,
          ingredientId: inventoryItems.id,
          ingredientName: inventoryItems.name,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          costPerUnit: inventoryItems.costPerUnit,
        })
        .from(recipes)
        .leftJoin(recipeIngredients, eq(recipes.id, recipeIngredients.recipeId))
        .leftJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
        .where(and(
          eq(recipes.id, recipeId),
          eq(recipes.locationId, locationId)
        ));

      if (result.length === 0) return null;

      const recipe = result[0];
      const ingredients = result
        .filter(r => r.ingredientId)
        .map(r => {
          const quantity = parseFloat(r.quantity || '0');
          const unitCost = parseFloat(r.costPerUnit || '0');
          const totalCost = quantity * unitCost;
          
          return {
            itemId: r.ingredientId!,
            name: r.ingredientName!,
            quantity,
            unit: r.unit!,
            unitCost,
            totalCost
          };
        });

      const totalCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);
      const costPerServing = totalCost / parseFloat(recipe.servingSize?.toString() || '1');

      return {
        recipeId: recipe.recipeId!,
        totalCost,
        costPerServing,
        ingredients
      };
    } catch (error) {
      console.error('Error calculating recipe cost:', error);
      return null;
    }
  }

  /**
   * Record recipe production with variance tracking
   */
  async recordRecipeProduction(
    recipeId: string, 
    locationId: string, 
    quantityProduced: number,
    producedBy: string,
    batchNumber?: string
  ): Promise<string | null> {
    try {
      // Calculate theoretical cost
      const recipeCost = await this.calculateRecipeCost(recipeId, locationId);
      if (!recipeCost) throw new Error('Unable to calculate recipe cost');

      const theoreticalCost = recipeCost.totalCost * quantityProduced;

      // For now, use theoretical cost as actual cost
      // In a real system, this would track actual ingredient usage
      const actualCost = theoreticalCost;
      const variance = actualCost - theoreticalCost;
      const variancePercentage = theoreticalCost > 0 ? (variance / theoreticalCost) * 100 : 0;

      const productionData: InsertRecipeProduction = {
        recipeId,
        locationId,
        quantityProduced: quantityProduced.toString(),
        theoreticalCost: theoreticalCost.toString(),
        actualCost: actualCost.toString(),
        variance: variance.toString(),
        variancePercentage: variancePercentage.toString(),
        batchNumber,
        producedBy,
        productionDate: new Date()
      };

      const [production] = await db.insert(recipeProductions).values(productionData).returning();

      // Record ingredient consumption transactions
      for (const ingredient of recipeCost.ingredients) {
        const consumedQuantity = ingredient.quantity * quantityProduced;
        await db.insert(inventoryTransactions).values({
          inventoryItemId: ingredient.itemId,
          locationId,
          type: 'recipe_consumption',
          quantity: (-consumedQuantity).toString(), // Negative for consumption
          unitCost: ingredient.unitCost.toString(),
          totalCost: (-ingredient.totalCost * quantityProduced).toString(),
          reference: `Recipe Production: ${production.id}`,
          createdBy: producedBy
        });
      }

      return production.id;
    } catch (error) {
      console.error('Error recording recipe production:', error);
      return null;
    }
  }

  /**
   * Generate variance report comparing theoretical vs actual usage
   */
  async generateVarianceReport(
    locationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<VarianceReport[]> {
    try {
      // Get theoretical usage from recipe productions
      const theoreticalUsage = await db
        .select({
          itemId: inventoryItems.id,
          itemName: inventoryItems.name,
          theoreticalUsage: sum(sql`${recipeIngredients.quantity}::decimal * ${recipeProductions.quantityProduced}::decimal`),
          unitCost: inventoryItems.costPerUnit
        })
        .from(recipeProductions)
        .leftJoin(recipeIngredients, eq(recipeProductions.recipeId, recipeIngredients.recipeId))
        .leftJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
        .where(and(
          eq(recipeProductions.locationId, locationId),
          gte(recipeProductions.productionDate, startDate),
          lte(recipeProductions.productionDate, endDate)
        ))
        .groupBy(inventoryItems.id, inventoryItems.name, inventoryItems.costPerUnit);

      // Get actual usage from inventory transactions
      const actualUsage = await db
        .select({
          itemId: inventoryItems.id,
          actualUsage: sum(sql`ABS(${inventoryTransactions.quantity}::decimal)`)
        })
        .from(inventoryTransactions)
        .leftJoin(inventoryItems, eq(inventoryTransactions.inventoryItemId, inventoryItems.id))
        .where(and(
          eq(inventoryTransactions.locationId, locationId),
          eq(inventoryTransactions.type, 'recipe_consumption'),
          gte(inventoryTransactions.createdAt, startDate),
          lte(inventoryTransactions.createdAt, endDate)
        ))
        .groupBy(inventoryItems.id);

      // Combine theoretical and actual usage
      const varianceReport: VarianceReport[] = [];
      
      for (const theoretical of theoreticalUsage) {
        const actual = actualUsage.find(a => a.itemId === theoretical.itemId);
        const theoreticalQty = parseFloat(theoretical.theoreticalUsage?.toString() || '0');
        const actualQty = parseFloat(actual?.actualUsage?.toString() || '0');
        const variance = actualQty - theoreticalQty;
        const variancePercentage = theoreticalQty > 0 ? (variance / theoreticalQty) * 100 : 0;
        const varianceCost = variance * parseFloat(theoretical.unitCost || '0');

        // Categorize variance
        let category: 'acceptable' | 'high' | 'critical' = 'acceptable';
        const absVariancePercentage = Math.abs(variancePercentage);
        if (absVariancePercentage > 20) category = 'critical';
        else if (absVariancePercentage > 10) category = 'high';

        varianceReport.push({
          itemId: theoretical.itemId!,
          itemName: theoretical.itemName!,
          theoreticalUsage: theoreticalQty,
          actualUsage: actualQty,
          variance,
          variancePercentage,
          varianceCost,
          category
        });
      }

      // Store variance analysis in database
      for (const report of varianceReport) {
        const varianceData: InsertVarianceAnalysis = {
          locationId,
          inventoryItemId: report.itemId,
          analysisDate: endDate.toISOString().split('T')[0],
          theoreticalUsage: report.theoreticalUsage.toString(),
          actualUsage: report.actualUsage.toString(),
          variance: report.variance.toString(),
          variancePercentage: report.variancePercentage.toString(),
          varianceCost: report.varianceCost.toString(),
          varianceCategory: report.category
        };

        await db.insert(varianceAnalysis).values(varianceData).onConflictDoNothing();
      }

      return varianceReport.sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage));
    } catch (error) {
      console.error('Error generating variance report:', error);
      return [];
    }
  }

  /**
   * Get production variance for recipes
   */
  async getProductionVariance(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProductionVariance[]> {
    try {
      const productions = await db
        .select({
          recipeId: recipeProductions.recipeId,
          recipeName: recipes.name,
          quantityProduced: recipeProductions.quantityProduced,
          theoreticalCost: recipeProductions.theoreticalCost,
          actualCost: recipeProductions.actualCost,
          variance: recipeProductions.variance,
          variancePercentage: recipeProductions.variancePercentage
        })
        .from(recipeProductions)
        .leftJoin(recipes, eq(recipeProductions.recipeId, recipes.id))
        .where(and(
          eq(recipeProductions.locationId, locationId),
          gte(recipeProductions.productionDate, startDate),
          lte(recipeProductions.productionDate, endDate)
        ))
        .orderBy(desc(recipeProductions.productionDate));

      return productions.map(p => ({
        recipeId: p.recipeId,
        recipeName: p.recipeName || 'Unknown Recipe',
        quantityProduced: parseFloat(p.quantityProduced || '0'),
        theoreticalCost: parseFloat(p.theoreticalCost || '0'),
        actualCost: parseFloat(p.actualCost || '0'),
        variance: parseFloat(p.variance || '0'),
        variancePercentage: parseFloat(p.variancePercentage || '0')
      }));
    } catch (error) {
      console.error('Error getting production variance:', error);
      return [];
    }
  }

  /**
   * Update recipe cost history when ingredient prices change
   */
  async updateRecipeCostHistory(recipeId: string, locationId: string): Promise<void> {
    try {
      const recipeCost = await this.calculateRecipeCost(recipeId, locationId);
      if (!recipeCost) return;

      const recipe = await db
        .select({ sellingPrice: recipes.sellingPrice })
        .from(recipes)
        .where(eq(recipes.id, recipeId))
        .limit(1);

      const sellingPrice = parseFloat(recipe[0]?.sellingPrice || '0');
      const marginPercentage = sellingPrice > 0 
        ? ((sellingPrice - recipeCost.costPerServing) / sellingPrice) * 100 
        : 0;

      const costHistoryData: InsertRecipeCostHistory = {
        recipeId,
        locationId,
        totalCost: recipeCost.totalCost.toString(),
        costPerServing: recipeCost.costPerServing.toString(),
        margins: marginPercentage.toString(),
        ingredientSnapshot: JSON.stringify(recipeCost.ingredients)
      };

      await db.insert(recipeCostHistory).values(costHistoryData);
    } catch (error) {
      console.error('Error updating recipe cost history:', error);
    }
  }

  /**
   * Get variance summary metrics for dashboard
   */
  async getVarianceSummary(locationId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const summary = await db
        .select({
          totalVarianceCost: sum(sql`ABS(${varianceAnalysis.varianceCost}::decimal)`),
          criticalVariances: sql<number>`COUNT(CASE WHEN ${varianceAnalysis.varianceCategory} = 'critical' THEN 1 END)`,
          highVariances: sql<number>`COUNT(CASE WHEN ${varianceAnalysis.varianceCategory} = 'high' THEN 1 END)`,
          totalAnalyzedItems: sql<number>`COUNT(DISTINCT ${varianceAnalysis.inventoryItemId})`
        })
        .from(varianceAnalysis)
        .where(and(
          eq(varianceAnalysis.locationId, locationId),
          gte(varianceAnalysis.createdAt, startDate)
        ));

      return {
        totalVarianceCost: parseFloat(summary[0]?.totalVarianceCost?.toString() || '0'),
        criticalVariances: Number(summary[0]?.criticalVariances || 0),
        highVariances: Number(summary[0]?.highVariances || 0),
        totalAnalyzedItems: Number(summary[0]?.totalAnalyzedItems || 0)
      };
    } catch (error) {
      console.error('Error getting variance summary:', error);
      return {
        totalVarianceCost: 0,
        criticalVariances: 0,
        highVariances: 0,
        totalAnalyzedItems: 0
      };
    }
  }
}

export const varianceService = new VarianceService();