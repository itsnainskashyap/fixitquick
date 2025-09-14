import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import MapSelector from '@/components/MapSelector';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  address: string;
  pincode: string;
}

interface LocationSetupProps {
  onSuccess: (locationData: LocationData) => void;
  onSkip?: () => void;
  onError?: (error: string) => void;
  showSkipOption?: boolean;
}

type LocationStep = 'detecting' | 'permission-denied' | 'error' | 'confirming' | 'map-confirming' | 'manual-input' | 'success';

export default function LocationSetup({ 
  onSuccess, 
  onSkip, 
  onError, 
  showSkipOption = true 
}: LocationSetupProps) {
  const [currentStep, setCurrentStep] = useState<LocationStep>('detecting');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  // Automatically start location detection on component mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    setCurrentStep('detecting');
    setIsLoading(true);
    setErrorMessage('');

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser');
      setCurrentStep('error');
      setIsLoading(false);
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 seconds
      maximumAge: 600000, // 10 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address details
          const addressData = await reverseGeocode(latitude, longitude);
          
          const locationInfo: LocationData = {
            latitude,
            longitude,
            city: addressData.city,
            area: addressData.area,
            address: addressData.address,
            pincode: addressData.pincode,
          };

          setLocationData(locationInfo);
          setCurrentStep('confirming');
          setIsLoading(false);

        } catch (error) {
          console.error('Error processing location:', error);
          setErrorMessage('Failed to process your location');
          setCurrentStep('error');
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Location access was denied. Please enable location permissions and try again.');
            setCurrentStep('permission-denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Your location is currently unavailable. Please check your internet connection.');
            setCurrentStep('error');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. Please try again.');
            setCurrentStep('error');
            break;
          default:
            setErrorMessage('An unknown error occurred while detecting your location.');
            setCurrentStep('error');
            break;
        }
      },
      options
    );
  };

  // Reverse geocoding function using a geocoding service
  const reverseGeocode = async (latitude: number, longitude: number): Promise<{
    city: string;
    area: string;
    address: string;
    pincode: string;
  }> => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      // Note: User-Agent header removed as it's forbidden in browsers
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      // Extract relevant address components
      const address = data.address || {};
      
      return {
        city: address.city || address.town || address.village || address.county || 'Unknown City',
        area: address.suburb || address.neighbourhood || address.hamlet || address.locality || 'Unknown Area',
        address: data.display_name || 'Address unavailable',
        pincode: address.postcode || '',
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Fallback to basic location info
      return {
        city: 'Unknown City',
        area: 'Unknown Area', 
        address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        pincode: '',
      };
    }
  };

  const handleManualLocationSearch = async () => {
    if (!manualAddress.trim()) {
      toast({
        title: "Enter an address",
        description: "Please enter your address to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Forward geocoding using Nominatim API
      // Note: User-Agent header removed as it's forbidden in browsers
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      
      if (data.length === 0) {
        toast({
          title: "Address not found",
          description: "Please try a different address or be more specific.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const result = data[0];
      const address = result.address || {};
      
      const locationInfo: LocationData = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city: address.city || address.town || address.village || address.county || 'Unknown City',
        area: address.suburb || address.neighbourhood || address.hamlet || address.locality || 'Unknown Area',
        address: result.display_name || manualAddress,
        pincode: address.postcode || '',
      };

      setLocationData(locationInfo);
      setCurrentStep('confirming');
      setIsLoading(false);

    } catch (error) {
      console.error('Manual location search error:', error);
      toast({
        title: "Search failed",
        description: "Unable to find the address. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    if (locationData) {
      setCurrentStep('map-confirming');
    }
  };

  const handleMapLocationChange = (updatedLocationData: LocationData) => {
    setLocationData(updatedLocationData);
  };

  const handleMapConfirm = (confirmedLocationData: LocationData) => {
    setCurrentStep('success');
    onSuccess(confirmedLocationData);
  };

  const handleBackToConfirming = () => {
    setCurrentStep('confirming');
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'detecting':
        return (
          <motion.div
            key="detecting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
              <Navigation className="w-10 h-10 text-primary animate-pulse" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Detecting your location...
              </h3>
              <p className="text-muted-foreground">
                We're finding your current location to show you nearby services
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">This may take a few seconds</span>
            </div>
          </motion.div>
        );

      case 'permission-denied':
        return (
          <motion.div
            key="permission-denied"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full mx-auto flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Location Access Needed
              </h3>
              <p className="text-muted-foreground mb-4">
                To show you nearby services, we need access to your location. 
                Please enable location permissions in your browser.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">How to enable location:</p>
                <ul className="text-left space-y-1">
                  <li>• Click the location icon in your address bar</li>
                  <li>• Select "Allow" when prompted</li>
                  <li>• Refresh this page if needed</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={detectLocation}
                className="w-full"
                data-testid="retry-location-button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('manual-input')}
                className="w-full"
                data-testid="manual-location-button"
              >
                <Search className="w-4 h-4 mr-2" />
                Enter Address Manually
              </Button>
            </div>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto flex items-center justify-center">
              <X className="w-10 h-10 text-red-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Location Detection Failed
              </h3>
              <p className="text-muted-foreground mb-4">
                {errorMessage}
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={detectLocation}
                className="w-full"
                data-testid="retry-location-button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('manual-input')}
                className="w-full"
                data-testid="manual-location-button"
              >
                <Search className="w-4 h-4 mr-2" />
                Enter Address Manually
              </Button>
            </div>
          </motion.div>
        );

      case 'manual-input':
        return (
          <motion.div
            key="manual-input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Enter Your Address
              </h3>
              <p className="text-muted-foreground">
                Type your address to find nearby services
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="address" className="text-sm font-medium">
                  Address
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Enter your full address (e.g., 123 Main St, Mumbai, Maharashtra)"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualLocationSearch()}
                  className="mt-1"
                  data-testid="address-input"
                />
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleManualLocationSearch}
                  disabled={isLoading || !manualAddress.trim()}
                  className="w-full"
                  data-testid="search-address-button"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Find Location
                </Button>

                <Button 
                  variant="outline"
                  onClick={detectLocation}
                  className="w-full"
                  data-testid="auto-detect-button"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Auto-detect Instead
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 'confirming':
        return (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto flex items-center justify-center mb-4">
                <MapPin className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Confirm Your Location
              </h3>
              <p className="text-muted-foreground">
                Is this your current location?
              </p>
            </div>

            {locationData && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {locationData.area}, {locationData.city}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 break-words">
                          {locationData.address}
                        </p>
                        {locationData.pincode && (
                          <p className="text-sm text-muted-foreground">
                            PIN: {locationData.pincode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleConfirmLocation}
                className="w-full"
                data-testid="confirm-location-button"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Yes, This is Correct
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('manual-input')}
                className="w-full"
                data-testid="change-location-button"
              >
                <Search className="w-4 h-4 mr-2" />
                Use Different Address
              </Button>
            </div>
          </motion.div>
        );

      case 'map-confirming':
        return locationData ? (
          <MapSelector
            initialLocation={locationData}
            onLocationChange={handleMapLocationChange}
            onConfirm={handleMapConfirm}
            onBack={handleBackToConfirming}
            isLoading={isLoading}
          />
        ) : null;

      case 'success':
        return (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Location Set Successfully!
              </h3>
              <p className="text-muted-foreground">
                We'll now show you services available in your area
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Location saved to your profile
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg max-w-md mx-auto">
      <CardHeader className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center"
        >
          <MapPin className="text-primary-foreground w-8 h-8" />
        </motion.div>
        <CardTitle className="text-2xl font-bold text-foreground">
          Set Your Location
        </CardTitle>
        <p className="text-muted-foreground">
          Help us find services near you
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>

        {/* Skip option - only show on certain steps */}
        {showSkipOption && ['detecting', 'permission-denied', 'error', 'manual-input'].includes(currentStep) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-4 border-t border-border"
          >
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground text-sm"
              data-testid="skip-location-button"
            >
              Skip for now
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}