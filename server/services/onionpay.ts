import fetch from 'node-fetch';
import { storage } from '../storage';
import { nanoid } from 'nanoid';
import type { 
  PaymentMethod as DBPaymentMethod, 
  PaymentIntent as DBPaymentIntent 
} from '@shared/schema';

// OnionPay API Types
interface OnionPaySession {
  id: string;
  amount: number;
  currency: string;
  status: 'created' | 'processing' | 'completed' | 'failed' | 'cancelled';
  customer_id?: string;
  order_id?: string;
  description?: string;
  session_token: string;
  redirect_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  expires_at: string;
}

interface OnionPayWebhook {
  id: string;
  event_type: 'payment.completed' | 'payment.failed' | 'payment.cancelled';
  session_id: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  customer_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// OnionPay Payment Service class
class OnionPayPaymentService {
  private apiKey: string | null = null;
  private apiBase: string = 'https://onionpays.replit.app';
  private isConfigured = false;

  constructor() {
    this.apiKey = process.env.ONIONPAY_SECRET_KEY || null;
    
    if (!this.apiKey) {
      console.warn('⚠️  ONIONPAY_SECRET_KEY not found - OnionPay payments disabled');
      console.warn('⚠️  Set ONIONPAY_SECRET_KEY environment variable for real payment processing');
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      console.log('✅ OnionPay Payment Service initialized successfully');
      console.log(`✅ Using OnionPay API Base: ${this.apiBase}`);
    }
  }

  // Check if OnionPay is properly configured
  isReady(): boolean {
    return this.isConfigured && this.apiKey !== null;
  }

  // Make authenticated API request to OnionPay
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured - missing ONIONPAY_SECRET_KEY');
    }

    const url = `${this.apiBase}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OnionPay API Error (${response.status}): ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OnionPay API request failed:', error);
      throw error;
    }
  }

  // Create OnionPay customer (equivalent to Stripe customer)
  async createOrGetCustomer(userId: string): Promise<{ customerId: string }> {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured');
    }

    // For OnionPay, we'll use the userId directly as customer identifier
    // This is simpler than maintaining separate OnionPay customer records
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return { customerId: userId };
  }

  // Create payment session (equivalent to Stripe payment intent)
  async createPaymentSession(params: {
    userId: string;
    orderId?: string;
    amount: number;
    currency?: string;
    description?: string;
    metadata?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<{ session: OnionPaySession; dbPaymentIntent: DBPaymentIntent }> {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured');
    }

    const { userId, orderId, amount, currency = 'INR', description, metadata = {}, idempotencyKey } = params;

    // Get customer info
    const { customerId } = await this.createOrGetCustomer(userId);

    // Generate session ID if not provided via idempotency
    const sessionId = idempotencyKey || `onpay_${userId}_${orderId || nanoid()}_${Date.now()}`;

    // Create session via OnionPay API
    const sessionData = {
      amount: Math.round(amount * 100), // Convert to paisa (smallest unit)
      currency: currency.toUpperCase(),
      customer_id: customerId,
      order_id: orderId || sessionId,
      description: description || `FixitQuick Service Payment`,
      metadata: {
        userId,
        orderId: orderId || '',
        source: 'fixitquick',
        ...metadata,
      },
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/payment/cancel`,
    };

    try {
      const session: OnionPaySession = await this.makeRequest('/v1/checkout/sessions', 'POST', sessionData);

      // Save to database (using existing PaymentIntent structure)
      const dbPaymentIntent = await storage.createPaymentIntent({
        stripePaymentIntentId: session.id, // Using the same field for OnionPay session ID
        userId,
        orderId,
        amount: amount.toString(),
        currency: currency.toUpperCase(),
        status: session.status,
        description,
        clientSecret: session.session_token, // Store session token as client secret
        metadata: session.metadata,
      });

      console.log('✅ OnionPay session created:', session.id);
      return { session, dbPaymentIntent };
    } catch (error) {
      console.error('Failed to create OnionPay session:', error);
      throw new Error(`Failed to create payment session: ${error.message}`);
    }
  }

  // Get session status (equivalent to retrieving payment intent)
  async getSession(sessionId: string): Promise<OnionPaySession> {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured');
    }

    try {
      const session: OnionPaySession = await this.makeRequest(`/v1/checkout/sessions/${sessionId}`);
      return session;
    } catch (error) {
      console.error('Failed to get OnionPay session:', error);
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(sessionId: string): Promise<{
    success: boolean;
    session: OnionPaySession;
    order?: any;
  }> {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured');
    }

    const session = await this.getSession(sessionId);
    const dbPaymentIntent = await storage.getPaymentIntentByStripeId(sessionId);

    if (!dbPaymentIntent) {
      throw new Error('Payment session not found in database');
    }

    // Update order status if order exists
    let order = null;
    if (dbPaymentIntent.orderId) {
      order = await storage.updateOrderPaymentStatus(dbPaymentIntent.orderId, 'paid');
    }

    // Update payment intent status
    await storage.updatePaymentIntent(sessionId, {
      status: session.status,
      confirmedAt: new Date(),
    });

    return {
      success: true,
      session,
      order,
    };
  }

  // Handle payment failure
  async handlePaymentFailure(sessionId: string, reason?: string): Promise<{
    success: boolean;
    session: OnionPaySession;
    order?: any;
  }> {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured');
    }

    const session = await this.getSession(sessionId);
    const dbPaymentIntent = await storage.getPaymentIntentByStripeId(sessionId);

    if (!dbPaymentIntent) {
      throw new Error('Payment session not found in database');
    }

    // Update order status if order exists
    let order = null;
    if (dbPaymentIntent.orderId) {
      order = await storage.updateOrderPaymentStatus(dbPaymentIntent.orderId, 'payment_failed');
    }

    // Update payment intent status
    await storage.updatePaymentIntent(sessionId, {
      status: 'failed',
      failureReason: reason,
    });

    console.log(`❌ OnionPay payment failed for session ${sessionId}: ${reason || 'Unknown reason'}`);

    return {
      success: false,
      session,
      order,
    };
  }

  // Process OnionPay webhook
  async processWebhook(webhook: OnionPayWebhook): Promise<{
    success: boolean;
    message: string;
    processed: boolean;
  }> {
    try {
      console.log('📨 Processing OnionPay webhook:', webhook.event_type, webhook.session_id);

      const dbPaymentIntent = await storage.getPaymentIntentByStripeId(webhook.session_id);
      if (!dbPaymentIntent) {
        console.warn('⚠️  Webhook for unknown session:', webhook.session_id);
        return {
          success: true,
          message: 'Session not found - webhook ignored',
          processed: false,
        };
      }

      let result;
      switch (webhook.event_type) {
        case 'payment.completed':
          result = await this.handlePaymentSuccess(webhook.session_id);
          break;
        case 'payment.failed':
        case 'payment.cancelled':
          result = await this.handlePaymentFailure(webhook.session_id, webhook.event_type);
          break;
        default:
          console.warn('⚠️  Unknown OnionPay webhook event:', webhook.event_type);
          return {
            success: true,
            message: 'Unknown event type',
            processed: false,
          };
      }

      return {
        success: true,
        message: `Webhook processed successfully: ${webhook.event_type}`,
        processed: true,
      };
    } catch (error) {
      console.error('❌ OnionPay webhook processing failed:', error);
      return {
        success: false,
        message: `Webhook processing failed: ${error.message}`,
        processed: false,
      };
    }
  }

  // Verify webhook signature (basic implementation)
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.isReady()) {
      return false;
    }

    // For now, we'll implement basic verification
    // In production, OnionPay should provide proper signature verification
    console.log('🔐 OnionPay webhook signature verification (basic implementation)');
    return true; // TODO: Implement proper signature verification when OnionPay provides it
  }

  // Create refund
  async createRefund(params: {
    sessionId: string;
    amount?: number;
    reason?: string;
    idempotencyKey?: string;
  }): Promise<any> {
    if (!this.isReady()) {
      throw new Error('OnionPay not configured');
    }

    const { sessionId, amount, reason, idempotencyKey } = params;

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || `rf_${sessionId}_${amount || 'full'}_${Date.now()}`;

    const refundData = {
      session_id: sessionId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to paisa
      reason: reason || 'requested_by_customer',
      metadata: {
        source: 'fixitquick',
        processedAt: new Date().toISOString(),
        idempotencyKey: finalIdempotencyKey,
      },
    };

    try {
      const refund = await this.makeRequest('/v1/refunds', 'POST', refundData);
      console.log('✅ OnionPay refund created:', refund.id);
      return refund;
    } catch (error) {
      console.error('Failed to create OnionPay refund:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  // Payment methods management (simplified for OnionPay)
  async getUserPaymentMethods(userId: string): Promise<{
    paymentMethods: DBPaymentMethod[];
  }> {
    // For OnionPay, we'll mainly rely on the widget for payment method management
    // But we can still return saved payment methods from our database
    const paymentMethods = await storage.getUserPaymentMethods(userId);
    
    return {
      paymentMethods: paymentMethods.filter(pm => pm.isActive)
    };
  }

  // Save payment method (for future use)
  async savePaymentMethod(params: {
    userId: string;
    paymentMethodId: string;
    type: 'card' | 'upi' | 'netbanking' | 'wallet';
    nickname?: string;
    setAsDefault?: boolean;
    cardDetails?: any;
    upiId?: string;
  }): Promise<DBPaymentMethod> {
    const { userId, paymentMethodId, type, nickname, setAsDefault = false, cardDetails, upiId } = params;

    // If setting as default, update previous default
    if (setAsDefault) {
      await storage.updateUserPaymentMethodDefaults(userId, false);
    }

    // Save to database
    const dbPaymentMethod = await storage.createPaymentMethod({
      userId,
      stripePaymentMethodId: paymentMethodId, // Reuse the field for OnionPay method ID
      type,
      nickname,
      isDefault: setAsDefault,
      // Card details if provided
      ...(cardDetails && {
        cardBrand: cardDetails.brand,
        cardLast4: cardDetails.last4,
        cardExpMonth: cardDetails.expMonth,
        cardExpYear: cardDetails.expYear,
      }),
      // UPI details
      ...(upiId && { upiId }),
    });

    return dbPaymentMethod;
  }

  // Delete payment method
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const dbPaymentMethod = await storage.getPaymentMethod(paymentMethodId);
    if (!dbPaymentMethod || dbPaymentMethod.userId !== userId) {
      throw new Error('Payment method not found or access denied');
    }

    // For OnionPay, we just mark it as inactive in our database
    await storage.deletePaymentMethod(paymentMethodId);
  }

  // Get payment statistics
  async getPaymentStats(days: number = 30): Promise<{
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

    // For now, return basic stats from our database
    // In the future, we can call OnionPay API for comprehensive stats
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // This would need to be implemented in storage layer
    // For now, return mock stats
    return {
      totalPayments: 0,
      totalAmount: 0,
      successfulPayments: 0,
      failedPayments: 0,
      refundedAmount: 0,
    };
  }
}

// Export singleton instance
export const onionPayService = new OnionPayPaymentService();
export default onionPayService;