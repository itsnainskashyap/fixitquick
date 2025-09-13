import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { storage } from "./storage";
import { authMiddleware, requireRole } from "./middleware/auth";
import { firebaseAdmin, db } from "./services/firebase";
import { aiService } from "./services/ai";
import { paymentService } from "./services/payments";
import { notificationService } from "./services/notifications";

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet());
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

  // Authentication routes
  app.post('/api/v1/auth/login', async (req, res) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      
      // Create or update user in Firestore
      const userData = {
        id: uid,
        email,
        displayName,
        photoURL,
        role: 'user',
        isVerified: false,
        walletBalance: 0,
        fixiPoints: 0,
        isActive: true,
        updatedAt: new Date(),
      };

      await db.collection('users').doc(uid).set(userData, { merge: true });
      
      res.json({ success: true, user: userData });
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

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(userDoc.data());
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // AI Search routes
  app.post('/api/v1/search', authMiddleware, async (req, res) => {
    try {
      const { query, filters } = req.body;
      const results = await aiService.searchServices(query, filters);
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.post('/api/v1/ai/generate-icon', authMiddleware, async (req, res) => {
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
      const categoriesSnapshot = await db.collection('serviceCategories')
        .where('isActive', '==', true)
        .get();
      
      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  app.get('/api/v1/services', async (req, res) => {
    try {
      const { category, sortBy, priceRange } = req.query;
      let query = db.collection('services').where('isActive', '==', true);
      
      if (category && category !== 'all') {
        query = query.where('categoryId', '==', category);
      }
      
      const servicesSnapshot = await query.get();
      let services = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply price filtering
      if (priceRange && priceRange !== 'all') {
        services = services.filter(service => {
          const price = service.basePrice;
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
            case 'price-low': return a.basePrice - b.basePrice;
            case 'price-high': return b.basePrice - a.basePrice;
            case 'rating': return b.rating - a.rating;
            case 'popular': return b.totalBookings - a.totalBookings;
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
      const ordersSnapshot = await db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      
      const recentCategories = ordersSnapshot.docs.map(doc => 
        doc.data().category
      );
      
      // Get AI suggestions based on user history
      const suggestions = await aiService.suggestPersonalizedServices(recentCategories);
      
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ message: 'Failed to fetch suggestions' });
    }
  });

  // Order routes
  app.get('/api/v1/orders', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const { status } = req.query;
      
      let query = db.collection('orders').where('userId', '==', userId);
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      const ordersSnapshot = await query.orderBy('createdAt', 'desc').get();
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/v1/orders/recent', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      
      const ordersSnapshot = await db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();
      
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json(orders);
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      res.status(500).json({ message: 'Failed to fetch recent orders' });
    }
  });

  app.post('/api/v1/orders', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const orderData = {
        ...req.body,
        userId,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const orderRef = await db.collection('orders').add(orderData);
      
      // Send notification to service providers
      await notificationService.notifyProviders(orderData);
      
      res.json({ id: orderRef.id, ...orderData });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  // Wallet routes
  app.get('/api/v1/wallet/balance', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const userData = userDoc.data();
      res.json({
        balance: userData?.walletBalance || 0,
        fixiPoints: userData?.fixiPoints || 0,
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({ message: 'Failed to fetch wallet balance' });
    }
  });

  app.get('/api/v1/wallet/transactions', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      
      const transactionsSnapshot = await db.collection('walletTransactions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/v1/wallet/topup', authMiddleware, async (req, res) => {
    try {
      const userId = req.user?.uid;
      const { amount } = req.body;
      
      const paymentIntent = await paymentService.createPaymentIntent({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        metadata: {
          userId,
          type: 'wallet_topup',
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

  // Service Provider routes
  app.get('/api/v1/providers/stats/:userId', authMiddleware, requireRole(['service_provider']), async (req, res) => {
    try {
      const { userId } = req.params;
      
      const ordersSnapshot = await db.collection('orders')
        .where('serviceProviderId', '==', userId)
        .get();
      
      const orders = ordersSnapshot.docs.map(doc => doc.data());
      const completedOrders = orders.filter(order => order.status === 'completed');
      
      const stats = {
        totalEarnings: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
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
      
      const ordersSnapshot = await db.collection('orders')
        .where('serviceProviderId', '==', userId)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();
      
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
      
      const partsSnapshot = await db.collection('parts')
        .where('providerId', '==', userId)
        .get();
      
      const ordersSnapshot = await db.collection('orders')
        .where('partsProviderId', '==', userId)
        .get();
      
      const orders = ordersSnapshot.docs.map(doc => doc.data());
      const completedOrders = orders.filter(order => order.status === 'completed');
      
      const stats = {
        totalEarnings: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalOrders: orders.length,
        activeListings: partsSnapshot.docs.length,
        lowStockItems: partsSnapshot.docs.filter(doc => doc.data().stock < 10).length,
        pendingOrders: orders.filter(order => order.status === 'pending').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching parts provider stats:', error);
      res.status(500).json({ message: 'Failed to fetch parts provider stats' });
    }
  });

  app.post('/api/v1/parts-provider/parts', authMiddleware, requireRole(['parts_provider']), async (req, res) => {
    try {
      const userId = req.user?.uid;
      const partData = {
        ...req.body,
        providerId: userId,
        rating: 0,
        totalSold: 0,
        isActive: true,
        createdAt: new Date(),
      };
      
      const partRef = await db.collection('parts').add(partData);
      
      res.json({ id: partRef.id, ...partData });
    } catch (error) {
      console.error('Error adding part:', error);
      res.status(500).json({ message: 'Failed to add part' });
    }
  });

  // Admin routes
  app.get('/api/v1/admin/stats', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const [usersSnapshot, ordersSnapshot, providersSnapshot] = await Promise.all([
        db.collection('users').get(),
        db.collection('orders').get(),
        db.collection('users').where('role', 'in', ['service_provider', 'parts_provider']).get(),
      ]);
      
      const orders = ordersSnapshot.docs.map(doc => doc.data());
      const completedOrders = orders.filter(order => order.status === 'completed');
      
      const stats = {
        totalUsers: usersSnapshot.size,
        totalRevenue: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalOrders: orders.length,
        totalProviders: providersSnapshot.size,
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
      let query = db.collection('users');
      
      if (role && role !== 'all') {
        query = query.where('role', '==', role);
      }
      
      const usersSnapshot = await query.get();
      let users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (search) {
        users = users.filter(user => 
          user.displayName?.toLowerCase().includes(search.toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/v1/admin/orders', authMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const ordersSnapshot = await db.collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
