import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { changeLanguage, getCurrentLanguage, getSupportedLanguages } from '@/lib/i18n';
import { useLocaleFormatting } from '@/lib/locale';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

// Types for locale preferences
interface LocalePreferences {
  language: string;
  fallbackLanguage: string;
  country: string;
  state?: string;
  city?: string;
  region?: string;
  serviceRadius: number;
  preferredServiceAreas?: string[];
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currencyCode: string;
  currencyFormat: string;
  calendar: string;
  weekStartsOn: number;
  festivals?: string[];
  contentPreference: string;
  showLocalProviders: boolean;
  showRegionalOffers: boolean;
  autoDetectLocation: boolean;
  autoDetectLanguage: boolean;
}

interface RegionInfo {
  state: string;
  city: string;
  displayName: string;
  isServiceAvailable?: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface LocalizationContextType {
  // Current state
  currentLanguage: string;
  currentRegion: RegionInfo | null;
  preferences: LocalePreferences | null;
  isLoading: boolean;
  
  // Language management
  changeLanguage: (language: string) => Promise<void>;
  getSupportedLanguages: () => any[];
  
  // Region management
  changeRegion: (region: RegionInfo) => Promise<void>;
  getAvailableRegions: () => Promise<any[]>;
  checkServiceAvailability: (state: string, city: string) => Promise<any>;
  
  // Formatting utilities
  formatCurrency: (amount: number, options?: any) => string;
  formatNumber: (num: number, options?: any) => string;
  formatDate: (date: Date | string | number, options?: any) => string;
  formatTime: (date: Date | string | number, options?: any) => string;
  formatPhone: (phone: string, options?: any) => string;
  formatAddress: (address: any, options?: any) => string;
  formatDistance: (distance: number, options?: any) => string;
  formatDuration: (minutes: number, options?: any) => string;
  
  // Cultural features
  isFestivalSeason: () => boolean;
  getCurrentFestivals: () => any[];
  getRegionalOffers: () => Promise<any[]>;
  
  // Preferences management
  updatePreferences: (updates: Partial<LocalePreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

interface LocalizationProviderProps {
  children: ReactNode;
}

export function LocalizationProvider({ children }: LocalizationProviderProps) {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const localeFormatting = useLocaleFormatting();
  
  // Local state
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [currentRegion, setCurrentRegion] = useState<RegionInfo | null>(null);
  
  // Fetch user locale preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/v1/users/me/locale/preferences'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch available regions
  const { data: availableRegions } = useQuery({
    queryKey: ['/api/v1/regions/available'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Language change mutation
  const languageChangeMutation = useMutation({
    mutationFn: async (language: string) => {
      await changeLanguage(language);
      
      if (isAuthenticated) {
        await apiRequest('/api/v1/users/me/language', {
          method: 'PATCH',
          body: { language },
        });
      }
      
      return language;
    },
    onSuccess: (language) => {
      setCurrentLanguage(language);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/locale/preferences'] });
    },
  });

  // Region change mutation
  const regionChangeMutation = useMutation({
    mutationFn: async (region: RegionInfo) => {
      if (isAuthenticated) {
        await apiRequest('/api/v1/users/me/region', {
          method: 'PATCH',
          body: { state: region.state, city: region.city },
        });
      }
      
      // Store in localStorage for non-authenticated users
      localStorage.setItem('fixitquick_region', JSON.stringify(region));
      return region;
    },
    onSuccess: (region) => {
      setCurrentRegion(region);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/locale/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/content/services/localized'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/content/regional-offers'] });
    },
  });

  // Preferences update mutation
  const preferencesUpdateMutation = useMutation({
    mutationFn: async (updates: Partial<LocalePreferences>) => {
      if (isAuthenticated) {
        return await apiRequest('/api/v1/users/me/locale/preferences', {
          method: 'PUT',
          body: updates,
        });
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/locale/preferences'] });
    },
  });

  // Initialize region from user data or localStorage
  useEffect(() => {
    if (user?.location && !currentRegion) {
      const region: RegionInfo = {
        state: user.location.city === 'New Delhi' ? 'Delhi' : 'Unknown',
        city: user.location.city || 'Unknown',
        displayName: `${user.location.city || 'Unknown'}, ${user.location.city === 'New Delhi' ? 'Delhi' : 'Unknown'}`,
        isServiceAvailable: true,
        coordinates: user.location.latitude && user.location.longitude ? {
          latitude: user.location.latitude,
          longitude: user.location.longitude
        } : undefined
      };
      setCurrentRegion(region);
    } else if (!user && !currentRegion) {
      // Try to load from localStorage for non-authenticated users
      const savedRegion = localStorage.getItem('fixitquick_region');
      if (savedRegion) {
        try {
          setCurrentRegion(JSON.parse(savedRegion));
        } catch (error) {
          console.error('Failed to parse saved region:', error);
        }
      }
    }
  }, [user, currentRegion]);

  // Initialize language from preferences
  useEffect(() => {
    if (preferences?.language && preferences.language !== currentLanguage) {
      changeLanguage(preferences.language);
      setCurrentLanguage(preferences.language);
    }
  }, [preferences?.language, currentLanguage]);

  // Auto-detect language on first visit (for new users)
  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('fixitquick_language')) {
      const browserLanguage = navigator.language.split('-')[0];
      const supportedLanguages = getSupportedLanguages();
      const isSupported = supportedLanguages.some(lang => lang.code === browserLanguage);
      
      if (isSupported && browserLanguage !== currentLanguage) {
        changeLanguage(browserLanguage);
        setCurrentLanguage(browserLanguage);
      }
    }
  }, [isAuthenticated, currentLanguage]);

  // Utility functions
  const handleLanguageChange = async (language: string) => {
    await languageChangeMutation.mutateAsync(language);
  };

  const handleRegionChange = async (region: RegionInfo) => {
    await regionChangeMutation.mutateAsync(region);
  };

  const getAvailableRegions = async () => {
    if (availableRegions) {
      return availableRegions.regions;
    }
    
    const response = await apiRequest('/api/v1/regions/available');
    return response.regions;
  };

  const checkServiceAvailability = async (state: string, city: string) => {
    const response = await apiRequest(`/api/v1/regions/service-check/${encodeURIComponent(state)}/${encodeURIComponent(city)}`);
    return response.availability;
  };

  const updatePreferences = async (updates: Partial<LocalePreferences>) => {
    await preferencesUpdateMutation.mutateAsync(updates);
  };

  const resetToDefaults = async () => {
    const defaults: Partial<LocalePreferences> = {
      language: 'en',
      fallbackLanguage: 'en',
      country: 'IN',
      serviceRadius: 25,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      numberFormat: 'indian',
      currencyCode: 'INR',
      currencyFormat: 'symbol',
      calendar: 'gregorian',
      weekStartsOn: 1,
      contentPreference: 'local',
      showLocalProviders: true,
      showRegionalOffers: true,
      autoDetectLocation: true,
      autoDetectLanguage: false
    };
    
    await updatePreferences(defaults);
    await handleLanguageChange('en');
  };

  // Cultural features
  const isFestivalSeason = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    
    // Major Indian festivals typically fall in certain months
    // Diwali (October/November), Holi (March), Durga Puja (September/October), etc.
    const festivalMonths = [2, 8, 9, 10]; // March, September, October, November
    return festivalMonths.includes(currentMonth);
  };

  const getCurrentFestivals = () => {
    const today = new Date();
    const year = today.getFullYear();
    
    // This would typically come from an API
    const festivals = [
      { name: 'Diwali', nameHi: 'दिवाली', date: new Date(year, 10, 4), type: 'major' },
      { name: 'Holi', nameHi: 'होली', date: new Date(year, 2, 25), type: 'major' },
      { name: 'Eid', nameHi: 'ईद', date: new Date(year, 3, 22), type: 'major' },
    ];
    
    return festivals.filter(festival => {
      const timeDiff = Math.abs(festival.date.getTime() - today.getTime());
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return daysDiff <= 7; // Festivals within 7 days
    });
  };

  const getRegionalOffers = async () => {
    if (!currentRegion || !isAuthenticated) return [];
    
    try {
      const response = await apiRequest(`/api/v1/content/regional-offers/${encodeURIComponent(currentRegion.state)}/${encodeURIComponent(currentRegion.city)}`);
      return response.offers;
    } catch (error) {
      console.error('Failed to fetch regional offers:', error);
      return [];
    }
  };

  const contextValue: LocalizationContextType = {
    // Current state
    currentLanguage,
    currentRegion,
    preferences: preferences || null,
    isLoading: preferencesLoading || languageChangeMutation.isPending || regionChangeMutation.isPending,
    
    // Language management
    changeLanguage: handleLanguageChange,
    getSupportedLanguages,
    
    // Region management
    changeRegion: handleRegionChange,
    getAvailableRegions,
    checkServiceAvailability,
    
    // Formatting utilities (from useLocaleFormatting hook)
    formatCurrency: localeFormatting.formatCurrency,
    formatNumber: localeFormatting.formatNumber,
    formatDate: localeFormatting.formatDate,
    formatTime: localeFormatting.formatTime,
    formatPhone: localeFormatting.formatPhone,
    formatAddress: localeFormatting.formatAddress,
    formatDistance: localeFormatting.formatDistance,
    formatDuration: localeFormatting.formatDuration,
    
    // Cultural features
    isFestivalSeason,
    getCurrentFestivals,
    getRegionalOffers,
    
    // Preferences management
    updatePreferences,
    resetToDefaults,
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
}

// Hook to use the localization context
export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}

// Export types for use in other components
export type { LocalePreferences, RegionInfo, LocalizationContextType };