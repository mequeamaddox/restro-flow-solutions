import { storage } from "./storage";
import { 
  PosIntegration, 
  InsertPosSale, 
  InsertPosSaleItem,
  InsertInventoryTransaction,
  InsertPosEmployee 
} from "@shared/schema";

export interface CloverOrderResponse {
  id: string;
  total: number;
  createdTime: number;
  taxAmount?: number; // Tax in cents
  tipAmount?: number; // Tip in cents
  lineItems?: {
    elements: Array<{
      id: string;
      name: string;
      price: number;
      quantity?: number;
      item?: {
        id: string;
        name: string;
      };
    }>;
  };
}

export interface CloverWebhookPayload {
  objectId: string;
  type: "ORDER";
  merchantId: string;
}

export interface CloverEmployee {
  id: string;
  name: string;
  nickname?: string;
  email?: string;
  customId?: string;
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  deletedTime?: number;
}

export interface CloverShift {
  id: string;
  employee: {
    id: string;
  };
  inTime: number; // Unix timestamp in milliseconds
  outTime?: number; // Unix timestamp in milliseconds
  overrideInTime?: number;
  overrideOutTime?: number;
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

      const orderData = await response.json();
      console.log('🔍 RAW Clover Order Data:', JSON.stringify(orderData, null, 2));
      return orderData;
    } catch (error) {
      console.error('Error fetching order from Clover:', error);
      return null;
    }
  }

  /**
   * Process order and automatically deduct inventory using recipe-based system
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

      // Calculate subtotal from line items (price * quantity for each item)
      const lineItems = orderData.lineItems?.elements || [];
      const subtotal = lineItems.reduce((sum: number, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
      }, 0);
      
      // Extract tax and tip from Clover totals (if available)
      // Clover API may provide totals object or we calculate from order total
      const taxAmount = orderData.taxAmount || 0; // Tax amount in cents
      const tipAmount = orderData.tipAmount || 0; // Tip amount in cents
      
      console.log(`💰 Order financial breakdown:
        Subtotal: $${(subtotal / 100).toFixed(2)}
        Tax: $${(taxAmount / 100).toFixed(2)}
        Tip: $${(tipAmount / 100).toFixed(2)}
        Total: $${(orderData.total / 100).toFixed(2)}`);
      
      // Create sale record with complete financial data
      const saleData: InsertPosSale = {
        posOrderId: orderData.id,
        posIntegrationId: integration.id,
        locationId: integration.locationId,
        total: (orderData.total / 100).toString(), // Clover amounts are in cents
        subtotal: (subtotal / 100).toString(),
        tax: taxAmount > 0 ? (taxAmount / 100).toString() : null,
        tip: tipAmount > 0 ? (tipAmount / 100).toString() : null,
        orderDate: new Date(orderData.createdTime),
        inventoryProcessed: false,
      };

      const sale = await storage.createPosSale(saleData);

      // Process each line item
      console.log('📊 Line items count:', lineItems.length);
      
      if (lineItems.length === 0) {
        console.warn('⚠️ No line items found in order:', orderData.id);
      }
      
      for (const lineItem of lineItems) {
        const unitPrice = (lineItem.price / 100);
        const quantity = lineItem.quantity || 1;
        
        console.log(`📝 Creating sale item: ${lineItem.name} x${quantity} @ $${unitPrice}`);
        
        // Create sale item record
        const saleItemData: InsertPosSaleItem = {
          posSaleId: sale.id,
          itemName: lineItem.name,
          quantity: quantity,
          unitPrice: unitPrice.toString(),
          totalPrice: (unitPrice * quantity).toString(),
        };

        await storage.createPosSaleItem(saleItemData);
        console.log(`✅ Sale item created for: ${lineItem.name}`);
      }

      // Use the new recipe-based inventory deduction system
      const posService = await import('./posService');
      await posService.posService.processInventoryDeductions(sale.id);

      console.log(`Successfully processed Clover order ${orderData.id} with recipe-based inventory deductions`);
      
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
      if (orders.length > 0) {
        console.log('🔍 First order sample:', JSON.stringify(orders[0], null, 2));
      }

      let newCount = 0;
      let existingCount = 0;
      for (const order of orders) {
        try {
          // Check if order already exists
          const existing = await storage.getPosSaleByOrderId(integration.id, order.id);
          if (existing) {
            console.log(`Order ${order.id} already exists, skipping`);
            existingCount++;
            continue;
          }

          await this.processOrder(integration, order);
          newCount++;
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
        }
      }

      await storage.updatePosIntegration(integration.id, {
        lastSyncAt: new Date(),
      });

      console.log(`Sync complete: ${newCount} new, ${existingCount} already existed (${orders.length} total)`);
      return newCount;
      
    } catch (error) {
      console.error('Error syncing historical orders:', error);
      throw error;
    }
  }

  /**
   * Sync employees from Clover
   */
  async syncEmployees(integrationId: string): Promise<number> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const employees = await this.fetchEmployeesFromClover(integration);
      if (!employees) {
        throw new Error('Failed to fetch employees from Clover');
      }

      let syncedCount = 0;
      for (const employee of employees) {
        try {
          // Skip deleted employees
          if (employee.deletedTime) {
            continue;
          }

          const employeeData: InsertPosEmployee = {
            posIntegrationId: integration.id,
            posEmployeeId: employee.id,
            displayName: employee.name,
            firstName: employee.name.split(' ')[0] || employee.name,
            lastName: employee.name.split(' ').slice(1).join(' ') || undefined,
            email: employee.email || undefined,
            roleTitle: employee.role || undefined,
            isActive: true,
            metadata: {
              customId: employee.customId,
              nickname: employee.nickname,
              cloverRole: employee.role,
            },
            lastSeenAt: new Date(),
          };

          await storage.upsertPosEmployee(employeeData);
          syncedCount++;
        } catch (error) {
          console.error(`Error syncing employee ${employee.id}:`, error);
        }
      }

      console.log(`Successfully synced ${syncedCount} employees from Clover`);
      return syncedCount;
    } catch (error) {
      console.error('Error syncing employees:', error);
      throw error;
    }
  }

  /**
   * Sync shifts/timeclock from Clover
   */
  async syncShifts(integrationId: string, daysBack: number = 7): Promise<number> {
    try {
      const integration = await storage.getPosIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Get all active POS employees for this integration
      const posEmployees = await storage.getPosEmployees(integrationId);
      if (!posEmployees || posEmployees.length === 0) {
        console.log('No employees found, sync employees first');
        return 0;
      }

      console.log(`Starting shift sync for ${posEmployees.length} employees...`);
      let totalShifts = 0;
      
      // Fetch shifts for each employee with rate limiting
      for (let i = 0; i < posEmployees.length; i++) {
        const posEmployee = posEmployees[i];
        
        try {
          const shifts = await this.fetchShiftsForEmployee(integration, posEmployee.posEmployeeId, daysBack);
          if (!shifts) continue;

          // Process each shift
          for (const shift of shifts) {
            try {
              const clockInAt = shift.overrideInTime 
                ? new Date(shift.overrideInTime) 
                : new Date(shift.inTime);
              
              const clockOutAt = shift.overrideOutTime 
                ? new Date(shift.overrideOutTime) 
                : shift.outTime 
                  ? new Date(shift.outTime) 
                  : null;

              const timeclockData = {
                posIntegrationId: integration.id,
                posTimeEntryId: shift.id,
                posEmployeeId: posEmployee.id,
                locationId: integration.locationId,
                clockInAt,
                clockOutAt,
                breakSeconds: 0,
                roleTitle: posEmployee.roleTitle,
                status: clockOutAt ? 'closed' : 'open',
                raw: shift,
              };

              await storage.upsertPosTimeclock(timeclockData);
              totalShifts++;
            } catch (error) {
              console.error(`Error processing shift ${shift.id}:`, error);
            }
          }
          
          // Rate limiting: wait 250ms between employee requests to avoid 429 errors
          if (i < posEmployees.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        } catch (error) {
          console.error(`Error syncing shifts for employee ${posEmployee.posEmployeeId}:`, error);
          // Continue with next employee even if this one fails
        }
      }

      console.log(`Successfully synced ${totalShifts} shifts from Clover`);
      return totalShifts;
    } catch (error) {
      console.error('Error syncing shifts:', error);
      throw error;
    }
  }

  /**
   * Fetch shifts for a single employee from Clover API
   */
  private async fetchShiftsForEmployee(
    integration: PosIntegration,
    employeeId: string,
    daysBack: number = 7
  ): Promise<CloverShift[] | null> {
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

      // Calculate start time for filtering (daysBack ago)
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - daysBack);
      
      // Use per-employee endpoint (merchant-level /shifts endpoint doesn't exist)
      const response = await fetch(
        `${baseUrl}/v3/merchants/${integration.merchantId}/employees/${employeeId}/shifts?filter=inTime>=${startTime.getTime()}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // 404 might mean no shifts exist for this employee
        if (response.status === 404) {
          return [];
        }
        
        // Log other errors but don't throw - continue with other employees
        const errorText = await response.text();
        console.error(`Error fetching shifts for employee ${employeeId}: ${response.status} ${response.statusText}`);
        console.error(`Details: ${errorText}`);
        return [];
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error(`Error fetching shifts for employee ${employeeId}:`, error);
      return null;
    }
  }

  /**
   * Fetch employees from Clover API
   */
  private async fetchEmployeesFromClover(
    integration: PosIntegration
  ): Promise<CloverEmployee[] | null> {
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
        `${baseUrl}/v3/merchants/${integration.merchantId}/employees`,
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
      return data.elements || [];
    } catch (error) {
      console.error('Error fetching employees from Clover:', error);
      return null;
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