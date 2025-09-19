import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SocketMessage {
  type: string;
  data: any;
  timestamp: number;
  messageId?: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  connectionError: string | null;
  socket: WebSocket | null;
  sendMessage: (type: string, data: any) => boolean;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  connectionStats: {
    reconnectAttempts: number;
    lastConnected: Date | null;
    connectionQuality: 'good' | 'poor' | 'disconnected';
  };
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function WebSocketProvider({ 
  children, 
  autoReconnect = true, 
  reconnectInterval = 3000,
  maxReconnectAttempts = 10 
}: WebSocketProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  
  // Event listeners registry
  const eventListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  
  // Subscribed rooms tracking
  const subscribedRoomsRef = useRef<Set<string>>(new Set());
  
  // Message queue for when disconnected
  const messageQueueRef = useRef<SocketMessage[]>([]);
  
  // Connection quality monitoring
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'disconnected'>('disconnected');
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(0);

  const connect = () => {
    try {
      // TEMPORARY: Allow connection without authentication to test infrastructure issue
      if (!isAuthenticated || !user) {
        console.log('WebSocket: Not authenticated, but attempting connection for infrastructure testing...');
        // Don't return - continue with connection attempt
      }

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket: Already connected');
        return;
      }

      // Extra safety: check if WebSocket is available
      if (typeof WebSocket === 'undefined') {
        console.warn('WebSocket: WebSocket not available in this environment');
        setConnectionError('WebSocket not supported');
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      
      // Construct WebSocket URL with proper port handling
      let wsUrl;
      
      // Use window.location.host which includes port if present
      const host = window.location.host;
      
      // Check if we're on Replit domain or localhost
      if (hostname.includes('replit.dev') || hostname.includes('repl.it')) {
        // Replit environment - use current host (includes proper port/domain)
        wsUrl = `${protocol}//${host}/ws`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Local development - ensure port 5000
        const port = window.location.port || '5000';
        wsUrl = `${protocol}//localhost:${port}/ws`;
      } else {
        // Default fallback - use current host
        wsUrl = `${protocol}//${host}/ws`;
      }
      
      console.log(`WebSocket: Connecting to ${wsUrl}`);
      
      try {
        socketRef.current = new WebSocket(wsUrl);
        
        // Add safe event handlers with error boundaries
        socketRef.current.onopen = (event) => {
          try { handleOpen(); } catch (e) { console.warn('WebSocket open handler error:', e); }
        };
        socketRef.current.onclose = (event) => {
          try { handleClose(event); } catch (e) { console.warn('WebSocket close handler error:', e); }
        };
        socketRef.current.onerror = (event) => {
          try { handleError(event); } catch (e) { console.warn('WebSocket error handler error:', e); }
        };
        socketRef.current.onmessage = (event) => {
          try { handleMessage(event); } catch (e) { console.warn('WebSocket message handler error:', e); }
        };
      } catch (socketError) {
        console.error('WebSocket: Failed to create WebSocket instance:', socketError);
        setConnectionError('Failed to create WebSocket connection');
        setConnectionQuality('disconnected');
      }

    } catch (error) {
      console.error('WebSocket: Connection error:', error);
      setConnectionError('Failed to connect to server');
      setConnectionQuality('disconnected');
    }
  };

  const handleOpen = () => {
    console.log('🎉 WebSocket: Connection established successfully! Infrastructure supports WebSocket.');
    setIsConnected(true);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
    setLastConnected(new Date());
    setConnectionQuality('good');
    
    // Send authentication message if user is authenticated
    if (user && isAuthenticated) {
      sendAuthMessage().catch(error => {
        console.error('Failed to send auth message:', error);
        setConnectionError('Authentication failed');
      });
    } else {
      console.log('WebSocket: Connected without authentication - testing infrastructure only');
      // Send a ping to test the connection
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'ping',
          data: { timestamp: Date.now(), test: true }
        }));
      }
    }
    
    // Process queued messages
    processMessageQueue();
    
    // Rejoin previously subscribed rooms
    rejoinRooms();
    
    // Start connection quality monitoring
    startPingMonitoring();
    
    toast({
      title: "WebSocket Connected!",
      description: "Real-time features are now active - infrastructure test successful",
      duration: 3000,
    });
  };

  const handleClose = (event: CloseEvent) => {
    console.log('WebSocket: Connection closed', event.code, event.reason);
    setIsConnected(false);
    setConnectionQuality('disconnected');
    
    stopPingMonitoring();
    
    // Auto-reconnect logic
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttemptsRef.current), 30000);
      
      console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
      
      if (reconnectAttemptsRef.current === 0) {
        toast({
          title: "Connection Lost",
          description: "Attempting to reconnect...",
          variant: "destructive",
          duration: 3000,
        });
      }
    } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to server. Please refresh the page.",
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  const handleError = (error: Event) => {
    console.error('WebSocket: Error occurred:', error);
    setConnectionError('Connection error occurred');
    setConnectionQuality('poor');
  };

  const handleMessage = (event: MessageEvent) => {
    try {
      const message: SocketMessage = JSON.parse(event.data);
      
      // Handle system messages
      switch (message.type) {
        case 'connection_established':
          console.log('WebSocket: Connection acknowledged by server');
          break;
          
        case 'auth_success':
          console.log('WebSocket: Authentication successful');
          break;
          
        case 'auth_failed':
          console.error('WebSocket: Authentication failed');
          setConnectionError('Authentication failed');
          break;
          
        case 'pong':
          lastPongRef.current = Date.now();
          setConnectionQuality('good');
          break;
          
        case 'error':
          console.error('WebSocket: Server error:', message.data);
          setConnectionError(message.data.message || 'Server error');
          break;
          
        default:
          // Broadcast to event listeners
          broadcastToListeners(message.type, message.data);
      }
      
    } catch (error) {
      console.error('WebSocket: Error parsing message:', error);
    }
  };

  const getWebSocketToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/v1/auth/ws-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for Replit auth
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get WebSocket token: ${response.status}`);
      }
      
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Failed to get WebSocket token:', error);
      return null;
    }
  };

  const sendAuthMessage = async () => {
    if (!user || !socketRef.current) return;
    
    const token = await getWebSocketToken();
    if (!token) {
      console.error('No auth token available for WebSocket');
      setConnectionError('Failed to authenticate');
      return;
    }
    
    const authMessage: SocketMessage = {
      type: 'auth',
      data: { token }, // Only send token, server will extract user ID from it
      timestamp: Date.now(),
    };
    
    socketRef.current.send(JSON.stringify(authMessage));
  };

  const sendMessage = (type: string, data: any): boolean => {
    if (!socketRef.current) {
      console.warn('WebSocket: Not connected, message queued');
      queueMessage({ type, data, timestamp: Date.now() });
      return false;
    }

    if (socketRef.current.readyState === WebSocket.OPEN) {
      const message: SocketMessage = {
        type,
        data,
        timestamp: Date.now(),
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket: Connection not ready, message queued');
      queueMessage({ type, data, timestamp: Date.now() });
      return false;
    }
  };

  const queueMessage = (message: SocketMessage) => {
    messageQueueRef.current.push(message);
    
    // Limit queue size
    if (messageQueueRef.current.length > 100) {
      messageQueueRef.current = messageQueueRef.current.slice(-50);
    }
  };

  const processMessageQueue = () => {
    const queue = messageQueueRef.current;
    messageQueueRef.current = [];
    
    queue.forEach(message => {
      sendMessage(message.type, message.data);
    });
    
    if (queue.length > 0) {
      console.log(`WebSocket: Processed ${queue.length} queued messages`);
    }
  };

  const subscribe = (eventType: string, callback: (data: any) => void) => {
    if (!eventListenersRef.current.has(eventType)) {
      eventListenersRef.current.set(eventType, new Set());
    }
    
    eventListenersRef.current.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = eventListenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          eventListenersRef.current.delete(eventType);
        }
      }
    };
  };

  const broadcastToListeners = (eventType: string, data: any) => {
    const listeners = eventListenersRef.current.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`WebSocket: Error in event listener for ${eventType}:`, error);
        }
      });
    }
  };

  const joinRoom = (roomId: string) => {
    sendMessage('join_room', { roomId });
    subscribedRoomsRef.current.add(roomId);
  };

  const leaveRoom = (roomId: string) => {
    sendMessage('leave_room', { roomId });
    subscribedRoomsRef.current.delete(roomId);
  };

  const rejoinRooms = () => {
    subscribedRoomsRef.current.forEach(roomId => {
      sendMessage('join_room', { roomId });
    });
  };

  const startPingMonitoring = () => {
    pingIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        lastPongRef.current = Date.now();
        sendMessage('ping', { timestamp: Date.now() });
        
        // Check for poor connection
        setTimeout(() => {
          const timeSincePong = Date.now() - lastPongRef.current;
          if (timeSincePong > 10000) { // 10 seconds without pong
            setConnectionQuality('poor');
          }
        }, 5000);
      }
    }, 30000); // Ping every 30 seconds
  };

  const stopPingMonitoring = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    stopPingMonitoring();
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnecting');
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionQuality('disconnected');
  };

  // Effect to handle authentication changes - with safe initialization
  useEffect(() => {
    try {
      if (isAuthenticated && user) {
        // Delay connection to avoid synchronous initialization issues
        const connectTimeout = setTimeout(() => {
          connect();
        }, 100);

        return () => {
          clearTimeout(connectTimeout);
          disconnect();
        };
      } else {
        disconnect();
      }
    } catch (error) {
      console.warn('WebSocket effect error:', error);
      // Never throw during render - provide fallback
      setConnectionError('Failed to initialize WebSocket');
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionError,
    socket: socketRef.current,
    sendMessage,
    subscribe,
    joinRoom,
    leaveRoom,
    connectionStats: {
      reconnectAttempts: reconnectAttemptsRef.current,
      lastConnected,
      connectionQuality,
    },
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Connection status indicator component
export function WebSocketStatus() {
  const { isConnected, connectionError, connectionStats } = useWebSocket();
  
  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs">Connected</span>
      </div>
    );
  }
  
  if (connectionError) {
    return (
      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-xs">Connection Error</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span className="text-xs">Connecting...</span>
    </div>
  );
}