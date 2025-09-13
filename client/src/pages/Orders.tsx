import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOrderTracking, useChat } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Clock, 
  MapPin, 
  MessageCircle, 
  Star, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Phone,
  Search,
  Filter,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface Order {
  id: string;
  type: 'service' | 'parts';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: 'service' | 'part';
  }>;
  totalAmount: number;
  serviceProviderId?: string;
  partsProviderId?: string;
  scheduledAt?: string;
  completedAt?: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  provider?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    photo?: string;
  };
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export default function Orders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const { subscribeToOrder, unsubscribeFromOrder } = useOrderTracking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch orders with real API integration
  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/v1/orders', user?.uid, statusFilter],
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest(`/api/v1/orders/${orderId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] });
      toast({
        title: 'Order Cancelled',
        description: 'Your order has been cancelled successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel order. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update order status mutation (for providers)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest(`/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
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

  // Filter and search orders
  const filteredOrders = orders?.filter((order: Order) => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        order.items?.some(item => item.name.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    return true;
  }) || [];

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'amount-high':
        return b.totalAmount - a.totalAmount;
      case 'amount-low':
        return a.totalAmount - b.totalAmount;
      default:
        return 0;
    }
  });

  const activeOrders = sortedOrders.filter((order: Order) => 
    ['pending', 'accepted', 'in_progress'].includes(order.status)
  );

  const completedOrders = sortedOrders.filter((order: Order) => 
    ['completed'].includes(order.status)
  );

  const cancelledOrders = sortedOrders.filter((order: Order) => 
    ['cancelled', 'refunded'].includes(order.status)
  );

  const handleTrackOrder = (orderId: string) => {
    subscribeToOrder(orderId);
    setLocation(`/orders/${orderId}`);
  };

  const handleViewOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  const handleChatWithProvider = (orderId: string) => {
    setLocation(`/orders/${orderId}?tab=chat`);
  };

  const handleRateOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}?tab=review`);
  };

  const handleReorder = async (orderId: string) => {
    try {
      const order = orders?.find((o: Order) => o.id === orderId);
      if (!order) return;
      
      // Add order items back to cart and navigate to cart
      // This would integrate with the cart system
      toast({
        title: 'Items Added to Cart',
        description: 'Order items have been added to your cart.',
      });
      setLocation('/cart');
    } catch (error) {
      toast({
        title: 'Reorder Failed',
        description: 'Failed to add items to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      cancelOrderMutation.mutate(orderId);
    }
  };

  const handleRescheduleOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}?tab=reschedule`);
  };

  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const handleAcceptOrder = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'accepted' });
  };

  const handleStartWork = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'in_progress' });
  };

  const handleCompleteWork = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'completed' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'order-status-pending';
      case 'accepted':
        return 'order-status-accepted';
      case 'in_progress':
        return 'order-status-in_progress';
      case 'completed':
        return 'order-status-completed';
      case 'cancelled':
        return 'order-status-cancelled';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const OrderCard = ({ order, showActions = true }: { order: Order; showActions?: boolean }) => {
    const userRole = user?.role || 'user';
    const isProvider = userRole === 'service_provider' || userRole === 'parts_provider';
    const isAdmin = userRole === 'admin';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Order Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewOrder(order.id)}
                    data-testid={`view-order-${order.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} • {order.type === 'service' ? 'Service' : 'Parts'}
                </p>
                {order.scheduledAt && (
                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    Scheduled: {new Date(order.scheduledAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Badge className={getStatusColor(order.status)}>
                {getStatusText(order.status)}
              </Badge>
            </div>

          {/* Order Items */}
          <div className="space-y-2 mb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-muted-foreground">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Provider Info */}
          {order.provider && (
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">{order.provider.name}</p>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs text-muted-foreground ml-1">
                      {order.provider.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{order.provider.phone}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${order.provider?.phone}`)}
                data-testid={`call-provider-${order.id}`}
              >
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start space-x-2 text-sm text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{order.location.address}</span>
          </div>

          {/* Scheduled Time */}
          {order.scheduledAt && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span>Scheduled: {new Date(order.scheduledAt).toLocaleString()}</span>
            </div>
          )}

          {/* Total Amount */}
          <div className="flex items-center justify-between text-lg font-semibold mb-4">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">₹{order.totalAmount}</span>
          </div>

          {/* Role-based Actions */}
          {showActions && (
            <div className="space-y-3">
              {/* Customer Actions */}
              {userRole === 'user' && (
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancelOrderMutation.isPending}
                        data-testid={`cancel-${order.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRescheduleOrder(order.id)}
                        data-testid={`reschedule-${order.id}`}
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        Reschedule
                      </Button>
                    </>
                  )}

                  {['accepted', 'in_progress'].includes(order.status) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrackOrder(order.id)}
                        data-testid={`track-${order.id}`}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Track
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChatWithProvider(order.id)}
                        data-testid={`chat-${order.id}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                    </>
                  )}

                  {order.status === 'completed' && (
                    <>
                      {!order.rating && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRateOrder(order.id)}
                          data-testid={`rate-${order.id}`}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Rate Service
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReorder(order.id)}
                        data-testid={`reorder-${order.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reorder
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Service Provider Actions */}
              {isProvider && (
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAcceptOrder(order.id)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`accept-${order.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accept Order
                    </Button>
                  )}

                  {order.status === 'accepted' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartWork(order.id)}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`start-work-${order.id}`}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Start Work
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChatWithProvider(order.id)}
                        data-testid={`chat-customer-${order.id}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Chat with Customer
                      </Button>
                    </>
                  )}

                  {order.status === 'in_progress' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCompleteWork(order.id)}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`complete-work-${order.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChatWithProvider(order.id)}
                        data-testid={`chat-customer-${order.id}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Chat with Customer
                      </Button>
                    </>
                  )}

                  {['accepted', 'in_progress'].includes(order.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancelOrderMutation.isPending}
                      data-testid={`provider-cancel-${order.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrder(order.id)}
                    data-testid={`admin-view-${order.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Manage Order
                  </Button>
                  {order.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/admin/orders/${order.id}/assign`)}
                      data-testid={`assign-provider-${order.id}`}
                    >
                      <User className="w-4 h-4 mr-1" />
                      Assign Provider
                    </Button>
                  )}
                </div>
              )}

              {/* Loading States */}
              {(cancelOrderMutation.isPending || updateStatusMutation.isPending) && (
                <div className="text-sm text-muted-foreground flex items-center">
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  Processing...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (!user) {
    setLocation('/login');
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="pt-32 px-4 pb-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="pt-32 px-4 pb-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-destructive" />
              <h3 className="font-medium text-foreground mb-2">Failed to Load Orders</h3>
              <p className="text-sm text-muted-foreground mb-4">
                There was an error loading your orders. Please try again.
              </p>
              <Button onClick={() => refetch()} data-testid="retry-orders">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="pt-32 px-4 pb-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
              <p className="text-muted-foreground">Track and manage your service orders</p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="refresh-orders"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search orders by ID or service name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="search-orders"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="filter-status">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]" data-testid="sort-orders">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                  <SelectItem value="amount-low">Amount: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              {filteredOrders.length === 0 ? 'No orders found' : 
               `${filteredOrders.length} order${filteredOrders.length === 1 ? '' : 's'} found`}
            </div>
          </div>
        </motion.div>

        {/* Order Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active" data-testid="active-tab">
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="completed-tab">
                Completed ({completedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="cancelled-tab">
                Cancelled ({cancelledOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {activeOrders.length > 0 ? (
                activeOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No active orders</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Book a service to see your orders here
                  </p>
                  <Button onClick={() => setLocation('/services')}>
                    Browse Services
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedOrders.length > 0 ? (
                completedOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No completed orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Completed orders will appear here
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="mt-6">
              {cancelledOrders.length > 0 ? (
                cancelledOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} showActions={false} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No cancelled orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Cancelled orders will appear here
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  );
}
