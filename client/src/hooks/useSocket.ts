import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

interface SocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: SocketMessage) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    onConnect,
    onDisconnect,
    onMessage,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const connect = () => {
    if (!user) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Send authentication message
        if (socketRef.current && user) {
          socketRef.current.send(JSON.stringify({
            type: 'auth',
            data: { userId: user.uid, role: user.role },
            timestamp: Date.now(),
          }));
        }
        
        onConnect?.();
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        
        // Auto-reconnect if enabled
        if (autoReconnect && reconnectAttemptsRef.current < 5) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, reconnectInterval);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed');
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message: SocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setConnectionError('Failed to connect');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (type: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message: SocketMessage = {
        type,
        data,
        timestamp: Date.now(),
      };
      
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    
    console.warn('WebSocket not connected, message not sent');
    return false;
  };

  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connectionError,
    sendMessage,
    connect,
    disconnect,
  };
}

// Specialized hooks for different socket functionalities

export function useOrderTracking() {
  const { sendMessage } = useSocket({
    onMessage: (message) => {
      if (message.type === 'order_update') {
        // Handle order status updates
        console.log('Order update:', message.data);
      }
    },
  });

  const subscribeToOrder = (orderId: string) => {
    sendMessage('subscribe_order', { orderId });
  };

  const unsubscribeFromOrder = (orderId: string) => {
    sendMessage('unsubscribe_order', { orderId });
  };

  return { subscribeToOrder, unsubscribeFromOrder };
}

export function useChat(orderId?: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const { sendMessage, isConnected } = useSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'chat_message':
          if (message.data.orderId === orderId) {
            setMessages(prev => [...prev, message.data]);
          }
          break;
        case 'typing_indicator':
          if (message.data.orderId === orderId) {
            setIsTyping(message.data.isTyping);
          }
          break;
      }
    },
  });

  const sendChatMessage = (text: string) => {
    if (!orderId) return false;
    
    return sendMessage('chat_message', {
      orderId,
      message: text,
      messageType: 'text',
    });
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!orderId) return false;
    
    return sendMessage('typing_indicator', {
      orderId,
      isTyping,
    });
  };

  const joinChatRoom = () => {
    if (!orderId) return false;
    
    return sendMessage('join_chat', { orderId });
  };

  const leaveChatRoom = () => {
    if (!orderId) return false;
    
    return sendMessage('leave_chat', { orderId });
  };

  return {
    messages,
    isTyping,
    isConnected,
    sendChatMessage,
    sendTypingIndicator,
    joinChatRoom,
    leaveChatRoom,
  };
}

export function useProviderLocation() {
  const [providerLocations, setProviderLocations] = useState<Record<string, any>>({});

  const { sendMessage } = useSocket({
    onMessage: (message) => {
      if (message.type === 'provider_location') {
        setProviderLocations(prev => ({
          ...prev,
          [message.data.providerId]: message.data.location,
        }));
      }
    },
  });

  const trackProvider = (providerId: string) => {
    sendMessage('track_provider', { providerId });
  };

  const stopTrackingProvider = (providerId: string) => {
    sendMessage('stop_tracking_provider', { providerId });
  };

  return {
    providerLocations,
    trackProvider,
    stopTrackingProvider,
  };
}
