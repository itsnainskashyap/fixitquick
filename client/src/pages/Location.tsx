import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import LocationSetup from '@/components/LocationSetup';
import { ArrowLeft, MapPin, CheckCircle2 } from 'lucide-react';

export default function Location() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLocationUpdate = async (locationData: any) => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/v1/auth/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
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
        throw new Error('Failed to update location');
      }

      await refreshUser(); // Refresh user data to get updated location
      
      toast({
        title: "Location updated!",
        description: "Your location has been updated successfully.",
      });

      // Navigate back to home after successful update
      setTimeout(() => {
        setLocation('/');
      }, 1500);

    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Update failed",
        description: "We couldn't update your location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          className="flex items-center space-x-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        
        <h1 className="text-lg font-semibold">Your Location</h1>
        
        <div className="w-16" /> {/* Spacer for center alignment */}
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Current Location Display */}
          {user?.location && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <CardHeader className="text-center pb-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg text-green-800 dark:text-green-200">
                    Current Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {user.location.city}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-300 break-words">
                          {user.location.address}
                        </p>
                        {user.location.pincode && (
                          <p className="text-sm text-green-600 dark:text-green-300">
                            PIN: {user.location.pincode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Location Setup Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: user?.location ? 0.2 : 0 }}
          >
            <LocationSetup
              onSuccess={handleLocationUpdate}
              onSkip={handleSkip}
              showSkipOption={true}
              onError={(error) => {
                console.error('Location setup error:', error);
                toast({
                  title: "Location error",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              We use your location to show you nearby services and provide accurate delivery estimates.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}