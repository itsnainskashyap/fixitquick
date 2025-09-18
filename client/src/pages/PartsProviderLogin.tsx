import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowRight, Smartphone, Package, CheckCircle, Shield, TrendingUp } from 'lucide-react';
import PhoneLogin from '@/components/auth/PhoneLogin';
import OtpVerification from '@/components/auth/OtpVerification';
import Onboarding from '@/components/auth/Onboarding';
import LocationSetup from '@/components/LocationSetup';

type AuthStep = 'method-selection' | 'phone-input' | 'otp-verification' | 'onboarding' | 'location-setup';

export default function PartsProviderLogin() {
  const { signIn, signInWithSMS, isLoading, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<AuthStep>('method-selection');
  const [challengeId, setChallengeId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      if (user.role === 'parts_provider') {
        // Check if verified parts provider - go to dashboard
        setLocation('/parts-provider-dashboard');
      } else if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        // If authenticated but not a parts provider, redirect to registration
        toast({
          title: "Registration Required",
          description: "Please complete your parts provider registration to continue.",
        });
        setLocation('/parts-provider/register');
      }
    }
  }, [isAuthenticated, user, setLocation, toast]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      toast({
        title: "Welcome to FixitQuick Parts Provider!",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handlePhoneOtpSuccess = (challengeId: string, phoneNumber: string) => {
    setChallengeId(challengeId);
    setPhoneNumber(phoneNumber);
    setCurrentStep('otp-verification');
  };

  const handleOtpVerificationSuccess = (accessToken: string, refreshToken: string, userData?: any) => {
    // Check if user needs onboarding (no first name or last name)
    const needsOnboarding = !userData?.user?.firstName || !userData?.user?.lastName;
    
    if (needsOnboarding) {
      // Store tokens and go to onboarding
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setCurrentStep('onboarding');
    } else {
      // Check if user has location data
      const hasLocation = userData?.user?.location?.latitude && userData?.user?.location?.longitude;
      
      if (!hasLocation) {
        // Store tokens and go to location setup
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setCurrentStep('location-setup');
      } else {
        // Complete sign in for returning users with location
        handleCompleteSignIn(accessToken, refreshToken, userData);
      }
    }
  };

  const handleCompleteSignIn = async (accessToken: string, refreshToken: string, userData?: any) => {
    try {
      await signInWithSMS(accessToken, refreshToken, userData);
      
      // Check if user needs to register as parts provider
      if (userData?.user?.role !== 'parts_provider') {
        toast({
          title: "Registration Required",
          description: "Please complete your parts provider registration to continue.",
        });
        setLocation('/parts-provider/register');
      } else {
        toast({
          title: "Welcome back to FixitQuick!",
          description: "You have successfully signed in as a parts provider.",
        });
        setLocation('/parts-provider-dashboard');
      }
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleOnboardingSuccess = (userData: any) => {
    setCurrentStep('location-setup');
  };

  const handleLocationSetupSuccess = async (locationData: any) => {
    try {
      await signInWithSMS(accessToken, refreshToken, { user: { location: locationData } });
      
      toast({
        title: "Profile Setup Complete!",
        description: "Welcome to FixitQuick Parts Provider platform.",
      });
      
      // Redirect to parts provider registration
      setLocation('/parts-provider/register');
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'phone-input':
        return (
          <PhoneLogin 
            onSuccess={handlePhoneOtpSuccess}
            onError={(error) => {
              toast({
                title: "Phone verification failed",
                description: error,
                variant: "destructive",
              });
              setCurrentStep('method-selection');
            }}
          />
        );
        
      case 'otp-verification':
        return (
          <OtpVerification 
            challengeId={challengeId}
            phoneNumber={phoneNumber}
            onSuccess={handleOtpVerificationSuccess}
            onBack={() => setCurrentStep('phone-input')}
            onResend={() => setCurrentStep('phone-input')}
            onError={(error) => {
              toast({
                title: "OTP verification failed",
                description: error,
                variant: "destructive",
              });
            }}
          />
        );
        
      case 'onboarding':
        return (
          <Onboarding 
            accessToken={accessToken}
            refreshToken={refreshToken}
            phoneNumber={phoneNumber}
            onSuccess={handleOnboardingSuccess}
            onError={(error) => {
              toast({
                title: "Onboarding failed",
                description: error,
                variant: "destructive",
              });
            }}
          />
        );
        
      case 'location-setup':
        return (
          <LocationSetup 
            onSuccess={handleLocationSetupSuccess}
            onSkip={() => handleLocationSetupSuccess(null)}
          />
        );
        
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-2xl mb-4">
                <Package className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Parts Provider Login</h1>
              <p className="text-muted-foreground text-lg">
                Sell your parts on FixitQuick marketplace and reach more customers
              </p>
            </div>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
              >
                <TrendingUp className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-sm">Boost Sales</h3>
                  <p className="text-xs text-muted-foreground">Reach thousands of buyers</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-sm">Trusted Platform</h3>
                  <p className="text-xs text-muted-foreground">Verified marketplace</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-sm">Secure Transactions</h3>
                  <p className="text-xs text-muted-foreground">Safe and reliable payments</p>
                </div>
              </motion.div>
            </div>

            {/* Login Options */}
            <Card className="w-full max-w-md mx-auto">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold text-center">Sign in to your account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  data-testid="button-google-signin"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-5 w-5" />
                  )}
                  Continue with Replit
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Phone Sign In */}
                <Button
                  onClick={() => setCurrentStep('phone-input')}
                  variant="outline"
                  className="w-full h-12"
                  data-testid="button-phone-signin"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Continue with Phone Number
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="text-center text-sm text-muted-foreground pt-4">
                  <p>New to FixitQuick? 
                    <button 
                      onClick={() => setLocation('/parts-provider/register')}
                      className="text-primary hover:underline ml-1"
                      data-testid="link-register"
                    >
                      Register as Parts Provider
                    </button>
                  </p>
                  <p className="mt-2">
                    Service provider? 
                    <button 
                      onClick={() => setLocation('/service-provider/login')}
                      className="text-primary hover:underline ml-1"
                      data-testid="link-service-provider-login"
                    >
                      Service Provider Login
                    </button>
                  </p>
                  <p className="mt-2">
                    Regular user? 
                    <button 
                      onClick={() => setLocation('/login')}
                      className="text-primary hover:underline ml-1"
                      data-testid="link-user-login"
                    >
                      Customer Login
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50 dark:from-orange-950/20 dark:to-blue-950/20">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 dark:from-orange-950/20 dark:to-blue-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 FixitQuick. All rights reserved.</p>
          <p className="mt-1">Secure parts provider authentication and verification system.</p>
        </div>
      </motion.div>
    </div>
  );
}