import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import AvatarUpload from '@/components/AvatarUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { type UploadedImage } from '@/hooks/useImageUpload';
import { type UserAddress } from '@shared/schema';
import { 
  ArrowLeft,
  User, 
  Loader2,
  Save,
  MapPin,
  Bell,
  Shield
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

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

export default function AccountEdit() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('profile');

  // Profile update form
  const profileForm = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  // Fetch user addresses
  const { data: addresses = [], isLoading: isLoadingAddresses } = useQuery<UserAddress[]>({
    queryKey: ['/api/v1/users/me/addresses'],
    enabled: activeTab === 'addresses',
  });

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ['/api/v1/users/me/notifications/preferences'],
    enabled: activeTab === 'notifications',
  });

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
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="pt-32 px-4 pb-6">
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
                <CardHeader>
                  <CardTitle>Delivery Addresses</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAddresses ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading addresses...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addresses.length === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No addresses added</h3>
                          <p className="text-muted-foreground mb-4">
                            Add your delivery addresses to get started
                          </p>
                          <Button data-testid="add-first-address-button">
                            <MapPin className="w-4 h-4 mr-2" />
                            Add Address
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
                                      <h4 className="font-medium">{address.title || `${address.type} Address`}</h4>
                                      {address.isDefault && (
                                        <Badge variant="default" className="text-xs">Default</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {address.fullName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {address.addressLine1}, {address.addressLine2 && `${address.addressLine2}, `}
                                      {address.city}, {address.state} {address.pincode}
                                    </p>
                                    {address.phone && (
                                      <p className="text-sm text-muted-foreground">
                                        Phone: {address.phone}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button variant="ghost" size="sm">Edit</Button>
                                    <Button variant="ghost" size="sm" className="text-red-600">Delete</Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          <Button className="w-full" data-testid="add-address-button">
                            <MapPin className="w-4 h-4 mr-2" />
                            Add New Address
                          </Button>
                        </div>
                      )}
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
                </CardHeader>
                <CardContent>
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading notification preferences...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Notification Settings</h3>
                        <p className="text-muted-foreground">
                          Manage how you receive updates and alerts
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          Notification preferences will be available soon. You can currently manage basic 
                          notification settings from the main account page.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  );
}