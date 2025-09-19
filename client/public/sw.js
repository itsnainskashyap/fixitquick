const CACHE_NAME = 'fixitquick-v1.0.0';
const OFFLINE_URL = '/offline.html';
const NOTIFICATION_DB_NAME = 'FixitQuickNotifications';
const NOTIFICATION_DB_VERSION = 1;

// Safe resources to cache - only public, non-sensitive static assets
const CACHE_RESOURCES = [
  '/',
  '/manifest.json',
  '/notification-sound.mp3',
  '/fixitquick-logo.jpg',
  '/offline.html',
  // PRODUCTION FIX: Pre-cache all notification icon assets for offline reliability
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
  '/icons/accept.png',
  '/icons/decline.png',
  '/icons/view.png',
  '/icons/chat.png',
  '/icons/reply.png',
  '/icons/inventory.png',
  // Static public assets only - no dev files, no API responses
];

// Safe API endpoints that can be cached (public, non-sensitive only)
const SAFE_CACHE_API_PATTERNS = [
  '/api/v1/services/categories', // Public service categories
  '/api/v1/regions/public', // Public region data
  '/api/v1/app/version', // App version info
  // NO authenticated endpoints, NO user data, NO sensitive information
];

// Helper function to check if an API endpoint is safe to cache
function isSafeToCacheAPI(url) {
  return SAFE_CACHE_API_PATTERNS.some(pattern => url.includes(pattern));
}

// Notification Templates and Configuration
const NOTIFICATION_TEMPLATES = {
  // Service Provider Notifications
  'service_provider': {
    'new_job_request': {
      title: '🔧 New Job Request',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: 'job-request',
      actions: [
        { action: 'accept', title: '✅ Accept Job', icon: '/icons/accept.png' },
        { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' },
        { action: 'decline', title: '❌ Decline', icon: '/icons/decline.png' }
      ]
    },
    'job_update': {
      title: '📋 Job Update',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      actions: [
        { action: 'view', title: '👁️ View Update', icon: '/icons/view.png' },
        { action: 'respond', title: '💬 Respond', icon: '/icons/chat.png' }
      ]
    },
    'customer_message': {
      title: '💬 New Customer Message',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100, 50, 100],
      actions: [
        { action: 'reply', title: '📝 Reply', icon: '/icons/reply.png' },
        { action: 'view', title: '👁️ View Chat', icon: '/icons/chat.png' }
      ]
    },
    'emergency_request': {
      title: '🚨 EMERGENCY SERVICE REQUEST',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      tag: 'emergency',
      actions: [
        { action: 'accept_emergency', title: '🚨 Accept Emergency', icon: '/icons/accept.png' },
        { action: 'view', title: '👁️ View Details', icon: '/icons/view.png' }
      ]
    }
  },
  
  // Parts Provider Notifications
  'parts_provider': {
    'new_order': {
      title: '📦 New Parts Order',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [150, 75, 150],
      requireInteraction: true,
      tag: 'parts-order',
      actions: [
        { action: 'accept_order', title: '✅ Accept Order', icon: '/icons/accept.png' },
        { action: 'view', title: '👁️ View Order', icon: '/icons/view.png' },
        { action: 'check_stock', title: '📋 Check Stock', icon: '/icons/inventory.png' }
      ]
    },
    'low_stock_alert': {
      title: '⚠️ Low Stock Alert',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      actions: [
        { action: 'restock', title: '📦 Restock', icon: '/icons/inventory.png' },
        { action: 'view_inventory', title: '📋 View Inventory', icon: '/icons/inventory.png' }
      ]
    },
    'inventory_update': {
      title: '📋 Inventory Update',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      actions: [
        { action: 'view_inventory', title: '👁️ View Inventory', icon: '/icons/inventory.png' }
      ]
    }
  },
  
  // Common notifications
  'common': {
    'payment_received': {
      title: '💰 Payment Received',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 100, 100],
      actions: [
        { action: 'view_payment', title: '👁️ View Payment', icon: '/icons/view.png' }
      ]
    },
    'system_alert': {
      title: '🔔 System Alert',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: '👁️ View Alert', icon: '/icons/view.png' }
      ]
    }
  }
};

// Install event - cache resources with error handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Opened cache');
        
        // PRODUCTION FIX: Cache resources with error handling for missing assets
        const cachePromises = CACHE_RESOURCES.map(async (resource) => {
          try {
            const response = await fetch(resource);
            if (response.ok) {
              await cache.put(resource, response);
              console.log(`✅ Cached: ${resource}`);
            } else {
              console.warn(`⚠️ Failed to cache ${resource}: ${response.status}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error caching ${resource}:`, error.message);
            // Continue with other resources even if one fails
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('Service worker resource caching completed');
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service worker installation failed:', error);
        // Still skip waiting to allow the service worker to install
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// SECURE Fetch event - implements safe caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle navigation requests - always try network first for fresh content
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Only return cached home page on network failure
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match('/') || Response.error();
            });
        })
    );
    return;
  }

  // SECURITY FIX: Handle API requests with strict no-cache policy for sensitive data
  if (url.pathname.startsWith('/api/')) {
    // Check if this is a safe, public API endpoint
    if (isSafeToCacheAPI(url.pathname) && event.request.method === 'GET') {
      // Only cache safe, public GET requests
      event.respondWith(
        caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              // Check if cached response is less than 1 hour old
              const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
              const now = new Date();
              const hourInMs = 60 * 60 * 1000;
              
              if (now - cacheDate < hourInMs) {
                return cachedResponse;
              }
            }
            
            // Fetch fresh data and cache if safe
            return fetch(event.request)
              .then((response) => {
                if (response.ok && response.status === 200) {
                  const responseClone = response.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                  });
                }
                return response;
              });
          })
      );
    } else {
      // NEVER cache authenticated/sensitive API requests
      // Always fetch fresh from network, no caching whatsoever
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            // Return appropriate error for failed API calls
            return new Response(
              JSON.stringify({ error: 'Network unavailable', offline: true }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
    }
    return;
  }

  // Handle static assets with cache-first strategy
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request)
            .then((fetchResponse) => {
              // Only cache successful responses for static assets
              if (fetchResponse.ok) {
                const responseClone = fetchResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return fetchResponse;
            });
        })
        .catch(() => {
          // Return a generic offline response for failed static assets
          return new Response('Asset unavailable offline', { status: 503 });
        })
    );
    return;
  }

  // For all other requests, network-first with minimal caching
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Only return cached content for non-sensitive requests
        return caches.match(event.request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
  
  if (event.tag === 'background-sync-chat') {
    event.waitUntil(syncOfflineMessages());
  }
});

// IndexedDB Helper Functions
function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_DB_NAME, NOTIFICATION_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create notifications store
      if (!db.objectStoreNames.contains('notifications')) {
        const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
        notificationStore.createIndex('timestamp', 'timestamp', { unique: false });
        notificationStore.createIndex('providerType', 'providerType', { unique: false });
        notificationStore.createIndex('type', 'type', { unique: false });
        notificationStore.createIndex('read', 'read', { unique: false });
      }
      
      // Create actions store for tracking notification responses
      if (!db.objectStoreNames.contains('notificationActions')) {
        const actionStore = db.createObjectStore('notificationActions', { keyPath: 'id', autoIncrement: true });
        actionStore.createIndex('notificationId', 'notificationId', { unique: false });
        actionStore.createIndex('action', 'action', { unique: false });
        actionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create offline sync queue
      if (!db.objectStoreNames.contains('offlineActions')) {
        const offlineStore = db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true });
        offlineStore.createIndex('timestamp', 'timestamp', { unique: false });
        offlineStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

async function saveNotificationToDB(notification) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    const notificationData = {
      id: notification.id || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      providerType: notification.providerType,
      data: notification.data,
      timestamp: Date.now(),
      read: false,
      displayed: true
    };
    
    await store.put(notificationData);
    console.log('Notification saved to IndexedDB:', notificationData.id);
    return notificationData;
  } catch (error) {
    console.error('Error saving notification to IndexedDB:', error);
    return null;
  }
}

async function saveActionToDB(notificationId, action, data = {}) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['notificationActions'], 'readwrite');
    const store = transaction.objectStore('notificationActions');
    
    const actionData = {
      notificationId,
      action,
      data,
      timestamp: Date.now()
    };
    
    await store.add(actionData);
    console.log('Notification action saved:', action, 'for notification:', notificationId);
  } catch (error) {
    console.error('Error saving notification action:', error);
  }
}

function playNotificationSound(urgency = 'normal') {
  try {
    // Different sound patterns based on urgency
    const soundPatterns = {
      emergency: { repeat: 3, interval: 500 },
      high: { repeat: 2, interval: 800 },
      normal: { repeat: 1, interval: 0 }
    };
    
    const pattern = soundPatterns[urgency] || soundPatterns.normal;
    
    for (let i = 0; i < pattern.repeat; i++) {
      setTimeout(() => {
        // Try to play notification sound
        // Note: Audio in service worker has limitations, this is a basic attempt
        try {
          new Audio('/notification-sound.mp3').play().catch(() => {
            console.log('Audio notification not available in service worker context');
          });
        } catch (e) {
          console.log('Notification sound not supported');
        }
      }, i * pattern.interval);
    }
  } catch (error) {
    console.log('Audio notification error:', error);
  }
}

// Enhanced Push notification handling with templates and persistence
self.addEventListener('push', (event) => {
  event.waitUntil(handlePushNotification(event));
});

async function handlePushNotification(event) {
  try {
    let notificationData;
    
    // Parse notification payload
    if (event.data) {
      try {
        notificationData = event.data.json();
      } catch (e) {
        // Fallback to text if JSON parse fails
        notificationData = {
          title: 'FixitQuick Notification',
          body: event.data.text() || 'New notification from FixitQuick',
          type: 'system_alert',
          providerType: 'common'
        };
      }
    } else {
      // Default notification if no data
      notificationData = {
        title: 'FixitQuick Notification',
        body: 'New notification from FixitQuick',
        type: 'system_alert',
        providerType: 'common'
      };
    }
    
    // Get notification template based on provider type and notification type
    const template = getNotificationTemplate(notificationData.providerType, notificationData.type);
    
    // Build notification options
    const notificationOptions = {
      body: notificationData.body || template.title,
      icon: template.icon,
      badge: template.badge,
      vibrate: template.vibrate,
      requireInteraction: template.requireInteraction || false,
      tag: template.tag || `${notificationData.providerType}_${notificationData.type}`,
      data: {
        ...notificationData.data,
        notificationId: notificationData.id || `notification_${Date.now()}`,
        providerType: notificationData.providerType,
        type: notificationData.type,
        timestamp: Date.now()
      },
      actions: template.actions || []
    };
    
    // Save notification to IndexedDB for offline access
    await saveNotificationToDB({
      ...notificationData,
      id: notificationOptions.data.notificationId
    });
    
    // Play notification sound based on urgency
    const urgency = notificationData.urgency || (notificationData.type === 'emergency_request' ? 'emergency' : 'normal');
    playNotificationSound(urgency);
    
    // Show the notification
    await self.registration.showNotification(
      notificationData.title || template.title,
      notificationOptions
    );
    
    console.log('Enhanced push notification displayed:', notificationData.type, 'for', notificationData.providerType);
    
  } catch (error) {
    console.error('Error handling push notification:', error);
    
    // PRODUCTION FIX: Secure fallback notification with guaranteed assets
    try {
      await self.registration.showNotification('FixitQuick', {
        body: 'New notification from FixitQuick',
        icon: '/fixitquick-logo.jpg', // Use guaranteed existing asset
        badge: '/fixitquick-logo.jpg',
        vibrate: [100, 50, 100],
        data: { timestamp: Date.now(), fallback: true }
      });
    } catch (fallbackError) {
      console.error('Fallback notification also failed:', fallbackError);
      // Last resort: basic notification without icons
      await self.registration.showNotification('FixitQuick', {
        body: 'New notification received',
        vibrate: [100, 50, 100],
        data: { timestamp: Date.now(), basicFallback: true }
      });
    }
  }
}

function getNotificationTemplate(providerType, type) {
  // Get template from the NOTIFICATION_TEMPLATES configuration
  const providerTemplates = NOTIFICATION_TEMPLATES[providerType] || NOTIFICATION_TEMPLATES.common;
  const template = providerTemplates[type];
  
  if (template) {
    // PRODUCTION FIX: Validate icon paths and provide fallbacks
    return {
      ...template,
      icon: template.icon || '/fixitquick-logo.jpg',
      badge: template.badge || '/fixitquick-logo.jpg',
      actions: template.actions?.map(action => ({
        ...action,
        icon: action.icon || '/fixitquick-logo.jpg'
      })) || []
    };
  }
  
  // Secure fallback template with guaranteed assets
  return {
    title: 'FixitQuick Notification',
    icon: '/fixitquick-logo.jpg', // Use guaranteed existing asset
    badge: '/fixitquick-logo.jpg',
    vibrate: [100, 50, 100],
    actions: [
      { action: 'view', title: '👁️ View', icon: '/fixitquick-logo.jpg' }
    ]
  };
}

// Enhanced Notification click handling with action buttons and provider routing
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data;
  const action = event.action;
  
  console.log('Notification clicked:', action, notificationData);
  
  // Save the action to IndexedDB for analytics and sync
  if (notificationData?.notificationId) {
    saveActionToDB(notificationData.notificationId, action || 'click', {
      timestamp: Date.now(),
      notificationData
    });
  }
  
  event.waitUntil(handleNotificationClick(action, notificationData));
});

async function handleNotificationClick(action, notificationData) {
  try {
    const providerType = notificationData?.providerType;
    const type = notificationData?.type;
    const orderId = notificationData?.orderId || notificationData?.jobId;
    const bookingId = notificationData?.bookingId;
    
    let targetUrl = '/';
    let shouldOpenWindow = true;
    
    // Handle different action types
    switch (action) {
      // Service Provider Actions
      case 'accept':
        if (providerType === 'service_provider') {
          targetUrl = `/provider/dashboard?action=accept&id=${orderId || bookingId}&notification=${notificationData?.notificationId || ''}`;
          // SECURITY FIX: Remove direct API call, let app handle with proper auth
        }
        break;
        
      case 'decline':
        if (providerType === 'service_provider') {
          targetUrl = `/provider/dashboard?action=decline&id=${orderId || bookingId}&notification=${notificationData?.notificationId || ''}`;
          // SECURITY FIX: Remove direct API call, let app handle with proper auth
        }
        break;
        
      case 'accept_emergency':
        if (providerType === 'service_provider') {
          targetUrl = `/provider/dashboard?action=accept_emergency&id=${orderId || bookingId}&notification=${notificationData?.notificationId || ''}`;
          // SECURITY FIX: Remove direct API call, let app handle with proper auth
        }
        break;
        
      // Parts Provider Actions
      case 'accept_order':
        if (providerType === 'parts_provider') {
          targetUrl = `/parts-provider/dashboard?action=accept_order&id=${orderId}&notification=${notificationData?.notificationId || ''}`;
          // SECURITY FIX: Remove direct API call, let app handle with proper auth
        }
        break;
        
      case 'check_stock':
        if (providerType === 'parts_provider') {
          targetUrl = `/parts-provider/dashboard?tab=inventory&highlight=${notificationData?.partId || ''}`;
        }
        break;
        
      case 'restock':
        if (providerType === 'parts_provider') {
          targetUrl = `/parts-provider/dashboard?tab=inventory&action=restock&id=${notificationData?.partId || ''}`;
        }
        break;
        
      case 'view_inventory':
        if (providerType === 'parts_provider') {
          targetUrl = `/parts-provider/dashboard?tab=inventory`;
        }
        break;
        
      // Common Actions
      case 'view':
      case 'view_update':
        if (providerType === 'service_provider') {
          targetUrl = orderId ? `/provider/orders/${orderId}` : '/provider/dashboard';
        } else if (providerType === 'parts_provider') {
          targetUrl = orderId ? `/parts-provider/orders/${orderId}` : '/parts-provider/dashboard';
        } else {
          targetUrl = orderId ? `/orders/${orderId}` : '/dashboard';
        }
        break;
        
      case 'reply':
      case 'respond':
        if (providerType === 'service_provider') {
          targetUrl = `/provider/orders/${orderId}?tab=chat`;
        } else {
          targetUrl = `/chat/${notificationData?.chatId || orderId}`;
        }
        break;
        
      case 'view_payment':
        targetUrl = `/wallet?highlight=${notificationData?.paymentId || ''}`;
        break;
        
      case 'view_chat':
        targetUrl = `/chat/${notificationData?.chatId || orderId}`;
        break;
        
      default:
        // Default action based on provider type
        if (providerType === 'service_provider') {
          targetUrl = '/provider/dashboard';
        } else if (providerType === 'parts_provider') {
          targetUrl = '/parts-provider/dashboard';
        } else {
          targetUrl = '/dashboard';
        }
    }
    
    if (shouldOpenWindow) {
      // Try to focus existing window first
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          // Focus existing window and navigate
          client.focus();
          client.postMessage({
            type: 'notification_action',
            action,
            targetUrl,
            notificationData
          });
          return;
        }
      }
      
      // No existing window found, open new one
      await clients.openWindow(targetUrl);
    }
    
  } catch (error) {
    console.error('Error handling notification click:', error);
    // Fallback to opening main dashboard
    await clients.openWindow('/dashboard');
  }
}

// SECURITY FIX: Removed unsafe handleJobResponse and handleOrderResponse functions
// These functions made direct API calls without proper authentication
// All notification actions now route to the app which handles API calls with proper auth

// Store notification action for the app to process with proper authentication
async function storeNotificationAction(action, targetId, notificationData) {
  try {
    const actionData = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      targetId,
      notificationId: notificationData?.notificationId,
      providerType: notificationData?.providerType,
      type: notificationData?.type,
      timestamp: Date.now(),
      processed: false
    };
    
    // Store in IndexedDB for the app to pick up and process
    const db = await openNotificationDB();
    const transaction = db.transaction(['notificationActions'], 'readwrite');
    const store = transaction.objectStore('notificationActions');
    
    await store.put(actionData);
    console.log('Notification action stored for app processing:', action, targetId);
    
    return actionData;
  } catch (error) {
    console.error('Error storing notification action:', error);
    return null;
  }
}

// Queue actions for offline sync
async function queueOfflineAction(actionData) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');
    
    const offlineAction = {
      ...actionData,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };
    
    await store.add(offlineAction);
    console.log('Action queued for offline sync:', actionData.type, actionData.action);
  } catch (error) {
    console.error('Error queuing offline action:', error);
  }
}

// SECURITY FIX: Removed unsafe background sync functions
// These functions made direct API calls without proper authentication
// Background sync should be handled by the app with proper auth tokens

// Safe background sync - only store data, let app handle API calls
async function storeOfflineData(type, data) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['offlineActions'], 'readwrite');
    const store = transaction.objectStore('offlineActions');
    
    const offlineData = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    };
    
    await store.put(offlineData);
    console.log('Offline data stored for app sync:', type);
    
    return offlineData;
  } catch (error) {
    console.error('Error storing offline data:', error);
    return null;
  }
}

// Signal app to process offline sync when online
async function requestAppSync() {
  try {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    for (const client of windowClients) {
      if (client.url.includes(self.location.origin)) {
        client.postMessage({
          type: 'sync_request',
          timestamp: Date.now()
        });
      }
    }
  } catch (error) {
    console.error('Error requesting app sync:', error);
  }
}

// IndexedDB helpers (simplified)
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixitQuickDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offlineOrders')) {
        db.createObjectStore('offlineOrders', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('offlineMessages')) {
        db.createObjectStore('offlineMessages', { keyPath: 'id' });
      }
    };
  });
}

function getOfflineOrders(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineOrders'], 'readonly');
    const store = transaction.objectStore('offlineOrders');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getOfflineMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineMessages'], 'readonly');
    const store = transaction.objectStore('offlineMessages');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeOfflineOrder(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineOrders'], 'readwrite');
    const store = transaction.objectStore('offlineOrders');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function removeOfflineMessage(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineMessages'], 'readwrite');
    const store = transaction.objectStore('offlineMessages');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('Service Worker loaded successfully');
