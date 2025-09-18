import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft,
  FileText,
  Shield,
  Download,
  Trash2,
  Eye,
  Cookie,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Calendar,
  User,
  Database,
  Lock,
  Settings,
  Info
} from 'lucide-react';

interface UserAgreements {
  termsOfService: {
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  };
  privacyPolicy: {
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  };
  cookiePolicy: {
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  };
  dataProcessing: {
    accepted: boolean;
    acceptedAt?: string;
    version: string;
  };
}

interface DataExportRequest {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  requestedAt: string;
  readyAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
}

export default function LegalPrivacy() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('agreements');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch user agreements
  const { data: agreements, isLoading: isLoadingAgreements } = useQuery<UserAgreements>({
    queryKey: ['/api/v1/users/me/agreements'],
    enabled: !!user,
  });

  // Fetch data export requests
  const { data: exportRequests = [], isLoading: isLoadingExports } = useQuery<DataExportRequest[]>({
    queryKey: ['/api/v1/users/me/data-exports'],
    enabled: !!user && activeTab === 'data',
  });

  // Request data export mutation
  const requestDataExportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v1/users/me/data-exports');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/users/me/data-exports'] });
      toast({
        title: "Data export requested",
        description: "We'll email you when your data is ready for download.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request data export",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/v1/users/me/account');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deletion initiated",
        description: "Your account will be deleted within 30 days. You can cancel this by logging in.",
      });
      setLocation('/login');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete account",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    setLocation('/account');
  };

  const handleDataExportRequest = () => {
    requestDataExportMutation.mutate();
  };

  const handleAccountDeletion = () => {
    deleteAccountMutation.mutate();
    setShowDeleteDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'processing':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'expired':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getAgreementStatus = (agreement: { accepted: boolean; acceptedAt?: string }) => {
    if (agreement.accepted && agreement.acceptedAt) {
      return {
        status: 'Accepted',
        date: new Date(agreement.acceptedAt).toLocaleDateString(),
        color: 'text-green-600',
        icon: CheckCircle2
      };
    }
    return {
      status: 'Not Accepted',
      date: '',
      color: 'text-red-600',
      icon: AlertTriangle
    };
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  const TERMS_OF_SERVICE = `
# Terms of Service

**Last updated: December 15, 2023**

## 1. Acceptance of Terms
By accessing and using FixitQuick, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Service Description
FixitQuick is a platform that connects users with home service providers for various maintenance and repair needs.

## 3. User Responsibilities
- Provide accurate information when booking services
- Be present during scheduled service appointments
- Pay for services as agreed
- Treat service providers with respect

## 4. Service Provider Responsibilities
- Provide services as described
- Maintain professional standards
- Complete background verification
- Carry appropriate insurance

## 5. Payment Terms
- Payments are processed securely through our payment partners
- Refunds are subject to our refund policy
- Service providers receive payment after service completion

## 6. Limitation of Liability
FixitQuick acts as an intermediary platform and is not liable for the quality of services provided by independent contractors.

## 7. Privacy
Your privacy is important to us. Please review our Privacy Policy for information on how we collect and use your data.

## 8. Modifications
We reserve the right to modify these terms at any time. Users will be notified of significant changes.

## 9. Termination
Either party may terminate this agreement at any time with proper notice.

## 10. Contact Information
For questions about these terms, please contact us at legal@fixitquick.com
`;

  const PRIVACY_POLICY = `
# Privacy Policy

**Last updated: December 15, 2023**

## Information We Collect

### Personal Information
- Name, email address, phone number
- Home address and location data
- Payment information (processed by secure third parties)
- Service history and preferences

### Automatically Collected Information
- Device information and IP address
- Usage patterns and app interactions
- Location data (with permission)
- Cookies and similar technologies

## How We Use Your Information

### Service Provision
- Connect you with service providers
- Process payments and bookings
- Provide customer support
- Send service-related notifications

### Improvement and Analytics
- Analyze usage patterns
- Improve our services
- Develop new features
- Conduct research and surveys

## Information Sharing

### Service Providers
We share necessary information with service providers to fulfill your bookings.

### Third-Party Services
- Payment processors for transaction handling
- Analytics services for app improvement
- Customer support tools
- Marketing platforms (with consent)

### Legal Requirements
We may disclose information when required by law or to protect our rights and safety.

## Data Security
We implement industry-standard security measures to protect your personal information.

## Your Rights
- Access your personal data
- Correct inaccurate information
- Delete your account and data
- Export your data
- Opt out of marketing communications

## Contact Us
For privacy-related questions, contact us at privacy@fixitquick.com
`;

  const COOKIE_POLICY = `
# Cookie Policy

**Last updated: December 15, 2023**

## What Are Cookies
Cookies are small text files stored on your device when you visit our website or use our app.

## Types of Cookies We Use

### Essential Cookies
Required for basic app functionality:
- Authentication cookies
- Security cookies
- Load balancing cookies

### Analytics Cookies
Help us understand how you use our service:
- Google Analytics
- Mixpanel
- Hotjar (with consent)

### Marketing Cookies
Used for advertising and personalization:
- Facebook Pixel
- Google Ads
- Retargeting cookies

## Managing Cookies
You can control cookies through your browser settings or app preferences.

### Browser Settings
Most browsers allow you to:
- View stored cookies
- Delete cookies
- Block future cookies
- Set preferences per website

### App Settings
In our mobile app, you can:
- Disable non-essential cookies
- Opt out of analytics
- Manage marketing preferences

## Third-Party Cookies
Some cookies are set by third-party services we use for analytics and advertising.

## Contact Us
For questions about our cookie policy, contact us at privacy@fixitquick.com
`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 pb-6">
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
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">Legal & Privacy</h1>
          <p className="text-muted-foreground">
            Manage your legal agreements and privacy settings
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agreements" className="flex items-center space-x-2">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Agreements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Agreements Tab */}
          <TabsContent value="agreements" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Scale className="w-5 h-5" />
                    <span>Legal Agreements</span>
                  </CardTitle>
                  <CardDescription>
                    View your acceptance status for our legal agreements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingAgreements ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                          </div>
                          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Terms of Service */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h3 className="font-medium">Terms of Service</h3>
                          <p className="text-sm text-muted-foreground">
                            Version {agreements?.termsOfService.version || '1.0'}
                          </p>
                          {agreements?.termsOfService && (
                            <div className="flex items-center space-x-2 text-sm">
                              {(() => {
                                const status = getAgreementStatus(agreements.termsOfService);
                                const Icon = status.icon;
                                return (
                                  <>
                                    <Icon className={`w-4 h-4 ${status.color}`} />
                                    <span className={status.color}>{status.status}</span>
                                    {status.date && <span className="text-muted-foreground">on {status.date}</span>}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-view-terms">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>

                      {/* Privacy Policy */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h3 className="font-medium">Privacy Policy</h3>
                          <p className="text-sm text-muted-foreground">
                            Version {agreements?.privacyPolicy.version || '1.0'}
                          </p>
                          {agreements?.privacyPolicy && (
                            <div className="flex items-center space-x-2 text-sm">
                              {(() => {
                                const status = getAgreementStatus(agreements.privacyPolicy);
                                const Icon = status.icon;
                                return (
                                  <>
                                    <Icon className={`w-4 h-4 ${status.color}`} />
                                    <span className={status.color}>{status.status}</span>
                                    {status.date && <span className="text-muted-foreground">on {status.date}</span>}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-view-privacy">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>

                      {/* Cookie Policy */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h3 className="font-medium">Cookie Policy</h3>
                          <p className="text-sm text-muted-foreground">
                            Version {agreements?.cookiePolicy.version || '1.0'}
                          </p>
                          {agreements?.cookiePolicy && (
                            <div className="flex items-center space-x-2 text-sm">
                              {(() => {
                                const status = getAgreementStatus(agreements.cookiePolicy);
                                const Icon = status.icon;
                                return (
                                  <>
                                    <Icon className={`w-4 h-4 ${status.color}`} />
                                    <span className={status.color}>{status.status}</span>
                                    {status.date && <span className="text-muted-foreground">on {status.date}</span>}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-view-cookies">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>

                      {/* Data Processing */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h3 className="font-medium">Data Processing Agreement</h3>
                          <p className="text-sm text-muted-foreground">
                            Version {agreements?.dataProcessing.version || '1.0'}
                          </p>
                          {agreements?.dataProcessing && (
                            <div className="flex items-center space-x-2 text-sm">
                              {(() => {
                                const status = getAgreementStatus(agreements.dataProcessing);
                                const Icon = status.icon;
                                return (
                                  <>
                                    <Icon className={`w-4 h-4 ${status.color}`} />
                                    <span className={status.color}>{status.status}</span>
                                    {status.date && <span className="text-muted-foreground">on {status.date}</span>}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-view-data-processing">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* Terms of Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Scale className="w-5 h-5" />
                    <span>Terms of Service</span>
                  </CardTitle>
                  <CardDescription>
                    Our terms and conditions for using FixitQuick
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" data-testid="button-read-terms">
                        <FileText className="w-4 h-4 mr-2" />
                        Read Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Terms of Service</DialogTitle>
                        <DialogDescription>
                          Please read our terms and conditions carefully
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] w-full">
                        <div className="prose prose-sm max-w-none p-4">
                          <pre className="whitespace-pre-wrap text-sm">{TERMS_OF_SERVICE}</pre>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-download-terms">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Privacy Policy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Privacy Policy</span>
                  </CardTitle>
                  <CardDescription>
                    How we collect, use, and protect your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" data-testid="button-read-privacy">
                        <FileText className="w-4 h-4 mr-2" />
                        Read Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Privacy Policy</DialogTitle>
                        <DialogDescription>
                          Learn about our privacy practices
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] w-full">
                        <div className="prose prose-sm max-w-none p-4">
                          <pre className="whitespace-pre-wrap text-sm">{PRIVACY_POLICY}</pre>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-download-privacy">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Cookie Policy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cookie className="w-5 h-5" />
                    <span>Cookie Policy</span>
                  </CardTitle>
                  <CardDescription>
                    Information about cookies and tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full" data-testid="button-read-cookies">
                        <FileText className="w-4 h-4 mr-2" />
                        Read Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Cookie Policy</DialogTitle>
                        <DialogDescription>
                          Understanding our use of cookies
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh] w-full">
                        <div className="prose prose-sm max-w-none p-4">
                          <pre className="whitespace-pre-wrap text-sm">{COOKIE_POLICY}</pre>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" className="w-full" data-testid="button-download-cookies">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-6">
            {/* Data Export */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="w-5 h-5" />
                    <span>Export Your Data</span>
                  </CardTitle>
                  <CardDescription>
                    Download a copy of all your personal data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        You can request a copy of all personal data we have about you. This includes:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Profile information</li>
                        <li>Service history</li>
                        <li>Payment records</li>
                        <li>Communication logs</li>
                        <li>App usage data</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleDataExportRequest}
                    disabled={requestDataExportMutation.isPending}
                    data-testid="button-export-data"
                  >
                    {requestDataExportMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Request Data Export
                      </>
                    )}
                  </Button>

                  {exportRequests.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-medium">Export Requests</h4>
                      {exportRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Requested: {new Date(request.requestedAt).toLocaleDateString()}
                              </span>
                            </div>
                            {request.readyAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ready since: {new Date(request.readyAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {request.status === 'ready' && request.downloadUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              data-testid={`button-download-export-${request.id}`}
                            >
                              <a href={request.downloadUrl} download>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Data Control */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>Data Control</span>
                  </CardTitle>
                  <CardDescription>
                    Manage how your data is collected and used
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Analytics & Usage Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow collection of app usage data for service improvement
                        </p>
                      </div>
                      <Switch data-testid="switch-analytics" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive promotional emails and offers
                        </p>
                      </div>
                      <Switch data-testid="switch-marketing" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Location Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow location access for better service matching
                        </p>
                      </div>
                      <Switch data-testid="switch-location" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Third-party Sharing</Label>
                        <p className="text-sm text-muted-foreground">
                          Share data with partners for enhanced services
                        </p>
                      </div>
                      <Switch data-testid="switch-third-party" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Account Management Tab */}
          <TabsContent value="account" className="space-y-6">
            {/* Account Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Account Information</span>
                  </CardTitle>
                  <CardDescription>
                    Basic information about your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Account Created</Label>
                      <p className="text-sm text-muted-foreground">{new Date(user.createdAt || '').toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Last Login</Label>
                      <p className="text-sm text-muted-foreground">{new Date(user.lastLoginAt || '').toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Account Status</Label>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Verification Status</Label>
                      <div className="flex items-center space-x-2">
                        {user.isVerified ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">Verified</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-yellow-600">Pending Verification</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Danger Zone</span>
                  </CardTitle>
                  <CardDescription>
                    Irreversible actions that affect your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-red-800 mb-2">Delete Account</h3>
                        <p className="text-sm text-red-700 mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" data-testid="button-delete-account">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Account
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account
                                and remove all your data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleAccountDeletion}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid="button-confirm-delete"
                              >
                                Yes, delete my account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}