import { storage } from "./storage";
import { 
  PosIntegration, 
  InsertPosSale, 
  InsertPosSaleItem,
  InsertInventoryTransaction 
} from "@shared/schema";

// Base interfaces for POS providers
export interface BasePosOrderResponse {
  id: string;
  total: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  createdTime: number;
  lineItems: Array<{
    id: string;
    name: string;
    unitPrice: number;
    totalPrice: number;
    quantity?: number;
    modifiers?: any[];
    item?: {
      id: string;
      name: string;
      sku?: string;
    };
  }>;
  metadata?: any;
}

export interface PosWebhookPayload {
  objectId: string;
  type: string;
  merchantId: string;
  provider: string;
}

// POS Provider interfaces
export interface IPosProvider {
  provider: string;
  fetchOrder(integration: PosIntegration, orderId: string): Promise<BasePosOrderResponse | null>;
  syncMenuItems(integration: PosIntegration): Promise<void>;
  testConnection(integration: PosIntegration): Promise<boolean>;
  validateCredentials(credentials: any): boolean;
}

// Clover POS Provider
export class CloverProvider implements IPosProvider {
  provider = "clover";

  async fetchOrder(integration: PosIntegration, orderId: string): Promise<BasePosOrderResponse | null> {
    try {
      const creds = integration.credentials as any;
      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';
        
      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/orders/${orderId}?expand=lineItems`,
        {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        total: data.total / 100, // Convert from cents
        subtotal: data.subtotal ? data.subtotal / 100 : undefined,
        tax: data.tax ? data.tax / 100 : undefined,
        tip: data.tip ? data.tip / 100 : undefined,
        createdTime: data.createdTime,
        lineItems: data.lineItems?.elements?.map((item: any) => ({
          id: item.id,
          name: item.name,
          unitPrice: item.price / 100,
          totalPrice: (item.price * (item.quantity || 1)) / 100,
          quantity: item.quantity || 1,
          item: item.item ? {
            id: item.item.id,
            name: item.item.name,
            sku: item.item.sku,
          } : undefined,
        })) || [],
      };
    } catch (error) {
      console.error('Error fetching Clover order:', error);
      return null;
    }
  }

  async syncMenuItems(integration: PosIntegration): Promise<void> {
    const creds = integration.credentials as any;
    const baseUrl = integration.environment === 'production' 
      ? 'https://api.clover.com'
      : 'https://sandbox.dev.clover.com';

    const response = await fetch(
      `${baseUrl}/v3/merchants/${integration.merchantId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
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
        category: item.category?.name,
        price: item.price ? (item.price / 100).toString() : null,
        sku: item.sku,
        isActive: !item.hidden,
      });
    }
  }

  async testConnection(integration: PosIntegration): Promise<boolean> {
    try {
      const creds = integration.credentials as any;
      const baseUrl = integration.environment === 'production' 
        ? 'https://api.clover.com'
        : 'https://sandbox.dev.clover.com';

      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}`,
        {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  validateCredentials(credentials: any): boolean {
    return !!(credentials.accessToken && typeof credentials.accessToken === 'string');
  }
}

// SpotOn POS Provider
export class SpotOnProvider implements IPosProvider {
  provider = "spoton";

  async fetchOrder(integration: PosIntegration, orderId: string): Promise<BasePosOrderResponse | null> {
    try {
      const creds = integration.credentials as any;
      const baseUrl = integration.environment === 'production' 
        ? 'https://api.spoton.com'
        : 'https://sandbox-api.spoton.com';
        
      const response = await fetch(
        `${baseUrl}/v1/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`SpotOn API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        total: parseFloat(data.total_amount),
        subtotal: data.subtotal_amount ? parseFloat(data.subtotal_amount) : undefined,
        tax: data.tax_amount ? parseFloat(data.tax_amount) : undefined,
        tip: data.tip_amount ? parseFloat(data.tip_amount) : undefined,
        createdTime: new Date(data.created_at).getTime(),
        lineItems: data.line_items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price),
          quantity: item.quantity || 1,
          modifiers: item.modifiers,
          item: {
            id: item.menu_item_id,
            name: item.name,
            sku: item.sku,
          },
        })) || [],
        metadata: data,
      };
    } catch (error) {
      console.error('Error fetching SpotOn order:', error);
      return null;
    }
  }

  async syncMenuItems(integration: PosIntegration): Promise<void> {
    const creds = integration.credentials as any;
    const baseUrl = integration.environment === 'production' 
      ? 'https://api.spoton.com'
      : 'https://sandbox-api.spoton.com';

    const response = await fetch(
      `${baseUrl}/v1/menu-items`,
      {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SpotOn API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data.menu_items || [];

    for (const item of items) {
      await storage.upsertPosMenuItem({
        posItemId: item.id,
        posIntegrationId: integration.id,
        name: item.name,
        category: item.category,
        price: item.price ? parseFloat(item.price).toString() : null,
        sku: item.sku,
        isActive: item.is_active !== false,
      });
    }
  }

  async testConnection(integration: PosIntegration): Promise<boolean> {
    try {
      const creds = integration.credentials as any;
      const baseUrl = integration.environment === 'production' 
        ? 'https://api.spoton.com'
        : 'https://sandbox-api.spoton.com';

      const response = await fetch(
        `${baseUrl}/v1/merchants/${integration.merchantId}`,
        {
          headers: {
            'Authorization': `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  validateCredentials(credentials: any): boolean {
    return !!(credentials.accessToken && typeof credentials.accessToken === 'string');
  }
}

// POS Service Manager
export class PosService {
  private static instance: PosService;
  private providers: Map<string, IPosProvider> = new Map();
  
  private constructor() {
    this.providers.set("clover", new CloverProvider());
    this.providers.set("spoton", new SpotOnProvider());
  }
  
  public static getInstance(): PosService {
    if (!PosService.instance) {
      PosService.instance = new PosService();
    }
    return PosService.instance;
  }

  getProvider(providerName: string): IPosProvider | null {
    return this.providers.get(providerName) || null;
  }

  /**
   * Process a universal POS webhook for order events
   */
  async processOrderWebhook(payload: PosWebhookPayload): Promise<void> {
    try {
      console.log('Processing POS webhook:', payload);
      
      // Find the integration for this merchant and provider
      const integration = await storage.getPosIntegrationByMerchant(payload.merchantId, payload.provider);
      if (!integration || !integration.isActive) {
        console.log('No active integration found for merchant:', payload.merchantId, 'provider:', payload.provider);
        return;
      }

      const provider = this.getProvider(integration.provider);
      if (!provider) {
        console.log('No provider found for:', integration.provider);
        return;
      }

      // Fetch order details from POS API
      const orderData = await provider.fetchOrder(integration, payload.objectId);
      if (!orderData) {
        console.log('Could not fetch order data from POS');
        return;
      }

      // Process the order and deduct inventory
      await this.processOrder(integration, orderData);
      
    } catch (error) {
      console.error('Error processing POS webhook:', error);
      throw error;
    }
  }

  /**
   * Process order and automatically deduct inventory
   */
  private async processOrder(
    integration: PosIntegration,
    orderData: BasePosOrderResponse
  ): Promise<void> {
    try {
      // Check if this order has already been processed
      const existingSale = await storage.getPosSaleByOrderId(orderData.id);
      if (existingSale) {
        console.log('Order already processed:', orderData.id);
        return;
      }

      // Create sale record
      const saleData: InsertPosSale = {
        posOrderId: orderData.id,
        posIntegrationId: integration.id,
        locationId: integration.locationId,
        total: orderData.total.toString(),
        subtotal: orderData.subtotal?.toString(),
        tax: orderData.tax?.toString(),
        tip: orderData.tip?.toString(),
        orderDate: new Date(orderData.createdTime),
        inventoryProcessed: false,
        metadata: orderData.metadata,
      };

      const sale = await storage.createPosSale(saleData);

      // Process each line item
      for (const lineItem of orderData.lineItems) {
        // Create sale item record
        const saleItemData: InsertPosSaleItem = {
          posSaleId: sale.id,
          posMenuItemId: null, // Will be set if mapping exists
          itemName: lineItem.name,
          quantity: lineItem.quantity || 1,
          unitPrice: lineItem.unitPrice.toString(),
          totalPrice: lineItem.totalPrice.toString(),
          modifiers: lineItem.modifiers,
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
              notes: `Automatic deduction from ${integration.provider.toUpperCase()} POS sale - ${lineItem.name}`,
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

              console.log(`Deducted ${quantityToDeduct} ${mapping.unit} of ${inventoryItem.name} from ${integration.provider} sale`);
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

      console.log(`Successfully processed ${integration.provider} order ${orderData.id} with inventory deductions`);
      
    } catch (error) {
      console.error('Error processing order:', error);
      throw error;
    }
  }

  /**
   * Sync menu items from POS
   */
  async syncMenuItems(integrationId: string): Promise<void> {
    const integration = await storage.getPosIntegration(integrationId);
    if (!integration || !integration.isActive) {
      throw new Error('Integration not found or inactive');
    }

    const provider = this.getProvider(integration.provider);
    if (!provider) {
      throw new Error(`Provider ${integration.provider} not supported`);
    }

    await provider.syncMenuItems(integration);
    
    await storage.updatePosIntegration(integration.id, {
      lastSyncAt: new Date(),
    });

    console.log(`Synced menu items for ${integration.provider} integration ${integrationId}`);
  }

  /**
   * Test POS API connection
   */
  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await storage.getPosIntegration(integrationId);
    if (!integration) {
      return false;
    }

    const provider = this.getProvider(integration.provider);
    if (!provider) {
      return false;
    }

    return await provider.testConnection(integration);
  }

  /**
   * Validate credentials for a specific provider
   */
  validateCredentials(providerName: string, credentials: any): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }

    return provider.validateCredentials(credentials);
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const posService = PosService.getInstance();