import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowRight, Smartphone } from 'lucide-react';
import PhoneLogin from '@/components/auth/PhoneLogin';
import OtpVerification from '@/components/auth/OtpVerification';
import Onboarding from '@/components/auth/Onboarding';
import LocationSetup from '@/components/LocationSetup';

type AuthStep = 'method-selection' | 'phone-input' | 'otp-verification' | 'onboarding' | 'location-setup';

export default function Login() {
  const { signIn, signInWithSMS, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<AuthStep>('method-selection');
  const [challengeId, setChallengeId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      toast({
        title: "Welcome to FixitQuick!",
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
      toast({
        title: "Welcome back to FixitQuick!",
        description: "You have successfully signed in.",
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleOnboardingSuccess = async (data: any) => {
    // After onboarding, check if user needs location setup
    const hasLocation = data?.user?.location?.latitude && data?.user?.location?.longitude;
    
    if (!hasLocation) {
      // Store tokens and go to location setup
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setCurrentStep('location-setup');
    } else {
      // Complete sign in if location already exists
      await handleCompleteSignIn(data.accessToken, data.refreshToken, data);
    }
  };

  const handleBackToMethodSelection = () => {
    setCurrentStep('method-selection');
    setChallengeId('');
    setPhoneNumber('');
    setAccessToken('');
    setRefreshToken('');
  };

  const handleBackToPhoneInput = () => {
    setCurrentStep('phone-input');
  };

  const handleBackToOtpVerification = () => {
    setCurrentStep('otp-verification');
    setAccessToken('');
    setRefreshToken('');
  };

  const handleLocationSetupSuccess = async (locationData: any) => {
    try {
      // Update user location on backend
      const response = await fetch('/api/v1/auth/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            city: locationData.city,
            address: locationData.address,
            pincode: locationData.pincode,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save location');
      }

      const updatedUserData = await response.json();
      
      // Complete sign in with updated location data
      // updatedUserData already has { success, message, user } structure
      await handleCompleteSignIn(accessToken, refreshToken, updatedUserData);
      
      toast({
        title: "Location saved!",
        description: "Your location has been set successfully.",
      });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Location not saved",
        description: "We couldn't save your location, but you can continue using the app.",
        variant: "destructive",
      });
      
      // Continue anyway
      await handleCompleteSignIn(accessToken, refreshToken);
    }
  };

  const handleLocationSetupSkip = async () => {
    // Complete sign in without location
    await handleCompleteSignIn(accessToken, refreshToken);
    
    toast({
      title: "Location skipped",
      description: "You can set your location later in your profile.",
    });
  };

  const handleBackToOnboarding = () => {
    setCurrentStep('onboarding');
  };

  const handleResendOtp = () => {
    // OtpVerification component handles resend internally
    // This callback can be used for additional logging or analytics
  };

  if (isAuthenticated) {
    return null;
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'method-selection':
        return (
          <motion.div
            key="method-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                  className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                >
                  <img 
                    src="/fixitquick-logo.jpg" 
                    alt="FixitQuick Logo" 
                    className="w-16 h-16 object-contain"
                  />
                </motion.div>
                <CardTitle className="text-2xl font-bold text-foreground">Welcome to FixitQuick</CardTitle>
                <p className="text-muted-foreground">Your urban service partner</p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Phone Sign In */}
                <Button
                  onClick={() => setCurrentStep('phone-input')}
                  className="w-full h-12"
                  size="lg"
                  data-testid="phone-login-button"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  <span>Continue with Phone</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>

                <div className="relative">
                  <Separator />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">OR</span>
                  </div>
                </div>

                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-12"
                  size="lg"
                  data-testid="google-signin-button"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5 mr-2" />
                  )}
                  Continue with Google
                </Button>

                {/* Terms and Privacy */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
        
      case 'phone-input':
        return (
          <motion.div
            key="phone-input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToMethodSelection}
              className="absolute left-0 top-0 p-2 z-10"
              data-testid="back-to-methods-button"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <PhoneLogin
              onSuccess={handlePhoneOtpSuccess}
              onError={(error) => {
                console.error('Phone login error:', error);
              }}
            />
          </motion.div>
        );
        
      case 'otp-verification':
        return (
          <motion.div
            key="otp-verification"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <OtpVerification
              challengeId={challengeId}
              phoneNumber={phoneNumber}
              onSuccess={handleOtpVerificationSuccess}
              onBack={handleBackToPhoneInput}
              onResend={handleResendOtp}
              onError={(error) => {
                console.error('OTP verification error:', error);
              }}
            />
          </motion.div>
        );
        
      case 'onboarding':
        return (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOtpVerification}
              className="absolute left-0 top-0 p-2 z-10"
              data-testid="back-to-otp-button"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <Onboarding
              accessToken={accessToken}
              refreshToken={refreshToken}
              phoneNumber={phoneNumber}
              onSuccess={handleOnboardingSuccess}
              onError={(error) => {
                console.error('Onboarding error:', error);
              }}
            />
          </motion.div>
        );
        
      case 'location-setup':
        return (
          <motion.div
            key="location-setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToOnboarding}
              className="absolute left-0 top-0 p-2 z-10"
              data-testid="back-to-onboarding-button"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Button>
            <LocationSetup
              onSuccess={handleLocationSetupSuccess}
              onSkip={handleLocationSetupSkip}
              showSkipOption={true}
              onError={(error) => {
                console.error('Location setup error:', error);
              }}
            />
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>

        {/* Features - Only show on method selection */}
        {currentStep === 'method-selection' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 grid grid-cols-3 gap-4 text-center"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
              <p className="text-xs text-muted-foreground">Quick Service</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-xl">🛡️</span>
              </div>
              <p className="text-xs text-muted-foreground">Verified Providers</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <p className="text-xs text-muted-foreground">Secure Payments</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
