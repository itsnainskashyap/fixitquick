import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  CheckCircle, 
  User, 
  MapPin, 
  Phone, 
  Star, 
  Navigation,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  profileImage?: string;
  rating: number;
  isOnline: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  phone: string;
}

interface OrderStatusData {
  orderId: string;
  status: string;
  assignedProviderId?: string;
  assignedAt?: string;
  provider?: ProviderInfo;
  pendingOffers?: number;
}

interface OrderAssignmentStatusProps {
  orderId: string;
  className?: string;
}

export function OrderAssignmentStatus({ orderId, className }: OrderAssignmentStatusProps) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Enhanced fetch order status with retry logic
  const { data: orderData, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['/api/v1/orders', orderId],
    enabled: !!orderId,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for network errors, but not for 404s or 403s
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
    },
    onError: (error: any) => {
      console.error('OrderAssignmentStatus fetch error:', error);
      setRetryCount(prev => prev + 1);
    },
    onSuccess: (data) => {
      setRetryCount(0); // Reset retry count on successful fetch
    },
  });

  // Enhanced real-time updates with better error handling
  useEffect(() => {
    if (!socket || !isConnected || !orderId) return;

    const handleAssignmentUpdate = (data: any) => {
      console.log('📢 Assignment update received:', data);
      setLastUpdate(new Date());
      // Optimistically update cache to avoid refetch delay
      queryClient.setQueryData(['/api/v1/orders', orderId], (oldData: any) => ({
        ...oldData,
        status: data.status || oldData?.status,
        pendingOffers: data.pendingOffers ?? oldData?.pendingOffers,
      }));
      refetch();
    };

    const handleProviderAssigned = (data: any) => {
      console.log('✅ Provider assigned:', data);
      setLastUpdate(new Date());
      // Optimistically update with provider info
      queryClient.setQueryData(['/api/v1/orders', orderId], (oldData: any) => ({
        ...oldData,
        status: 'provider_assigned',
        assignedProviderId: data.providerId,
        provider: data.provider,
        assignedAt: new Date().toISOString(),
      }));
      refetch();
    };

    const handleProviderAccepted = (data: any) => {
      console.log('🎉 Provider accepted job:', data);
      setLastUpdate(new Date());
      queryClient.setQueryData(['/api/v1/orders', orderId], (oldData: any) => ({
        ...oldData,
        status: 'provider_on_way',
      }));
      refetch();
    };

    const handleSearchingProviders = (data: any) => {
      console.log('🔍 Searching for providers:', data);
      setLastUpdate(new Date());
      queryClient.setQueryData(['/api/v1/orders', orderId], (oldData: any) => ({
        ...oldData,
        status: 'provider_search',
        pendingOffers: data.pendingOffers || 0,
      }));
      refetch();
    };

    const handleConnectionError = (error: any) => {
      console.error('WebSocket connection error:', error);
      // Try to refetch data as fallback
      setTimeout(() => {
        if (!socket || !socket.connected) {
          refetch();
        }
      }, 2000);
    };

    // Subscribe to order updates with error handling
    try {
      socket.emit('subscribe_order', { orderId });
    } catch (error) {
      console.error('Failed to subscribe to order updates:', error);
      handleConnectionError(error);
    }

    // Listen for assignment events
    socket.on('order.assignment_started', handleAssignmentUpdate);
    socket.on('order.provider_assigned', handleProviderAssigned);
    socket.on('order.provider_accepted', handleProviderAccepted);
    socket.on('order.searching_providers', handleSearchingProviders);
    socket.on('error', handleConnectionError);
    socket.on('disconnect', handleConnectionError);

    return () => {
      try {
        socket.emit('unsubscribe_order', { orderId });
      } catch (error) {
        console.error('Failed to unsubscribe from order updates:', error);
      }
      socket.off('order.assignment_started', handleAssignmentUpdate);
      socket.off('order.provider_assigned', handleProviderAssigned);
      socket.off('order.provider_accepted', handleProviderAccepted);
      socket.off('order.searching_providers', handleSearchingProviders);
      socket.off('error', handleConnectionError);
      socket.off('disconnect', handleConnectionError);
    };
  }, [socket, isConnected, orderId, refetch, queryClient]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform order data to status data format
  const statusData: OrderStatusData | null = orderData ? {
    orderId: orderData.id,
    status: orderData.status,
    assignedProviderId: orderData.assignedProviderId,
    assignedAt: orderData.assignedAt,
    provider: orderData.provider,
    pendingOffers: orderData.pendingOffers
  } : null;

  if (error || !statusData) {
    const getErrorMessage = () => {
      if (error?.status === 404) {
        return "Order not found or has been cancelled";
      }
      if (error?.status === 403) {
        return "You don't have permission to view this order";
      }
      if (error?.status >= 500) {
        return "Server error - please try again";
      }
      if (!isConnected) {
        return "Connection lost - trying to reconnect...";
      }
      return "Unable to load assignment status";
    };

    const canRetry = error?.status !== 404 && error?.status !== 403;

    return (
      <Card className={className} data-testid="order-assignment-status-error">
        <CardContent className="text-center py-6">
          <AlertCircle className={`mx-auto h-8 w-8 mb-2 ${
            error?.status >= 500 || !isConnected ? 'text-destructive' : 'text-muted-foreground'
          }`} />
          <p className="text-sm text-muted-foreground mb-3">{getErrorMessage()}</p>
          
          {canRetry && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                className="mt-2"
                disabled={isLoading}
                data-testid="retry-button"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Retrying...' : 'Retry'}
              </Button>
              
              {retryCount > 0 && retryCount < maxRetries && (
                <p className="text-xs text-muted-foreground mt-2">
                  Attempt {retryCount + 1} of {maxRetries}
                </p>
              )}
              
              {!isConnected && (
                <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                  Connection lost - retrying automatically...
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const getStatusDisplay = () => {
    switch (statusData.status) {
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          title: 'Order Received',
          description: 'Your order has been received and is being processed',
          badge: <Badge variant="secondary">Pending</Badge>
        };
      case 'provider_search':
        return {
          icon: <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />,
          title: 'Finding Provider',
          description: `Searching for available providers${statusData.pendingOffers ? ` (${statusData.pendingOffers} offers sent)` : ''}`,
          badge: <Badge variant="outline" className="border-yellow-500 text-yellow-700">Searching</Badge>
        };
      case 'provider_assigned':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Provider Assigned!',
          description: 'A provider has been assigned to your order',
          badge: <Badge variant="default" className="bg-green-500">Assigned</Badge>
        };
      case 'provider_on_way':
        return {
          icon: <Navigation className="h-5 w-5 text-blue-500" />,
          title: 'Provider On The Way',
          description: 'Your provider is heading to your location',
          badge: <Badge variant="default" className="bg-blue-500">En Route</Badge>
        };
      case 'work_in_progress':
        return {
          icon: <User className="h-5 w-5 text-purple-500" />,
          title: 'Work In Progress',
          description: 'Your service is currently being performed',
          badge: <Badge variant="default" className="bg-purple-500">In Progress</Badge>
        };
      case 'work_completed':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Work Completed',
          description: 'The service has been completed successfully',
          badge: <Badge variant="default" className="bg-green-500">Completed</Badge>
        };
      case 'cancelled':
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          title: 'Order Cancelled',
          description: 'This order has been cancelled',
          badge: <Badge variant="destructive">Cancelled</Badge>
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-muted-foreground" />,
          title: 'Processing',
          description: 'Your order is being processed',
          badge: <Badge variant="outline">Processing</Badge>
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Card className={className} data-testid="order-assignment-status">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {statusDisplay.icon}
            <div>
              <CardTitle className="text-lg" data-testid="status-title">
                {statusDisplay.title}
              </CardTitle>
              <CardDescription data-testid="status-description">
                {statusDisplay.description}
              </CardDescription>
            </div>
          </div>
          {statusDisplay.badge}
        </div>
      </CardHeader>

      {/* Provider Information */}
      {statusData.provider && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Your Provider</h4>
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={statusData.provider.profileImage} />
                <AvatarFallback>
                  {statusData.provider.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h5 className="font-medium" data-testid="provider-name">
                    {statusData.provider.name}
                  </h5>
                  {statusData.provider.isOnline && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                  )}
                </div>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Star className="h-3 w-3" />
                  <span data-testid="provider-rating">{statusData.provider.rating}</span>
                </div>
              </div>
              {statusData.provider.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`tel:${statusData.provider.phone}`)}
                  data-testid="button-call-provider"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}

      {/* Connection Status */}
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}