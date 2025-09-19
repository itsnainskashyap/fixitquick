import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Feature flag for i18n initialization
const I18N_ENABLED = import.meta.env.VITE_I18N_ENABLED === 'true';

// Conditionally initialize i18n
if (I18N_ENABLED) {
  import("./lib/i18n").catch(console.error);
}

// PRODUCTION FIX: Add proper service worker registration with error handling
async function registerServiceWorker() {
  // Only register service worker in production or when explicitly enabled
  const isProduction = import.meta.env.PROD;
  const forceServiceWorker = import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true';
  
  if (!isProduction && !forceServiceWorker) {
    console.log('🔧 Service worker registration skipped in development');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      console.log('🔄 Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('✅ Service worker registered successfully:', registration.scope);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          console.log('🔄 New service worker found, updating...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New service worker installed, ready to take control');
              
              // Show update notification to user
              if (window.confirm('A new version is available. Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for service worker messages (for notification actions)
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, action, targetUrl, notificationData } = event.data;
        
        if (type === 'notification_action') {
          console.log('📱 Notification action received:', action, targetUrl);
          
          // Handle notification-triggered navigation
          if (targetUrl && targetUrl !== window.location.pathname) {
            window.location.href = targetUrl;
          }
        } else if (type === 'sync_request') {
          console.log('🔄 Sync request from service worker');
          // Trigger any pending syncs in the app
          window.dispatchEvent(new CustomEvent('sw-sync-request'));
        }
      });

      // Check for waiting service worker and activate immediately
      if (registration.waiting) {
        console.log('⏳ Service worker is waiting to activate');
        // Could show a banner to user to refresh or skip waiting
      }

      return registration;
    } catch (error) {
      console.error('❌ Service worker registration failed:', error);
      
      // Enhanced error handling for production debugging
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          console.error('💡 Check that /sw.js exists in the public directory');
        } else if (error.message.includes('network')) {
          console.error('💡 Network error during registration, retrying...');
          // Retry registration after a delay
          setTimeout(() => registerServiceWorker(), 5000);
        } else if (error.message.includes('SecurityError')) {
          console.error('💡 HTTPS required for service worker in production');
        }
      }
      
      throw error;
    }
  } else {
    console.warn('⚠️ Service workers are not supported in this browser');
    return null;
  }
}

// Register service worker after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker().catch((error) => {
    console.error('Failed to register service worker:', error);
  });
});

createRoot(document.getElementById("root")!).render(<App />);
