// Mock Firebase Admin SDK - stub for development without API keys
console.log('Using Firebase stub - no real Firebase connection');

// Mock implementations
export const firebaseAdmin = {
  apps: { length: 1 }
};

export const auth = {
  verifyIdToken: async (idToken: string) => ({
    uid: 'mock-user-id',
    email: 'mock@example.com',
    name: 'Mock User'
  }),
  createCustomToken: async (uid: string, claims?: object) => 'mock-custom-token'
};

export const db = {
  collection: (name: string) => ({
    doc: (id: string) => ({
      set: async (data: any) => ({ id }),
      get: async () => ({
        exists: true,
        data: () => ({ id, ...data, createdAt: new Date() })
      }),
      update: async (data: any) => ({ id }),
      delete: async () => ({ id })
    }),
    add: async (data: any) => ({ id: 'mock-id-' + Date.now() }),
    where: () => ({
      get: async () => ({
        docs: []
      })
    })
  })
};

export const storage = {
  bucket: () => ({
    file: (path: string) => ({
      save: async (data: any) => ({ path }),
      delete: async () => ({ path }),
      getSignedUrl: async () => ['https://mock-url.com/file']
    })
  })
};

export const messaging = {
  send: async (message: any) => ({ messageId: 'mock-message-id' }),
  sendMulticast: async (message: any) => ({ 
    responses: [{ messageId: 'mock-message-id' }],
    successCount: 1,
    failureCount: 0
  })
};

// Utility functions - Mock implementations
export const verifyIdToken = async (idToken: string) => {
  console.log('Mock: Verifying token:', idToken);
  return {
    uid: 'mock-user-' + Date.now(),
    email: 'user@mock.com',
    name: 'Mock User'
  };
};

export const createCustomToken = async (uid: string, additionalClaims?: object) => {
  console.log('Mock: Creating custom token for uid:', uid);
  return 'mock-custom-token-' + uid;
};

export const sendNotification = async (tokens: string[], payload: {
  title: string;
  body: string;
  data?: Record<string, string>;
}) => {
  console.log('Mock: Sending notification to tokens:', tokens.length, 'payload:', payload);
  return {
    responses: tokens.map(token => ({ messageId: 'mock-msg-' + Date.now() })),
    successCount: tokens.length,
    failureCount: 0
  };
};

export const uploadFile = async (buffer: Buffer, fileName: string, folder?: string) => {
  console.log('Mock: Uploading file:', fileName, 'to folder:', folder);
  const filePath = folder ? `${folder}/${fileName}` : fileName;
  return `https://mock-storage.com/${filePath}`;
};

export const deleteFile = async (filePath: string) => {
  console.log('Mock: Deleting file:', filePath);
  return { success: true };
};

// User management functions
export const createUser = async (userData: {
  uid: string;
  email: string;
  displayName: string;
  role?: string;
}) => {
  console.log('Mock: Creating user:', userData);
  return { uid: userData.uid, ...userData };
};

export const updateUser = async (uid: string, userData: any) => {
  console.log('Mock: Updating user:', uid, userData);
  return { uid, ...userData };
};

export const deleteUser = async (uid: string) => {
  console.log('Mock: Deleting user:', uid);
  return { uid };
};

export const getUserByEmail = async (email: string) => {
  console.log('Mock: Getting user by email:', email);
  return {
    uid: 'mock-user-' + Date.now(),
    email,
    displayName: 'Mock User'
  };
};