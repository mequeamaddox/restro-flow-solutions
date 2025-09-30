import { storage } from "./storage";
import { safeFetch } from "./lib/safeFetch";

interface PosCredentials {
  accessToken: string;
  apiKey?: string;
  [key: string]: any;
}

export class PosService {
  private getBaseUrl(provider: string, environment: string): string {
    const urls: Record<string, Record<string, string>> = {
      clover: {
        sandbox: "https://sandbox.dev.clover.com",
        production: "https://api.clover.com",
      },
      spoton: {
        sandbox: "https://api-sandbox.spoton.com",
        production: "https://api.spoton.com",
      },
      square: {
        sandbox: "https://connect.squareupsandbox.com",
        production: "https://connect.squareup.com",
      },
      toast: {
        sandbox: "https://ws-api-sandbox.toasttab.com",
        production: "https://ws-api.toasttab.com",
      },
      revel: {
        sandbox: "https://sandbox.revelup.com/api/v1",
        production: "https://api.revelup.com/api/v1",
      },
    };
    return urls[provider]?.[environment] || "";
  }

  async testConnection(integrationId: string): Promise<boolean> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration) return false;

      const credentials = integration.credentials as PosCredentials;
      const baseUrl = this.getBaseUrl(integration.provider, integration.environment);
      
      if (!baseUrl || !integration.merchantId) return false;

      // Provider-specific connection test
      switch (integration.provider) {
        case "clover":
          return await this.testCloverConnection(baseUrl, integration.merchantId, credentials.accessToken);
        case "spoton":
          return await this.testSpotOnConnection(baseUrl, credentials);
        case "square":
          return await this.testSquareConnection(baseUrl, credentials.accessToken);
        default:
          // For unsupported providers, return true if credentials exist
          return !!credentials.accessToken;
      }
    } catch (error) {
      console.error("POS connection test failed:", error);
      return false;
    }
  }

  private async testCloverConnection(baseUrl: string, merchantId: string, accessToken: string): Promise<boolean> {
    const response = await fetch(`${baseUrl}/v3/merchants/${merchantId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  }

  private async testSpotOnConnection(baseUrl: string, credentials: PosCredentials): Promise<boolean> {
    const response = await fetch(`${baseUrl}/v1/auth/test`, {
      headers: { 
        Authorization: `Bearer ${credentials.accessToken}`,
        "X-API-Key": credentials.apiKey || "",
      },
    });
    return response.ok;
  }

  private async testSquareConnection(baseUrl: string, accessToken: string): Promise<boolean> {
    const response = await fetch(`${baseUrl}/v2/locations`, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2023-12-13",
      },
    });
    return response.ok;
  }

  async syncMenuItems(integrationId: string): Promise<void> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration) throw new Error("Integration not found");

      const credentials = integration.credentials as PosCredentials;
      const baseUrl = this.getBaseUrl(integration.provider, integration.environment);
      
      if (!integration.merchantId) {
        throw new Error("Merchant ID is required for menu sync");
      }

      // Provider-specific menu sync
      switch (integration.provider) {
        case "clover":
          await this.syncCloverMenuItems(baseUrl, integration, credentials);
          break;
        case "spoton":
          await this.syncSpotOnMenuItems(baseUrl, integration, credentials);
          break;
        case "square":
          await this.syncSquareMenuItems(baseUrl, integration, credentials);
          break;
        default:
          console.log(`Menu sync not implemented for provider: ${integration.provider}`);
      }

      await storage.updatePosIntegration(integrationId, {
        lastSyncAt: new Date().toISOString() as any,
      });
    } catch (error) {
      console.error("Menu items sync failed:", error);
      throw error;
    }
  }

  private async syncCloverMenuItems(baseUrl: string, integration: any, credentials: PosCredentials): Promise<void> {
    const response = await fetch(`${baseUrl}/v3/merchants/${integration.merchantId}/items`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    if (!response.ok) throw new Error("Failed to fetch Clover menu items");

    const data = await response.json();
    
    for (const item of data.elements || []) {
      await storage.upsertPosMenuItem({
        posItemId: item.id,
        posIntegrationId: integration.id,
        name: item.name,
        price: item.price ? (item.price / 100).toString() : null,
        category: item.categories?.[0]?.name || null,
        sku: item.sku || null,
      });
    }
  }

  private async syncSpotOnMenuItems(baseUrl: string, integration: any, credentials: PosCredentials): Promise<void> {
    const response = await fetch(`${baseUrl}/v1/menu/items`, {
      headers: { 
        Authorization: `Bearer ${credentials.accessToken}`,
        "X-API-Key": credentials.apiKey || "",
      },
    });

    if (!response.ok) throw new Error("Failed to fetch SpotOn menu items");

    const data = await response.json();
    
    for (const item of data.items || []) {
      await storage.upsertPosMenuItem({
        posItemId: item.id,
        posIntegrationId: integration.id,
        name: item.name,
        price: item.price ? item.price.toString() : null,
        category: item.category || null,
        sku: item.sku || null,
      });
    }
  }

  private async syncSquareMenuItems(baseUrl: string, integration: any, credentials: PosCredentials): Promise<void> {
    let cursor: string | undefined;
    do {
      const url = new URL(`${baseUrl}/v2/catalog/list`);
      url.searchParams.set("types", "ITEM");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await safeFetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Square-Version": "2025-05-15",
        },
      });
      const data = await res.json();

      for (const obj of data.objects ?? []) {
        if (obj.type !== "ITEM") continue;
        const item = obj.item_data;
        const firstVar = item?.variations?.[0]?.item_variation_data;
        const cents = firstVar?.price_money?.amount;
        await storage.upsertPosMenuItem({
          posItemId: obj.id,
          posIntegrationId: integration.id,
          name: item?.name ?? "",
          price: cents != null ? (cents / 100).toString() : null,
          category: item?.category_id ?? null,
          sku: firstVar?.sku ?? null,
        });
      }
      cursor = data?.cursor;
    } while (cursor);
  }

  async processOrderWebhook(payload: any): Promise<void> {
    try {
      console.log('Processing webhook payload:', JSON.stringify(payload, null, 2));
      
      // Determine provider from webhook payload structure
      let provider = "unknown";
      let merchantId = "";
      
      if (payload.merchantId) {
        provider = "clover";
        merchantId = payload.merchantId;
      } else if (payload.location_id) {
        provider = "spoton";
        merchantId = payload.location_id;
      } else if (payload.merchant_id) {
        provider = "square";
        merchantId = payload.merchant_id;
      }

      const integrations = await storage.getPosIntegrations();
      const integration = integrations.find(i => i.merchantId === merchantId && i.isActive);
      
      if (!integration) {
        console.log(`No active integration found for merchant ${merchantId}`);
        return;
      }

      console.log(`Processing ${provider} webhook for integration ${integration.id}`);

      // Process based on provider
      switch (provider) {
        case "clover":
          await this.processCloverWebhook(payload, integration);
          break;
        case "spoton":
          await this.processSpotOnOrder(payload, integration);
          break;
        case "square":
          await this.processSquareOrder(payload, integration);
          break;
        default:
          console.log(`Unknown provider for webhook payload`);
      }
      
      // Update last sync time
      await storage.updatePosIntegration(integration.id, {
        lastSyncAt: new Date().toISOString() as any,
      });
    } catch (error) {
      console.error("Webhook processing failed:", error);
      throw error;
    }
  }

  private async processCloverWebhook(payload: any, integration: any): Promise<void> {
    const eventType = payload.eventType;
    
    switch (eventType) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATED':
        await this.processCloverOrder(payload, integration);
        break;
      case 'PAYMENT_CREATED':
        await this.processCloverPayment(payload, integration);
        break;
      case 'INVENTORY_UPDATED':
        await this.processCloverInventoryUpdate(payload, integration);
        break;
      default:
        console.log(`Unhandled Clover event type: ${eventType}`);
    }
  }

  private async processCloverOrder(payload: any, integration: any): Promise<void> {
    const order = payload.data || payload;
    
    // Check if order already exists
    const existingSales = await storage.getPosSales(integration.locationId);
    const existingSale = existingSales.find(sale => sale.posOrderId === order.id);
    
    if (existingSale) {
      console.log(`Order ${order.id} already processed`);
      return;
    }
    
    const posSale = await storage.createPosSale({
      posOrderId: order.id,
      posIntegrationId: integration.id,
      locationId: integration.locationId,
      total: (order.total / 100).toString(),
      orderDate: new Date(order.createdTime || Date.now()),
      inventoryProcessed: false,
    });

    if (order.lineItems) {
      for (const lineItem of order.lineItems) {
        await storage.createPosSaleItem({
          posSaleId: posSale.id,
          itemName: lineItem.name,
          quantity: lineItem.unitQty || 1,
          unitPrice: (lineItem.price / 100).toString(),
          totalPrice: ((lineItem.price * (lineItem.unitQty || 1)) / 100).toString(),
        });
      }
    }

    await this.processInventoryDeductions(posSale.id);
    
    console.log(`Successfully processed Clover order ${order.id}`);
  }

  private async processCloverPayment(payload: any, integration: any): Promise<void> {
    console.log('Processing Clover payment webhook:', payload.data?.id);
    // Payment webhooks can be used for accounting/reporting
    // For now, just log the payment
  }

  private async processCloverInventoryUpdate(payload: any, integration: any): Promise<void> {
    console.log('Processing Clover inventory update:', payload.data?.id);
    // Re-sync menu items when inventory changes in Clover
    try {
      await this.syncMenuItems(integration.id);
    } catch (error) {
      console.error('Failed to sync menu items after inventory update:', error);
    }
  }

  private async processSpotOnOrder(payload: any, integration: any): Promise<void> {
    const order = payload.order;
    const posSale = await storage.createPosSale({
      posOrderId: order.id,
      posIntegrationId: integration.id,
      locationId: integration.locationId,
      total: order.total.toString(),
      orderDate: new Date(order.created_at),
      inventoryProcessed: false,
    });

    if (order.items) {
      for (const item of order.items) {
        await storage.createPosSaleItem({
          posSaleId: posSale.id,
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: item.price.toString(),
          totalPrice: (item.price * item.quantity).toString(),
        });
      }
    }

    await this.processInventoryDeductions(posSale.id);
  }

  private async processSquareOrder(payload: any, integration: any): Promise<void> {
    const order = payload.data.object.order;
    const posSale = await storage.createPosSale({
      posOrderId: order.id,
      posIntegrationId: integration.id,
      locationId: integration.locationId,
      total: (order.total_money.amount / 100).toString(),
      orderDate: new Date(order.created_at),
      inventoryProcessed: false,
    });

    if (order.line_items) {
      for (const lineItem of order.line_items) {
        await storage.createPosSaleItem({
          posSaleId: posSale.id,
          itemName: lineItem.name,
          quantity: parseInt(lineItem.quantity),
          unitPrice: (lineItem.total_money.amount / 100).toString(),
          totalPrice: (lineItem.total_money.amount / 100).toString(),
        });
      }
    }

    await this.processInventoryDeductions(posSale.id);
  }

  private async processInventoryDeductions(saleId: string): Promise<void> {
    try {
      const sale = await storage.getPosSaleById(saleId);
      if (!sale) return;

      // TODO: Look up mappings and write inventory movements here
      // For now, mark as processed
      await storage.updatePosSale(saleId, {
        inventoryProcessed: true,
        processedAt: new Date().toISOString() as any,
      });
    } catch (error) {
      console.error("Failed to process inventory deductions:", error);
    }
  }
}

export const posService = new PosService();