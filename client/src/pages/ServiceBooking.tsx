import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import LocationSetup from '@/components/LocationSetup';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { format, addDays, startOfToday, isAfter, isBefore, addMinutes } from 'date-fns';
import { 
  ArrowLeft, 
  ArrowRight,
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
  ShoppingCart,
  Zap,
  AlertTriangle,
  Navigation,
  Timer,
  Route,
  Loader2,
  X
} from 'lucide-react';

// Enhanced form validation schema
const bookingSchema = z.object({
  bookingType: z.enum(['instant', 'scheduled'], {
    required_error: 'Please select booking type',
  }),
  urgency: z.enum(['low', 'normal', 'high', 'urgent'], {
    required_error: 'Please select urgency level',
  }).optional(),
  providerId: z.string().optional(), // Optional for auto-assignment
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
  serviceLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().min(10, 'Please provide a detailed address'),
    city: z.string(),
    area: z.string(),
    pincode: z.string().min(6, 'Please provide a valid pincode').max(6, 'Pincode must be 6 digits'),
  }),
  phone: z.string().min(10, 'Please provide a valid phone number'),
  notes: z.string().optional(),
  paymentMethod: z.enum(['wallet', 'online', 'cod'], {
    required_error: 'Please select a payment method',
  }),
}).refine((data) => {
  // For scheduled bookings, date and time are required
  if (data.bookingType === 'scheduled') {
    return data.scheduledDate && data.scheduledTime;
  }
  // For instant bookings, urgency is required
  if (data.bookingType === 'instant') {
    return data.urgency;
  }
  return true;
}, {
  message: 'Please complete all required fields for the selected booking type',
  path: ['bookingType'],
});

type BookingFormData = z.infer<typeof bookingSchema>;

// Enhanced interfaces
interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  address: string;
  pincode: string;
}

interface MatchedProvider {
  userId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  rating: number;
  totalJobs: number;
  distanceKm?: number;
  estimatedTravelTime?: number;
  estimatedArrival?: string;
  currentLocation?: { latitude: number; longitude: number };
  lastKnownLocation?: { latitude: number; longitude: number };
  isOnline: boolean;
  responseRate: number;
  skills: string[];
}

interface ServiceBooking {
  id: string;
  userId: string;
  serviceId: string;
  bookingType: 'instant' | 'scheduled';
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  status: string;
  serviceLocation: LocationData;
  assignedProviderId?: string;
  requestedAt: string;
  scheduledAt?: string;
  totalAmount: string;
  paymentMethod: string;
  notes?: string;
}

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
  
  // Enhanced state management
  const [step, setStep] = useState(0); // Start with step 0 for booking type selection
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [matchedProviders, setMatchedProviders] = useState<MatchedProvider[]>([]);
  const [serviceLocation, setServiceLocation] = useState<LocationData | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLocationSetup, setIsLocationSetup] = useState(false);
  const [providerSearching, setProviderSearching] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<ServiceBooking | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>('');

  // Form setup with enhanced defaults
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      bookingType: 'instant',
      urgency: 'normal',
      phone: user?.phone || '',
      notes: '',
      paymentMethod: 'online',
    },
  });

  const bookingType = form.watch('bookingType');

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

  // Provider matching mutation for instant bookings
  const findProvidersMutation = useMutation({
    mutationFn: async (criteria: {
      serviceId: string;
      location: { latitude: number; longitude: number };
      urgency: 'low' | 'normal' | 'high' | 'urgent';
      maxDistance?: number;
    }) => {
      const response = await apiRequest('POST', '/api/v1/service-bookings/find-providers', criteria);
      return response.json();
    },
    onSuccess: (providers: MatchedProvider[]) => {
      setMatchedProviders(providers);
      setProviderSearching(false);
      if (providers.length === 0) {
        toast({
          title: 'No Providers Available',
          description: 'No providers found in your area. Please try again later or book for a later time.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setProviderSearching(false);
      toast({
        title: 'Provider Search Failed',
        description: error.message || 'Unable to find providers. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Enhanced service booking mutation
  const createServiceBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const response = await apiRequest('POST', '/api/v1/service-bookings', bookingData);
      return response.json();
    },
    onSuccess: (booking: ServiceBooking) => {
      setCurrentBooking(booking);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-bookings'] });
      
      if (booking.bookingType === 'instant') {
        toast({
          title: 'Booking Created!',
          description: 'Searching for available providers in your area...',
        });
        setBookingStatus('searching_providers');
        // Start provider search for instant bookings
        startProviderSearch(booking.id);
      } else {
        toast({
          title: 'Booking Scheduled!',
          description: 'Your service has been scheduled successfully.',
        });
        setLocation(`/bookings/${booking.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Booking Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Create legacy order mutation (for backward compatibility)
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

  // Enhanced helper functions for new booking flow
  const handleLocationConfirm = (location: LocationData) => {
    setServiceLocation(location);
    form.setValue('serviceLocation', location);
    setIsLocationSetup(false);
    
    // Auto-advance to next step
    if (bookingType === 'instant') {
      setStep(2); // Go to urgency selection
    } else {
      setStep(2); // Go to date/time selection
    }
  };

  const handleBookingTypeSelect = () => {
    if (!serviceLocation) {
      setIsLocationSetup(true);
      return;
    }
    
    // If location is already set, advance to next step
    if (bookingType === 'instant') {
      setStep(2); // Go to urgency selection
    } else {
      setStep(2); // Go to date/time selection for scheduled
    }
  };

  const handleUrgencySelect = () => {
    const urgency = form.getValues().urgency;
    if (urgency && serviceLocation && service) {
      // For instant bookings, start provider search
      setProviderSearching(true);
      findProvidersMutation.mutate({
        serviceId: service.id,
        location: {
          latitude: serviceLocation.latitude,
          longitude: serviceLocation.longitude,
        },
        urgency,
        maxDistance: 25, // 25km radius
      });
      setStep(3); // Go to provider selection
    }
  };

  const handleProviderSelect = (provider: ServiceProvider | MatchedProvider) => {
    setSelectedProvider(provider as ServiceProvider);
    if ('userId' in provider) {
      form.setValue('providerId', provider.userId);
    } else if ('id' in provider) {
      form.setValue('providerId', (provider as ServiceProvider).id);
    }
    
    if (bookingType === 'instant') {
      setStep(4); // Go directly to confirmation for instant bookings
    } else {
      setStep(3); // Go to date/time selection for scheduled
    }
  };

  const handleDateTimeSelect = () => {
    const formData = form.getValues();
    if (formData.scheduledDate && formData.scheduledTime) {
      setStep(4); // Go to confirmation
    }
  };

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!service || !serviceLocation) return;

    const bookingData = {
      serviceId: service.id,
      bookingType: data.bookingType,
      urgency: data.urgency,
      serviceLocation: data.serviceLocation,
      phone: data.phone,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      totalAmount: parseFloat(service.basePrice),
      estimatedDuration: service.estimatedDuration,
      ...(data.bookingType === 'scheduled' && {
        scheduledAt: new Date(`${format(data.scheduledDate!, 'yyyy-MM-dd')}T${data.scheduledTime}`).toISOString(),
      }),
      ...(data.providerId && { providerId: data.providerId }),
    };

    createServiceBookingMutation.mutate(bookingData);
  };

  // Helper function to start provider search for instant bookings
  const startProviderSearch = (bookingId: string) => {
    // This would typically connect to WebSocket for real-time updates
    // For now, simulate provider assignment with a timeout
    setTimeout(() => {
      setBookingStatus('provider_assigned');
      toast({
        title: 'Provider Assigned!',
        description: 'A provider has been assigned to your booking.',
      });
      setLocation(`/bookings/${bookingId}`);
    }, 3000);
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
          
          {/* Enhanced Progress Indicator */}
          <div className="flex items-center justify-center mb-6 overflow-x-auto">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-max">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                step >= 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <div className={`h-1 w-8 md:w-12 ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <div className={`h-1 w-8 md:w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
              <div className={`h-1 w-8 md:w-12 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                4
              </div>
              <div className={`h-1 w-8 md:w-12 ${step >= 4 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                5
              </div>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Book {service.name}</h1>
            <p className="text-muted-foreground">
              {step === 0 && 'Choose booking type and location'}
              {step === 1 && (bookingType === 'instant' ? 'Set urgency level' : 'Select date and time')}
              {step === 2 && 'Choose your service provider'}
              {step === 3 && 'Review booking details'}
              {step === 4 && 'Confirm your booking'}
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

        {/* Location Setup Modal */}
        {isLocationSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Service Location
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsLocationSetup(false)}
                    data-testid="close-location-setup"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LocationSetup
                  onSuccess={handleLocationConfirm}
                  onSkip={() => setIsLocationSetup(false)}
                  showSkipOption={false}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 0: Booking Type Selection */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Form {...form}>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Choose Booking Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="bookingType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How would you like to book this service?</FormLabel>
                          <FormControl>
                            <Tabs
                              value={field.value}
                              onValueChange={field.onChange}
                              className="w-full"
                              data-testid="booking-type-tabs"
                            >
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="instant" className="flex items-center space-x-2">
                                  <Zap className="w-4 h-4" />
                                  <span>Instant</span>
                                </TabsTrigger>
                                <TabsTrigger value="scheduled" className="flex items-center space-x-2">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>Scheduled</span>
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="instant" className="mt-4">
                                <div className="space-y-4">
                                  <div className="flex items-start space-x-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <Timer className="w-5 h-5 text-orange-500 mt-0.5" />
                                    <div>
                                      <h3 className="font-medium text-orange-900 dark:text-orange-100">
                                        Get service within 30 minutes
                                      </h3>
                                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                        We'll find the nearest available provider and they'll reach you ASAP.
                                        Perfect for urgent repairs or emergencies.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="scheduled" className="mt-4">
                                <div className="space-y-4">
                                  <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <CalendarIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                      <h3 className="font-medium text-blue-900 dark:text-blue-100">
                                        Schedule for later
                                      </h3>
                                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        Choose your preferred date and time. More providers to choose from
                                        and better rates for planned services.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location Status */}
                    {serviceLocation ? (
                      <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-green-900 dark:text-green-100">
                            Service Location Confirmed
                          </h3>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            {serviceLocation.address}, {serviceLocation.area}, {serviceLocation.city} - {serviceLocation.pincode}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsLocationSetup(true)}
                            className="mt-2"
                            data-testid="change-location"
                          >
                            Change Location
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <MapPin className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-amber-900 dark:text-amber-100">
                            Service Location Required
                          </h3>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            We need to know where you'd like the service performed.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setIsLocationSetup(true)}
                            className="mt-2"
                            data-testid="set-location"
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            Set Location
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleBookingTypeSelect}
                      className="w-full"
                      disabled={!serviceLocation}
                      data-testid="continue-booking-type"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </Form>
          </motion.div>
        )}

        {/* Step 1: Urgency Selection for Instant OR Date/Time for Scheduled */}
        {step === 1 && bookingType === 'instant' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Form {...form}>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Set Urgency Level</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How urgent is this service?</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 gap-3">
                              {[
                                { value: 'low', label: 'Low Priority', icon: Clock, desc: 'Can wait 20-30 minutes', color: 'blue' },
                                { value: 'normal', label: 'Normal', icon: Timer, desc: 'Standard service (15-25 minutes)', color: 'green' },
                                { value: 'high', label: 'High Priority', icon: AlertTriangle, desc: 'Quick response needed (10-20 minutes)', color: 'orange' },
                                { value: 'urgent', label: 'Emergency', icon: Zap, desc: 'Immediate attention required (5-15 minutes)', color: 'red' },
                              ].map(({ value, label, icon: Icon, desc, color }) => (
                                <div
                                  key={value}
                                  onClick={() => field.onChange(value)}
                                  className={`flex items-center space-x-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                    field.value === value
                                      ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/20`
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                  data-testid={`urgency-${value}`}
                                >
                                  <Icon className={`w-5 h-5 ${
                                    field.value === value ? `text-${color}-500` : 'text-muted-foreground'
                                  }`} />
                                  <div className="flex-1">
                                    <h3 className="font-medium">{label}</h3>
                                    <p className="text-sm text-muted-foreground">{desc}</p>
                                  </div>
                                  {field.value === value && (
                                    <CheckCircle2 className={`w-5 h-5 text-${color}-500`} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(0)}
                        className="flex-1"
                        data-testid="previous-step"
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        onClick={handleUrgencySelect}
                        className="flex-1"
                        disabled={!form.watch('urgency') || providerSearching}
                        data-testid="find-providers"
                      >
                        {providerSearching ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Finding Providers...
                          </>
                        ) : (
                          <>
                            Find Providers
                            <Route className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Form>
          </motion.div>
        )}

        {/* Step 2: Provider Selection */}
        {step === 2 && (
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
                              {form.watch('scheduledDate') && selectedProvider && 
                                getAvailableTimeSlots(form.watch('scheduledDate')!, selectedProvider).map((time) => (
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
                        name="serviceLocation.pincode"
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
                      name="serviceLocation.address"
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
                          {form.watch('scheduledDate') && format(form.watch('scheduledDate')!, 'PPP')} at {form.watch('scheduledTime')}
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