import { storage } from "./storage";
import { 
  PosIntegration, 
  InsertPosSale, 
  InsertPosSaleItem,
  InsertInventoryTransaction 
} from "@shared/schema";

export interface CloverOrderResponse {
  id: string;
  total: number;
  createdTime: number;
  lineItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity?: number;
    item?: {
      id: string;
      name: string;
    };
  }>;
}

export interface CloverWebhookPayload {
  objectId: string;
  type: "ORDER";
  merchantId: string;
}

export class CloverService {
  private static instance: CloverService;
  
  public static getInstance(): CloverService {
    if (!CloverService.instance) {
      CloverService.instance = new CloverService();
    }
    return CloverService.instance;
  }

  /**
   * Process a Clover webhook for order events
   */
  async processOrderWebhook(payload: CloverWebhookPayload): Promise<void> {
    try {
      console.log('Processing Clover webhook:', payload);
      
      // Find the integration for this merchant
      const integration = await storage.getPosIntegrationByMerchant(payload.merchantId, 'clover');
      if (!integration || !integration.isActive) {
        console.log('No active integration found for merchant:', payload.merchantId);
        return;
      }

      // Fetch order details from Clover API
      const orderData = await this.fetchOrderFromClover(integration, payload.objectId);
      if (!orderData) {
        console.log('Could not fetch order data from Clover');
        return;
      }

      // Process the order and deduct inventory
      await this.processOrder(integration, orderData);
      
    } catch (error) {
      console.error('Error processing Clover webhook:', error);
      throw error;
    }
  }

  /**
   * Fetch order details from Clover API
   */
  private async fetchOrderFromClover(
    integration: PosIntegration, 
    orderId: string
  ): Promise<CloverOrderResponse | null> {
    try {
      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';
      
      const raw = integration.credentials;
      const accessToken = typeof raw === 'object' && raw !== null ? (raw as any).accessToken : undefined;
      if (!accessToken || typeof accessToken !== 'string') {
        console.error('Clover integration missing valid accessToken in credentials');
        return null;
      }
      
      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/orders/${orderId}?expand=lineItems`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order from Clover:', error);
      return null;
    }
  }

  /**
   * Process order and automatically deduct inventory
   */
  private async processOrder(
    integration: PosIntegration,
    orderData: CloverOrderResponse
  ): Promise<void> {
    try {
      // Check if this order has already been processed
      const existingSale = await storage.getPosSaleByOrderId(integration.id, orderData.id);
      if (existingSale) {
        console.log('Order already processed:', orderData.id);
        return;
      }

      // Create sale record
      const saleData: InsertPosSale = {
        posOrderId: orderData.id,
        posIntegrationId: integration.id,
        locationId: integration.locationId,
        total: (orderData.total / 100).toString(), // Clover amounts are in cents
        orderDate: new Date(orderData.createdTime),
        inventoryProcessed: false,
      };

      const sale = await storage.createPosSale(saleData);

      // Process each line item
      for (const lineItem of orderData.lineItems) {
        const unitPrice = (lineItem.price / 100);
        const quantity = lineItem.quantity || 1;
        
        // Create sale item record
        const saleItemData: InsertPosSaleItem = {
          posSaleId: sale.id,
          posMenuItemId: null, // Will be set if mapping exists
          itemName: lineItem.name,
          quantity: quantity,
          unitPrice: unitPrice.toString(),
          totalPrice: (unitPrice * quantity).toString(),
        };

        const saleItem = await storage.createPosSaleItem(saleItemData);

        // Check if we have an inventory mapping for this item
        if (lineItem.item?.id) {
          const mapping = await storage.getPosItemMappingByPosItemId(lineItem.item.id);
          if (mapping) {
            // Calculate total quantity to deduct
            const quantityToDeduct = parseFloat(mapping.quantityUsed) * (lineItem.quantity || 1);
            
            // Create inventory transaction for deduction
            const transactionData: InsertInventoryTransaction = {
              inventoryItemId: mapping.inventoryItemId,
              locationId: integration.locationId,
              type: "out",
              quantity: quantityToDeduct.toString(),
              reference: `POS Sale: ${orderData.id}`,
              notes: `Automatic deduction from Clover POS sale - ${lineItem.name}`,
              createdBy: null, // System transaction
            };

            await storage.createInventoryTransaction(transactionData);

            // Update inventory item quantity
            const inventoryItem = await storage.getInventoryItem(mapping.inventoryItemId);
            if (inventoryItem) {
              const currentQuantity = parseFloat(inventoryItem.quantity);
              const newQuantity = Math.max(0, currentQuantity - quantityToDeduct);
              
              await storage.updateInventoryItem(mapping.inventoryItemId, {
                quantity: newQuantity.toString(),
              });

              console.log(`Deducted ${quantityToDeduct} ${mapping.unit} of ${inventoryItem.name}`);
            }

            // Update sale item with mapping info
            await storage.updatePosSaleItem(saleItem.id, {
              posMenuItemId: mapping.posMenuItemId,
            });
          }
        }
      }

      // Mark sale as inventory processed
      await storage.updatePosSale(sale.id, {
        inventoryProcessed: true,
        processedAt: new Date(),
      });

      console.log(`Successfully processed Clover order ${orderData.id} with inventory deductions`);
      
    } catch (error) {
      console.error('Error processing order:', error);
      throw error;
    }
  }

  /**
   * Sync menu items from Clover
   */
  async syncMenuItems(integrationId: string): Promise<void> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integration not found or inactive');
      }

      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';

      const raw = integration.credentials;
      const accessToken = typeof raw === 'object' && raw !== null ? (raw as any).accessToken : undefined;
      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Clover integration missing valid accessToken in credentials');
      }
      
      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/items`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items = data.elements || [];

      for (const item of items) {
        await storage.upsertPosMenuItem({
          posItemId: item.id,
          posIntegrationId: integration.id,
          name: item.name,
          price: item.price ? (item.price / 100).toString() : null,
          isActive: !item.hidden,
        });
      }

      await storage.updatePosIntegration(integration.id, {
        lastSyncAt: new Date(),
      });

      console.log(`Synced ${items.length} menu items for integration ${integrationId}`);
      
    } catch (error) {
      console.error('Error syncing menu items:', error);
      throw error;
    }
  }

  /**
   * Sync historical orders from Clover (last 30 days)
   */
  async syncHistoricalOrders(integrationId: string): Promise<number> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integration not found or inactive');
      }

      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';

      const raw = integration.credentials;
      const accessToken = typeof raw === 'object' && raw !== null ? (raw as any).accessToken : undefined;
      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Clover integration missing valid accessToken in credentials');
      }

      // Fetch orders from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startTime = thirtyDaysAgo.getTime();

      console.log(`Fetching Clover orders since ${thirtyDaysAgo.toISOString()}`);

      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/orders?filter=createdTime>=${startTime}&expand=lineItems&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const orders = data.elements || [];

      console.log(`Found ${orders.length} orders from Clover`);

      let processedCount = 0;
      for (const order of orders) {
        try {
          // Check if order already exists
          const existing = await storage.getPosSaleByOrderId(integration.id, order.id);
          if (existing) {
            console.log(`Order ${order.id} already exists, skipping`);
            continue;
          }

          await this.processOrder(integration, order);
          processedCount++;
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
        }
      }

      await storage.updatePosIntegration(integration.id, {
        lastSyncAt: new Date(),
      });

      console.log(`Successfully synced ${processedCount} new orders from Clover`);
      return processedCount;
      
    } catch (error) {
      console.error('Error syncing historical orders:', error);
      throw error;
    }
  }

  /**
   * Test Clover API connection
   */
  async testConnection(integrationId: string): Promise<boolean> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration) {
        return false;
      }

      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';

      const raw = integration.credentials;
      const accessToken = typeof raw === 'object' && raw !== null ? (raw as any).accessToken : undefined;
      if (!accessToken || typeof accessToken !== 'string') {
        console.error('Clover integration missing valid accessToken in credentials');
        return false;
      }
      
      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error testing Clover connection:', error);
      return false;
    }
  }
}

export const cloverService = CloverService.getInstance();