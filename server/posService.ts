import { storage } from "./storage";
import { safeFetch } from "./lib/safeFetch";

interface PosCredentials {
  accessToken?: string | null;
  apiKey?: string | null;
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
        sandbox: "https://restaurantapi-qa.spoton.com/posexport/v1",
        production: "https://restaurantapi.spoton.com/posexport/v1",
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
        case "spoton":
          return await this.testSpotOnConnection(baseUrl, credentials, integration.merchantId);
        case "clover":
          if (!credentials?.accessToken) return false;
          return await this.testCloverConnection(baseUrl, integration.merchantId, credentials.accessToken);
        case "square":
          if (!credentials?.accessToken) return false;
          return await this.testSquareConnection(baseUrl, credentials.accessToken);
        default:
          // For unsupported providers, return true if credentials exist
          return !!(credentials.accessToken || credentials.apiKey);
      }
    } catch (error) {
      console.error("POS connection test failed:", error);
      return false;
    }
  }

  private async testCloverConnection(baseUrl: string, merchantId: string, accessToken: string): Promise<boolean> {
    const url = `${baseUrl}/v3/merchants/${merchantId}`;
    console.log('🔍 Testing Clover connection:', { url, merchantId });
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Clover connection test failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
    } else {
      console.log('✅ Clover connection test successful');
    }
    
    return response.ok;
  }

  private async testSpotOnConnection(
    baseUrl: string,
    credentials: PosCredentials,
    locationId: string
  ): Promise<boolean> {
    if (!credentials.apiKey) return false;
    const response = await fetch(`${baseUrl}/locations/${encodeURIComponent(locationId)}`, {
      headers: { "x-api-key": credentials.apiKey! },
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
      
      // Provider-specific credential validation
      if (integration.provider === "spoton") {
        if (!credentials?.apiKey) {
          throw new Error("API key is required for SpotOn menu sync");
        }
      } else {
        if (!credentials?.accessToken) {
          throw new Error("Access token is required for menu sync");
        }
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
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const url = `${baseUrl}/v3/merchants/${integration.merchantId}/items?limit=${limit}&offset=${offset}`;
      const res = await safeFetch(url, { 
        headers: { Authorization: `Bearer ${credentials.accessToken}` } 
      });
      const data = await res.json();
      const items = data.elements ?? [];
      
      for (const item of items) {
        await storage.upsertPosMenuItem({
          posItemId: item.id,
          posIntegrationId: integration.id,
          name: item.name,
          price: item.price != null ? (item.price / 100).toString() : null,
          category: item.categories?.[0]?.name ?? null,
          sku: item.sku ?? null,
        });
      }
      
      if (items.length < limit) break;
    }
  }

  private async syncSpotOnMenuItems(baseUrl: string, integration: any, credentials: PosCredentials): Promise<void> {
    if (!credentials.apiKey) throw new Error("Missing SpotOn API key");
    const url = `${baseUrl}/locations/${encodeURIComponent(integration.merchantId)}/menu-items`;
    const res = await safeFetch(url, { headers: { "x-api-key": credentials.apiKey! } });
    const items = await res.json();
    
    for (const item of items ?? []) {
      await storage.upsertPosMenuItem({
        posItemId: item.id,
        posIntegrationId: integration.id,
        name: item.name,
        price: item.standardPriceAmount ?? null,
        category: item.reportCategoryId ?? null,
        sku: item.plu ?? null,
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

  async pollSpotOnOrders(integrationId: string): Promise<{ ordersProcessed: number }> {
    const integration = await storage.getPosIntegration(integrationId);
    if (!integration || !integration.isActive) return { ordersProcessed: 0 };
    const credentials = integration.credentials as PosCredentials;
    if (!credentials.apiKey) throw new Error("Missing SpotOn API key");

    const baseUrl = this.getBaseUrl("spoton", integration.environment);
    const lagMin = Number(process.env.SPOTON_LAG_MINUTES ?? 5);
    const intervalMin = Number(process.env.SPOTON_POLL_INTERVAL_MINUTES ?? 1);

    const now = new Date();
    const windowEnd = new Date(now.getTime() - lagMin * 60 * 1000);
    const windowStart = new Date(windowEnd.getTime() - intervalMin * 60 * 1000);

    const params = new URLSearchParams({
      updatedAtStart: toRFC3339Z(windowStart),
      updatedAtEnd: toRFC3339Z(windowEnd),
    });

    const url = `${baseUrl}/locations/${encodeURIComponent(integration.merchantId)}/orders?${params}`;
    const res = await safeFetch(url, { headers: { "x-api-key": credentials.apiKey! } });
    const orders = await res.json();

    let count = 0;
    for (const order of orders ?? []) {
      const existing = await storage.getPosSaleByOrderId(integration.id, order.id);
      if (existing) continue;

      const total = order.totalAmount?.amount ?? "0";
      const createdAt = order.createdAt ?? new Date().toISOString();

      const posSale = await storage.createPosSale({
        posOrderId: order.id,
        posIntegrationId: integration.id,
        locationId: integration.locationId,
        total,
        orderDate: new Date(createdAt),
        inventoryProcessed: false,
      });

      const addItem = async (li: any) => {
        const qty = Number(li.quantity ?? "1");
        const unit = li.preDiscountsAmount?.amount ?? "0";
        const totalLine = li.totalAmount?.amount ?? "0";
        await storage.createPosSaleItem({
          posSaleId: posSale.id,
          itemName: li.name,
          quantity: qty,
          unitPrice: unit,
          totalPrice: totalLine,
        });
      };

      for (const check of order.checks ?? []) {
        for (const li of check.items ?? []) await addItem(li);
        for (const guest of check.guests ?? []) {
          for (const li of guest.items ?? []) await addItem(li);
        }
      }

      await this.processInventoryDeductions(posSale.id);
      count++;
    }

    await storage.updatePosIntegration(integration.id, { lastSyncAt: new Date().toISOString() });
    return { ordersProcessed: count };
  }

  async pollSpotOnTimeclock(integrationId: string): Promise<{ punchesProcessed: number }> {
    const integration = await storage.getPosIntegration(integrationId);
    if (!integration || !integration.isActive) return { punchesProcessed: 0 };
    const credentials = integration.credentials as PosCredentials;
    if (!credentials.apiKey) throw new Error("Missing SpotOn API key");
    const baseUrl = this.getBaseUrl("spoton", integration.environment);

    const lagMin = Number(process.env.SPOTON_LAG_MINUTES ?? 5);
    const intervalMin = Number(process.env.SPOTON_POLL_INTERVAL_MINUTES ?? 1);
    const now = new Date();
    const windowEnd = new Date(now.getTime() - lagMin * 60 * 1000);
    const windowStart = new Date(windowEnd.getTime() - intervalMin * 60 * 1000);
    const params = new URLSearchParams({
      updatedAtStart: toRFC3339Z(windowStart),
      updatedAtEnd: toRFC3339Z(windowEnd),
    });

    const url = `${baseUrl}/locations/${encodeURIComponent(integration.merchantId)}/time-clock-entries?${params}`;
    const res = await safeFetch(url, { headers: { "x-api-key": credentials.apiKey! } });
    const punches = await res.json();

    let count = 0;
    for (const p of punches ?? []) {
      count++;
    }
    return { punchesProcessed: count };
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
    
    // Check if order already exists (idempotency)
    const existing = await storage.getPosSaleByOrderId(integration.id, order.id);
    if (existing) {
      console.log(`SpotOn order ${order.id} already processed`);
      return;
    }
    
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
    
    // Check if order already exists (idempotency)
    const existing = await storage.getPosSaleByOrderId(integration.id, order.id);
    if (existing) {
      console.log(`Square order ${order.id} already processed`);
      return;
    }
    
    const posSale = await storage.createPosSale({
      posOrderId: order.id,
      posIntegrationId: integration.id,
      locationId: integration.locationId,
      total: (order.total_money.amount / 100).toString(),
      orderDate: new Date(order.created_at),
      inventoryProcessed: false,
    });

    if (order.line_items) {
      for (const li of order.line_items) {
        const qty = Number(li.quantity ?? 1);
        const totalCents = li.total_money?.amount ?? 0;
        const unitCents = li.base_price_money?.amount ?? (qty ? Math.round(totalCents / qty) : totalCents);
        
        await storage.createPosSaleItem({
          posSaleId: posSale.id,
          itemName: li.name,
          quantity: qty,
          unitPrice: (unitCents / 100).toString(),
          totalPrice: (totalCents / 100).toString(),
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

function toRFC3339Z(d: Date): string {
  return new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export const posService = new PosService();