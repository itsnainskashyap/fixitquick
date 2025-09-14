import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// Enhanced useSocket hook that integrates with WebSocket context
export function useSocket() {
  return useWebSocket();
}

// Real-time Order Tracking Hook
export function useOrderTracking(orderId?: string) {
  const { subscribe, sendMessage, isConnected, joinRoom, leaveRoom } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [providerLocation, setProviderLocation] = useState<any>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<Date | null>(null);

  useEffect(() => {
    if (!orderId || !isConnected) return;

    // Join order-specific room
    joinRoom(`order:${orderId}`);
    
    // Subscribe to order events
    const unsubscribeStatus = subscribe('order_status_updated', (data) => {
      if (data.orderId === orderId) {
        setOrderStatus(data.status);
        
        // Invalidate order queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
        
        toast({
          title: "Order Updated",
          description: `Your order status: ${data.status}`,
          duration: 3000,
        });
      }
    });

    const unsubscribeLocation = subscribe('provider_location_update', (data) => {
      if (data.orderId === orderId) {
        setProviderLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          timestamp: data.timestamp,
          providerName: data.providerName,
        });
        
        // Calculate estimated arrival if needed
        // This could be enhanced with routing APIs
      }
    });

    const unsubscribeProvider = subscribe('provider_assigned', (data) => {
      if (data.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/orders', orderId] });
        
        toast({
          title: "Provider Assigned",
          description: `${data.providerName} has been assigned to your order`,
          duration: 5000,
        });
      }
    });

    // Send subscription request
    sendMessage('subscribe_order', { orderId });

    return () => {
      unsubscribeStatus();
      unsubscribeLocation();
      unsubscribeProvider();
      leaveRoom(`order:${orderId}`);
      sendMessage('unsubscribe_order', { orderId });
    };
  }, [orderId, isConnected]);

  const updateOrderStatus = (status: string, notes?: string) => {
    if (!orderId) return false;
    
    return sendMessage('order_status_update', {
      orderId,
      status,
      notes,
    });
  };

  const shareLocation = (latitude: number, longitude: number, accuracy?: number) => {
    if (!orderId) return false;
    
    return sendMessage('provider_location', {
      orderId,
      latitude,
      longitude,
      accuracy: accuracy || 10,
    });
  };

  return {
    orderStatus,
    providerLocation,
    estimatedArrival,
    isConnected,
    updateOrderStatus,
    shareLocation,
  };
}

// Real-time Chat Hook
export function useOrderChat(orderId?: string) {
  const { subscribe, sendMessage, isConnected, joinRoom, leaveRoom } = useWebSocket();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load chat history from API
  const { data: chatHistory } = useQuery({
    queryKey: ['/api/v1/chat', orderId],
    queryFn: () => fetch(`/api/v1/chat/${orderId}`).then(res => res.json()),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (chatHistory) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (!orderId || !isConnected) return;

    // Join chat room
    joinRoom(`order:${orderId}`);
    
    // Subscribe to chat events
    const unsubscribeMessage = subscribe('chat_message', (data) => {
      if (data.orderId === orderId) {
        setMessages(prev => [...prev, {
          ...data,
          id: data.id || `msg_${Date.now()}`,
          createdAt: data.timestamp,
        }]);
        
        // Increment unread count if message is from someone else
        if (data.senderId !== user?.id) {
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: "New Message",
            description: `${data.senderName}: ${data.message}`,
            duration: 4000,
          });
        }
      }
    });

    const unsubscribeTyping = subscribe('typing_indicator', (data) => {
      if (data.orderId === orderId && data.userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userName || data.userId);
          } else {
            newSet.delete(data.userName || data.userId);
          }
          return newSet;
        });
        
        // Auto-remove typing indicator after 10 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userName || data.userId);
              return newSet;
            });
          }, 10000);
        }
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
      leaveRoom(`order:${orderId}`);
    };
  }, [orderId, isConnected, user?.id]);

  const sendChatMessage = (message: string, messageType: 'text' | 'image' | 'location' = 'text', attachments: string[] = []) => {
    if (!orderId || !message.trim()) return false;
    
    const success = sendMessage('chat_message', {
      orderId,
      message: message.trim(),
      messageType,
      attachments,
    });
    
    if (success) {
      // Stop typing indicator
      sendTypingIndicator(false);
    }
    
    return success;
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!orderId) return false;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    const success = sendMessage('typing_indicator', {
      orderId,
      isTyping,
    });
    
    // Auto-stop typing after 3 seconds
    if (isTyping && success) {
      typingTimeoutRef.current = setTimeout(() => {
        sendMessage('typing_indicator', {
          orderId,
          isTyping: false,
        });
      }, 3000);
    }
    
    return success;
  };

  const markAsRead = () => {
    setUnreadCount(0);
    // Could also send read receipt to server
  };

  const clearChat = () => {
    setMessages([]);
    setUnreadCount(0);
  };

  return {
    messages,
    typingUsers: Array.from(typingUsers),
    unreadCount,
    isConnected,
    sendChatMessage,
    sendTypingIndicator,
    markAsRead,
    clearChat,
  };
}

// Real-time Notifications Hook
export function useNotifications() {
  const { subscribe, isConnected } = useWebSocket();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from API
  const { data: notificationHistory } = useQuery({
    queryKey: ['/api/v1/notifications', user?.id],
    queryFn: () => fetch('/api/v1/notifications').then(res => res.json()),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (notificationHistory) {
      setNotifications(notificationHistory);
      setUnreadCount(notificationHistory.filter((n: any) => !n.isRead).length);
    }
  }, [notificationHistory]);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to notifications
    const unsubscribeNotification = subscribe('notification', (data) => {
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast({
        title: data.title,
        description: data.body,
        duration: 5000,
      });
    });

    // Subscribe to new orders (for providers)
    const unsubscribeNewOrder = subscribe('new_order_notification', (data) => {
      toast({
        title: "New Order Available",
        description: `${data.orderType} order for ₹${data.totalAmount}`,
        duration: 8000,
      });
      
      // Refresh provider dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers'] });
    });

    return () => {
      unsubscribeNotification();
      unsubscribeNewOrder();
    };
  }, [isConnected]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isRead: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}

// Real-time Dashboard Metrics Hook
export function useLiveMetrics(userRole?: string) {
  const { subscribe, isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  
  const [metrics, setMetrics] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to metrics updates based on role
    const unsubscribeMetrics = subscribe('dashboard_metrics_update', (data) => {
      setMetrics(data);
      setLastUpdated(new Date());
      
      // Invalidate related queries
      if (userRole === 'admin') {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/admin'] });
      } else if (userRole === 'service_provider') {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/providers'] });
      } else if (userRole === 'parts_provider') {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider'] });
      }
    });

    // Subscribe to order updates that affect metrics
    const unsubscribeOrderMetrics = subscribe('order_metrics_update', (data) => {
      setMetrics((prev: any) => ({ ...prev, ...data }));
      setLastUpdated(new Date());
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeOrderMetrics();
    };
  }, [isConnected, userRole]);

  return {
    metrics,
    lastUpdated,
    isConnected,
  };
}