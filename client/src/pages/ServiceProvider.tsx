import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useNotifications, useLiveMetrics, useOrderTracking, useOrderChat } from '@/hooks/useSocket';
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
  AlertTriangle,
  Shield,
  Award,
  FileText,
  Eye,
  Upload,
  RefreshCw,
  Bell,
  Filter,
  Search,
  MoreVertical,
  Navigation,
  Camera,
  Send,
  Zap,
  Target,
  BarChart3,
  Calendar1,
  ChevronDown,
  ChevronRight,
  Map,
  Timer,
  Activity,
  Wifi,
  WifiOff,
  CircleDot,
  Users,
  Package,
  Truck,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight
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

interface ProviderVerificationData {
  id: string;
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  verificationDate?: string;
  adminNotes?: string;
  businessName: string;
  documents?: {
    aadhar?: { front?: string; back?: string; verified?: boolean };
    photo?: { url?: string; verified?: boolean };
    businessLicense?: { url?: string; verified?: boolean };
    insurance?: { url?: string; verified?: boolean };
  };
}

export default function ServiceProvider() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Real-time hooks integration
  const { notifications, unreadCount: notificationCount, markAsRead, markAllAsRead } = useNotifications();
  const { metrics, lastUpdated: metricsLastUpdated, isConnected: metricsConnected } = useLiveMetrics('service_provider');
  
  // Enhanced state management
  const [orderFilters, setOrderFilters] = useState({
    status: 'all',
    priority: 'all',
    dateRange: 'today',
    search: ''
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showNotifications, setShowNotifications] = useState(false);
  const [workSession, setWorkSession] = useState<{
    isActive: boolean;
    startTime: Date | null;
    currentOrderId: string | null;
  }>({ isActive: false, startTime: null, currentOrderId: null });
  
  // Location tracking state
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  
  // Chat and communication
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const { messages, sendChatMessage, unreadCount: chatUnreadCount } = useOrderChat(activeChatOrderId);

  // Check if user is a service provider
  if (!user || user.role !== 'service_provider') {
    setLocation('/');
    return null;
  }
  
  // Real-time location tracking effect
  useEffect(() => {
    if (isLocationEnabled && workSession.isActive && workSession.currentOrderId) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCurrentLocation({ latitude, longitude, accuracy });
          
          // Share location with customer via WebSocket
          const { shareLocation } = useOrderTracking(workSession.currentOrderId!);
          shareLocation(latitude, longitude, accuracy);
        },
        (error) => {
          console.error('Location tracking error:', error);
          toast({
            title: "Location Error",
            description: "Failed to track location. Please check your GPS settings.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 15000
        }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isLocationEnabled, workSession.isActive, workSession.currentOrderId]);
  
  // Notification sound effect
  useEffect(() => {
    if (notificationCount > 0) {
      // Could play notification sound here
      console.log(`New notifications: ${notificationCount}`);
    }
  }, [notificationCount]);

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

  // Fetch provider verification data
  const { data: verificationData } = useQuery<ProviderVerificationData>({
    queryKey: ['/api/v1/providers/verification', user?.uid],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/v1/providers/verification/${user?.uid}`);
      return response.json();
    },
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
    // SECURITY: Check verification status before allowing order acceptance
    if (!verificationData || verificationData.verificationStatus !== 'approved') {
      toast({
        title: "Verification Required",
        description: "You must be a verified provider to accept orders",
        variant: "destructive",
      });
      return;
    }
    acceptOrderMutation.mutate(orderId);
  };

  const handleRejectOrder = async (orderId: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: 'cancelled' });
  };

  const handleStartService = (orderId: string) => {
    setWorkSession({
      isActive: true,
      startTime: new Date(),
      currentOrderId: orderId
    });
    
    // Enable location tracking for customer
    setIsLocationEnabled(true);
    
    // Update order status to in_progress
    updateOrderStatusMutation.mutate({ orderId, status: 'in_progress' });
    
    toast({
      title: "Service Started",
      description: "Location tracking enabled. Customer can see your progress.",
    });
  };

  const handleCompleteService = (orderId: string) => {
    setWorkSession({
      isActive: false,
      startTime: null,
      currentOrderId: null
    });
    
    // Disable location tracking
    setIsLocationEnabled(false);
    
    setLocation(`/provider/orders/${orderId}/complete`);
  };
  
  // Batch operations for order management
  const handleBatchAccept = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      await Promise.all(
        selectedOrders.map(orderId => 
          apiRequest('PUT', `/api/v1/orders/${orderId}/assign`, {})
        )
      );
      
      toast({
        title: "Orders Accepted",
        description: `${selectedOrders.length} orders accepted successfully`,
      });
      
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/orders'] });
    } catch (error) {
      toast({
        title: "Failed to accept orders",
        description: "Some orders could not be accepted",
        variant: "destructive",
      });
    }
  };
  
  const handleBatchReject = async (reason: string = 'Not available') => {
    if (selectedOrders.length === 0) return;
    
    try {
      await Promise.all(
        selectedOrders.map(orderId => 
          apiRequest('PUT', `/api/v1/orders/${orderId}/status`, { 
            status: 'cancelled',
            reason 
          })
        )
      );
      
      toast({
        title: "Orders Rejected",
        description: `${selectedOrders.length} orders rejected`,
      });
      
      setSelectedOrders([]);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/orders'] });
    } catch (error) {
      toast({
        title: "Failed to reject orders",
        description: "Some orders could not be rejected",
        variant: "destructive",
      });
    }
  };

  const handleToggleOnlineStatus = async (online: boolean) => {
    // SECURITY: Check verification status before allowing online status change
    if (!verificationData || verificationData.verificationStatus !== 'approved') {
      toast({
        title: "Verification Required",
        description: "You must be a verified provider to go online",
        variant: "destructive",
      });
      // Reset toggle to offline
      setIsOnline(false);
      return;
    }
    
    setIsOnline(online);
    
    try {
      // Update online status on server with real-time sync
      await apiRequest('PUT', '/api/v1/providers/online-status', {
        isOnline: online,
        location: currentLocation,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: online ? "You're now online" : "You're now offline",
        description: online ? "You can receive new orders" : "You won't receive new orders",
      });
    } catch (error) {
      console.error('Failed to update online status:', error);
      setIsOnline(!online); // Revert on error
      toast({
        title: "Failed to update status",
        description: "Please try again later",
        variant: "destructive",
      });
    }
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

  // Verification status helpers
  const getVerificationStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          title: 'Verification Pending',
          description: 'Your documents are being reviewed'
        };
      case 'under_review':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          icon: FileText,
          title: 'Under Review',
          description: 'Admin is reviewing your application'
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          title: 'Verified Provider',
          description: 'Your account is fully verified'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          title: 'Verification Required',
          description: 'Please update your documents'
        };
      case 'suspended':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertTriangle,
          title: 'Account Suspended',
          description: 'Contact support for assistance'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Shield,
          title: 'Unverified',
          description: 'Complete your verification'
        };
    }
  };

  const getVerificationBadge = () => {
    if (!verificationData) return null;
    
    const statusInfo = getVerificationStatusInfo(verificationData.verificationStatus);
    const StatusIcon = statusInfo.icon;

    return (
      <Badge className={`${statusInfo.color} flex items-center space-x-1`}>
        <StatusIcon className="w-3 h-3" />
        <span>{statusInfo.title}</span>
      </Badge>
    );
  };

  // Helper to check if provider can perform actions
  const isProviderVerified = () => {
    return verificationData && verificationData.verificationStatus === 'approved';
  };
  
  // Filter orders based on current filters
  const getFilteredOrders = (orders: ProviderOrder[]) => {
    if (!orders) return [];
    
    return orders.filter(order => {
      // Status filter
      if (orderFilters.status !== 'all' && order.status !== orderFilters.status) {
        return false;
      }
      
      // Priority filter
      if (orderFilters.priority !== 'all' && order.priority !== orderFilters.priority) {
        return false;
      }
      
      // Search filter
      if (orderFilters.search) {
        const searchLower = orderFilters.search.toLowerCase();
        const matchesSearch = 
          order.customerName.toLowerCase().includes(searchLower) ||
          order.serviceName.toLowerCase().includes(searchLower) ||
          order.location.address.toLowerCase().includes(searchLower) ||
          order.id.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Date range filter
      const orderDate = new Date(order.scheduledAt);
      const today = new Date();
      
      switch (orderFilters.dateRange) {
        case 'today':
          return orderDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        case 'month':
          return orderDate.getMonth() === today.getMonth() && 
                 orderDate.getFullYear() === today.getFullYear();
        default:
          return true;
      }
    });
  };
  
  // Enhanced stats calculation with real-time data
  const getEnhancedStats = () => {
    const baseStats = stats || {};
    const liveMetrics = metrics || {};
    
    return {
      ...baseStats,
      ...liveMetrics,
      isLive: metricsConnected,
      lastUpdate: metricsLastUpdated
    };
  };

  // Enhanced Real-time Stats Card Component
  const StatsCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    isLive = false, 
    color = 'primary',
    subtitle 
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: { value: number; direction: 'up' | 'down' };
    isLive?: boolean;
    color?: string;
    subtitle?: string;
  }) => (
    <Card className={`relative overflow-hidden ${
      isLive ? 'ring-2 ring-green-500/20 bg-gradient-to-br from-background to-green-50' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-6 h-6 text-${color}`} />
          {isLive && (
            <div className="flex items-center space-x-1">
              <CircleDot className="w-3 h-3 text-green-500 animate-pulse" />
              <span className="text-xs text-green-600">Live</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground opacity-75">{subtitle}</div>
          )}
          {trend && (
            <div className={`flex items-center space-x-1 text-xs ${
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.direction === 'up' ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  // Enhanced Order Card with real-time features
  const OrderCard = ({ order, showActions = true, isSelected = false, onSelect }: { 
    order: ProviderOrder; 
    showActions?: boolean;
    isSelected?: boolean;
    onSelect?: (orderId: string) => void;
  }) => {
    const { orderStatus, isConnected: trackingConnected } = useOrderTracking(
      workSession.currentOrderId === order.id ? order.id : undefined
    );
    
    return (
    <Card className={`mb-4 transition-all duration-200 ${
      order.priority === 'emergency' ? 'border-red-300 shadow-red-100' : ''
    } ${
      isSelected ? 'ring-2 ring-primary/50 bg-primary/5' : ''
    } ${
      orderStatus ? 'border-green-300 bg-green-50' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            {showActions && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect?.(order.id)}
                className="mt-1"
                data-testid={`select-order-${order.id}`}
              />
            )}
            <div>
              <h3 className="font-semibold text-foreground">{order.serviceName}</h3>
              <p className="text-sm text-muted-foreground">Order #{order.id.slice(-8).toUpperCase()}</p>
              {trackingConnected && workSession.currentOrderId === order.id && (
                <div className="flex items-center space-x-1 mt-1">
                  <Activity className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">Live tracking active</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-primary">₹{order.amount}</p>
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(order.priority)}>
                {order.priority === 'emergency' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
              </Badge>
              {orderStatus && (
                <Badge variant="outline" className="text-xs">
                  {orderStatus}
                </Badge>
              )}
            </div>
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
                  disabled={!isProviderVerified()}
                  data-testid={`accept-${order.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {isProviderVerified() ? 'Accept' : 'Verification Required'}
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
                  onClick={() => setActiveChatOrderId(order.id)}
                  className="relative"
                  data-testid={`chat-${order.id}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {chatUnreadCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500">
                      {chatUnreadCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/provider/orders/${order.id}/photo`)}
                  data-testid={`photo-${order.id}`}
                >
                  <Camera className="w-4 h-4" />
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
  };
  
  // Notification Panel Component
  const NotificationPanel = () => (
    <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Notifications
            {notificationCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-3">
          {notifications.length > 0 ? (
            notifications.slice(0, 10).map((notification, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  notification.isRead ? 'bg-background' : 'bg-primary/5'
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-2">
                  <Bell className="w-4 h-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
  
  // Work Session Timer Component
  const WorkSessionTimer = () => {
    const [elapsed, setElapsed] = useState(0);
    
    useEffect(() => {
      if (workSession.isActive && workSession.startTime) {
        const interval = setInterval(() => {
          setElapsed(Date.now() - workSession.startTime!.getTime());
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [workSession.isActive, workSession.startTime]);
    
    if (!workSession.isActive) return null;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Timer className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Active Work Session</span>
          </div>
          <div className="text-2xl font-mono font-bold text-green-800">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-sm text-green-600 mt-1">Order #{workSession.currentOrderId?.slice(-8).toUpperCase()}</p>
          {currentLocation && (
            <div className="flex items-center justify-center space-x-1 mt-2">
              <Navigation className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600">Location shared</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  // Quick Action Buttons Component
  const QuickActions = () => (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Button
        variant="outline"
        className="h-20 flex flex-col space-y-2"
        onClick={() => setActiveTab('pending')}
        data-testid="quick-pending"
      >
        <Clock className="w-6 h-6" />
        <span className="text-sm">Pending Orders</span>
        {pendingOrders?.length > 0 && (
          <Badge variant="secondary">{pendingOrders.length}</Badge>
        )}
      </Button>
      
      <Button
        variant="outline"
        className="h-20 flex flex-col space-y-2"
        onClick={() => setLocation('/provider/calendar')}
        data-testid="quick-calendar"
      >
        <Calendar1 className="w-6 h-6" />
        <span className="text-sm">Calendar</span>
      </Button>
      
      <Button
        variant="outline"
        className="h-20 flex flex-col space-y-2"
        onClick={() => setLocation('/provider/earnings')}
        data-testid="quick-earnings"
      >
        <BarChart3 className="w-6 h-6" />
        <span className="text-sm">Earnings</span>
      </Button>
      
      <Button
        variant="outline"
        className="h-20 flex flex-col space-y-2"
        onClick={() => setLocation('/provider/profile')}
        data-testid="quick-profile"
      >
        <User className="w-6 h-6" />
        <span className="text-sm">Profile</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header with Real-time Features */}
      <header className="bg-primary text-primary-foreground p-4 relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-bold">Service Provider</h1>
                <p className="text-sm opacity-90">Welcome back, {user.displayName}</p>
                {metricsConnected && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                )}
              </div>
              {getVerificationBadge()}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNotifications(true)}
              className="relative"
              data-testid="notifications-bell"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500">
                  {notificationCount}
                </Badge>
              )}
            </Button>
            
            {/* Online Status Toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                {metricsConnected ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <Label htmlFor="online-status" className="text-sm">
                  {isOnline ? 'Online' : 'Offline'}
                </Label>
                <Switch
                  id="online-status"
                  checked={isOnline && isProviderVerified()}
                  onCheckedChange={handleToggleOnlineStatus}
                  disabled={!isProviderVerified()}
                  data-testid="online-toggle"
                />
              </div>
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
        
        {/* Connection Status Indicator */}
        {!metricsConnected && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-center py-1">
            <span className="text-xs">Reconnecting...</span>
          </div>
        )}
      </header>

      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="pending" data-testid="pending-tab" disabled={!isProviderVerified()}>
              Pending ({isProviderVerified() ? (pendingOrders?.length || 0) : '🔒'})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="active-tab" disabled={!isProviderVerified()}>
              Active ({isProviderVerified() ? (activeOrders?.length || 0) : '🔒'})
            </TabsTrigger>
            <TabsTrigger value="earnings" data-testid="earnings-tab" disabled={!isProviderVerified()}>Earnings {!isProviderVerified() && '🔒'}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {/* Work Session Timer */}
            <WorkSessionTimer />
            
            {/* Quick Actions */}
            <QuickActions />
            
            {/* Verification Status Card */}
            {verificationData && verificationData.verificationStatus !== 'approved' && (
              <Card className={`mb-6 border-2 ${
                verificationData.verificationStatus === 'pending' ? 'border-yellow-200 bg-yellow-50' :
                verificationData.verificationStatus === 'under_review' ? 'border-blue-200 bg-blue-50' :
                verificationData.verificationStatus === 'rejected' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {(() => {
                          const statusInfo = getVerificationStatusInfo(verificationData.verificationStatus);
                          const StatusIcon = statusInfo.icon;
                          return (
                            <>
                              <StatusIcon className="w-5 h-5" />
                              <h3 className="font-semibold text-lg">{statusInfo.title}</h3>
                            </>
                          );
                        })()}
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {getVerificationStatusInfo(verificationData.verificationStatus).description}
                      </p>
                      {verificationData.adminNotes && (
                        <div className="p-3 bg-background rounded-md border">
                          <p className="text-sm font-medium mb-1">Admin Notes:</p>
                          <p className="text-sm text-muted-foreground">{verificationData.adminNotes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {verificationData.verificationStatus === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation('/provider/verification')}
                          data-testid="update-verification"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Update Documents
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation('/provider/pending')}
                        data-testid="view-verification-status"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Verification Success Card for Approved Providers */}
            {verificationData && verificationData.verificationStatus === 'approved' && (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-800">Verified Provider</h3>
                        <p className="text-sm text-green-600">
                          Your account is fully verified and active
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Real-time Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Total Earnings"
                value={`₹${getEnhancedStats().totalEarnings || 0}`}
                icon={DollarSign}
                isLive={getEnhancedStats().isLive}
                color="primary"
                trend={getEnhancedStats().earningsTrend && {
                  value: getEnhancedStats().earningsTrend,
                  direction: getEnhancedStats().earningsTrend > 0 ? 'up' : 'down'
                }}
                subtitle={`Last updated: ${getEnhancedStats().lastUpdate ? 
                  new Date(getEnhancedStats().lastUpdate).toLocaleTimeString() : 'Never'}`}
              />
              
              <StatsCard
                title="Average Rating"
                value={`${getEnhancedStats().avgRating || 0}`}
                icon={Star}
                isLive={getEnhancedStats().isLive}
                color="yellow-500"
                subtitle={`${getEnhancedStats().totalReviews || 0} reviews`}
              />
              
              <StatsCard
                title="Completion Rate"
                value={`${getEnhancedStats().completionRate || 0}%`}
                icon={CheckCircle}
                isLive={getEnhancedStats().isLive}
                color="green-500"
                trend={getEnhancedStats().completionTrend && {
                  value: getEnhancedStats().completionTrend,
                  direction: getEnhancedStats().completionTrend > 0 ? 'up' : 'down'
                }}
              />
              
              <StatsCard
                title="Orders Today"
                value={getEnhancedStats().todayOrders || 0}
                icon={TrendingUp}
                isLive={getEnhancedStats().isLive}
                color="blue-500"
                subtitle={`${getEnhancedStats().ordersCompleted || 0} total completed`}
              />
            </div>
            
            {/* Today's Performance Summary */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Today's Performance</span>
                  {getEnhancedStats().isLive && (
                    <Badge variant="outline" className="ml-auto">
                      <CircleDot className="w-3 h-3 mr-1 text-green-500" />
                      Live
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{getEnhancedStats().todayEarnings || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Today's Earnings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {getEnhancedStats().activeOrders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Orders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {getEnhancedStats().avgResponseTime || 0}m
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {getEnhancedStats().customerSatisfaction || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Satisfaction</div>
                  </div>
                </div>
                
                {/* Performance Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Daily Goal Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {getEnhancedStats().goalProgress || 0}%
                    </span>
                  </div>
                  <Progress 
                    value={getEnhancedStats().goalProgress || 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

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
            {!isProviderVerified() ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-8 text-center">
                  <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-red-800 mb-2">Verification Required</h3>
                  <p className="text-red-600 mb-4">
                    You must complete verification before you can view and accept pending orders.
                  </p>
                  <Button 
                    onClick={() => setLocation('/provider/pending')}
                    data-testid="complete-verification"
                  >
                    Complete Verification
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Order Management Controls */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Search and Filters */}
                      <div className="flex-1 space-y-3 md:space-y-0 md:flex md:items-center md:space-x-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search orders..."
                            value={orderFilters.search}
                            onChange={(e) => setOrderFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="pl-10"
                            data-testid="order-search"
                          />
                        </div>
                        
                        <Select 
                          value={orderFilters.priority} 
                          onValueChange={(value) => setOrderFilters(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={orderFilters.dateRange} 
                          onValueChange={(value) => setOrderFilters(prev => ({ ...prev, dateRange: value }))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="all">All Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Batch Actions */}
                      {selectedOrders.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {selectedOrders.length} selected
                          </Badge>
                          <Button
                            size="sm"
                            onClick={handleBatchAccept}
                            data-testid="batch-accept"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBatchReject()}
                            data-testid="batch-reject"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject All
                          </Button>
                        </div>
                      )}
                      
                      {/* View Mode Toggle */}
                      <div className="flex items-center space-x-1 border rounded-lg p-1">
                        <Button
                          variant={viewMode === 'card' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('card')}
                          data-testid="view-card"
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          data-testid="view-list"
                        >
                          <Filter className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Orders Display */}
                {(() => {
                  const filteredOrders = getFilteredOrders(pendingOrders || []);
                  
                  if (filteredOrders.length > 0) {
                    return (
                      <div className={viewMode === 'card' ? 'space-y-4' : 'space-y-2'}>
                        <AnimatePresence>
                          {filteredOrders.map((order: ProviderOrder) => (
                            <motion.div
                              key={order.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <OrderCard 
                                order={order} 
                                isSelected={selectedOrders.includes(order.id)}
                                onSelect={(orderId) => {
                                  setSelectedOrders(prev => 
                                    prev.includes(orderId) 
                                      ? prev.filter(id => id !== orderId)
                                      : [...prev, orderId]
                                  );
                                }}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    );
                  } else {
                    return (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <h3 className="font-semibold text-muted-foreground mb-2">
                            {orderFilters.search || orderFilters.priority !== 'all' || orderFilters.dateRange !== 'today' 
                              ? 'No orders match your filters' 
                              : 'No Pending Orders'
                            }
                          </h3>
                          <p className="text-muted-foreground">
                            {orderFilters.search || orderFilters.priority !== 'all' || orderFilters.dateRange !== 'today' 
                              ? 'Try adjusting your search or filter criteria'
                              : "You're all caught up! New orders will appear here."
                            }
                          </p>
                          {(orderFilters.search || orderFilters.priority !== 'all' || orderFilters.dateRange !== 'today') && (
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setOrderFilters({
                                status: 'all',
                                priority: 'all',
                                dateRange: 'today',
                                search: ''
                              })}
                              data-testid="clear-filters"
                            >
                              Clear Filters
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                })()}
              </>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            {!isProviderVerified() ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-8 text-center">
                  <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-red-800 mb-2">Verification Required</h3>
                  <p className="text-red-600 mb-4">
                    You must complete verification before you can view and manage active orders.
                  </p>
                  <Button 
                    onClick={() => setLocation('/provider/pending')}
                    data-testid="complete-verification-active"
                  >
                    Complete Verification
                  </Button>
                </CardContent>
              </Card>
            ) : activeOrders && activeOrders.length > 0 ? (
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
            {!isProviderVerified() ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-8 text-center">
                  <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-red-800 mb-2">Verification Required</h3>
                  <p className="text-red-600 mb-4">
                    You must complete verification before you can view earnings and payment information.
                  </p>
                  <Button 
                    onClick={() => setLocation('/provider/pending')}
                    data-testid="complete-verification-earnings"
                  >
                    Complete Verification
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Notification Panel */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Notifications
              {notificationCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {notifications.length > 0 ? (
              notifications.slice(0, 10).map((notification, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    notification.isRead ? 'bg-background' : 'bg-primary/5'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-2">
                    <Bell className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Chat Dialog */}
      {activeChatOrderId && (
        <Dialog open={!!activeChatOrderId} onOpenChange={() => setActiveChatOrderId(null)}>
          <DialogContent className="max-w-md h-96">
            <DialogHeader>
              <DialogTitle>Chat - Order #{activeChatOrderId.slice(-8).toUpperCase()}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-3 p-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.senderId === user.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      message.senderId === user.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2 border-t pt-3">
              <Input
                placeholder="Type a message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    sendChatMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                data-testid="chat-input"
              />
              <Button size="sm" data-testid="send-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
