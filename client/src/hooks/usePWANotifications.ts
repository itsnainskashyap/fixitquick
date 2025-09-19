import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Firebase Cloud Messaging configuration
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY || 'BKtSGPJWLZhNZgUKLMl5A9ZI7W5K6HGK4_Zj8FHR7X8vLMwNyXLqHpZsVQqWqJ9HGK4_Zj8FHR7X8vLMwNyXLqHpZs';

interface NotificationPermissionState {
  status: 'default' | 'granted' | 'denied' | 'unsupported';
  isSupported: boolean;
  canRequest: boolean;
  token: string | null;
  subscriptionActive: boolean;
}

interface PWANotificationPreferences {
  enabled: boolean;
  providerType: 'service_provider' | 'parts_provider' | 'customer';
  jobRequests: boolean;
  customerMessages: boolean;
  paymentUpdates: boolean;
  emergencyAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

interface NotificationStats {
  totalReceived: number;
  totalActioned: number;
  lastReceived: Date | null;
  averageResponseTime: number;
}

export function usePWANotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    status: 'default',
    isSupported: false,
    canRequest: true,
    token: null,
    subscriptionActive: false
  });
  
  const [preferences, setPreferences] = useState<PWANotificationPreferences>({
    enabled: false,
    providerType: 'service_provider',
    jobRequests: true,
    customerMessages: true,
    paymentUpdates: true,
    emergencyAlerts: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    }
  });
  
  const [stats, setStats] = useState<NotificationStats>({
    totalReceived: 0,
    totalActioned: 0,
    lastReceived: null,
    averageResponseTime: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check notification support and initial state
  useEffect(() => {
    checkNotificationSupport();
    loadPreferences();
    loadStats();
  }, [user]);

  // Register service worker and set up messaging
  useEffect(() => {
    if (permissionState.isSupported) {
      registerServiceWorker();
    }
  }, [permissionState.isSupported]);

  const checkNotificationSupport = useCallback(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (!isSupported) {
      setPermissionState(prev => ({
        ...prev,
        status: 'unsupported',
        isSupported: false,
        canRequest: false
      }));
      return false;
    }

    const currentStatus = Notification.permission as 'default' | 'granted' | 'denied';
    setPermissionState(prev => ({
      ...prev,
      status: currentStatus,
      isSupported: true,
      canRequest: currentStatus === 'default'
    }));

    return true;
  }, []);

  const registerServiceWorker = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      serviceWorkerRef.current = registration;
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      console.log('Service Worker registered successfully for PWA notifications');
      
      // Set up message listener for service worker communication
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setError('Failed to register service worker for notifications');
      throw error;
    }
  }, []);

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, action, targetUrl, notificationData } = event.data;
    
    if (type === 'notification_action') {
      console.log('Service worker notification action:', action, targetUrl);
      
      // Handle navigation from service worker
      if (targetUrl && window.location.pathname !== targetUrl) {
        window.location.href = targetUrl;
      }
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalActioned: prev.totalActioned + 1
      }));
      
      // Show success message for quick actions
      if (['accept', 'decline', 'accept_order', 'accept_emergency'].includes(action)) {
        toast({
          title: "Action Completed",
          description: `Successfully ${action}ed the request`,
        });
      }
    }
  }, [toast]);

  const requestNotificationPermission = useCallback(async (showUserFriendlyPrompt = true) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!permissionState.isSupported) {
        throw new Error('Notifications are not supported in this browser');
      }

      if (permissionState.status === 'denied') {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }

      if (permissionState.status === 'granted') {
        // Already granted, just ensure we have a token
        await ensureFCMToken();
        return true;
      }

      // Show user-friendly prompt before system prompt
      if (showUserFriendlyPrompt) {
        const userConsent = await showFriendlyPermissionPrompt();
        if (!userConsent) {
          return false;
        }
      }

      // Request permission from browser
      const permission = await Notification.requestPermission();
      
      setPermissionState(prev => ({
        ...prev,
        status: permission,
        canRequest: permission === 'default'
      }));

      if (permission === 'granted') {
        await ensureFCMToken();
        
        toast({
          title: "Notifications Enabled!",
          description: "You'll now receive real-time alerts for important updates.",
        });
        
        return true;
      } else if (permission === 'denied') {
        setError('Notifications were denied. You can enable them later in your browser settings.');
        return false;
      }

      return false;
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      setError(error.message || 'Failed to enable notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [permissionState, toast]);

  const showFriendlyPermissionPrompt = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // This would typically show a modal/dialog component
      // For now, using browser confirm as fallback
      const providerType = user?.role === 'parts_provider' ? 'parts orders' : 'service requests';
      const message = `Enable notifications to receive instant alerts for new ${providerType} and never miss business opportunities. This helps you respond faster and earn more.`;
      
      const userChoice = window.confirm(message + '\n\nWould you like to enable notifications?');
      resolve(userChoice);
    });
  };

  const ensureFCMToken = useCallback(async () => {
    try {
      if (!serviceWorkerRef.current) {
        serviceWorkerRef.current = await registerServiceWorker();
      }

      // PRODUCTION FIX: Use real Firebase FCM token instead of mock
      const { requestFCMToken } = await import('@/lib/firebase');
      const fcmToken = await requestFCMToken();
      
      if (!fcmToken) {
        throw new Error('Failed to obtain FCM token');
      }
      
      // Save token to server with proper device info
      await apiRequest('POST', '/api/v1/notifications/fcm-token', {
        token: fcmToken,
        deviceType: 'web',
        userAgent: navigator.userAgent,
        providerType: user?.role,
        timestamp: Date.now()
      });

      setPermissionState(prev => ({
        ...prev,
        token: fcmToken,
        subscriptionActive: true
      }));

      console.log('✅ Real FCM token registered:', fcmToken.substring(0, 20) + '...');
      return fcmToken;
    } catch (error) {
      console.error('❌ Error getting real FCM token:', error);
      throw error;
    }
  }, [user]);

  const disableNotifications = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // PRODUCTION FIX: Use real Firebase FCM token deletion
      if (permissionState.token) {
        // Remove FCM token from server
        await apiRequest('DELETE', '/api/v1/notifications/fcm-token', {
          token: permissionState.token
        });

        // Delete FCM token from Firebase
        const { deleteFCMToken } = await import('@/lib/firebase');
        await deleteFCMToken();
      }

      // Update preferences
      await updatePreferences({ ...preferences, enabled: false });

      setPermissionState(prev => ({
        ...prev,
        token: null,
        subscriptionActive: false
      }));

      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });

    } catch (error) {
      console.error('❌ Error disabling notifications:', error);
      setError('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [permissionState.token, preferences]);

  const updatePreferences = useCallback(async (newPreferences: Partial<PWANotificationPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      
      await apiRequest('PUT', '/api/v1/users/me/notifications/preferences', {
        pwaNotifications: updatedPreferences
      });

      setPreferences(updatedPreferences);
      
      // Save to localStorage for offline access
      localStorage.setItem('pwa_notification_preferences', JSON.stringify(updatedPreferences));
      
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });

    } catch (error) {
      console.error('Error updating preferences:', error);
      setError('Failed to update notification preferences');
    }
  }, [preferences, toast]);

  const loadPreferences = useCallback(async () => {
    try {
      // Try to load from server first
      if (user) {
        const response = await apiRequest('GET', '/api/v1/users/me/notifications/preferences');
        if (response.preferences?.pwaNotifications) {
          setPreferences(response.preferences.pwaNotifications);
          return;
        }
      }

      // Fallback to localStorage
      const savedPreferences = localStorage.getItem('pwa_notification_preferences');
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.log('Could not load notification preferences:', error);
    }
  }, [user]);

  const loadStats = useCallback(() => {
    try {
      const savedStats = localStorage.getItem('pwa_notification_stats');
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setStats({
          ...parsedStats,
          lastReceived: parsedStats.lastReceived ? new Date(parsedStats.lastReceived) : null
        });
      }
    } catch (error) {
      console.log('Could not load notification stats:', error);
    }
  }, []);

  const updateStats = useCallback((update: Partial<NotificationStats>) => {
    setStats(prev => {
      const newStats = { ...prev, ...update };
      localStorage.setItem('pwa_notification_stats', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const testNotification = useCallback(async () => {
    if (permissionState.status !== 'granted') {
      toast({
        title: "Notifications Not Enabled",
        description: "Please enable notifications first to test them.",
        variant: "destructive"
      });
      return;
    }

    try {
      const testPayload = {
        title: '🔧 Test Notification',
        body: 'This is a test notification from FixitQuick PWA!',
        type: user?.role === 'parts_provider' ? 'new_order' : 'new_job_request',
        providerType: user?.role || 'service_provider',
        data: {
          orderId: 'test_' + Date.now(),
          urgency: 'normal'
        }
      };

      // Send test notification via service worker
      if (serviceWorkerRef.current) {
        const sw = await serviceWorkerRef.current.pushManager.getSubscription();
        if (sw) {
          // In production, this would go through the server
          console.log('Sending test notification:', testPayload);
          
          // Simulate notification for testing
          new Notification(testPayload.title, {
            body: testPayload.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [100, 50, 100],
            tag: 'test-notification'
          });

          updateStats({
            totalReceived: stats.totalReceived + 1,
            lastReceived: new Date()
          });

          toast({
            title: "Test Notification Sent!",
            description: "Check if you received the test notification.",
          });
        }
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Could not send test notification.",
        variant: "destructive"
      });
    }
  }, [permissionState.status, user, stats, toast, updateStats]);

  const retrySetup = useCallback(async () => {
    setError(null);
    await checkNotificationSupport();
    if (permissionState.status === 'granted') {
      await ensureFCMToken();
    }
  }, [checkNotificationSupport, permissionState.status, ensureFCMToken]);

  // Auto-retry setup on network recovery
  useEffect(() => {
    const handleOnline = () => {
      if (error && permissionState.status === 'granted') {
        retryTimeoutRef.current = setTimeout(retrySetup, 2000);
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [error, permissionState.status, retrySetup]);

  return {
    // State
    permissionState,
    preferences,
    stats,
    isLoading,
    error,
    
    // Actions
    requestNotificationPermission,
    disableNotifications,
    updatePreferences,
    testNotification,
    retrySetup,
    checkNotificationSupport,
    
    // Helpers
    isEnabled: permissionState.status === 'granted' && preferences.enabled,
    canRequestPermission: permissionState.canRequest,
    isSupported: permissionState.isSupported
  };
}

export default usePWANotifications;