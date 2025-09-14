import { useContext, createContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  signInWithSMS: (accessToken: string, refreshToken: string, userData?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Enhanced auth query with better error handling for dev environments
  const { data: user, isLoading, refetch, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // In development, try dev endpoints if regular auth fails
    retryOnMount: false,
    // Better error handling for development
    onError: (error) => {
      if (import.meta.env.DEV && error instanceof Error) {
        console.log('💡 Auth error in dev mode:', error.message);
        console.log('💡 Consider using dev auth: POST /api/dev/login/:userId');
      }
    },
  });

  const signIn = () => {
    // Redirect to Replit Auth login endpoint
    window.location.href = "/api/login";
  };

  const signOut = () => {
    // Redirect to Replit Auth logout endpoint
    window.location.href = "/api/logout";
  };

  const refreshUser = async () => {
    await refetch();
  };

  // Enhanced signInWithSMS with better token handling
  const signInWithSMS = async (accessToken: string, refreshToken: string, userData?: any) => {
    try {
      // Store access token for API requests
      localStorage.setItem('accessToken', accessToken);
      
      // Enhanced logging for development
      if (import.meta.env.DEV) {
        console.log('🔐 SMS auth successful:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUserData: !!userData,
          tokenType: accessToken?.startsWith('dev-token') ? 'dev' : 'production'
        });
      }
      
      // Refresh user data
      await refetch();
    } catch (error) {
      console.error('Error during SMS sign in:', error);
      throw error;
    }
  };
  
  // Enhanced sign out with token cleanup
  const enhancedSignOut = () => {
    // Clear stored tokens
    localStorage.removeItem('accessToken');
    
    if (import.meta.env.DEV) {
      console.log('🔐 Signing out and clearing tokens');
    }
    
    // Redirect to logout endpoint
    window.location.href = "/api/logout";
  };

  const value = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut: enhancedSignOut,
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