import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, authenticatedFetch } from '@/lib/queryClient';
import { usePWANotifications } from '@/hooks/usePWANotifications';

interface FallbackNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  providerType: string;
  data: any;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

interface FallbackConfig {
  enabled: boolean;
  pollInterval: number; // milliseconds
  maxRetries: number;
  backoffMultiplier: number;
  showFallbackIndicator: boolean;
}

interface ConnectionStats {
  pwaStatus: 'available' | 'unavailable' | 'denied';
  websocketStatus: 'connected' | 'disconnected' | 'error';
  fallbackActive: boolean;
  lastPoll: Date | null;
  missedNotifications: number;
}

export function useNotificationFallback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { permissionState, isEnabled: pwaEnabled } = usePWANotifications();
  
  const [fallbackNotifications, setFallbackNotifications] = useState<FallbackNotification[]>([]);
  const [config, setConfig] = useState<FallbackConfig>({
    enabled: true,
    pollInterval: 30000, // 30 seconds default
    maxRetries: 3,
    backoffMultiplier: 2,
    showFallbackIndicator: true
  });
  
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    pwaStatus: 'unavailable',
    websocketStatus: 'disconnected',
    fallbackActive: false,
    lastPoll: null,
    missedNotifications: 0
  });
  
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastNotificationTimestamp = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Determine if fallback should be active
  const shouldUseFallback = useCallback(() => {
    const pwaUnavailable = permissionState.status !== 'granted' || !pwaEnabled;
    const websocketDown = connectionStats.websocketStatus !== 'connected';
    
    return config.enabled && (pwaUnavailable || websocketDown);
  }, [permissionState.status, pwaEnabled, connectionStats.websocketStatus, config.enabled]);

  // Update connection stats based on various states
  useEffect(() => {
    setConnectionStats(prev => ({
      ...prev,
      pwaStatus: permissionState.status === 'granted' && pwaEnabled ? 'available' : 
                 permissionState.status === 'denied' ? 'denied' : 'unavailable',
      fallbackActive: shouldUseFallback()
    }));
  }, [permissionState.status, pwaEnabled, shouldUseFallback]);

  // Monitor WebSocket connection status from WebSocketContext
  useEffect(() => {
    const checkWebSocketStatus = () => {
      // This would integrate with WebSocketContext to get real status
      // For now, we'll simulate checking connection health
      try {
        const wsConnected = document.querySelector('[data-ws-connected="true"]') !== null;
        setConnectionStats(prev => ({
          ...prev,
          websocketStatus: wsConnected ? 'connected' : 'disconnected'
        }));
      } catch (error) {
        setConnectionStats(prev => ({
          ...prev,
          websocketStatus: 'error'
        }));
      }
    };

    checkWebSocketStatus();
    const interval = setInterval(checkWebSocketStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Poll for notifications when fallback is active
  const pollNotifications = useCallback(async () => {
    if (!user || !shouldUseFallback()) {
      return;
    }

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      // SECURITY FIX: Use consistent authentication with proper error handling
      const queryParams = new URLSearchParams({
        limit: '50',
        since: lastNotificationTimestamp.current > 0 ? lastNotificationTimestamp.current.toString() : '0'
      });
      
      const pollUrl = `/api/v1/notifications?${queryParams.toString()}`;
      
      // Use consistent authenticated fetch with proper auth handling
      const res = await authenticatedFetch(pollUrl, {
        method: 'GET',
        signal: abortControllerRef.current.signal,
      });

      // Enhanced error handling for auth issues (matching main API client)
      if (res.status === 401) {
        console.warn('🚨 Notification polling authentication failed');
        localStorage.removeItem('accessToken');
        setError('Authentication expired. Please refresh the page to continue receiving notifications.');
        setIsPolling(false);
        throw new Error('Authentication expired');
      }

      if (res.status === 403) {
        setError('Insufficient permissions for notifications.');
        setIsPolling(false);
        throw new Error('Insufficient permissions');
      }

      // PRODUCTION FIX: Handle 304 (Not Modified) as success - no new notifications
      if (res.status === 304) {
        console.log('Notification polling: No new notifications (304 Not Modified)');
        
        // Update connection stats to reflect successful poll
        setConnectionStats(prev => ({
          ...prev,
          lastPoll: new Date(),
          missedNotifications: prev.missedNotifications // No change in count
        }));

        // Reset retry count on successful poll
        retryCountRef.current = 0;
        setError(null);
        return; // Exit successfully, no new notifications to process
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      // Parse JSON response consistently
      const contentType = res.headers.get('content-type');
      let response;
      if (contentType && contentType.includes('application/json')) {
        response = await res.json();
      } else {
        console.warn('Unexpected response format from notifications API');
        response = [];
      }

      // The /api/v1/notifications endpoint returns notifications directly as an array
      if (Array.isArray(response) && response.length > 0) {
        const newNotifications = response.map((notif: any) => ({
          id: notif.id,
          title: notif.title,
          body: notif.body || notif.message,
          type: notif.type,
          providerType: notif.providerType || user.role,
          data: notif.data || {},
          timestamp: new Date(notif.createdAt).getTime(),
          read: notif.read || false,
          priority: notif.priority || 'medium'
        }));

        // Update notifications list
        setFallbackNotifications(prev => {
          const combined = [...newNotifications, ...prev];
          // Keep only last 100 notifications
          return combined.slice(0, 100);
        });

        // Update last timestamp
        const latestTimestamp = Math.max(...newNotifications.map(n => n.timestamp));
        lastNotificationTimestamp.current = latestTimestamp;

        // Show toast notifications for high priority items
        newNotifications.forEach(notification => {
          if (notification.priority === 'high' || notification.priority === 'emergency') {
            showFallbackToast(notification);
          }
        });

        // Play notification sound for important notifications
        const emergencyNotifications = newNotifications.filter(n => n.priority === 'emergency');
        if (emergencyNotifications.length > 0) {
          playFallbackNotificationSound(true);
        } else if (newNotifications.length > 0) {
          playFallbackNotificationSound(false);
        }

        console.log(`Fallback polling: ${newNotifications.length} new notifications received`);
      }

      // Update connection stats
      setConnectionStats(prev => ({
        ...prev,
        lastPoll: new Date(),
        missedNotifications: prev.missedNotifications + (Array.isArray(response) ? response.length : 0)
      }));

      // Reset retry count on successful poll
      retryCountRef.current = 0;
      setError(null);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, not an error
      }

      console.error('Fallback polling error:', error);
      
      // Implement exponential backoff for retries
      retryCountRef.current += 1;
      
      if (retryCountRef.current <= config.maxRetries) {
        const backoffDelay = config.pollInterval * Math.pow(config.backoffMultiplier, retryCountRef.current - 1);
        console.log(`Retrying fallback poll in ${backoffDelay}ms (attempt ${retryCountRef.current}/${config.maxRetries})`);
        
        setTimeout(() => {
          pollNotifications();
        }, backoffDelay);
      } else {
        setError(`Failed to fetch notifications after ${config.maxRetries} attempts`);
        retryCountRef.current = 0; // Reset for next cycle
      }
    }
  }, [user, shouldUseFallback, config.maxRetries, config.pollInterval, config.backoffMultiplier]);

  // Start/stop polling based on fallback status
  useEffect(() => {
    if (shouldUseFallback() && config.enabled) {
      setIsPolling(true);
      
      // Initial poll
      pollNotifications();
      
      // Set up interval polling
      pollIntervalRef.current = setInterval(pollNotifications, config.pollInterval);
      
      console.log(`Fallback notification polling started (interval: ${config.pollInterval}ms)`);
    } else {
      setIsPolling(false);
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      console.log('Fallback notification polling stopped');
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [shouldUseFallback, config.enabled, config.pollInterval, pollNotifications]);

  const showFallbackToast = (notification: FallbackNotification) => {
    const toastConfig: any = {
      title: notification.title,
      description: notification.body,
    };

    // Add priority-based styling
    if (notification.priority === 'emergency') {
      toastConfig.variant = 'destructive';
      toastConfig.duration = 10000; // Keep emergency notifications longer
    } else if (notification.priority === 'high') {
      toastConfig.duration = 8000;
    }

    toast(toastConfig);
  };

  const playFallbackNotificationSound = (isEmergency: boolean = false) => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.7;
      
      if (isEmergency) {
        // Play multiple times for emergency
        audio.play().catch(() => console.log('Could not play emergency notification sound'));
        setTimeout(() => audio.play().catch(() => {}), 500);
        setTimeout(() => audio.play().catch(() => {}), 1000);
      } else {
        audio.play().catch(() => console.log('Could not play notification sound'));
      }
    } catch (error) {
      console.log('Fallback notification sound error:', error);
    }
  };

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiRequest('PUT', `/api/v1/notifications/${notificationId}/read`);
      
      setFallbackNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setFallbackNotifications([]);
    setConnectionStats(prev => ({
      ...prev,
      missedNotifications: 0
    }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<FallbackConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      
      // Save to localStorage for persistence
      localStorage.setItem('notification_fallback_config', JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  const forceRetry = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
    if (shouldUseFallback()) {
      pollNotifications();
    }
  }, [shouldUseFallback, pollNotifications]);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('notification_fallback_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.log('Could not load fallback config from localStorage');
    }
  }, []);

  return {
    // State
    fallbackNotifications,
    config,
    connectionStats,
    isPolling,
    error,
    
    // Computed values
    shouldUseFallback: shouldUseFallback(),
    unreadCount: fallbackNotifications.filter(n => !n.read).length,
    hasEmergencyNotifications: fallbackNotifications.some(n => n.priority === 'emergency' && !n.read),
    
    // Actions
    markNotificationAsRead,
    clearAllNotifications,
    updateConfig,
    forceRetry,
    
    // Manual controls
    startPolling: () => updateConfig({ enabled: true }),
    stopPolling: () => updateConfig({ enabled: false }),
    
    // Helpers
    getNotificationsByType: (type: string) => 
      fallbackNotifications.filter(n => n.type === type),
    getNotificationsByPriority: (priority: FallbackNotification['priority']) =>
      fallbackNotifications.filter(n => n.priority === priority)
  };
}

export default useNotificationFallback;