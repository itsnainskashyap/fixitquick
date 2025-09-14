import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User } from '@/lib/firebase';
import { onAuthStateChange, signInWithGoogle, signOutUser } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

interface AuthUser extends User {
  // Additional backend properties
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'user' | 'service_provider' | 'parts_provider' | 'admin';
  isVerified?: boolean;
  walletBalance?: string; // Backend returns as string
  fixiPoints?: number;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    area?: string;
    address: string;
    pincode?: string;
  };
  profileImageUrl?: string;
  isActive?: boolean;
  createdAt?: string | Date;
  lastLoginAt?: string | Date;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInWithSMS: (accessToken: string, refreshToken: string, userData?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Setting up auth state listener');
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('useAuth: Auth state changed, user:', firebaseUser);
      setIsLoading(true);
      
      if (firebaseUser) {
        console.log('useAuth: User is authenticated, fetching backend data');
        try {
          // Get additional user data from our backend
          const response = await apiRequest('GET', '/api/v1/auth/user');
          const userData = await response.json();
          
          setUser({ ...firebaseUser, ...userData });
          console.log('useAuth: Set authenticated user with backend data');
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(firebaseUser as AuthUser);
          console.log('useAuth: Set authenticated user without backend data');
        }
      } else {
        console.log('useAuth: No user, setting to null');
        setUser(null);
      }
      
      console.log('useAuth: Setting isLoading to false');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setIsLoading(true);
      const firebaseUser = await signInWithGoogle();
      
      if (firebaseUser) {
        // Send user data to backend to create/update user record
        try {
          await apiRequest('POST', '/api/v1/auth/login', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        } catch (error) {
          console.error('Error creating user record:', error);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await signOutUser();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const response = await apiRequest('GET', '/api/v1/auth/user');
        const userData = await response.json();
        setUser(prev => prev ? { ...prev, ...userData } : null);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  const signInWithSMS = async (accessToken: string, refreshToken: string, userData?: any) => {
    try {
      setIsLoading(true);
      
      // Store access token in localStorage for API requests
      localStorage.setItem('accessToken', accessToken);
      
      // Set user data from SMS auth response
      if (userData && userData.user) {
        setUser({
          ...userData.user,
          uid: userData.user.id,
          email: userData.user.email || null,
          displayName: `${userData.user.firstName || ''} ${userData.user.lastName || ''}`.trim() || null,
          photoURL: userData.user.profileImageUrl || null,
        } as AuthUser);
      } else {
        // Fallback: fetch user data using the access token
        try {
          const response = await apiRequest('GET', '/api/v1/auth/user');
          const userInfo = await response.json();
          setUser({
            ...userInfo,
            uid: userInfo.id,
            email: userInfo.email || null,
            displayName: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || null,
            photoURL: userInfo.profileImageUrl || null,
          } as AuthUser);
        } catch (error) {
          console.error('Error fetching user data after SMS auth:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('SMS sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshUser,
    signInWithSMS,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
