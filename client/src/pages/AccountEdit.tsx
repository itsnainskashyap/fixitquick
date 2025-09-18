import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import AvatarUpload from '@/components/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { type UploadedImage } from '@/hooks/useImageUpload';
import { type UserAddress, insertUserAddressSchema, type UserNotificationPreferences, insertUserNotificationPreferencesSchema } from '@shared/schema';
import { 
  ArrowLeft,
  User, 
  Loader2,
  Save,
  MapPin,
  Bell,
  Shield,
  Plus,
  Edit3,
  Trash2,
  Star,
  Phone,
  Home,
  Building2,
  Navigation,
  Smartphone
} from 'lucide-react';

// Profile update validation schema
const profileUpdateSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email address is required'),
});

// Address form validation schema
const addressFormSchema = insertUserAddressSchema.omit({ userId: true, isActive: true });

// Notification preferences validation schema
const notificationPreferencesSchema = insertUserNotificationPreferencesSchema.omit({ 
  userId: true, 
  createdAt: true, 
  updatedAt: true 
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
type AddressFormData = z.infer<typeof addressFormSchema>;
type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>;

export default function AccountEdit() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  // Profile update form
  const profileForm = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  // Address form
  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      type: 'home',
      title: '',
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      instructions: '',
      isDefault: false,
    },
  });

  // Notification preferences form
  const notificationForm = useForm<NotificationPreferencesFormData>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      // Channel preferences
      pushNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      // Category preferences
      orderUpdates: true,
      promotions: true,
      serviceReminders: true,
      paymentAlerts: true,
      securityAlerts: true,
      newsAndUpdates: false,
      // Timing preferences
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      timezone: 'Asia/Kolkata',
      // Sound preferences
      soundEnabled: true,
      vibrationEnabled: true,
    },
  });

  // Fetch user addresses
  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery<UserAddress[]>({
    queryKey: ['/api/v1/users/me/addresses'],
    enabled: activeTab === 'addresses',
  });

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: isLoadingNotifications } = useQuery<UserNotificationPreferences>({
    queryKey: ['/api/v1/users/me/notifications/preferences'],
    enabled: activeTab === 'notifications',
  });

  // Update notification form values when data is loaded
  useEffect(() => {
    if (notificationPrefs && !notificationForm.formState.isDirty) {
      notificationForm.reset({
        pushNotifications: notificationPrefs.pushNotifications ?? true,
        emailNotifications: notificationPrefs.emailNotifications ?? true,
        smsNotifications: notificationPrefs.smsNotifications ?? false,
        whatsappNotifications: notificationPrefs.whatsappNotifications ?? true,
        orderUpdates: notificationPrefs.orderUpdates ?? true,
        promotions: notificationPrefs.promotions ?? true,
        serviceReminders: notificationPrefs.serviceReminders ?? true,
        paymentAlerts: notificationPrefs.paymentAlerts ?? true,
        securityAlerts: notificationPrefs.securityAlerts ?? true,
        newsAndUpdates: notificationPrefs.newsAndUpdates ?? false,
        quietHoursStart: notificationPrefs.quietHoursStart ?? '22:00',
        quietHoursEnd: notificationPrefs.quietHoursEnd ?? '07:00',
        timezone: notificationPrefs.timezone ?? 'Asia/Kolkata',
        soundEnabled: notificationPrefs.soundEnabled ?? true,
        vibrationEnabled: notificationPrefs.vibrationEnabled ?? true,
      });
    }
  }, [notificationPrefs, notificationForm]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdateFormData) => {
      const response = await apiRequest('PATCH', '/api/v1/users/me/profile', data);
      return response.json();
    },
    onSuccess: (data) => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been saved.",
      });
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      toast({
        title: "Failed to update profile",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Address mutations
  const createAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiRequest('POST', '/api/v1/users/me/addresses', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/addresses'] });
      setShowAddressDialog(false);
      setEditingAddress(null);
      addressForm.reset();
      toast({
        title: "Address added successfully",
        description: "Your new address has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add address",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async (data: { id: string; address: Partial<AddressFormData> }) => {
      const response = await apiRequest('PATCH', `/api/v1/users/me/addresses/${data.id}`, data.address);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/addresses'] });
      setShowAddressDialog(false);
      setEditingAddress(null);
      addressForm.reset();
      toast({
        title: "Address updated successfully",
        description: "Your address changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update address",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const response = await apiRequest('DELETE', `/api/v1/users/me/addresses/${addressId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/addresses'] });
      toast({
        title: "Address deleted successfully",
        description: "Your address has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete address",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      const response = await apiRequest('PATCH', `/api/v1/users/me/addresses/${addressId}/default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/addresses'] });
      toast({
        title: "Default address updated",
        description: "Your default address has been changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set default address",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Notification preferences mutation
  const updateNotificationPreferencesMutation = useMutation({
    mutationFn: async (data: NotificationPreferencesFormData) => {
      const response = await apiRequest('PATCH', '/api/v1/users/me/notifications/preferences', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/notifications/preferences'] });
      toast({
        title: "Notification preferences updated",
        description: "Your notification settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update notification preferences",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Avatar upload handler
  const handleAvatarUpload = (image: UploadedImage) => {
    // Refresh user data to get updated avatar URL
    refreshUser();
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    
    toast({
      title: "Avatar updated successfully",
      description: "Your profile picture has been updated.",
    });
  };

  // Avatar upload error handler
  const handleAvatarError = (error: string) => {
    toast({
      title: "Failed to upload avatar",
      description: error,
      variant: "destructive",
    });
  };

  const handleBack = () => {
    setLocation('/account');
  };

  const handleProfileSubmit = (data: ProfileUpdateFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Address handlers
  const handleAddAddress = () => {
    setEditingAddress(null);
    addressForm.reset({
      type: 'home',
      title: '',
      fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
      phone: user?.phone || '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      instructions: '',
      isDefault: addresses.length === 0, // First address is default
    });
    setShowAddressDialog(true);
  };

  const handleEditAddress = (address: UserAddress) => {
    setEditingAddress(address);
    addressForm.reset({
      type: address.type,
      title: address.title || '',
      fullName: address.fullName,
      phone: address.phone || '',
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country || 'India',
      instructions: address.instructions || '',
      isDefault: address.isDefault,
    });
    setShowAddressDialog(true);
  };

  const handleDeleteAddress = (addressId: string) => {
    deleteAddressMutation.mutate(addressId);
  };

  const handleSetDefaultAddress = (addressId: string) => {
    setDefaultAddressMutation.mutate(addressId);
  };

  const handleAddressSubmit = (data: AddressFormData) => {
    if (editingAddress) {
      updateAddressMutation.mutate({
        id: editingAddress.id,
        address: data,
      });
    } else {
      createAddressMutation.mutate(data);
    }
  };

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="w-4 h-4" />;
      case 'work': return <Building2 className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  // Notification handlers
  const handleNotificationSubmit = (data: NotificationPreferencesFormData) => {
    updateNotificationPreferencesMutation.mutate(data);
  };


  if (!user) {
    setLocation('/login');
    return null;
  }

  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || 'User';
  };

  return (
    <Layout>
      <main className="pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information, addresses, and notification preferences
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Addresses</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="flex flex-col items-center space-y-4">
                    <AvatarUpload
                      currentAvatar={user.profileImageUrl || ''}
                      userName={getUserDisplayName()}
                      size="lg"
                      allowCrop={true}
                      allowRemove={false}
                      endpoint="/api/v1/users/me/avatar"
                      onUpload={handleAvatarUpload}
                      onError={handleAvatarError}
                      className="border-4 border-background shadow-lg"
                    />
                    
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max size 5MB. Click to upload or edit.
                      </p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter your first name"
                                  data-testid="first-name-input"
                                  disabled={updateProfileMutation.isPending}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter your last name"
                                  data-testid="last-name-input"
                                  disabled={updateProfileMutation.isPending}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="Enter your email address"
                                data-testid="email-input"
                                disabled={updateProfileMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Phone Display (Read-only) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone Number</label>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={user.phone || 'Not provided'}
                            readOnly
                            className="bg-muted"
                            data-testid="phone-display"
                          />
                          {user.isVerified && (
                            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                              <Shield className="w-4 h-4" />
                              <span className="text-xs">Verified</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Phone number cannot be changed. Contact support if needed.
                        </p>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="save-profile-button"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Delivery Addresses</CardTitle>
                  <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddAddress} data-testid="add-address-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Address
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingAddress 
                            ? 'Update your address details below.' 
                            : 'Add a new delivery address to your account.'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...addressForm}>
                        <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={addressForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="address-type-select">
                                        <SelectValue placeholder="Select address type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="home">
                                        <div className="flex items-center space-x-2">
                                          <Home className="w-4 h-4" />
                                          <span>Home</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="work">
                                        <div className="flex items-center space-x-2">
                                          <Building2 className="w-4 h-4" />
                                          <span>Work</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="other">
                                        <div className="flex items-center space-x-2">
                                          <MapPin className="w-4 h-4" />
                                          <span>Other</span>
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={addressForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address Label (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="e.g., Home, Office, etc."
                                      data-testid="address-title-input"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={addressForm.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter full name"
                                      data-testid="address-fullname-input"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={addressForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter phone number"
                                      data-testid="address-phone-input"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={addressForm.control}
                            name="addressLine1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 1</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="House/Building/Street"
                                    data-testid="address-line1-input"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addressForm.control}
                            name="addressLine2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 2 (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Area/Locality"
                                    data-testid="address-line2-input"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addressForm.control}
                            name="landmark"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Landmark (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Near landmark"
                                    data-testid="address-landmark-input"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={addressForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter city"
                                      data-testid="address-city-input"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={addressForm.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter state"
                                      data-testid="address-state-input"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={addressForm.control}
                              name="pincode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pincode</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter pincode"
                                      data-testid="address-pincode-input"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={addressForm.control}
                            name="instructions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Delivery Instructions (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Any special instructions for delivery"
                                    data-testid="address-instructions-textarea"
                                    rows={3}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addressForm.control}
                            name="isDefault"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Set as default address</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Use this address as your default delivery location
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="address-default-switch"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowAddressDialog(false);
                                setEditingAddress(null);
                                addressForm.reset();
                              }}
                              data-testid="address-cancel-button"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                              data-testid="address-save-button"
                            >
                              {(createAddressMutation.isPending || updateAddressMutation.isPending) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {editingAddress ? 'Updating...' : 'Saving...'}
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  {editingAddress ? 'Update Address' : 'Save Address'}
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {isLoadingAddresses ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading addresses...</span>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No addresses added</h3>
                      <p className="text-muted-foreground mb-4">
                        Add your delivery addresses to get started with services
                      </p>
                      <Button onClick={handleAddAddress} data-testid="add-first-address-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Address
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((address: UserAddress) => (
                        <Card key={address.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {getAddressTypeIcon(address.type || 'other')}
                                  <h4 className="font-medium">
                                    {address.title || `${(address.type || 'Address').charAt(0).toUpperCase() + (address.type || 'Address').slice(1)} Address`}
                                  </h4>
                                  {address.isDefault && (
                                    <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                      <Star className="w-3 h-3 mr-1" />
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  <strong>{address.fullName}</strong>
                                </p>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {address.addressLine1}
                                  {address.addressLine2 && `, ${address.addressLine2}`}
                                  {address.landmark && `, Near ${address.landmark}`}
                                </p>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {address.city}, {address.state} {address.pincode}
                                </p>
                                {address.phone && (
                                  <p className="text-sm text-muted-foreground flex items-center">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {address.phone}
                                  </p>
                                )}
                                {address.instructions && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Instructions: {address.instructions}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col space-y-2">
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditAddress(address)}
                                    data-testid={`edit-address-${address.id}`}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`delete-address-${address.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Address</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this address? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteAddress(address.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                {!address.isDefault && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSetDefaultAddress(address.id)}
                                    disabled={setDefaultAddressMutation.isPending}
                                    data-testid={`set-default-address-${address.id}`}
                                    className="text-xs"
                                  >
                                    Set Default
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Customize how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading notification preferences...</span>
                    </div>
                  ) : (
                    <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)} className="space-y-8">
                        {/* Channel Preferences */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium flex items-center">
                            <Smartphone className="w-5 h-5 mr-2" />
                            Communication Channels
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={notificationForm.control}
                              name="pushNotifications"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Push Notifications</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Receive alerts directly on your device
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-push-notifications"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="emailNotifications"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Email Notifications</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Get updates via email
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-email-notifications"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="smsNotifications"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">SMS Notifications</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Receive text messages for urgent updates
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-sms-notifications"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="whatsappNotifications"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">WhatsApp Notifications</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Get updates on WhatsApp
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-whatsapp-notifications"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Category Preferences */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium flex items-center">
                            <Bell className="w-5 h-5 mr-2" />
                            Notification Categories
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={notificationForm.control}
                              name="orderUpdates"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Order Updates</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Booking confirmations, status changes, completion
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-order-updates"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="promotions"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Promotions & Offers</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Special deals, discounts, and promotional offers
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-promotions"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="serviceReminders"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Service Reminders</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Maintenance reminders and upcoming services
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-service-reminders"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="paymentAlerts"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Payment Alerts</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Payment confirmations, refunds, and billing
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-payment-alerts"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="securityAlerts"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">Security Alerts</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Login attempts, password changes, account security
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-security-alerts"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="newsAndUpdates"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">News & Updates</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      App updates, new features, and company news
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-news-updates"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Sound and Timing Preferences */}
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium flex items-center">
                              <Navigation className="w-5 h-5 mr-2" />
                              Sound & Vibration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                                control={notificationForm.control}
                                name="soundEnabled"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Sound</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Play sound for notifications
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-sound-enabled"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={notificationForm.control}
                                name="vibrationEnabled"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Vibration</FormLabel>
                                      <div className="text-sm text-muted-foreground">
                                        Vibrate device for notifications
                                      </div>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="switch-vibration-enabled"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Quiet Hours</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={notificationForm.control}
                                name="quietHoursStart"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quiet Hours Start</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                        data-testid="input-quiet-hours-start"
                                      />
                                    </FormControl>
                                    <div className="text-sm text-muted-foreground">
                                      No notifications during quiet hours
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={notificationForm.control}
                                name="quietHoursEnd"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quiet Hours End</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                        data-testid="input-quiet-hours-end"
                                      />
                                    </FormControl>
                                    <div className="text-sm text-muted-foreground">
                                      Resume notifications after this time
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>

                          <FormField
                            control={notificationForm.control}
                            name="timezone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Timezone</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-timezone">
                                      <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="text-sm text-muted-foreground">
                                  Used for scheduling notifications
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end pt-6">
                          <Button
                            type="submit"
                            disabled={updateNotificationPreferencesMutation.isPending}
                            data-testid="save-notification-preferences-button"
                          >
                            {updateNotificationPreferencesMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Preferences
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </Layout>
  );
}