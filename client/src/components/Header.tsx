import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShoppingCart, Bell, Menu, AlertTriangle, Wallet, Plus, BarChart3, Package, Users, Settings, Home, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AISearchBar } from './AISearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Link } from 'wouter';

interface HeaderProps {
  onCartClick?: () => void;
  onLocationClick?: () => void;
  onEmergencyClick?: () => void;
  cartItemsCount?: number;
  currentLocation?: string;
}

interface WalletData {
  balance: string;
  fixiPoints: number;
}

export function Header({
  onCartClick,
  onLocationClick,
  onEmergencyClick,
  cartItemsCount = 0,
  currentLocation = 'Mumbai',
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
          { icon: Users, label: 'Users', path: '/admin' },
          { icon: BarChart3, label: 'Analytics', path: '/admin' },
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

  const handleWalletClick = () => {
    setLocation('/wallet');
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
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">FQ</span>
              </div>
              <span className="font-bold text-lg text-foreground">FixitQuick</span>
            </motion.div>

            {/* Right side - Role Navigation, Wallet, Location, Notifications, Cart */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Role-based Navigation Menu - Only show for authenticated users */}
              {isAuthenticated && navigationItems.length > 0 && (
                <div className="relative hidden md:block">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    className="flex items-center space-x-1 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
                    data-testid="role-navigation-button"
                  >
                    <Menu className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground hidden lg:inline">
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

              {/* Wallet Balance - Only show for authenticated users */}
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
                    className="flex items-center space-x-1 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
                    data-testid="wallet-balance-button"
                  >
                    <Wallet className="w-4 h-4 text-primary" />
                    {walletLoading ? (
                      <Skeleton className="h-4 w-12" />
                    ) : (
                      <span className="text-sm font-semibold text-foreground">
                        ₹{parseFloat(walletData?.balance || '0').toFixed(0)}
                      </span>
                    )}
                    <Plus className="w-3 h-3 text-muted-foreground ml-1" />
                  </Button>
                </motion.div>
              )}

              {/* Location Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLocationClick}
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
                data-testid="location-button"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{currentLocation}</span>
              </Button>

              {/* Notifications - Only show for authenticated users */}
              {isAuthenticated && (
                <div className="relative hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 hover:bg-muted rounded-full transition-colors"
                    data-testid="notifications-button"
                  >
                    <Bell className="w-5 h-5" />
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      3
                    </Badge>
                  </Button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg p-4"
                      data-testid="notifications-dropdown"
                    >
                      <h3 className="font-semibold mb-3">Notifications</h3>
                      <div className="space-y-2">
                        <div className="p-2 hover:bg-muted rounded-lg cursor-pointer">
                          <p className="text-sm font-medium">Order Completed</p>
                          <p className="text-xs text-muted-foreground">Your fan repair order has been completed</p>
                        </div>
                        <div className="p-2 hover:bg-muted rounded-lg cursor-pointer">
                          <p className="text-sm font-medium">Provider Assigned</p>
                          <p className="text-xs text-muted-foreground">Raj Kumar has been assigned to your order</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}
              
              {/* Cart Button */}
              <Button
                variant="ghost"
                onClick={onCartClick}
                className="relative p-2 hover:bg-muted rounded-full transition-colors"
                data-testid="cart-button"
              >
                <ShoppingCart className="w-6 h-6" />
                {cartItemsCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="cart-badge"
                    data-testid="cart-badge"
                  >
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </motion.div>
                )}
              </Button>
            </div>
          </div>

          {/* AI Search Bar */}
          <AISearchBar />
        </div>
      </motion.header>

      {/* Emergency SOS Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
        onClick={onEmergencyClick}
        className="emergency-button"
        data-testid="emergency-button"
      >
        <AlertTriangle className="w-6 h-6" />
      </motion.button>

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
