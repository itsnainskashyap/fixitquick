import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ShoppingCart, Bell, Menu, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AISearchBar } from './AISearchBar';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onCartClick?: () => void;
  onLocationClick?: () => void;
  onEmergencyClick?: () => void;
  cartItemsCount?: number;
  currentLocation?: string;
}

export function Header({
  onCartClick,
  onLocationClick,
  onEmergencyClick,
  cartItemsCount = 0,
  currentLocation = 'Mumbai',
}: HeaderProps) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

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

            {/* Right side - Location, Notifications, Cart */}
            <div className="flex items-center space-x-3">
              {/* Location Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onLocationClick}
                className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="location-button"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{currentLocation}</span>
              </Button>

              {/* Notifications */}
              <div className="relative">
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

      {/* Click outside handler for notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  );
}
