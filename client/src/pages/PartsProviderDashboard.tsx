import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart, 
  DollarSign, 
  Star,
  RefreshCw,
  Plus,
  Edit,
  Truck,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Users,
  AlertCircle,
  Activity,
  Boxes,
  Warehouse,
  Store,
  Shield,
  Target,
  Award,
  PieChart,
  Filter,
  Search,
  Settings,
  Bell,
  BellRing,
  FileText,
  UserCheck,
  Clipboard,
  ArrowUp,
  TrendingDown,
  Package2,
  Zap,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Timer
} from 'lucide-react';

import { PartsProviderDashboardData, insertPartSchema } from '@shared/schema';
import { z } from 'zod';

// Use shared schema types instead of local interfaces
type PartData = z.infer<typeof insertPartSchema>;

export default function PartsProviderDashboard() {
  const { user } = useAuth();
  const { subscribe, sendMessage, isConnected } = useWebSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  
  // Enhanced state management for inventory features
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all', 'low_stock', 'out_of_stock', 'top_selling'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isBulkOperationOpen, setIsBulkOperationOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // New part form state
  const [newPart, setNewPart] = useState<PartData>({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: '',
    cost: '',
    stock: 0,
    lowStockThreshold: 10,
    supplier: '',
    model: '',
    brand: ''
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery<PartsProviderDashboardData>({
    queryKey: ['/api/v1/parts-provider/dashboard'],
    enabled: !!user && user.role === 'parts_provider',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Add new part mutation using centralized apiRequest
  const addPartMutation = useMutation({
    mutationFn: async (partData: PartData) => {
      return await apiRequest('POST', '/api/v1/parts-provider/parts', partData);
    },
    onSuccess: () => {
      toast({
        title: "Part Added Successfully!",
        description: "Your new part has been added to your inventory.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
      setIsAddPartOpen(false);
      setNewPart({
        name: '',
        description: '',
        sku: '',
        categoryId: '',
        price: 0,
        stock: 0,
        lowStockThreshold: 10,
        brand: '',
        model: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Part",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Accept order mutation using centralized apiRequest
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest('POST', `/api/v1/parts-provider/orders/${orderId}/accept`);
    },
    onSuccess: () => {
      toast({
        title: "Order Accepted!",
        description: "You have successfully accepted the order.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Accept Order",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Handle WebSocket events for parts providers using WebSocketContext
  useEffect(() => {
    if (!isConnected) return;

    const handleNewOrder = (data: any) => {
      console.log('🛒 New parts order received:', data);
      
      // Add to notifications
      const newNotification = {
        id: Date.now(),
        type: 'new_order',
        title: "New Parts Order!",
        message: `You have a new order for ${data.itemCount || 'multiple'} items`,
        timestamp: new Date(),
        data: data,
        read: false
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      
      // Play notification sound with proper error handling
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(error => {
          console.log('Notification sound not available:', error);
          // Fallback: Use system notification if available
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Parts Order!', {
              body: `You have a new order for ${data.itemCount || 'multiple'} items`,
              icon: '/fixitquick-logo.jpg'
            });
          }
        });
      } catch (e) {
        console.log('Audio notification not supported');
      }
      
      toast({
        title: "New Parts Order!",
        description: `You have a new order for ${data.itemCount || 'multiple'} items`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    };

    const handleLowStockAlert = (data: any) => {
      console.log('⚠️ Low stock alert:', data);
      
      // Add to notifications
      const newNotification = {
        id: Date.now(),
        type: 'low_stock',
        title: "Low Stock Alert!",
        message: `${data.partName || 'A part'} is running low (${data.currentStock || 0} remaining)`,
        timestamp: new Date(),
        data: data,
        read: false
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      
      toast({
        title: "Low Stock Alert!",
        description: `${data.partName || 'A part'} is running low (${data.currentStock || 0} remaining)`,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    };

    const handleOrderUpdate = (data: any) => {
      console.log('📦 Order update received:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    };

    // Subscribe to WebSocket events using the context
    const unsubscribeNewOrder = subscribe('parts_provider.new_order', handleNewOrder);
    const unsubscribeLowStock = subscribe('parts_provider.low_stock', handleLowStockAlert);
    const unsubscribeOrderUpdate = subscribe('parts_provider.order_update', handleOrderUpdate);

    // Subscribe to parts provider updates
    sendMessage('subscribe_parts_provider', { providerId: user?.id });

    return () => {
      // Unsubscribe from all events
      unsubscribeNewOrder();
      unsubscribeLowStock();
      unsubscribeOrderUpdate();
    };
  }, [subscribe, sendMessage, isConnected, user?.id, queryClient, toast]);

  // Toggle online status using WebSocketContext
  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    if (isConnected) {
      sendMessage('parts_provider_online_status', { isOnline: checked });
    }
    toast({
      title: checked ? "Your Store is Online!" : "Your Store is Offline",
      description: checked ? "You will receive new orders" : "You won't receive new orders",
    });
  };

  // Handle add part form submission
  const handleAddPart = () => {
    if (!newPart.name || !newPart.sku || !newPart.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, SKU, Price)",
        variant: "destructive",
      });
      return;
    }
    addPartMutation.mutate(newPart);
  };

  if (!user || user.role !== 'parts_provider') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is only available for parts providers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: '0.00',
    lowStockAlerts: 0,
    outOfStockItems: 0,
    totalSuppliers: 0,
    averageRating: '0.00'
  };
  const recentOrders = dashboardData?.recentOrders || [];
  const lowStockAlerts = dashboardData?.lowStockAlerts || [];
  const topProducts = dashboardData?.topProducts || [];
  const recentActivity = dashboardData?.recentActivity || [];
  const businessInfo = dashboardData?.businessInfo;

  // Mock performance data - would come from API in real implementation
  const performanceStats = {
    totalRevenue: stats.totalRevenue || '₹25,890',
    monthlyRevenue: '₹8,450',
    inventoryTurnover: '2.3x',
    fulfillmentRate: '98.5%',
    averageOrderValue: '₹1,245',
    supplierCount: stats.totalSuppliers || '12',
    categoryCount: '8',
    profitMargin: '35.2%'
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      {/* Enhanced Header with Parts Provider Branding */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-emerald-900 dark:text-white">
                Parts Inventory Hub
              </h1>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  <Store className="h-3 w-3 mr-1" />
                  Registered Store
                </Badge>
                {businessInfo?.isVerified ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified Supplier
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Verification
                  </Badge>
                )}
                {isConnected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    🟢 Live Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    🔄 Reconnecting...
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground ml-15">
            Welcome back, {user.firstName}! {businessInfo?.businessName ? `Managing ${businessInfo.businessName}` : 'Ready to manage your inventory today.'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Enhanced Notification Center */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }
              }}
              className="relative"
              data-testid="button-notifications"
            >
              {notifications.filter(n => !n.read).length > 0 ? (
                <BellRing className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 px-1 py-0 text-xs min-w-[1.2rem] h-5"
                >
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
            </Button>
            
            {/* Enhanced Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-10 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-emerald-50 dark:bg-gray-750">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-emerald-900 dark:text-white">Store Alerts</h3>
                    <Button size="sm" variant="ghost" onClick={() => setNotifications([])} className="text-xs">
                      Clear All
                    </Button>
                  </div>
                </div>
                {notifications.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notifications.map((notification, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          !notification.read ? 'bg-emerald-50 dark:bg-emerald-950 border-l-4 border-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            notification.type === 'low_stock' ? 'bg-red-100 text-red-600' :
                            notification.type === 'new_order' ? 'bg-green-100 text-green-600' :
                            notification.type === 'reorder_suggestion' ? 'bg-blue-100 text-blue-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {notification.type === 'low_stock' ? <AlertTriangle className="h-4 w-4" /> :
                             notification.type === 'new_order' ? <ShoppingCart className="h-4 w-4" /> :
                             notification.type === 'reorder_suggestion' ? <Package className="h-4 w-4" /> :
                             <Bell className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              {notification.timestamp?.toLocaleString() || 'Just now'}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Warehouse className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No inventory alerts</p>
                    <p className="text-xs mt-1">We'll notify you about stock levels and orders</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Enhanced Store Status Toggle */}
          <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border">
            <div className="flex items-center space-x-2">
              <Store className={`h-4 w-4 ${isOnline ? 'text-emerald-500' : 'text-gray-400'}`} />
              <span className="text-sm font-medium">{isOnline ? 'Store Open' : 'Store Closed'}</span>
            </div>
            <Switch 
              checked={isOnline}
              onCheckedChange={handleOnlineToggle}
              data-testid="toggle-store-status"
            />
          </div>
          
          {/* Quick Action Buttons */}
          <Dialog open={isAddPartOpen} onOpenChange={setIsAddPartOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-part">
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Part</DialogTitle>
                <DialogDescription>
                  Add a new part to your inventory. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Part Name *</Label>
                    <Input
                      id="name"
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                      placeholder="Enter part name"
                      data-testid="input-part-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={newPart.sku}
                      onChange={(e) => setNewPart({ ...newPart, sku: e.target.value })}
                      placeholder="Enter SKU"
                      data-testid="input-part-sku"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newPart.description}
                    onChange={(e) => setNewPart({ ...newPart, description: e.target.value })}
                    placeholder="Enter part description"
                    data-testid="input-part-description"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      value={newPart.category}
                      onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                      className="w-full p-2 border rounded-md bg-background"
                      data-testid="select-part-category"
                    >
                      <option value="">Select category</option>
                      <option value="electrical">Electrical</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="hardware">Hardware</option>
                      <option value="tools">Tools</option>
                      <option value="automotive">Automotive</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newPart.price}
                      onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
                      placeholder="0.00"
                      data-testid="input-part-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock *</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newPart.stock}
                      onChange={(e) => setNewPart({ ...newPart, stock: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      data-testid="input-part-stock"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      value={newPart.lowStockThreshold}
                      onChange={(e) => setNewPart({ ...newPart, lowStockThreshold: parseInt(e.target.value) || 10 })}
                      placeholder="5"
                      data-testid="input-part-threshold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={newPart.supplier}
                      onChange={(e) => setNewPart({ ...newPart, supplier: e.target.value })}
                      placeholder="Supplier name"
                      data-testid="input-part-supplier"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specifications">Specifications/Notes</Label>
                  <Input
                    id="specifications"
                    value={newPart.specifications}
                    onChange={(e) => setNewPart({ ...newPart, specifications: e.target.value })}
                    placeholder="Technical specifications or additional notes"
                    data-testid="input-part-specifications"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddPartOpen(false)}
                  data-testid="button-cancel-add-part"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPart}
                  disabled={addPartMutation.isPending || !newPart.name || !newPart.sku || !newPart.category || !newPart.price || !newPart.stock}
                  data-testid="button-save-part"
                >
                  {addPartMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Part
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] })}
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold">{performanceStats.totalRevenue}</p>
                  <div className="flex items-center mt-2">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+22% this month</span>
                  </div>
                </div>
                <DollarSign className="h-12 w-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Inventory Products</p>
                  <p className="text-3xl font-bold">{stats.totalProducts}</p>
                  <div className="flex items-center mt-2">
                    <Package className="h-4 w-4 mr-1" />
                    <span className="text-sm">{stats.activeProducts} Active</span>
                  </div>
                </div>
                <Warehouse className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Orders</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-3xl font-bold">{stats.pendingOrders}</p>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-1" />
                    </div>
                  </div>
                  <span className="text-sm text-orange-100">Total: {stats.totalOrders} orders</span>
                </div>
                <ShoppingCart className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Stock Alerts</p>
                  <p className="text-3xl font-bold">{stats.lowStockAlerts}</p>
                  <div className="flex items-center mt-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Needs Attention</span>
                  </div>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-6 bg-white dark:bg-gray-800 border">
            <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <PieChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" />
              Inventory
              {stats.lowStockAlerts > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.lowStockAlerts}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Order Queue
              {stats.pendingOrders > 0 && (
                <Badge variant="default" className="ml-2 bg-orange-600">{stats.pendingOrders}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suppliers" data-testid="tab-suppliers" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Truck className="h-4 w-4 mr-2" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>
          
          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isBulkOperationOpen} onOpenChange={setIsBulkOperationOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Clipboard className="h-4 w-4 mr-2" />
                  Bulk Actions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Inventory Operations</DialogTitle>
                  <DialogDescription>
                    Perform bulk operations on your inventory items.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex-col">
                      <Package className="h-6 w-6 mb-2" />
                      <span className="text-sm">Bulk Price Update</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <AlertTriangle className="h-6 w-6 mb-2" />
                      <span className="text-sm">Update Stock Alerts</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Truck className="h-6 w-6 mb-2" />
                      <span className="text-sm">Generate Reorders</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <FileText className="h-6 w-6 mb-2" />
                      <span className="text-sm">Export Catalog</span>
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsBulkOperationOpen(false)}>Close</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Supplier</DialogTitle>
                  <DialogDescription>
                    Add a new supplier to your network for better inventory management.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplierName">Supplier Name</Label>
                      <Input id="supplierName" placeholder="Enter supplier name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierContact">Contact Person</Label>
                      <Input id="supplierContact" placeholder="Contact person name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplierPhone">Phone</Label>
                      <Input id="supplierPhone" placeholder="Phone number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierEmail">Email</Label>
                      <Input id="supplierEmail" placeholder="Email address" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplierAddress">Address</Label>
                    <Textarea id="supplierAddress" placeholder="Full address" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>Cancel</Button>
                  <Button>Add Supplier</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No recent orders</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.slice(0, 5).map((order) => (
                      <OrderCard key={order.id} order={order} onAccept={() => acceptOrderMutation.mutate(order.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : lowStockAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground">All items well stocked!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockAlerts.slice(0, 5).map((part) => (
                      <LowStockCard key={part.id} part={part} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Products and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Top Selling Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No sales data yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.slice(0, 5).map((product, index) => (
                      <TopProductCard key={product.id} product={product} rank={index + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {recentOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders</h3>
                <p className="text-muted-foreground">
                  {isOnline ? "Your store is open and ready to receive orders!" : "Open your store to start receiving orders"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderCard key={order.id} order={order} onAccept={() => acceptOrderMutation.mutate(order.id)} expanded />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <InventoryManagement
            dashboardData={dashboardData}
            isLoading={isLoading}
            user={user}
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics & Reports</h3>
              <p className="text-muted-foreground">Advanced analytics features coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

// Order Card Component
function OrderCard({ 
  order, 
  onAccept, 
  expanded = false 
}: {
  order: PartsProviderDashboardData['recentOrders'][0];
  onAccept: () => void;
  expanded?: boolean;
}) {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-blue-500">Accepted</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-yellow-500">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={expanded ? "border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg p-4" : ""}
    >
      <Card className={expanded ? "border-0 shadow-none bg-transparent" : ""}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium" data-testid={`text-order-customer-${order.id}`}>
                  {order.customerName}
                </h4>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Order #{order.id.slice(-8)} • ₹{order.totalAmount}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
              </p>
              {expanded && order.items && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Items:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x{item.quantity}</span>
                        <span>₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {order.status === 'pending' && (
              <Button 
                size="sm" 
                onClick={onAccept}
                data-testid={`button-accept-order-${order.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Low Stock Card Component
function LowStockCard({ part }: { part: PartsProviderDashboardData['lowStockAlerts'][0] }) {
  return (
    <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 rounded-lg">
      <div className="space-y-1">
        <h4 className="font-medium text-sm" data-testid={`text-low-stock-name-${part.id}`}>{part.name}</h4>
        <p className="text-xs text-muted-foreground">SKU: {part.sku}</p>
        <p className="text-xs text-red-600 dark:text-red-400">
          Only {part.currentStock} left (threshold: {part.lowStockThreshold})
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">₹{part.price}</p>
        <Button size="sm" variant="outline" className="mt-1">
          <Plus className="h-3 w-3 mr-1" />
          Restock
        </Button>
      </div>
    </div>
  );
}

// Top Product Card Component
function TopProductCard({ 
  product, 
  rank 
}: { 
  product: PartsProviderDashboardData['topProducts'][0]; 
  rank: number;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full text-xs font-medium">
          {rank}
        </div>
        <div className="space-y-1">
          <h4 className="font-medium text-sm" data-testid={`text-top-product-name-${product.id}`}>{product.name}</h4>
          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{product.totalSold} sold</p>
        <p className="text-xs text-muted-foreground">₹{product.price} each</p>
      </div>
    </div>
  );
}

// Activity Card Component
function ActivityCard({ activity }: { activity: PartsProviderDashboardData['recentActivity'][0] }) {
  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'stock_in':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'stock_out':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'adjustment':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg">
      {getActivityIcon(activity.movementType)}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">
          {activity.movementType.replace('_', ' ').toUpperCase()} - {activity.quantity} units
        </p>
        <p className="text-xs text-muted-foreground">
          {activity.reason} • {new Date(activity.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

// Comprehensive Inventory Management Component
interface InventoryManagementProps {
  dashboardData: PartsProviderDashboardData | undefined;
  isLoading: boolean;
  user: any;
  queryClient: any;
  toast: any;
}

function InventoryManagement({ dashboardData, isLoading, user, queryClient, toast }: InventoryManagementProps) {
  const [inventoryView, setInventoryView] = useState('parts'); // parts, suppliers, movements
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // all, inStock, lowStock, outOfStock
  const [sortBy, setSortBy] = useState('name'); // name, price, stock, sold

  // Fetch inventory data
  const { data: partsData, isLoading: partsLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/inventory', user?.id],
    enabled: !!user?.id && inventoryView === 'parts',
  });

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/suppliers'],
    enabled: inventoryView === 'suppliers',
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/inventory/movements'],
    enabled: inventoryView === 'movements',
  });

  // Stock update mutation with proper API integration using centralized apiRequest
  const updateStockMutation = useMutation({
    mutationFn: async ({ partId, stock }: { partId: string; stock: number }) => {
      return await apiRequest('PUT', `/api/v1/parts-provider/parts/${partId}/stock`, { stock });
    },
    onSuccess: () => {
      toast({
        title: "Stock Updated!",
        description: "Stock level has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/inventory', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update stock level",
        variant: "destructive",
      });
    },
  });

  const parts: any[] = Array.isArray(partsData) ? partsData : [];
  
  // Filter and sort parts
  const filteredParts = parts
    .filter((part: any) => {
      const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           part.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock = stockFilter === 'all' ||
                          (stockFilter === 'inStock' && part.stock > 10) ||
                          (stockFilter === 'lowStock' && part.stock <= 10 && part.stock > 0) ||
                          (stockFilter === 'outOfStock' && part.stock === 0);
      return matchesSearch && matchesStock;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'price': return parseFloat(a.price) - parseFloat(b.price);
        case 'stock': return b.stock - a.stock;
        case 'sold': return (b.totalSold || 0) - (a.totalSold || 0);
        default: return a.name.localeCompare(b.name);
      }
    });

  if (isLoading || partsLoading) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Inventory Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Inventory Management</h3>
          <div className="flex rounded-lg border p-1">
            <Button
              variant={inventoryView === 'parts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInventoryView('parts')}
              data-testid="button-view-parts"
            >
              <Package className="h-4 w-4 mr-1" />
              Parts ({parts.length})
            </Button>
            <Button
              variant={inventoryView === 'suppliers' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInventoryView('suppliers')}
              data-testid="button-view-suppliers"
            >
              <Truck className="h-4 w-4 mr-1" />
              Suppliers
            </Button>
            <Button
              variant={inventoryView === 'movements' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInventoryView('movements')}
              data-testid="button-view-movements"
            >
              <Activity className="h-4 w-4 mr-1" />
              Movements
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" data-testid="button-bulk-upload">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Bulk Upload
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export">
            <ArrowDownRight className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Parts View */}
      {inventoryView === 'parts' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search parts by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-parts"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label>Stock:</Label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="select-stock-filter"
              >
                <option value="all">All Stock</option>
                <option value="inStock">In Stock</option>
                <option value="lowStock">Low Stock</option>
                <option value="outOfStock">Out of Stock</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Label>Sort:</Label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                data-testid="select-sort-by"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
                <option value="sold">Total Sold</option>
              </select>
            </div>
          </div>

          {/* Parts Grid */}
          <div className="grid gap-4">
            {filteredParts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Parts Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first part'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredParts.map((part: any) => (
                <InventoryPartCard
                  key={part.id}
                  part={part}
                  onStockUpdate={(stock) => updateStockMutation.mutate({ partId: part.id, stock })}
                  isUpdating={updateStockMutation.isPending}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Suppliers View */}
      {inventoryView === 'suppliers' && <SuppliersManagement />}

      {/* Movements View */}
      {inventoryView === 'movements' && <InventoryMovements />}
    </div>
  );
}

// Individual Part Card for Inventory
function InventoryPartCard({ part, onStockUpdate, isUpdating }: {
  part: any;
  onStockUpdate: (stock: number) => void;
  isUpdating: boolean;
}) {
  const [editingStock, setEditingStock] = useState(false);
  const [newStock, setNewStock] = useState(part.stock?.toString() || '0');

  const handleStockUpdate = () => {
    const stockValue = parseInt(newStock);
    if (!isNaN(stockValue) && stockValue >= 0) {
      onStockUpdate(stockValue);
      setEditingStock(false);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'destructive' };
    if (stock <= 10) return { label: 'Low Stock', color: 'orange' };
    return { label: 'In Stock', color: 'green' };
  };

  const stockStatus = getStockStatus(part.stock || 0);

  return (
    <Card data-testid={`card-part-${part.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div>
                <h4 className="font-semibold" data-testid={`text-part-name-${part.id}`}>
                  {part.name}
                </h4>
                <p className="text-sm text-muted-foreground">SKU: {part.sku}</p>
              </div>
              <Badge 
                variant={stockStatus.color as any}
                data-testid={`badge-stock-status-${part.id}`}
              >
                {stockStatus.label}
              </Badge>
            </div>
            <div className="mt-2 flex items-center space-x-6 text-sm">
              <span>Price: ₹{part.price}</span>
              <span>Sold: {part.totalSold || 0}</span>
              <span>Rating: {part.rating || '0.00'} ⭐</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Stock:</span>
                {editingStock ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      className="w-20"
                      min="0"
                      data-testid={`input-stock-${part.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={handleStockUpdate}
                      disabled={isUpdating}
                      data-testid={`button-save-stock-${part.id}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingStock(false);
                        setNewStock(part.stock?.toString() || '0');
                      }}
                      data-testid={`button-cancel-stock-${part.id}`}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span 
                      className="text-lg font-bold"
                      data-testid={`text-stock-${part.id}`}
                    >
                      {part.stock || 0}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingStock(true)}
                      data-testid={`button-edit-stock-${part.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-edit-part-${part.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-view-movements-${part.id}`}
              >
                <Activity className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Placeholder components for future enhancement
function SuppliersManagement() {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Supplier Management</h3>
        <p className="text-muted-foreground">
          Comprehensive supplier management features coming soon!
        </p>
      </CardContent>
    </Card>
  );
}

function InventoryMovements() {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Inventory Movements</h3>
        <p className="text-muted-foreground">
          Stock movement tracking and history coming soon!
        </p>
      </CardContent>
    </Card>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}