import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, Sparkles, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/useCart';
import { useLocation } from 'wouter';
import { aiService, AIBundleSuggestion } from '@/lib/ai';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({
  isOpen,
  onClose,
}: CartSidebarProps) {
  const { cart, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart();
  const [, setLocation] = useLocation();
  const [couponCode, setCouponCode] = useState('');
  const [bundleSuggestions, setBundleSuggestions] = useState<AIBundleSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const { items, subtotal, total, discount, couponCode: appliedCouponCode } = cart;

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    try {
      const result = await applyCoupon(couponCode);
      if (result.success) {
        setCouponCode('');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
    }
  };

  const handleProceedToCheckout = () => {
    setLocation('/cart');
    onClose();
  };

  const loadBundleSuggestions = async () => {
    if (items.length === 0) return;
    
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await aiService.suggestBundles(items);
      setBundleSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading bundle suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Load AI suggestions when cart items change
  useEffect(() => {
    if (isOpen && items.length > 0) {
      loadBundleSuggestions();
    }
  }, [isOpen, items]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[var(--z-backdrop)]"
            data-testid="cart-backdrop"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="cart-sidebar open"
            data-testid="cart-sidebar"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-lg text-foreground">Your Cart</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-full"
                  data-testid="close-cart"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Trash2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium text-foreground mb-2">Your cart is empty</h4>
                    <p className="text-sm text-muted-foreground">Add some services or parts to get started</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {/* Cart Items */}
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-2 sm:p-3 border border-border rounded-lg bg-card"
                          data-testid={`cart-item-${item.id}`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <span className="text-lg">{item.icon || (item.type === 'service' ? '🔧' : '🔩')}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-foreground truncate">{item.name}</h4>
                              <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.type}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="w-8 h-8 p-0"
                              data-testid={`decrease-${item.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            <span className="text-sm font-medium w-8 text-center text-foreground">{item.quantity}</span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-8 h-8 p-0"
                              data-testid={`increase-${item.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* AI Bundle Suggestions */}
                    {bundleSuggestions.length > 0 && (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">AI Bundle Suggestion</span>
                          </div>
                          
                          {bundleSuggestions.map((suggestion, index) => (
                            <div key={index} className="space-y-2">
                              <p className="text-sm text-foreground">
                                Add <strong>{suggestion.suggestedItems[0]?.name}</strong> for ₹{suggestion.suggestedItems[0]?.price} more
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Save ₹{suggestion.totalSavings} on this bundle!
                              </p>
                              <Button size="sm" variant="outline" className="w-full">
                                Add Bundle
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Coupon Section */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Have a coupon?</span>
                        </div>
                        
                        {appliedCouponCode ? (
                          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-green-800">{appliedCouponCode} applied</p>
                              <p className="text-xs text-green-600">Discount: ₹{discount}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={removeCoupon}
                              className="text-green-800 hover:text-green-900"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Enter coupon code"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              className="flex-1"
                              data-testid="coupon-input"
                            />
                            <Button
                              onClick={handleApplyCoupon}
                              disabled={!couponCode.trim()}
                              size="sm"
                              data-testid="apply-coupon"
                            >
                              Apply
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">₹{subtotal}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="text-green-600">-₹{discount}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-lg text-foreground">₹{total}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleProceedToCheckout}
                    className="w-full"
                    size="lg"
                    data-testid="proceed-to-checkout"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
