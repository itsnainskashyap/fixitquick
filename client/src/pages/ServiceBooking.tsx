import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, addDays, startOfToday, isAfter, isBefore } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Star, 
  User, 
  Phone, 
  MessageCircle,
  CheckCircle2,
  CreditCard,
  Wallet,
  ShoppingCart
} from 'lucide-react';

// Form validation schema
const bookingSchema = z.object({
  providerId: z.string().min(1, 'Please select a service provider'),
  scheduledDate: z.date({
    required_error: 'Please select a date',
  }),
  scheduledTime: z.string().min(1, 'Please select a time'),
  address: z.string().min(10, 'Please provide a detailed address'),
  pincode: z.string().min(6, 'Please provide a valid pincode').max(6, 'Pincode must be 6 digits'),
  phone: z.string().min(10, 'Please provide a valid phone number'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['wallet', 'online', 'cod'], {
    required_error: 'Please select a payment method',
  }),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: string;
  estimatedDuration: number;
  icon: string;
  rating: string;
  totalBookings: number;
  categoryId: string;
  requirements: string[];
}

interface ServiceProvider {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  rating: string;
  totalCompletedOrders: number;
  isOnline: boolean;
  availability: Record<string, string>;
  serviceArea: {
    areas: string[];
    radiusKm: number;
  };
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

export default function ServiceBooking() {
  const { serviceId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Form setup
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      address: '',
      pincode: '',
      phone: '',
      notes: '',
      paymentMethod: 'online',
    },
  });

  // Fetch service details
  const { data: service, isLoading: loadingService } = useQuery<Service>({
    queryKey: ['/api/v1/services', serviceId],
    enabled: !!serviceId,
  });

  // Fetch available providers for this service
  const { data: providers, isLoading: loadingProviders } = useQuery<ServiceProvider[]>({
    queryKey: ['/api/v1/service-providers', serviceId],
    enabled: !!serviceId,
  });

  // Fetch user's wallet balance
  const { data: walletData } = useQuery<{ balance: number; fixiPoints: number }>({
    queryKey: ['/api/v1/wallet/balance'],
    enabled: !!user,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/v1/orders', orderData);
      return response.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      toast({
        title: 'Booking Confirmed!',
        description: 'Your service has been booked successfully.',
      });
      setLocation(`/orders/${order.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    form.setValue('providerId', provider.id);
    setStep(2);
  };

  const handleDateTimeSelect = () => {
    const formData = form.getValues();
    if (formData.scheduledDate && formData.scheduledTime) {
      setStep(3);
    }
  };

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!service || !selectedProvider) return;

    const orderData = {
      serviceId: service.id,
      providerId: data.providerId,
      scheduledDate: data.scheduledDate.toISOString(),
      scheduledTime: data.scheduledTime,
      customerLocation: {
        address: data.address,
        pincode: data.pincode,
      },
      customerPhone: data.phone,
      specialInstructions: data.notes,
      paymentMethod: data.paymentMethod,
      totalAmount: parseFloat(service.basePrice),
      estimatedDuration: service.estimatedDuration,
    };

    createOrderMutation.mutate(orderData);
  };

  const getAvailableTimeSlots = (date: Date, provider: ServiceProvider) => {
    const dayName = format(date, 'EEEE').toLowerCase();
    const availability = provider.availability[dayName];
    
    if (!availability) return [];
    
    const [start, end] = availability.split('-');
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    
    return timeSlots.filter(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  const calculateTotal = () => {
    if (!service) return 0;
    const basePrice = parseFloat(service.basePrice);
    // Add any additional charges here (convenience fee, etc.)
    return basePrice;
  };

  if (loadingService) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Service not found</h2>
          <Button onClick={() => setLocation('/services')}>
            Browse Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="pt-32 px-4 pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => setLocation('/services')}
            className="mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </Button>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <div className={`h-1 w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <div className={`h-1 w-12 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Book {service.name}</h1>
            <p className="text-muted-foreground">
              {step === 1 && 'Choose your service provider'}
              {step === 2 && 'Select date and time'}
              {step === 3 && 'Confirm your booking'}
            </p>
          </div>
        </motion.div>

        {/* Service Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">{service.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{service.rating}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{service.estimatedDuration} mins</span>
                    </div>
                    <div className="font-semibold text-primary">
                      ₹{service.basePrice}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 1: Provider Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Choose Service Provider</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProviders ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-12 h-12 bg-muted rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : providers && providers.length > 0 ? (
                  <div className="space-y-4">
                    {providers.map((provider: ServiceProvider) => (
                      <div
                        key={provider.id}
                        onClick={() => handleProviderSelect(provider)}
                        className="flex items-center space-x-4 p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                        data-testid={`provider-${provider.id}`}
                      >
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.userId}`} />
                          <AvatarFallback>
                            {provider.firstName[0]}{provider.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            {provider.firstName} {provider.lastName}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span>{provider.rating}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              <span>{provider.totalCompletedOrders} jobs</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${
                                provider.isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              <span>{provider.isOnline ? 'Online' : 'Offline'}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" data-testid={`select-provider-${provider.id}`}>
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No providers available</h3>
                    <p className="text-sm text-muted-foreground">
                      Please try again later or contact support.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && selectedProvider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Form {...form}>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Date & Time</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Date Selection */}
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Preferred Date</FormLabel>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                  data-testid="date-picker"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setIsCalendarOpen(false);
                                }}
                                disabled={(date) =>
                                  isBefore(date, startOfToday()) || 
                                  isAfter(date, addDays(new Date(), 30))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Time Selection */}
                    <FormField
                      control={form.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Time</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!form.watch('scheduledDate')}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="time-picker">
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {form.watch('scheduledDate') && 
                                getAvailableTimeSlots(form.watch('scheduledDate'), selectedProvider).map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1"
                        data-testid="previous-step"
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        onClick={handleDateTimeSelect}
                        className="flex-1"
                        disabled={!form.watch('scheduledDate') || !form.watch('scheduledTime')}
                        data-testid="next-step"
                      >
                        Continue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Form>
          </motion.div>
        )}

        {/* Step 3: Booking Details & Confirmation */}
        {step === 3 && selectedProvider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleBookingSubmit)} className="space-y-6">
                {/* Contact Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter phone number" data-testid="phone-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter pincode" data-testid="pincode-input" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Enter complete address with landmark"
                              data-testid="address-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any specific requirements or notes for the service provider"
                              data-testid="notes-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-3">
                            <div 
                              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'wallet' ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                              onClick={() => field.onChange('wallet')}
                              data-testid="payment-wallet"
                            >
                              <Wallet className="w-5 h-5" />
                              <div className="flex-1">
                                <div className="font-medium">Wallet</div>
                                <div className="text-sm text-muted-foreground">
                                  Balance: ₹{walletData?.balance || 0}
                                </div>
                              </div>
                              <div className={`w-4 h-4 border-2 rounded-full ${
                                field.value === 'wallet' ? 'border-primary bg-primary' : 'border-border'
                              }`} />
                            </div>
                            
                            <div 
                              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'online' ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                              onClick={() => field.onChange('online')}
                              data-testid="payment-online"
                            >
                              <CreditCard className="w-5 h-5" />
                              <div className="flex-1">
                                <div className="font-medium">Online Payment</div>
                                <div className="text-sm text-muted-foreground">
                                  Pay securely with card/UPI
                                </div>
                              </div>
                              <div className={`w-4 h-4 border-2 rounded-full ${
                                field.value === 'online' ? 'border-primary bg-primary' : 'border-border'
                              }`} />
                            </div>
                            
                            <div 
                              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'cod' ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                              onClick={() => field.onChange('cod')}
                              data-testid="payment-cod"
                            >
                              <ShoppingCart className="w-5 h-5" />
                              <div className="flex-1">
                                <div className="font-medium">Cash on Delivery</div>
                                <div className="text-sm text-muted-foreground">
                                  Pay when service is completed
                                </div>
                              </div>
                              <div className={`w-4 h-4 border-2 rounded-full ${
                                field.value === 'cod' ? 'border-primary bg-primary' : 'border-border'
                              }`} />
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Service</span>
                        <span>{service.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Provider</span>
                        <span>{selectedProvider.firstName} {selectedProvider.lastName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Date & Time</span>
                        <span>
                          {form.watch('scheduledDate') && format(form.watch('scheduledDate'), 'PPP')} at {form.watch('scheduledTime')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Duration</span>
                        <span>{service.estimatedDuration} minutes</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total Amount</span>
                        <span>₹{calculateTotal()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                    data-testid="previous-step-final"
                  >
                    Previous
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createOrderMutation.isPending}
                    data-testid="confirm-booking"
                  >
                    {createOrderMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}