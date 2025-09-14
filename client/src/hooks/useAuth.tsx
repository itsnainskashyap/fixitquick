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
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
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

  // Keep signInWithSMS for compatibility with existing SMS auth flow
  const signInWithSMS = async (accessToken: string, refreshToken: string, userData?: any) => {
    // Store access token for API requests (if needed for SMS flow)
    localStorage.setItem('accessToken', accessToken);
    
    // Refresh user data
    await refetch();
  };

  const value = {
    user: user || null,
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