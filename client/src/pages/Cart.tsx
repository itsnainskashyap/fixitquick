import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  Tag,
  Receipt,
  Clock,
  MapPin 
} from 'lucide-react';

export default function Cart() {
  const [, setLocation] = useLocation();
  const { cart, updateQuantity, removeItem, applyCoupon, removeCoupon, clearCart, getItemCount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const { items, subtotal, tax, discount, total, couponCode: appliedCouponCode } = cart;

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    try {
      await applyCoupon(couponCode);
      setCouponCode('');
    } catch (error) {
      console.error('Error applying coupon:', error);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add some items to proceed to checkout.',
        variant: 'destructive',
      });
      return;
    }

    // Check if cart has only services and redirect to booking flow
    const serviceItems = items.filter(item => item.type === 'service');
    const partItems = items.filter(item => item.type === 'part');

    if (serviceItems.length === 1 && partItems.length === 0) {
      // Single service, redirect to booking page
      setLocation(`/services/${serviceItems[0].serviceId}/book`);
    } else {
      // Multiple items or mixed cart, create a multi-item checkout flow
      setLocation('/checkout');
    }
  };

  const getEstimatedDeliveryTime = () => {
    const hasServices = items.some(item => item.type === 'service');
    const hasParts = items.some(item => item.type === 'part');
    
    if (hasServices && hasParts) {
      return 'Scheduled service + parts delivery';
    } else if (hasServices) {
      return 'Scheduled at your convenience';
    } else {
      return '1-2 business days';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        onCartClick={() => {}} 
        cartItemsCount={getItemCount()}
      />

      <main className="pt-52 px-4 pb-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4 mb-6"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
            className="p-2"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Cart</h1>
            <p className="text-muted-foreground">
              {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
        </motion.div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Discover our services and parts to get started
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation('/services')} 
                className="w-full max-w-sm"
                data-testid="browse-services"
              >
                Browse Services
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')} 
                className="w-full max-w-sm"
                data-testid="go-home"
              >
                Go Home
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5" />
                    <span>Cart Items</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-4 p-4 border border-border rounded-lg"
                      data-testid={`cart-item-${item.id}`}
                    >
                      {/* Item Icon */}
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">
                          {item.icon || (item.type === 'service' ? '🔧' : '🔩')}
                        </span>
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description || `${item.category} ${item.type}`}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          {item.estimatedDuration && (
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{item.estimatedDuration}min</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Price and Quantity */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-foreground">₹{item.price * item.quantity}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2 mt-2">
                          {/* Quantity Selector Group */}
                          <div className="flex items-center border border-border rounded-md bg-background">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="w-8 h-8 p-0 rounded-none hover:bg-muted"
                              data-testid={`decrease-${item.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            <span className="text-sm font-medium px-3 py-1 min-w-[40px] text-center border-x border-border">
                              {item.quantity}
                            </span>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-8 h-8 p-0 rounded-none hover:bg-muted"
                              data-testid={`increase-${item.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid={`remove-${item.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {/* Clear Cart */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="text-destructive hover:text-destructive"
                  data-testid="clear-cart"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cart
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setLocation('/services')}
                  data-testid="continue-shopping"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              {/* Coupon Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Tag className="w-5 h-5" />
                    <span>Promo Code</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appliedCouponCode ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          {appliedCouponCode} applied
                        </p>
                        <p className="text-xs text-green-600">Saved ₹{discount}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeCoupon}
                        className="text-green-800 hover:text-green-900"
                        data-testid="remove-coupon"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter promo code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1"
                        data-testid="coupon-input"
                      />
                      <Button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || isApplyingCoupon}
                        size="sm"
                        data-testid="apply-coupon"
                      >
                        {isApplyingCoupon ? 'Applying...' : 'Apply'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="w-5 h-5" />
                    <span>Order Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">₹{subtotal}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (18% GST)</span>
                      <span className="text-foreground">₹{tax.toFixed(2)}</span>
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
                      <span className="font-bold text-lg text-foreground">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{getEstimatedDeliveryTime()}</span>
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
                  
                  <p className="text-xs text-muted-foreground text-center">
                    You'll be able to review your order before final confirmation
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}