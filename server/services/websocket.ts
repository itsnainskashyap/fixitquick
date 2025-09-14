import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { auth, db } from '../services/firebase';
import crypto from 'crypto';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  subscribedRooms?: Set<string>;
  lastPing?: number;
  messageCount?: number;
  lastMessageTime?: number;
  connectionTime?: number;
}

interface SocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  messageId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private connections = new Map<string, AuthenticatedWebSocket>();
  private rooms = new Map<string, Set<string>>(); // roomId -> Set of userId
  private userConnections = new Map<string, string>(); // userId -> connectionId
  private pingInterval: NodeJS.Timeout;
  private rateLimitConfig = {
    maxMessagesPerMinute: 60,
    maxConnectionsPerIP: 5,
    messageTimeWindow: 60000, // 1 minute
    maxMessageSize: 16384 // 16KB
  };
  private ipConnections = new Map<string, number>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupEventHandlers() {
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: any) {
    const connectionId = this.generateConnectionId();
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    
    // Rate limit connections per IP
    const currentConnections = this.ipConnections.get(clientIP) || 0;
    if (currentConnections >= this.rateLimitConfig.maxConnectionsPerIP) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      ws.close(1008, 'Too many connections from this IP');
      return;
    }
    
    ws.subscribedRooms = new Set();
    ws.lastPing = Date.now();
    ws.messageCount = 0;
    ws.lastMessageTime = Date.now();
    ws.connectionTime = Date.now();
    
    this.ipConnections.set(clientIP, currentConnections + 1);
    console.log(`WebSocket connection established: ${connectionId} from IP: ${clientIP}`);
    this.connections.set(connectionId, ws);

    ws.on('message', (data) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleDisconnection(connectionId, clientIP));
    ws.on('error', (error) => this.handleError(connectionId, error));
    ws.on('pong', () => { ws.lastPing = Date.now(); });

    // Send connection acknowledgment - require authentication within 30 seconds
    this.sendToConnection(connectionId, {
      type: 'connection_established',
      data: { 
        connectionId, 
        timestamp: Date.now(),
        authRequired: true,
        authTimeout: 30000
      }
    });
    
    // Close connection if not authenticated within 30 seconds
    setTimeout(() => {
      const connection = this.connections.get(connectionId);
      if (connection && !connection.isAuthenticated) {
        console.log(`Closing unauthenticated connection: ${connectionId}`);
        connection.close(1008, 'Authentication timeout');
      }
    }, 30000);
  }

  private async handleMessage(connectionId: string, data: any) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    // Input validation - check message size
    if (data.length > this.rateLimitConfig.maxMessageSize) {
      console.warn(`Message too large from connection ${connectionId}: ${data.length} bytes`);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Message too large' }
      });
      return;
    }

    // Rate limiting - check message frequency
    const now = Date.now();
    if (!ws.messageCount) ws.messageCount = 0;
    if (!ws.lastMessageTime) ws.lastMessageTime = now;

    // Reset counter if time window passed
    if (now - ws.lastMessageTime > this.rateLimitConfig.messageTimeWindow) {
      ws.messageCount = 0;
      ws.lastMessageTime = now;
    }

    ws.messageCount++;
    if (ws.messageCount > this.rateLimitConfig.maxMessagesPerMinute) {
      console.warn(`Rate limit exceeded for connection ${connectionId}`);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Rate limit exceeded. Please slow down.' }
      });
      // Close connection for severe abuse
      if (ws.messageCount > this.rateLimitConfig.maxMessagesPerMinute * 2) {
        ws.close(1008, 'Rate limit violation');
      }
      return;
    }

    try {
      const message: SocketMessage = JSON.parse(data.toString());
      
      // Validate message structure
      if (!message.type || typeof message.type !== 'string') {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid message structure' }
        });
        return;
      }

      // Only allow auth messages for unauthenticated connections
      if (!ws.isAuthenticated && message.type !== 'auth' && message.type !== 'ping') {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Authentication required' }
        });
        return;
      }

      switch (message.type) {
        case 'auth':
          await this.handleAuthentication(connectionId, message.data);
          break;
        case 'join_room':
          await this.handleJoinRoom(connectionId, message.data);
          break;
        case 'leave_room':
          await this.handleLeaveRoom(connectionId, message.data);
          break;
        case 'chat_message':
          await this.handleChatMessage(connectionId, message.data);
          break;
        case 'typing_indicator':
          await this.handleTypingIndicator(connectionId, message.data);
          break;
        case 'order_status_update':
          await this.handleOrderStatusUpdate(connectionId, message.data);
          break;
        case 'provider_location':
          await this.handleProviderLocation(connectionId, message.data);
          break;
        case 'subscribe_order':
          await this.handleOrderSubscription(connectionId, message.data);
          break;
        case 'unsubscribe_order':
          await this.handleOrderUnsubscription(connectionId, message.data);
          break;
        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong', data: { timestamp: Date.now() } });
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
          this.sendToConnection(connectionId, {
            type: 'error',
            data: { message: 'Unknown message type', type: message.type }
          });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Invalid message format' }
      });
    }
  }

  private async handleAuthentication(connectionId: string, authData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    try {
      // Validate input data
      if (!authData || !authData.token) {
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          data: { message: 'Token required' }
        });
        return;
      }

      const { token } = authData;
      
      // SECURITY FIX: Properly validate JWT token
      let decodedPayload;
      try {
        const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-for-development';
        decodedPayload = jwt.verify(token, sessionSecret) as any;
      } catch (tokenError) {
        console.error('JWT token verification failed:', tokenError);
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          data: { message: 'Invalid or expired token' }
        });
        ws.close(1008, 'Invalid authentication');
        return;
      }

      // Validate token expiration
      if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          data: { message: 'Token expired' }
        });
        ws.close(1008, 'Token expired');
        return;
      }

      // Get user data from storage using JWT payload
      let userData;
      try {
        // Use PostgreSQL storage as primary source
        const user = await storage.getUser(decodedPayload.userId);
        if (!user) {
          this.sendToConnection(connectionId, {
            type: 'auth_failed',
            data: { message: 'User not found' }
          });
          ws.close(1008, 'User not found');
          return;
        }
        userData = user;
      } catch (dbError) {
        console.error('User lookup failed:', dbError);
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          data: { message: 'User verification failed' }
        });
        ws.close(1008, 'User verification failed');
        return;
      }

      // Check if user account is active
      if (!userData.isActive) {
        this.sendToConnection(connectionId, {
          type: 'auth_failed',
          data: { message: 'Account suspended' }
        });
        ws.close(1008, 'Account suspended');
        return;
      }

      // Set authenticated connection properties from JWT payload (not client)
      const userId = decodedPayload.userId;
      ws.userId = userId;
      ws.userRole = decodedPayload.role;
      ws.isAuthenticated = true;

      // Close any existing connections for this user (prevent multiple sessions)
      const oldConnectionId = this.userConnections.get(userId);
      if (oldConnectionId && this.connections.has(oldConnectionId)) {
        const oldWs = this.connections.get(oldConnectionId);
        if (oldWs && oldWs !== ws) {
          console.log(`Closing previous connection for user ${userId}`);
          oldWs.close(1000, 'New connection established');
        }
      }
      
      this.userConnections.set(userId, connectionId);

      // Send authentication success
      this.sendToConnection(connectionId, {
        type: 'auth_success',
        data: { 
          userId, 
          role: decodedPayload.role, 
          timestamp: Date.now(),
          email: decodedPayload.email
        }
      });

      // Auto-subscribe to user-specific notifications
      await this.joinRoom(`user:${userId}`, connectionId);
      
      // Auto-subscribe to role-specific rooms (with validation)
      const userRole = userData?.role || 'user';
      if (userRole === 'service_provider' || userRole === 'parts_provider') {
        await this.joinRoom(`providers`, connectionId);
      }
      
      if (userRole === 'admin') {
        await this.joinRoom(`admin`, connectionId);
      }

      console.log(`User ${userId} (${userRole}) authenticated on connection ${connectionId}`);
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendToConnection(connectionId, {
        type: 'auth_failed',
        data: { message: 'Authentication failed' }
      });
      ws.close(1008, 'Authentication failed');
    }
  }

  private async handleJoinRoom(connectionId: string, roomData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws || !ws.isAuthenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required' }
      });
      return;
    }

    const { roomId } = roomData;
    
    // Validate room access
    const hasAccess = await this.validateRoomAccess(ws.userId!, ws.userRole!, roomId);
    if (!hasAccess) {
      this.sendToConnection(connectionId, {
        type: 'room_access_denied',
        data: { roomId, message: 'Access denied to this room' }
      });
      return;
    }

    await this.joinRoom(roomId, connectionId);
    
    this.sendToConnection(connectionId, {
      type: 'room_joined',
      data: { roomId, timestamp: Date.now() }
    });
  }

  private async handleLeaveRoom(connectionId: string, roomData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    const { roomId } = roomData;
    await this.leaveRoom(roomId, connectionId);
    
    this.sendToConnection(connectionId, {
      type: 'room_left',
      data: { roomId, timestamp: Date.now() }
    });
  }

  private async handleChatMessage(connectionId: string, messageData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws || !ws.isAuthenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required' }
      });
      return;
    }

    try {
      // Input validation
      if (!messageData || !messageData.orderId || !messageData.message) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid message data' }
        });
        return;
      }

      const { orderId, message, messageType = 'text', attachments = [] } = messageData;
      const senderId = ws.userId!;

      // Validate message content
      if (typeof message !== 'string' || message.length === 0 || message.length > 4000) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Message must be 1-4000 characters' }
        });
        return;
      }

      // Validate orderId format (basic UUID check)
      if (typeof orderId !== 'string' || orderId.length < 10) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid order ID' }
        });
        return;
      }

      // SECURITY: Strict authorization check
      const hasAccess = await this.validateOrderAccess(senderId, orderId, 'chat');
      if (!hasAccess) {
        console.warn(`Unauthorized chat attempt: User ${senderId} trying to access order ${orderId}`);
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Access denied to this order' }
        });
        return;
      }

      // Get order details for proper chat routing
      const order = await storage.getOrder(orderId);
      if (!order) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Order not found' }
        });
        return;
      }

      // Determine receiver
      let receiverId: string;
      if (order.userId === senderId) {
        receiverId = order.serviceProviderId || order.partsProviderId || '';
      } else {
        receiverId = order.userId;
      }

      // Save message to database
      const chatMessage = await storage.createChatMessage({
        orderId,
        senderId,
        receiverId,
        message,
        messageType,
        attachments,
        isRead: false
      });

      // Broadcast to order room
      const orderRoom = `order:${orderId}`;
      this.broadcastToRoom(orderRoom, {
        type: 'chat_message',
        data: {
          ...chatMessage,
          senderName: await this.getUserName(senderId),
          timestamp: chatMessage.createdAt
        }
      });

      // Send notification to receiver if not in room
      if (!this.isUserInRoom(receiverId, orderRoom)) {
        await this.sendNotificationToUser(receiverId, {
          title: 'New Message',
          body: `New message from ${await this.getUserName(senderId)}`,
          type: 'order',
          data: { orderId, messageId: chatMessage.id }
        });
      }

    } catch (error) {
      console.error('Chat message error:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Failed to send message' }
      });
    }
  }

  private async handleTypingIndicator(connectionId: string, typingData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws || !ws.isAuthenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required' }
      });
      return;
    }

    try {
      // Input validation
      if (!typingData || !typingData.orderId || typeof typingData.isTyping !== 'boolean') {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid typing indicator data' }
        });
        return;
      }

      const { orderId, isTyping } = typingData;
      const userId = ws.userId!;

      // SECURITY: Validate user can access this order
      const hasAccess = await this.validateOrderAccess(userId, orderId, 'chat');
      if (!hasAccess) {
        console.warn(`Unauthorized typing indicator: User ${userId} for order ${orderId}`);
        return; // Silently ignore unauthorized typing indicators
      }

      // Broadcast typing indicator to order room (excluding sender)
      const orderRoom = `order:${orderId}`;
      this.broadcastToRoom(orderRoom, {
        type: 'typing_indicator',
        data: {
          orderId,
          userId,
          isTyping,
          userName: await this.getUserName(userId),
          timestamp: Date.now()
        }
      }, [connectionId]); // Exclude sender
    } catch (error) {
      console.error('Typing indicator error:', error);
      // Don't send error response for typing indicators to avoid spam
    }
  }

  private async handleOrderStatusUpdate(connectionId: string, statusData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws || !ws.isAuthenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required' }
      });
      return;
    }

    try {
      // Input validation
      if (!statusData || !statusData.orderId || !statusData.status) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Order ID and status required' }
        });
        return;
      }

      const { orderId, status, notes } = statusData;
      const userId = ws.userId!;

      // Validate status value
      const validStatuses = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid status value' }
        });
        return;
      }

      // SECURITY: Strict authorization - use dedicated validation
      const hasAccess = await this.validateOrderAccess(userId, orderId, 'update');
      if (!hasAccess) {
        console.warn(`Unauthorized status update attempt: User ${userId} trying to update order ${orderId}`);
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Not authorized to update this order' }
        });
        return;
      }

      // Additional role-based check
      const userRole = ws.userRole!;
      if (!['service_provider', 'parts_provider', 'admin'].includes(userRole)) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Insufficient permissions to update order status' }
        });
        return;
      }

      // Validate business logic - use storage validation if available
      const validationResult = await storage.validateStatusUpdate(orderId, status, userId, userRole);
      if (!validationResult.allowed) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: validationResult.reason || 'Status update not allowed' }
        });
        return;
      }

      const updatedOrder = await storage.updateOrder(orderId, { 
        status, 
        updatedAt: new Date(),
        notes: notes || undefined 
      });

      if (updatedOrder) {
        // Broadcast to order room and user-specific rooms
        const orderRoom = `order:${orderId}`;
        const userRoom = `user:${updatedOrder.userId}`;
        
        const updateData = {
          type: 'order_status_updated',
          data: {
            orderId,
            status,
            notes,
            updatedAt: updatedOrder.updatedAt,
            providerName: await this.getUserName(userId)
          }
        };

        this.broadcastToRoom(orderRoom, updateData);
        this.broadcastToRoom(userRoom, updateData);

        // Send push notification to customer
        await this.sendNotificationToUser(updatedOrder.userId, {
          title: 'Order Updated',
          body: `Your order status has been updated to ${status}`,
          type: 'order',
          data: { orderId, status }
        });

        console.log(`Order ${orderId} status updated to ${status} by user ${userId}`);
      } else {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Failed to update order' }
        });
      }
    } catch (error) {
      console.error('Order status update error:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Failed to update order status' }
      });
    }
  }

  private async handleProviderLocation(connectionId: string, locationData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws || !ws.isAuthenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required' }
      });
      return;
    }

    try {
      // Input validation
      if (!locationData || !locationData.orderId || 
          typeof locationData.latitude !== 'number' || 
          typeof locationData.longitude !== 'number') {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid location data' }
        });
        return;
      }

      const { orderId, latitude, longitude, accuracy } = locationData;
      const providerId = ws.userId!;
      const userRole = ws.userRole!;

      // Only providers can update location
      if (!['service_provider', 'parts_provider'].includes(userRole)) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Only providers can share location' }
        });
        return;
      }

      // Validate coordinates are reasonable
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid coordinates' }
        });
        return;
      }

      // SECURITY: Strict authorization - provider must be assigned to order
      const hasAccess = await this.validateOrderAccess(providerId, orderId, 'update');
      if (!hasAccess) {
        console.warn(`Unauthorized location update: Provider ${providerId} not assigned to order ${orderId}`);
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Not authorized for this order' }
        });
        return;
      }

      // Get order to verify provider assignment
      const order = await storage.getOrder(orderId);
      if (!order) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Order not found' }
        });
        return;
      }

      // Double-check provider is assigned to this specific order
      if (order.serviceProviderId !== providerId && order.partsProviderId !== providerId) {
        console.warn(`Provider ${providerId} not assigned to order ${orderId}`);
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Provider not assigned to this order' }
        });
        return;
      }

      // Broadcast location update to customer
      const userRoom = `user:${order.userId}`;
      const orderRoom = `order:${orderId}`;
      
      const locationUpdate = {
        type: 'provider_location_update',
        data: {
          orderId,
          providerId,
          latitude,
          longitude,
          accuracy: accuracy || null,
          timestamp: Date.now(),
          providerName: await this.getUserName(providerId)
        }
      };

      this.broadcastToRoom(userRoom, locationUpdate);
      this.broadcastToRoom(orderRoom, locationUpdate);

      console.log(`Location update from provider ${providerId} for order ${orderId}`);
    } catch (error) {
      console.error('Provider location error:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Failed to update location' }
      });
    }
  }

  private async handleOrderSubscription(connectionId: string, subscriptionData: any) {
    const ws = this.connections.get(connectionId);
    if (!ws || !ws.isAuthenticated) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Authentication required' }
      });
      return;
    }

    try {
      // Input validation
      if (!subscriptionData || !subscriptionData.orderId) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Order ID required' }
        });
        return;
      }

      const { orderId } = subscriptionData;
      const userId = ws.userId!;

      // Validate orderId format
      if (typeof orderId !== 'string' || orderId.length < 10) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Invalid order ID format' }
        });
        return;
      }

      // SECURITY: Strict authorization check
      const hasAccess = await this.validateOrderAccess(userId, orderId, 'read');
      if (!hasAccess) {
        console.warn(`Unauthorized order subscription: User ${userId} trying to access order ${orderId}`);
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Access denied to this order' }
        });
        return;
      }

      // Get order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        this.sendToConnection(connectionId, {
          type: 'error',
          data: { message: 'Order not found' }
        });
        return;
      }

      // Join order room
      const orderRoom = `order:${orderId}`;
      await this.joinRoom(orderRoom, connectionId);

      // Send order history (chat messages, status updates)
      const chatHistory = await storage.getChatMessages(orderId);
      
      this.sendToConnection(connectionId, {
        type: 'order_subscribed',
        data: {
          orderId,
          chatHistory,
          currentStatus: order.status,
          timestamp: Date.now()
        }
      });

      console.log(`User ${userId} subscribed to order ${orderId}`);
    } catch (error) {
      console.error('Order subscription error:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { message: 'Failed to subscribe to order' }
      });
    }
  }

  private async handleOrderUnsubscription(connectionId: string, subscriptionData: any) {
    const { orderId } = subscriptionData;
    const orderRoom = `order:${orderId}`;
    await this.leaveRoom(orderRoom, connectionId);

    this.sendToConnection(connectionId, {
      type: 'order_unsubscribed',
      data: { orderId, timestamp: Date.now() }
    });
  }

  private handleDisconnection(connectionId: string, clientIP?: string) {
    const ws = this.connections.get(connectionId);
    if (ws) {
      // Clean up user connection mapping
      if (ws.userId) {
        this.userConnections.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected from connection ${connectionId}`);
      }

      // Remove from all rooms
      if (ws.subscribedRooms) {
        ws.subscribedRooms.forEach(roomId => {
          this.leaveRoom(roomId, connectionId);
        });
      }
    }

    // Clean up IP connection tracking
    if (clientIP) {
      const currentCount = this.ipConnections.get(clientIP) || 0;
      if (currentCount <= 1) {
        this.ipConnections.delete(clientIP);
      } else {
        this.ipConnections.set(clientIP, currentCount - 1);
      }
    }

    this.connections.delete(connectionId);
    console.log(`WebSocket connection closed: ${connectionId}`);
  }

  private handleError(connectionId: string, error: Error) {
    console.error(`WebSocket error for connection ${connectionId}:`, error);
  }

  // Room management methods
  private async joinRoom(roomId: string, connectionId: string) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    this.rooms.get(roomId)!.add(connectionId);
    ws.subscribedRooms?.add(roomId);
  }

  private async leaveRoom(roomId: string, connectionId: string) {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(connectionId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    ws.subscribedRooms?.delete(roomId);
  }

  // Broadcasting methods
  public broadcastToRoom(roomId: string, message: SocketMessage, excludeConnections: string[] = []) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now()
    });

    room.forEach(connectionId => {
      if (excludeConnections.includes(connectionId)) return;
      
      const ws = this.connections.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  public sendToConnection(connectionId: string, message: SocketMessage) {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now()
      }));
    }
  }

  public async sendToUser(userId: string, message: SocketMessage) {
    const connectionId = this.userConnections.get(userId);
    if (connectionId) {
      this.sendToConnection(connectionId, message);
      return true;
    }
    return false;
  }

  // Notification methods
  public async sendNotificationToUser(userId: string, notificationData: any) {
    try {
      // Save notification to database
      const notification = await storage.createNotification({
        userId,
        title: notificationData.title,
        body: notificationData.body,
        type: notificationData.type,
        data: notificationData.data,
        isRead: false
      });

      // Try to send real-time notification
      const sent = await this.sendToUser(userId, {
        type: 'notification',
        data: notification
      });

      // If user is not connected, we could implement push notification here
      // For now, the notification is saved to database and will be retrieved when user connects

      return notification;
    } catch (error) {
      console.error('Send notification error:', error);
      return null;
    }
  }

  // Utility methods
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // SECURITY: Comprehensive order access validation
  private async validateOrderAccess(userId: string, orderId: string, operation: 'read' | 'chat' | 'update'): Promise<boolean> {
    try {
      // Get order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        console.warn(`Order not found for access check: ${orderId}`);
        return false;
      }

      // Get user details for role validation
      const user = await storage.getUser(userId);
      if (!user || !user.isActive) {
        console.warn(`Invalid or inactive user for order access: ${userId}`);
        return false;
      }

      // Admin users have full access
      if (user.role === 'admin') {
        return true;
      }

      // Customer can access their own orders
      if (order.userId === userId) {
        return true;
      }

      // Service provider can access assigned orders
      if (order.serviceProviderId === userId && user.role === 'service_provider') {
        return true;
      }

      // Parts provider can access assigned orders
      if (order.partsProviderId === userId && user.role === 'parts_provider') {
        return true;
      }

      // Operation-specific checks
      if (operation === 'update') {
        // Only providers and admins can update order status
        return ['service_provider', 'parts_provider', 'admin'].includes(user.role) &&
               (order.serviceProviderId === userId || order.partsProviderId === userId || user.role === 'admin');
      }

      console.warn(`Access denied: User ${userId} (${user.role}) attempting ${operation} on order ${orderId}`);
      return false;
    } catch (error) {
      console.error('Order access validation error:', error);
      return false;
    }
  }

  private async validateRoomAccess(userId: string, userRole: string, roomId: string): Promise<boolean> {
    try {
      // User-specific rooms
      if (roomId === `user:${userId}`) return true;
      
      // Provider rooms - verify user is actually a provider
      if (roomId === 'providers') {
        if (!['service_provider', 'parts_provider'].includes(userRole)) {
          return false;
        }
        // Additional check: verify user exists and has provider role in database
        const user = await storage.getUser(userId);
        return user && user.isActive && ['service_provider', 'parts_provider'].includes(user.role);
      }
      
      // Admin rooms - verify admin role
      if (roomId === 'admin') {
        if (userRole !== 'admin') {
          return false;
        }
        // Additional check: verify admin role in database
        const user = await storage.getUser(userId);
        return user && user.isActive && user.role === 'admin';
      }
      
      // Order rooms - use comprehensive order access validation
      if (roomId.startsWith('order:')) {
        const orderId = roomId.split(':')[1];
        if (!orderId || orderId.length < 10) {
          console.warn(`Invalid order ID in room: ${roomId}`);
          return false;
        }
        return await this.validateOrderAccess(userId, orderId, 'read');
      }

      console.warn(`Access denied to unknown room: ${roomId} for user ${userId}`);
      return false;
    } catch (error) {
      console.error('Room access validation error:', error);
      return false;
    }
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      return user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  private isUserInRoom(userId: string, roomId: string): boolean {
    const connectionId = this.userConnections.get(userId);
    if (!connectionId) return false;
    
    const room = this.rooms.get(roomId);
    return room ? room.has(connectionId) : false;
  }

  // Heartbeat to keep connections alive
  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((ws, connectionId) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Check if connection has been inactive
          const now = Date.now();
          if (ws.lastPing && (now - ws.lastPing > 60000)) { // 60 seconds
            console.log(`Terminating inactive connection: ${connectionId}`);
            ws.terminate();
            return;
          }

          // Send ping
          ws.ping();
        } else {
          this.handleDisconnection(connectionId);
        }
      });
    }, 30000); // Every 30 seconds
  }

  // Public API for external use
  public broadcastToProviders(message: SocketMessage) {
    this.broadcastToRoom('providers', message);
  }

  public broadcastToAdmins(message: SocketMessage) {
    this.broadcastToRoom('admin', message);
  }

  public async notifyNewOrder(order: any, providerId?: string) {
    const notification = {
      type: 'new_order_notification',
      data: {
        orderId: order.id,
        orderType: order.type,
        totalAmount: order.totalAmount,
        customerName: await this.getUserName(order.userId),
        scheduledAt: order.scheduledAt,
        location: order.location
      }
    };

    if (providerId) {
      await this.sendToUser(providerId, notification);
    } else {
      // Broadcast to all providers
      this.broadcastToProviders(notification);
    }
  }

  public getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(ws => ws.isAuthenticated).length,
      totalRooms: this.rooms.size,
      activeUsers: this.userConnections.size
    };
  }

  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Close all connections
    this.connections.forEach((ws, connectionId) => {
      ws.close(1001, 'Server shutting down');
    });
    
    this.wss.close();
  }
}

export default WebSocketManager;