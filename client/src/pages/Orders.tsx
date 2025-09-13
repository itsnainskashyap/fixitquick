import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useOrderTracking, useChat } from '@/hooks/useSocket';
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
  Phone
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
  const { subscribeToOrder, unsubscribeFromOrder } = useOrderTracking();

  // Fetch orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['/api/v1/orders', user?.uid],
    enabled: !!user,
  });

  const activeOrders = orders?.filter((order: Order) => 
    ['pending', 'accepted', 'in_progress'].includes(order.status)
  ) || [];

  const completedOrders = orders?.filter((order: Order) => 
    ['completed'].includes(order.status)
  ) || [];

  const cancelledOrders = orders?.filter((order: Order) => 
    ['cancelled'].includes(order.status)
  ) || [];

  const handleTrackOrder = (orderId: string) => {
    subscribeToOrder(orderId);
    setLocation(`/orders/${orderId}/track`);
  };

  const handleChatWithProvider = (orderId: string) => {
    setLocation(`/orders/${orderId}/chat`);
  };

  const handleRateOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}/rate`);
  };

  const handleReorder = (orderId: string) => {
    setLocation(`/orders/${orderId}/reorder`);
  };

  const handleCancelOrder = async (orderId: string) => {
    // TODO: Implement cancel order logic
    console.log('Cancelling order:', orderId);
  };

  const handleRescheduleOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}/reschedule`);
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

  const OrderCard = ({ order, showActions = true }: { order: Order; showActions?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card>
        <CardContent className="p-4">
          {/* Order Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">
                Order #{order.id.slice(-8).toUpperCase()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
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

          {/* Actions */}
          {showActions && (
            <div className="flex flex-wrap gap-2">
              {order.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelOrder(order.id)}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRateOrder(order.id)}
                    data-testid={`rate-${order.id}`}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Rate
                  </Button>
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
        </CardContent>
      </Card>
    </motion.div>
  );

  if (!user) {
    setLocation('/login');
    return null;
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
              <p className="text-muted-foreground">Track and manage your service orders</p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="refresh-orders"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
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
