import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
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
  Boxes
} from 'lucide-react';

interface PartsProviderDashboardData {
  stats: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: string;
    lowStockAlerts: number;
    outOfStockItems: number;
    totalSuppliers: number;
    averageRating: string;
  };
  recentOrders: Array<{
    id: string;
    customerName: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    items: Array<{ name: string; quantity: number; price: string }>;
  }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    lowStockThreshold: number;
    price: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    totalSold: number;
    price: string;
    stock: number;
    rating: string;
  }>;
  recentActivity: Array<{
    id: string;
    partId: string;
    movementType: string;
    quantity: number;
    reason: string;
    createdAt: string;
  }>;
  businessInfo: {
    businessName: string;
    verificationStatus: string;
    isVerified: boolean;
    totalRevenue: string;
    totalOrders: number;
    averageRating: string;
  } | null;
}

interface PartData {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: string;
  cost: string;
  stock: number;
  lowStockThreshold: number;
  supplier: string;
  model: string;
  brand: string;
}

export default function PartsProviderDashboard() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  
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

  // Add new part mutation
  const addPartMutation = useMutation({
    mutationFn: async (partData: PartData) => {
      return await fetch('/api/v1/parts-provider/parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(partData),
      }).then(res => res.json());
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
        category: '',
        price: '',
        cost: '',
        stock: 0,
        lowStockThreshold: 10,
        supplier: '',
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

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await fetch(`/api/v1/parts-provider/orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }).then(res => res.json());
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

  // Handle WebSocket events for parts providers
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewOrder = (data: any) => {
      console.log('🛒 New parts order received:', data);
      toast({
        title: "New Parts Order!",
        description: `You have a new order for ${data.itemCount || 'multiple'} items`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    };

    const handleLowStockAlert = (data: any) => {
      console.log('⚠️ Low stock alert:', data);
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

    // Use the socket instance from WebSocketContext which has the right typing
    const socketInstance = socket as any;
    
    socketInstance.on('parts_provider.new_order', handleNewOrder);
    socketInstance.on('parts_provider.low_stock', handleLowStockAlert);
    socketInstance.on('parts_provider.order_update', handleOrderUpdate);

    // Subscribe to parts provider updates
    socketInstance.emit('subscribe_parts_provider', { providerId: user?.id });

    return () => {
      socketInstance.off('parts_provider.new_order', handleNewOrder);
      socketInstance.off('parts_provider.low_stock', handleLowStockAlert);
      socketInstance.off('parts_provider.order_update', handleOrderUpdate);
    };
  }, [socket, isConnected, user?.id, queryClient, toast]);

  // Toggle online status
  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    if (socket && isConnected) {
      (socket as any).emit('parts_provider_online_status', { isOnline: checked });
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Parts Provider Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.firstName}! {isConnected ? '🟢' : '🔴'} {isConnected ? 'Connected' : 'Connecting...'}
          </p>
          {businessInfo && (
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-muted-foreground">{businessInfo.businessName}</span>
              {businessInfo.isVerified && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Store Open</span>
            <Switch 
              checked={isOnline}
              onCheckedChange={handleOnlineToggle}
              data-testid="toggle-store-status"
            />
          </div>
          <Dialog open={isAddPartOpen} onOpenChange={setIsAddPartOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-part">
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold" data-testid="text-total-products">{stats.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold" data-testid="text-pending-orders">{stats.pendingOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold" data-testid="text-low-stock">{stats.lowStockAlerts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            Orders ({stats.pendingOrders || 0})
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            Analytics
          </TabsTrigger>
        </TabsList>

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
          <Card>
            <CardContent className="text-center py-8">
              <Boxes className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
              <p className="text-muted-foreground mb-4">Full inventory management features coming soon!</p>
              <p className="text-sm text-muted-foreground">
                You can add new parts using the "Add Part" button in the header.
              </p>
            </CardContent>
          </Card>
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

      {/* Add Part Dialog */}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
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
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                value={newPart.cost}
                onChange={(e) => setNewPart({ ...newPart, cost: e.target.value })}
                placeholder="0.00"
                data-testid="input-part-cost"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Initial Stock</Label>
              <Input
                id="stock"
                type="number"
                value={newPart.stock}
                onChange={(e) => setNewPart({ ...newPart, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-part-stock"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                value={newPart.lowStockThreshold}
                onChange={(e) => setNewPart({ ...newPart, lowStockThreshold: parseInt(e.target.value) || 10 })}
                placeholder="10"
                data-testid="input-part-threshold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={newPart.brand}
                onChange={(e) => setNewPart({ ...newPart, brand: e.target.value })}
                placeholder="Enter brand"
                data-testid="input-part-brand"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newPart.category}
                onChange={(e) => setNewPart({ ...newPart, category: e.target.value })}
                placeholder="Enter category"
                data-testid="input-part-category"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsAddPartOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPart} 
            disabled={addPartMutation.isPending}
            data-testid="button-save-part"
          >
            {addPartMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Part'
            )}
          </Button>
        </div>
      </DialogContent>
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