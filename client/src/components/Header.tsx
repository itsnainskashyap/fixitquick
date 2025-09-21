import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShoppingCart, Bell, Menu, Wallet, Plus, BarChart3, Package, Users, Settings, Home, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AISearchBar } from './AISearchBar';
import { NotificationCenter } from './NotificationCenter';
import PromotionalMediaCarousel from './PromotionalMediaCarousel';
// Language and Region components - controlled by VITE_I18N_ENABLED feature flag
import { LanguageSwitcher } from './LanguageSwitcher';
import { RegionSelector } from './RegionSelector';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
// Default logo imports using @assets alias
import defaultLogo from '@assets/image_1758482448875.png';

interface HeaderProps {
  onCartClick?: () => void;
  onLocationClick?: () => void;
  cartItemsCount?: number;
}

interface WalletData {
  balance: string;
  fixiPoints: number;
}

export function Header({
  onCartClick,
  onLocationClick,
  cartItemsCount = 0,
}: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [, setLocation] = useLocation();

  // Get role-specific navigation items
  const getRoleNavigation = () => {
    if (!user?.role) return [];

    switch (user.role) {
      case 'service_provider':
        return [
          { icon: Home, label: 'Dashboard', path: '/provider' },
          { icon: Calendar, label: 'Orders', path: '/orders' },
          { icon: BarChart3, label: 'Analytics', path: '/provider' },
          { icon: Settings, label: 'Account', path: '/account' },
        ];
      case 'parts_provider':
        return [
          { icon: Home, label: 'Dashboard', path: '/parts-provider' },
          { icon: Package, label: 'Inventory', path: '/parts-provider' },
          { icon: Calendar, label: 'Orders', path: '/orders' },
          { icon: BarChart3, label: 'Analytics', path: '/parts-provider' },
        ];
      case 'admin':
        return [
          { icon: Home, label: 'Admin Panel', path: '/admin' },
          { icon: Users, label: 'Users', path: '/admin?tab=users' },
          { icon: BarChart3, label: 'Analytics', path: '/admin?tab=analytics' },
          { icon: Settings, label: 'Account', path: '/account' },
        ];
      default:
        return [
          { icon: Home, label: 'Home', path: '/' },
          { icon: Calendar, label: 'My Orders', path: '/orders' },
          { icon: Settings, label: 'Account', path: '/account' },
        ];
    }
  };

  const navigationItems = getRoleNavigation();

  // Fetch wallet balance for authenticated users
  const { data: walletData, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/v1/wallet/balance'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch app logo configuration
  const { data: logoData, isLoading: logoLoading } = useQuery({
    queryKey: ['/api/v1/app/logo'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
  });

  const handleWalletClick = () => {
    setLocation('/wallet');
  };

  // Get user location display text
  const getLocationDisplay = () => {
    if (!user?.location) {
      return 'Set Location';
    }
    
    const { city, address } = user.location;
    if (address && city) {
      return `${address}, ${city}`;
    } else if (city) {
      return city;
    } else {
      return 'Unknown Location';
    }
  };

  // Get app logo URL with fallback handling
  const getLogoUrl = () => {
    if (logoLoading) {
      return defaultLogo; // Show default logo while loading
    }
    
    if (logoData?.success && logoData?.data?.logoUrl) {
      return logoData.data.logoUrl;
    }
    
    // Fallback to default logo if API fails or no custom logo set
    return defaultLogo;
  };

  // Handle logo load error - fallback to default logo
  const handleLogoError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.target as HTMLImageElement;
    if (img.src !== defaultLogo) {
      img.src = defaultLogo;
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border shadow-sm"
        data-testid="main-header"
      >
        <div className="px-4 py-3">
          {/* Top row - Logo, Location, Cart */}
          <div className="flex items-center justify-between mb-3">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img 
                src={getLogoUrl()} 
                alt="FixitQuick Logo" 
                className="w-8 h-8 object-contain"
                onError={handleLogoError}
                data-testid="app-logo"
              />
              <span className="font-bold text-lg text-foreground">FixitQuick</span>
            </motion.div>

            {/* Right side - Mobile-optimized layout */}
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
              {/* Role-based Navigation Menu - Mobile dropdown for authenticated users */}
              {isAuthenticated && navigationItems.length > 0 && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    className="flex items-center space-x-1 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors p-2 sm:px-3"
                    data-testid="role-navigation-button"
                  >
                    <Menu className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground hidden sm:inline">
                      {user?.role === 'service_provider' ? 'Provider' :
                       user?.role === 'parts_provider' ? 'Parts' :
                       user?.role === 'admin' ? 'Admin' : 'Menu'}
                    </span>
                  </Button>

                  {/* Role Navigation Dropdown */}
                  <AnimatePresence>
                    {showRoleMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-2"
                        data-testid="role-navigation-dropdown"
                      >
                        {navigationItems.map((item, index) => {
                          const IconComponent = item.icon;
                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              className="block"
                              onClick={() => setShowRoleMenu(false)}
                            >
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center space-x-3 px-4 py-2 hover:bg-muted transition-colors cursor-pointer"
                                data-testid={`nav-item-${item.label.toLowerCase().replace(' ', '-')}`}
                              >
                                <IconComponent className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">
                                  {item.label}
                                </span>
                              </motion.div>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Wallet Balance - Mobile optimized */}
              {isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWalletClick}
                    className="flex items-center space-x-1 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors px-2 sm:px-3"
                    data-testid="wallet-balance-button"
                  >
                    <Wallet className="w-4 h-4 text-primary" />
                    {walletLoading ? (
                      <Skeleton className="h-4 w-8 sm:w-12" />
                    ) : (
                      <span className="text-xs sm:text-sm font-semibold text-foreground">
                        ₹{parseFloat(walletData?.balance || '0').toFixed(0)}
                      </span>
                    )}
                    <Plus className="w-3 h-3 text-muted-foreground ml-1 hidden sm:block" />
                  </Button>
                </motion.div>
              )}

              {/* Region Selector - Mobile optimized */}
              <div className="hidden sm:block">
                <RegionSelector />
              </div>
              
              {/* Language Switcher - Mobile optimized */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Notifications - Mobile optimized */}
              {isAuthenticated && (
                <NotificationCenter compact={true} className="hidden sm:block" />
              )}
              
              {/* Enhanced Cart Button */}
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  variant="ghost"
                  onClick={onCartClick}
                  className="enhanced-cart-button group relative p-3 rounded-xl transition-all duration-300 hover:shadow-lg"
                  data-testid="cart-button"
                >
                  <motion.div
                    className="relative"
                    animate={cartItemsCount > 0 ? {
                      x: [0, -1, 1, -1, 1, 0],
                      transition: { duration: 0.5, ease: "easeInOut" }
                    } : {}}
                    key={cartItemsCount}
                  >
                    <ShoppingCart className="w-6 h-6 text-foreground group-hover:text-primary transition-colors duration-300" />
                    
                    {/* Enhanced animated cart badge */}
                    {cartItemsCount > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                          scale: 1, 
                          opacity: 1,
                          y: [0, -2, 0]
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 25,
                          y: { duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                        }}
                        className="enhanced-cart-badge"
                        data-testid="cart-badge"
                      >
                        <span className="relative z-10 font-bold text-xs">
                          {cartItemsCount > 99 ? '99+' : cartItemsCount}
                        </span>
                        
                        {/* Animated background glow */}
                        <motion.div
                          className="absolute inset-0 rounded-full opacity-50"
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.5, 0.8, 0.5]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          style={{
                            background: "radial-gradient(circle, rgba(147, 51, 234, 0.6) 0%, transparent 70%)"
                          }}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                  
                  {/* Hover glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)",
                      boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)"
                    }}
                  />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* User Greeting and Promotional Media Section - Hidden for provider dashboards */}
          {isAuthenticated && user && user.role !== 'service_provider' && user.role !== 'parts_provider' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-4"
            >
              {/* User Greeting */}
              <div className="mb-3">
                <motion.div
                  className="flex items-center space-x-2"
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <span className="text-lg font-semibold text-foreground">
                    Hello, {user.firstName || 'User'}! 👋
                  </span>
                  {user.role && user.role !== 'user' && (
                    <Badge variant="secondary" className="text-xs">
                      {user.role === 'service_provider' ? 'Provider' :
                       user.role === 'parts_provider' ? 'Parts Provider' :
                       user.role === 'admin' ? 'Admin' : user.role}
                    </Badge>
                  )}
                </motion.div>
              </div>

              {/* Promotional Media Carousel - Mobile optimized */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="promotional-media-section"
              >
                <PromotionalMediaCarousel
                  placement="header"
                  userId={user.id}
                  className="w-full h-32 sm:h-40 md:h-48 lg:h-56 rounded-lg sm:rounded-xl shadow-md sm:shadow-lg border border-border/50"
                  showNavigation={true}
                  showIndicators={true}
                  autoAdvance={true}
                  autoAdvanceDelay={6000}
                  maxItems={5}
                  onMediaClick={(media) => {
                    console.log('Promotional media clicked:', media.title);
                    // Media click is already tracked in the component
                  }}
                  onMediaView={(mediaId) => {
                    console.log('Promotional media viewed:', mediaId);
                    // Media view is already tracked in the component
                  }}
                  data-testid="header-promotional-media"
                />
              </motion.div>
            </motion.div>
          )}

          {/* Enhanced AI Search Bar with integrated chat functionality */}
          <AISearchBar 
            onSearch={(query) => {
              setLocation(`/search?q=${encodeURIComponent(query)}`);
            }}
            enableAIChat={true}
            enableVoice={true}
            autoFocus={false}
            placeholder="Search services, ask AI for help, or describe what you need..."
          />
        </div>
      </motion.header>


      {/* Click outside handlers */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowNotifications(false)}
        />
      )}
      {showRoleMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowRoleMenu(false)}
        />
      )}
    </>
  );
}
