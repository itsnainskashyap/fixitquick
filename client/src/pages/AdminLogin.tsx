import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2,
  Lock,
  Mail,
  KeyRound
} from 'lucide-react';

// Admin login validation schema
const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email/Username is required')
    .max(100, 'Email/Username cannot exceed 100 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthRefreshing, setIsAuthRefreshing] = useState(false);
  const { toast } = useToast();
  const { refreshUser, user, isLoading } = useAuth();

  const form = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Helper function to verify admin authentication
  const verifyAdminAuth = async (maxAttempts = 10, delay = 200): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      await refreshUser();
      
      // Check if user is loaded and has admin role
      if (user && user.role === 'admin') {
        console.log('✅ Admin auth verified:', user.role);
        return true;
      }
      
      console.log(`🔄 Admin auth check ${attempt + 1}/${maxAttempts}, user:`, user);
    }
    
    console.log('❌ Admin auth verification failed after', maxAttempts, 'attempts');
    return false;
  };

  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: AdminLoginForm) => {
      return apiRequest('POST', '/api/admin/login', credentials);
    },
    onSuccess: async (data) => {
      console.log('🔐 Admin login successful:', data);
      setIsAuthRefreshing(true);
      
      try {
        // Token is now stored in secure HttpOnly cookie by the server
        console.log('🔐 Admin authenticated via secure cookie');
        
        // Wait for auth state to be properly updated with admin role
        const isAdminVerified = await verifyAdminAuth();
        
        if (isAdminVerified) {
          toast({
            title: 'Welcome, Administrator',
            description: 'You have successfully logged in to the admin panel.',
            duration: 3000,
          });
          
          // Small delay to ensure UI updates before redirect
          setTimeout(() => {
            console.log('🔄 Redirecting to admin panel...');
            setLocation('/admin');
          }, 100);
        } else {
          throw new Error('Failed to verify admin authentication. Please try again.');
        }
      } catch (error) {
        console.error('❌ Admin auth verification error:', error);
        setLoginError(error instanceof Error ? error.message : 'Authentication verification failed');
        
        toast({
          title: 'Authentication Error',
          description: 'Failed to verify admin credentials. Please try again.',
          variant: 'destructive',
          duration: 5000,
        });
      } finally {
        setIsAuthRefreshing(false);
      }
    },
    onError: (error: any) => {
      console.error('❌ Admin login error:', error);
      setIsAuthRefreshing(false);
      
      const errorMessage = error?.message || 'Login failed. Please check your credentials.';
      setLoginError(errorMessage);
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const onSubmit = async (data: AdminLoginForm) => {
    setLoginError('');
    
    // Send credentials to server for secure validation
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Secure access to FixitQuick administration
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Administrator Login
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Alert */}
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {/* Login Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email Field */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">
                          Administrator Email/Username
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Enter admin email or username"
                              className="pl-10 h-12 bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                              disabled={loginMutation.isPending || isAuthRefreshing}
                              data-testid="input-admin-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Field */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-200 font-medium">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter admin password"
                              className="pl-10 pr-12 h-12 bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                              disabled={loginMutation.isPending || isAuthRefreshing}
                              data-testid="input-admin-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              disabled={loginMutation.isPending || isAuthRefreshing}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={loginMutation.isPending || isAuthRefreshing}
                    data-testid="button-admin-login"
                  >
                    {loginMutation.isPending || isAuthRefreshing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isAuthRefreshing ? 'Verifying Admin Access...' : 'Authenticating...'}
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Access Admin Panel
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Security Notice */}
              <motion.div 
                className="pt-4 border-t border-gray-100 dark:border-slate-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>Secure administrator access only</span>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="text-center text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p>© 2025 FixitQuick. All rights reserved.</p>
          <p className="mt-1">Unauthorized access is strictly prohibited.</p>
        </motion.div>
      </div>
    </div>
  );
}