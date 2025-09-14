import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  FileText, 
  LogOut, 
  ChevronRight,
  Star,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Gift,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Edit3,
  Check,
  X,
  Loader2
} from 'lucide-react';

// Email update validation schema
const emailUpdateSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email address is required'),
});

type EmailUpdateFormData = z.infer<typeof emailUpdateSchema>;

export default function Account() {
  const { user, signOut, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Email update form
  const emailForm = useForm<EmailUpdateFormData>({
    resolver: zodResolver(emailUpdateSchema),
    defaultValues: {
      email: user?.email || '',
    },
  });
  
  // Email update mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (data: EmailUpdateFormData) => {
      const response = await apiRequest('PATCH', '/api/v1/users/me/email', data);
      return response.json();
    },
    onSuccess: (data) => {
      // Update user context with new email
      refreshUser();
      // Reset form state
      setIsEditingEmail(false);
      emailForm.reset({ email: data.user.email });
      toast({
        title: "Email updated successfully",
        description: "Your email address has been updated and saved.",
      });
    },
    onError: (error: any) => {
      console.error('Email update error:', error);
      toast({
        title: "Failed to update email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      setLocation('/login');
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditProfile = () => {
    setLocation('/account/edit');
  };
  
  const handleEmailEdit = () => {
    setIsEditingEmail(true);
    emailForm.reset({ email: user?.email || '' });
  };
  
  const handleEmailCancel = () => {
    setIsEditingEmail(false);
    emailForm.reset({ email: user?.email || '' });
  };
  
  const handleEmailSubmit = (data: EmailUpdateFormData) => {
    updateEmailMutation.mutate(data);
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    // TODO: Update notification preferences on server
    toast({
      title: enabled ? "Notifications enabled" : "Notifications disabled",
      description: enabled 
        ? "You will receive notifications for orders and updates." 
        : "You won't receive notifications.",
    });
  };

  const menuItems = [
    {
      id: 'profile',
      title: 'Edit Profile',
      description: 'Update your personal information',
      icon: User,
      action: handleEditProfile,
    },
    {
      id: 'addresses',
      title: 'Manage Addresses',
      description: 'Add or edit your service locations',
      icon: MapPin,
      action: () => setLocation('/account/addresses'),
    },
    {
      id: 'payments',
      title: 'Payment Methods',
      description: 'Manage your payment options and saved cards',
      icon: CreditCard,
      action: () => setLocation('/payment-methods'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Customize your notification preferences',
      icon: Bell,
      action: () => setLocation('/account/notifications'),
    },
    {
      id: 'language',
      title: 'Language & Region',
      description: 'Change app language and region',
      icon: Globe,
      action: () => setLocation('/account/language'),
    },
    {
      id: 'referral',
      title: 'Refer & Earn',
      description: 'Invite friends and earn rewards',
      icon: Gift,
      action: () => setLocation('/account/referral'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help with your account or orders',
      icon: HelpCircle,
      action: () => setLocation('/support'),
    },
    {
      id: 'legal',
      title: 'Legal & Privacy',
      description: 'Terms, privacy policy, and legal information',
      icon: FileText,
      action: () => setLocation('/legal'),
    },
  ];

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="pt-32 px-4 pb-6">
        {/* Profile Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                  <AvatarImage src={user.profileImageUrl || ''} alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'} />
                  <AvatarFallback className="text-lg font-semibold">
                    {user.firstName && user.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}` 
                      : user.firstName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.firstName || 'User'}
                  </h1>
                  
                  {/* Prominent Phone Display */}
                  {user.phone && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-lg font-medium text-foreground">{user.phone}</span>
                      {user.isVerified && (
                        <Badge variant="default" className="text-xs ml-2">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Location Display */}
                  {user.location?.city && (
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {user.location.city}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Member since {user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()}
                    </Badge>
                    {user.walletBalance && parseFloat(user.walletBalance.toString()) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ₹{user.walletBalance} wallet
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Email Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Mail className="w-5 h-5 text-primary" />
                <span>Email Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditingEmail ? (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {user.email ? (
                      <div>
                        <p className="text-base font-medium text-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">Your email address for notifications and account recovery</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-base text-muted-foreground italic">No email address set</p>
                        <p className="text-sm text-muted-foreground">Add your Gmail to receive important notifications</p>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleEmailEdit}
                    data-testid="edit-email-button"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {user.email ? 'Update' : 'Add Email'}
                  </Button>
                </div>
              ) : (
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your Gmail or email address"
                              data-testid="email-input"
                              disabled={updateEmailMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={updateEmailMutation.isPending}
                        data-testid="save-email-button"
                      >
                        {updateEmailMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEmailCancel}
                        disabled={updateEmailMutation.isPending}
                        data-testid="cancel-email-button"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">12</div>
              <div className="text-xs text-muted-foreground">Services Booked</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">₹{user.walletBalance || '0'}</div>
              <div className="text-xs text-muted-foreground">Wallet Balance</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">{user.fixiPoints || 0}</div>
              <div className="text-xs text-muted-foreground">FixiPoints</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="notifications" className="text-sm font-medium">
                      Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive order updates and offers
                    </p>
                  </div>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                  data-testid="notifications-toggle"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <Label htmlFor="dark-mode" className="text-sm font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Switch to dark theme
                    </p>
                  </div>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  data-testid="dark-mode-toggle"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <Label htmlFor="sound" className="text-sm font-medium">
                      Sound Effects
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable app sounds
                    </p>
                  </div>
                </div>
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  data-testid="sound-toggle"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2 mb-6"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent 
                    className="p-4"
                    onClick={item.action}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            data-testid="sign-out-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        {/* App Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-muted-foreground">
            FixitQuick v1.0.0 - Made with ❤️ in India
          </p>
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  );
}
