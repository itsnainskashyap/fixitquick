import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import LocationSetup from '@/components/LocationSetup';
import { OrderAssignmentStatus } from '@/components/OrderAssignmentStatus';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays, startOfToday, isAfter, isBefore, addMinutes, isToday } from 'date-fns';
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
  // No providerId field needed - providers are auto-assigned
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
  
  // Get URL parameters for booking type and detect category context
  const urlParams = new URLSearchParams(window.location.search);
  const bookingTypeFromUrl = urlParams.get('type') as 'instant' | 'scheduled' | null;
  const urgencyFromUrl = urlParams.get('urgency') as 'low' | 'normal' | 'high' | 'urgent' | null;
  
  // Check if user came from category navigation (no instant booking allowed)
  const isFromCategory = !bookingTypeFromUrl || urlParams.get('category') !== null;
  
  // Force scheduled booking when coming from categories per requirements
  const forcedBookingType = isFromCategory ? 'scheduled' : (bookingTypeFromUrl || 'instant');
  
  // Enhanced state management
  const [step, setStep] = useState(0); // Start with step 0 for booking type selection
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  // No manual provider selection needed - automatic assignment handles provider matching
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
      bookingType: forcedBookingType,
      urgency: urgencyFromUrl || 'normal',
      phone: user?.phone || '',
      notes: '',
      paymentMethod: 'online',
    },
  });
  
  // Auto-advance to step 1 if we have instant booking parameters
  useEffect(() => {
    if (bookingTypeFromUrl === 'instant' && urgencyFromUrl && serviceLocation) {
      setStep(1); // Skip booking type selection and go straight to details
    }
  }, [bookingTypeFromUrl, urgencyFromUrl, serviceLocation]);

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

  // Removed findProvidersMutation - orders are created directly and providers are matched server-side

  // Enhanced order creation mutation
  const createServiceBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      return await apiRequest('POST', '/api/v1/service-bookings', bookingData);
    },
    onSuccess: (order: any) => {
      setCreatedBookingId(order.id); // Now using order ID
      setCurrentBooking(order);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      setStep(4); // Show assignment status
      
      if (order.bookingType === 'instant') {
        toast({
          title: 'Order Created!',
          description: 'Searching for available providers in your area...',
        });
        setBookingStatus('searching_providers');
        // Redirect to order tracking page
        setTimeout(() => {
          setLocation(`/orders/${order.id}`);
        }, 2000);
      } else {
        toast({
          title: 'Order Scheduled!',
          description: 'Your service has been scheduled successfully.',
        });
        setLocation(`/orders/${order.id}`);
      }
    },
    onError: (error: any) => {
      console.error('Failed to create booking:', error);
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
    
    // Auto-advance to step 1 for both booking types (urgency or date/time selection)
    setStep(1);
  };

  const handleBookingTypeSelect = () => {
    if (!serviceLocation) {
      setIsLocationSetup(true);
      return;
    }
    
    // If location is already set, advance to step 1 for both booking types
    setStep(1);
  };

  const handleUrgencySelect = () => {
    const urgency = form.getValues().urgency;
    if (urgency && serviceLocation && service) {
      // Skip provider selection for all bookings - automatic matching handles provider assignment
      setStep(2); // Go to booking review (step 2)
    }
  };

  // Removed handleProviderSelect - provider assignment is handled automatically

  const handleDateTimeSelect = () => {
    const formData = form.getValues();
    if (formData.scheduledDate && formData.scheduledTime) {
      setStep(2); // Go to booking review (step 2)
    }
  };

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!service || !serviceLocation) return;

    const bookingData = {
      serviceId: service.id,
      bookingType: data.bookingType,
      urgency: data.urgency,
      serviceLocation: {
        type: 'current' as const,
        address: data.serviceLocation.address,
        latitude: data.serviceLocation.latitude,
        longitude: data.serviceLocation.longitude,
        instructions: '', // Optional field
        landmarkDetails: '', // Optional field
      },
      serviceDetails: {
        basePrice: parseFloat(service.basePrice),
        estimatedDuration: service.estimatedDuration,
        workflowSteps: [], // Will be populated from service data
        specialRequirements: [], // Optional
      },
      phone: data.phone,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      ...(data.bookingType === 'scheduled' && {
        scheduledAt: new Date(`${format(data.scheduledDate!, 'yyyy-MM-dd')}T${data.scheduledTime}`).toISOString(),
      }),
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

  // Helper function to convert HH:mm time string to minutes since midnight
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getAvailableTimeSlots = (date: Date, providerId?: string) => {
    // Handle loading state - show empty array with proper loading indication
    if (loadingProviders) {
      return [];
    }
    
    // Handle no providers available
    if (!providers || providers.length === 0) {
      return [];
    }
    
    const dayName = format(date, 'EEEE').toLowerCase();
    
    // If specific provider is selected, use only that provider
    if (providerId) {
      const selectedProvider = providers.find(p => p.userId === providerId);
      if (!selectedProvider) return [];
      
      const availability = selectedProvider.availability[dayName];
      if (!availability) return [];
      
      const [start, end] = availability.split('-');
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      
      let availableSlots = timeSlots.filter(slot => {
        const slotMinutes = timeToMinutes(slot);
        return slotMinutes >= startMinutes && slotMinutes < endMinutes;
      });
      
      // Apply same-day cutoff for selected provider
      if (isToday(date)) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const bufferMinutes = 45; // Dispatch + travel buffer
        const cutoffMinutes = currentMinutes + bufferMinutes;
        
        availableSlots = availableSlots.filter(slot => {
          const slotMinutes = timeToMinutes(slot);
          return slotMinutes > cutoffMinutes;
        });
      }
      
      return availableSlots;
    }
    
    // FIXED: Compute union of availability across ALL eligible providers
    // Create a boolean array to track slot availability across all providers
    const slotAvailability = new Array(timeSlots.length).fill(false);
    
    // Check availability for each provider and OR the results together
    providers.forEach(provider => {
      const availability = provider.availability[dayName];
      if (!availability) return;
      
      const [start, end] = availability.split('-');
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      
      timeSlots.forEach((slot, index) => {
        const slotMinutes = timeToMinutes(slot);
        if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
          slotAvailability[index] = true;
        }
      });
    });
    
    // Get all available slots from the union of provider availabilities
    let availableSlots = timeSlots.filter((_, index) => slotAvailability[index]);
    
    // FIXED: Apply same-day time cutoff with buffer for dispatch/travel
    if (isToday(date)) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const bufferMinutes = 45; // 45-minute buffer for dispatch + travel time
      const cutoffMinutes = currentMinutes + bufferMinutes;
      
      availableSlots = availableSlots.filter(slot => {
        const slotMinutes = timeToMinutes(slot);
        return slotMinutes > cutoffMinutes;
      });
    }
    
    return availableSlots;
  };

  const calculateTotal = () => {
    if (!service) return 0;
    const basePrice = parseFloat(service.basePrice);
    // Add any additional charges here (convenience fee, etc.)
    return basePrice;
  };

  if (loadingService) {
    return (
      <Layout>
        <main className="pb-6">
          {/* Header Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-10 w-32 mb-4" />
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2 md:space-x-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-1 w-8 md:w-12" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-1 w-8 md:w-12" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-1 w-8 md:w-12" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            </div>
            <div className="text-center mb-6">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>
          
          {/* Service Details Skeleton */}
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Form Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </main>
      </Layout>
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
    <Layout>
      <main className="pb-6">
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
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Book {service.name}</h1>
            <p className="text-muted-foreground">
              {step === 0 && 'Choose booking type and location'}
              {step === 1 && (bookingType === 'instant' ? 'Set urgency level' : 'Select date and time')}
              {step === 2 && 'Review booking details'}
              {step === 3 && 'Confirm and wait for provider assignment'}
              {step === 4 && 'Finding your service provider...'}
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[var(--z-modal)] p-4"
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
                              <TabsList className="grid w-full grid-cols-2 h-12">
                                <TabsTrigger 
                                  value="instant" 
                                  className="flex items-center space-x-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all duration-200 font-medium"
                                >
                                  <Zap className="w-4 h-4" />
                                  <span>Instant</span>
                                </TabsTrigger>
                                <TabsTrigger 
                                  value="scheduled" 
                                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all duration-200 font-medium"
                                >
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>Scheduled</span>
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="instant" className="mt-4">
                                <div className="space-y-4">
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start space-x-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
                                  >
                                    <div className="relative">
                                      <Timer className="w-5 h-5 text-orange-500 mt-0.5" />
                                      <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"
                                      />
                                    </div>
                                    <div>
                                      <h3 className="font-medium text-orange-900 dark:text-orange-100">
                                        Get service within 30 minutes
                                      </h3>
                                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                        We'll find the nearest available provider and they'll reach you ASAP.
                                        Perfect for urgent repairs or emergencies.
                                      </p>
                                      <div className="flex items-center space-x-2 mt-2">
                                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                          Fast Response
                                        </Badge>
                                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                          Higher Priority
                                        </Badge>
                                      </div>
                                    </div>
                                  </motion.div>
                                </div>
                              </TabsContent>
                              <TabsContent value="scheduled" className="mt-4">
                                <div className="space-y-4">
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                                  >
                                    <CalendarIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                      <h3 className="font-medium text-blue-900 dark:text-blue-100">
                                        Schedule for later
                                      </h3>
                                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        Choose your preferred date and time. More providers to choose from
                                        and better rates for planned services.
                                      </p>
                                      <div className="flex items-center space-x-2 mt-2">
                                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                          Better Rates
                                        </Badge>
                                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                          More Options
                                        </Badge>
                                      </div>
                                    </div>
                                  </motion.div>
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
                        {providerSearching || loadingProviders ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Finding Providers...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
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

        {/* Automatic Provider Assignment Status - No manual selection needed */}
        {/* Provider matching is handled automatically on the server side */}

        {/* Step 2: Scheduled booking date/time selection OR instant booking provider search */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Form {...form}>
              <div className="space-y-6">
                {bookingType === 'scheduled' ? (
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
                                modifiers={{
                                  available: (date) => {
                                    if (!providers || providers.length === 0) return false;
                                    if (isBefore(date, startOfToday()) || isAfter(date, addDays(new Date(), 30))) return false;
                                    const dayName = format(date, 'EEEE').toLowerCase();
                                    return providers.some(provider => provider.availability[dayName]);
                                  }
                                }}
                                modifiersStyles={{
                                  available: {
                                    backgroundColor: 'hsl(var(--primary))',
                                    color: 'hsl(var(--primary-foreground))',
                                    fontWeight: 'bold'
                                  }
                                }}
                                initialFocus
                              />
                              <div className="p-3 border-t text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded bg-primary"></div>
                                    <span>Providers available</span>
                                  </div>
                                  {providers && providers.length > 0 && (
                                    <span className="text-primary font-medium">
                                      {providers.filter(p => p.isOnline).length} online
                                    </span>
                                  )}
                                </div>
                              </div>
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
                              {form.watch('scheduledDate') && loadingProviders ? (
                                <div className="p-4">
                                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Loading available slots...</span>
                                  </div>
                                </div>
                              ) : form.watch('scheduledDate') ? (() => {
                                const availableSlots = getAvailableTimeSlots(form.watch('scheduledDate')!);
                                
                                if (availableSlots.length === 0) {
                                  if (!providers || providers.length === 0) {
                                    return (
                                      <div className="p-4 text-center">
                                        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground font-medium">
                                          No providers available
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Please try selecting a different date
                                        </p>
                                      </div>
                                    );
                                  } else if (isToday(form.watch('scheduledDate')!)) {
                                    return (
                                      <div className="p-4 text-center">
                                        <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground font-medium">
                                          No slots available for today
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Try tomorrow or select a different date
                                        </p>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="p-4 text-center">
                                        <Calendar className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground font-medium">
                                          No slots available on this date
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Providers are not working on this day
                                        </p>
                                      </div>
                                    );
                                  }
                                }
                                
                                return availableSlots.map((time) => (
                                  <SelectItem 
                                    key={time} 
                                    value={time}
                                    data-testid={`time-slot-${time}`}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{time}</span>
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        Available
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ));
                              })() : (
                                <div className="p-4 text-center">
                                  <CalendarIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">
                                    Select a date to see available times
                                  </p>
                                </div>
                              )}
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
                ) : (
                  // Instant booking - Start immediate provider matching
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="w-5 h-5 text-orange-500" />
                        <span>Finding Available Providers</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Searching for nearby providers...
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            We're finding the best available providers in your area for immediate service.
                          </p>
                        </div>
                        
                        {providers && providers.length > 0 ? (
                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center space-x-2 text-green-800 dark:text-green-300">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-medium">
                                Found {providers.length} available provider{providers.length !== 1 ? 's' : ''}!
                              </span>
                            </div>
                            <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                              Ready to provide immediate service in your area.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300">
                              <AlertTriangle className="w-5 h-5" />
                              <span className="font-medium">Still searching...</span>
                            </div>
                            <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
                              Expanding search radius to find available providers.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Continue button for instant booking */}
                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          data-testid="back-button"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setStep(3)}
                          disabled={!providers || providers.length === 0}
                          data-testid="continue-instant-button"
                        >
                          Continue to Booking
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </Form>
          </motion.div>
        )}

        {/* Step 3: Confirm and wait for provider assignment */}
        {step === 3 && (
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
                        <span className="text-primary font-medium">Auto-assigned after booking confirmation</span>
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
                    disabled={createServiceBookingMutation.isPending}
                    data-testid="confirm-booking"
                  >
                    {createServiceBookingMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Booking...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        )}

        {/* Step 4: Real-time Provider Assignment Status */}
        {step === 4 && createdBookingId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Success Message */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-green-800 mb-2">Booking Confirmed!</h3>
                <p className="text-sm text-green-700">
                  Your service request has been created successfully. We're now finding the best available provider in your area.
                </p>
              </CardContent>
            </Card>

            {/* Real-time Assignment Status */}
            <OrderAssignmentStatus 
              orderId={createdBookingId}
              data-testid="assignment-status"
            />

            {/* Service Details Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Service</span>
                  <span className="font-medium">{service?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Booking Type</span>
                  <Badge variant={bookingType === 'instant' ? 'default' : 'secondary'}>
                    {bookingType === 'instant' ? 'Instant' : 'Scheduled'}
                  </Badge>
                </div>
                {bookingType === 'scheduled' && (
                  <div className="flex justify-between text-sm">
                    <span>Scheduled For</span>
                    <span className="font-medium">
                      {form.watch('scheduledDate') && format(form.watch('scheduledDate')!, 'PPP')} at {form.watch('scheduledTime')}
                    </span>
                  </div>
                )}
                {serviceLocation && (
                  <div className="flex justify-between text-sm">
                    <span>Location</span>
                    <span className="font-medium text-right max-w-48">
                      {serviceLocation.area}, {serviceLocation.city}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>₹{service?.basePrice}</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setLocation('/bookings')}
                className="flex-1"
                data-testid="view-bookings"
              >
                View My Bookings
              </Button>
              <Button
                onClick={() => setLocation('/services')}
                className="flex-1"
                data-testid="book-another"
              >
                Book Another Service
              </Button>
            </div>
          </motion.div>
        )}
      </main>

      <BottomNavigation />
    </Layout>
  );
}