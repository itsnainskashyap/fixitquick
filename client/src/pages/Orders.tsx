import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Calendar,
  MapPin,
  ArrowRight,
  Wrench,
  Star,
  MessageCircle,
  Phone,
  MapPin as LocationIcon
} from 'lucide-react';

interface Order {
  id: string;
  userId: string;
  type: 'service' | 'parts';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: 'service' | 'part';
  }>;
  totalAmount: string;
  serviceProviderId?: string;
  partsProviderId?: string;
  scheduledAt?: string;
  completedAt?: string;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
    instructions?: string;
  };
  paymentMethod?: 'online' | 'cod' | 'wallet';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  razorpayOrderId?: string;
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

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
}

function OrderCard({ order, showActions = true }: OrderCardProps) {
  const [, setLocation] = useLocation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <TrendingUp className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'refunded': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="border border-border/50 hover:border-border transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                {order.type === 'service' ? (
                  <Wrench className="w-5 h-5 text-primary" />
                ) : (
                  <Package className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-foreground">
                    Order #{order.id.slice(-8)}
                  </h3>
                  <Badge className={getStatusColor(order.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status.replace('_', ' ')}</span>
                    </div>
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.createdAt), 'MMM dd, yyyy • h:mm a')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-foreground">
                ₹{parseFloat(order.totalAmount).toFixed(2)}
              </p>
              <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Items */}
          <div className="space-y-2 mb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}× {item.name}
                </span>
                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Location */}
          {order.location && (
            <div className="flex items-start space-x-2 text-sm text-muted-foreground mb-4">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{order.location.address}</span>
            </div>
          )}

          {/* Scheduled Date */}
          {order.scheduledAt && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span>Scheduled: {format(new Date(order.scheduledAt), 'MMM dd, yyyy • h:mm a')}</span>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
              <strong>Notes:</strong> {order.notes}
            </div>
          )}

          {/* Rating & Review */}
          {order.rating && (
            <div className="border-t pt-3 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < order.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{order.rating}/5</span>
              </div>
              {order.review && (
                <p className="text-sm text-muted-foreground italic">"{order.review}"</p>
              )}
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex space-x-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/orders/${order.id}`)}
                className="flex-1"
                data-testid={`view-order-${order.id}`}
              >
                View Details
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              {order.status === 'in_progress' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/chat/${order.id}`)}
                    data-testid={`chat-order-${order.id}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${order.serviceProviderId || order.partsProviderId}`, '_self')}
                    data-testid={`call-provider-${order.id}`}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                </>
              )}

              {order.status === 'completed' && !order.rating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/orders/${order.id}/review`)}
                  data-testid={`rate-order-${order.id}`}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Rate
                </Button>
              )}

              {order.status === 'pending' && order.paymentStatus === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    // Handle order cancellation
                    console.log('Cancel order:', order.id);
                  }}
                  data-testid={`cancel-order-${order.id}`}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { getItemCount } = useCart();
  const [activeTab, setActiveTab] = useState('all');

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/v1/orders'],
    enabled: !!user,
  });

  const { data: recentOrders = [] } = useQuery<Order[]>({
    queryKey: ['/api/v1/orders/recent'],
    enabled: !!user,
  });

  if (!user) {
    setLocation('/login');
    return null;
  }

  // Filter orders by status
  const pendingOrders = orders.filter(order => order.status === 'pending');
  const activeOrders = orders.filter(order => ['accepted', 'in_progress'].includes(order.status));
  const completedOrders = orders.filter(order => order.status === 'completed');
  const cancelledOrders = orders.filter(order => ['cancelled', 'refunded'].includes(order.status));

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'pending': return pendingOrders.length;
      case 'active': return activeOrders.length;
      case 'completed': return completedOrders.length;
      case 'cancelled': return cancelledOrders.length;
      default: return orders.length;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header onCartClick={() => setLocation('/cart')} cartItemsCount={getItemCount()} />
        
        <main className="pt-32 px-4 pb-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                      <div className="h-3 bg-muted-foreground/20 rounded w-24"></div>
                    </div>
                    <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted-foreground/20 rounded w-full"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        onCartClick={() => setLocation('/cart')} 
        cartItemsCount={getItemCount()}
      />

      <main className="pt-32 px-4 pb-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your service requests</p>
        </motion.div>

        {/* Quick Stats */}
        {orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{orders.length}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">{activeOrders.length}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{completedOrders.length}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-1">{pendingOrders.length}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Orders Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" data-testid="all-orders-tab">
                All ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="pending-orders-tab">
                Pending ({getTabCount('pending')})
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="active-orders-tab">
                Active ({getTabCount('active')})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="completed-orders-tab">
                Completed ({getTabCount('completed')})
              </TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="cancelled-orders-tab">
                Cancelled ({getTabCount('cancelled')})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {orders.length > 0 ? (
                orders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No orders yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start by browsing our services or parts
                  </p>
                  <Button onClick={() => setLocation('/services')} data-testid="browse-services">
                    Browse Services
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              {pendingOrders.length > 0 ? (
                pendingOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No pending orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Pending orders will appear here
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="mt-6">
              {activeOrders.length > 0 ? (
                activeOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No active orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Active orders will appear here
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedOrders.length > 0 ? (
                completedOrders.map((order: Order) => (
                  <OrderCard key={order.id} order={order} showActions={false} />
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