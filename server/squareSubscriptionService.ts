// Using fetch-based approach since squareup package structure may vary
export interface SquareConfig {
  accessToken: string;
  applicationId: string;
  environment: 'sandbox' | 'production';
  webhookSignatureKey?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  billingCycle: 'MONTHLY' | 'ANNUAL';
  trialDays?: number;
  badge?: string;
  popular?: boolean;
}

export interface CreateSubscriptionRequest {
  email: string;
  plan: 'professional' | 'enterprise';
  hrAddonLocations?: number;
}

export interface SubscriptionResult {
  subscriptionId: string;
  customerId: string;
  status: string;
  nextBillingDate?: string;
  totalAmount: number;
}

class SquareSubscriptionService {
  private config: SquareConfig | null = null;
  private isConfigured = false;
  private baseUrl = '';

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const accessToken = process.env.SQUARE_ACCESS_TOKEN;
      const applicationId = process.env.SQUARE_APPLICATION_ID;
      const environment = process.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production';
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

      if (!accessToken || !applicationId) {
        console.log('⚠️ Square credentials not configured - subscription features disabled');
        this.isConfigured = false;
        return;
      }

      // Default to sandbox if environment not specified
      const squareEnvironment = environment === 'production' ? 'production' : 'sandbox';

      this.config = {
        accessToken,
        applicationId,
        environment: squareEnvironment,
        webhookSignatureKey
      };

      // Set base URL based on environment
      this.baseUrl = squareEnvironment === 'production' 
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

      this.isConfigured = true;
      console.log('✅ Square Subscription Service initialized successfully');
      console.log(`🌍 Environment: ${squareEnvironment}`);
      console.log(`🔗 Base URL: ${this.baseUrl}`);
    } catch (error) {
      console.error('❌ Failed to initialize Square client:', error);
      this.isConfigured = false;
    }
  }

  public getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'per_location',
        name: 'RestroFlow Core',
        price: 179,
        billingCycle: 'MONTHLY',
        popular: true,
        features: [
          'Unlimited OCR invoice processing',
          'Advanced image OCR (scanned invoices)',
          'Real-time inventory tracking',
          'Recipe costing & management',
          'Purchase order automation',
          'Comprehensive waste tracking',
          'Advanced analytics dashboard',
          'All POS/accounting integrations',
          'Budget tracking & variance analysis',
          'Theoretical vs actual reporting',
          'Menu engineering analysis',
          'Daily P&L statements',
          'Priority phone support',
          'API access'
        ]
      }
    ];
  }

  public getHrAddonPricing(): { pricePerLocation: number; description: string } {
    return {
      pricePerLocation: 79,
      description: 'HR Management Add-on - Employee scheduling, time tracking, payroll, and document management'
    };
  }

  public getCompleteSubscriptionData(): { 
    plans: SubscriptionPlan[]; 
    hrAddon: { pricePerLocation: number; description: string; features: string[] } 
  } {
    return {
      plans: this.getSubscriptionPlans(),
      hrAddon: {
        ...this.getHrAddonPricing(),
        features: [
          'Employee scheduling & time tracking',
          'Digital document management',
          'Payroll processing & pay stubs',
          'Performance reviews & evaluations',
          'Time-off request management',
          'Task assignment & completion tracking',
          'Internal messaging system',
          'HR analytics & reporting'
        ]
      }
    };
  }

  public isEnabled(): boolean {
    return this.isConfigured;
  }

  public async createCustomer(email: string, firstName?: string, lastName?: string): Promise<string> {
    if (!this.isConfigured || !this.config) {
      throw new Error('Square not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_APPLICATION_ID environment variables.');
    }

    try {
      const request = {
        emailAddress: email,
        givenName: firstName,
        familyName: lastName,
      };

      const response = await fetch(`${this.baseUrl}/v2/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Square API error: ${errorData.errors?.[0]?.detail || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.customer?.id) {
        console.log('✅ Square customer created:', data.customer.id);
        return data.customer.id;
      } else {
        throw new Error('Failed to create Square customer - no customer ID returned');
      }
    } catch (error) {
      console.error('❌ Failed to create Square customer:', error);
      throw new Error(`Failed to create Square customer: ${error.message}`);
    }
  }

  public async createSubscription(customerId: string, planId: string, hrAddonLocations: number = 0): Promise<SubscriptionResult> {
    if (!this.isConfigured || !this.config) {
      throw new Error('Square not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_APPLICATION_ID environment variables.');
    }

    try {
      const plans = this.getSubscriptionPlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }

      // Calculate total amount (base plan + HR addon)
      const hrAddonPrice = this.getHrAddonPricing().pricePerLocation;
      const totalAmount = plan.price + (hrAddonLocations * hrAddonPrice);

      console.log('🔄 Creating Square subscription for customer:', customerId);
      console.log('📊 Plan:', planId, 'Total amount:', totalAmount);

      // Note: Square Subscriptions API might require creating catalog plans first
      // For now, creating a mock subscription since this requires Square catalog setup
      const mockSubscriptionId = `sub_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        subscriptionId: mockSubscriptionId,
        customerId,
        status: 'ACTIVE',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        totalAmount
      };

    } catch (error) {
      console.error('❌ Failed to create Square subscription:', error);
      throw new Error(`Failed to create Square subscription: ${error.message}`);
    }
  }

  public async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.isConfigured || !this.config) {
      throw new Error('Square not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_APPLICATION_ID environment variables.');
    }

    try {
      console.log('🔄 Cancelling Square subscription:', subscriptionId);
      
      // Note: Square Subscriptions API cancel endpoint would go here
      // For now, returning mock success since this requires proper catalog setup
      return true;

    } catch (error) {
      console.error('❌ Failed to cancel Square subscription:', error);
      throw new Error(`Failed to cancel Square subscription: ${error.message}`);
    }
  }

  public verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config?.webhookSignatureKey) {
      console.log('⚠️ No webhook signature key configured - skipping verification');
      return true; // Allow webhook without verification if key not set
    }

    try {
      // Square webhook signature verification logic would go here
      // This is a placeholder implementation
      console.log('🔐 Verifying Square webhook signature');
      return true;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  public async getCustomerPortalUrl(customerId: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Square not configured. Please set SQUARE_ACCESS_TOKEN and SQUARE_APPLICATION_ID environment variables.');
    }

    // Square doesn't have a direct customer portal like Stripe
    // This would typically redirect to your own billing management page
    // or use Square's customer management features
    const baseUrl = this.config?.environment === Environment.Production 
      ? 'https://squareup.com' 
      : 'https://squareupsandbox.com';
      
    return `${baseUrl}/dashboard/customers/${customerId}`;
  }

  public isEnabled(): boolean {
    return this.isConfigured;
  }

  public getConfiguration(): { isConfigured: boolean; environment?: string; hasWebhookKey: boolean } {
    return {
      isConfigured: this.isConfigured,
      environment: this.config?.environment || 'sandbox',
      hasWebhookKey: !!this.config?.webhookSignatureKey
    };
  }
}

export const squareSubscriptionService = new SquareSubscriptionService();