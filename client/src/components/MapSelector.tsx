import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  X,
  Edit
} from 'lucide-react';

// Import leaflet CSS
import 'leaflet/dist/leaflet.css';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  address: string;
  pincode: string;
}

interface MapSelectorProps {
  initialLocation: LocationData;
  onLocationChange: (locationData: LocationData) => void;
  onConfirm: (locationData: LocationData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

// Create custom icon for the marker
const createCustomIcon = () => {
  return new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.596 19.404 0 12.5 0z" fill="#3b82f6"/>
        <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        <circle cx="12.5" cy="12.5" r="3" fill="#3b82f6"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -41],
  });
};

// Component to handle map events
function MapEventHandler({ 
  onLocationChange, 
  markerPosition, 
  setMarkerPosition 
}: {
  onLocationChange: (lat: number, lng: number) => void;
  markerPosition: LatLng;
  setMarkerPosition: (position: LatLng) => void;
}) {
  useMapEvents({
    click: (e) => {
      const newPosition = e.latlng;
      setMarkerPosition(newPosition);
      onLocationChange(newPosition.lat, newPosition.lng);
    },
  });

  return null;
}

// Draggable marker component
function DraggableMarker({ 
  position, 
  onDragEnd 
}: {
  position: LatLng;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<any>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPosition = marker.getLatLng();
        onDragEnd(newPosition.lat, newPosition.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={createCustomIcon()}
    />
  );
}

export default function MapSelector({
  initialLocation,
  onLocationChange,
  onConfirm,
  onBack,
  isLoading = false
}: MapSelectorProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData>(initialLocation);
  const [markerPosition, setMarkerPosition] = useState<LatLng>(
    new LatLng(initialLocation.latitude, initialLocation.longitude)
  );
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentLocation(initialLocation);
    setMarkerPosition(new LatLng(initialLocation.latitude, initialLocation.longitude));
  }, [initialLocation]);

  // Reverse geocoding function
  const reverseGeocode = async (latitude: number, longitude: number): Promise<LocationData> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      const address = data.address || {};
      
      return {
        latitude,
        longitude,
        city: address.city || address.town || address.village || address.county || 'Unknown City',
        area: address.suburb || address.neighbourhood || address.hamlet || address.locality || 'Unknown Area',
        address: data.display_name || 'Address unavailable',
        pincode: address.postcode || '',
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        latitude,
        longitude,
        city: 'Unknown City',
        area: 'Unknown Area',
        address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        pincode: '',
      };
    }
  };

  const handleLocationUpdate = async (lat: number, lng: number) => {
    setIsGeocodingLoading(true);
    setMarkerPosition(new LatLng(lat, lng));
    
    try {
      const locationData = await reverseGeocode(lat, lng);
      setCurrentLocation(locationData);
      onLocationChange(locationData);
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Location update failed",
        description: "Unable to get address for this location.",
        variant: "destructive",
      });
    } finally {
      setIsGeocodingLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualAddress.trim()) {
      toast({
        title: "Enter an address",
        description: "Please enter your address to search.",
        variant: "destructive",
      });
      return;
    }

    setIsGeocodingLoading(true);
    
    try {
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
        return;
      }

      const result = data[0];
      const newPosition = new LatLng(parseFloat(result.lat), parseFloat(result.lon));
      await handleLocationUpdate(newPosition.lat, newPosition.lng);
      setShowManualInput(false);
      setManualAddress('');
    } catch (error) {
      console.error('Manual search error:', error);
      toast({
        title: "Search failed",
        description: "Unable to find the address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeocodingLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    onConfirm(currentLocation);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg text-foreground">
            Confirm Your Location
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag the pin to adjust your exact location
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Map Container */}
          <div className="relative">
            <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
              <MapContainer
                center={markerPosition}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DraggableMarker
                  position={markerPosition}
                  onDragEnd={handleLocationUpdate}
                />
                <MapEventHandler
                  onLocationChange={handleLocationUpdate}
                  markerPosition={markerPosition}
                  setMarkerPosition={setMarkerPosition}
                />
              </MapContainer>
            </div>

            {/* Loading overlay */}
            {isGeocodingLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded-lg shadow-md border border-border">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-foreground">Updating location...</span>
                </div>
              </div>
            )}
          </div>

          {/* Current Location Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Selected Location</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center space-x-1 h-8 px-2"
                data-testid="toggle-manual-input"
              >
                <Edit className="w-3 h-3" />
                <span className="text-xs">Edit Address</span>
              </Button>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {currentLocation.area}, {currentLocation.city}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {currentLocation.address}
                  </p>
                  {currentLocation.pincode && (
                    <p className="text-xs text-muted-foreground">
                      PIN: {currentLocation.pincode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Manual Address Input */}
          {showManualInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <Label htmlFor="manual-address" className="text-sm font-medium">
                  Search Address
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="manual-address"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="Enter address or landmark..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                    data-testid="manual-address-input"
                  />
                  <Button
                    onClick={handleManualSearch}
                    disabled={isGeocodingLoading || !manualAddress.trim()}
                    size="sm"
                    data-testid="search-address-button"
                  >
                    {isGeocodingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1"
              data-testid="back-button"
            >
              <X className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleConfirmLocation}
              disabled={isLoading || isGeocodingLoading}
              className="flex-1"
              data-testid="confirm-location-button"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Confirm Location
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Map Instructions */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Click anywhere on the map or drag the pin to adjust your location
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}