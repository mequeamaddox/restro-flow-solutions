import { z } from 'zod';

// Subscription plan validation schema
export const subscriptionPlanSchema = z.enum(['professional', 'enterprise']);

// Create subscription request schema
export const createSubscriptionSchema = z.object({
  email: z.string().email('Invalid email address'),
  plan: subscriptionPlanSchema,
  hrAddonLocations: z.number().int().min(0).max(50).default(0),
});

// Webhook payload schema
export const squareWebhookSchema = z.object({
  merchant_id: z.string(),
  type: z.string(),
  event_id: z.string(),
  created_at: z.string(),
  data: z.object({
    type: z.string(),
    id: z.string(),
    object: z.record(z.any()),
  }),
});

// Cancel subscription schema
export const cancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
});

// Subscription status enum
export const subscriptionStatusSchema = z.enum([
  'active',
  'inactive', 
  'cancelled',
  'paused',
  'canceled',
  'past_due'
]);

// Export types
export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type SquareWebhookPayload = z.infer<typeof squareWebhookSchema>;
export type CancelSubscriptionRequest = z.infer<typeof cancelSubscriptionSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;