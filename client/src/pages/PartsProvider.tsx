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
import { ImageGallery } from '@/components/ImageGallery';
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
  Percent,
  Shield,
  Award,
  FileText,
  Clock
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

  // Image management state
  const [partImages, setPartImages] = useState<Array<{
    id: string;
    url: string;
    file?: File;
    status: 'uploading' | 'completed' | 'error';
    progress?: number;
  }>>([]);

  // Check if user is a parts provider
  if (!user || user.role !== 'parts_provider') {
    setLocation('/');
    return null;
  }

  // Fetch provider stats
  const { data: stats } = useQuery({
    queryKey: ['/api/v1/parts-provider/stats', user?.uid],
    queryFn: () => fetch(`/api/v1/parts-provider/stats/${user?.uid}`).then(res => res.json()),
    enabled: !!user?.uid,
  });

  // Fetch parts inventory
  const { data: parts } = useQuery({
    queryKey: ['/api/v1/parts-provider/inventory', user?.uid],
    queryFn: () => fetch(`/api/v1/parts-provider/inventory/${user?.uid}`).then(res => res.json()),
    enabled: !!user?.uid,
  });

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ['/api/v1/parts-provider/orders', user?.uid],
    queryFn: () => fetch(`/api/v1/parts-provider/orders/${user?.uid}`).then(res => res.json()),
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

  // Add part mutation
  const addPartMutation = useMutation({
    mutationFn: async (partData: any) => {
      const response = await apiRequest('POST', '/api/v1/parts-provider/parts', partData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/inventory', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/stats', user.uid] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/inventory', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/stats', user.uid] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/orders', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/stats', user.uid] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/orders', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/stats', user.uid] });
      toast({
        title: "Order shipped",
        description: "Order has been shipped and tracking information sent to customer.",
      });
    },
  });

  const handleAddPart = async () => {
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

    // Get completed image URLs
    const imageUrls = partImages
      .filter(img => img.status === 'completed')
      .map(img => img.url);

    addPartMutation.mutate({
      ...partForm,
      price: parseFloat(partForm.price),
      stock: parseInt(partForm.stock),
      specifications,
      images: imageUrls,
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
    setPartImages([]);
  };

  // Handle product image upload
  const handleProductImageUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const newImages = files.map(file => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file), // Temporary local URL for preview
      file,
      status: 'uploading' as const,
      progress: 0,
    }));

    // Add temporary images to state for immediate UI feedback
    setPartImages(prev => [...prev, ...newImages]);

    // Upload each file
    for (const imageData of newImages) {
      try {
        const formData = new FormData();
        formData.append('images', imageData.file!);
        formData.append('documentType', 'product_image');

        const response = await apiRequest('POST', '/api/v1/upload/product-images', formData, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setPartImages(prev => 
                prev.map(img => 
                  img.id === imageData.id 
                    ? { ...img, progress }
                    : img
                )
              );
            }
          }
        });

        const result = await response.json();

        if (result.success && result.images && result.images.length > 0) {
          const uploadedImage = result.images[0];
          
          // Update image with uploaded URL and mark as completed
          setPartImages(prev => 
            prev.map(img => 
              img.id === imageData.id 
                ? { 
                    ...img, 
                    url: uploadedImage.url, 
                    status: 'completed' as const,
                    progress: 100 
                  }
                : img
            )
          );

          // Clean up temporary object URL
          URL.revokeObjectURL(imageData.url);
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Product image upload error:', error);
        
        // Mark image as error and show toast
        setPartImages(prev => 
          prev.map(img => 
            img.id === imageData.id 
              ? { ...img, status: 'error' as const }
              : img
          )
        );

        toast({
          title: "Image upload failed",
          description: `Failed to upload ${imageData.file?.name}. Please try again.`,
          variant: "destructive",
        });

        // Clean up temporary object URL
        URL.revokeObjectURL(imageData.url);
      }
    }
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
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-xl font-bold">Parts Provider Dashboard</h1>
                <p className="text-sm opacity-90">Welcome back, {user.displayName}</p>
              </div>
              {getVerificationBadge()}
            </div>
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

              {/* Product Images Upload */}
              <div>
                <Label>Product Images</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload high-quality images of your part. The first image will be the primary image.
                </p>
                <ImageGallery
                  images={partImages}
                  onImagesChange={setPartImages}
                  onUpload={handleProductImageUpload}
                  maxImages={10}
                  acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                  maxSizePerFile={10 * 1024 * 1024} // 10MB
                  enableReordering={true}
                  showImageMetadata={false}
                  className="border-2 border-dashed border-border rounded-lg"
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
