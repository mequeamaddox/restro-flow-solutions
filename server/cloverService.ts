import { storage } from "./storage";
import { 
  CloverIntegration, 
  InsertCloverSale, 
  InsertCloverSaleItem,
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
      const integration = await storage.getCloverIntegrationByMerchant(payload.merchantId);
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
    integration: CloverIntegration, 
    orderId: string
  ): Promise<CloverOrderResponse | null> {
    try {
      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';
        
      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/orders/${orderId}?expand=lineItems`,
        {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
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
    integration: CloverIntegration,
    orderData: CloverOrderResponse
  ): Promise<void> {
    try {
      // Check if this order has already been processed
      const existingSale = await storage.getCloverSaleByOrderId(orderData.id);
      if (existingSale) {
        console.log('Order already processed:', orderData.id);
        return;
      }

      // Create sale record
      const saleData: InsertCloverSale = {
        cloverOrderId: orderData.id,
        cloverIntegrationId: integration.id,
        locationId: integration.locationId,
        total: (orderData.total / 100).toString(), // Clover amounts are in cents
        orderDate: new Date(orderData.createdTime),
        inventoryProcessed: false,
      };

      const sale = await storage.createCloverSale(saleData);

      // Process each line item
      for (const lineItem of orderData.lineItems) {
        // Create sale item record
        const saleItemData: InsertCloverSaleItem = {
          cloverSaleId: sale.id,
          cloverMenuItemId: null, // Will be set if mapping exists
          itemName: lineItem.name,
          quantity: lineItem.quantity || 1,
          price: (lineItem.price / 100).toString(), // Convert from cents
        };

        const saleItem = await storage.createCloverSaleItem(saleItemData);

        // Check if we have an inventory mapping for this item
        if (lineItem.item?.id) {
          const mapping = await storage.getCloverItemMappingByCloverItemId(lineItem.item.id);
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
                updatedAt: new Date(),
              });

              console.log(`Deducted ${quantityToDeduct} ${mapping.unit} of ${inventoryItem.name}`);
            }

            // Update sale item with mapping info
            await storage.updateCloverSaleItem(saleItem.id, {
              cloverMenuItemId: mapping.cloverMenuItemId,
            });
          }
        }
      }

      // Mark sale as inventory processed
      await storage.updateCloverSale(sale.id, {
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
      const integration = await storage.getCloverIntegration(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integration not found or inactive');
      }

      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';

      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/items`,
        {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
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
        await storage.upsertCloverMenuItem({
          cloverItemId: item.id,
          cloverIntegrationId: integration.id,
          name: item.name,
          price: item.price ? (item.price / 100).toString() : null,
          isActive: !item.hidden,
        });
      }

      await storage.updateCloverIntegration(integration.id, {
        lastSyncAt: new Date(),
      });

      console.log(`Synced ${items.length} menu items for integration ${integrationId}`);
      
    } catch (error) {
      console.error('Error syncing menu items:', error);
      throw error;
    }
  }

  /**
   * Test Clover API connection
   */
  async testConnection(integrationId: string): Promise<boolean> {
    try {
      const integration = await storage.getCloverIntegration(integrationId);
      if (!integration) {
        return false;
      }

      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';

      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}`,
        {
          headers: {
            'Authorization': `Bearer ${integration.accessToken}`,
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