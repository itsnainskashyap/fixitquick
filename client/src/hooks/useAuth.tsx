import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User } from '@/lib/firebase';
import { onAuthStateChange, signInWithGoogle, signOutUser } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

interface AuthUser extends User {
  role?: 'user' | 'service_provider' | 'parts_provider' | 'admin';
  isVerified?: boolean;
  walletBalance?: number;
  fixiPoints?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        try {
          // Get additional user data from our backend
          const response = await apiRequest('GET', '/api/v1/auth/user');
          const userData = await response.json();
          
          setUser({ ...firebaseUser, ...userData });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(firebaseUser as AuthUser);
        }
      } else {
        setUser(null);
      }
      
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

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshUser,
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
