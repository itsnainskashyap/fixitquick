// Mock Firebase Admin SDK - stub for development without API keys
if (process.env.NODE_ENV === 'production') {
  console.warn('🚨 PRODUCTION WARNING: Using Firebase stub instead of real Firebase connection. Configure FIREBASE_SERVICE_ACCOUNT for production!');
} else {
  console.log('🔧 Development mode: Using Firebase stub - no real Firebase connection');
}

interface MockDocSnapshot {
  exists: boolean;
  data: () => any;
  ref: any;
}

interface MockQuerySnapshot {
  docs: MockDocSnapshot[];
  size: number;
}

interface MockBatch {
  update: (docRef: any, data: any) => void;
  set: (docRef: any, data: any) => void;
  delete: (docRef: any) => void;
  commit: () => Promise<void>;
}

interface MockWhereQuery {
  where: (field: string, operator: string, value: any) => MockWhereQuery;
  limit: (count: number) => MockWhereQuery;
  get: () => Promise<MockQuerySnapshot>;
}

interface MockCollection {
  doc: (id: string) => MockDoc;
  add: (data: any) => Promise<{ id: string; }>;
  where: (field: string, operator: string, value: any) => MockWhereQuery;
  limit: (count: number) => MockWhereQuery;
  get: () => Promise<MockQuerySnapshot>;
}

interface MockDoc {
  set: (data: any, options?: any) => Promise<{ id: string; }>;
  get: () => Promise<MockDocSnapshot>;
  update: (data: any) => Promise<{ id: string; }>;
  delete: () => Promise<{ id: string; }>;
  ref: any;
}

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
  collection: (name: string): MockCollection => ({
    doc: (id: string): MockDoc => ({
      set: async (data: any, options?: any) => ({ id }),
      get: async (): Promise<MockDocSnapshot> => ({
        exists: true,
        data: () => ({ 
          id, 
          createdAt: new Date(),
          // Add common properties that notifications service expects
          phone: '+1234567890',
          firstName: 'Mock',
          lastName: 'User',
          userId: id
        }),
        ref: { id }
      }),
      update: async (data: any) => ({ id }),
      delete: async () => ({ id }),
      ref: { id }
    }),
    add: async (data: any) => ({ id: 'mock-id-' + Date.now() }),
    where: function (field: string, operator: string, value: any): MockWhereQuery {
      const self = this;
      return {
        where: function (field: string, operator: string, value: any): MockWhereQuery {
          return self.where(field, operator, value);
        },
        limit: function (count: number): MockWhereQuery {
          return {
            where: function (field: string, operator: string, value: any): MockWhereQuery {
              return self.where(field, operator, value);
            },
            limit: function (count: number): MockWhereQuery {
              return self.limit(count);
            },
            get: async (): Promise<MockQuerySnapshot> => ({
              docs: [], // Empty for mock
              size: 0
            })
          };
        },
        get: async (): Promise<MockQuerySnapshot> => ({
          docs: [], // Empty for mock
          size: 0
        })
      };
    },
    limit: (count: number): MockWhereQuery => ({
      where: function (field: string, operator: string, value: any): MockWhereQuery {
        return arguments.callee as any;
      },
      limit: function (count: number): MockWhereQuery {
        return arguments.callee as any;
      },
      get: async (): Promise<MockQuerySnapshot> => ({
        docs: [], // Empty for mock
        size: 0
      })
    }),
    get: async (): Promise<MockQuerySnapshot> => ({
      docs: [], // Empty for mock
      size: 0
    })
  }),
  batch: (): MockBatch => ({
    update: (docRef: any, data: any) => {
      console.log('Mock batch update:', docRef.id, data);
    },
    set: (docRef: any, data: any) => {
      console.log('Mock batch set:', docRef.id, data);
    },
    delete: (docRef: any) => {
      console.log('Mock batch delete:', docRef.id);
    },
    commit: async () => {
      console.log('Mock batch commit');
    }
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
  send: async (message: any) => ({ 
    messageId: 'mock-message-id',
    success: true 
  }),
  sendMulticast: async (message: any) => ({ 
    responses: message.tokens ? message.tokens.map((token: string, idx: number) => ({ 
      messageId: `mock-message-${idx}`,
      success: true
    })) : [{ messageId: 'mock-message-id', success: true }],
    successCount: message.tokens ? message.tokens.length : 1,
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
    responses: tokens.map(token => ({ messageId: 'mock-msg-' + Date.now(), success: true })),
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
  return { ...userData };
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