import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import ImageGallery from '@/components/ImageGallery';
import DocumentUpload from '@/components/DocumentUpload';
import AvatarUpload from '@/components/AvatarUpload';
import ImageUpload from '@/components/ImageUpload';
import { ServiceIconSelector } from '@/components/ServiceIconSelector';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { type UploadedImage } from '@/hooks/useImageUpload';
import { type ImageGalleryItem } from '@/components/ImageGallery';
import { type UploadedDocument } from '@/components/DocumentUpload';
import { 
  type Service,
  type InsertService,
  type ServiceCategory,
  type InsertServiceCategory,
  type User as UserType,
  type Order as OrderType,
  type Coupon,
  type InsertCoupon,
  type CouponUsage,
  // Tax management types
  type Tax,
  type InsertTax,
  type TaxCategory,
  type InsertTaxCategory
} from '@shared/schema';

// Form type interfaces for proper string date handling
interface CouponFormData {
  code?: string;
  title?: string;
  description?: string | null;
  type: 'percentage' | 'fixed_amount' | 'free_delivery' | 'service_specific';
  value?: string;
  maxDiscountAmount?: string | null;
  minOrderAmount?: string | null;
  validFrom?: string; // HTML date input uses string format
  validUntil?: string; // HTML date input uses string format
  usageLimit?: number | null;
  maxUsagePerUser?: number | null;
  isActive: boolean;
  createdBy?: string;
  targetAudience?: string;
  serviceCategoryIds?: string[];
  applicableOn?: string;
  stackable?: boolean;
  autoDeactivate?: boolean;
}

interface MediaFormData {
  title: string;
  description: string;
  mediaType: 'image' | 'video' | 'carousel';
  placement: 'header' | 'footer' | 'sidebar' | 'banner' | 'popup';
  isActive: boolean;
  autoPlay: boolean;
  loopEnabled: boolean;
  displayOrder: number;
  targetAudience: 'all' | 'new_users' | 'returning_users' | 'premium_users';
  startDate: string;
  endDate: string;
  isScheduled: boolean;
}
import { 
  Users, 
  User,
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
  X,
  RefreshCw,
  Activity,
  Calendar,
  Clock,
  Database,
  Globe,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  PieChart,
  Zap,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Monitor,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  LineChart,
  AreaChart,
  TrendingDown,
  Award,
  Target,
  Percent,
  IndianRupee,
  Calendar as CalendarIcon,
  Building,
  Store,
  Briefcase,
  Tag,
  Link,
  Image,
  Video,
  FileImage,
  Upload,
  Cloud,
  Lock,
  Unlock,
  Key,
  Code,
  Terminal,
  GitBranch,
  Layers3,
  Network,
  Router,
  Workflow,
  TicketPercent,
  Gift,
  QrCode,
  Copy,
  ExternalLink,
  FileBarChart,
  Banknote,
  Timer,
  Calculator,
  CheckSquare,
  Square,
  MoreHorizontal,
  GripVertical
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Comprehensive Promotional Media Management System Component
const PromotionalMediaManagementSystem = () => {
  // State management for promotional media
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState('media');
  const [isCreateMediaDialogOpen, setIsCreateMediaDialogOpen] = useState(false);
  const [isEditMediaDialogOpen, setIsEditMediaDialogOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] = useState<any>(null);
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  
  // Form state for media creation/editing
  const [mediaForm, setMediaForm] = useState({
    title: '',
    description: '',
    mediaType: 'image',
    placement: 'header',
    isActive: true,
    autoPlay: true,
    loopEnabled: true,
    displayOrder: 1,
    targetAudience: 'all',
    startDate: '',
    endDate: '',
    isScheduled: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch promotional media with filtering
  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['admin-promotional-media', {
      search: searchTerm,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      mediaType: typeFilter === 'all' ? undefined : typeFilter,
      placement: placementFilter === 'all' ? undefined : placementFilter,
      limit: 20,
      offset: (currentPage - 1) * 20
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      if (typeFilter !== 'all') params.append('mediaType', typeFilter);
      if (placementFilter !== 'all') params.append('placement', placementFilter);
      params.append('limit', '20');
      params.append('offset', String((currentPage - 1) * 20));

      return await apiRequest('GET', `/api/v1/admin/promotional-media?${params.toString()}`);
    }
  });

  // Fetch media statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-promotional-media-statistics'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/promotional-media/statistics');
    }
  });

  // Create media mutation
  const createMediaMutation = useMutation({
    mutationFn: async (mediaData: any) => {
      return await apiRequest('POST', '/api/v1/admin/promotional-media', mediaData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media-statistics'] });
      setIsCreateMediaDialogOpen(false);
      resetMediaForm();
      toast({ title: 'Media created successfully', description: 'The promotional media has been added.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating media', 
        description: error.message || 'Failed to create promotional media', 
        variant: 'destructive' 
      });
    }
  });

  // Update media mutation
  const updateMediaMutation = useMutation({
    mutationFn: async ({ id, mediaData }: { id: string; mediaData: any }) => {
      return await apiRequest('PUT', `/api/v1/admin/promotional-media/${id}`, mediaData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media-statistics'] });
      setIsEditMediaDialogOpen(false);
      setSelectedMediaItem(null);
      resetMediaForm();
      toast({ title: 'Media updated successfully', description: 'The promotional media has been updated.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating media', 
        description: error.message || 'Failed to update promotional media', 
        variant: 'destructive' 
      });
    }
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/v1/admin/promotional-media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media-statistics'] });
      toast({ title: 'Media deleted successfully', description: 'The promotional media has been removed.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting media', 
        description: error.message || 'Failed to delete promotional media', 
        variant: 'destructive' 
      });
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, mediaIds }: { operation: string; mediaIds: string[] }) => {
      return await apiRequest('POST', `/api/v1/admin/promotional-media/bulk`, { operation, mediaIds });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-promotional-media-statistics'] });
      setSelectedMedia([]);
      toast({ 
        title: `Bulk ${variables.operation} completed`, 
        description: `Successfully ${variables.operation}d ${variables.mediaIds.length} media items.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error in bulk operation', 
        description: error.message || 'Failed to complete bulk operation', 
        variant: 'destructive' 
      });
    }
  });

  // Utility functions
  const resetMediaForm = () => {
    setMediaForm({
      title: '',
      description: '',
      mediaType: 'image',
      placement: 'header',
      isActive: true,
      autoPlay: true,
      loopEnabled: true,
      displayOrder: 1,
      targetAudience: 'all',
      startDate: '',
      endDate: '',
      isScheduled: false,
    });
  };

  const handleEditMedia = (media: any) => {
    setSelectedMediaItem(media);
    setMediaForm(media);
    setIsEditMediaDialogOpen(true);
  };

  const handleBulkActivate = () => {
    if (selectedMedia.length > 0) {
      bulkOperationMutation.mutate({ operation: 'activate', mediaIds: selectedMedia });
    }
  };

  const handleBulkDeactivate = () => {
    if (selectedMedia.length > 0) {
      bulkOperationMutation.mutate({ operation: 'deactivate', mediaIds: selectedMedia });
    }
  };

  const handleBulkDelete = () => {
    if (selectedMedia.length > 0) {
      bulkOperationMutation.mutate({ operation: 'delete', mediaIds: selectedMedia });
    }
  };

  const media = mediaData?.data || [];
  const stats = statsData?.data || {};

  const filteredMedia = media.filter((item: any) => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Promotional Media Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Promotional Media Management</h2>
          <p className="text-muted-foreground">Manage promotional content, campaigns, and analytics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsSchedulingDialogOpen(true)}
            variant="outline"
            size="sm"
            data-testid="schedule-campaigns"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Campaigns
          </Button>
          <Button
            onClick={() => setIsAnalyticsDialogOpen(true)}
            variant="outline"
            size="sm"
            data-testid="view-analytics"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            onClick={() => setIsCreateMediaDialogOpen(true)}
            size="sm"
            data-testid="create-promotional-media"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Media
          </Button>
        </div>
      </div>

      {/* Media Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Video className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : stats.totalMedia || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Media</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : stats.activeMedia || 0}
                </div>
                <div className="text-xs text-muted-foreground">Active Media</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : `${stats.totalImpressions || 0}`}
                </div>
                <div className="text-xs text-muted-foreground">Total Impressions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : `${stats.clickThroughRate || 0}%`}
                </div>
                <div className="text-xs text-muted-foreground">Click Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Media Management Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="media" data-testid="media-subtab">
            <Video className="w-4 h-4 mr-2" />
            Media Library
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="campaigns-subtab">
            <Calendar className="w-4 h-4 mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="analytics-subtab">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-subtab">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Media Library Tab Content */}
        <TabsContent value="media" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search media by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="media-search"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32" data-testid="type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={placementFilter} onValueChange={setPlacementFilter}>
                <SelectTrigger className="w-32" data-testid="placement-filter">
                  <SelectValue placeholder="Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="sidebar">Sidebar</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMedia.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedMedia.length} media items selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkActivate}
                data-testid="bulk-activate"
              >
                <Zap className="w-4 h-4 mr-2" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDeactivate}
                data-testid="bulk-deactivate"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deactivate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                data-testid="bulk-delete"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}

          {/* Media Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mediaLoading ? (
              [...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredMedia.map((item: any) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Media Preview */}
                    <div className="relative h-32 bg-muted">
                      {item.mediaType === 'video' ? (
                        <video
                          src={item.mediaUrl}
                          poster={item.thumbnailUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={item.mediaUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Media Type Badge */}
                      <Badge 
                        className="absolute top-2 left-2"
                        variant={item.mediaType === 'video' ? 'default' : 'secondary'}
                      >
                        {item.mediaType === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
                        {item.mediaType}
                      </Badge>

                      {/* Status Badge */}
                      <Badge 
                        className="absolute top-2 right-2"
                        variant={item.isActive ? 'default' : 'secondary'}
                      >
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>

                      {/* Selection Checkbox */}
                      <Checkbox
                        className="absolute bottom-2 left-2"
                        checked={selectedMedia.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMedia([...selectedMedia, item.id]);
                          } else {
                            setSelectedMedia(selectedMedia.filter(id => id !== item.id));
                          }
                        }}
                        data-testid={`select-media-${item.id}`}
                      />
                    </div>

                    {/* Media Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>{item.impressions || 0} views</span>
                        <span>{item.clicks || 0} clicks</span>
                        <span>#{item.displayOrder}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditMedia(item)}
                          data-testid={`edit-media-${item.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMediaMutation.mutate(item.id)}
                          data-testid={`delete-media-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`view-analytics-${item.id}`}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Empty State */}
          {!mediaLoading && filteredMedia.length === 0 && (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-foreground mb-2">No promotional media found</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first promotional media to get started</p>
              <Button onClick={() => setIsCreateMediaDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Media
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Other tab contents would go here - campaigns, analytics, settings */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-foreground mb-2">Campaign Management</h3>
            <p className="text-sm text-muted-foreground">Campaign scheduling and management coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-foreground mb-2">Detailed Analytics</h3>
            <p className="text-sm text-muted-foreground">Advanced analytics dashboard coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-foreground mb-2">Media Settings</h3>
            <p className="text-sm text-muted-foreground">Global media settings and preferences coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Media Dialog */}
      <Dialog open={isCreateMediaDialogOpen} onOpenChange={setIsCreateMediaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Promotional Media</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={mediaForm.title}
                  onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })}
                  placeholder="Enter media title"
                  data-testid="media-title"
                />
              </div>
              
              <div>
                <Label htmlFor="mediaType">Media Type</Label>
                <Select value={mediaForm.mediaType} onValueChange={(value) => setMediaForm({ ...mediaForm, mediaType: value })}>
                  <SelectTrigger data-testid="media-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={mediaForm.description}
                onChange={(e) => setMediaForm({ ...mediaForm, description: e.target.value })}
                placeholder="Enter media description"
                rows={3}
                data-testid="media-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="placement">Placement</Label>
                <Select value={mediaForm.placement} onValueChange={(value) => setMediaForm({ ...mediaForm, placement: value })}>
                  <SelectTrigger data-testid="media-placement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select value={mediaForm.targetAudience} onValueChange={(value) => setMediaForm({ ...mediaForm, targetAudience: value })}>
                  <SelectTrigger data-testid="target-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="new">New Users</SelectItem>
                    <SelectItem value="returning">Returning Users</SelectItem>
                    <SelectItem value="premium">Premium Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={mediaForm.displayOrder}
                  onChange={(e) => setMediaForm({ ...mediaForm, displayOrder: parseInt(e.target.value) || 1 })}
                  min="1"
                  data-testid="display-order"
                />
              </div>
            </div>

            {/* Media Upload Area */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-2">Upload Media File</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {mediaForm.mediaType === 'video' 
                  ? 'Support for MP4, WebM files up to 50MB' 
                  : 'Support for JPG, PNG, WebP files up to 5MB'}
              </p>
              <Button variant="outline" data-testid="upload-media-file">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>

            {/* Settings */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={mediaForm.isActive}
                    onCheckedChange={(checked) => setMediaForm({ ...mediaForm, isActive: !!checked })}
                    data-testid="media-active"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                
                {mediaForm.mediaType === 'video' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="autoPlay"
                        checked={mediaForm.autoPlay}
                        onCheckedChange={(checked) => setMediaForm({ ...mediaForm, autoPlay: !!checked })}
                        data-testid="media-autoplay"
                      />
                      <Label htmlFor="autoPlay">Auto-play</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="loopEnabled"
                        checked={mediaForm.loopEnabled}
                        onCheckedChange={(checked) => setMediaForm({ ...mediaForm, loopEnabled: !!checked })}
                        data-testid="media-loop"
                      />
                      <Label htmlFor="loopEnabled">Loop</Label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateMediaDialogOpen(false)}
                data-testid="cancel-create-media"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => createMediaMutation.mutate(mediaForm)}
                disabled={createMediaMutation.isPending}
                data-testid="confirm-create-media"
              >
                {createMediaMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Media
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Media Dialog - Similar to create but with existing data */}
      <Dialog open={isEditMediaDialogOpen} onOpenChange={setIsEditMediaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotional Media</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Similar content to create dialog but with edit functionality */}
            <div className="text-center py-8">
              <Edit className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Edit functionality will be implemented here</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Comprehensive Tax Management System Component
const TaxManagementSystem = () => {
  // State management for taxes
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState('taxes');
  const [isCreateTaxDialogOpen, setIsCreateTaxDialogOpen] = useState(false);
  const [isEditTaxDialogOpen, setIsEditTaxDialogOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null);
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [previewOrderValue, setPreviewOrderValue] = useState(1000);
  const [taxForm, setTaxForm] = useState<Partial<InsertTax>>({
    type: 'percentage',
    isActive: true,
    isPrimary: false,
    combinable: true,
    locationBased: false,
    compoundable: false,
    priority: 1,
    rate: '0',
    minOrderValue: '0',
    roundingRule: 'round',
    gstType: null,
    taxableBaseIncludes: {
      serviceAmount: true,
      shippingAmount: false,
      previousTaxes: false
    },
    serviceCategories: [],
    partCategories: [],
    stateRestrictions: [],
    cityRestrictions: []
  });
  const [categoryForm, setCategoryForm] = useState<Partial<InsertServiceCategory>>({
    isActive: true,
    sortOrder: 0
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch taxes with comprehensive filtering
  const { data: taxesData, isLoading: taxesLoading } = useQuery({
    queryKey: ['admin-taxes', {
      search: searchTerm,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
      type: typeFilter === 'all' ? undefined : typeFilter,
      limit: 20,
      offset: (currentPage - 1) * 20
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '20');
      params.append('offset', String((currentPage - 1) * 20));

      return await apiRequest('GET', `/api/v1/admin/taxes?${params.toString()}`);
    }
  });

  // Fetch service categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/admin/categories');
      return response.data || [];
    }
  });

  // Fetch service statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-service-statistics'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/services/statistics');
    }
  });

  // Fetch category statistics
  const { data: categoryStatsData, isLoading: categoryStatsLoading } = useQuery({
    queryKey: ['admin-service-category-statistics'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/services/statistics');
    }
  });

  // Create tax mutation
  const createTaxMutation = useMutation({
    mutationFn: async (taxData: InsertTax) => await apiRequest('POST', '/api/v1/admin/taxes', taxData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-statistics'] });
      setIsCreateTaxDialogOpen(false);
      resetTaxForm();
      toast({ title: 'Tax created successfully', description: 'The new tax has been added.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating tax', 
        description: error.message || 'Failed to create tax', 
        variant: 'destructive' 
      });
    }
  });

  // Update tax mutation
  const updateTaxMutation = useMutation({
    mutationFn: async ({ id, taxData }: { id: string; taxData: Partial<InsertTax> }) => 
      await apiRequest('PUT', `/api/v1/admin/taxes/${id}`, taxData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-statistics'] });
      setIsEditTaxDialogOpen(false);
      setSelectedTax(null);
      resetTaxForm();
      toast({ title: 'Tax updated successfully', description: 'The tax has been updated.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating tax', 
        description: error.message || 'Failed to update tax', 
        variant: 'destructive' 
      });
    }
  });

  // Delete tax mutation
  const deleteTaxMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest('DELETE', `/api/v1/admin/taxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-statistics'] });
      toast({ title: 'Tax deleted successfully', description: 'The tax has been removed.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting tax', 
        description: error.message || 'Failed to delete tax', 
        variant: 'destructive' 
      });
    }
  });

  // Create service category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: InsertServiceCategory) => await apiRequest('POST', '/api/v1/admin/categories', categoryData),
    onSuccess: () => {
      // Invalidate admin queries with consistent patterns
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-statistics'] });
      
      // Invalidate user-facing queries for immediate data sync
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      
      setIsCreateCategoryDialogOpen(false);
      resetCategoryForm();
      toast({ title: 'Service category created successfully', description: 'The new category has been added.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating category', 
        description: error.message || 'Failed to create category', 
        variant: 'destructive' 
      });
    }
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async ({ operation, taxIds }: { operation: string; taxIds: string[] }) => 
      await apiRequest('POST', `/api/v1/admin/taxes/bulk-${operation}`, { taxIds }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-taxes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-statistics'] });
      setSelectedTaxes([]);
      toast({ 
        title: `Bulk ${variables.operation} completed`, 
        description: `Successfully ${variables.operation}d ${variables.taxIds.length} taxes.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error in bulk operation', 
        description: error.message || 'Failed to complete bulk operation', 
        variant: 'destructive' 
      });
    }
  });

  // Utility functions
  const resetTaxForm = () => {
    setTaxForm({
      type: 'percentage',
      isActive: true,
      isPrimary: false,
      combinable: true,
      locationBased: false,
      compoundable: false,
      priority: 1,
      rate: '0',
      minOrderValue: '0',
      roundingRule: 'round',
      gstType: null,
      taxableBaseIncludes: {
        serviceAmount: true,
        shippingAmount: false,
        previousTaxes: false
      },
      serviceCategories: [],
      partCategories: [],
      stateRestrictions: [],
      cityRestrictions: []
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      isActive: true,
      sortOrder: 0
    });
  };

  const handleEditTax = (tax: Tax) => {
    setSelectedTax(tax);
    setTaxForm(tax);
    setIsEditTaxDialogOpen(true);
  };

  const handleEditCategory = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setCategoryForm(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleBulkActivate = () => {
    if (selectedTaxes.length > 0) {
      bulkOperationMutation.mutate({ operation: 'activate', taxIds: selectedTaxes });
    }
  };

  const handleBulkDeactivate = () => {
    if (selectedTaxes.length > 0) {
      bulkOperationMutation.mutate({ operation: 'deactivate', taxIds: selectedTaxes });
    }
  };

  const taxes = taxesData?.data || [];
  const categories = categoriesData?.data || [];
  const stats = statsData?.data || {};
  const categoryStats = categoryStatsData?.data || {};

  const filteredTaxes = taxes.filter((tax: Tax) => {
    const matchesSearch = !searchTerm || 
      tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tax.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tax.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Tax Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tax Management System</h2>
          <p className="text-muted-foreground">Manage taxes, categories, and calculation rules</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsCreateCategoryDialogOpen(true)}
            variant="outline"
            size="sm"
            data-testid="create-tax-category"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button
            onClick={() => setIsCreateTaxDialogOpen(true)}
            size="sm"
            data-testid="create-tax"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Tax
          </Button>
        </div>
      </div>

      {/* Tax Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : stats.totalTaxes || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Taxes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : stats.activeTaxes || 0}
                </div>
                <div className="text-xs text-muted-foreground">Active Taxes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <IndianRupee className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : `₹${stats.totalCollected || 0}`}
                </div>
                <div className="text-xs text-muted-foreground">Total Collected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Percent className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? <Skeleton className="h-6 w-12" /> : `${stats.averageRate || 0}%`}
                </div>
                <div className="text-xs text-muted-foreground">Average Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Management Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="taxes" data-testid="taxes-subtab">
            <Calculator className="w-4 h-4 mr-2" />
            Taxes
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="categories-subtab">
            <Folder className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="calculator" data-testid="calculator-subtab">
            <FileBarChart className="w-4 h-4 mr-2" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="analytics-subtab">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Taxes Tab Content */}
        <TabsContent value="taxes" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search taxes by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="tax-search"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40" data-testid="category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: ServiceCategory) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32" data-testid="type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedTaxes.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedTaxes.length} taxes selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkActivate}
                data-testid="bulk-activate"
              >
                <Zap className="w-4 h-4 mr-2" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDeactivate}
                data-testid="bulk-deactivate"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deactivate
              </Button>
            </div>
          )}

          {/* Taxes Table */}
          <Card>
            <CardContent className="p-0">
              {taxesLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedTaxes.length === filteredTaxes.length && filteredTaxes.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTaxes(filteredTaxes.map((tax: Tax) => tax.id));
                            } else {
                              setSelectedTaxes([]);
                            }
                          }}
                          data-testid="select-all-taxes"
                        />
                      </TableHead>
                      <TableHead>Tax Details</TableHead>
                      <TableHead>Type & Rate</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTaxes.map((tax: Tax) => (
                      <TableRow key={tax.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTaxes.includes(tax.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTaxes([...selectedTaxes, tax.id]);
                              } else {
                                setSelectedTaxes(selectedTaxes.filter(id => id !== tax.id));
                              }
                            }}
                            data-testid={`select-tax-${tax.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{tax.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {tax.code} • {tax.displayName}
                            </div>
                            {tax.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {tax.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant={tax.type === 'percentage' ? 'default' : 'secondary'}>
                              {tax.type}
                            </Badge>
                            <div className="text-sm font-medium mt-1">
                              {tax.type === 'percentage' ? `${tax.rate}%` : `₹${tax.rate}`}
                            </div>
                            {tax.isPrimary && (
                              <Badge variant="outline" className="mt-1">Primary</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {categories.find((c: ServiceCategory) => c.id === tax.categoryId)?.name || 'Uncategorized'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tax.isActive ? 'default' : 'secondary'}>
                            {tax.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTax(tax)}
                              data-testid={`edit-tax-${tax.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteTaxMutation.mutate(tax.id)}
                              data-testid={`delete-tax-${tax.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab Content */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Tax Categories
                <Button
                  onClick={() => setIsCreateCategoryDialogOpen(true)}
                  size="sm"
                  data-testid="add-category"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category Details</TableHead>
                      <TableHead>Default Rate</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category: ServiceCategory) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{category.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Level {category.level} • {category.serviceCount || 0} services
                            </div>
                            {category.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {category.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {category.serviceCount || 0} services
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {category.sortOrder}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.isActive ? 'default' : 'secondary'}>
                            {category.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCategory(category)}
                              data-testid={`edit-category-${category.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculator Tab Content */}
        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Calculator</CardTitle>
              <p className="text-muted-foreground">
                Preview tax calculations for different order values and configurations
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preview-order-value">Order Value</Label>
                  <Input
                    id="preview-order-value"
                    type="number"
                    value={previewOrderValue}
                    onChange={(e) => setPreviewOrderValue(Number(e.target.value))}
                    min="0"
                    step="1"
                    data-testid="preview-order-value"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      // Preview calculation logic would go here
                      toast({ 
                        title: 'Calculation Preview', 
                        description: `Order value: ₹${previewOrderValue}` 
                      });
                    }}
                    data-testid="calculate-preview"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Calculation Results</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Base Amount:</span>
                      <span className="font-medium ml-2">₹{previewOrderValue}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tax Amount:</span>
                      <span className="font-medium ml-2">₹0.00</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-medium ml-2">₹{previewOrderValue}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effective Rate:</span>
                      <span className="font-medium ml-2">0.00%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab Content */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Collection Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Taxes Collected</span>
                    <span className="font-bold text-lg">₹{stats.totalCollected || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Tax Rate</span>
                    <span className="font-bold text-lg">{stats.averageRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Tax Rules</span>
                    <span className="font-bold text-lg">{stats.activeTaxes || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Categories</span>
                    <span className="font-bold text-lg">{categoryStats.totalCategories || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Categories</span>
                    <span className="font-bold text-lg">{categoryStats.activeCategories || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Most Used Category</span>
                    <span className="font-bold text-lg">
                      {categoryStats.mostUsedCategory?.name || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Tax Dialog */}
      <Dialog open={isCreateTaxDialogOpen} onOpenChange={setIsCreateTaxDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tax</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-name">Tax Name *</Label>
                <Input
                  id="tax-name"
                  value={taxForm.name || ''}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  placeholder="e.g., GST, VAT, Service Tax"
                  data-testid="tax-name-input"
                />
              </div>
              
              <div>
                <Label htmlFor="tax-code">Tax Code *</Label>
                <Input
                  id="tax-code"
                  value={taxForm.code || ''}
                  onChange={(e) => setTaxForm({ ...taxForm, code: e.target.value })}
                  placeholder="e.g., GST18, VAT12"
                  data-testid="tax-code-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tax-description">Description</Label>
              <Textarea
                id="tax-description"
                value={taxForm.description || ''}
                onChange={(e) => setTaxForm({ ...taxForm, description: e.target.value })}
                placeholder="Brief description of the tax"
                data-testid="tax-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-type">Tax Type *</Label>
                <Select 
                  value={taxForm.type || 'percentage'} 
                  onValueChange={(value) => setTaxForm({ ...taxForm, type: value as any })}
                >
                  <SelectTrigger data-testid="tax-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="tiered">Tiered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tax-rate">
                  {taxForm.type === 'percentage' ? 'Rate (%)' : 'Amount (₹)'} *
                </Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={taxForm.rate || 0}
                  onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                  min="0"
                  step={taxForm.type === 'percentage' ? '0.01' : '1'}
                  data-testid="tax-rate-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tax-category">Category</Label>
              <Select 
                value={taxForm.categoryId || ''} 
                onValueChange={(value) => setTaxForm({ ...taxForm, categoryId: value })}
              >
                <SelectTrigger data-testid="tax-category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: ServiceCategory) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-order-value">Minimum Order Value</Label>
                <Input
                  id="min-order-value"
                  type="number"
                  value={taxForm.minOrderValue || 0}
                  onChange={(e) => setTaxForm({ ...taxForm, minOrderValue: e.target.value })}
                  min="0"
                  data-testid="min-order-value-input"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={taxForm.priority || 1}
                  onChange={(e) => setTaxForm({ ...taxForm, priority: Number(e.target.value) })}
                  min="1"
                  data-testid="priority-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={!!taxForm.isActive}
                  onCheckedChange={(checked) => setTaxForm({ ...taxForm, isActive: checked })}
                  data-testid="is-active-switch"
                />
                <Label htmlFor="is-active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-primary"
                  checked={!!taxForm.isPrimary}
                  onCheckedChange={(checked) => setTaxForm({ ...taxForm, isPrimary: checked })}
                  data-testid="is-primary-switch"
                />
                <Label htmlFor="is-primary">Primary Tax</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="combinable"
                  checked={!!taxForm.combinable}
                  onCheckedChange={(checked) => setTaxForm({ ...taxForm, combinable: checked })}
                  data-testid="combinable-switch"
                />
                <Label htmlFor="combinable">Combinable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="location-based"
                  checked={!!taxForm.locationBased}
                  onCheckedChange={(checked) => setTaxForm({ ...taxForm, locationBased: checked })}
                  data-testid="location-based-switch"
                />
                <Label htmlFor="location-based">Location Based</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateTaxDialogOpen(false);
                resetTaxForm();
              }}
              data-testid="cancel-create-tax"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createTaxMutation.mutate(taxForm as InsertTax)}
              disabled={!taxForm.name || !taxForm.code || createTaxMutation.isPending}
              data-testid="save-create-tax"
            >
              {createTaxMutation.isPending ? 'Creating...' : 'Create Tax'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tax Dialog */}
      <Dialog open={isEditTaxDialogOpen} onOpenChange={setIsEditTaxDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tax: {selectedTax?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-tax-name">Tax Name *</Label>
                <Input
                  id="edit-tax-name"
                  value={taxForm.name || ''}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  placeholder="e.g., GST, VAT, Service Tax"
                  data-testid="edit-tax-name-input"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-tax-code">Tax Code *</Label>
                <Input
                  id="edit-tax-code"
                  value={taxForm.code || ''}
                  onChange={(e) => setTaxForm({ ...taxForm, code: e.target.value })}
                  placeholder="e.g., GST18, VAT12"
                  data-testid="edit-tax-code-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-tax-description">Description</Label>
              <Textarea
                id="edit-tax-description"
                value={taxForm.description || ''}
                onChange={(e) => setTaxForm({ ...taxForm, description: e.target.value })}
                placeholder="Brief description of the tax"
                data-testid="edit-tax-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-tax-type">Tax Type *</Label>
                <Select 
                  value={taxForm.type || 'percentage'} 
                  onValueChange={(value) => setTaxForm({ ...taxForm, type: value as any })}
                >
                  <SelectTrigger data-testid="edit-tax-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="tiered">Tiered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-tax-rate">
                  {taxForm.type === 'percentage' ? 'Rate (%)' : 'Amount (₹)'} *
                </Label>
                <Input
                  id="edit-tax-rate"
                  type="number"
                  value={taxForm.rate || 0}
                  onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                  min="0"
                  step={taxForm.type === 'percentage' ? '0.01' : '1'}
                  data-testid="edit-tax-rate-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-active"
                  checked={!!taxForm.isActive}
                  onCheckedChange={(checked) => setTaxForm({ ...taxForm, isActive: checked })}
                  data-testid="edit-is-active-switch"
                />
                <Label htmlFor="edit-is-active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-primary"
                  checked={!!taxForm.isPrimary}
                  onCheckedChange={(checked) => setTaxForm({ ...taxForm, isPrimary: checked })}
                  data-testid="edit-is-primary-switch"
                />
                <Label htmlFor="edit-is-primary">Primary Tax</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditTaxDialogOpen(false);
                setSelectedTax(null);
                resetTaxForm();
              }}
              data-testid="cancel-edit-tax"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTax) {
                  updateTaxMutation.mutate({ id: selectedTax.id, taxData: taxForm });
                }
              }}
              disabled={!taxForm.name || !taxForm.code || updateTaxMutation.isPending}
              data-testid="save-edit-tax"
            >
              {updateTaxMutation.isPending ? 'Updating...' : 'Update Tax'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryDialogOpen} onOpenChange={setIsCreateCategoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Tax Category</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Service Tax, Goods Tax"
                data-testid="category-name-input"
              />
            </div>

            <div>
              <Label htmlFor="category-code">Category Code *</Label>
              <Input
                id="category-code"
                value={categoryForm.slug || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="e.g., SVC, GOODS"
                data-testid="category-code-input"
              />
            </div>

            <div>
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of the category"
                data-testid="category-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sort-order">Sort Order</Label>
                <Input
                  id="default-rate"
                  type="number"
                  value={categoryForm.sortOrder || 0}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                  min="0"
                  max="100"
                  step="0.01"
                  data-testid="default-rate-input"
                />
              </div>

              <div>
                <Label htmlFor="category-priority">Priority</Label>
                <Input
                  id="category-priority"
                  type="number"
                  value={categoryForm.sortOrder || 0}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                  min="1"
                  data-testid="category-priority-input"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="category-active"
                checked={!!categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                data-testid="category-active-switch"
              />
              <Label htmlFor="category-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateCategoryDialogOpen(false);
                resetCategoryForm();
              }}
              data-testid="cancel-create-category"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createCategoryMutation.mutate(categoryForm as InsertServiceCategory)}
              disabled={!categoryForm.name || !categoryForm.slug || createCategoryMutation.isPending}
              data-testid="save-create-category"
            >
              {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Category: {selectedCategory?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name *</Label>
              <Input
                id="edit-category-name"
                value={categoryForm.name || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Service Tax, Goods Tax"
                data-testid="edit-category-name-input"
              />
            </div>

            <div>
              <Label htmlFor="edit-category-description">Description</Label>
              <Textarea
                id="edit-category-description"
                value={categoryForm.description || ''}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of the category"
                data-testid="edit-category-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-default-rate">Default Rate (%)</Label>
                <Input
                  id="edit-default-rate"
                  type="number"
                  value={categoryForm.sortOrder || 0}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                  min="0"
                  max="100"
                  step="0.01"
                  data-testid="edit-default-rate-input"
                />
              </div>

              <div>
                <Label htmlFor="edit-category-priority">Priority</Label>
                <Input
                  id="edit-category-priority"
                  type="number"
                  value={categoryForm.sortOrder || 0}
                  onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                  min="1"
                  data-testid="edit-category-priority-input"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-category-active"
                checked={!!categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
                data-testid="edit-category-active-switch"
              />
              <Label htmlFor="edit-category-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditCategoryDialogOpen(false);
                setSelectedCategory(null);
                resetCategoryForm();
              }}
              data-testid="cancel-edit-category"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCategory) {
                  // Update category mutation would go here
                  toast({ title: 'Category updated successfully' });
                  setIsEditCategoryDialogOpen(false);
                  setSelectedCategory(null);
                  resetCategoryForm();
                }
              }}
              disabled={!categoryForm.name || !categoryForm.slug}
              data-testid="save-edit-category"
            >
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Transform form data for API submission
const transformCouponData = (formData: CouponFormData): any => {
  return {
    code: formData.code || '',
    title: formData.title || '',
    description: formData.description || null,
    type: formData.type,
    value: formData.value || '0',
    maxDiscountAmount: formData.maxDiscountAmount || null,
    minOrderAmount: formData.minOrderAmount || null,
    validFrom: formData.validFrom || '',
    validUntil: formData.validUntil || '',
    usageLimit: formData.usageLimit || null,
    maxUsagePerUser: formData.maxUsagePerUser || null,
    isActive: formData.isActive,
    createdBy: formData.createdBy || '',
    serviceCategoryIds: formData.serviceCategoryIds || [],
    applicableOn: formData.applicableOn || '',
    stackable: formData.stackable || false,
    autoDeactivate: formData.autoDeactivate || false
  };
};

// Comprehensive Coupon Management System Component
const CouponManagementSystem = () => {
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState<CouponFormData>({
    type: 'percentage',
    isActive: true,
    usageLimit: null,
    maxUsagePerUser: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch coupons with filters
  const { data: couponsData, isLoading: couponsLoading } = useQuery({
    queryKey: ['admin-coupons', {
      search: searchTerm,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      type: typeFilter === 'all' ? undefined : typeFilter,
      limit: 20,
      offset: (currentPage - 1) * 20
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '20');
      params.append('offset', ((currentPage - 1) * 20).toString());
      
      return apiRequest('GET', `/api/v1/admin/coupons?${params.toString()}`);
    }
  });
  
  // Fetch coupon statistics
  const { data: statisticsData } = useQuery({
    queryKey: ['admin-coupon-statistics'],
    queryFn: () => apiRequest('GET', '/api/v1/admin/coupons/statistics')
  });
  
  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: (couponData: CouponFormData) => {
      const transformedData = transformCouponData(couponData);
      return apiRequest('POST', '/api/v1/admin/coupons', transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-statistics'] });
      setIsCreateDialogOpen(false);
      setCouponForm({
        type: 'percentage',
        isActive: true,
        usageLimit: null,
        maxUsagePerUser: null,
        minOrderAmount: null,
        maxDiscountAmount: null,
      });
      toast({
        title: "Success",
        description: "Coupon created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    }
  });
  
  // Update coupon mutation
  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CouponFormData }) => {
      const transformedData = transformCouponData(data);
      return apiRequest('PUT', `/api/v1/admin/coupons/${id}`, transformedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-statistics'] });
      setIsEditDialogOpen(false);
      setSelectedCoupon(null);
      setCouponForm({
        type: 'percentage',
        isActive: true,
        usageLimit: null,
        maxUsagePerUser: null,
        minOrderAmount: null,
        maxDiscountAmount: null,
      });
      toast({
        title: "Success",
        description: "Coupon updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
      });
    }
  });
  
  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: (couponId: string) =>
      apiRequest('DELETE', `/api/v1/admin/coupons/${couponId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-statistics'] });
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coupon",
        variant: "destructive",
      });
    }
  });
  
  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { couponIds: string[]; updates: { isActive?: boolean } }) =>
      apiRequest('POST', '/api/v1/admin/coupons/bulk-update', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-statistics'] });
      setSelectedCoupons([]);
      toast({
        title: "Success",
        description: "Coupons updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupons",
        variant: "destructive",
      });
    }
  });
  
  // Generate coupon code
  const generateCodeMutation = useMutation({
    mutationFn: (pattern?: string) =>
      apiRequest('POST', '/api/v1/admin/coupons/generate-code', { pattern }),
    onSuccess: (data: any) => {
      setCouponForm(prev => ({ ...prev, code: data.code }));
    }
  });
  
  const handleCreateCoupon = async () => {
    if (!couponForm.code || !couponForm.title || !couponForm.value || !couponForm.validFrom || !couponForm.validUntil) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createCouponMutation.mutate(transformCouponData(couponForm));
  };
  
  const handleUpdateCoupon = async () => {
    if (!selectedCoupon?.id) return;
    updateCouponMutation.mutate({ id: selectedCoupon.id, data: transformCouponData(couponForm) });
  };
  
  const handleDeleteCoupon = (couponId: string) => {
    if (window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      deleteCouponMutation.mutate(couponId);
    }
  };
  
  const handleBulkActivate = () => {
    if (selectedCoupons.length === 0) return;
    bulkUpdateMutation.mutate({
      couponIds: selectedCoupons,
      updates: { isActive: true }
    });
  };
  
  const handleBulkDeactivate = () => {
    if (selectedCoupons.length === 0) return;
    bulkUpdateMutation.mutate({
      couponIds: selectedCoupons,
      updates: { isActive: false }
    });
  };
  
  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || '',
      type: coupon.type as 'percentage' | 'fixed_amount',
      value: coupon.value.toString(),
      maxDiscountAmount: coupon.maxDiscountAmount ? coupon.maxDiscountAmount.toString() : null,
      minOrderAmount: coupon.minOrderAmount ? coupon.minOrderAmount.toString() : null,
      validFrom: new Date(coupon.validFrom).toISOString().split('T')[0],
      validUntil: new Date(coupon.validUntil).toISOString().split('T')[0],
      usageLimit: coupon.usageLimit,
      maxUsagePerUser: coupon.maxUsagePerUser,
      isActive: coupon.isActive !== null ? coupon.isActive : true,
    });
    setIsEditDialogOpen(true);
  };
  
  const resetForm = () => {
    setCouponForm({
      type: 'percentage',
      isActive: true,
      usageLimit: null,
      maxUsagePerUser: null,
      minOrderAmount: null,
      maxDiscountAmount: null,
    });
    setSelectedCoupon(null);
  };
  
  const statistics = statisticsData?.data;
  const coupons = couponsData?.data || [];
  const totalCoupons = couponsData?.total || 0;
  
  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="coupon-stats-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
            <TicketPercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalCoupons || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statistics?.activeCoupons || 0} active
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="coupon-stats-usage">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalUsage || 0}</div>
            <p className="text-xs text-muted-foreground">
              Coupon applications
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="coupon-stats-savings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statistics?.totalSavings?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Customer savings
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="coupon-stats-expired">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.expiredCoupons || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need cleanup
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Coupon Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage discount coupons for your platform
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="create-coupon-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </div>
      
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-2 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search coupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                  data-testid="coupon-search-input"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32" data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedCoupons.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkActivate}
                  disabled={bulkUpdateMutation.isPending}
                  data-testid="bulk-activate-button"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Activate ({selectedCoupons.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDeactivate}
                  disabled={bulkUpdateMutation.isPending}
                  data-testid="bulk-deactivate-button"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Deactivate ({selectedCoupons.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {couponsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <TicketPercent className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold">No Coupons Found</h3>
              <p className="text-gray-600">Create your first coupon to get started</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCoupons.length === coupons.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCoupons(coupons.map((c: any) => c.id));
                          } else {
                            setSelectedCoupons([]);
                          }
                        }}
                        data-testid="select-all-coupons"
                      />
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon: any) => {
                    const isExpired = new Date(coupon.validUntil) < new Date();
                    const usagePercentage = coupon.usageLimit ? 
                      (coupon.usageCount / coupon.usageLimit) * 100 : 0;
                    
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCoupons.includes(coupon.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCoupons(prev => [...prev, coupon.id]);
                              } else {
                                setSelectedCoupons(prev => prev.filter(id => id !== coupon.id));
                              }
                            }}
                            data-testid={`select-coupon-${coupon.code}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center space-x-2">
                            <span>{coupon.code}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(coupon.code);
                                toast({
                                  title: "Copied!",
                                  description: "Coupon code copied to clipboard",
                                });
                              }}
                              data-testid={`copy-coupon-${coupon.code}`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{coupon.title}</div>
                            {coupon.description && (
                              <div className="text-sm text-gray-500 truncate max-w-32">
                                {coupon.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.type === 'percentage' ? 'default' : 'secondary'}>
                            {coupon.type === 'percentage' ? 'Percentage' : 'Fixed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {coupon.type === 'percentage' ? 
                            `${coupon.value}%` : 
                            `₹${parseFloat(coupon.value.toString()).toLocaleString()}`}
                          {coupon.maxDiscountAmount && coupon.type === 'percentage' && (
                            <div className="text-xs text-gray-500">
                              Max: ₹{parseFloat(coupon.maxDiscountAmount.toString()).toLocaleString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {coupon.usageCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ''}
                            </div>
                            {coupon.usageLimit && (
                              <Progress value={usagePercentage} className="w-16 h-1" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(coupon.validUntil), 'MMM dd, yyyy')}
                            {isExpired && (
                              <Badge variant="destructive" className="ml-2">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={coupon.isActive ? 'default' : 'secondary'}
                              className={coupon.isActive ? 'bg-green-100 text-green-800' : ''}
                            >
                              {coupon.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {isExpired && <Badge variant="outline">Expired</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCoupon(coupon)}
                              data-testid={`edit-coupon-${coupon.code}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`delete-coupon-${coupon.code}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalCoupons > 20 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCoupons)} of {totalCoupons} coupons
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage * 20 >= totalCoupons}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Create Coupon Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coupon-code">Coupon Code *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="coupon-code"
                    value={couponForm.code || ''}
                    onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Enter or generate code"
                    data-testid="create-coupon-code-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateCodeMutation.mutate('SAVE###')}
                    disabled={generateCodeMutation.isPending}
                    data-testid="generate-coupon-code-button"
                  >
                    {generateCodeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="coupon-title">Title *</Label>
                <Input
                  id="coupon-title"
                  value={couponForm.title || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter coupon title"
                  data-testid="create-coupon-title-input"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="coupon-description">Description</Label>
              <Textarea
                id="coupon-description"
                value={couponForm.description || ''}
                onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter coupon description"
                rows={3}
                data-testid="create-coupon-description-input"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select 
                  value={couponForm.type} 
                  onValueChange={(value: 'percentage' | 'fixed_amount') => 
                    setCouponForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger data-testid="create-coupon-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="coupon-value">
                  {couponForm.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *
                </Label>
                <Input
                  id="coupon-value"
                  type="number"
                  value={couponForm.value || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, value: e.target.value || '0' }))}
                  placeholder="0"
                  min="0"
                  max={couponForm.type === 'percentage' ? '100' : undefined}
                  data-testid="create-coupon-value-input"
                />
              </div>
              
              {couponForm.type === 'percentage' && (
                <div>
                  <Label htmlFor="max-discount">Max Discount (₹)</Label>
                  <Input
                    id="max-discount"
                    type="number"
                    value={couponForm.maxDiscountAmount || ''}
                    onChange={(e) => setCouponForm(prev => ({ 
                      ...prev, 
                      maxDiscountAmount: e.target.value || null 
                    }))}
                    placeholder="No limit"
                    min="0"
                    data-testid="create-coupon-max-discount-input"
                  />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid-from">Valid From *</Label>
                <Input
                  id="valid-from"
                  type="date"
                  value={couponForm.validFrom || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, validFrom: e.target.value }))}
                  data-testid="create-coupon-valid-from-input"
                />
              </div>
              
              <div>
                <Label htmlFor="valid-until">Valid Until *</Label>
                <Input
                  id="valid-until"
                  type="date"
                  value={couponForm.validUntil || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, validUntil: e.target.value }))}
                  data-testid="create-coupon-valid-until-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="usage-limit">Usage Limit</Label>
                <Input
                  id="usage-limit"
                  type="number"
                  value={couponForm.usageLimit || ''}
                  onChange={(e) => setCouponForm(prev => ({ 
                    ...prev, 
                    usageLimit: parseInt(e.target.value) || null 
                  }))}
                  placeholder="Unlimited"
                  min="1"
                  data-testid="create-coupon-usage-limit-input"
                />
              </div>
              
              <div>
                <Label htmlFor="max-usage-per-user">Max Per User</Label>
                <Input
                  id="max-usage-per-user"
                  type="number"
                  value={couponForm.maxUsagePerUser || ''}
                  onChange={(e) => setCouponForm(prev => ({ 
                    ...prev, 
                    maxUsagePerUser: parseInt(e.target.value) || null 
                  }))}
                  placeholder="Unlimited"
                  min="1"
                  data-testid="create-coupon-max-per-user-input"
                />
              </div>
              
              <div>
                <Label htmlFor="min-order-amount">Min Order (₹)</Label>
                <Input
                  id="min-order-amount"
                  type="number"
                  value={couponForm.minOrderAmount || ''}
                  onChange={(e) => setCouponForm(prev => ({ 
                    ...prev, 
                    minOrderAmount: e.target.value || null 
                  }))}
                  placeholder="No minimum"
                  min="0"
                  data-testid="create-coupon-min-order-input"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-active"
                checked={!!couponForm.isActive}
                onCheckedChange={(checked) => setCouponForm(prev => ({ ...prev, isActive: !!checked }))}
                data-testid="create-coupon-active-checkbox"
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              data-testid="cancel-create-coupon"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCoupon}
              disabled={createCouponMutation.isPending}
              data-testid="confirm-create-coupon"
            >
              {createCouponMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Coupon'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Coupon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-coupon-code">Coupon Code *</Label>
                <Input
                  id="edit-coupon-code"
                  value={couponForm.code || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter coupon code"
                  data-testid="edit-coupon-code-input"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-coupon-title">Title *</Label>
                <Input
                  id="edit-coupon-title"
                  value={couponForm.title || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter coupon title"
                  data-testid="edit-coupon-title-input"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-coupon-description">Description</Label>
              <Textarea
                id="edit-coupon-description"
                value={couponForm.description || ''}
                onChange={(e) => setCouponForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter coupon description"
                rows={3}
                data-testid="edit-coupon-description-input"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select 
                  value={couponForm.type} 
                  onValueChange={(value: 'percentage' | 'fixed_amount') => 
                    setCouponForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger data-testid="edit-coupon-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-coupon-value">
                  {couponForm.type === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} *
                </Label>
                <Input
                  id="edit-coupon-value"
                  type="number"
                  value={couponForm.value || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, value: e.target.value || '0' }))}
                  placeholder="0"
                  min="0"
                  max={couponForm.type === 'percentage' ? '100' : undefined}
                  data-testid="edit-coupon-value-input"
                />
              </div>
              
              {couponForm.type === 'percentage' && (
                <div>
                  <Label htmlFor="edit-max-discount">Max Discount (₹)</Label>
                  <Input
                    id="edit-max-discount"
                    type="number"
                    value={couponForm.maxDiscountAmount || ''}
                    onChange={(e) => setCouponForm(prev => ({ 
                      ...prev, 
                      maxDiscountAmount: e.target.value || null 
                    }))}
                    placeholder="No limit"
                    min="0"
                    data-testid="edit-coupon-max-discount-input"
                  />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-valid-from">Valid From *</Label>
                <Input
                  id="edit-valid-from"
                  type="date"
                  value={couponForm.validFrom || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, validFrom: e.target.value }))}
                  data-testid="edit-coupon-valid-from-input"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-valid-until">Valid Until *</Label>
                <Input
                  id="edit-valid-until"
                  type="date"
                  value={couponForm.validUntil || ''}
                  onChange={(e) => setCouponForm(prev => ({ ...prev, validUntil: e.target.value }))}
                  data-testid="edit-coupon-valid-until-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-usage-limit">Usage Limit</Label>
                <Input
                  id="edit-usage-limit"
                  type="number"
                  value={couponForm.usageLimit || ''}
                  onChange={(e) => setCouponForm(prev => ({ 
                    ...prev, 
                    usageLimit: parseInt(e.target.value) || null 
                  }))}
                  placeholder="Unlimited"
                  min="1"
                  data-testid="edit-coupon-usage-limit-input"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-max-usage-per-user">Max Per User</Label>
                <Input
                  id="edit-max-usage-per-user"
                  type="number"
                  value={couponForm.maxUsagePerUser || ''}
                  onChange={(e) => setCouponForm(prev => ({ 
                    ...prev, 
                    maxUsagePerUser: parseInt(e.target.value) || null 
                  }))}
                  placeholder="Unlimited"
                  min="1"
                  data-testid="edit-coupon-max-per-user-input"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-min-order-amount">Min Order (₹)</Label>
                <Input
                  id="edit-min-order-amount"
                  type="number"
                  value={couponForm.minOrderAmount || ''}
                  onChange={(e) => setCouponForm(prev => ({ 
                    ...prev, 
                    minOrderAmount: e.target.value || null 
                  }))}
                  placeholder="No minimum"
                  min="0"
                  data-testid="edit-coupon-min-order-input"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is-active"
                checked={!!couponForm.isActive}
                onCheckedChange={(checked) => setCouponForm(prev => ({ ...prev, isActive: !!checked }))}
                data-testid="edit-coupon-active-checkbox"
              />
              <Label htmlFor="edit-is-active">Active</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
              data-testid="cancel-edit-coupon"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCoupon}
              disabled={updateCouponMutation.isPending}
              data-testid="confirm-edit-coupon"
            >
              {updateCouponMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Update Coupon'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Enhanced interfaces for comprehensive admin functionality
interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  totalProviders: number;
  pendingVerifications: number;
  activeDisputes: number;
  monthlyGrowth: number;
  totalServices: number;
  totalParts: number;
  activeServiceProviders: number;
  activePartsProviders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  customerRetentionRate: number;
  providerSatisfactionScore: number;
  systemUptime: number;
}

interface RevenueAnalytics {
  daily: Array<{ date: string; revenue: number; orders: number }>;
  weekly: Array<{ week: string; revenue: number; orders: number }>;
  monthly: Array<{ month: string; revenue: number; orders: number }>;
  byCategory: Array<{ category: string; revenue: number; percentage: number }>;
  byProvider: Array<{ providerId: string; providerName: string; revenue: number; orders: number }>;
}

interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  errorRate: number;
  uptime: number;
}

interface KPIMetrics {
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  monthlyRecurringRevenue: number;
  churnRate: number;
  netPromoterScore: number;
  averageServiceRating: number;
  orderFulfillmentTime: number;
  firstResponseTime: number;
}

interface User {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  profileImageUrl?: string;
  role: 'user' | 'service_provider' | 'parts_provider' | 'admin';
  isVerified: boolean;
  walletBalance: number;
  fixiPoints: number;
  location?: {
    address: string;
    latitude: number;
    longitude: number;
    city: string;
    pincode: string;
  };
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  lastActive: string;
  status: 'active' | 'suspended' | 'pending';
  totalOrders?: number;
  totalSpent?: number;
  averageRating?: number;
  registrationSource?: string;
}

interface Order {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  type: 'service' | 'parts';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  serviceId?: string;
  serviceName?: string;
  providerId?: string;
  providerName?: string;
  categoryId?: string;
  categoryName?: string;
  totalAmount: number;
  platformFee: number;
  providerEarnings: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  scheduledAt?: string;
  completedAt?: string;
  address?: {
    street: string;
    city: string;
    pincode: string;
    latitude: number;
    longitude: number;
  };
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  ratings?: {
    customerRating?: number;
    providerRating?: number;
    customerReview?: string;
    providerReview?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Verification {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  type: 'service_provider' | 'parts_provider';
  documents: {
    aadhar?: { front?: string; back?: string; verified?: boolean };
    pan?: { url?: string; verified?: boolean };
    photo?: { url?: string; verified?: boolean };
    businessLicense?: { url?: string; verified?: boolean };
    gst?: { url?: string; number?: string; verified?: boolean };
    insurance?: { url?: string; verified?: boolean };
    bankDetails?: { accountNumber?: string; ifsc?: string; verified?: boolean };
    certificates?: Array<{ url: string; name: string; verified?: boolean }>;
    licenses?: Array<{ url: string; name: string; verified?: boolean }>;
    portfolio?: Array<{ url: string; caption?: string }>;
  };
  businessInfo?: {
    businessName: string;
    businessType: 'individual' | 'company' | 'partnership';
    experience: number;
    serviceRadius: number;
    specializations: string[];
    workingHours: string;
    emergencyServices: boolean;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high';
}

interface ProviderApplication {
  id: string;
  userId: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  experience: number;
  serviceRadius: number;
  priceRange: string;
  emergencyServices: boolean;
  serviceCategories: string[];
  skills: string[];
  specializations: string[];
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  verificationDate?: string;
  verificationNotes?: string;
  adminNotes?: string;
  documents?: {
    aadhar?: { front?: string; back?: string; verified?: boolean };
    photo?: { url?: string; verified?: boolean };
    businessLicense?: { url?: string; verified?: boolean };
    insurance?: { url?: string; verified?: boolean };
    certificates?: Array<{ url: string; name: string; verified?: boolean }>;
    licenses?: Array<{ url: string; name: string; verified?: boolean }>;
    portfolio?: Array<{ url: string; caption?: string }>;
  };
  createdAt: string;
  submittedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  commissionRate: number;
  averagePricing?: {
    min: number;
    max: number;
    currency: string;
  };
  popularityScore: number;
  totalBookings: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
  subCategoriesCount?: number;
  servicesCount?: number;
  activeProvidersCount?: number;
  hasChildren?: boolean;
  children?: Category[];
  metadata?: {
    color?: string;
    tags?: string[];
    featured?: boolean;
    trending?: boolean;
  };
}

// Using proper Service type from shared/schema.ts which includes iconType and iconValue

interface SystemConfig {
  id: string;
  category: 'general' | 'payment' | 'notification' | 'commission' | 'security';
  key: string;
  value: any;
  description?: string;
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'array';
  isEditable: boolean;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface NotificationTemplate {
  id: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  name: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  category: 'order' | 'payment' | 'user' | 'provider' | 'system';
  trigger: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'service' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedBy?: string;
  tags?: string[];
  attachments?: string[];
  responses: Array<{
    id: string;
    userId: string;
    userName: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
  }>;
  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    resolution: string;
    satisfactionRating?: number;
  };
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  lastActivityAt: string;
}

// Enhanced component interfaces
interface ProviderVerificationCardProps {
  provider: ProviderApplication;
  onStatusChange: (providerId: string, status: 'under_review' | 'approved' | 'rejected', notes?: string) => void;
  isUpdating: boolean;
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<any>;
  description?: string;
  loading?: boolean;
}

interface ChartDataPoint {
  name: string;
  value: number;
  change?: number;
  color?: string;
}

interface FilterOptions {
  dateRange: {
    start: Date;
    end: Date;
  };
  category?: string;
  provider?: string;
  status?: string;
  role?: string;
  region?: string;
}

interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: (selectedIds: string[]) => Promise<void>;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
  disabled?: boolean;
}

// Enhanced Dashboard Card Component
const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  description, 
  loading 
}) => {
  const getChangeColor = (type?: string) => {
    switch (type) {
      case 'increase': return 'text-green-600';
      case 'decrease': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getChangeIcon = (type?: string) => {
    switch (type) {
      case 'increase': return <ArrowUp className="w-3 h-3" />;
      case 'decrease': return <ArrowDown className="w-3 h-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center space-x-1 text-xs ${getChangeColor(changeType)}`}>
                {getChangeIcon(changeType)}
                <span>{Math.abs(change)}%</span>
                <span className="text-muted-foreground">vs last period</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Provider Verification Card Component
const ProviderVerificationCard: React.FC<ProviderVerificationCardProps> = ({ 
  provider, 
  onStatusChange, 
  isUpdating 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(provider.adminNotes || '');
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'suspended':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const handleStatusChangeWithNotes = (status: 'approve' | 'reject') => {
    setActionType(status);
    setShowNotesDialog(true);
  };

  const confirmStatusChange = () => {
    if (actionType) {
      // Convert action to status for API call
      const statusMapping: Record<'approve' | 'reject', 'approved' | 'rejected'> = {
        'approve': 'approved',
        'reject': 'rejected'
      };
      onStatusChange(provider.userId, statusMapping[actionType], notes);
      setShowNotesDialog(false);
      setActionType(null);
    }
  };

  const hasRequiredDocuments = () => {
    return provider.documents?.aadhar?.front && 
           provider.documents?.aadhar?.back && 
           provider.documents?.photo?.url;
  };

  return (
    <Card className={`${provider.verificationStatus === 'pending' ? 'border-yellow-300 shadow-yellow-100' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-semibold text-foreground">{provider.businessName}</h3>
              <Badge className={getStatusColor(provider.verificationStatus)}>
                {provider.verificationStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{provider.contactPerson}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span className="truncate">{provider.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{provider.phone}</span>
              </div>
            </div>
            {!hasRequiredDocuments() && (
              <Alert className="mt-3">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  Missing required documents: Aadhar card and photo required for verification.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              Applied: {new Date(provider.submittedAt).toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              data-testid={`toggle-provider-${provider.id}`}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <Tabs defaultValue="business" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="business">Business Info</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
                    <p className="capitalize">{provider.businessType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                    <p>{provider.experience} years</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Service Radius</Label>
                    <p>{provider.serviceRadius} km</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Price Range</Label>
                    <p className="capitalize">{provider.priceRange}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Emergency Services</Label>
                    <p>{provider.emergencyServices ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Business Description</Label>
                  <p className="mt-1 text-sm leading-6">{provider.description}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Service Categories</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {provider.serviceCategories?.map((category, index) => (
                      <Badge key={index} variant="outline">{category}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {provider.skills?.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
                {provider.specializations && provider.specializations.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Specializations</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {provider.specializations.map((spec, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <div className="space-y-6">
                {/* Required Documents */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Required Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DocumentPreview
                      title="Aadhaar Front"
                      url={provider.documents?.aadhar?.front}
                      verified={provider.documents?.aadhar?.verified}
                      required={true}
                    />
                    <DocumentPreview
                      title="Aadhaar Back"
                      url={provider.documents?.aadhar?.back}
                      verified={provider.documents?.aadhar?.verified}
                      required={true}
                    />
                    <DocumentPreview
                      title="Profile Photo"
                      url={provider.documents?.photo?.url}
                      verified={provider.documents?.photo?.verified}
                      required={true}
                    />
                  </div>
                </div>

                {/* Optional Documents */}
                {(provider.documents?.businessLicense?.url || provider.documents?.insurance?.url) && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Additional Documents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {provider.documents?.businessLicense?.url && (
                        <DocumentPreview
                          title="Business License"
                          url={provider.documents.businessLicense.url}
                          verified={provider.documents.businessLicense.verified}
                          required={false}
                        />
                      )}
                      {provider.documents?.insurance?.url && (
                        <DocumentPreview
                          title="Insurance Certificate"
                          url={provider.documents.insurance.url}
                          verified={provider.documents.insurance.verified}
                          required={false}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Document Status Summary */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Document Completeness</span>
                    {hasRequiredDocuments() ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="verification" className="mt-4">
              <div className="space-y-4">
                {/* Verification Status */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Current Status</span>
                    <Badge className={getStatusColor(provider.verificationStatus)}>
                      {provider.verificationStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {provider.verificationDate && (
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(provider.verificationDate).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Admin Notes */}
                {provider.adminNotes && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Admin Notes
                    </h4>
                    <p className="text-sm leading-6">{provider.adminNotes}</p>
                  </div>
                )}

                {/* Verification Actions */}
                {(provider.verificationStatus === 'pending' || provider.verificationStatus === 'under_review') && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">Verification Actions</h4>
                      
                      {!hasRequiredDocuments() && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-yellow-800">Missing Required Documents</p>
                              <p className="text-sm text-yellow-700">
                                Provider must upload all required documents before verification can be completed.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {provider.verificationStatus === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onStatusChange(provider.userId, 'under_review')}
                            disabled={isUpdating || !hasRequiredDocuments()}
                            data-testid={`review-provider-${provider.id}`}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Start Review
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChangeWithNotes('reject')}
                          disabled={isUpdating}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`reject-provider-${provider.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleStatusChangeWithNotes('approve')}
                          disabled={isUpdating || !hasRequiredDocuments()}
                          data-testid={`approve-provider-${provider.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Verification Notes Dialog */}
          <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {actionType === 'approve' ? 'Approve Provider' : 'Reject Provider'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="verification-notes">
                    {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                  </Label>
                  <Textarea
                    id="verification-notes"
                    placeholder={
                      actionType === 'approve' 
                        ? "Add any notes about the approval..." 
                        : "Please explain why this application is being rejected..."
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmStatusChange}
                    disabled={actionType === 'reject' && !notes.trim()}
                    variant={actionType === 'approve' ? 'default' : 'destructive'}
                  >
                    {actionType === 'approve' ? 'Approve Provider' : 'Reject Provider'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
};

// Enhanced Document Preview Component
interface DocumentPreviewProps {
  title: string;
  url?: string;
  verified?: boolean;
  required: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onView?: () => void;
  rejectionReason?: string;
  showActions?: boolean;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  title, 
  url, 
  verified, 
  required,
  onApprove,
  onReject, 
  onView,
  rejectionReason,
  showActions = false
}) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    if (onReject && rejectReason.trim()) {
      onReject();
      setShowRejectDialog(false);
      setRejectReason('');
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center space-x-1">
          {required && (
            <Badge variant="outline" className="text-xs">Required</Badge>
          )}
          {url ? (
            verified ? (
              <Badge className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="w-2 h-2 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                <Clock className="w-2 h-2 mr-1" />
                Pending
              </Badge>
            )
          ) : (
            <Badge className="bg-red-100 text-red-800 text-xs">
              <X className="w-2 h-2 mr-1" />
              Missing
            </Badge>
          )}
        </div>
      </div>
      
      {url ? (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView || (() => window.open(url, '_blank'))}
            className="w-full"
          >
            <Eye className="w-3 h-3 mr-1" />
            View Document
          </Button>
          
          {showActions && !verified && (
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={onApprove}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                className="flex-1"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          )}
          
          {rejectionReason && (
            <Alert className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Rejected: {rejectionReason}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="w-full h-8 bg-gray-100 rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Not uploaded</span>
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document: {title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for rejection</Label>
              <Textarea
                id="reject-reason"
                placeholder="Please provide a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

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
    imageUrl: '',
    parentId: '',
    isActive: true,
  });

  // Media management state
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [mediaFilter, setMediaFilter] = useState('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');

  // Services management state
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    categoryId: '',
    isActive: true,
    isPopular: false,
    isFeatured: false,
    basePrice: 0,
    priceType: 'fixed' as 'fixed' | 'hourly' | 'per_item',
    currency: 'INR',
    unit: 'service',
    features: [] as string[],
    requirements: [] as string[],
    iconType: 'emoji' as 'emoji' | 'image',
    iconValue: '🔧'
  });

  // Test Services management state
  const [selectedTestService, setSelectedTestService] = useState<Service | null>(null);
  const [selectedTestServices, setSelectedTestServices] = useState<string[]>([]);
  const [isCreateTestServiceOpen, setIsCreateTestServiceOpen] = useState(false);
  const [isEditTestServiceOpen, setIsEditTestServiceOpen] = useState(false);
  const [testServiceFormData, setTestServiceFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    estimatedDuration: 120,
    categoryId: '',
    isActive: true,
    icon: ''
  });

  // Redirect non-admin users (moved to useEffect to prevent infinite re-renders)
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLocation('/');
    }
  }, [user]); // Removed setLocation from dependencies as it's stable from wouter

  // Return null for non-admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Fetch admin dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/stats');
    },
    enabled: !!user,
  });

  // Fetch users
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/v1/users', searchQuery, filterRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterRole && filterRole !== 'all') params.set('role', filterRole);
      return await apiRequest('GET', `/api/v1/users?${params.toString()}`);
    },
    enabled: !!user,
  });
  const users = usersResponse?.data || usersResponse || [];

  // Fetch orders
  const { data: ordersResponse } = useQuery({
    queryKey: ['/api/v1/admin/orders'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/orders');
    },
    enabled: !!user,
  });
  const orders = ordersResponse?.data || ordersResponse || [];

  // Fetch pending verifications
  const { data: verificationsResponse } = useQuery({
    queryKey: ['/api/v1/admin/verifications/pending'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/verifications/pending');
    },
    enabled: !!user,
  });
  const verifications = (verificationsResponse as any)?.data || [];

  // Fetch all provider verifications (including approved/rejected)
  const { data: allProvidersResponse } = useQuery({
    queryKey: ['/api/v1/admin/providers'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/providers');
    },
    enabled: !!user,
  });
  const allProviders = (allProvidersResponse as any)?.data || [];

  // Fetch parts provider verifications
  const { data: partsProvidersResponse } = useQuery({
    queryKey: ['/api/v1/admin/parts-providers'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/parts-providers');
    },
    enabled: !!user,
  });
  const partsProviders = (partsProvidersResponse as any)?.data || [];

  // Fetch pending parts provider verifications
  const { data: pendingPartsProvidersResponse } = useQuery({
    queryKey: ['/api/v1/admin/parts-providers/pending'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/parts-providers/pending');
    },
    enabled: !!user,
  });
  const pendingPartsProviders = (pendingPartsProvidersResponse as any)?.data || [];

  // Fetch category hierarchy
  const { data: categoryHierarchyResponse } = useQuery({
    queryKey: ['/api/v1/service-categories', 'tree'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/categories/tree');
      return response.data || response; // Handle envelope format
    },
    enabled: !!user,
  });
  const categoryHierarchy = (categoryHierarchyResponse as any)?.data || categoryHierarchyResponse || [];

  // Fetch main categories
  const { data: mainCategoriesResponse, isLoading: mainCategoriesLoading } = useQuery({
    queryKey: ['/api/v1/service-categories', { level: 0 }],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/service-categories?level=0');
    },
    enabled: !!user,
  });
  // Memoize mainCategories to prevent infinite re-render loop
  const mainCategories = useMemo(() => {
    return (mainCategoriesResponse as any)?.data || [];
  }, [mainCategoriesResponse]);

  // Local state for drag-drop reordering (critical fix for production)
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrderRef = useRef<string[]>([]);

  // Sync local categories with React Query data
  useEffect(() => {
    if (mainCategories && !isDragging) {
      setLocalCategories(mainCategories);
    }
  }, [mainCategories, isDragging]);

  // Fetch admin services
  const { data: servicesResponse, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/v1/services'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/services');
    },
    enabled: !!user,
  });
  const services = (servicesResponse as any)?.data || [];

  // Fetch all admin categories
  const { data: adminCategoriesResponse, isLoading: adminCategoriesLoading } = useQuery({
    queryKey: ['/api/v1/service-categories', 'all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/v1/service-categories');
      return response.data || response; // Handle envelope format
    },
    enabled: !!user,
  });
  const adminCategories = (adminCategoriesResponse as any)?.data || [];

  // Fetch test services
  const { data: testServicesResponse } = useQuery({
    queryKey: ['/api/v1/admin/test-services'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/v1/admin/test-services');
    },
    enabled: !!user,
  });
  const testServices = (testServicesResponse as any)?.data || [];

  // Update user status mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      return await apiRequest('PUT', `/api/v1/admin/users/${userId}`, updates);
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
      return await apiRequest('PUT', `/api/v1/admin/users/${userId}/role`, { role });
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

  // Provider verification mutation
  const providerVerificationMutation = useMutation({
    mutationFn: async ({ providerId, status, notes }: { 
      providerId: string; 
      status: 'under_review' | 'approved' | 'rejected'; 
      notes?: string;
    }) => {
      // Map frontend status to backend action
      const actionMap: Record<string, string> = {
        'under_review': 'under_review', // Keep as is - may need backend support
        'approved': 'approve',
        'rejected': 'reject'
      };
      
      return await apiRequest('POST', `/api/v1/admin/verifications/${providerId}/status`, {
        action: actionMap[status] || status,
        notes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/verifications/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "Provider verification updated",
        description: "Provider verification status has been updated.",
      });
    },
  });

  // Parts provider verification mutation
  const partsProviderVerificationMutation = useMutation({
    mutationFn: async ({ providerId, action, notes, rejectionReason }: { 
      providerId: string; 
      action: 'approve' | 'reject' | 'under_review' | 'request_changes'; 
      notes?: string;
      rejectionReason?: string;
    }) => {
      return await apiRequest('POST', `/api/v1/admin/parts-providers/${providerId}/status`, {
        action,
        notes,
        rejectionReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/parts-providers/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/parts-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "Parts provider verification updated",
        description: "Parts provider verification status has been updated.",
      });
    },
  });

  // Parts provider bulk verification mutation
  const partsProviderBulkMutation = useMutation({
    mutationFn: async ({ providerIds, action, notes, rejectionReason }: { 
      providerIds: string[]; 
      action: 'approve' | 'reject'; 
      notes?: string;
      rejectionReason?: string;
    }) => {
      return await apiRequest('POST', `/api/v1/admin/parts-providers/bulk-action`, {
        providerIds,
        action,
        notes,
        rejectionReason,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/parts-providers/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/parts-providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/stats'] });
      toast({
        title: "Bulk operation completed",
        description: `${data?.summary?.successCount || 0} providers processed successfully`,
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
      return await apiRequest('POST', `/api/v1/admin/refund/${orderId}`, {
        amount,
        reason,
      });
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
      return await apiRequest('POST', '/api/v1/service-categories', categoryData);
    },
    onSuccess: () => {
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      // Invalidate user-facing queries for data synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories/main'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] });
      setIsCreateCategoryOpen(false);
      setCategoryFormData({ name: '', description: '', icon: '', imageUrl: '', parentId: '', isActive: true });
      toast({
        title: "Category created",
        description: "New category has been created successfully.",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, data }: { categoryId: string; data: any }) => {
      return await apiRequest('PATCH', `/api/v1/service-categories/${categoryId}`, data);
    },
    onSuccess: () => {
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      // Invalidate user-facing queries for data synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories/main'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] });
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
      // Note: Delete operations may need admin-specific endpoint for security
      return await apiRequest('DELETE', `/api/v1/admin/categories/${categoryId}`);
    },
    onSuccess: () => {
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      // Invalidate user-facing queries for data synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
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

  // Category image upload mutations
  const uploadCategoryImageMutation = useMutation({
    mutationFn: async ({ categoryId, file }: { categoryId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/v1/admin/categories/${categoryId}/image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate both admin and public category queries for consistent UX
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      // Invalidate user-facing queries for data synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] }); // May include categories
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
      toast({
        title: "Image uploaded",
        description: "Category image has been uploaded successfully.",
      });
      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload category image",
        variant: "destructive",
      });
    },
  });

  const updateCategoryImageMutation = useMutation({
    mutationFn: async ({ categoryId, imageUrl }: { categoryId: string; imageUrl: string }) => {
      return await apiRequest('PUT', `/api/v1/admin/categories/${categoryId}/image`, { imageUrl });
    },
    onSuccess: () => {
      // Invalidate both admin and public category queries for consistent UX
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      // Invalidate user-facing queries for data synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] }); // May include categories
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
      toast({
        title: "Image updated",
        description: "Category image has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update category image",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryImageMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await apiRequest('DELETE', `/api/v1/admin/categories/${categoryId}/image`);
    },
    onSuccess: () => {
      // Invalidate both admin and public category queries for consistent UX
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      // Invalidate user-facing queries for data synchronization
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] }); // May include categories
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
      toast({
        title: "Image removed",
        description: "Category image has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Remove failed",
        description: error.message || "Failed to remove category image",
        variant: "destructive",
      });
    },
  });

  const reorderCategoriesMutation = useMutation({
    mutationFn: async ({ categoryIds, startSortOrder = 0 }: { categoryIds: string[]; startSortOrder?: number }) => {
      return await apiRequest('POST', '/api/v1/admin/categories/reorder', { categoryIds, startSortOrder });
    },
    onMutate: async ({ categoryIds }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/v1/service-categories', { level: 0 }] });
      
      // Snapshot previous value for rollback
      const previousCategories = queryClient.getQueryData(['/api/v1/service-categories', { level: 0 }]);
      
      // Optimistically update categories in React Query cache
      queryClient.setQueryData(['/api/v1/service-categories', { level: 0 }], (old: Category[] = []) => {
        const reorderedCategories = categoryIds.map(id => old.find(cat => cat.id === id)).filter(Boolean) as Category[];
        return reorderedCategories;
      });
      
      return { previousCategories };
    },
    onSuccess: () => {
      // Re-fetch to ensure server state is accurate
      queryClient.invalidateQueries({ queryKey: ['/api/v1/service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/categories/tree'] });
      toast({
        title: "Categories reordered",
        description: "Category order has been updated successfully.",
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousCategories) {
        queryClient.setQueryData(['/api/v1/service-categories', { level: 0 }], context.previousCategories);
        setLocalCategories(context.previousCategories as Category[]);
      }
      toast({
        title: "Reorder failed",
        description: error.message || "Failed to reorder categories",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDragging(false);
    },
  });

  const handleUpdateUser = (userId: string, updates: any) => {
    updateUserMutation.mutate({ userId, updates });
  };

  const handleProviderVerification = (providerId: string, status: 'under_review' | 'approved' | 'rejected', notes?: string) => {
    providerVerificationMutation.mutate({ providerId, status, notes });
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
      imageUrl: category.image || '',
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

  // Category image handlers
  const handleCategoryImageUpload = async (categoryId: string, images: UploadedImage[]) => {
    if (images.length > 0) {
      const image = images[0]; // Take only the first image for categories
      try {
        // First upload the image
        const uploadResult = await uploadCategoryImageMutation.mutateAsync({ 
          categoryId, 
          file: new File([image.url], image.filename) // Pass file as expected by the mutation
        });
        
        // Then update the category with the image URL
        if (uploadResult.success && uploadResult.image?.url) {
          await updateCategoryImageMutation.mutateAsync({
            categoryId,
            imageUrl: uploadResult.image.url
          });
        }
      } catch (error) {
        console.error('Error uploading category image:', error);
      }
    }
  };

  const handleCategoryImageRemove = (categoryId: string) => {
    if (window.confirm('Are you sure you want to remove this category image?')) {
      deleteCategoryImageMutation.mutate(categoryId);
    }
  };

  // Service mutations
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      return await apiRequest('POST', '/api/v1/services', serviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] });
      setIsCreateServiceOpen(false);
      resetServiceForm();
      toast({
        title: "Service created",
        description: "New service has been created successfully.",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: string; data: any }) => {
      return await apiRequest('PATCH', `/api/v1/services/${serviceId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] });
      setIsEditServiceOpen(false);
      setSelectedService(null);
      toast({
        title: "Service updated",
        description: "Service has been updated successfully.",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      // Note: Delete operations may need admin-specific endpoint for security
      return await apiRequest('DELETE', `/api/v1/admin/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/services'] });
      toast({
        title: "Service deleted",
        description: "Service has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  // Test Services mutations
  const createDemoServicesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/v1/admin/test-services/demo');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/test-services'] });
      toast({
        title: "Demo services created",
        description: `Successfully created ${data.services?.length || 10} demo services.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create demo services",
        variant: "destructive",
      });
    },
  });

  const createTestServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      return await apiRequest('POST', '/api/v1/admin/test-services', serviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/test-services'] });
      toast({
        title: "Test service created",
        description: "New test service has been created successfully.",
      });
    },
  });

  const updateTestServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: string; data: any }) => {
      return await apiRequest('PUT', `/api/v1/admin/test-services/${serviceId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/test-services'] });
      toast({
        title: "Test service updated",
        description: "Test service has been updated successfully.",
      });
    },
  });

  const deleteTestServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return await apiRequest('DELETE', `/api/v1/admin/test-services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/test-services'] });
      toast({
        title: "Test service deleted",
        description: "Test service has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete test service",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteTestServicesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/v1/admin/test-services');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/test-services'] });
      toast({
        title: "Test services deleted",
        description: `Successfully deleted ${data.deletedCount} test services.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk delete failed",
        description: error.message || "Failed to delete test services",
        variant: "destructive",
      });
    },
  });

  const deleteSelectedTestServicesMutation = useMutation({
    mutationFn: async (serviceIds: string[]) => {
      return await apiRequest('POST', '/api/v1/admin/test-services/delete-selected', {
        serviceIds
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/test-services'] });
      setSelectedTestServices([]);
      toast({
        title: "Selected services deleted",
        description: `Successfully deleted ${data.deletedCount} test services.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete selected services",
        variant: "destructive",
      });
    },
  });

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
    setCategoryFormData({ name: '', description: '', icon: '', imageUrl: '', parentId: '', isActive: true });
    setSelectedCategory(null);
  };

  // New drag-drop implementation with drag-end detection (PRODUCTION FIX)
  const handleCategoryReorder = useCallback((newOrder: Category[]) => {
    // Update local state immediately for smooth UX (no API calls during drag)
    setLocalCategories(newOrder);
    setIsDragging(true);
    
    // Clear any existing timeout
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
    }
    
    // Set up drag-end detection with debounce
    dragEndTimeoutRef.current = setTimeout(() => {
      const categoryIds = newOrder.map(category => category.id);
      const previousOrder = lastOrderRef.current;
      
      // Only trigger mutation if order actually changed
      if (JSON.stringify(categoryIds) !== JSON.stringify(previousOrder)) {
        lastOrderRef.current = categoryIds;
        
        // Trigger mutation only once when dragging stops
        reorderCategoriesMutation.mutate({ 
          categoryIds, 
          startSortOrder: 0 
        });
      } else {
        setIsDragging(false);
      }
    }, 300); // 300ms debounce for drag-end detection
  }, [reorderCategoriesMutation]);
  
  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
      }
    };
  }, []);

  // Service handler functions
  const handleCreateService = () => {
    if (!serviceFormData.name.trim() || !serviceFormData.categoryId) {
      toast({
        title: "Validation Error",
        description: "Service name and category are required",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      ...serviceFormData,
      iconType: serviceFormData.iconType,
      iconValue: serviceFormData.iconValue,
      pricing: {
        basePrice: serviceFormData.basePrice,
        currency: serviceFormData.currency,
        unit: serviceFormData.unit,
        priceType: serviceFormData.priceType
      }
    };
    
    createServiceMutation.mutate(data);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setServiceFormData({
      name: service.name,
      description: service.description || '',
      shortDescription: service.description || '', // Use description as shortDescription fallback
      categoryId: service.categoryId || '',
      isActive: service.isActive !== null ? service.isActive : true,
      isPopular: false, // Default fallback since property doesn't exist
      isFeatured: false, // Default fallback since property doesn't exist  
      basePrice: service.basePrice ? parseFloat(service.basePrice.toString()) : 0,
      priceType: 'fixed', // Default fallback since pricing object doesn't exist
      currency: 'INR', // Default fallback
      unit: 'service', // Default fallback
      features: [], // Default fallback since property doesn't exist
      requirements: service.requirements || [],
      iconType: service.iconType || 'emoji',
      iconValue: service.iconValue || '🔧'
    });
    setIsEditServiceOpen(true);
  };

  const handleUpdateService = () => {
    if (!selectedService || !serviceFormData.name.trim() || !serviceFormData.categoryId) {
      toast({
        title: "Validation Error",
        description: "Service name and category are required",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      ...serviceFormData,
      iconType: serviceFormData.iconType,
      iconValue: serviceFormData.iconValue,
      pricing: {
        basePrice: serviceFormData.basePrice,
        currency: serviceFormData.currency,
        unit: serviceFormData.unit,
        priceType: serviceFormData.priceType
      }
    };
    
    updateServiceMutation.mutate({ serviceId: selectedService.id, data });
  };

  const handleDeleteService = (serviceId: string) => {
    if (window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      name: '',
      description: '',
      shortDescription: '',
      categoryId: '',
      isActive: true,
      isPopular: false,
      isFeatured: false,
      basePrice: 0,
      priceType: 'fixed',
      currency: 'INR',
      unit: 'service',
      features: [],
      requirements: [],
      iconType: 'emoji',
      iconValue: '🔧'
    });
    setSelectedService(null);
  };

  // Test service handler functions
  const handleCreateDemoServices = () => {
    if (testServices && testServices.length > 0) {
      if (window.confirm('Test services already exist. Creating new ones will add to existing services. Continue?')) {
        createDemoServicesMutation.mutate();
      }
    } else {
      createDemoServicesMutation.mutate();
    }
  };

  const handleCreateTestService = () => {
    if (!testServiceFormData.name.trim() || !testServiceFormData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Service name and description are required",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      name: testServiceFormData.name,
      description: testServiceFormData.description,
      basePrice: parseFloat(testServiceFormData.basePrice) || 0,
      estimatedDuration: testServiceFormData.estimatedDuration,
      categoryId: testServiceFormData.categoryId || null,
      isActive: testServiceFormData.isActive,
      icon: testServiceFormData.icon,
      allowInstantBooking: true,
      allowScheduledBooking: true,
      advanceBookingDays: 3
    };
    
    createTestServiceMutation.mutate(data);
    setIsCreateTestServiceOpen(false);
    resetTestServiceForm();
  };

  const handleEditTestService = (service: Service) => {
    setSelectedTestService(service);
    setTestServiceFormData({
      name: service.name,
      description: service.description || '',
      basePrice: service.basePrice?.toString() || '',
      estimatedDuration: service.estimatedDuration || 120,
      categoryId: service.categoryId || '',
      isActive: service.isActive || false,
      icon: service.icon || ''
    });
    setIsEditTestServiceOpen(true);
  };

  const handleUpdateTestService = () => {
    if (!selectedTestService || !testServiceFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      name: testServiceFormData.name,
      description: testServiceFormData.description,
      basePrice: parseFloat(testServiceFormData.basePrice) || 0,
      estimatedDuration: testServiceFormData.estimatedDuration,
      categoryId: testServiceFormData.categoryId || null,
      isActive: testServiceFormData.isActive,
      icon: testServiceFormData.icon
    };
    
    updateTestServiceMutation.mutate({ serviceId: selectedTestService.id, data });
    setIsEditTestServiceOpen(false);
    setSelectedTestService(null);
  };

  const handleDeleteTestService = (serviceId: string) => {
    if (window.confirm('Are you sure you want to delete this test service?')) {
      deleteTestServiceMutation.mutate(serviceId);
    }
  };

  const handleBulkDeleteTestServices = () => {
    const count = testServices?.length || 0;
    if (count === 0) {
      toast({
        title: "No services to delete",
        description: "There are no test services to delete.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete all ${count} test services? This action cannot be undone.`)) {
      bulkDeleteTestServicesMutation.mutate();
    }
  };

  const handleDeleteSelectedTestServices = () => {
    if (selectedTestServices.length === 0) {
      toast({
        title: "No services selected",
        description: "Please select services to delete.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedTestServices.length} selected test services? This action cannot be undone.`)) {
      deleteSelectedTestServicesMutation.mutate(selectedTestServices);
    }
  };

  const handleTestServiceSelection = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedTestServices([...selectedTestServices, serviceId]);
    } else {
      setSelectedTestServices(selectedTestServices.filter(id => id !== serviceId));
    }
  };

  const handleSelectAllTestServices = (checked: boolean) => {
    if (checked) {
      setSelectedTestServices(testServices?.map((s: Service) => s.id) || []);
    } else {
      setSelectedTestServices([]);
    }
  };

  const resetTestServiceForm = () => {
    setTestServiceFormData({
      name: '',
      description: '',
      basePrice: '',
      estimatedDuration: 120,
      categoryId: '',
      isActive: true,
      icon: ''
    });
    setSelectedTestService(null);
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

  // Normalize services data
  const servicesList = Array.isArray(services) ? services : services?.services || [];
  
  const filteredServices = servicesList.filter((service: Service) => {
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-12 lg:grid-cols-14">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">
              Users ({userList?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">
              Orders ({orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="services-tab">
              Services
            </TabsTrigger>
            <TabsTrigger value="test-services" data-testid="test-services-tab">
              Test Services
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="categories-tab">
              Categories
            </TabsTrigger>
            <TabsTrigger value="coupons" data-testid="coupons-tab">
              <TicketPercent className="h-4 w-4 mr-2" />
              Coupons
            </TabsTrigger>
            <TabsTrigger value="taxes" data-testid="taxes-tab">
              <Calculator className="h-4 w-4 mr-2" />
              Tax Management
            </TabsTrigger>
            <TabsTrigger value="verifications" data-testid="verifications-tab">
              Verifications ({verifications?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="parts-providers" data-testid="parts-providers-tab">
              Parts Providers ({pendingPartsProviders?.data?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="media" data-testid="media-tab">
              Media
            </TabsTrigger>
            <TabsTrigger value="promotional-media" data-testid="promotional-media-tab">
              <Video className="h-4 w-4 mr-2" />
              Promotional
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

          <TabsContent value="media" className="mt-6">
            <div className="space-y-6">
              {/* Media Management Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Media Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage uploaded images, documents, and media assets across the platform
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>

              {/* Media Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Image className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">1,234</div>
                    <div className="text-xs text-muted-foreground">Total Images</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <FileImage className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">567</div>
                    <div className="text-xs text-muted-foreground">Documents</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Cloud className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">2.4 GB</div>
                    <div className="text-xs text-muted-foreground">Storage Used</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Upload className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">89</div>
                    <div className="text-xs text-muted-foreground">Recent Uploads</div>
                  </CardContent>
                </Card>
              </div>

              {/* Media Filters and Actions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search media by name, type, or tags..."
                          value={mediaSearch}
                          onChange={(e) => setMediaSearch(e.target.value)}
                          className="pl-10"
                          data-testid="media-search"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={mediaFilter} onValueChange={setMediaFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Media</SelectItem>
                          <SelectItem value="images">Images</SelectItem>
                          <SelectItem value="documents">Documents</SelectItem>
                          <SelectItem value="avatars">Avatars</SelectItem>
                          <SelectItem value="products">Product Images</SelectItem>
                          <SelectItem value="portfolios">Portfolio Images</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </div>

                  {/* Bulk Actions */}
                  {selectedImages.length > 0 && (
                    <div className="flex items-center justify-between mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">
                          {selectedImages.length} item(s) selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImages([])}
                        >
                          Clear Selection
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm">
                          <Move className="w-4 h-4 mr-2" />
                          Move
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Media Gallery */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Media Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {/* Sample Media Items - Replace with actual data */}
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary"
                        onClick={() => {
                          setCurrentImageUrl(`https://picsum.photos/400/400?random=${i}`);
                          setShowImageViewer(true);
                        }}
                      >
                        <img
                          src={`https://picsum.photos/200/200?random=${i}`}
                          alt={`Media ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Selection Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={selectedImages.includes(`image-${i}`)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedImages([...selectedImages, `image-${i}`]);
                                } else {
                                  setSelectedImages(selectedImages.filter(id => id !== `image-${i}`));
                                }
                              }}
                              className="bg-white"
                            />
                          </div>
                          
                          <div className="absolute top-2 right-2 flex space-x-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageUrl(`https://picsum.photos/400/400?random=${i}`);
                                setShowImageViewer(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle download
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Media Info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <div className="text-white text-xs">
                            <div className="font-medium">image_{i + 1}.jpg</div>
                            <div className="text-white/70">2.4 MB • 1920x1080</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Load More */}
                  <div className="text-center mt-6">
                    <Button variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Load More
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Recent Upload Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sample Upload Activities */}
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">Product image upload completed</div>
                          <div className="text-sm text-muted-foreground">5 images uploaded by John Doe</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">2 min ago</div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <Upload className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">Avatar update in progress</div>
                          <div className="text-sm text-muted-foreground">User profile image being processed</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">5 min ago</div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium">Document upload failed</div>
                          <div className="text-sm text-muted-foreground">File size exceeded limit (5MB)</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">10 min ago</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="verifications" className="mt-6">
            <div className="space-y-6">
              {/* Verification Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Provider Verification</h2>
                  <p className="text-sm text-muted-foreground">
                    Review and manage provider applications and verifications
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'pending').length || 0} Pending
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800">
                    {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'under_review').length || 0} Under Review
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">
                    {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'approved').length || 0} Approved
                  </Badge>
                </div>
              </div>

              {/* Verification Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'pending').length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending Review</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'under_review').length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Under Review</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'approved').length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {allProviders?.filter((p: ProviderApplication) => p.verificationStatus === 'rejected').length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Rejected</div>
                  </CardContent>
                </Card>
              </div>

              {/* Provider Applications List */}
              {allProviders && allProviders.length > 0 ? (
                <div className="space-y-6">
                  {allProviders
                    .sort((a: ProviderApplication, b: ProviderApplication) => {
                      // Sort by status priority: pending -> under_review -> rejected -> approved
                      const statusPriority: Record<string, number> = {
                        'pending': 1,
                        'under_review': 2,
                        'rejected': 3,
                        'approved': 4,
                        'suspended': 5
                      };
                      return statusPriority[a.verificationStatus] - statusPriority[b.verificationStatus];
                    })
                    .map((provider: ProviderApplication) => (
                      <ProviderVerificationCard
                        key={provider.id}
                        provider={provider}
                        onStatusChange={handleProviderVerification}
                        isUpdating={providerVerificationMutation.isPending}
                      />
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium text-foreground mb-2">No provider applications</h3>
                  <p className="text-sm text-muted-foreground">
                    Provider applications will appear here when submitted
                  </p>
                </div>
              )}
            </div>
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

          {/* ===== COMPREHENSIVE COUPON MANAGEMENT SYSTEM ===== */}
          <TabsContent value="coupons" className="mt-6">
            <CouponManagementSystem />
          </TabsContent>

          {/* ===== COMPREHENSIVE TAX MANAGEMENT SYSTEM ===== */}
          <TabsContent value="taxes" className="mt-6">
            <TaxManagementSystem />
          </TabsContent>

          {/* ===== COMPREHENSIVE PROMOTIONAL MEDIA MANAGEMENT SYSTEM ===== */}
          <TabsContent value="promotional-media" className="mt-6">
            <PromotionalMediaManagementSystem />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="space-y-6">
              {/* Services Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Services Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage all services offered on the platform
                  </p>
                </div>
                <Button onClick={() => setIsCreateServiceOpen(true)} data-testid="create-service-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>

              {/* Services Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {servicesList?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Services</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {servicesList?.filter((s: Service) => s.isActive).length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Services</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Star className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {0}
                    </div>
                    <div className="text-xs text-muted-foreground">Featured Services</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">
                      {0}
                    </div>
                    <div className="text-xs text-muted-foreground">Popular Services</div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                    data-testid="services-search"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.isArray(mainCategories) ? mainCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
              </div>

              {/* Services List */}
              {servicesList && servicesList.length > 0 ? (
                <div className="grid gap-4">
                  {filteredServices.map((service: Service) => {
                    const category = Array.isArray(mainCategories) ? mainCategories.find(c => c.id === service.categoryId) : null;
                    return (
                      <Card key={service.id} className="transition-all duration-200 hover:shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {service.iconType === 'image' && service.iconValue ? (
                                    <img 
                                      src={service.iconValue} 
                                      alt="Service icon"
                                      className="w-6 h-6 object-cover rounded"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'inline';
                                      }}
                                    />
                                  ) : null}
                                  <span 
                                    className="text-lg"
                                    style={{ display: service.iconType === 'image' && service.iconValue ? 'none' : 'inline' }}
                                  >
                                    {(service.iconType === 'emoji' && service.iconValue) ? service.iconValue : '🔧'}
                                  </span>
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">{service.name}</h3>
                                <div className="flex space-x-2">
                                  <Badge variant={service.isActive ? "default" : "secondary"}>
                                    {service.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  {false && ( // service.isFeatured property doesn't exist
                                    <Badge className="bg-orange-100 text-orange-800">
                                      <Star className="w-3 h-3 mr-1" />
                                      Featured
                                    </Badge>
                                  )}
                                  {false && ( // service.isPopular property doesn't exist
                                    <Badge className="bg-purple-100 text-purple-800">
                                      <TrendingUp className="w-3 h-3 mr-1" />
                                      Popular
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                                  <p className="flex items-center space-x-1">
                                    {category?.icon && <span>{category.icon}</span>}
                                    <span>{category?.name || 'Unknown Category'}</span>
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                                  <p className="font-medium">
                                    ₹{service.basePrice || 0} / service
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Bookings</Label>
                                  <p className="font-medium">{service.totalBookings || 0}</p>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground leading-6 mb-4">
                                {service.description || 'No description available'}
                              </p>
                              
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditService(service)}
                                data-testid={`edit-service-${service.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteService(service.id)}
                                data-testid={`delete-service-${service.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium text-foreground mb-2">No services found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No services match your search criteria' : 'Start by creating your first service'}
                  </p>
                  {!searchQuery && (
                    <Button
                      className="mt-4"
                      onClick={() => setIsCreateServiceOpen(true)}
                      data-testid="create-first-service"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Service
                    </Button>
                  )}
                </div>
              )}
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
                      {categoryHierarchy.map((category: any) => (
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
                              {category.children.map((subCategory: any) => (
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
                  {/* Production Fix: Use local state instead of React Query data */}
                  {localCategories && localCategories.length > 0 ? (
                    <div className={`transition-opacity duration-200 ${isDragging ? 'opacity-75' : 'opacity-100'}`}>
                      <Reorder.Group 
                        axis="y" 
                        values={localCategories} 
                        onReorder={handleCategoryReorder}
                        className="space-y-3"
                      >
                        {localCategories.map((category) => (
                        <Reorder.Item 
                          key={category.id} 
                          value={category}
                          className="flex items-center justify-between p-3 border rounded-lg bg-background cursor-move hover:shadow-md transition-shadow"
                          data-testid={`category-item-${category.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
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
                        </Reorder.Item>
                        ))}
                      </Reorder.Group>
                      {/* Visual feedback during reorder operations */}
                      {reorderCategoriesMutation.isPending && (
                        <div className="flex items-center justify-center p-2 mt-2 text-sm text-muted-foreground">
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving order...
                        </div>
                      )}
                    </div>
                  ) : mainCategoriesLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-6 w-6 rounded" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-5 w-12" />
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-8 w-8" />
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

          <TabsContent value="parts-providers" className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Parts Provider Management</h2>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/parts-providers/pending'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/v1/admin/parts-providers'] });
                  }}
                  data-testid="refresh-parts-providers"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Parts Provider Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{pendingPartsProviders?.data?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Pending Verification</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{partsProviders?.approved?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{partsProviders?.rejected?.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Rejected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{(partsProviders?.approved?.length || 0) + (partsProviders?.rejected?.length || 0) + (pendingPartsProviders?.data?.length || 0)}</div>
                  <div className="text-xs text-muted-foreground">Total Applications</div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Verifications */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Pending Verifications ({pendingPartsProviders?.data?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPartsProviders?.data && pendingPartsProviders.data.length > 0 ? (
                  <div className="space-y-4">
                    {pendingPartsProviders.data.map((provider: any) => (
                      <Card key={provider.id} className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{provider.businessName || `${provider.firstName} ${provider.lastName}`}</h3>
                                <p className="text-sm text-muted-foreground">{provider.email} • {provider.phone}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Review
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
                              <p className="font-medium">{provider.businessType || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Categories</Label>
                              <p className="font-medium">{provider.inventoryCategories?.join(', ') || 'Not specified'}</p>
                            </div>
                          </div>

                          {provider.warehouseAddress && (
                            <div className="mb-4">
                              <Label className="text-sm font-medium text-muted-foreground">Warehouse Location</Label>
                              <p className="text-sm">{provider.warehouseAddress}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Applied: {new Date(provider.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => partsProviderVerificationMutation.mutate({
                                  providerId: provider.id,
                                  action: 'under_review',
                                  notes: 'Under review by admin'
                                })}
                                disabled={partsProviderVerificationMutation.isPending}
                                data-testid={`review-parts-provider-${provider.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => partsProviderVerificationMutation.mutate({
                                  providerId: provider.id,
                                  action: 'approve',
                                  notes: 'Approved by admin'
                                })}
                                disabled={partsProviderVerificationMutation.isPending}
                                data-testid={`approve-parts-provider-${provider.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => partsProviderVerificationMutation.mutate({
                                  providerId: provider.id,
                                  action: 'reject',
                                  notes: 'Rejected by admin',
                                  rejectionReason: 'Incomplete documentation'
                                })}
                                disabled={partsProviderVerificationMutation.isPending}
                                data-testid={`reject-parts-provider-${provider.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium text-foreground mb-2">No pending verifications</h3>
                    <p className="text-sm text-muted-foreground">
                      All parts provider applications have been processed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Parts Providers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  All Parts Providers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partsProviders && (partsProviders.approved?.length > 0 || partsProviders.rejected?.length > 0) ? (
                  <div className="space-y-4">
                    {/* Approved Parts Providers */}
                    {partsProviders.approved?.map((provider: any) => (
                      <Card key={provider.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{provider.businessName || `${provider.firstName} ${provider.lastName}`}</h3>
                                <p className="text-sm text-muted-foreground">{provider.email}</p>
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Rejected Parts Providers */}
                    {partsProviders.rejected?.map((provider: any) => (
                      <Card key={provider.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{provider.businessName || `${provider.firstName} ${provider.lastName}`}</h3>
                                <p className="text-sm text-muted-foreground">{provider.email}</p>
                              </div>
                            </div>
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium text-foreground mb-2">No parts providers yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Parts providers will appear here once they register
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
                <Label>Category Image (Optional)</Label>
                <ImageUpload
                  variant="compact"
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024} // 5MB

                  placeholder="Upload category image"
                  uploadText="Choose Image"
                  onComplete={(images) => {
                    if (images.length > 0) {
                      setCategoryFormData({ ...categoryFormData, imageUrl: images[0].url });
                    }
                  }}
                  onError={(error) => {
                    toast({
                      title: "Upload Error",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                  data-testid="upload-category-image"
                />
                {categoryFormData.imageUrl && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={categoryFormData.imageUrl} 
                        alt="Category preview" 
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryFormData({ ...categoryFormData, imageUrl: '' })}
                        data-testid="button-remove-image"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
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
                    {Array.isArray(mainCategories) ? mainCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    )) : null}
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

        {/* Create Service Dialog */}
        <Dialog open={isCreateServiceOpen} onOpenChange={setIsCreateServiceOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    placeholder="Enter service name"
                    data-testid="service-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="serviceCategory">Category *</Label>
                  <Select 
                    value={serviceFormData.categoryId} 
                    onValueChange={(value) => setServiceFormData({ ...serviceFormData, categoryId: value })}
                  >
                    <SelectTrigger data-testid="service-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Service Icon *</Label>
                <ServiceIconSelector
                  onIconChange={(iconData) => {
                    setServiceFormData({ 
                      ...serviceFormData, 
                      iconValue: iconData.iconValue || ''
                    });
                  }}
                  data-testid="service-icon-selector"
                />
              </div>
              
              <div>
                <Label htmlFor="serviceDescription">Description *</Label>
                <Textarea
                  id="serviceDescription"
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  placeholder="Enter detailed service description"
                  rows={3}
                  data-testid="service-description-input"
                />
              </div>
              
              <div>
                <Label htmlFor="serviceShortDescription">Short Description</Label>
                <Input
                  id="serviceShortDescription"
                  value={serviceFormData.shortDescription}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, shortDescription: e.target.value })}
                  placeholder="Brief description for listings"
                  data-testid="service-short-description-input"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="servicePrice">Base Price (₹) *</Label>
                  <Input
                    id="servicePrice"
                    type="number"
                    value={serviceFormData.basePrice}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, basePrice: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                    data-testid="service-price-input"
                  />
                </div>
                <div>
                  <Label htmlFor="servicePriceType">Price Type</Label>
                  <Select 
                    value={serviceFormData.priceType} 
                    onValueChange={(value: 'fixed' | 'hourly' | 'per_item') => setServiceFormData({ ...serviceFormData, priceType: value })}
                  >
                    <SelectTrigger data-testid="service-price-type-select">
                      <SelectValue placeholder="Select price type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="hourly">Per Hour</SelectItem>
                      <SelectItem value="per_item">Per Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="serviceUnit">Unit</Label>
                  <Input
                    id="serviceUnit"
                    value={serviceFormData.unit}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, unit: e.target.value })}
                    placeholder="service, hour, item"
                    data-testid="service-unit-input"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="serviceActive"
                    checked={serviceFormData.isActive}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, isActive: e.target.checked })}
                    data-testid="service-active-checkbox"
                  />
                  <Label htmlFor="serviceActive">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="serviceFeatured"
                    checked={serviceFormData.isFeatured}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, isFeatured: e.target.checked })}
                    data-testid="service-featured-checkbox"
                  />
                  <Label htmlFor="serviceFeatured">Featured</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="servicePopular"
                    checked={serviceFormData.isPopular}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, isPopular: e.target.checked })}
                    data-testid="service-popular-checkbox"
                  />
                  <Label htmlFor="servicePopular">Popular</Label>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateServiceOpen(false);
                    resetServiceForm();
                  }} 
                  className="flex-1"
                  data-testid="cancel-create-service"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateService} 
                  className="flex-1"
                  disabled={createServiceMutation.isPending}
                  data-testid="confirm-create-service"
                >
                  {createServiceMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Service
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Service Dialog */}
        <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editServiceName">Service Name *</Label>
                  <Input
                    id="editServiceName"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                    placeholder="Enter service name"
                    data-testid="edit-service-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="editServiceCategory">Category *</Label>
                  <Select 
                    value={serviceFormData.categoryId} 
                    onValueChange={(value) => setServiceFormData({ ...serviceFormData, categoryId: value })}
                  >
                    <SelectTrigger data-testid="edit-service-category-select">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(mainCategories) ? mainCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Service Icon *</Label>
                <ServiceIconSelector
                  onIconChange={(iconData) => {
                    setServiceFormData({ 
                      ...serviceFormData, 
                      iconValue: iconData.iconValue || ''
                    });
                  }}
                  data-testid="edit-service-icon-selector"
                />
              </div>
              
              <div>
                <Label htmlFor="editServiceDescription">Description *</Label>
                <Textarea
                  id="editServiceDescription"
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  placeholder="Enter detailed service description"
                  rows={3}
                  data-testid="edit-service-description-input"
                />
              </div>
              
              <div>
                <Label htmlFor="editServiceShortDescription">Short Description</Label>
                <Input
                  id="editServiceShortDescription"
                  value={serviceFormData.shortDescription}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, shortDescription: e.target.value })}
                  placeholder="Brief description for listings"
                  data-testid="edit-service-short-description-input"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editServicePrice">Base Price (₹) *</Label>
                  <Input
                    id="editServicePrice"
                    type="number"
                    value={serviceFormData.basePrice}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, basePrice: Number(e.target.value) })}
                    placeholder="0"
                    min="0"
                    data-testid="edit-service-price-input"
                  />
                </div>
                <div>
                  <Label htmlFor="editServicePriceType">Price Type</Label>
                  <Select 
                    value={serviceFormData.priceType} 
                    onValueChange={(value: 'fixed' | 'hourly' | 'per_item') => setServiceFormData({ ...serviceFormData, priceType: value })}
                  >
                    <SelectTrigger data-testid="edit-service-price-type-select">
                      <SelectValue placeholder="Select price type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="hourly">Per Hour</SelectItem>
                      <SelectItem value="per_item">Per Item</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editServiceUnit">Unit</Label>
                  <Input
                    id="editServiceUnit"
                    value={serviceFormData.unit}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, unit: e.target.value })}
                    placeholder="service, hour, item"
                    data-testid="edit-service-unit-input"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editServiceActive"
                    checked={serviceFormData.isActive}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, isActive: e.target.checked })}
                    data-testid="edit-service-active-checkbox"
                  />
                  <Label htmlFor="editServiceActive">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editServiceFeatured"
                    checked={serviceFormData.isFeatured}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, isFeatured: e.target.checked })}
                    data-testid="edit-service-featured-checkbox"
                  />
                  <Label htmlFor="editServiceFeatured">Featured</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editServicePopular"
                    checked={serviceFormData.isPopular}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, isPopular: e.target.checked })}
                    data-testid="edit-service-popular-checkbox"
                  />
                  <Label htmlFor="editServicePopular">Popular</Label>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditServiceOpen(false);
                    resetServiceForm();
                  }} 
                  className="flex-1"
                  data-testid="cancel-edit-service"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateService} 
                  className="flex-1"
                  disabled={updateServiceMutation.isPending}
                  data-testid="confirm-edit-service"
                >
                  {updateServiceMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Service
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
                <Label>Category Image (Optional)</Label>
                <ImageUpload
                  variant="compact"
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024} // 5MB

                  placeholder="Upload category image"
                  uploadText="Choose Image"
                  initialImages={categoryFormData.imageUrl ? [{
                    id: 'current',
                    url: categoryFormData.imageUrl,
                    filename: 'current-image.jpg',
                    size: 0,
                    mimeType: 'image/jpeg'
                  }] : []}
                  onComplete={(images) => {
                    if (images.length > 0) {
                      setCategoryFormData({ ...categoryFormData, imageUrl: images[0].url });
                    }
                  }}
                  onError={(error) => {
                    toast({
                      title: "Upload Error",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                  data-testid="edit-upload-category-image"
                />
                {categoryFormData.imageUrl && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={categoryFormData.imageUrl} 
                        alt="Category preview" 
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedCategory?.id) {
                            handleCategoryImageRemove(selectedCategory.id);
                          }
                          setCategoryFormData({ ...categoryFormData, imageUrl: '' });
                        }}
                        data-testid="button-edit-remove-image"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
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
                    {Array.isArray(mainCategories) ? mainCategories.filter(cat => cat.id !== selectedCategory?.id).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    )) : null}
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
