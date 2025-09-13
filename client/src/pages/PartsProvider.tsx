import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Package, 
  Plus, 
  Edit, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Truck,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  BarChart3,
  Settings,
  Percent
} from 'lucide-react';

interface Part {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  category: string;
  rating: number;
  totalSold: number;
  isActive: boolean;
  specifications: Record<string, any>;
}

interface PartsOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    partId: string;
    partName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  trackingId?: string;
  createdAt: string;
}

interface ProviderStats {
  totalEarnings: number;
  totalOrders: number;
  activeListings: number;
  lowStockItems: number;
  pendingOrders: number;
}

export default function PartsProvider() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  // Form states
  const [partForm, setPartForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    specifications: '',
  });

  // Check if user is a parts provider
  if (!user || user.role !== 'parts_provider') {
    setLocation('/');
    return null;
  }

  // Fetch provider stats
  const { data: stats } = useQuery({
    queryKey: ['/api/v1/parts-provider/stats', user.uid],
    enabled: !!user,
  });

  // Fetch parts inventory
  const { data: parts } = useQuery({
    queryKey: ['/api/v1/parts-provider/inventory', user.uid],
    enabled: !!user,
  });

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ['/api/v1/parts-provider/orders', user.uid],
    enabled: !!user,
  });

  // Add part mutation
  const addPartMutation = useMutation({
    mutationFn: async (partData: any) => {
      const response = await apiRequest('POST', '/api/v1/parts-provider/parts', partData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/inventory'] });
      setIsAddingPart(false);
      resetForm();
      toast({
        title: "Part added successfully",
        description: "Your new part is now listed in the marketplace.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add part",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ partId, stock }: { partId: string; stock: number }) => {
      const response = await apiRequest('PUT', `/api/v1/parts-provider/parts/${partId}/stock`, { stock });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/inventory'] });
      toast({
        title: "Stock updated",
        description: "Part stock has been updated successfully.",
      });
    },
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/v1/parts-provider/orders/${orderId}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/orders'] });
      toast({
        title: "Order accepted",
        description: "Order has been accepted and customer has been notified.",
      });
    },
  });

  // Ship order mutation
  const shipOrderMutation = useMutation({
    mutationFn: async ({ orderId, trackingId }: { orderId: string; trackingId: string }) => {
      const response = await apiRequest('POST', `/api/v1/parts-provider/orders/${orderId}/ship`, { trackingId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/orders'] });
      toast({
        title: "Order shipped",
        description: "Order has been shipped and tracking information sent to customer.",
      });
    },
  });

  const handleAddPart = () => {
    if (!partForm.name || !partForm.price || !partForm.stock) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const specifications = partForm.specifications ? 
      JSON.parse(partForm.specifications) : {};

    addPartMutation.mutate({
      ...partForm,
      price: parseFloat(partForm.price),
      stock: parseInt(partForm.stock),
      specifications,
    });
  };

  const handleUpdateStock = (partId: string, newStock: number) => {
    updateStockMutation.mutate({ partId, stock: newStock });
  };

  const handleAcceptOrder = (orderId: string) => {
    acceptOrderMutation.mutate(orderId);
  };

  const handleShipOrder = (orderId: string, trackingId: string) => {
    shipOrderMutation.mutate({ orderId, trackingId });
  };

  const resetForm = () => {
    setPartForm({
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      specifications: '',
    });
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock < 10) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingOrders = orders?.filter((order: PartsOrder) => order.status === 'pending') || [];
  const activeOrders = orders?.filter((order: PartsOrder) => 
    ['accepted', 'shipped'].includes(order.status)
  ) || [];
  const lowStockParts = parts?.filter((part: Part) => part.stock < 10) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Parts Provider Dashboard</h1>
            <p className="text-sm opacity-90">Welcome back, {user.displayName}</p>
          </div>
          
          <div className="flex items-center space-x-3">
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="inventory" data-testid="inventory-tab">
              Inventory ({parts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">
              Orders ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="promotions" data-testid="promotions-tab">Promotions</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">Analytics</TabsTrigger>
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
                  <ShoppingCart className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.activeListings || 0}</div>
                  <div className="text-xs text-muted-foreground">Active Listings</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.lowStockItems || 0}</div>
                  <div className="text-xs text-muted-foreground">Low Stock Alerts</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setIsAddingPart(true)}
                    className="w-full justify-start"
                    data-testid="add-part-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Part
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('inventory')}
                    className="w-full justify-start"
                    data-testid="manage-inventory"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Manage Inventory
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('orders')}
                    className="w-full justify-start"
                    data-testid="view-orders"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    View Orders
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  {lowStockParts.length > 0 ? (
                    <div className="space-y-2">
                      {lowStockParts.slice(0, 3).map((part: Part) => (
                        <div key={part.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{part.name}</span>
                          <Badge className="bg-orange-100 text-orange-800">
                            {part.stock} left
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">All parts are well stocked</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingOrders.length > 0 ? (
                  <div className="space-y-3">
                    {pendingOrders.slice(0, 3).map((order: PartsOrder) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Order #{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">₹{order.totalAmount}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOrder(order.id)}
                            data-testid={`accept-order-${order.id}`}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending orders</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Parts Inventory</h2>
              <Button onClick={() => setIsAddingPart(true)} data-testid="add-new-part">
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
            </div>

            {parts && parts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {parts.map((part: Part) => {
                  const stockStatus = getStockStatus(part.stock);
                  return (
                    <Card key={part.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{part.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {part.description}
                            </p>
                          </div>
                          <Badge className={stockStatus.color}>
                            {stockStatus.label}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-semibold">₹{part.price}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Stock:</span>
                            <span className="font-semibold">{part.stock} units</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sold:</span>
                            <span className="font-semibold">{part.totalSold}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rating:</span>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-sm ml-1">{part.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPart(part)}
                            className="flex-1"
                            data-testid={`edit-part-${part.id}`}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/parts-provider/parts/${part.id}`)}
                            data-testid={`view-part-${part.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No parts in inventory</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding your first part to the marketplace
                </p>
                <Button onClick={() => setIsAddingPart(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Part
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order: PartsOrder) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Order #{order.id.slice(-8).toUpperCase()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName} • {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.partName}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between font-semibold mb-4">
                        <span>Total</span>
                        <span>₹{order.totalAmount}</span>
                      </div>

                      {order.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOrder(order.id)}
                            className="flex-1"
                            data-testid={`accept-${order.id}`}
                          >
                            Accept Order
                          </Button>
                        </div>
                      )}

                      {order.status === 'accepted' && (
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter tracking ID"
                            className="flex-1"
                            data-testid={`tracking-${order.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.querySelector(`[data-testid="tracking-${order.id}"]`) as HTMLInputElement;
                              handleShipOrder(order.id, input.value);
                            }}
                            data-testid={`ship-${order.id}`}
                          >
                            Ship
                          </Button>
                        </div>
                      )}

                      {order.trackingId && (
                        <div className="text-sm text-muted-foreground">
                          Tracking ID: {order.trackingId}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No orders yet</h3>
                <p className="text-sm text-muted-foreground">
                  Orders will appear here when customers purchase your parts
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="promotions" className="mt-6">
            <div className="text-center py-12">
              <Percent className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-foreground mb-2">Promotions & Deals</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create special offers and discounts for your parts
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Promotion
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-foreground mb-2">Sales Analytics</h3>
              <p className="text-sm text-muted-foreground">
                View detailed analytics about your parts sales and performance
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Part Dialog */}
        <Dialog open={isAddingPart} onOpenChange={setIsAddingPart}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="part-name">Part Name *</Label>
                  <Input
                    id="part-name"
                    value={partForm.name}
                    onChange={(e) => setPartForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter part name"
                    data-testid="part-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="part-category">Category</Label>
                  <Input
                    id="part-category"
                    value={partForm.category}
                    onChange={(e) => setPartForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Electrical, Plumbing"
                    data-testid="part-category-input"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="part-description">Description</Label>
                <Textarea
                  id="part-description"
                  value={partForm.description}
                  onChange={(e) => setPartForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the part..."
                  data-testid="part-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="part-price">Price (₹) *</Label>
                  <Input
                    id="part-price"
                    type="number"
                    value={partForm.price}
                    onChange={(e) => setPartForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    data-testid="part-price-input"
                  />
                </div>
                <div>
                  <Label htmlFor="part-stock">Stock Quantity *</Label>
                  <Input
                    id="part-stock"
                    type="number"
                    value={partForm.stock}
                    onChange={(e) => setPartForm(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    data-testid="part-stock-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="part-specs">Specifications (JSON)</Label>
                <Textarea
                  id="part-specs"
                  value={partForm.specifications}
                  onChange={(e) => setPartForm(prev => ({ ...prev, specifications: e.target.value }))}
                  placeholder='{"voltage": "220V", "material": "Copper"}'
                  data-testid="part-specs-input"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingPart(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPart}
                  disabled={addPartMutation.isPending}
                  className="flex-1"
                  data-testid="confirm-add-part"
                >
                  {addPartMutation.isPending ? 'Adding...' : 'Add Part'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
