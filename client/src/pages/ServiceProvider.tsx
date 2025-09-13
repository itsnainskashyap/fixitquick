import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  DollarSign, 
  Star, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  Calendar,
  TrendingUp,
  Settings,
  Phone,
  MessageCircle,
  MapPin,
  AlertTriangle
} from 'lucide-react';

interface ProviderOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  amount: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  scheduledAt: string;
  location: {
    address: string;
    distance: number;
  };
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

interface ProviderStats {
  totalEarnings: number;
  completionRate: number;
  avgRating: number;
  ordersCompleted: number;
  pendingOrders: number;
}

export default function ServiceProvider() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check if user is a service provider
  if (!user || user.role !== 'service_provider') {
    setLocation('/');
    return null;
  }

  // Fetch provider stats
  const { data: stats } = useQuery({
    queryKey: ['/api/v1/providers/stats', user?.uid],
    queryFn: () => fetch(`/api/v1/providers/stats/${user?.uid}`).then(res => res.json()),
    enabled: !!user?.uid,
  });

  // Fetch pending orders
  const { data: pendingOrders } = useQuery({
    queryKey: ['/api/v1/providers/orders/pending', user?.uid],
    queryFn: () => fetch(`/api/v1/providers/orders/pending/${user?.uid}`).then(res => res.json()),
    enabled: !!user?.uid,
  });

  // Fetch active orders
  const { data: activeOrders } = useQuery({
    queryKey: ['/api/v1/providers/orders/active', user?.uid],
    queryFn: () => fetch(`/api/v1/providers/orders/active/${user?.uid}`).then(res => res.json()),
    enabled: !!user?.uid,
  });

  // Mutations for order management
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('PUT', `/api/v1/orders/${orderId}/assign`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/orders/pending', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/orders/active', user?.uid] });
      toast({
        title: "Order accepted",
        description: "You have successfully accepted this order",
      });
    },
    onError: () => {
      toast({
        title: "Failed to accept order",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/v1/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/orders/pending', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/orders/active', user?.uid] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully",
      });
    },
  });

  const handleAcceptOrder = async (orderId: string) => {
    acceptOrderMutation.mutate(orderId);
  };

  const handleRejectOrder = async (orderId: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: 'cancelled' });
  };

  const handleStartService = (orderId: string) => {
    setLocation(`/provider/orders/${orderId}/start`);
  };

  const handleCompleteService = (orderId: string) => {
    setLocation(`/provider/orders/${orderId}/complete`);
  };

  const handleToggleOnlineStatus = async (online: boolean) => {
    setIsOnline(online);
    // TODO: Update online status on server
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const OrderCard = ({ order, showActions = true }: { order: ProviderOrder; showActions?: boolean }) => (
    <Card className={`mb-4 ${order.priority === 'emergency' ? 'border-red-300 shadow-red-100' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{order.serviceName}</h3>
            <p className="text-sm text-muted-foreground">Order #{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-primary">₹{order.amount}</p>
            <Badge className={getPriorityColor(order.priority)}>
              {order.priority === 'emergency' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{order.customerName}</span>
            <Button variant="ghost" size="sm" className="p-1">
              <Phone className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{order.location.address}</span>
            <Badge variant="outline" className="text-xs">
              {order.location.distance}km away
            </Badge>
          </div>

          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {new Date(order.scheduledAt).toLocaleString()}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex space-x-2">
            {order.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRejectOrder(order.id)}
                  className="flex-1"
                  data-testid={`reject-${order.id}`}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAcceptOrder(order.id)}
                  className="flex-1"
                  data-testid={`accept-${order.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Accept
                </Button>
              </>
            )}

            {order.status === 'accepted' && (
              <Button
                size="sm"
                onClick={() => handleStartService(order.id)}
                className="flex-1"
                data-testid={`start-${order.id}`}
              >
                Start Service
              </Button>
            )}

            {order.status === 'in_progress' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/provider/orders/${order.id}/chat`)}
                  data-testid={`chat-${order.id}`}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCompleteService(order.id)}
                  className="flex-1"
                  data-testid={`complete-${order.id}`}
                >
                  Complete
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Service Provider</h1>
            <p className="text-sm opacity-90">Welcome back, {user.displayName}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="online-status" className="text-sm">
                {isOnline ? 'Online' : 'Offline'}
              </Label>
              <Switch
                id="online-status"
                checked={isOnline}
                onCheckedChange={handleToggleOnlineStatus}
                data-testid="online-toggle"
              />
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLocation('/provider/settings')}
              data-testid="provider-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="pending" data-testid="pending-tab">
              Pending ({pendingOrders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="active-tab">
              Active ({activeOrders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="earnings" data-testid="earnings-tab">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">₹{stats?.totalEarnings || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Earnings</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.avgRating || 0}</div>
                  <div className="text-xs text-muted-foreground">Avg Rating</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.completionRate || 0}%</div>
                  <div className="text-xs text-muted-foreground">Completion Rate</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.ordersCompleted || 0}</div>
                  <div className="text-xs text-muted-foreground">Orders Completed</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activeOrders && activeOrders.length > 0 ? (
                  <div className="space-y-3">
                    {activeOrders.slice(0, 3).map((order: ProviderOrder) => (
                      <OrderCard key={order.id} order={order} showActions={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            {pendingOrders && pendingOrders.length > 0 ? (
              <div className="space-y-4">
                {pendingOrders.map((order: ProviderOrder) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <OrderCard order={order} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No pending orders</h3>
                <p className="text-sm text-muted-foreground">
                  New orders will appear here when customers book your services
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            {activeOrders && activeOrders.length > 0 ? (
              <div className="space-y-4">
                {activeOrders.map((order: ProviderOrder) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No active orders</h3>
                <p className="text-sm text-muted-foreground">
                  Accepted orders will appear here
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="earnings" className="mt-6">
            <div className="space-y-6">
              {/* Earnings Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Week</span>
                    <span className="font-semibold">₹2,450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="font-semibold">₹8,750</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earnings</span>
                    <span className="font-bold text-lg">₹{stats?.totalEarnings || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Withdraw Button */}
              <Button
                onClick={() => setLocation('/provider/withdraw')}
                className="w-full"
                size="lg"
                data-testid="withdraw-earnings"
              >
                Withdraw Earnings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
