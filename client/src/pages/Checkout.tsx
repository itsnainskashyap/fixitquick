import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { nanoid } from 'nanoid';
import { Layout } from '@/components/Layout';
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

// UTILITY: Get user location coordinates with fallback to city-based defaults
const getUserLocationCoordinate = async (coord: 'latitude' | 'longitude', cityName: string): Promise<number> => {
  // City-based coordinate defaults for major Indian cities
  const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
    'delhi': { latitude: 28.6139, longitude: 77.2090 },
    'mumbai': { latitude: 19.0760, longitude: 72.8777 },
    'bangalore': { latitude: 12.9716, longitude: 77.5946 },
    'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
    'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
    'pune': { latitude: 18.5204, longitude: 73.8567 },
    'kolkata': { latitude: 22.5726, longitude: 88.3639 },
    'chennai': { latitude: 13.0827, longitude: 80.2707 },
    'ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
    'gurgaon': { latitude: 28.4595, longitude: 77.0266 },
    'noida': { latitude: 28.5355, longitude: 77.3910 },
    'jaipur': { latitude: 26.9124, longitude: 75.7873 },
  };
  
  // Try browser geolocation first (with timeout)
  try {
    if (navigator.geolocation) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 3000,
          enableHighAccuracy: false,
          maximumAge: 300000 // Cache for 5 minutes
        });
      });
      
      console.log(`📍 Using browser geolocation: ${coord} = ${position.coords[coord]}`);
      return position.coords[coord];
    }
  } catch (error) {
    console.warn('🌍 Browser geolocation failed, using city fallback:', error);
  }
  
  // Fallback to city-based coordinates
  const normalizedCity = cityName.toLowerCase().trim();
  const cityCoords = cityCoordinates[normalizedCity];
  
  if (cityCoords) {
    console.log(`🏙️  Using city coordinates for ${cityName}: ${coord} = ${cityCoords[coord]}`);
    return cityCoords[coord];
  }
  
  // Final fallback to Delhi coordinates
  const defaultCoords = cityCoordinates['delhi'];
  console.log(`🏛️  Using default Delhi coordinates: ${coord} = ${defaultCoords[coord]}`);
  return defaultCoords[coord];
};

// OnionPay widget interface
declare global {
  interface Window {
    OnionPay?: {
      init: (config: { apiBase: string }) => void;
      createPayment: (config: {
        sessionToken: string;
        amount: number;
        description: string;
        onSuccess: (data: any) => void;
        onError: (error: any) => void;
      }) => void;
    };
  }
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { cart, clearCart, getItemCount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // SECURITY FIX: Generate unique idempotency key for this checkout session
  const idempotencyKey = useMemo(() => nanoid(), []);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [onionPaySession, setOnionPaySession] = useState<{
    sessionId: string;
    sessionToken: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [onionPayLoaded, setOnionPayLoaded] = useState(false);
  const onionPayButtonRef = useRef<HTMLDivElement>(null);
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
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

  // Load OnionPay widget script
  useEffect(() => {
    const loadOnionPayScript = () => {
      if (window.OnionPay || onionPayLoaded) {
        setOnionPayLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://onionpays.replit.app/widget/onionpay.js';
      script.async = true;
      script.onload = () => {
        setOnionPayLoaded(true);
        if (window.OnionPay) {
          window.OnionPay.init({ apiBase: 'https://onionpays.replit.app' });
        }
      };
      script.onerror = () => {
        console.error('Failed to load OnionPay script');
        toast({
          title: 'Payment System Error',
          description: 'Failed to load payment system. Please try again later.',
          variant: 'destructive',
        });
      };
      
      document.head.appendChild(script);
    };

    loadOnionPayScript();
  }, [toast]);

  // Fetch wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery<{ balance: string; fixiPoints: number }>({
    queryKey: ['/api/v1/wallet/balance'],
    enabled: !!user,
  });

  // SECURE: Create order mutation (parts vs service specific)
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const isPartsOrder = orderData.type === 'parts';
      const endpoint = isPartsOrder ? '/api/v1/parts/orders' : '/api/v1/orders';
      return await apiRequest('POST', endpoint, orderData);
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

  // SECURE: Pay for order mutation (wallet payments - server validates everything)
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

  // OnionPay session creation mutation
  const createOnionPaySessionMutation = useMutation({
    mutationFn: async (params: { orderId: string; amount: number; description: string }) => {
      return await apiRequest('POST', '/api/v1/payment-intents', {
        orderId: params.orderId,
        amount: params.amount,
        currency: 'INR',
        description: params.description,
        metadata: {
          source: 'checkout',
          paymentMethod: 'onionpay',
        },
      });
    },
    onSuccess: (data) => {
      if (data.success && data.paymentIntent) {
        setOnionPaySession({
          sessionId: data.paymentIntent.sessionId,
          sessionToken: data.paymentIntent.sessionToken,
          amount: parseFloat(data.paymentIntent.amount),
          currency: data.paymentIntent.currency,
        });
      }
    },
    onError: (error: any) => {
      console.error('OnionPay session creation error:', error);
      toast({
        title: 'Payment Setup Failed',
        description: error.message || 'Failed to initialize payment system.',
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
      // SECURE FLOW: Create order first, then handle payment based on method
      const orderData = {
        type: serviceItems.length > 0 ? 'service' : 'parts',
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          type: item.type,
          categoryId: item.categoryId,
          serviceId: item.serviceId,
          partId: item.partId
        })),
        totalAmount: total.toString(),
        location: {
          address: `${deliveryAddress.address}, ${deliveryAddress.city}`,
          latitude: await getUserLocationCoordinate('latitude', deliveryAddress.city),
          longitude: await getUserLocationCoordinate('longitude', deliveryAddress.city),
          instructions: deliveryAddress.landmark
        },
        scheduledAt: serviceItems.length > 0 && serviceSchedule.date ? 
          new Date(`${serviceSchedule.date} ${serviceSchedule.timeSlot}`).toISOString() : null,
        paymentMethod,
        couponCode: cart.appliedCoupon?.code || null,
        couponDiscount: cart.couponDiscount || 0,
        notes: serviceSchedule.notes || `Delivery to: ${deliveryAddress.fullName}, ${deliveryAddress.phone}`,
        // SECURITY FIX: Add idempotency key to prevent duplicate orders
        idempotencyKey,
        // Parts-specific shipping address
        ...(partItems.length > 0 && {
          shippingAddress: {
            fullName: deliveryAddress.fullName,
            phone: deliveryAddress.phone,
            address: deliveryAddress.address,
            city: deliveryAddress.city,
            pincode: deliveryAddress.pincode,
            landmark: deliveryAddress.landmark
          }
        })
      };

      // Step 1: Create order in database (server generates secure orderId)
      const createdOrder = await createOrderMutation.mutateAsync(orderData);
      const orderId = createdOrder.data?.id || createdOrder.id;

      if (paymentMethod === 'wallet') {
        // Step 2: Pay for the order (server validates and calculates amount)
        await payOrderMutation.mutateAsync(orderId);
      } else if (paymentMethod === 'test') {
        // Step 2: Process test payment
        try {
          const testPaymentResponse = await apiRequest('POST', `/api/v1/orders/${orderId}/pay-test`, {
            idempotencyKey,
            amount: total,
            paymentMethod: 'test'
          });
          
          // Invalidate caches after successful test payment
          queryClient.invalidateQueries({ queryKey: ['/api/v1/wallet/balance'] });
          queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
          
          toast({
            title: 'Test Payment Successful!',
            description: `Your test order #${orderId.slice(-8)} has been confirmed. Payment ID: ${testPaymentResponse.paymentId}`,
          });
          setLocation(`/orders/${orderId}`);
        } catch (testPaymentError) {
          toast({
            title: 'Test Payment Failed',
            description: 'The test payment simulation failed. Please try again.',
            variant: 'destructive',
          });
          throw testPaymentError;
        }
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
    <Layout>
      <div className="max-w-4xl mx-auto">
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

                    {/* Test Payment (Development Only) */}
                    {import.meta.env.DEV && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="test" id="test" data-testid="payment-test" />
                        <Label htmlFor="test" className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Test Payment</span>
                            <Badge variant="secondary" className="text-xs">Dev Only</Badge>
                          </div>
                        </Label>
                      </div>
                    )}
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
      </div>
    </Layout>
  );
}