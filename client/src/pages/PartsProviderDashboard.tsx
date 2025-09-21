import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  DollarSign, 
  ShoppingCart, 
  Warehouse, 
  ArrowUp, 
  ArrowDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Store,
  Shield,
  Clock,
  Bell,
  BellRing,
  ChevronDown,
  MoreVertical,
  Users,
  Settings
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export default function PartsProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  
  // State management
  const [isOnline, setIsOnline] = useState(true);
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Form state for adding new parts
  const [newPart, setNewPart] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    stock: 0,
    lowStockThreshold: 10,
    supplierId: '',
    description: '',
    specifications: ''
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/dashboard'],
    enabled: !!user
  });

  // Fetch suppliers for dropdown
  const { data: suppliers } = useQuery({
    queryKey: ['/api/v1/parts-provider/suppliers'],
    enabled: !!user
  });

  // Add part mutation
  const addPartMutation = useMutation({
    mutationFn: (partData: any) => apiRequest('/api/v1/parts-provider/parts', {
      method: 'POST',
      body: JSON.stringify(partData)
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Part added successfully",
      });
      setIsAddPartOpen(false);
      setNewPart({
        name: '',
        sku: '',
        category: '',
        price: '',
        stock: 0,
        lowStockThreshold: 10,
        supplierId: '',
        description: '',
        specifications: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add part",
        variant: "destructive",
      });
    }
  });

  const handleAddPart = () => {
    addPartMutation.mutate(newPart);
  };

  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    toast({
      title: checked ? "Store is now online" : "Store is now offline",
      description: checked ? "Your inventory is visible to customers" : "Your inventory is hidden from customers",
    });
  };

  // Default stats if no data
  const stats = dashboardData?.stats || {
    totalProducts: 0,
    activeProducts: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: '0.00',
    lowStockAlerts: 0,
    outOfStockItems: 0,
    totalSuppliers: 0,
    averageRating: '0.00'
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      
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
                    <span className="text-sm">{stats.activeProducts} active</span>
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
                  <p className="text-3xl font-bold">{stats.pendingOrders}</p>
                  <div className="flex items-center mt-2">
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    <span className="text-sm">Awaiting fulfillment</span>
                  </div>
                </div>
                <AlertTriangle className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Completed Orders</p>
                  <p className="text-3xl font-bold">{stats.completedOrders}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+8% this week</span>
                  </div>
                </div>
                <Package className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
        <div className="flex items-center space-x-4">
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
                
                <div className="grid grid-cols-2 gap-4">
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
                      <option value="paint">Paint & Supplies</option>
                      <option value="tools">Tools</option>
                      <option value="safety">Safety Equipment</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newPart.price}
                      onChange={(e) => setNewPart({ ...newPart, price: e.target.value })}
                      placeholder="0.00"
                      data-testid="input-part-price"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Initial Stock *</Label>
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

    </div>
  );
}