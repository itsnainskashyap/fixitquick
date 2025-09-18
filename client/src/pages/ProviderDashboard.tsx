import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';
import { JobRequest, ProviderJobsData } from '@shared/schema';
import CountdownTimer, { useCountdownTimer } from '@/components/CountdownTimer';

export default function ServiceProviderDashboard() {
  const { user } = useAuth();
  const { subscribe, sendMessage, isConnected } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);
  const [selectedTab, setSelectedTab] = useState('offers');

  // Fetch provider jobs - connect to real API endpoint
  const { data: jobsData, isLoading, error, refetch } = useQuery<ProviderJobsData>({
    queryKey: ['/api/v1/providers/me/job-requests'],
    enabled: !!user && user.role === 'service_provider',
    refetchInterval: 30000, // Refetch every 30 seconds
    select: (data: any) => {
      // Transform backend data to match component expectations
      const jobs = Array.isArray(data) ? data : data?.jobs || [];
      return {
        pendingOffers: jobs.filter((job: any) => job.status === 'sent'),
        activeJobs: jobs.filter((job: any) => job.status === 'accepted'),
        recentJobs: jobs.filter((job: any) => ['completed', 'cancelled'].includes(job.status)),
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

  // Handle WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    const handleJobOffer = (data: any) => {
      console.log('🔔 New job offer received:', data);
      toast({
        title: "New Job Offer!",
        description: `You have a new job offer for ${data.booking?.serviceType}`,
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Provider Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.firstName}! {isConnected ? '🟢' : '🔴'} {isConnected ? 'Connected' : 'Connecting...'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Available</span>
            <Switch 
              checked={isOnline}
              onCheckedChange={handleOnlineToggle}
              data-testid="toggle-online-status"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/me/job-requests'] })}
            data-testid="button-refresh-jobs"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Offers</p>
                <p className="text-2xl font-bold" data-testid="text-pending-offers">{pendingOffers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold" data-testid="text-active-jobs">{activeJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Earnings</p>
                <p className="text-2xl font-bold">₹0</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">4.8</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="offers" data-testid="tab-offers">
            Offers ({pendingOffers.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="recent" data-testid="tab-recent">
            Recent ({recentJobs.length})
          </TabsTrigger>
        </TabsList>

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
                onAccept={() => handleAcceptJob(job.bookingId)}
                onDecline={() => handleDeclineJob(job.bookingId, "Not available")}
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
            <p>Active jobs feature coming soon...</p>
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