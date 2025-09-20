import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  signInWithGoogleForProviders, 
  handleGoogleRedirectResult, 
  onProviderAuthStateChange,
  getCurrentProviderUser,
  isInProviderRegistrationFlow,
  getPendingProviderType
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

import {
  Building,
  Package,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Mail,
  Globe,
  Star,
  Award,
  Briefcase,
  Truck
} from 'lucide-react';

interface ProviderAuthProps {
  providerType: 'service_provider' | 'parts_provider';
}

export default function ProviderAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedProviderType, setSelectedProviderType] = useState<'service_provider' | 'parts_provider' | null>(null);

  // Check for existing authentication and redirect results on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsCheckingAuth(true);
        
        // Check for redirect result first
        const redirectResult = await handleGoogleRedirectResult();
        if (redirectResult) {
          console.log('✅ Successfully handled redirect result');
          setCurrentUser(redirectResult.user);
          
          // Get the provider type and redirect to registration
          const providerType = getPendingProviderType();
          if (providerType) {
            setSelectedProviderType(providerType);
            redirectToRegistration(providerType);
            return;
          }
        }
        
        // Check current auth state
        const existingUser = getCurrentProviderUser();
        if (existingUser) {
          setCurrentUser(existingUser);
          
          // Check if already in registration flow
          if (isInProviderRegistrationFlow()) {
            const providerType = getPendingProviderType();
            if (providerType) {
              setSelectedProviderType(providerType);
              redirectToRegistration(providerType);
              return;
            }
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "There was an error setting up authentication. Please try again.",
        });
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const unsubscribe = onProviderAuthStateChange((user) => {
      setCurrentUser(user);
      if (user && selectedProviderType) {
        redirectToRegistration(selectedProviderType);
      }
    });

    return unsubscribe;
  }, [selectedProviderType]);

  const redirectToRegistration = (providerType: 'service_provider' | 'parts_provider') => {
    if (providerType === 'service_provider') {
      setLocation('/provider-registration');
    } else {
      setLocation('/parts-provider-registration');
    }
  };

  const handleGoogleSignIn = async (providerType: 'service_provider' | 'parts_provider') => {
    try {
      setIsLoading(true);
      setSelectedProviderType(providerType);
      
      const result = await signInWithGoogleForProviders(providerType);
      
      if (result) {
        // Popup success - redirect immediately
        console.log('✅ Google Sign-In successful via popup');
        setCurrentUser(result.user);
        redirectToRegistration(providerType);
      } else {
        // Redirect in progress - the redirect handler will take care of it
        console.log('🔄 Google Sign-In redirect initiated...');
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In failed:', error);
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: error.message || "There was an error signing in with Google. Please try again.",
      });
      setSelectedProviderType(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Setting up authentication...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated but hasn't selected provider type, show selection
  if (currentUser && !selectedProviderType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to FixitQuick Provider Registration
            </h1>
            <p className="text-muted-foreground">
              Signed in as: {currentUser.email}
            </p>
            <p className="text-muted-foreground">
              Choose your provider type to continue with registration
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ProviderTypeCard 
              type="service_provider"
              onSelect={() => redirectToRegistration('service_provider')}
              isLoading={isLoading}
            />
            <ProviderTypeCard 
              type="parts_provider"
              onSelect={() => redirectToRegistration('parts_provider')}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Join FixitQuick as a Provider
          </h1>
          <p className="text-lg text-muted-foreground">
            Start your journey with India's leading home services marketplace
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-center text-foreground mb-6">
            Why Join FixitQuick?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <Star className="w-12 h-12 text-yellow-500 mx-auto" />
              <h3 className="font-semibold text-foreground">Quality Customers</h3>
              <p className="text-sm text-muted-foreground">
                Access to verified customers in your area
              </p>
            </div>
            <div className="text-center space-y-2">
              <Award className="w-12 h-12 text-blue-500 mx-auto" />
              <h3 className="font-semibold text-foreground">Grow Your Business</h3>
              <p className="text-sm text-muted-foreground">
                Expand your reach and increase your earnings
              </p>
            </div>
            <div className="text-center space-y-2">
              <Shield className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="font-semibold text-foreground">Secure Platform</h3>
              <p className="text-sm text-muted-foreground">
                Safe payments and verified transactions
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <ProviderTypeCard 
            type="service_provider"
            onSelect={() => handleGoogleSignIn('service_provider')}
            isLoading={isLoading && selectedProviderType === 'service_provider'}
          />
          <ProviderTypeCard 
            type="parts_provider"
            onSelect={() => handleGoogleSignIn('parts_provider')}
            isLoading={isLoading && selectedProviderType === 'parts_provider'}
          />
        </div>

        {/* Security Notice */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Secure Gmail Authentication:</strong> We use Google's secure authentication system to verify your identity. 
              Your personal information is protected and we only access your basic profile information (name, email, profile picture).
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

interface ProviderTypeCardProps {
  type: 'service_provider' | 'parts_provider';
  onSelect: () => void;
  isLoading?: boolean;
}

function ProviderTypeCard({ type, onSelect, isLoading = false }: ProviderTypeCardProps) {
  const isServiceProvider = type === 'service_provider';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full border-2 hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {isServiceProvider ? (
              <Briefcase className="w-16 h-16 text-blue-500" />
            ) : (
              <Package className="w-16 h-16 text-green-500" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isServiceProvider ? 'Service Provider' : 'Parts Provider'}
          </CardTitle>
          <p className="text-muted-foreground">
            {isServiceProvider 
              ? 'Offer professional home services to customers'
              : 'Supply spare parts and components to service providers'
            }
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">What you'll offer:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {isServiceProvider ? (
                <>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Home repair & maintenance services</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Professional expertise in your field</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>On-site service delivery</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Quality workmanship guarantee</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Spare parts & components</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Quality assured products</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Fast delivery & logistics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Wholesale pricing options</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="pt-4">
            <h4 className="font-semibold text-foreground mb-2">Requirements:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {isServiceProvider ? (
                <>
                  <li>• Valid ID proof (Aadhaar card)</li>
                  <li>• Professional experience</li>
                  <li>• Service area coverage</li>
                  <li>• Portfolio/work samples</li>
                </>
              ) : (
                <>
                  <li>• Business registration documents</li>
                  <li>• GST registration (if applicable)</li>
                  <li>• Product catalog & inventory</li>
                  <li>• Banking & payment details</li>
                </>
              )}
            </ul>
          </div>

          <Button 
            onClick={onSelect}
            disabled={isLoading}
            className="w-full mt-6"
            size="lg"
            data-testid={`button-${type.replace('_', '-')}-signin`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Continue with Gmail
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}