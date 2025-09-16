import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  address: string;
  pincode: string;
}

export type LocationStatus = 'idle' | 'detecting' | 'success' | 'error' | 'permission-denied';

interface UseUserLocationReturn {
  location: LocationData | null;
  status: LocationStatus;
  error: string | null;
  detectLocation: () => void;
  clearLocation: () => void;
  isDetecting: boolean;
}

const LOCATION_STORAGE_KEY = 'fixitquick_user_location';
const LOCATION_TIMESTAMP_KEY = 'fixitquick_location_timestamp';
const LOCATION_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load saved location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
    const savedTimestamp = localStorage.getItem(LOCATION_TIMESTAMP_KEY);
    
    if (savedLocation && savedTimestamp) {
      const timestamp = parseInt(savedTimestamp, 10);
      const now = Date.now();
      
      // Check if saved location is still valid (less than 1 hour old)
      if (now - timestamp < LOCATION_EXPIRY_TIME) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          setLocation(parsedLocation);
          setStatus('success');
          return;
        } catch (e) {
          // Invalid saved data, remove it
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          localStorage.removeItem(LOCATION_TIMESTAMP_KEY);
        }
      } else {
        // Expired location data, remove it
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        localStorage.removeItem(LOCATION_TIMESTAMP_KEY);
      }
    }
  }, []);

  // Reverse geocoding function using OpenStreetMap Nominatim API
  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<{
    city: string;
    area: string;
    address: string;
    pincode: string;
  }> => {
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
        city: address.city || address.town || address.village || address.county || 'Unknown City',
        area: address.suburb || address.neighbourhood || address.hamlet || address.locality || 'Unknown Area',
        address: data.display_name || 'Address unavailable',
        pincode: address.postcode || '',
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        city: 'Unknown City',
        area: 'Unknown Area', 
        address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        pincode: '',
      };
    }
  }, []);

  // Main location detection function
  const detectLocation = useCallback(async () => {
    setStatus('detecting');
    setError(null);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser';
      setError(errorMsg);
      setStatus('error');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000, // 5 minutes
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

          // Save to localStorage with timestamp
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationInfo));
          localStorage.setItem(LOCATION_TIMESTAMP_KEY, Date.now().toString());

          setLocation(locationInfo);
          setStatus('success');
          setError(null);

        } catch (error) {
          console.error('Error processing location:', error);
          const errorMsg = 'Failed to process your location';
          setError(errorMsg);
          setStatus('error');
        }
      },
      (error) => {
        let errorMsg = '';
        let newStatus: LocationStatus = 'error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Location access was denied. Please enable location permissions to see nearby services.';
            newStatus = 'permission-denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Your location is currently unavailable. Please check your internet connection.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location request timed out. Please try again.';
            break;
          default:
            errorMsg = 'An unknown error occurred while detecting your location.';
            break;
        }

        setError(errorMsg);
        setStatus(newStatus);
      },
      options
    );
  }, [reverseGeocode]);

  // Clear location data
  const clearLocation = useCallback(() => {
    setLocation(null);
    setStatus('idle');
    setError(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    localStorage.removeItem(LOCATION_TIMESTAMP_KEY);
  }, []);

  // Auto-detect location on first load if no location is saved
  useEffect(() => {
    if (status === 'idle' && !location) {
      detectLocation();
    }
  }, [status, location, detectLocation]);

  return {
    location,
    status,
    error,
    detectLocation,
    clearLocation,
    isDetecting: status === 'detecting',
  };
}