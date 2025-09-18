import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  X, 
  ArrowRight,
  IndianRupee,
  Package
} from 'lucide-react';

interface FloatingCartWidgetProps {
  onClose?: () => void;
}

export function FloatingCartWidget({ onClose }: FloatingCartWidgetProps) {
  const [location, setLocation] = useLocation();
  const { cart, getItemCount, getCartTotal } = useCart();
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastCartSignature, setLastCartSignature] = useState('');
  
  // Create a signature of current cart state to detect changes
  const cartSignature = cart.items
    .map(item => `${item.id}:${item.quantity}`)
    .sort()
    .join('|');

  // Reset dismissal when cart composition changes
  useEffect(() => {
    if (lastCartSignature && cartSignature !== lastCartSignature) {
      setIsDismissed(false);
    }
    setLastCartSignature(cartSignature);
  }, [cartSignature, lastCartSignature]);

  // Don't show widget on cart, checkout, profile, admin, and auth pages
  const hideOnPages = [
    '/cart', 
    '/checkout', 
    '/account', 
    '/admin', 
    '/login', 
    '/admin-login', 
    '/service-provider-login', 
    '/parts-provider-login',
    '/provider-registration',
    '/part-provider-registration'
  ];
  const shouldHide = hideOnPages.some(page => location.startsWith(page));
  
  // Don't show if cart is empty, on specific pages, or if manually dismissed
  const shouldShowWidget = cart.items.length > 0 && !shouldHide && !isDismissed;

  const handleViewCart = () => {
    setLocation('/cart');
    onClose?.();
  };

  const handleClose = () => {
    setIsDismissed(true);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {shouldShowWidget && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: 'spring', 
            damping: 25, 
            stiffness: 300,
            duration: 0.4 
          }}
          className="floating-cart-widget"
          data-testid="floating-cart-widget"
        >
          {/* Glass morphism background */}
          <div className="floating-cart-content">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="floating-cart-close"
              data-testid="close-floating-cart"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Cart Summary */}
            <div className="floating-cart-summary">
              <div className="flex items-center space-x-3">
                {/* Cart Icon with Badge */}
                <div className="relative">
                  <div className="floating-cart-icon">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="floating-cart-badge"
                    data-testid="cart-count-badge"
                  >
                    {getItemCount()}
                  </Badge>
                </div>

                {/* Price and Items Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <IndianRupee className="w-4 h-4 text-primary" />
                    <span className="floating-cart-total" data-testid="cart-total">
                      {getCartTotal().toFixed(2)}
                    </span>
                  </div>
                  <p className="floating-cart-items-text">
                    {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in cart
                  </p>
                </div>

                {/* View Cart Button */}
                <Button
                  onClick={handleViewCart}
                  className="floating-cart-view-button"
                  size="sm"
                  data-testid="view-cart-button"
                >
                  <span className="mr-2">View Cart</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Cart Items Preview (Optional - for enhanced UX) */}
              {cart.items.length > 0 && (
                <div className="floating-cart-items-preview">
                  {cart.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="floating-cart-item-mini">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {item.name}
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                  {cart.items.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      +{cart.items.length - 2} more items
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Floating widget indicator line */}
            <div className="floating-cart-indicator" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
