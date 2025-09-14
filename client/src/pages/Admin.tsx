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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  UserCheck,
  UserX,
  Settings,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Plus,
  BarChart3,
  Search,
  Filter,
  Download,
  Bell,
  CreditCard,
  Package,
  Truck,
  Star,
  MessageCircle,
  Folder,
  FolderOpen,
  Move,
  Trash2,
  ChevronRight,
  ChevronDown,
  TreePine,
  Layers,
  Save,
  X
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  totalProviders: number;
  pendingVerifications: number;
  activeDisputes: number;
  monthlyGrowth: number;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'service_provider' | 'parts_provider' | 'admin';
  isVerified: boolean;
  createdAt: string;
  lastActive: string;
  status: 'active' | 'suspended' | 'pending';
}

interface Order {
  id: string;
  userId: string;
  customerName: string;
  type: 'service' | 'parts';
  status: string;
  totalAmount: number;
  createdAt: string;
  providerName?: string;
}

interface Verification {
  id: string;
  userId: string;
  userName: string;
  type: 'service_provider' | 'parts_provider';
  documents: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  subCategoriesCount?: number;
  servicesCount?: number;
  hasChildren?: boolean;
  children?: Category[];
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '',
    parentId: '',
    isActive: true,
  });

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  // Fetch admin dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/v1/admin/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/admin/stats');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch users
  const { data: users } = useQuery({
    queryKey: ['/api/v1/admin/users', searchQuery, filterRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterRole && filterRole !== 'all') params.set('role', filterRole);
      const response = await apiRequest('GET', `/api/v1/admin/users?${params.toString()}`);
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch orders
  const { data: orders } = useQuery({
    queryKey: ['/api/v1/admin/orders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/admin/orders');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch pending verifications
  const { data: verifications } = useQuery({
    queryKey: ['/api/v1/admin/verifications/pending'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/admin/verifications/pending');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch category hierarchy
  const { data: categoryHierarchy } = useQuery<Category[]>({
    queryKey: ['/api/v1/admin/categories/hierarchy'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/admin/categories/hierarchy');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch main categories
  const { data: mainCategories } = useQuery<Category[]>({
    queryKey: ['/api/v1/admin/categories/main'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/admin/categories/main');
      return response.json();
    },
    enabled: !!user,
  });

  // Update user status mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const response = await apiRequest('PUT', `/api/v1/admin/users/${userId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "User updated successfully",
        description: "User information has been updated.",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest('PUT', `/api/v1/admin/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "User role updated",
        description: "User role has been changed successfully.",
      });
    },
  });

  // Approve/reject verification mutation
  const verificationMutation = useMutation({
    mutationFn: async ({ verificationId, status, notes }: { 
      verificationId: string; 
      status: 'approved' | 'rejected'; 
      notes?: string;
    }) => {
      const response = await apiRequest('POST', `/api/v1/admin/verifications/${verificationId}`, {
        status,
        notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/verifications/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "Verification processed",
        description: "Verification status has been updated.",
      });
    },
  });

  // Refund order mutation
  const refundMutation = useMutation({
    mutationFn: async ({ orderId, amount, reason }: { 
      orderId: string; 
      amount: number; 
      reason: string;
    }) => {
      const response = await apiRequest('POST', `/api/v1/admin/refund/${orderId}`, {
        amount,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "Refund processed",
        description: "Refund has been initiated successfully.",
      });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const response = await apiRequest('POST', '/api/v1/admin/categories', categoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      setIsCreateCategoryOpen(false);
      setCategoryFormData({ name: '', description: '', icon: '', parentId: '', isActive: true });
      toast({
        title: "Category created",
        description: "New category has been created successfully.",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, data }: { categoryId: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/v1/admin/categories/${categoryId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      setIsEditCategoryOpen(false);
      setSelectedCategory(null);
      toast({
        title: "Category updated",
        description: "Category has been updated successfully.",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await apiRequest('DELETE', `/api/v1/admin/categories/${categoryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      toast({
        title: "Category deleted",
        description: "Category has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleUpdateUser = (userId: string, updates: any) => {
    updateUserMutation.mutate({ userId, updates });
  };

  const handleVerification = (verificationId: string, status: 'approved' | 'rejected', notes?: string) => {
    verificationMutation.mutate({ verificationId, status, notes });
  };

  const handleRefund = (orderId: string, amount: number, reason: string) => {
    refundMutation.mutate({ orderId, amount, reason });
  };

  // Category handler functions
  const handleCreateCategory = () => {
    if (!categoryFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      ...categoryFormData,
      parentId: categoryFormData.parentId && categoryFormData.parentId !== "null" ? categoryFormData.parentId : null,
    };
    
    createCategoryMutation.mutate(data);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
    });
    setIsEditCategoryOpen(true);
  };

  const handleUpdateCategory = () => {
    if (!selectedCategory || !categoryFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      ...categoryFormData,
      parentId: categoryFormData.parentId && categoryFormData.parentId !== "null" ? categoryFormData.parentId : null,
    };
    
    updateCategoryMutation.mutate({ categoryId: selectedCategory.id, data });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '', description: '', icon: '', parentId: '', isActive: true });
    setSelectedCategory(null);
  };

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'service_provider':
        return 'bg-blue-100 text-blue-800';
      case 'parts_provider':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Normalize API response data - handle different response formats
  const userList = Array.isArray(users) ? users : 
                   users?.users ? users.users : 
                   users?.data ? users.data : [];
  
  const filteredUsers = userList.filter((user: User) => {
    const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 
                     user.displayName || user.email || 'Unknown User';
    const matchesSearch = !searchQuery || 
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm opacity-90">FixitQuick Administration Panel</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLocation('/admin/settings')}
              data-testid="admin-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">
              Users ({userList?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">
              Orders ({orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="categories-tab">
              Categories
            </TabsTrigger>
            <TabsTrigger value="verifications" data-testid="verifications-tab">
              Verifications ({verifications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">Analytics</TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">₹{stats?.totalRevenue || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <ShoppingCart className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.monthlyGrowth || 0}%</div>
                  <div className="text-xs text-muted-foreground">Monthly Growth</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verifications</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {stats?.pendingVerifications || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Disputes</span>
                    <Badge className="bg-red-100 text-red-800">
                      {stats?.activeDisputes || 0}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('verifications')}
                    className="w-full"
                  >
                    Review Pending Items
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Status</span>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Providers</span>
                    <span className="text-sm font-medium">{stats?.totalProviders || 0}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View System Logs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('users')}
                    className="w-full justify-start"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('analytics')}
                    className="w-full justify-start"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">New user registered: John Doe</span>
                    <span className="text-xs text-muted-foreground">2 min ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">Order completed: #FQ12345</span>
                    <span className="text-xs text-muted-foreground">5 min ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-muted-foreground">Verification pending: Service Provider</span>
                    <span className="text-xs text-muted-foreground">10 min ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            {/* User Management Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">User Management</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="search-users"
                    />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="service_provider">Service Providers</SelectItem>
                      <SelectItem value="parts_provider">Parts Providers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.displayName || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUserStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(user.lastActive).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/users/${user.id}`)}
                            data-testid={`view-user-${user.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Order Management</h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Orders
              </Button>
            </div>

            {orders && orders.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: Order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          #{order.id.slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {order.type}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{order.totalAmount}</TableCell>
                        <TableCell>
                          <Badge className={`order-status-${order.status}`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              Refund
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No orders found</h3>
                <p className="text-sm text-muted-foreground">Orders will appear here as they are placed</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="verifications" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Verification Requests</h2>
              <Badge className="bg-yellow-100 text-yellow-800">
                {verifications?.length || 0} Pending
              </Badge>
            </div>

            {verifications && verifications.length > 0 ? (
              <div className="space-y-4">
                {verifications.map((verification: Verification) => (
                  <Card key={verification.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{verification.userName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {verification.type.replace('_', ' ').toUpperCase()} Verification
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {new Date(verification.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {verification.status}
                        </Badge>
                      </div>

                      <div className="flex space-x-2 mb-4">
                        {verification.documents.map((doc, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Document {index + 1}
                          </Button>
                        ))}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerification(verification.id, 'rejected')}
                          data-testid={`reject-verification-${verification.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVerification(verification.id, 'approved')}
                          data-testid={`approve-verification-${verification.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No pending verifications</h3>
                <p className="text-sm text-muted-foreground">
                  Verification requests will appear here when submitted
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-foreground mb-2">Analytics Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Detailed analytics and insights coming soon
              </p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>App Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Commission Rate (%)</Label>
                    <Input type="number" defaultValue="20" />
                  </div>
                  <div>
                    <Label>Emergency Service Surcharge (%)</Label>
                    <Input type="number" defaultValue="30" />
                  </div>
                  <Button>Save Configuration</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Maintenance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Database Backup
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Emergency Maintenance Mode
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Category Management</h2>
              <Button onClick={() => setIsCreateCategoryOpen(true)} data-testid="create-category-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            {/* Category Hierarchy Tree */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tree View */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TreePine className="w-5 h-5 mr-2" />
                    Category Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoryHierarchy && categoryHierarchy.length > 0 ? (
                    <div className="space-y-2">
                      {categoryHierarchy.map((category) => (
                        <div key={category.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategoryExpansion(category.id)}
                                className="p-1 h-6 w-6"
                              >
                                {category.hasChildren ? (
                                  expandedCategories.has(category.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )
                                ) : (
                                  <div className="w-4 h-4" />
                                )}
                              </Button>
                              <div className="flex items-center space-x-2">
                                {category.icon && <span className="text-lg">{category.icon}</span>}
                                <Folder className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">{category.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Level {category.level}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {category.subCategoriesCount || 0} sub
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {category.servicesCount || 0} services
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCategory(category)}
                                data-testid={`edit-category-${category.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(category.id)}
                                data-testid={`delete-category-${category.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Subcategories */}
                          {expandedCategories.has(category.id) && category.children && (
                            <div className="ml-8 mt-3 space-y-2">
                              {category.children.map((subCategory) => (
                                <div key={subCategory.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                  <div className="flex items-center space-x-2">
                                    {subCategory.icon && <span className="text-sm">{subCategory.icon}</span>}
                                    <FolderOpen className="w-3 h-3 text-orange-500" />
                                    <span className="text-sm">{subCategory.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      Level {subCategory.level}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {subCategory.servicesCount || 0} services
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditCategory(subCategory)}
                                      data-testid={`edit-subcategory-${subCategory.id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteCategory(subCategory.id)}
                                      data-testid={`delete-subcategory-${subCategory.id}`}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="font-medium text-foreground mb-2">No categories found</h3>
                      <p className="text-sm text-muted-foreground">
                        Start by creating your first main category
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Main Categories List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Folder className="w-5 h-5 mr-2" />
                    Main Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mainCategories && mainCategories.length > 0 ? (
                    <div className="space-y-3">
                      {mainCategories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {category.icon && <span className="text-xl">{category.icon}</span>}
                            <div>
                              <div className="font-medium">{category.name}</div>
                              {category.description && (
                                <div className="text-sm text-muted-foreground">{category.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={category.isActive ? "default" : "secondary"}>
                              {category.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {category.subCategoriesCount || 0} subcategories
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              data-testid={`edit-main-category-${category.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">No main categories yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Category Dialog */}
        <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input
                  id="categoryName"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="Enter category name"
                  data-testid="category-name-input"
                />
              </div>
              <div>
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea
                  id="categoryDescription"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Enter category description"
                  data-testid="category-description-input"
                />
              </div>
              <div>
                <Label htmlFor="categoryIcon">Icon (Emoji)</Label>
                <Input
                  id="categoryIcon"
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  placeholder="e.g., 🔧"
                  data-testid="category-icon-input"
                />
              </div>
              <div>
                <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
                <Select 
                  value={categoryFormData.parentId} 
                  onValueChange={(value) => setCategoryFormData({ ...categoryFormData, parentId: value })}
                >
                  <SelectTrigger data-testid="parent-category-select">
                    <SelectValue placeholder="Select parent category (leave empty for main category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None (Main Category)</SelectItem>
                    {mainCategories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="categoryActive"
                  checked={categoryFormData.isActive}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })}
                  data-testid="category-active-checkbox"
                />
                <Label htmlFor="categoryActive">Active</Label>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateCategoryOpen(false);
                    resetCategoryForm();
                  }} 
                  className="flex-1"
                  data-testid="cancel-create-category"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCategory} 
                  className="flex-1"
                  disabled={createCategoryMutation.isPending}
                  data-testid="confirm-create-category"
                >
                  {createCategoryMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Category
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="editCategoryName">Category Name *</Label>
                <Input
                  id="editCategoryName"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="Enter category name"
                  data-testid="edit-category-name-input"
                />
              </div>
              <div>
                <Label htmlFor="editCategoryDescription">Description</Label>
                <Textarea
                  id="editCategoryDescription"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Enter category description"
                  data-testid="edit-category-description-input"
                />
              </div>
              <div>
                <Label htmlFor="editCategoryIcon">Icon (Emoji)</Label>
                <Input
                  id="editCategoryIcon"
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  placeholder="e.g., 🔧"
                  data-testid="edit-category-icon-input"
                />
              </div>
              <div>
                <Label htmlFor="editParentCategory">Parent Category</Label>
                <Select 
                  value={categoryFormData.parentId} 
                  onValueChange={(value) => setCategoryFormData({ ...categoryFormData, parentId: value })}
                >
                  <SelectTrigger data-testid="edit-parent-category-select">
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None (Main Category)</SelectItem>
                    {mainCategories?.filter(cat => cat.id !== selectedCategory?.id).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editCategoryActive"
                  checked={categoryFormData.isActive}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })}
                  data-testid="edit-category-active-checkbox"
                />
                <Label htmlFor="editCategoryActive">Active</Label>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditCategoryOpen(false);
                    resetCategoryForm();
                  }} 
                  className="flex-1"
                  data-testid="cancel-edit-category"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCategory} 
                  className="flex-1"
                  disabled={updateCategoryMutation.isPending}
                  data-testid="confirm-edit-category"
                >
                  {updateCategoryMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Category
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Status</Label>
                  <Select defaultValue={selectedUser.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setSelectedUser(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button className="flex-1">Save Changes</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
