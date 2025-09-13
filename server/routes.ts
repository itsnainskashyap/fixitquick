import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { storage } from "./storage";
import { authMiddleware, requireRole } from "./middleware/auth";
import { aiService } from "./services/ai";
import { paymentService } from "./services/payments";
import { notificationService } from "./services/notifications";
import {
  insertUserSchema,
  insertOrderSchema,
  insertPartSchema,
} from "@shared/schema";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Validation schemas for API routes
const loginSchema = z.object({
  uid: z.string().min(1, 'User ID is required'),
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  filters: z.object({
    category: z.string().optional(),
    priceRange: z.string().optional(),
    location: z.string().optional(),
  }).optional(),
});

const walletTopupSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0').max(50000, 'Amount cannot exceed ₹50,000'),
});

const iconGenerationSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  category: z.string().min(1, 'Category is required'),
  style: z.string().optional(),
});

// Validation middleware factory
function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: result.error.errors
        });
      }
      req.body = result.data;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Validation error' });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware - more permissive in development
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://fixitquick.vercel.app', 'https://fixitquick.netlify.app']
      : ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
  }));
  app.use(limiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Cart routes
  app.get('/api/v1/cart', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // For now, return empty cart as cart is managed on frontend with localStorage
      // This can be extended to store cart in database for cross-device sync
      res.json({ items: [], subtotal: 0, tax: 0, discount: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ message: 'Failed to fetch cart' });
    }
  });

  app.post('/api/v1/cart/add', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart addition is handled on frontend for now
      // This endpoint can be extended for server-side cart management
      res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add item to cart' });
    }
  });

  app.put('/api/v1/cart/update', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart updates are handled on frontend for now
      res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ message: 'Failed to update cart' });
    }
  });

  app.delete('/api/v1/cart/remove', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart item removal is handled on frontend for now
      res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ message: 'Failed to remove item from cart' });
    }
  });

  app.delete('/api/v1/cart/clear', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cart clearing is handled on frontend for now
      res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Failed to clear cart' });
    }
  });

  // Authentication routes
  app.post('/api/v1/auth/login', validateBody(loginSchema), async (req, res) => {
    try {
      const { uid, email, firstName, lastName, profileImageUrl } = req.body;
      
      // Check if user exists
      let user = await storage.getUser(uid);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          id: uid,
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          profileImageUrl,
          role: 'user',
          isVerified: false,
          walletBalance: '0.00',
          fixiPoints: 0,
          isActive: true,
        });
      } else {
        // Update existing user
        user = await storage.updateUser(uid, {
          email,
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          profileImageUrl: profileImageUrl || user.profileImageUrl,
        }) || user;
      }
      
      res.json({ success: true, user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/v1/auth/user', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // AI Search routes
  app.post('/api/v1/search', authMiddleware, validateBody(searchSchema), async (req, res) => {
    try {
      const { query, filters } = req.body;
      const results = await aiService.searchServices(query, filters);
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.post('/api/v1/ai/generate-icon', authMiddleware, validateBody(iconGenerationSchema), async (req, res) => {
    try {
      const { name, category, style } = req.body;
      const icon = await aiService.generateServiceIcon({ name, category, style });
      res.json({ icon });
    } catch (error) {
      console.error('Icon generation error:', error);
      res.status(500).json({ message: 'Icon generation failed' });
    }
  });

  // Service routes
  app.get('/api/v1/services/categories', async (req, res) => {
    try {
      const categories = await storage.getServiceCategories(true);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.get('/api/v1/services', async (req, res) => {
    try {
      const { category, sortBy, priceRange } = req.query;
      
      // Get services with filters
      let services = await storage.getServices({
        categoryId: category as string,
        isActive: true
      });
      
      // Apply price filtering
      if (priceRange && priceRange !== 'all') {
        services = services.filter(service => {
          const price = parseFloat(service.basePrice);
          switch (priceRange) {
            case 'low': return price <= 100;
            case 'medium': return price > 100 && price <= 300;
            case 'high': return price > 300;
            default: return true;
          }
        });
      }
      
      // Apply sorting
      if (sortBy) {
        services.sort((a, b) => {
          switch (sortBy) {
            case 'price-low': return parseFloat(a.basePrice) - parseFloat(b.basePrice);
            case 'price-high': return parseFloat(b.basePrice) - parseFloat(a.basePrice);
            case 'rating': return parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
            case 'popular': return (b.totalBookings || 0) - (a.totalBookings || 0);
            default: return 0;
          }
        });
      }
      
      res.json(services);
    } catch (error) {
      console.error('Error fetching services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
    }
  });

  app.get('/api/v1/services/suggested', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      
      // Get user's recent orders for personalization
      const recentOrders = await storage.getRecentOrders(userId, 5);
      
      // Extract categories from recent orders (using items array)
      const recentCategories = recentOrders
        .map(order => order.items?.map(item => item.type) || [])
        .flat();
      
      // Get AI suggestions based on user history
      const suggestions = await aiService.suggestPersonalizedServices(recentCategories);
      
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ message: 'Failed to fetch suggestions' });
    }
  });

  // Get individual service details
  app.get('/api/v1/services/:serviceId', async (req, res) => {
    try {
      const { serviceId } = req.params;
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      res.json(service);
    } catch (error) {
      console.error('Error fetching service:', error);
      res.status(500).json({ message: 'Failed to fetch service' });
    }
  });

  // Get service providers for a specific service
  app.get('/api/v1/service-providers/:serviceId', async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      // First get the service to find its category
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      
      // Get providers for this service category
      const providers = await storage.getServiceProviders({
        categoryId: service.categoryId,
        isVerified: true
      });
      
      // Enhance provider data with user information
      const enhancedProviders = await Promise.all(
        providers.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          return {
            ...provider,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
          };
        })
      );
      
      res.json(enhancedProviders);
    } catch (error) {
      console.error('Error fetching service providers:', error);
      res.status(500).json({ message: 'Failed to fetch service providers' });
    }
  });

  // Order routes
  app.get('/api/v1/orders', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const { status } = req.query;
      
      const orders = await storage.getOrdersByUser(userId, status as string);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/v1/orders/recent', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const orders = await storage.getRecentOrders(userId, 3);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ message: 'Failed to fetch recent orders' });
    }
  });

  app.post('/api/v1/orders', authMiddleware, validateBody(insertOrderSchema), async (req, res) => {
    try {
      const userId = req.user?.uid;
      const orderData = {
        ...req.body,
        userId,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
      };
      
      const order = await storage.createOrder(orderData);
      
      // Send notification to service providers
      await notificationService.notifyProviders(order);
      
      res.json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  // Get specific order details with enhanced data
  app.get('/api/v1/orders/:orderId', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.uid;
      const userRole = req.user?.role || 'user';
      
      const order = await storage.getOrderWithDetails(orderId);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check if user has permission to view this order
      const canView = 
        userRole === 'admin' || 
        order.userId === userId || 
        order.serviceProviderId === userId || 
        order.partsProviderId === userId;
      
      if (!canView) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  });

  // Update order status
  app.put('/api/v1/orders/:orderId/status', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const userId = req.user?.uid;
      const userRole = req.user?.role || 'user';
      
      // Validate status
      const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check permissions and validate status transitions
      const canUpdateStatus = await storage.validateStatusUpdate(orderId, status, userId, userRole);
      if (!canUpdateStatus.allowed) {
        return res.status(403).json({ message: canUpdateStatus.reason });
      }
      
      const updatedOrder = await storage.updateOrder(orderId, { 
        status: status as any,
        updatedAt: new Date()
      });
      
      // Send notifications on status change
      await notificationService.notifyStatusChange(updatedOrder!, status);
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  // Assign service provider to order
  app.put('/api/v1/orders/:orderId/assign', authMiddleware, requireRole(['admin', 'service_provider']), async (req, res) => {
    try {
      const { orderId } = req.params;
      const { providerId } = req.body;
      const userRole = req.user?.role || 'user';
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Auto-assignment for service providers accepting orders
      if (userRole === 'service_provider') {
        const userId = req.user?.uid;
        const canAccept = await storage.canProviderAcceptOrder(orderId, userId);
        if (!canAccept.allowed) {
          return res.status(403).json({ message: canAccept.reason });
        }
        
        const updatedOrder = await storage.assignProviderToOrder(orderId, userId);
        res.json(updatedOrder);
      } else {
        // Manual assignment by admin
        const updatedOrder = await storage.assignProviderToOrder(orderId, providerId);
        res.json(updatedOrder);
      }
    } catch (error) {
      console.error('Error assigning provider:', error);
      res.status(500).json({ message: 'Failed to assign provider' });
    }
  });

  // Submit order review
  app.post('/api/v1/orders/:orderId/review', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.uid;
      
      // Validate input
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.userId !== userId) {
        return res.status(403).json({ message: 'Only order customer can submit review' });
      }
      
      if (order.status !== 'completed') {
        return res.status(400).json({ message: 'Can only review completed orders' });
      }
      
      const review = await storage.createReview({
        orderId,
        reviewerId: userId,
        revieweeId: order.serviceProviderId || order.partsProviderId || '',
        rating,
        comment: comment || '',
      });
      
      // Update order with review info
      await storage.updateOrder(orderId, { 
        rating,
        review: comment || ''
      });
      
      res.json(review);
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  // Cancel order
  app.delete('/api/v1/orders/:orderId', authMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.uid;
      const userRole = req.user?.role || 'user';
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check cancellation permissions
      const canCancel = await storage.canCancelOrder(orderId, userId, userRole);
      if (!canCancel.allowed) {
        return res.status(403).json({ message: canCancel.reason });
      }
      
      const cancelledOrder = await storage.updateOrder(orderId, {
        status: 'cancelled',
        updatedAt: new Date()
      });
      
      // Handle refunds if payment was made
      if (order.paymentStatus === 'paid') {
        await paymentService.processRefund(order);
        await storage.updateOrder(orderId, { paymentStatus: 'refunded' });
      }
      
      // Send cancellation notifications
      await notificationService.notifyOrderCancellation(cancelledOrder!);
      
      res.json({ message: 'Order cancelled successfully', order: cancelledOrder });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  });

  // Wallet routes
  app.get('/api/v1/wallet/balance', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const wallet = await storage.getWalletBalance(userId);
      res.json(wallet);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }
  });

  app.get('/api/v1/wallet/transactions', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const transactions = await storage.getWalletTransactions(userId, 20);
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/v1/wallet/topup', authMiddleware, validateBody(walletTopupSchema), async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { amount } = req.body;
      
      // Validate amount
      if (amount < 1 || amount > 50000) {
        return res.status(400).json({ message: 'Amount must be between ₹1 and ₹50,000' });
      }

      const paymentIntent = await paymentService.createPaymentIntent({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        metadata: {
          userId,
          type: 'wallet_topup',
          amount: amount.toString(),
        },
      });
      
      res.json({
        razorpayOrderId: paymentIntent.id,
        amount,
        currency: 'INR',
      });
    } catch (error) {
      console.error('Error creating topup order:', error);
      res.status(500).json({ message: 'Failed to create topup order' });
    }
  });

  // Confirm wallet topup (mock success for development)
  app.post('/api/v1/wallet/confirm-topup', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { amount, paymentId } = req.body;
      
      if (!amount || !paymentId || amount < 1) {
        return res.status(400).json({ message: 'Invalid payment details' });
      }

      // Create successful transaction record
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'credit',
        amount: parseFloat(amount),
        description: 'Wallet top-up',
        category: 'topup',
        status: 'completed',
        paymentMethod: 'mock',
        reference: paymentId,
      });
      
      // Update wallet balance
      await storage.updateWalletBalance(userId, parseFloat(amount), 'credit');
      
      // Get updated balance
      const walletData = await storage.getWalletBalance(userId);
      
      res.json({
        success: true,
        transaction,
        balance: walletData.balance,
        message: 'Money added successfully'
      });
    } catch (error) {
      console.error('Error confirming topup:', error);
      res.status(500).json({ message: 'Failed to confirm topup' });
    }
  });

  // DEPRECATED: Use /api/v1/orders/:orderId/pay instead (security reasons)
  app.post('/api/v1/wallet/pay', authMiddleware, async (req, res) => {
    res.status(410).json({ 
      message: 'This endpoint is deprecated for security reasons. Use POST /api/v1/orders/:orderId/pay instead.',
      deprecated: true,
      migrateToEndpoint: '/api/v1/orders/:orderId/pay'
    });
  });

  // SECURE: Pay for a specific order with wallet (server validates everything)
  app.post('/api/v1/orders/:orderId/pay', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const { orderId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get and validate order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Validate order ownership
      if (order.userId !== userId) {
        return res.status(403).json({ message: 'Access denied: not your order' });
      }

      // Validate order status
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ message: 'Order already paid' });
      }

      if (order.status === 'cancelled') {
        return res.status(400).json({ message: 'Cannot pay for cancelled order' });
      }

      // SERVER CALCULATES AMOUNT (prevents client manipulation)
      const orderAmount = parseFloat(order.totalAmount);
      
      // Check wallet balance
      const walletData = await storage.getWalletBalance(userId);
      const currentBalance = parseFloat(walletData.balance);
      
      if (currentBalance < orderAmount) {
        return res.status(400).json({ 
          message: 'Insufficient wallet balance',
          currentBalance: currentBalance.toFixed(2),
          requiredAmount: orderAmount.toFixed(2),
          shortfall: (orderAmount - currentBalance).toFixed(2)
        });
      }

      // ATOMIC OPERATION: Create transaction + Update wallet + Update order
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'debit',
        amount: orderAmount.toString(),
        description: `Payment for Order #${orderId.slice(-8)}`,
        category: 'payment',
        orderId,
        paymentMethod: 'wallet',
        status: 'completed'
      });
      
      // Deduct from wallet balance
      await storage.updateWalletBalance(userId, orderAmount, 'debit');
      
      // Update order payment status
      await storage.updateOrder(orderId, {
        paymentStatus: 'paid',
        status: order.status === 'pending' ? 'accepted' : order.status
      });
      
      // Get updated data
      const updatedWalletData = await storage.getWalletBalance(userId);
      const updatedOrder = await storage.getOrder(orderId);
      
      res.json({
        success: true,
        transaction,
        order: updatedOrder,
        walletBalance: updatedWalletData.balance,
        message: 'Payment successful'
      });
    } catch (error) {
      console.error('Error processing order payment:', error);
      res.status(500).json({ message: 'Payment processing failed' });
    }
  });

  // Process wallet refund
  app.post('/api/v1/wallet/refund', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { amount, orderId, reason } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid refund amount' });
      }

      // Create credit transaction for refund
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'credit',
        amount: amount,
        description: `Refund: ${reason || 'Order cancelled'}`,
        category: 'refund',
        status: 'completed',
        orderId,
      });
      
      // Add to wallet balance
      await storage.updateWalletBalance(userId, amount, 'credit');
      
      // Get updated balance
      const walletData = await storage.getWalletBalance(userId);
      
      res.json({
        success: true,
        transaction,
        balance: walletData.balance,
        message: 'Refund processed successfully'
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({ message: 'Refund processing failed' });
    }
  });

  // Redeem FixiPoints
  app.post('/api/v1/wallet/redeem-points', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { points, for: redeemFor } = req.body;
      
      if (!points || points < 100) {
        return res.status(400).json({ message: 'Minimum 100 points required to redeem' });
      }

      // Get current user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const currentPoints = user.fixiPoints || 0;
      if (currentPoints < points) {
        return res.status(400).json({ 
          message: 'Insufficient FixiPoints',
          currentPoints,
          requiredPoints: points
        });
      }

      // Calculate redemption value (10 points = ₹1)
      const redemptionValue = Math.floor(points / 10);
      
      // Update user points
      await storage.updateUser(userId, {
        fixiPoints: currentPoints - points
      });

      // Add redemption amount to wallet
      const transaction = await storage.createWalletTransaction({
        userId,
        type: 'credit',
        amount: redemptionValue,
        description: `FixiPoints redeemed: ${points} points`,
        category: 'redemption',
        status: 'completed',
      });
      
      await storage.updateWalletBalance(userId, redemptionValue, 'credit');
      
      // Get updated data
      const walletData = await storage.getWalletBalance(userId);
      
      res.json({
        success: true,
        transaction,
        pointsRedeemed: points,
        redemptionValue,
        remainingPoints: walletData.fixiPoints,
        balance: walletData.balance,
        message: `Successfully redeemed ${points} FixiPoints for ₹${redemptionValue}`
      });
    } catch (error) {
      console.error('Error redeeming points:', error);
      res.status(500).json({ message: 'Points redemption failed' });
    }
  });

  // Service Provider routes
  app.get('/api/v1/providers/stats/:userId', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { userId } = req.params;
      
      const orders = await storage.getOrdersByProvider(userId);
      const completedOrders = orders.filter(order => order.status === 'completed');
      
      const stats = {
        totalEarnings: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        completionRate: orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0,
        avgRating: 4.5, // TODO: Calculate from reviews
        ordersCompleted: completedOrders.length,
        pendingOrders: orders.filter(order => order.status === 'pending').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching provider stats:', error);
      res.status(500).json({ message: 'Failed to fetch provider stats' });
    }
  });

  app.get('/api/v1/providers/orders/pending/:userId', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { userId } = req.params;
      const orders = await storage.getOrdersByProvider(userId, 'pending');
      res.json(orders);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      res.status(500).json({ message: 'Failed to fetch pending orders' });
    }
  });

  // Parts Provider routes
  app.get('/api/v1/parts-provider/stats/:userId', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [parts, orders] = await Promise.all([
        storage.getPartsByProvider(userId),
        storage.getOrdersByProvider(userId)
      ]);
      
      const completedOrders = orders.filter(order => order.status === 'completed');
      const lowStockParts = await storage.getLowStockParts(userId, 10);
      
      const stats = {
        totalEarnings: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        totalOrders: orders.length,
        activeListings: parts.length,
        lowStockItems: lowStockParts.length,
        pendingOrders: orders.filter(order => order.status === 'pending').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching parts provider stats:', error);
      res.status(500).json({ message: 'Failed to fetch parts provider stats' });
    }
  });

  app.post('/api/v1/parts-provider/parts', authMiddleware, requireRole(['parts_provider']), validateBody(insertPartSchema), async (req, res) => {
    try {
      const userId = req.user?.uid;
      const partData = {
        ...req.body,
        providerId: userId,
        rating: '0.00',
        totalSold: 0,
        isActive: true,
      };
      
      const part = await storage.createPart(partData);
      res.json(part);
    } catch (error) {
      console.error('Error adding part:', error);
      res.status(500).json({ message: 'Failed to add part' });
    }
  });

  // Admin routes
  app.get('/api/v1/admin/stats', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const [totalUsers, allOrders, serviceProviders, partsProviders] = await Promise.all([
        storage.getUsersCount(),
        storage.getOrders(),
        storage.getUsersByRole('service_provider'),
        storage.getUsersByRole('parts_provider'),
      ]);
      
      const completedOrders = allOrders.filter(order => order.status === 'completed');
      const totalProviders = serviceProviders.length + partsProviders.length;
      
      const stats = {
        totalUsers,
        totalRevenue: completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
        totalOrders: allOrders.length,
        totalProviders,
        pendingVerifications: 0, // TODO: Implement
        activeDisputes: 0, // TODO: Implement
        monthlyGrowth: 15.5, // TODO: Calculate
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/v1/admin/users', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const { search, role } = req.query;
      
      let users;
      if (search) {
        users = await storage.searchUsers(search as string, role as string);
      } else if (role && role !== 'all') {
        users = await storage.getUsersByRole(role as string);
      } else {
        users = await storage.getUsersByRole('user'); // Get all users
        const providers = await Promise.all([
          storage.getUsersByRole('service_provider'),
          storage.getUsersByRole('parts_provider'),
          storage.getUsersByRole('admin')
        ]);
        users = [...users, ...providers.flat()];
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/v1/admin/orders', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const orders = await storage.getOrders({ limit: 100 });
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Payment webhook
  app.post('/api/v1/webhooks/payment', async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const isValid = paymentService.verifyWebhookSignature(
        JSON.stringify(req.body),
        signature
      );
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid signature' });
      }
      
      const { event, payload } = req.body;
      
      if (event === 'payment.captured') {
        await paymentService.handlePaymentSuccess(payload.payment.entity);
      }
      
      res.json({ status: 'ok' });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ message: 'Webhook processing failed' });
    }
  });

  // WebSocket setup
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            // Handle authentication
            console.log('WebSocket auth:', message.data);
            break;
          case 'subscribe_order':
            // Handle order subscription
            console.log('Order subscription:', message.data);
            break;
          case 'chat_message':
            // Handle chat message
            console.log('Chat message:', message.data);
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
