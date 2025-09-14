// Mock Payment Service - stub for development without API keys
console.log('Using Payment service stub - no real payment gateway connection');

interface PaymentIntent {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

interface PaymentWebhook {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
}

class PaymentService {
  constructor() {
    console.log('Mock Payment Service initialized');
  }

  async createPaymentIntent(paymentData: PaymentIntent) {
    console.log('Mock: Creating payment intent for amount:', paymentData.amount);
    
    // Mock payment order
    const mockOrder = {
      id: 'order_mock_' + Date.now(),
      entity: 'order',
      amount: paymentData.amount,
      currency: paymentData.currency,
      receipt: `receipt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      notes: paymentData.metadata || {},
      created_at: Math.floor(Date.now() / 1000)
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockOrder;
  }

  async capturePayment(paymentId: string, amount: number) {
    console.log('Mock: Capturing payment:', paymentId, 'amount:', amount);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      id: paymentId,
      entity: 'payment',
      amount: amount,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  async refundPayment(paymentId: string, amount?: number) {
    console.log('Mock: Refunding payment:', paymentId, 'amount:', amount);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      id: 'rfnd_mock_' + Date.now(),
      entity: 'refund',
      amount: amount,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    console.log('Mock: Verifying webhook signature');
    // In mock mode, always return true
    return true;
  }

  async processWebhook(webhook: PaymentWebhook) {
    console.log('Mock: Processing webhook:', webhook);
    
    // Mock webhook processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true,
      message: 'Webhook processed successfully',
      webhookId: webhook.id
    };
  }

  async createSubscription(planId: string, customerId: string) {
    console.log('Mock: Creating subscription:', planId, 'for customer:', customerId);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      id: 'sub_mock_' + Date.now(),
      entity: 'subscription',
      plan_id: planId,
      customer_id: customerId,
      status: 'active',
      current_start: Math.floor(Date.now() / 1000),
      current_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  async cancelSubscription(subscriptionId: string) {
    console.log('Mock: Cancelling subscription:', subscriptionId);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      id: subscriptionId,
      entity: 'subscription',
      status: 'cancelled',
      cancelled_at: Math.floor(Date.now() / 1000)
    };
  }

  async getPaymentDetails(paymentId: string) {
    console.log('Mock: Getting payment details for:', paymentId);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      id: paymentId,
      entity: 'payment',
      amount: 1000, // Mock amount
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      description: 'Mock payment for FixitQuick service',
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  // Wallet operations
  async addMoneyToWallet(userId: string, amount: number) {
    console.log('Mock: Adding money to wallet:', userId, amount);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      success: true,
      transactionId: 'txn_mock_' + Date.now(),
      userId,
      amount,
      type: 'credit',
      balance: 5000 // Mock balance
    };
  }

  async deductFromWallet(userId: string, amount: number) {
    console.log('Mock: Deducting from wallet:', userId, amount);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      transactionId: 'txn_mock_' + Date.now(),
      userId,
      amount,
      type: 'debit',
      balance: 4000 // Mock balance
    };
  }

  async getWalletBalance(userId: string) {
    console.log('Mock: Getting wallet balance for:', userId);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      userId,
      balance: 4500,
      currency: 'INR',
      lastUpdated: new Date()
    };
  }

  async processRefund(orderId: string, amount: number, reason?: string) {
    console.log('Mock: Processing refund for order:', orderId, 'amount:', amount, 'reason:', reason);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: 'rfnd_mock_' + Date.now(),
      orderId,
      amount,
      status: 'processed',
      reason: reason || 'Customer request',
      processedAt: new Date(),
      success: true
    };
  }

  async handlePaymentSuccess(paymentData: any) {
    console.log('Mock: Handling payment success:', paymentData);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      paymentId: paymentData.paymentId || 'pay_mock_' + Date.now(),
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      status: 'captured',
      capturedAt: new Date()
    };
  }
}

export const paymentService = new PaymentService();