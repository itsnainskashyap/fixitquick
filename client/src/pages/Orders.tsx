import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useCart } from '@/hooks/useCart';
import { Layout } from '@/components/Layout';
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': 
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending'
        };
      case 'accepted': 
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/50',
          borderColor: 'border-blue-200 dark:border-blue-800',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Accepted'
        };
      case 'in_progress': 
        return {
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/50',
          borderColor: 'border-purple-200 dark:border-purple-800',
          icon: <TrendingUp className="w-4 h-4" />,
          label: 'In Progress'
        };
      case 'completed': 
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/50',
          borderColor: 'border-green-200 dark:border-green-800',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Completed'
        };
      case 'cancelled': 
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/50',
          borderColor: 'border-red-200 dark:border-red-800',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Cancelled'
        };
      case 'refunded': 
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-950/50',
          borderColor: 'border-gray-200 dark:border-gray-800',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Refunded'
        };
      default: 
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-950/50',
          borderColor: 'border-gray-200 dark:border-gray-800',
          icon: <Clock className="w-4 h-4" />,
          label: 'Unknown'
        };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 dark:text-green-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'refunded': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return '✓ Paid';
      case 'pending': return '⏳ Pending';
      case 'failed': return '✗ Failed';
      case 'refunded': return '↩ Refunded';
      default: return '⏳ Pending';
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const serviceName = order.items[0]?.name || `${order.type} Service`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3"
    >
      <Card className={`${statusConfig.borderColor} border-l-4 hover:shadow-lg transition-all duration-300 bg-white dark:bg-card shadow-sm`}>
        <CardContent className="p-3">
          {/* First Line: Service Name and Status */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${statusConfig.bgColor} ${statusConfig.borderColor} border-2 shadow-sm`}>
                {order.type === 'service' ? (
                  <Wrench className={`w-4 h-4 ${statusConfig.color}`} />
                ) : (
                  <Package className={`w-4 h-4 ${statusConfig.color}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-base truncate leading-tight">
                  {serviceName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`flex items-center space-x-1.5 ${statusConfig.color}`}>
                    {statusConfig.icon}
                    <span className="text-xs font-semibold tracking-wide">{statusConfig.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    #{order.id.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right ml-3">
              <p className="font-bold text-foreground text-lg leading-tight">
                ₹{parseFloat(order.totalAmount).toFixed(0)}
              </p>
              <p className={`text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                {getPaymentStatusLabel(order.paymentStatus)}
              </p>
            </div>
          </div>

          {/* Second Line: Date, Location, and Key Details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(order.createdAt), 'MMM dd, yyyy')}</span>
              </div>
              {order.location && (
                <div className="flex items-center space-x-1 max-w-32 md:max-w-none" title={order.location.address}>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{order.location.address}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Scheduled Date (if applicable) */}
          {order.scheduledAt && (
            <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 mt-2 bg-blue-50 dark:bg-blue-950/30 rounded px-2 py-1">
              <Calendar className="w-3 h-3" />
              <span>Scheduled: {format(new Date(order.scheduledAt), 'MMM dd • h:mm a')}</span>
            </div>
          )}

          {/* Rating (if completed) */}
          {order.rating && (
            <div className="flex items-center space-x-2 mt-2 text-xs">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < order.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-muted-foreground">Rated {order.rating}/5</span>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex space-x-2 mt-3 pt-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/orders/${order.id}`)}
                className="flex-1 h-8 text-xs"
                data-testid={`view-order-${order.id}`}
              >
                View Details
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>

              {order.status === 'in_progress' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/chat/${order.id}`)}
                    className="h-8 px-2"
                    data-testid={`chat-order-${order.id}`}
                    aria-label="Chat with service provider"
                    title="Chat with service provider"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${order.serviceProviderId || order.partsProviderId}`, '_self')}
                    className="h-8 px-2"
                    data-testid={`call-provider-${order.id}`}
                    aria-label="Call service provider"
                    title="Call service provider"
                  >
                    <Phone className="w-3 h-3" />
                  </Button>
                </>
              )}

              {order.status === 'completed' && !order.rating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/orders/${order.id}/review`)}
                  className="h-8 text-xs"
                  data-testid={`rate-order-${order.id}`}
                >
                  <Star className="w-3 h-3 mr-1" />
                  Rate
                </Button>
              )}

              {order.status === 'pending' && order.paymentStatus === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 h-8 text-xs"
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
      <div className="min-h-screen bg-background">
        <main className="px-4 py-6">
          {/* Page Header Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded-lg w-48 mb-2"></div>
              <div className="h-4 bg-muted rounded w-64"></div>
            </div>
          </motion.div>

          {/* Quick Stats Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="p-4">
                  <div className="text-center space-y-2">
                    <div className="h-8 bg-muted rounded w-12 mx-auto"></div>
                    <div className="h-3 bg-muted rounded w-16 mx-auto"></div>
                  </div>
                </Card>
              </div>
            ))}
          </motion.div>

          {/* Orders Skeleton */}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="animate-pulse"
              >
                <Card className="bg-white dark:bg-card shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-9 h-9 bg-muted rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-40"></div>
                          <div className="h-3 bg-muted rounded w-32"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-5 bg-muted rounded w-16"></div>
                        <div className="h-3 bg-muted rounded w-12"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-3 bg-muted rounded w-20"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
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
                  <OrderCard key={order.id} order={order} />
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
      </div>
    </Layout>
  );
}