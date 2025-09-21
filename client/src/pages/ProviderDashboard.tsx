import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { useNotificationFallback } from '@/hooks/useNotificationFallback';
import PWANotificationManager from '@/components/PWANotificationManager';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  DollarSign,
  Star,
  Navigation,
  RefreshCw,
  Timer,
  Zap,
  Bell,
  BellRing,
  Play,
  Pause,
  Calendar,
  TrendingUp,
  MessageSquare,
  Route,
  Award,
  Target,
  BarChart3,
  PieChart,
  Settings,
  Filter,
  Search,
  Plus,
  Edit3,
  MapPin as LocationIcon,
  Clock as TimeIcon,
  Users,
  ThumbsUp,
  CreditCard,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  Shield,
  BookOpen,
  Wrench,
  Briefcase,
  Home,
  Car,
  Smartphone,
  Tv,
  Droplets,
  Lightbulb,
  Wind
} from 'lucide-react';
import { JobRequest, ProviderJobsData } from '@shared/schema';
import CountdownTimer, { useCountdownTimer } from '@/components/CountdownTimer';

export default function ServiceProviderDashboard() {
  const { user } = useAuth();
  const { subscribe, sendMessage, isConnected } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // PWA Notification System Integration
  const {
    permissionState,
    preferences,
    isEnabled: pwaEnabled,
    requestNotificationPermission,
    testNotification
  } = usePWANotifications();
  
  const {
    fallbackNotifications,
    connectionStats,
    shouldUseFallback,
    unreadCount: fallbackUnreadCount,
    hasEmergencyNotifications
  } = useNotificationFallback();
  
  // Enhanced state management
  const [jobFilter, setJobFilter] = useState('all'); // 'all', 'urgent', 'nearby', 'high-paying'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [skillsToAdd, setSkillsToAdd] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [availabilityData, setAvailabilityData] = useState<any>({});

  // Fetch provider jobs - connect to real API endpoint
  const { data: jobsData, isLoading, error, refetch } = useQuery<ProviderJobsData>({
    queryKey: ['/api/v1/providers/me/job-requests'],
    enabled: !!user && user.role === 'service_provider',
    refetchInterval: 30000, // Refetch every 30 seconds
    select: (data: any) => {
      // Backend returns { success: true, data: { pendingOffers, activeJobs, recentJobs, ... } }
      // Use the structured data directly from backend
      const backendData = data?.data || {};
      return {
        pendingOffers: backendData.pendingOffers || [],
        activeJobs: backendData.activeJobs || [],
        recentJobs: backendData.recentJobs || [],
        totalOffers: backendData.totalOffers || 0,
        totalActive: backendData.totalActive || 0,
        totalCompleted: backendData.totalCompleted || 0,
      };
    },
  });

  // Fetch provider statistics
  const { data: providerStats } = useQuery({
    queryKey: ['/api/v1/providers/profile'],
    enabled: !!user && user.role === 'service_provider',
    select: (data: any) => data?.profile || {},
  });

  // Accept job mutation - connect to real API endpoint
  const acceptJobMutation = useMutation({
    mutationFn: async ({ bookingId, estimatedArrival, quotedPrice, notes }: {
      bookingId: string;
      estimatedArrival?: string;
      quotedPrice?: number;
      notes?: string;
    }) => {
      return await apiRequest('POST', `/api/v1/orders/${bookingId}/accept`, {
        estimatedArrival,
        quotedPrice,
        notes,
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Job Accepted!",
        description: "You have successfully accepted the job request.",
      });
      // Invalidate both job requests and profile data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Accept Job",
        description: error?.message || "Unable to accept job request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Decline job mutation - connect to real API endpoint
  const declineJobMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: {
      bookingId: string;
      reason?: string;
    }) => {
      return await apiRequest('POST', `/api/v1/orders/${bookingId}/decline`, {
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Job Declined",
        description: "You have declined the job offer.",
      });
      // Invalidate both job requests and profile data
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Decline Job",
        description: error?.message || "Unable to decline job request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start service mutation
  const startServiceMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('POST', `/api/v1/orders/${orderId}/start`);
    },
    onSuccess: () => {
      toast({
        title: "Service Started!",
        description: "You have started working on the service.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Service",
        description: error?.message || "Unable to start service. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete service mutation
  const completeServiceMutation = useMutation({
    mutationFn: async ({ orderId, completionNotes }: { orderId: string; completionNotes?: string }) => {
      return await apiRequest('POST', `/api/v1/orders/${orderId}/complete`, { completionNotes });
    },
    onSuccess: () => {
      toast({
        title: "Service Completed!",
        description: "The service has been marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Complete Service",
        description: error?.message || "Unable to complete service. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    const handleJobOffer = async (data: any) => {
      console.log('🔔 New job offer received:', data);
      
      // Add to notifications
      const newNotification = {
        id: Date.now(),
        type: 'job_offer',
        title: "New Job Offer!",
        message: `${data.booking?.serviceType} - ₹${data.booking?.totalAmount}`,
        timestamp: new Date(),
        data: data,
        read: false,
        urgency: data.booking?.urgency || 'normal',
        actions: ['accept', 'decline']
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      
      // Enhanced audio alerts with urgency support
      try {
        const soundFile = data.booking?.urgency === 'urgent' || data.booking?.urgency === 'emergency' 
          ? '/notification-urgent.mp3' 
          : '/notification-sound.mp3';
        const audio = new Audio(soundFile);
        audio.volume = 0.8;
        
        // Play multiple times for urgent jobs
        if (data.booking?.urgency === 'urgent' || data.booking?.urgency === 'emergency') {
          audio.play().catch(console.error);
          setTimeout(() => audio.play().catch(console.error), 1000);
          setTimeout(() => audio.play().catch(console.error), 2000);
        } else {
          audio.play().catch(console.error);
        }
      } catch (e) {
        console.log('Notification sound not available');
      }
      
      // Show browser notification if PWA notifications enabled
      if (pwaEnabled && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notificationTitle = data.booking?.urgency === 'urgent' || data.booking?.urgency === 'emergency' 
            ? '🚨 URGENT JOB REQUEST' 
            : '🔧 New Job Request';
          
          const notification = new Notification(notificationTitle, {
            body: `${data.booking?.serviceType} needed. Estimated: ₹${data.booking?.totalAmount}`,
            icon: '/icons/job-notification.png',
            badge: '/icons/notification-badge.png',
            tag: `job-${data.booking?.id}`,
            requireInteraction: true,
            actions: [
              { action: 'accept', title: 'Accept Job', icon: '/icons/accept.png' },
              { action: 'decline', title: 'Decline', icon: '/icons/decline.png' },
              { action: 'view', title: 'View Details', icon: '/icons/view.png' }
            ],
            data: {
              type: 'job_offer',
              jobId: data.jobRequest?.id,
              bookingId: data.booking?.id,
              url: `/provider/dashboard?jobId=${data.jobRequest?.id}`
            }
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          
          // Auto-close after 5 minutes (job expiry)
          setTimeout(() => notification.close(), 5 * 60 * 1000);
        } catch (error) {
          console.error('Failed to show browser notification:', error);
        }
      }
      
      toast({
        title: data.booking?.urgency === 'urgent' || data.booking?.urgency === 'emergency' 
          ? "🚨 URGENT JOB OFFER!" 
          : "🔔 New Job Offer!",
        description: `${data.booking?.serviceType} - ₹${data.booking?.totalAmount}`,
        duration: data.booking?.urgency === 'urgent' ? 10000 : 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
    };

    const handleJobUpdate = (data: any) => {
      console.log('📢 Job update received:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
    };

    const handleJobExpired = (data: any) => {
      console.log('⏰ Job offer expired:', data);
      toast({
        title: "Job Offer Expired",
        description: `A job offer has expired and is no longer available.`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
    };

    // Subscribe to WebSocket events using the context
    const unsubscribeJobOffer = subscribe('provider.job_offer', handleJobOffer);
    const unsubscribeNewOffer = subscribe('job.new_offer', handleJobUpdate);
    const unsubscribeAccepted = subscribe('job.accepted_confirmed', handleJobUpdate);
    const unsubscribeDeclined = subscribe('job.declined_confirmed', handleJobUpdate);
    const unsubscribeExpired = subscribe('job.expired', handleJobExpired);

    // Subscribe to provider job updates
    sendMessage('subscribe_provider_jobs', { providerId: user?.id });

    return () => {
      // Unsubscribe from all events
      unsubscribeJobOffer();
      unsubscribeNewOffer();
      unsubscribeAccepted();
      unsubscribeDeclined();
      unsubscribeExpired();
    };
  }, [subscribe, sendMessage, isConnected, user?.id, queryClient, toast]);

  // Toggle online status
  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    if (isConnected) {
      sendMessage('provider_online_status', { isOnline: checked });
    }
    toast({
      title: checked ? "You're Online!" : "You're Offline",
      description: checked ? "You will receive job offers" : "You won't receive new job offers",
    });
  };

  // Accept job handler
  const handleAcceptJob = (bookingId: string) => {
    const estimatedArrival = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now
    acceptJobMutation.mutate({ 
      bookingId, 
      estimatedArrival,
      notes: "On my way to your location!"
    });
  };

  // Decline job handler
  const handleDeclineJob = (bookingId: string, reason?: string) => {
    declineJobMutation.mutate({ bookingId, reason });
  };

  if (!user || user.role !== 'service_provider') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only available for service providers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOffers = jobsData?.pendingOffers || [];
  const activeJobs = jobsData?.activeJobs || [];
  const recentJobs = jobsData?.recentJobs || [];

  // Filter jobs based on selected filter
  const filteredOffers = pendingOffers.filter(job => {
    switch (jobFilter) {
      case 'urgent':
        return job.booking.urgency === 'urgent';
      case 'nearby':
        return job.distanceKm && job.distanceKm <= 5;
      case 'high-paying':
        return parseFloat(job.booking.totalAmount) >= 1000;
      default:
        return true;
    }
  });

  // Real performance data from API
  const performanceStats = {
    completionRate: providerStats?.completionRate?.toString() || '0',
    averageRating: providerStats?.averageRating?.toString() || '0',
    totalEarnings: providerStats?.totalEarnings ? `₹${providerStats.totalEarnings}` : '₹0',
    monthlyEarnings: providerStats?.monthlyEarnings ? `₹${providerStats.monthlyEarnings}` : '₹0',
    totalJobs: providerStats?.totalJobs?.toString() || '0',
    responseTime: providerStats?.averageResponseTime?.toString() || '0',
    onTimeRate: providerStats?.onTimePercentage?.toString() || '0',
    activeStreak: providerStats?.activeStreak?.toString() || '0'
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">

      {/* Enhanced Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Earnings</p>
                  <p className="text-3xl font-bold">{performanceStats.totalEarnings}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+15% this month</span>
                  </div>
                </div>
                <DollarSign className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Completion Rate</p>
                  <p className="text-3xl font-bold">{performanceStats.completionRate}%</p>
                  <div className="flex items-center mt-2">
                    <Target className="h-4 w-4 mr-1" />
                    <span className="text-sm">Excellent</span>
                  </div>
                </div>
                <CheckCircle className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Customer Rating</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-3xl font-bold">{performanceStats.averageRating}</p>
                    <div className="flex space-x-1">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`h-5 w-5 ${
                          star <= Math.floor(parseFloat(performanceStats.averageRating)) ? 'fill-current' : ''
                        }`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-yellow-100">From {performanceStats.totalJobs} reviews</span>
                </div>
                <Award className="h-12 w-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Response Time</p>
                  <p className="text-3xl font-bold">{performanceStats.responseTime}min</p>
                  <div className="flex items-center mt-2">
                    <Zap className="h-4 w-4 mr-1" />
                    <span className="text-sm">Lightning Fast</span>
                  </div>
                </div>
                <Timer className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* PWA Notification Manager Component */}
      <PWANotificationManager 
        userId={user?.id || ''}
        userType="service_provider"
        onNotificationReceived={(notification) => {
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
        }}
      />

      {/* Enhanced Navigation Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-7 bg-white dark:bg-gray-800 border">
            <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="offers" data-testid="tab-offers" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Job Queue
              {filteredOffers.length > 0 && (
                <Badge variant="destructive" className="ml-2">{filteredOffers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              Active Work
              {activeJobs.length > 0 && (
                <Badge variant="default" className="ml-2 bg-green-600">{activeJobs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="earnings" data-testid="tab-earnings" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="skills" data-testid="tab-skills" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Star className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
          </TabsList>
          
          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Provider Profile</DialogTitle>
                  <DialogDescription>
                    Update your professional information and service preferences.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input id="businessName" placeholder="Your service business name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceRadius">Service Radius (km)</Label>
                      <Input id="serviceRadius" type="number" placeholder="25" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea id="bio" placeholder="Tell customers about your expertise and experience..." />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                  <Button>Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pending Offers */}
        <TabsContent value="offers" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingOffers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Offers</h3>
                <p className="text-muted-foreground">
                  {isOnline ? "You're online and ready to receive offers!" : "Turn on your availability to receive job offers"}
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingOffers.map((job) => (
              <JobOfferCard
                key={job.id}
                job={job}
                onAccept={() => handleAcceptJob(job.booking.id)}
                onDecline={() => handleDeclineJob(job.booking.id, "Not available")}
                isAccepting={acceptJobMutation.isPending}
                isDeclining={declineJobMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        {/* Active Jobs */}
        <TabsContent value="active" className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Jobs</h3>
                <p className="text-muted-foreground">Accepted jobs will appear here</p>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => (
              <ActiveJobCard
                key={job.id}
                job={job}
                onStartService={() => startServiceMutation.mutate(job.booking.id)}
                onCompleteService={(notes) => completeServiceMutation.mutate({ orderId: job.booking.id, completionNotes: notes })}
                isStarting={startServiceMutation.isPending}
                isCompleting={completeServiceMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        {/* Recent Jobs */}
        <TabsContent value="recent" className="space-y-4">
          {recentJobs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                <p className="text-muted-foreground">Your recent job history will appear here</p>
              </CardContent>
            </Card>
          ) : (
            recentJobs.map((job) => (
              <JobHistoryCard key={job.id} job={job} />
            ))
          )}
        </TabsContent>

        {/* PWA Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>PWA Notification Center</span>
                {!pwaEnabled && (
                  <Badge variant="destructive">Setup Required</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your push notifications and ensure you never miss important job alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Permission Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Push Notification Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {permissionState === 'granted' ? 'Enabled and working' : 
                     permissionState === 'denied' ? 'Blocked by browser' : 
                     'Not configured'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={permissionState === 'granted' ? 'default' : 'destructive'}>
                    {permissionState === 'granted' ? '✅ Active' : 
                     permissionState === 'denied' ? '🔕 Blocked' : 
                     '⚠️ Setup'}
                  </Badge>
                  {permissionState !== 'granted' && (
                    <Button 
                      size="sm" 
                      onClick={requestNotificationPermission}
                      data-testid="button-enable-notifications"
                    >
                      Enable Notifications
                    </Button>
                  )}
                </div>
              </div>

              {/* Connection Status */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">
                        WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${shouldUseFallback ? 'bg-orange-500' : 'bg-green-500'}`} />
                      <span className="text-sm font-medium">
                        Backup: {shouldUseFallback ? 'Active' : 'Standby'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Test Notification */}
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Test Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Send a test notification to verify your setup
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={testNotification}
                  disabled={!pwaEnabled}
                  data-testid="button-test-notification"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test Alert
                </Button>
              </div>

              {/* Recent Notifications from Fallback System */}
              {fallbackNotifications && fallbackNotifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent Notifications ({fallbackNotifications.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {fallbackNotifications.slice(0, 5).map((notification, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium text-sm">{notification.title}</h5>
                            <p className="text-xs text-muted-foreground">{notification.body}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {notification.urgency || 'normal'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification Preferences */}
              <div className="space-y-3">
                <h4 className="font-medium">Notification Preferences</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="job-alerts">Job Request Alerts</Label>
                    <Switch id="job-alerts" checked={preferences?.jobAlerts !== false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="urgent-alerts">Emergency Job Alerts (Audio)</Label>
                    <Switch id="urgent-alerts" checked={preferences?.urgentAlerts !== false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customer-messages">Customer Message Alerts</Label>
                    <Switch id="customer-messages" checked={preferences?.customerMessages !== false} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Job Offer Card Component
function JobOfferCard({ 
  job, 
  onAccept, 
  onDecline, 
  isAccepting, 
  isDeclining 
}: {
  job: JobRequest;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
}) {
  const queryClient = useQueryClient();
  const [isExpired, setIsExpired] = useState(false);
  const timeRemaining = useCountdownTimer(job.expiresAt);
  
  // Handle expiration
  useEffect(() => {
    if (timeRemaining.isExpired && !isExpired) {
      setIsExpired(true);
      // Optional: Auto-refresh after expiration
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] });
      }, 2000);
    }
  }, [timeRemaining.isExpired, isExpired, queryClient]);
  
  const isOfferExpired = isExpired || timeRemaining.isExpired;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg" data-testid={`text-service-type-${job.id}`}>
                {job.booking.serviceType}
              </CardTitle>
              <CardDescription>
                Order #{job.booking.id.slice(-8)} • {job.booking.customerName}
              </CardDescription>
            </div>
            <div className="text-right space-y-2">
              <Badge variant={job.booking.urgency === 'urgent' ? 'destructive' : 'secondary'}>
                {job.booking.urgency}
              </Badge>
              <div className="flex flex-col items-end">
                <CountdownTimer 
                  expiresAt={job.expiresAt}
                  onExpired={() => setIsExpired(true)}
                  size="sm"
                  className="mb-1"
                  data-testid={`countdown-timer-${job.id}`}
                />
                {isOfferExpired && (
                  <Badge variant="destructive" className="text-xs">
                    EXPIRED
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location */}
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{job.booking.serviceLocation.address}</p>
              {job.distanceKm && (
                <p className="text-xs text-muted-foreground">
                  {job.distanceKm.toFixed(1)} km away
                </p>
              )}
              {job.booking.serviceLocation.instructions && (
                <p className="text-xs text-muted-foreground mt-1">
                  Instructions: {job.booking.serviceLocation.instructions}
                </p>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-lg font-semibold">₹{job.booking.totalAmount}</span>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              onClick={onAccept}
              disabled={isAccepting || isDeclining || isOfferExpired}
              className={`flex-1 ${isOfferExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid={`button-accept-${job.id}`}
            >
              {isOfferExpired ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Expired
                </>
              ) : isAccepting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Job
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onDecline}
              disabled={isAccepting || isDeclining || isOfferExpired}
              className={`flex-1 ${isOfferExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid={`button-decline-${job.id}`}
            >
              {isOfferExpired ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Expired
                </>
              ) : isDeclining ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Job History Card Component
function JobHistoryCard({ job }: { job: JobRequest }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
      case 'declined':
        return <Badge variant="secondary">Declined</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-medium">{job.booking.serviceType}</h4>
            <p className="text-sm text-muted-foreground">
              {job.booking.customerName} • ₹{job.booking.totalAmount}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(job.sentAt).toLocaleDateString()} at {new Date(job.sentAt).toLocaleTimeString()}
            </p>
          </div>
          {getStatusBadge(job.status)}
        </div>
      </CardContent>
    </Card>
  );
}

// Active Job Card Component with Order Management
function ActiveJobCard({ 
  job, 
  onStartService, 
  onCompleteService, 
  isStarting, 
  isCompleting 
}: {
  job: JobRequest;
  onStartService: () => void;
  onCompleteService: (notes?: string) => void;
  isStarting: boolean;
  isCompleting: boolean;
}) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'accepted':
        return { label: 'Ready to Start', color: 'bg-blue-500', icon: Play };
      case 'in_progress':
        return { label: 'Service In Progress', color: 'bg-orange-500', icon: Activity };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-500', icon: CheckCircle };
      default:
        return { label: 'Active', color: 'bg-gray-500', icon: Clock };
    }
  };

  const statusDisplay = getStatusDisplay(job.status || 'accepted');
  const StatusIcon = statusDisplay.icon;

  const handleCompleteService = () => {
    onCompleteService(completionNotes || undefined);
    setShowCompletionDialog(false);
    setCompletionNotes('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg" data-testid={`text-active-service-${job.id}`}>
                {job.booking.serviceType}
              </CardTitle>
              <CardDescription>
                Order #{job.booking.id.slice(-8)} • {job.booking.customerName}
              </CardDescription>
            </div>
            <div className="text-right space-y-2">
              <Badge className={`${statusDisplay.color} text-white`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusDisplay.label}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(job.sentAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Customer & Location Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{job.booking.customerName}</p>
                <p className="text-xs text-muted-foreground">Customer Contact</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{job.booking.serviceLocation.address}</p>
                {job.distanceKm && (
                  <p className="text-xs text-muted-foreground">
                    {job.distanceKm.toFixed(1)} km away
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">₹{job.booking.totalAmount}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Earnings</span>
            </div>
          </div>

          {/* Action Buttons */}
          <Separator />
          
          <div className="flex space-x-2">
            {(['accepted', 'provider_assigned'].includes(job.status) || !job.status) && (
              <Button
                onClick={onStartService}
                disabled={isStarting}
                className="flex-1"
                data-testid={`button-start-service-${job.id}`}
              >
                {isStarting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Service
                  </>
                )}
              </Button>
            )}
            
            {(['in_progress', 'started', 'work_in_progress'].includes(job.status)) && (
              <Button
                onClick={() => setShowCompletionDialog(true)}
                disabled={isCompleting}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid={`button-complete-service-${job.id}`}
              >
                {isCompleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Service
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              className="flex-1"
              data-testid={`button-call-customer-${job.id}`}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
            
            <Button
              variant="outline"
              className="flex-1"
              data-testid={`button-navigate-${job.id}`}
            >
              <Route className="h-4 w-4 mr-2" />
              Navigate
            </Button>
          </div>

          {/* Service Instructions */}
          {job.booking.serviceLocation.instructions && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Special Instructions:</p>
                  <p className="text-sm text-muted-foreground">{job.booking.serviceLocation.instructions}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 mx-4">
            <CardHeader>
              <CardTitle>Complete Service</CardTitle>
              <CardDescription>
                Mark this service as completed and add any final notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Completion Notes (Optional)</label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  rows={3}
                  placeholder="Add any final notes about the service completion..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleCompleteService}
                  disabled={isCompleting}
                  className="flex-1"
                >
                  {isCompleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Service
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}