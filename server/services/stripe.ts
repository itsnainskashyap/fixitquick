import Stripe from 'stripe';
import { storage } from '../storage';
import { nanoid } from 'nanoid';
import type { 
  PaymentMethod as DBPaymentMethod, 
  StripeCustomer as DBStripeCustomer,
  PaymentIntent as DBPaymentIntent 
} from '@shared/schema';

// Initialize Stripe with environment variables
const getStripeInstance = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('⚠️  STRIPE_SECRET_KEY not found - using development mode');
    console.warn('⚠️  Set up your Stripe keys for real payment processing');
    console.warn('⚠️  Get keys from: https://dashboard.stripe.com/apikeys');
    throw new Error('Stripe not configured - missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
};

// Enhanced Payment Service with real Stripe integration
class StripePaymentService {
  private stripe: Stripe | null = null;
  private isConfigured = false;

  constructor() {
    try {
      this.stripe = getStripeInstance();
      this.isConfigured = true;
      console.log('✅ Stripe Payment Service initialized successfully');
      console.log(`✅ Using Stripe API version: ${this.stripe.VERSION}`);
    } catch (error) {
      console.warn('⚠️  Stripe Payment Service running in DEMO mode:', error.message);
      console.warn('⚠️  Real payments will NOT be processed');
      this.isConfigured = false;
    }
  }

  // Check if Stripe is properly configured
  isReady(): boolean {
    return this.isConfigured && this.stripe !== null;
  }

  // Create or get Stripe customer
  async createOrGetCustomer(userId: string): Promise<{ customer: Stripe.Customer; dbCustomer: DBStripeCustomer }> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    // Check if customer exists in our database
    let dbCustomer = await storage.getStripeCustomer(userId);
    
    if (dbCustomer) {
      // Verify customer still exists in Stripe
      try {
        const customer = await this.stripe!.customers.retrieve(dbCustomer.stripeCustomerId) as Stripe.Customer;
        if (!customer.deleted) {
          return { customer, dbCustomer };
        }
      } catch (error) {
        console.warn('Stripe customer not found, creating new one:', error);
      }
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create new Stripe customer
    const customer = await this.stripe!.customers.create({
      email: user.email || undefined,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
      phone: user.phone || undefined,
      metadata: {
        userId,
        source: 'fixitquick',
      },
    });

    // Save to database
    dbCustomer = await storage.createStripeCustomer({
      userId,
      stripeCustomerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      metadata: customer.metadata,
    });

    return { customer, dbCustomer };
  }

  // Create payment intent for order
  async createPaymentIntent(params: {
    userId: string;
    orderId?: string;
    amount: number;
    currency?: string;
    description?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<{ paymentIntent: Stripe.PaymentIntent; dbPaymentIntent: DBPaymentIntent }> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    const { userId, orderId, amount, currency = 'inr', description, paymentMethodTypes, metadata = {}, idempotencyKey } = params;

    // Get or create Stripe customer
    const { customer } = await this.createOrGetCustomer(userId);

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || `pi_${userId}_${orderId || nanoid()}_${Date.now()}`;

    // Fixed configuration: Use automatic_payment_methods OR specific payment_method_types, not both
    // For Indian market, we'll use automatic_payment_methods with enabled types
    const paymentConfig: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency,
      customer: customer.id,
      description: description || `FixitQuick Order Payment`,
      metadata: {
        userId,
        orderId: orderId || '',
        source: 'fixitquick',
        ...metadata,
      },
    };

    // Configure payment methods based on currency and requirements
    if (paymentMethodTypes && paymentMethodTypes.length > 0) {
      // Use specific payment method types when explicitly requested
      paymentConfig.payment_method_types = paymentMethodTypes;
    } else {
      // Use automatic payment methods for better UX (recommended approach)
      paymentConfig.automatic_payment_methods = {
        enabled: true,
        allow_redirects: 'never', // For better UX in mobile apps
      };
    }

    // Add Indian payment method options for INR currency
    if (currency === 'inr') {
      paymentConfig.payment_method_options = {
        upi: {
          preferred_language: 'en', // or 'hi' for Hindi
        },
        card: {
          request_three_d_secure: 'any', // Enhanced security for Indian cards
        },
      };
    }

    // Create payment intent with idempotency key
    const paymentIntent = await this.stripe!.paymentIntents.create(paymentConfig, {
      idempotencyKey: finalIdempotencyKey,
    });

    // Save to database
    const dbPaymentIntent = await storage.createPaymentIntent({
      stripePaymentIntentId: paymentIntent.id,
      userId,
      orderId,
      amount: amount.toString(),
      currency,
      status: paymentIntent.status,
      description,
      clientSecret: paymentIntent.client_secret,
      metadata: paymentIntent.metadata,
    });

    return { paymentIntent, dbPaymentIntent };
  }

  // Save payment method for user
  async savePaymentMethod(params: {
    userId: string;
    stripePaymentMethodId: string;
    nickname?: string;
    setAsDefault?: boolean;
  }): Promise<DBPaymentMethod> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    const { userId, stripePaymentMethodId, nickname, setAsDefault = false } = params;

    // Get payment method details from Stripe
    const paymentMethod = await this.stripe!.paymentMethods.retrieve(stripePaymentMethodId);

    // Get or create customer
    const { customer } = await this.createOrGetCustomer(userId);

    // Attach payment method to customer if not already attached
    if (!paymentMethod.customer) {
      await this.stripe!.paymentMethods.attach(stripePaymentMethodId, {
        customer: customer.id,
      });
    }

    // If setting as default, update previous default
    if (setAsDefault) {
      await storage.updateUserPaymentMethodDefaults(userId, false);
    }

    // Save to database
    const dbPaymentMethod = await storage.createPaymentMethod({
      userId,
      stripePaymentMethodId,
      type: paymentMethod.type as 'card' | 'upi' | 'netbanking' | 'wallet',
      nickname,
      isDefault: setAsDefault,
      fingerprint: paymentMethod.card?.fingerprint,
      // Card details
      ...(paymentMethod.card && {
        cardBrand: paymentMethod.card.brand,
        cardLast4: paymentMethod.card.last4,
        cardExpMonth: paymentMethod.card.exp_month,
        cardExpYear: paymentMethod.card.exp_year,
        cardCountry: paymentMethod.card.country,
      }),
      // UPI details
      ...(paymentMethod.upi && {
        upiId: paymentMethod.upi.vpa,
      }),
      // Billing address
      billingAddress: paymentMethod.billing_details.address ? {
        name: paymentMethod.billing_details.name || '',
        line1: paymentMethod.billing_details.address.line1 || '',
        line2: paymentMethod.billing_details.address.line2 || undefined,
        city: paymentMethod.billing_details.address.city || '',
        state: paymentMethod.billing_details.address.state || '',
        postal_code: paymentMethod.billing_details.address.postal_code || '',
        country: paymentMethod.billing_details.address.country || '',
      } : undefined,
    });

    return dbPaymentMethod;
  }

  // Get user's payment methods
  async getUserPaymentMethods(userId: string): Promise<{
    paymentMethods: DBPaymentMethod[];
    stripePaymentMethods: Stripe.PaymentMethod[];
  }> {
    if (!this.isReady()) {
      return { paymentMethods: [], stripePaymentMethods: [] };
    }

    // Get from database
    const paymentMethods = await storage.getUserPaymentMethods(userId);

    // Get fresh data from Stripe
    const { customer } = await this.createOrGetCustomer(userId);
    const stripePaymentMethodsList = await this.stripe!.paymentMethods.list({
      customer: customer.id,
      type: 'card', // Can be expanded to include other types
    });

    return {
      paymentMethods,
      stripePaymentMethods: stripePaymentMethodsList.data,
    };
  }

  // Delete payment method
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    const dbPaymentMethod = await storage.getPaymentMethod(paymentMethodId);
    if (!dbPaymentMethod || dbPaymentMethod.userId !== userId) {
      throw new Error('Payment method not found or access denied');
    }

    // Detach from Stripe
    await this.stripe!.paymentMethods.detach(dbPaymentMethod.stripePaymentMethodId);

    // Delete from database
    await storage.deletePaymentMethod(paymentMethodId);
  }

  // Confirm payment intent
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    const confirmParams: Stripe.PaymentIntentConfirmParams = {};
    
    if (paymentMethodId) {
      confirmParams.payment_method = paymentMethodId;
    }

    const paymentIntent = await this.stripe!.paymentIntents.confirm(paymentIntentId, confirmParams);

    // Update database
    await storage.updatePaymentIntent(paymentIntentId, {
      status: paymentIntent.status,
      confirmedAt: paymentIntent.status === 'succeeded' ? new Date() : null,
    });

    return paymentIntent;
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentIntentId: string): Promise<{
    success: boolean;
    paymentIntent: Stripe.PaymentIntent;
    order?: any;
  }> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);
    const dbPaymentIntent = await storage.getPaymentIntentByStripeId(paymentIntentId);

    if (!dbPaymentIntent) {
      throw new Error('Payment intent not found in database');
    }

    // Update order status if order exists
    let order = null;
    if (dbPaymentIntent.orderId) {
      order = await storage.updateOrderPaymentStatus(dbPaymentIntent.orderId, 'paid');
    }

    // Update payment intent status
    await storage.updatePaymentIntent(paymentIntentId, {
      status: paymentIntent.status,
      confirmedAt: new Date(),
    });

    return {
      success: true,
      paymentIntent,
      order,
    };
  }

  // Create refund with idempotency protection
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    idempotencyKey?: string;
  }): Promise<Stripe.Refund> {
    if (!this.isReady()) {
      throw new Error('Stripe not configured');
    }

    const { paymentIntentId, amount, reason, idempotencyKey } = params;

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || `rf_${paymentIntentId}_${amount || 'full'}_${Date.now()}`;

    const refund = await this.stripe!.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to smallest currency unit
      reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
      metadata: {
        source: 'fixitquick',
        processedAt: new Date().toISOString(),
        idempotencyKey: finalIdempotencyKey,
      },
    }, {
      idempotencyKey: finalIdempotencyKey,
    });

    return refund;
  }

  // Verify webhook signature
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.isReady()) {
      return false;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not configured');
      return false;
    }

    try {
      this.stripe!.webhooks.constructEvent(rawBody, signature, webhookSecret);
      return true;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  // Process webhook event with comprehensive handling
  async processWebhook(event: Stripe.Event): Promise<{ success: boolean; message: string }> {
    if (!this.isReady()) {
      return { success: false, message: 'Stripe not configured' };
    }

    try {
      console.log('Processing Stripe webhook:', event.type, 'ID:', event.id);

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentSuccess(paymentIntent.id);
          console.log('✅ Payment succeeded:', paymentIntent.id);
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentFailure(failedPayment);
          console.log('❌ Payment failed:', failedPayment.id);
          break;

        case 'payment_intent.requires_action':
          const actionRequired = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentRequiresAction(actionRequired);
          console.log('⏳ Payment requires action:', actionRequired.id);
          break;

        case 'payment_intent.canceled':
          const canceledPayment = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentCanceled(canceledPayment);
          console.log('⚪ Payment canceled:', canceledPayment.id);
          break;

        case 'charge.dispute.created':
          const dispute = event.data.object as Stripe.Dispute;
          await this.handleDispute(dispute);
          console.log('⚠️ Dispute created:', dispute.id);
          break;

        case 'payment_method.attached':
          const attachedPM = event.data.object as Stripe.PaymentMethod;
          console.log('💳 Payment method attached:', attachedPM.id);
          break;

        case 'customer.created':
        case 'customer.updated':
          const customer = event.data.object as Stripe.Customer;
          console.log('👤 Customer event:', event.type, customer.id);
          break;

        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          console.log('📄 Invoice event:', event.type);
          break;

        default:
          console.log('ℹ️ Unhandled webhook event:', event.type);
      }

      return { success: true, message: `Webhook ${event.type} processed successfully` };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, message: `Webhook processing failed: ${error.message}` };
    }
  }

  // Handle payment failure
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await storage.updatePaymentIntent(paymentIntent.id, {
        status: paymentIntent.status,
        cancelReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        canceledAt: new Date(),
      });

      // Update related order status if exists
      if (paymentIntent.metadata?.orderId) {
        await storage.updateOrder(paymentIntent.metadata.orderId, {
          paymentStatus: 'failed',
          status: 'payment_failed'
        });
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  // Handle payment requires action
  private async handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await storage.updatePaymentIntent(paymentIntent.id, {
        status: paymentIntent.status,
      });

      // Update related order status if exists
      if (paymentIntent.metadata?.orderId) {
        await storage.updateOrder(paymentIntent.metadata.orderId, {
          paymentStatus: 'requires_action',
        });
      }
    } catch (error) {
      console.error('Error handling payment requires action:', error);
    }
  }

  // Handle payment canceled
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      await storage.updatePaymentIntent(paymentIntent.id, {
        status: paymentIntent.status,
        cancelReason: paymentIntent.cancellation_reason || 'Payment canceled',
        canceledAt: new Date(),
      });

      // Update related order status if exists
      if (paymentIntent.metadata?.orderId) {
        await storage.updateOrder(paymentIntent.metadata.orderId, {
          paymentStatus: 'canceled',
          status: 'payment_canceled'
        });
      }
    } catch (error) {
      console.error('Error handling payment canceled:', error);
    }
  }

  // Handle dispute creation
  private async handleDispute(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Log dispute for admin attention
      console.error('DISPUTE ALERT:', {
        id: dispute.id,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        charge: dispute.charge,
      });

      // Could implement dispute notification system here
    } catch (error) {
      console.error('Error handling dispute:', error);
    }
  }

  // Get payment statistics for admin
  async getPaymentStatistics(days: number = 30): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
  }> {
    if (!this.isReady()) {
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        refundedAmount: 0,
      };
    }

    const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);

    // Get payment intents from Stripe
    const paymentIntents = await this.stripe!.paymentIntents.list({
      created: { gte: since },
      limit: 100,
    });

    const stats = paymentIntents.data.reduce(
      (acc, pi) => {
        acc.totalPayments++;
        acc.totalAmount += pi.amount / 100; // Convert from cents
        
        if (pi.status === 'succeeded') {
          acc.successfulPayments++;
        } else if (pi.status === 'canceled' || pi.status === 'payment_failed') {
          acc.failedPayments++;
        }
        
        return acc;
      },
      {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        refundedAmount: 0,
      }
    );

    // Get refunds
    const refunds = await this.stripe!.refunds.list({
      created: { gte: since },
      limit: 100,
    });

    stats.refundedAmount = refunds.data.reduce((sum, refund) => sum + refund.amount / 100, 0);

    return stats;
  }
}

// Export singleton instance
export const stripePaymentService = new StripePaymentService();