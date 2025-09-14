import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Check, ChevronDown, Globe, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { INDIAN_REGIONS, getAllIndianCities } from '@/lib/locale';

interface RegionSelectorProps {
  variant?: 'default' | 'compact' | 'minimal';
  showServiceStatus?: boolean;
  className?: string;
  onRegionChange?: (region: RegionInfo) => void;
  defaultRegion?: RegionInfo;
  dropdownAlign?: 'left' | 'right' | 'center';
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

const I18N_ENABLED = import.meta.env.VITE_I18N_ENABLED === 'true';

// Implementation component (only loaded when i18n is enabled)
export function RegionSelectorImpl({
  variant = 'default',
  showServiceStatus = true,
  className,
  onRegionChange,
  defaultRegion,
  dropdownAlign = 'right'
}: RegionSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionInfo | null>(defaultRegion || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Get all available cities
  const allCities = useMemo(() => getAllIndianCities(), []);

  // Filter cities based on search query
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show major cities first when no search query
      const majorCities = [
        'New Delhi, Delhi',
        'Mumbai, Maharashtra', 
        'Bangalore, Karnataka',
        'Hyderabad, Telangana',
        'Chennai, Tamil Nadu',
        'Pune, Maharashtra',
        'Kolkata, West Bengal',
        'Ahmedabad, Gujarat',
        'Jaipur, Rajasthan',
        'Surat, Gujarat'
      ];
      
      const major = allCities.filter(city => 
        majorCities.includes(city.displayName)
      );
      const others = allCities.filter(city => 
        !majorCities.includes(city.displayName)
      );
      
      return [...major, ...others];
    }
    
    return allCities.filter(city => 
      city.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allCities, searchQuery]);

  // Load saved region from localStorage on mount
  useEffect(() => {
    const savedRegion = localStorage.getItem('fixitquick_region');
    if (savedRegion && !selectedRegion) {
      try {
        setSelectedRegion(JSON.parse(savedRegion));
      } catch (error) {
        console.error('Failed to parse saved region:', error);
      }
    }
  }, [selectedRegion]);

  // Detect user's location using geolocation API
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      alert(t('region.geolocation_not_supported', 'Geolocation is not supported by this browser'));
      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // In a real app, you would use a reverse geocoding service
          // For now, we'll default to a major city based on approximate location
          const detectedRegion: RegionInfo = {
            state: 'Delhi',
            city: 'New Delhi',
            displayName: 'New Delhi, Delhi',
            isServiceAvailable: true,
            coordinates: { latitude, longitude }
          };
          
          handleRegionSelect(detectedRegion);
        } catch (error) {
          console.error('Failed to detect location:', error);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsDetectingLocation(false);
        
        let errorMessage = t('region.location_error', 'Failed to detect location');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t('region.location_permission_denied', 'Location access denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t('region.location_unavailable', 'Location information unavailable');
            break;
          case error.TIMEOUT:
            errorMessage = t('region.location_timeout', 'Location request timed out');
            break;
        }
        
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Check if service is available in a region (mock implementation)
  const checkServiceAvailability = (region: RegionInfo): boolean => {
    // Major cities with full service availability
    const fullServiceCities = [
      'New Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 
      'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'
    ];
    
    return fullServiceCities.includes(region.city);
  };

  // Handle region selection
  const handleRegionSelect = (region: RegionInfo) => {
    const regionWithService = {
      ...region,
      isServiceAvailable: checkServiceAvailability(region)
    };
    
    setSelectedRegion(regionWithService);
    setIsOpen(false);
    setSearchQuery('');
    
    // Save to localStorage
    localStorage.setItem('fixitquick_region', JSON.stringify(regionWithService));
    
    // Call the callback
    onRegionChange?.(regionWithService);
    
    // Optional: Send to backend to update user preferences
    if (typeof window !== 'undefined' && window.fetch) {
      try {
        fetch('/api/v1/user/preferences/region', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            state: regionWithService.state,
            city: regionWithService.city 
          }),
          credentials: 'include',
        }).catch(() => {
          // Silently fail - user preference sync is not critical
          console.log('Region preference sync skipped');
        });
      } catch (error) {
        // Silently fail - offline or backend unavailable
      }
    }
  };

  // Get region display information
  const getRegionDisplay = () => {
    if (!selectedRegion) {
      return {
        primary: t('region.select', 'Select Region'),
        secondary: t('region.choose_city', 'Choose your city'),
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50'
      };
    }
    
    return {
      primary: selectedRegion.city,
      secondary: selectedRegion.state,
      color: selectedRegion.isServiceAvailable ? 'text-green-600' : 'text-orange-600',
      bgColor: selectedRegion.isServiceAvailable ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'
    };
  };

  const regionDisplay = getRegionDisplay();

  // Render minimal variant
  if (variant === 'minimal') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-8 w-8 p-0 hover:bg-muted rounded-full transition-colors",
            regionDisplay.bgColor,
            className
          )}
          data-testid="region-selector-minimal"
        >
          <MapPin className={cn("h-4 w-4", regionDisplay.color)} />
        </Button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg py-3 z-50",
                  dropdownAlign === 'left' && 'left-0',
                  dropdownAlign === 'right' && 'right-0',
                  dropdownAlign === 'center' && 'left-1/2 -translate-x-1/2'
                )}
                data-testid="region-dropdown"
              >
                {/* Header */}
                <div className="px-3 pb-3 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      <span>{t('region.select')}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                      className="h-7 px-2 text-xs"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      {isDetectingLocation ? t('common.detecting') : t('region.detect')}
                    </Button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('region.search_city', 'Search cities...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8"
                      data-testid="region-search"
                    />
                  </div>
                </div>

                {/* Cities List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredCities.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {t('region.no_cities_found', 'No cities found')}
                    </div>
                  ) : (
                    filteredCities.slice(0, 20).map((city, index) => {
                      const isServiceAvailable = checkServiceAvailability(city);
                      const isSelected = selectedRegion?.city === city.city && selectedRegion?.state === city.state;
                      
                      return (
                        <motion.button
                          key={`${city.city}-${city.state}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => handleRegionSelect(city)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                            "hover:bg-muted focus:bg-muted focus:outline-none",
                            isSelected && "bg-primary/10 text-primary font-medium"
                          )}
                          data-testid={`region-option-${city.city.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div className="text-left">
                              <div className="font-medium">{city.city}</div>
                              <div className="text-xs text-muted-foreground">{city.state}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {showServiceStatus && (
                              <Badge 
                                variant={isServiceAvailable ? "default" : "secondary"}
                                className={cn(
                                  "text-xs px-2 py-0",
                                  isServiceAvailable ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                )}
                              >
                                {isServiceAvailable ? t('common.available') : t('region.coming_soon', 'Soon')}
                              </Badge>
                            )}
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </motion.div>
              
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center space-x-2 h-8 px-2 transition-colors",
            regionDisplay.bgColor,
            "border-primary/20 hover:border-primary/40",
            className
          )}
          data-testid="region-selector-compact"
        >
          <MapPin className={cn("h-4 w-4", regionDisplay.color)} />
          <span className="text-sm font-medium truncate max-w-20">
            {selectedRegion ? selectedRegion.city : t('region.select')}
          </span>
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>

        {/* Compact variant uses the same dropdown as minimal */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-lg py-3 z-50",
                  dropdownAlign === 'left' && 'left-0',
                  dropdownAlign === 'right' && 'right-0',
                  dropdownAlign === 'center' && 'left-1/2 -translate-x-1/2'
                )}
                data-testid="region-dropdown"
              >
                {/* Same content as minimal variant */}
                <div className="px-3 pb-3 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2 text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      <span>{t('region.select')}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                      className="h-7 px-2 text-xs"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      {isDetectingLocation ? t('common.detecting') : t('region.detect')}
                    </Button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('region.search_city', 'Search cities...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8"
                      data-testid="region-search"
                    />
                  </div>
                </div>

                {/* Cities List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredCities.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {t('region.no_cities_found', 'No cities found')}
                    </div>
                  ) : (
                    filteredCities.slice(0, 20).map((city, index) => {
                      const isServiceAvailable = checkServiceAvailability(city);
                      const isSelected = selectedRegion?.city === city.city && selectedRegion?.state === city.state;
                      
                      return (
                        <motion.button
                          key={`${city.city}-${city.state}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => handleRegionSelect(city)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                            "hover:bg-muted focus:bg-muted focus:outline-none",
                            isSelected && "bg-primary/10 text-primary font-medium"
                          )}
                          data-testid={`region-option-${city.city.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div className="text-left">
                              <div className="font-medium">{city.city}</div>
                              <div className="text-xs text-muted-foreground">{city.state}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {showServiceStatus && (
                              <Badge 
                                variant={isServiceAvailable ? "default" : "secondary"}
                                className={cn(
                                  "text-xs px-2 py-0",
                                  isServiceAvailable ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                )}
                              >
                                {isServiceAvailable ? t('common.available') : t('region.coming_soon', 'Soon')}
                              </Badge>
                            )}
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </motion.button>
                      );
                    })
                  )}
                </div>
              </motion.div>
              
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render default variant (following same pattern as LanguageSwitcher)
  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 h-9 px-3 transition-colors",
          regionDisplay.bgColor,
          "border-primary/20 hover:border-primary/40",
          className
        )}
        data-testid="region-selector-default"
      >
        <MapPin className={cn("h-4 w-4", regionDisplay.color)} />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">
            {regionDisplay.primary}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {regionDisplay.secondary}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform ml-2",
          isOpen && "rotate-180"
        )} />
      </Button>

      {/* Full dropdown similar to LanguageSwitcher default variant */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg py-3 z-50",
                dropdownAlign === 'left' && 'left-0',
                dropdownAlign === 'right' && 'right-0',
                dropdownAlign === 'center' && 'left-1/2 -translate-x-1/2'
              )}
              data-testid="region-dropdown"
            >
              {/* Header */}
              <div className="px-3 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>{t('region.select')}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={detectLocation}
                    disabled={isDetectingLocation}
                    className="h-8 px-3 text-xs"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    {isDetectingLocation ? t('common.detecting', 'Detecting...') : t('region.detect', 'Detect')}
                  </Button>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('region.search_city', 'Search cities...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                    data-testid="region-search"
                  />
                </div>
              </div>

              {/* Cities List */}
              <div className="max-h-64 overflow-y-auto">
                {filteredCities.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <div>{t('region.no_cities_found', 'No cities found')}</div>
                    <div className="text-xs mt-1">{t('region.try_different_search', 'Try a different search term')}</div>
                  </div>
                ) : (
                  filteredCities.slice(0, 20).map((city, index) => {
                    const isServiceAvailable = checkServiceAvailability(city);
                    const isSelected = selectedRegion?.city === city.city && selectedRegion?.state === city.state;
                    
                    return (
                      <motion.button
                        key={`${city.city}-${city.state}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleRegionSelect(city)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-3 text-sm transition-colors",
                          "hover:bg-muted focus:bg-muted focus:outline-none",
                          isSelected && "bg-primary/10 text-primary font-medium"
                        )}
                        data-testid={`region-option-${city.city.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center space-x-3">
                          <MapPin className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <div className="text-left">
                            <div className="font-medium text-base">{city.city}</div>
                            <div className="text-sm text-muted-foreground">{city.state}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {showServiceStatus && (
                            <Badge 
                              variant={isServiceAvailable ? "default" : "secondary"}
                              className={cn(
                                "text-xs px-2 py-1",
                                isServiceAvailable 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" 
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                              )}
                            >
                              {isServiceAvailable ? t('common.available', 'Available') : t('region.coming_soon', 'Soon')}
                            </Badge>
                          )}
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.div>
            
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple error boundary component
class RegionSelectorErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RegionSelector error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Lazy load the implementation component
const RegionSelectorLazy = lazy(() => 
  Promise.resolve({ default: RegionSelectorImpl })
);

// Error fallback component
function RegionSelectorError() {
  return (
    <div className="text-xs text-muted-foreground px-2 py-1 rounded">
      Region unavailable
    </div>
  );
}

// Loading fallback component
function RegionSelectorLoading({ variant }: { variant?: string }) {
  const getSkeletonSize = () => {
    switch (variant) {
      case 'minimal':
        return 'h-8 w-8';
      case 'compact':
        return 'h-8 w-20';
      default:
        return 'h-9 w-40';
    }
  };

  return (
    <Skeleton 
      className={`${getSkeletonSize()} rounded-md`}
      data-testid="region-selector-loading"
    />
  );
}

// Main wrapper component that handles lazy loading and feature flag
export function RegionSelector(props: RegionSelectorProps) {
  // If i18n is disabled, render a placeholder or nothing
  if (!I18N_ENABLED) {
    // Return a minimal placeholder that matches the expected space
    if (props.variant === 'minimal') {
      return null; // Completely hidden for minimal variant
    }
    
    return (
      <div 
        className={`text-xs text-muted-foreground px-2 py-1 ${props.className || ''}`}
        data-testid="region-selector-disabled"
      >
        {/* TODO: Enable i18n by setting VITE_I18N_ENABLED=true */}
      </div>
    );
  }

  // If i18n is enabled, lazy load the actual implementation
  return (
    <RegionSelectorErrorBoundary fallback={<RegionSelectorError />}>
      <Suspense fallback={<RegionSelectorLoading variant={props.variant} />}>
        <RegionSelectorLazy {...props} />
      </Suspense>
    </RegionSelectorErrorBoundary>
  );
}

// Export type for props
export type { RegionSelectorProps, RegionInfo };