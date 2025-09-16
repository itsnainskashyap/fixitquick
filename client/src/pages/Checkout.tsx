import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CreditCard, 
  Calendar,
  User,
  Phone,
  Home,
  Wallet,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { cart, clearCart, getItemCount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: user?.displayName || '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    landmark: ''
  });
  const [serviceSchedule, setServiceSchedule] = useState({
    date: '',
    timeSlot: '',
    notes: ''
  });

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['/api/v1/wallet/balance'],
    enabled: !!user,
  });

  // SECURE: Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest('POST', '/api/v1/orders', orderData);
    },
    onError: (error: any) => {
      console.error('Order creation error:', error);
      toast({
        title: 'Order Creation Failed',
        description: error.message || 'Failed to create order.',
        variant: 'destructive',
      });
    },
  });

  // SECURE: Pay for order mutation (server validates everything)
  const payOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('POST', `/api/v1/orders/${orderId}/pay`, {});
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/wallet/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      toast({
        title: 'Payment Successful!',
        description: 'Your order has been placed and paid successfully.',
      });
      // Navigate to order details
      setLocation(`/orders/${orderId}`);
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Payment processing failed.',
        variant: 'destructive',
      });
    },
  });

  const { items, subtotal, tax, discount, total } = cart;
  const serviceItems = items.filter(item => item.type === 'service');
  const partItems = items.filter(item => item.type === 'part');

  const handleAddressChange = (field: string, value: string) => {
    setDeliveryAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (field: string, value: string) => {
    setServiceSchedule(prev => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add some items to place an order.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (!deliveryAddress.fullName || !deliveryAddress.phone || !deliveryAddress.address) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required delivery details.',
        variant: 'destructive',
      });
      return;
    }

    if (serviceItems.length > 0 && (!serviceSchedule.date || !serviceSchedule.timeSlot)) {
      toast({
        title: 'Service Schedule Required',
        description: 'Please select a date and time for your service.',
        variant: 'destructive',
      });
      return;
    }

    // Validate wallet balance if wallet payment is selected
    if (paymentMethod === 'wallet') {
      const currentBalance = parseFloat(walletData?.balance || '0');
      if (currentBalance < total) {
        toast({
          title: 'Insufficient Balance',
          description: `You need ₹${(total - currentBalance).toFixed(2)} more in your wallet. Please add money or choose a different payment method.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsProcessing(true);
    try {
      // SECURE FLOW: Create order first, then pay for it
      const orderData = {
        type: serviceItems.length > 0 ? 'service' : 'parts',
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          type: item.type
        })),
        totalAmount: total.toString(),
        location: {
          address: `${deliveryAddress.address}, ${deliveryAddress.city}`,
          latitude: 0, // TODO: Get actual coordinates
          longitude: 0,
          instructions: deliveryAddress.landmark
        },
        scheduledAt: serviceItems.length > 0 && serviceSchedule.date ? 
          new Date(`${serviceSchedule.date} ${serviceSchedule.timeSlot}`).toISOString() : null,
        paymentMethod,
        notes: serviceSchedule.notes || `Delivery to: ${deliveryAddress.fullName}, ${deliveryAddress.phone}`
      };

      // Step 1: Create order in database (server generates secure orderId)
      const createdOrder = await createOrderMutation.mutateAsync(orderData);
      const orderId = createdOrder.id;

      if (paymentMethod === 'wallet') {
        // Step 2: Pay for the order (server validates and calculates amount)
        await payOrderMutation.mutateAsync(orderId);
      } else {
        // For other payment methods, implement payment gateway integration
        // For now, simulate successful payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        toast({
          title: 'Order Placed Successfully!',
          description: `Your order #${orderId.slice(-8)} has been confirmed.`,
        });
        setLocation(`/orders/${orderId}`);
      }
      
      // Clear cart
      clearCart();
      
    } catch (error) {
      console.error('Order placement error:', error);
      // Error handling is done in mutation
    } finally {
      setIsProcessing(false);
    }
  };

  const canUseWallet = () => {
    if (!walletData) return false;
    const currentBalance = parseFloat(walletData.balance || '0');
    return currentBalance >= total;
  };

  const getWalletStatus = () => {
    if (!walletData) return { sufficient: false, shortfall: total };
    const currentBalance = parseFloat(walletData.balance || '0');
    return {
      sufficient: currentBalance >= total,
      shortfall: Math.max(0, total - currentBalance),
      balance: currentBalance
    };
  };

  const getEstimatedDelivery = () => {
    if (serviceItems.length > 0 && partItems.length > 0) {
      return 'Service scheduled + parts delivery';
    } else if (serviceItems.length > 0) {
      return serviceSchedule.date ? `Scheduled for ${serviceSchedule.date}` : 'Schedule required';
    } else {
      return '2-3 business days';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        onCartClick={() => setLocation('/cart')} 
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
            onClick={() => setLocation('/cart')}
            className="p-2"
            data-testid="back-to-cart"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
            <p className="text-muted-foreground">
              Review and complete your order
            </p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-4 p-3 border border-border rounded-lg"
                    data-testid={`checkout-item-${item.id}`}
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">
                        {item.icon || (item.type === 'service' ? '🔧' : '🔩')}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">₹{item.price * item.quantity}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Delivery Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Full Name *</label>
                    <Input
                      value={deliveryAddress.fullName}
                      onChange={(e) => handleAddressChange('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      data-testid="input-full-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Phone Number *</label>
                    <Input
                      value={deliveryAddress.phone}
                      onChange={(e) => handleAddressChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Address *</label>
                  <Textarea
                    value={deliveryAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    placeholder="Enter your complete address"
                    data-testid="input-address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">City</label>
                    <Input
                      value={deliveryAddress.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="City"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Pincode</label>
                    <Input
                      value={deliveryAddress.pincode}
                      onChange={(e) => handleAddressChange('pincode', e.target.value)}
                      placeholder="Pincode"
                      data-testid="input-pincode"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Landmark</label>
                    <Input
                      value={deliveryAddress.landmark}
                      onChange={(e) => handleAddressChange('landmark', e.target.value)}
                      placeholder="Landmark"
                      data-testid="input-landmark"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Scheduling (if services in cart) */}
            {serviceItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Service Schedule</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Preferred Date *</label>
                      <Input
                        type="date"
                        value={serviceSchedule.date}
                        onChange={(e) => handleScheduleChange('date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-service-date"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Time Slot *</label>
                      <select
                        className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        value={serviceSchedule.timeSlot}
                        onChange={(e) => handleScheduleChange('timeSlot', e.target.value)}
                        data-testid="select-time-slot"
                      >
                        <option value="">Select time slot</option>
                        <option value="9:00 AM - 12:00 PM">9:00 AM - 12:00 PM</option>
                        <option value="12:00 PM - 3:00 PM">12:00 PM - 3:00 PM</option>
                        <option value="3:00 PM - 6:00 PM">3:00 PM - 6:00 PM</option>
                        <option value="6:00 PM - 9:00 PM">6:00 PM - 9:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Special Instructions</label>
                    <Textarea
                      value={serviceSchedule.notes}
                      onChange={(e) => handleScheduleChange('notes', e.target.value)}
                      placeholder="Any special instructions for the service provider..."
                      data-testid="input-service-notes"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Clock className="w-4 h-4" />
                  <span>{getEstimatedDelivery()}</span>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium text-foreground">Payment Method</h3>
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod}
                    data-testid="payment-method-selection"
                  >
                    {/* Wallet Payment */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="wallet" id="wallet" data-testid="payment-wallet" />
                        <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Wallet className="w-4 h-4 text-primary" />
                              <span>Wallet</span>
                            </div>
                            {walletData && (
                              <span className="text-sm text-muted-foreground">
                                ₹{parseFloat(walletData.balance || '0').toFixed(2)}
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                      {paymentMethod === 'wallet' && (
                        <div className="ml-6 p-3 bg-muted/30 rounded-lg border border-border">
                          <div className="space-y-2">
                            {walletLoading ? (
                              <p className="text-sm text-muted-foreground">Loading wallet balance...</p>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Current Balance:</span>
                                  <span className="font-medium">₹{getWalletStatus().balance?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Order Total:</span>
                                  <span className="font-medium">₹{total.toFixed(2)}</span>
                                </div>
                                <Separator className="my-2" />
                                {getWalletStatus().sufficient ? (
                                  <div className="flex items-center space-x-2 text-sm text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Sufficient balance</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm text-red-600">
                                      <AlertCircle className="w-4 h-4" />
                                      <span>Insufficient balance (₹{getWalletStatus().shortfall.toFixed(2)} short)</span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setLocation('/wallet')}
                                      className="w-full"
                                      data-testid="add-money-redirect"
                                    >
                                      Add Money to Wallet
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Payment */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" data-testid="payment-card" />
                      <Label htmlFor="card" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span>Credit/Debit Card</span>
                        </div>
                      </Label>
                    </div>

                    {/* UPI Payment */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upi" id="upi" data-testid="payment-upi" />
                      <Label htmlFor="upi" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded" />
                          <span>UPI Payment</span>
                        </div>
                      </Label>
                    </div>

                    {/* Cash on Delivery */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="cod" data-testid="payment-cod" />
                      <Label htmlFor="cod" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-2">
                          <Home className="w-4 h-4 text-primary" />
                          <span>Cash on Delivery</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Place Order Button */}
                <Button
                  onClick={handlePlaceOrder}
                  className="w-full"
                  size="lg"
                  disabled={isProcessing || (paymentMethod === 'wallet' && !getWalletStatus().sufficient)}
                  data-testid="place-order"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : paymentMethod === 'wallet' ? (
                    `Pay from Wallet - ₹${total.toFixed(2)}`
                  ) : (
                    `Place Order - ₹${total.toFixed(2)}`
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  By placing this order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}