import { useState, useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import { usePWANotifications } from '@/hooks/usePWANotifications';
import { useNotificationFallback } from '@/hooks/useNotificationFallback';
import PWANotificationManager from '@/components/PWANotificationManager';
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
  
  // PWA Notification System Integration
  const {
    permissionState,
    preferences,
    isEnabled: pwaEnabled,
    requestNotificationPermission,
    testNotification
  } = usePWANotifications();
  
  const {
    fallbackNotifications,
    connectionStats,
    shouldUseFallback,
    unreadCount: fallbackUnreadCount,
    hasEmergencyNotifications
  } = useNotificationFallback();
  
  // Enhanced state management for inventory features
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all', 'low_stock', 'out_of_stock', 'top_selling'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isBulkOperationOpen, setIsBulkOperationOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Category management state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryView, setCategoryView] = useState('grid'); // 'grid', 'list', 'hierarchy'
  
  // New part form state
  const [newPart, setNewPart] = useState<PartData>({
    name: '',
    description: '',
    sku: '',
    categoryId: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    lowStockThreshold: 10,
    model: '',
    brand: ''
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery<PartsProviderDashboardData>({
    queryKey: ['/api/v1/parts-provider/dashboard'],
    enabled: !!user && user.role === 'parts_provider',
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch categories for enhanced filtering
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/v1/parts/categories'],
    enabled: !!user && user.role === 'parts_provider',
  });

  const categories = Array.isArray(categoriesData?.data) ? categoriesData.data : [];

  // Add new part mutation using centralized apiRequest
  const addPartMutation = useMutation({
    mutationFn: async (partData: PartData) => {
      return await apiRequest('POST', '/api/v1/parts', partData);
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
        costPrice: 0,
        stock: 0,
        lowStockThreshold: 10,
        model: '',
        brand: ''
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

        {/* Orders Tab - Enhanced */}
        <TabsContent value="orders" className="space-y-6">
          <EnhancedOrdersManagement 
            dashboardData={dashboardData} 
            recentOrders={recentOrders}
            onAcceptOrder={(orderId) => acceptOrderMutation.mutate(orderId)}
            isOnline={isOnline}
          />
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
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsDashboard dashboardData={dashboardData} user={user} />
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

// Enhanced Orders Management Component
interface EnhancedOrdersManagementProps {
  dashboardData: PartsProviderDashboardData | undefined;
  recentOrders: PartsProviderDashboardData['recentOrders'];
  onAcceptOrder: (orderId: string) => void;
  isOnline: boolean;
}

function EnhancedOrdersManagement({ 
  dashboardData, 
  recentOrders, 
  onAcceptOrder, 
  isOnline 
}: EnhancedOrdersManagementProps) {
  const [orderView, setOrderView] = useState('recent'); // recent, analytics, fulfillment
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, accepted, completed, cancelled

  const filteredOrders = recentOrders?.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status.toLowerCase() === filterStatus;
  }) || [];

  const pendingOrdersCount = recentOrders?.filter(order => order.status === 'pending').length || 0;
  const totalOrderValue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Orders Header & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Orders Management</h3>
          {!isOnline && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
          {pendingOrdersCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              {pendingOrdersCount} Pending
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-sm font-medium">Total Value: ₹{totalOrderValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{filteredOrders.length} orders</p>
          </div>
        </div>
      </div>

      {/* Order Views Tabs */}
      <div className="flex rounded-lg border p-1">
        <Button
          variant={orderView === 'recent' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setOrderView('recent')}
          data-testid="button-orders-recent"
        >
          <Clock className="h-4 w-4 mr-1" />
          Recent Orders ({recentOrders?.length || 0})
        </Button>
        <Button
          variant={orderView === 'analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setOrderView('analytics')}
          data-testid="button-orders-analytics"
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Analytics
        </Button>
        <Button
          variant={orderView === 'fulfillment' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setOrderView('fulfillment')}
          data-testid="button-orders-fulfillment"
        >
          <Truck className="h-4 w-4 mr-1" />
          Fulfillment
        </Button>
      </div>

      {/* Recent Orders View */}
      {orderView === 'recent' && (
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex items-center space-x-4">
            <Label>Filter by status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-order-filter">
                <SelectValue placeholder="All orders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {filterStatus === 'all' ? 'No orders yet' : `No ${filterStatus} orders`}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={() => onAcceptOrder(order.id)}
                  expanded={selectedOrder === order.id}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {orderView === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Order Value</p>
                    <p className="text-2xl font-bold">
                      ₹{filteredOrders.length > 0 ? Math.round(totalOrderValue / filteredOrders.length) : 0}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {recentOrders && recentOrders.length > 0 
                        ? Math.round((recentOrders.filter(o => o.status === 'completed').length / recentOrders.length) * 100)
                        : 0}%
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Response Time</p>
                    <p className="text-2xl font-bold">2.3h</p>
                    <p className="text-xs text-muted-foreground">Avg acceptance time</p>
                  </div>
                  <Timer className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Fulfillment View */}
      {orderView === 'fulfillment' && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Fulfillment tracking coming soon</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will show shipping status, tracking numbers, and delivery updates
            </p>
          </div>
        </div>
      )}
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
      return await apiRequest('PUT', `/api/v1/parts-provider/inventory/${partId}`, { stock });
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
  
  // Enhanced filter and sort parts with category support
  const filteredParts = parts
    .filter((part: any) => {
      const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           part.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           part.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock = stockFilter === 'all' ||
                          (stockFilter === 'inStock' && part.stock > 10) ||
                          (stockFilter === 'lowStock' && part.stock <= 10 && part.stock > 0) ||
                          (stockFilter === 'outOfStock' && part.stock === 0);
      const matchesCategory = selectedCategory === 'all' || part.categoryId === selectedCategory;
      return matchesSearch && matchesStock && matchesCategory;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'price': return parseFloat(a.price) - parseFloat(b.price);
        case 'stock': return b.stock - a.stock;
        case 'sold': return (b.totalSold || 0) - (a.totalSold || 0);
        case 'rating': return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
        case 'category': 
          const aCat = categories.find((c: any) => c.id === a.categoryId)?.name || 'Uncategorized';
          const bCat = categories.find((c: any) => c.id === b.categoryId)?.name || 'Uncategorized';
          return aCat.localeCompare(bCat);
        default: return a.name.localeCompare(b.name);
      }
    });

  // Group parts by category for hierarchy view
  const partsByCategory = React.useMemo(() => {
    const grouped = new Map();
    filteredParts.forEach((part: any) => {
      const category = categories.find((c: any) => c.id === part.categoryId);
      const categoryName = category?.name || 'Uncategorized';
      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, { category: category || { name: 'Uncategorized' }, parts: [] });
      }
      grouped.get(categoryName).parts.push(part);
    });
    return Array.from(grouped.values()).sort((a, b) => a.category.name.localeCompare(b.category.name));
  }, [filteredParts, categories]);

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
          {/* Enhanced Search & Filters with Categories */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parts by name, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-parts"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label>Category:</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  data-testid="select-category-filter"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.level === 0 ? 'Main' : 'Sub'})
                    </option>
                  ))}
                </select>
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
                  <option value="rating">Rating</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label>View:</Label>
                <div className="flex rounded-lg border p-1">
                  <Button
                    variant={categoryView === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCategoryView('grid')}
                    data-testid="button-grid-view"
                  >
                    <Boxes className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={categoryView === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCategoryView('list')}
                    data-testid="button-list-view"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    List
                  </Button>
                  <Button
                    variant={categoryView === 'hierarchy' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCategoryView('hierarchy')}
                    data-testid="button-hierarchy-view"
                  >
                    <Target className="h-4 w-4 mr-1" />
                    Categories
                  </Button>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>Total: {filteredParts.length}</span>
                <span>•</span>
                <span>In Stock: {filteredParts.filter((p: any) => p.stock > 10).length}</span>
                <span>•</span>
                <span>Low Stock: {filteredParts.filter((p: any) => p.stock <= 10 && p.stock > 0).length}</span>
                <span>•</span>
                <span>Out of Stock: {filteredParts.filter((p: any) => p.stock === 0).length}</span>
              </div>
            </div>
          </div>

          {/* Parts Grid - Enhanced with different view modes */}
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
          ) : categoryView === 'hierarchy' ? (
            <div className="space-y-6">
              {partsByCategory.map((categoryGroup: any) => (
                <CategorySection
                  key={categoryGroup.category.name}
                  category={categoryGroup.category}
                  parts={categoryGroup.parts}
                  onStockUpdate={(partId, stock) => updateStockMutation.mutate({ partId, stock })}
                  isUpdating={updateStockMutation.isPending}
                />
              ))}
            </div>
          ) : categoryView === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredParts.map((part: any) => (
                <InventoryPartCard
                  key={part.id}
                  part={part}
                  onStockUpdate={(stock) => updateStockMutation.mutate({ partId: part.id, stock })}
                  isUpdating={updateStockMutation.isPending}
                  viewMode="card"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredParts.map((part: any) => (
                <InventoryPartCard
                  key={part.id}
                  part={part}
                  onStockUpdate={(stock) => updateStockMutation.mutate({ partId: part.id, stock })}
                  isUpdating={updateStockMutation.isPending}
                  viewMode="list"
                />
              ))}
            </div>
          )}
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
function InventoryPartCard({ part, onStockUpdate, isUpdating, viewMode = 'card' }: {
  part: any;
  onStockUpdate: (stock: number) => void;
  isUpdating: boolean;
  viewMode?: 'card' | 'list';
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

  const cardContent = (
    <>
      <div className={`flex ${viewMode === 'list' ? 'items-center justify-between' : 'items-center justify-between'}`}>
        <div className="flex-1">
          <div className={`flex items-center space-x-3 ${viewMode === 'list' ? '' : 'mb-2'}`}>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold" data-testid={`text-part-name-${part.id}`}>
                  {part.name}
                </h4>
                <Badge 
                  variant={stockStatus.color as any}
                  data-testid={`badge-stock-status-${part.id}`}
                >
                  {stockStatus.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                SKU: {part.sku} {part.brand && `• ${part.brand}`} {part.model && `• ${part.model}`}
              </p>
              {part.description && viewMode === 'card' && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {part.description}
                </p>
              )}
            </div>
          </div>
          <div className={`${viewMode === 'list' ? 'flex items-center space-x-6' : 'mt-2 flex items-center space-x-6'} text-sm`}>
            <span className="font-medium text-green-600">₹{part.price}</span>
            <span>Sold: {part.totalSold || 0}</span>
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-400 mr-1" />
              <span>{part.rating || '0.00'}</span>
            </div>
            {part.categoryName && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {part.categoryName}
              </span>
            )}
          </div>
        </div>

        <div className={`flex items-center space-x-4 ${viewMode === 'list' ? 'ml-4' : ''}`}>
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
    </>
  );

  return viewMode === 'list' ? (
    <Card data-testid={`card-part-${part.id}`} className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        {cardContent}
      </CardContent>
    </Card>
  ) : (
    <Card data-testid={`card-part-${part.id}`} className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {cardContent}
      </CardContent>
    </Card>
  );
}

// Comprehensive Supplier Management Component
function SuppliersManagement() {
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    gstNumber: '',
    panNumber: '',
    paymentTerms: 'immediate',
    creditLimit: '0.00'
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/v1/parts-suppliers'],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addSupplierMutation = useMutation({
    mutationFn: async (supplierData: typeof supplierForm) => {
      return await apiRequest('POST', '/api/v1/parts-suppliers', supplierData);
    },
    onSuccess: () => {
      toast({
        title: "Supplier Added!",
        description: "New supplier has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-suppliers'] });
      setIsAddSupplierOpen(false);
      resetSupplierForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Supplier",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      gstNumber: '',
      panNumber: '',
      paymentTerms: 'immediate',
      creditLimit: '0.00'
    });
    setEditingSupplier(null);
  };

  const handleSupplierSubmit = () => {
    addSupplierMutation.mutate(supplierForm);
  };

  if (suppliersLoading) {
    return <InventorySkeleton />;
  }

  const suppliersList = Array.isArray(suppliers?.data) ? suppliers.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Supplier Management</h3>
          <p className="text-muted-foreground">Manage your supplier network and relationships</p>
        </div>
        <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-supplier">
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Add a new supplier to your network for better inventory management.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="Enter supplier name"
                    data-testid="input-supplier-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierContact">Contact Person</Label>
                  <Input
                    id="supplierContact"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    placeholder="Contact person name"
                    data-testid="input-supplier-contact"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierPhone">Phone *</Label>
                  <Input
                    id="supplierPhone"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="Phone number"
                    data-testid="input-supplier-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierEmail">Email</Label>
                  <Input
                    id="supplierEmail"
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="Email address"
                    data-testid="input-supplier-email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={supplierForm.gstNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value })}
                    placeholder="GST registration number"
                    data-testid="input-supplier-gst"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={supplierForm.panNumber}
                    onChange={(e) => setSupplierForm({ ...supplierForm, panNumber: e.target.value })}
                    placeholder="PAN card number"
                    data-testid="input-supplier-pan"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierAddress">Address</Label>
                <Textarea
                  id="supplierAddress"
                  value={supplierForm.address.street}
                  onChange={(e) => setSupplierForm({
                    ...supplierForm,
                    address: { ...supplierForm.address, street: e.target.value }
                  })}
                  placeholder="Full address"
                  data-testid="input-supplier-address"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={supplierForm.address.city}
                    onChange={(e) => setSupplierForm({
                      ...supplierForm,
                      address: { ...supplierForm.address, city: e.target.value }
                    })}
                    placeholder="City"
                    data-testid="input-supplier-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={supplierForm.address.state}
                    onChange={(e) => setSupplierForm({
                      ...supplierForm,
                      address: { ...supplierForm.address, state: e.target.value }
                    })}
                    placeholder="State"
                    data-testid="input-supplier-state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={supplierForm.address.pincode}
                    onChange={(e) => setSupplierForm({
                      ...supplierForm,
                      address: { ...supplierForm.address, pincode: e.target.value }
                    })}
                    placeholder="Pincode"
                    data-testid="input-supplier-pincode"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setIsAddSupplierOpen(false); resetSupplierForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSupplierSubmit}
                disabled={addSupplierMutation.isPending || !supplierForm.name || !supplierForm.phone}
                data-testid="button-save-supplier"
              >
                {addSupplierMutation.isPending && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Supplier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Suppliers List */}
      {suppliersList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Suppliers Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start building your supplier network by adding your first supplier.
            </p>
            <Button onClick={() => setIsAddSupplierOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suppliersList.map((supplier: any) => (
            <Card key={supplier.id} data-testid={`card-supplier-${supplier.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="text-lg font-semibold" data-testid={`text-supplier-name-${supplier.id}`}>
                          {supplier.name}
                        </h3>
                        {supplier.contactPerson && (
                          <p className="text-sm text-muted-foreground">
                            Contact: {supplier.contactPerson}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{supplier.phone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{supplier.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Orders</p>
                        <p className="font-medium">{supplier.totalOrders || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rating</p>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <p className="font-medium">{supplier.qualityRating || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                    {supplier.address && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {[supplier.address.street, supplier.address.city, supplier.address.state, supplier.address.pincode]
                            .filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setSupplierForm({
                          name: supplier.name || '',
                          contactPerson: supplier.contactPerson || '',
                          email: supplier.email || '',
                          phone: supplier.phone || '',
                          address: supplier.address || {
                            street: '',
                            city: '',
                            state: '',
                            pincode: '',
                            country: 'India'
                          },
                          gstNumber: supplier.gstNumber || '',
                          panNumber: supplier.panNumber || '',
                          paymentTerms: supplier.paymentTerms || 'immediate',
                          creditLimit: supplier.creditLimit || '0.00'
                        });
                        setIsAddSupplierOpen(true);
                      }}
                      data-testid={`button-edit-supplier-${supplier.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-view-supplier-${supplier.id}`}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Comprehensive Inventory Movements Component
function InventoryMovements() {
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [dateRange, setDateRange] = useState('7days');
  const [movementType, setMovementType] = useState('all');

  const { data: movements, isLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/inventory/movements', selectedPart, dateRange, movementType],
  });

  const { data: partsData } = useQuery({
    queryKey: ['/api/v1/parts-provider/inventory'],
  });

  const movementsList = Array.isArray(movements?.data) ? movements.data : [];
  const parts = Array.isArray(partsData?.data) ? partsData.data : [];

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'stock_in':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'stock_out':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case 'sale':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
        return <Edit className="h-4 w-4 text-orange-600" />;
      case 'damage':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'return':
        return <RefreshCw className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'stock_in':
      case 'return':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'stock_out':
      case 'sale':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'damage':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'adjustment':
        return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  if (isLoading) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inventory Movements</h3>
          <p className="text-muted-foreground">Track all stock movements and changes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" data-testid="button-export-movements">
            <ArrowDownRight className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Label>Part:</Label>
          <select
            value={selectedPart}
            onChange={(e) => setSelectedPart(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            data-testid="select-part-filter"
          >
            <option value="all">All Parts</option>
            {parts.map((part: any) => (
              <option key={part.id} value={part.id}>{part.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Label>Period:</Label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            data-testid="select-date-range"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <Label>Type:</Label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            data-testid="select-movement-type"
          >
            <option value="all">All Movements</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="sale">Sales</option>
            <option value="adjustment">Adjustments</option>
            <option value="damage">Damage/Loss</option>
            <option value="return">Returns</option>
          </select>
        </div>
      </div>

      {/* Movements List */}
      {movementsList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Activity className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Movement Records</h3>
            <p className="text-muted-foreground">
              No inventory movements found for the selected filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {movementsList.map((movement: any) => (
            <Card key={movement.id} className={`border-l-4 ${getMovementColor(movement.movementType)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getMovementIcon(movement.movementType)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium" data-testid={`text-movement-part-${movement.id}`}>
                          {movement.partName || 'Unknown Part'}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {movement.movementType.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Quantity: <span className="font-medium">{movement.quantity > 0 ? '+' : ''}{movement.quantity}</span>
                        {movement.reason && ` • ${movement.reason}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleString()}
                        {movement.orderId && ` • Order: ${movement.orderId}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Stock After</p>
                    <p className="text-lg font-semibold" data-testid={`text-stock-after-${movement.id}`}>
                      {movement.stockAfter}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
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

// Category Section Component for Hierarchy View
function CategorySection({ category, parts, onStockUpdate, isUpdating }: {
  category: any;
  parts: any[];
  onStockUpdate: (partId: string, stock: number) => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card data-testid={`category-section-${category.id || category.name}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-category-${category.name}`}
            >
              {expanded ? (
                <ArrowDownRight className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <h3 className="text-lg font-semibold" data-testid={`text-category-name-${category.name}`}>
                {category.name || 'Uncategorized'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {parts.length} {parts.length === 1 ? 'part' : 'parts'} • 
                Total Stock: {parts.reduce((sum, part) => sum + (part.stock || 0), 0)} •
                Value: ₹{parts.reduce((sum, part) => sum + ((part.price || 0) * (part.stock || 0)), 0).toFixed(2)}
              </p>
            </div>
          </div>
          <Badge variant="outline">
            {category.level === 0 ? 'Main Category' : 'Subcategory'}
          </Badge>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="grid gap-3">
            {parts.map((part) => (
              <InventoryPartCard
                key={part.id}
                part={part}
                onStockUpdate={(stock) => onStockUpdate(part.id, stock)}
                isUpdating={isUpdating}
                viewMode="list"
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Comprehensive Analytics Dashboard Component
function AnalyticsDashboard({ dashboardData, user }: { dashboardData: any; user: any }) {
  const [analyticsView, setAnalyticsView] = useState('overview'); // overview, revenue, inventory, performance
  const [timeRange, setTimeRange] = useState('30days');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/analytics', timeRange, analyticsView],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <InventorySkeleton />;
  }

  const stats = dashboardData?.stats || {};
  const topProducts = dashboardData?.topProducts || [];

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analytics & Performance</h3>
          <p className="text-muted-foreground">Comprehensive insights into your business performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            data-testid="select-time-range"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="12months">Last 12 Months</option>
          </select>
          <Button variant="outline" size="sm" data-testid="button-export-analytics">
            <ArrowDownRight className="h-4 w-4 mr-1" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Analytics Navigation */}
      <div className="flex rounded-lg border p-1">
        <Button
          variant={analyticsView === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAnalyticsView('overview')}
          data-testid="button-analytics-overview"
        >
          <PieChart className="h-4 w-4 mr-1" />
          Overview
        </Button>
        <Button
          variant={analyticsView === 'revenue' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAnalyticsView('revenue')}
          data-testid="button-analytics-revenue"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Revenue
        </Button>
        <Button
          variant={analyticsView === 'inventory' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAnalyticsView('inventory')}
          data-testid="button-analytics-inventory"
        >
          <Package className="h-4 w-4 mr-1" />
          Inventory
        </Button>
        <Button
          variant={analyticsView === 'performance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setAnalyticsView('performance')}
          data-testid="button-analytics-performance"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Performance
        </Button>
      </div>

      {/* Analytics Content */}
      {analyticsView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue || '0.00'}</p>
                    <p className="text-xs text-green-600 mt-1">+15% vs last period</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Orders Fulfilled</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalOrders || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">+8% vs last period</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                    <p className="text-2xl font-bold text-orange-600">₹{((stats.totalRevenue || 0) / (stats.totalOrders || 1)).toFixed(2)}</p>
                    <p className="text-xs text-orange-600 mt-1">+5% vs last period</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Turnover</p>
                    <p className="text-2xl font-bold text-purple-600">2.4x</p>
                    <p className="text-xs text-purple-600 mt-1">Excellent</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Top Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.slice(0, 5).map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{product.totalRevenue || '0.00'}</p>
                      <p className="text-sm text-muted-foreground">{product.totalSold || 0} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other analytics views would go here */}
      {analyticsView !== 'overview' && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{analyticsView.charAt(0).toUpperCase() + analyticsView.slice(1)} Analytics</h3>
            <p className="text-muted-foreground">
              Detailed {analyticsView} analytics and insights coming soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

