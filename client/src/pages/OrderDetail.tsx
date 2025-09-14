import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useRoute } from 'wouter';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { LiveOrderTracking } from '@/components/LiveOrderTracking';
import { RealTimeChat } from '@/components/RealTimeChat';
import { useOrderTracking, useOrderChat } from '@/hooks/useSocket';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail,
  Star, 
  MessageCircle, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Camera,
  Upload,
  AlertTriangle,
  History,
  Award,
  CreditCard
} from 'lucide-react';

interface OrderDetail {
  id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  type: 'service' | 'parts';
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: 'service' | 'part';
  }>;
  totalAmount: number;
  user?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  serviceProvider?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    rating: string;
    isVerified: boolean;
  };
  partsProvider?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  scheduledAt?: string;
  completedAt?: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
  };
  paymentMethod?: 'online' | 'cod' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  rating?: number;
  review?: string;
  photos?: {
    before?: string[];
    after?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/orders/:orderId');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('details');
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);

  const orderId = params?.orderId;

  // Real-time hooks
  const {
    orderStatus: liveOrderStatus,
    providerLocation,
    isConnected: trackingConnected
  } = useOrderTracking(orderId);

  const {
    messages,
    unreadCount,
    isConnected: chatConnected,
    sendChatMessage
  } = useOrderChat(orderId);

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['/api/v1/orders', orderId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/v1/orders/${orderId}`);
      return await response.json();
    },
    enabled: !!orderId,
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest('PUT', `/api/v1/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      toast({
        title: 'Status Updated',
        description: 'Order status has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update order status.',
        variant: 'destructive',
      });
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment: string }) => {
      return await apiRequest('POST', `/api/v1/orders/${orderId}/review`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });
      setActiveTab('details');
    },
    onError: (error: any) => {
      toast({
        title: 'Review Failed',
        description: error.message || 'Failed to submit review.',
        variant: 'destructive',
      });
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/v1/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      toast({
        title: 'Order Cancelled',
        description: 'Your order has been cancelled successfully.',
      });
      setLocation('/orders');
    },
    onError: (error: any) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel order.',
        variant: 'destructive',
      });
    },
  });

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  const handleCancelOrder = () => {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      cancelOrderMutation.mutate();
    }
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please provide a rating before submitting your review.',
        variant: 'destructive',
      });
      return;
    }
    submitReviewMutation.mutate({ rating, comment: reviewComment });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Searching for provider';
      case 'accepted':
        return 'Provider assigned';
      case 'in_progress':
        return 'Service in progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const StatusTimeline = ({ currentStatus }: { currentStatus: string }) => {
    const statuses = [
      { key: 'pending', label: 'Order Placed', icon: Clock },
      { key: 'accepted', label: 'Provider Assigned', icon: User },
      { key: 'in_progress', label: 'Service Started', icon: RefreshCw },
      { key: 'completed', label: 'Service Completed', icon: CheckCircle },
    ];

    const currentIndex = statuses.findIndex(s => s.key === currentStatus);

    return (
      <div className="relative">
        {statuses.map((status, index) => {
          const Icon = status.icon;
          const isActive = index <= currentIndex;
          const isCurrent = status.key === currentStatus;

          return (
            <div key={status.key} className="flex items-center mb-4 last:mb-0">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 mr-4
                ${isActive 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'bg-background border-muted text-muted-foreground'
                }
                ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
              `}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {status.label}
                </p>
                {isCurrent && (
                  <p className="text-sm text-muted-foreground">
                    Current status
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const RatingStars = ({ rating, setRating, readonly = false }: { 
    rating: number; 
    setRating?: (rating: number) => void; 
    readonly?: boolean;
  }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 cursor-pointer transition-colors ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            } ${readonly ? 'cursor-default' : 'hover:text-yellow-400'}`}
            onClick={() => !readonly && setRating?.(star)}
            data-testid={`star-${star}`}
          />
        ))}
      </div>
    );
  };

  if (!match) {
    setLocation('/orders');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="pt-32 px-4 pb-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="pt-32 px-4 pb-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-destructive" />
              <h3 className="font-medium text-foreground mb-2">Order Not Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The requested order could not be found or you don't have permission to view it.
              </p>
              <Button onClick={() => setLocation('/orders')} data-testid="back-to-orders">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const userRole = user?.role || 'user';
  const isProvider = userRole === 'service_provider' || userRole === 'parts_provider';
  const isAdmin = userRole === 'admin';

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="pt-32 px-4 pb-6 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/orders')}
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                Order #{order.id.slice(-8).toUpperCase()}
              </h1>
              <p className="text-muted-foreground">
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getStatusColor(order.status)} data-testid="order-status">
              {getStatusText(order.status)}
            </Badge>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details" data-testid="details-tab">Details</TabsTrigger>
              <TabsTrigger value="tracking" data-testid="tracking-tab">
                Live Tracking
                {!trackingConnected && <div className="w-2 h-2 bg-red-500 rounded-full ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="provider" data-testid="provider-tab">
                Provider
                {unreadCount > 0 && (
                  <Badge className="ml-1 px-1 min-w-[16px] h-4 text-xs bg-red-500">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="timeline" data-testid="timeline-tab">Timeline</TabsTrigger>
              <TabsTrigger value="review" data-testid="review-tab">Review</TabsTrigger>
            </TabsList>

            {/* Live Tracking Tab */}
            <TabsContent value="tracking" className="mt-6">
              <LiveOrderTracking 
                orderId={orderId!}
                order={order}
                showMap={true}
                compact={false}
              />
              
              {/* Connection Status */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${trackingConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">Real-time Tracking</span>
                    </div>
                    <Badge variant={trackingConnected ? 'default' : 'destructive'}>
                      {trackingConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  {!trackingConnected && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Trying to reconnect... Some updates may be delayed.
                    </p>
                  )}
                  {providerLocation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Provider location updated: {new Date(providerLocation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order Details Tab */}
            <TabsContent value="details" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Order Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Order Type</p>
                      <p className="text-foreground capitalize">{order.type}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Items</p>
                      <div className="space-y-2 mt-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span className="text-foreground">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Amount</span>
                      <span>₹{order.totalAmount}</span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                      <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                        {order.paymentStatus}
                      </Badge>
                    </div>

                    {order.notes && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                        <p className="text-foreground">{order.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Service Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Service Location</p>
                      <p className="text-foreground">{order.location.address}</p>
                      {order.location.instructions && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Instructions: {order.location.instructions}
                        </p>
                      )}
                    </div>

                    {order.scheduledAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Scheduled Time</p>
                        <p className="text-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(order.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {order.completedAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                        <p className="text-foreground flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {new Date(order.completedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {order.user && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Customer</p>
                        <p className="text-foreground">
                          {order.user.firstName} {order.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{order.user.phone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Order Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {/* Customer Actions */}
                    {userRole === 'user' && (
                      <>
                        {order.status === 'pending' && (
                          <Button
                            variant="destructive"
                            onClick={handleCancelOrder}
                            disabled={cancelOrderMutation.isPending}
                            data-testid="cancel-order"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Order
                          </Button>
                        )}
                        
                        {['accepted', 'in_progress'].includes(order.status) && (
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab('provider')}
                            data-testid="contact-provider"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Contact Provider
                          </Button>
                        )}

                        {order.status === 'completed' && !order.rating && (
                          <Button
                            variant="default"
                            onClick={() => setActiveTab('review')}
                            data-testid="rate-service"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Rate Service
                          </Button>
                        )}
                      </>
                    )}

                    {/* Provider Actions */}
                    {isProvider && (
                      <>
                        {order.status === 'pending' && (
                          <Button
                            variant="default"
                            onClick={() => handleStatusUpdate('accepted')}
                            disabled={updateStatusMutation.isPending}
                            data-testid="accept-order"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Order
                          </Button>
                        )}

                        {order.status === 'accepted' && (
                          <Button
                            variant="default"
                            onClick={() => handleStatusUpdate('in_progress')}
                            disabled={updateStatusMutation.isPending}
                            data-testid="start-service"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Start Service
                          </Button>
                        )}

                        {order.status === 'in_progress' && (
                          <Button
                            variant="default"
                            onClick={() => handleStatusUpdate('completed')}
                            disabled={updateStatusMutation.isPending}
                            data-testid="complete-service"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Complete
                          </Button>
                        )}
                      </>
                    )}

                    {/* Loading State */}
                    {(updateStatusMutation.isPending || cancelOrderMutation.isPending) && (
                      <div className="flex items-center text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Order Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StatusTimeline currentStatus={order.status} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Provider Tab */}
            <TabsContent value="provider" className="mt-6">
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                {order.serviceProvider && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Service Provider
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {order.serviceProvider.firstName} {order.serviceProvider.lastName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <RatingStars rating={parseFloat(order.serviceProvider.rating)} readonly />
                            <span className="text-sm text-muted-foreground">
                              ({order.serviceProvider.rating})
                            </span>
                            {order.serviceProvider.isVerified && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${order.serviceProvider?.phone}`)}
                          data-testid="call-provider"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${order.serviceProvider?.email}`)}
                          data-testid="email-provider"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {order.partsProvider && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Parts Provider
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {order.partsProvider.firstName} {order.partsProvider.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{order.partsProvider.phone}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${order.partsProvider?.phone}`)}
                          data-testid="call-parts-provider"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`mailto:${order.partsProvider?.email}`)}
                          data-testid="email-parts-provider"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!order.serviceProvider && !order.partsProvider && (
                  <Card className="md:col-span-2">
                    <CardContent className="text-center py-12">
                      <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground mb-2">No Provider Assigned</h3>
                      <p className="text-sm text-muted-foreground">
                        {order.status === 'pending' 
                          ? 'We are finding the best provider for your service.'
                          : 'Provider information is not available.'}
                      </p>
                    </CardContent>
                  </Card>
                )}
                </div>

                {/* Real-Time Chat Section */}
                {(order.serviceProvider || order.partsProvider) && (
                  <div className="w-full">
                    <RealTimeChat 
                      orderId={orderId!}
                      compact={false}
                    />
                  </div>
                )}

                {/* Chat Connection Status */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${chatConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">Chat System</span>
                      </div>
                      <Badge variant={chatConnected ? 'default' : 'destructive'}>
                        {chatConnected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {unreadCount > 0 && `${unreadCount} unread messages`}
                      {chatConnected && unreadCount === 0 && "You're all caught up"}
                      {!chatConnected && "Trying to reconnect... Messages will sync when connected."}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Review Tab */}
            <TabsContent value="review" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Service Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.rating ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Your Rating</p>
                        <RatingStars rating={order.rating} readonly />
                      </div>
                      {order.review && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Your Review</p>
                          <p className="text-foreground">{order.review}</p>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Thank you for your feedback! Your review helps us improve our services.
                      </p>
                    </div>
                  ) : order.status === 'completed' ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Rate this service</p>
                        <RatingStars rating={rating} setRating={setRating} />
                        <p className="text-xs text-muted-foreground mt-1">
                          Click on the stars to rate (1-5 stars)
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Write a review (optional)</p>
                        <Textarea
                          placeholder="Share your experience with this service..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="min-h-[100px]"
                          data-testid="review-comment"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitReview}
                        disabled={rating === 0 || submitReviewMutation.isPending}
                        className="w-full"
                        data-testid="submit-review"
                      >
                        {submitReviewMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-2" />
                            Submit Review
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground mb-2">Review Not Available</h3>
                      <p className="text-sm text-muted-foreground">
                        You can review this service once it's completed.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  );
}