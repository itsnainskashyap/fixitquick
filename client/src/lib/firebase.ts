// Mock Firebase Client SDK - stub for development without API keys
console.log('Using Firebase client stub - no real Firebase connection');

// Mock User type
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Mock Firebase services
export const auth = {
  currentUser: null as User | null,
  signInWithGoogle: async (): Promise<User> => {
    console.log('Mock: Signing in with Google');
    const mockUser: User = {
      uid: 'mock-user-' + Date.now(),
      email: 'user@mock.com',
      displayName: 'Mock User',
      photoURL: 'https://via.placeholder.com/150'
    };
    auth.currentUser = mockUser;
    return mockUser;
  }
};

export const db = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => ({
        exists: () => true,
        data: () => ({ id, createdAt: new Date() })
      }),
      set: async (data: any) => console.log('Mock: Setting document', id, data),
      update: async (data: any) => console.log('Mock: Updating document', id, data),
      delete: async () => console.log('Mock: Deleting document', id)
    }),
    add: async (data: any) => {
      console.log('Mock: Adding document to collection', name, data);
      return { id: 'mock-id-' + Date.now() };
    },
    where: () => ({
      get: async () => ({
        docs: []
      })
    })
  })
};

export const storage = {
  ref: (path: string) => ({
    put: async (file: File) => {
      console.log('Mock: Uploading file to', path);
      return {
        ref: {
          getDownloadURL: async () => 'https://mock-storage.com/' + path
        }
      };
    },
    delete: async () => console.log('Mock: Deleting file', path),
    getDownloadURL: async () => 'https://mock-storage.com/' + path
  })
};

export const messaging = {
  getToken: async () => {
    console.log('Mock: Getting FCM token');
    return 'mock-fcm-token';
  },
  onMessage: (callback: (payload: any) => void) => {
    console.log('Mock: Setting up message listener');
    return () => console.log('Mock: Unsubscribing from messages');
  }
};

// Auth functions
export const signInWithGoogle = async (): Promise<User> => {
  console.log('Mock: Signing in with Google');
  const mockUser: User = {
    uid: 'mock-user-' + Date.now(),
    email: 'user@mock.com', 
    displayName: 'Mock User',
    photoURL: 'https://via.placeholder.com/150'
  };
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  auth.currentUser = mockUser;
  
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
  
  auth.currentUser = null;
  
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
    console.log('Mock: Triggering auth state change with user:', auth.currentUser);
    callback(auth.currentUser);
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