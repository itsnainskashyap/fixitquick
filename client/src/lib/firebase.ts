// Enhanced Firebase Client SDK for Google Authentication and Push Notifications
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';
import { 
  getAuth, 
  User, 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  UserCredential 
} from 'firebase/auth';

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

// Enhanced Google Authentication Implementation
const googleProvider = new GoogleAuthProvider();
// Configure Google Auth provider for provider registration
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Enhanced Google Sign-In for Provider Registration
export const signInWithGoogleForProviders = async (providerType: 'service_provider' | 'parts_provider' = 'service_provider'): Promise<UserCredential | null> => {
  try {
    if (!isFirebaseAvailable || !auth) {
      console.log('⚠️ Firebase not available, using mock authentication for development');
      // Return mock credential for development
      return createMockUserCredential(providerType);
    }

    console.log(`🔑 Starting Google Sign-In for ${providerType}...`);
    
    // Try popup first, fallback to redirect
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google Sign-In successful (popup):', result.user.email);
      
      // Store provider type preference
      localStorage.setItem('pending_provider_type', providerType);
      localStorage.setItem('auth_method', 'google_popup');
      
      return result;
    } catch (popupError: any) {
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
        console.log('🔄 Popup blocked, falling back to redirect authentication...');
        
        // Store provider type for after redirect
        localStorage.setItem('pending_provider_type', providerType);
        localStorage.setItem('auth_method', 'google_redirect');
        
        await signInWithRedirect(auth, googleProvider);
        return null; // Will be handled by redirect result
      } else {
        throw popupError;
      }
    }
  } catch (error: any) {
    console.error('❌ Google Sign-In failed:', error);
    throw new Error(`Google Sign-In failed: ${error.message}`);
  }
};

// Handle redirect result for Google authentication
export const handleGoogleRedirectResult = async (): Promise<UserCredential | null> => {
  try {
    if (!isFirebaseAvailable || !auth) {
      console.log('⚠️ Firebase not available, skipping redirect result handling');
      return null;
    }

    const result = await getRedirectResult(auth);
    if (result) {
      console.log('✅ Google Sign-In redirect successful:', result.user.email);
      
      // Clear redirect tracking
      localStorage.removeItem('auth_method');
      
      return result;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error handling Google redirect result:', error);
    localStorage.removeItem('auth_method');
    localStorage.removeItem('pending_provider_type');
    throw error;
  }
};

// Enhanced sign out for providers
export const signOutProvider = async (): Promise<void> => {
  try {
    if (!isFirebaseAvailable || !auth) {
      console.log('Mock: Signing out provider');
      
      // Clear all auth-related localStorage
      localStorage.removeItem('pending_provider_type');
      localStorage.removeItem('auth_method');
      localStorage.removeItem('provider_registration_data');
      
      // Trigger auth state change for mock
      if (authStateChangeCallback) {
        setTimeout(() => authStateChangeCallback!(null), 100);
      }
      return;
    }

    await firebaseSignOut(auth);
    
    // Clear provider-related data
    localStorage.removeItem('pending_provider_type');
    localStorage.removeItem('auth_method');
    localStorage.removeItem('provider_registration_data');
    
    console.log('✅ Provider signed out successfully');
  } catch (error) {
    console.error('❌ Error signing out provider:', error);
    throw error;
  }
};

// Auth state observer for provider registration
let authStateChangeCallback: ((user: User | null) => void) | null = null;

export const onProviderAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  try {
    if (!isFirebaseAvailable || !auth) {
      console.log('Mock: Setting up provider auth state observer');
      authStateChangeCallback = callback;
      
      // Mock initial state
      setTimeout(() => {
        const mockUser = localStorage.getItem('mock_provider_user');
        callback(mockUser ? JSON.parse(mockUser) : null);
      }, 100);
      
      return () => {
        authStateChangeCallback = null;
      };
    }

    console.log('✅ Setting up Firebase provider auth state observer');
    return onAuthStateChanged(auth, (user) => {
      console.log('🔄 Provider auth state changed:', user?.email || 'signed out');
      callback(user);
    });
  } catch (error) {
    console.error('❌ Error setting up auth state observer:', error);
    return () => {};
  }
};

// Helper function to create mock user credential for development
const createMockUserCredential = (providerType: string): UserCredential => {
  const mockUser = {
    uid: `mock-${providerType}-${Date.now()}`,
    email: `${providerType}@mock.com`,
    displayName: `Mock ${providerType.replace('_', ' ')} User`,
    photoURL: 'https://via.placeholder.com/150',
    phoneNumber: null,
    providerId: 'google.com',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    },
    providerData: [{
      providerId: 'google.com',
      uid: `google-mock-${Date.now()}`,
      displayName: `Mock ${providerType.replace('_', ' ')} User`,
      email: `${providerType}@mock.com`,
      phoneNumber: null,
      photoURL: 'https://via.placeholder.com/150'
    }],
    refreshToken: `mock-refresh-token-${Date.now()}`,
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => `mock-id-token-${Date.now()}`,
    getIdTokenResult: async () => ({
      token: `mock-id-token-${Date.now()}`,
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'google.com',
      claims: {
        email: `${providerType}@mock.com`,
        email_verified: true,
        name: `Mock ${providerType.replace('_', ' ')} User`,
        picture: 'https://via.placeholder.com/150'
      }
    } as any),
    reload: async () => {},
    toJSON: () => ({})
  } as User;

  // Store mock user for persistence
  localStorage.setItem('mock_provider_user', JSON.stringify({
    uid: mockUser.uid,
    email: mockUser.email,
    displayName: mockUser.displayName,
    photoURL: mockUser.photoURL
  }));

  return {
    user: mockUser,
    providerId: 'google.com',
    operationType: 'signIn'
  } as UserCredential;
};

// Get current provider authentication state
export const getCurrentProviderUser = (): User | null => {
  if (!isFirebaseAvailable || !auth) {
    const mockUser = localStorage.getItem('mock_provider_user');
    return mockUser ? JSON.parse(mockUser) : null;
  }
  
  return auth.currentUser;
};

// Check if user is currently in provider registration flow
export const isInProviderRegistrationFlow = (): boolean => {
  return !!(localStorage.getItem('pending_provider_type') || 
           localStorage.getItem('provider_registration_data'));
};

// Get provider type from storage
export const getPendingProviderType = (): 'service_provider' | 'parts_provider' | null => {
  return localStorage.getItem('pending_provider_type') as 'service_provider' | 'parts_provider' | null;
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