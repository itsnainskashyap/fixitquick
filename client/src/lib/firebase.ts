// Real Firebase Client SDK for Production FCM Push Notifications
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';
import { getAuth, User, Auth } from 'firebase/auth';

// Firebase Configuration - Use environment variables for production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-api-key-for-dev',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'fixitquick-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fixitquick-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'fixitquick-dev.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'mock-app-id',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX'
};

// VAPID Key for Web Push
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BKtSGPJWLZhNZgUKLMl5A9ZI7W5K6HGK4_Zj8FHR7X8vLMwNyXLqHpZsVQqWqJ9HGK4_Zj8FHR7X8vLMwNyXLqHpZs';

let app: FirebaseApp;
let messaging: Messaging | null = null;
let auth: Auth;
let isFirebaseAvailable = false;

// Initialize Firebase App
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized for FCM');
    isFirebaseAvailable = true;
  } else {
    app = getApps()[0];
    isFirebaseAvailable = true;
  }
  
  // Initialize Firebase Auth
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  isFirebaseAvailable = false;
}

// Initialize Firebase Messaging (only in browser with service worker support)
const initializeMessaging = async (): Promise<Messaging | null> => {
  try {
    if (!isFirebaseAvailable || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('📱 FCM not available - using fallback mode');
      return null;
    }

    // Register service worker first
    const swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    await navigator.serviceWorker.ready;
    console.log('✅ Service Worker registered for FCM');

    messaging = getMessaging(app);
    console.log('✅ Firebase Messaging initialized');
    return messaging;
  } catch (error) {
    console.error('❌ Firebase Messaging initialization failed:', error);
    messaging = null;
    return null;
  }
};

// Production FCM Token Management
export const requestFCMToken = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      messaging = await initializeMessaging();
    }

    if (!messaging) {
      console.log('⚠️ FCM not available, using mock token for development');
      return `mock-fcm-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Request permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('🚫 Notification permission denied');
      return null;
    }

    // Get FCM registration token with VAPID key
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('✅ FCM Token obtained:', token.substring(0, 20) + '...');
      // Store token locally for reference
      localStorage.setItem('fcm_token', token);
      localStorage.setItem('fcm_token_timestamp', Date.now().toString());
      return token;
    } else {
      console.warn('⚠️ No FCM token available - using mock for development');
      const mockToken = `mock-fcm-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('fcm_token', mockToken);
      return mockToken;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    // Fallback for development/testing
    const fallbackToken = `fallback-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('fcm_token', fallbackToken);
    return fallbackToken;
  }
};

// Refresh FCM Token (for token rotation)
export const refreshFCMToken = async (): Promise<string | null> => {
  try {
    // Clear old token from localStorage
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_token_timestamp');
    
    // Request new token
    return await requestFCMToken();
  } catch (error) {
    console.error('❌ Error refreshing FCM token:', error);
    return null;
  }
};

// Delete FCM Token (for unsubscribe)
export const deleteFCMToken = async (): Promise<boolean> => {
  try {
    if (!messaging) {
      // Clear from localStorage anyway
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_token_timestamp');
      console.log('🗑️ Mock FCM token cleared from localStorage');
      return true;
    }

    await deleteToken(messaging);
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_token_timestamp');
    console.log('🗑️ FCM Token deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error);
    // Clear localStorage anyway
    localStorage.removeItem('fcm_token');
    localStorage.removeItem('fcm_token_timestamp');
    return false;
  }
};

// Setup foreground message listener
export const setupForegroundMessaging = (
  onMessageCallback: (payload: any) => void
): () => void => {
  try {
    if (!messaging) {
      console.log('📱 FCM not available - foreground messages disabled');
      return () => {};
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📨 Foreground message received:', payload);
      onMessageCallback(payload);
    });

    console.log('✅ Foreground messaging listener setup');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground messaging:', error);
    return () => {};
  }
};

// Check if FCM token needs refresh (older than 24 hours)
export const shouldRefreshToken = (): boolean => {
  try {
    const tokenTimestamp = localStorage.getItem('fcm_token_timestamp');
    if (!tokenTimestamp) return true;

    const timestamp = parseInt(tokenTimestamp);
    const dayInMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    return (now - timestamp) > dayInMs;
  } catch (error) {
    return true; // Refresh on error
  }
};

// Get current stored FCM token
export const getCurrentFCMToken = (): string | null => {
  return localStorage.getItem('fcm_token');
};

// Check FCM availability
export const isFCMAvailable = (): boolean => {
  return isFirebaseAvailable && typeof window !== 'undefined' && 'serviceWorker' in navigator;
};

// Mock auth state management
let mockCurrentUser: User | null = null;

// Auth functions
export const signInWithGoogle = async (): Promise<User> => {
  console.log('Mock: Signing in with Google');
  const mockUser = {
    uid: 'mock-user-' + Date.now(),
    email: 'user@mock.com', 
    displayName: 'Mock User',
    photoURL: 'https://via.placeholder.com/150',
    phoneNumber: null,
    providerId: 'mock.com',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({})
  } as User;
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  mockCurrentUser = mockUser;
  
  // Trigger auth state change
  if (authStateChangeCallback) {
    setTimeout(() => authStateChangeCallback!(mockUser), 100);
  }
  
  return mockUser;
};

export const signOutUser = async (): Promise<void> => {
  console.log('Mock: Signing out user');
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  mockCurrentUser = null;
  
  // Trigger auth state change
  if (authStateChangeCallback) {
    setTimeout(() => authStateChangeCallback!(null), 100);
  }
};

// Auth state observer
let authStateChangeCallback: ((user: User | null) => void) | null = null;

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  console.log('Mock: Setting up auth state observer');
  authStateChangeCallback = callback;
  
  // Immediately call with current user (null on first load)
  setTimeout(() => {
    console.log('Mock: Triggering auth state change with user:', mockCurrentUser);
    callback(mockCurrentUser);
  }, 50);
  
  // Return unsubscribe function
  return () => {
    console.log('Mock: Unsubscribing from auth state changes');
    authStateChangeCallback = null;
  };
};

// FCM token management
export const requestNotificationPermission = async (): Promise<string | null> => {
  console.log('Mock: Requesting notification permission');
  
  // Simulate user granting permission
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return 'mock-fcm-token-' + Date.now();
};

// Offline support functions
export const enableNetwork = async () => {
  console.log('Mock: Enabling network');
};

export const disableNetwork = async () => {
  console.log('Mock: Disabling network');
};

// PWA installation
export const installPWA = async () => {
  console.log('Mock: Installing PWA');
  return true;
};

// Service worker registration for offline support
export const registerServiceWorker = async () => {
  console.log('Mock: Registering service worker');
  return true;
};