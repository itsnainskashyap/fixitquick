import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  Building,
  Star,
  Mail,
  Phone,
  Home,
  RefreshCw,
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Store,
  Warehouse
} from 'lucide-react';

// Parts provider profile interface
interface PartsProviderProfile {
  userId: string;
  businessName: string;
  businessType: 'individual' | 'partnership' | 'private_limited' | 'public_limited' | 'llp';
  verificationStatus: 'pending' | 'documents_submitted' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  verificationDate?: string;
  isVerified: boolean;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  verificationDocuments?: {
    businessLicense?: { url?: string; verified?: boolean };
    gstCertificate?: { url?: string; verified?: boolean };
    panCard?: { url?: string; verified?: boolean };
    bankStatement?: { url?: string; verified?: boolean };
    tradeLicense?: { url?: string; verified?: boolean };
    insuranceCertificate?: { url?: string; verified?: boolean };
  };
  verificationNotes?: string;
  rejectionReason?: string;
  resubmissionReason?: string;
  verifiedBy?: string;
  gstNumber?: string;
  panNumber?: string;
  minOrderValue: number;
  maxOrderValue?: number;
  processingTime: number;
  shippingAreas: string[];
  paymentTerms: 'immediate' | '15_days' | '30_days' | '45_days';
  isActive: boolean;
  totalRevenue: string;
  totalOrders: number;
  averageRating: string;
  totalProducts: number;
  createdAt: string;
  updatedAt?: string;
  // User details
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800',
        icon: Clock,
        title: 'Application Submitted',
        description: 'Your parts provider application has been submitted and is waiting for initial review.',
        nextStep: 'Our team will review your basic information within 24 hours.'
      };
    case 'documents_submitted':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800',
        icon: FileText,
        title: 'Documents Submitted',
        description: 'Your documents have been uploaded and are awaiting verification.',
        nextStep: 'Document verification typically takes 1-2 business days.'
      };
    case 'under_review':
      return {
        color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800',
        icon: FileText,
        title: 'Under Review',
        description: 'Our verification team is currently reviewing your application and documents.',
        nextStep: 'Final review process may take up to 3 business days.'
      };
    case 'approved':
      return {
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800',
        icon: CheckCircle,
        title: 'Approved & Verified!',
        description: 'Congratulations! Your parts provider application has been approved.',
        nextStep: 'You can now access your parts provider dashboard and start selling.'
      };
    case 'rejected':
      return {
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800',
        icon: AlertCircle,
        title: 'Requires Action',
        description: 'Your application needs some updates before approval.',
        nextStep: 'Please review the feedback and update your application.'
      };
    case 'suspended':
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800',
        icon: AlertCircle,
        title: 'Account Suspended',
        description: 'Your parts provider account has been temporarily suspended.',
        nextStep: 'Contact support for assistance with reactivation.'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800',
        icon: Clock,
        title: 'Unknown Status',
        description: 'Please contact support for assistance.',
        nextStep: 'Our support team will help you resolve this issue.'
      };
  }
};

export default function PartsProviderPending() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // First get the user's application ID by checking their parts provider profile
  const { data: userApplicationResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/v1/parts-provider/profile'],
    enabled: !!user && user.role === 'parts_provider',
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 3;
    },
  });

  const applicationId = userApplicationResponse?.profile?.id;

  // Fetch parts provider application status - using new endpoint
  const { data: response, isLoading: statusLoading, error, refetch } = useQuery({
    queryKey: ['/api/v1/providers/applications', applicationId],
    queryFn: () => applicationId ? fetch(`/api/v1/providers/applications/${applicationId}`, {
      credentials: 'include'
    }).then(res => res.json()) : null,
    enabled: !!user && !!applicationId && user.role === 'parts_provider',
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 404 (no application found)
      if (error?.status === 404) return false;
      return failureCount < 3;
    },
  });

  const isLoading = profileLoading || statusLoading;
  const profile = response?.data?.application as PartsProviderProfile | undefined;
  const statusHistory = response?.data?.statusHistory || [];

  if (!user) {
    setLocation('/login');
    return null;
  }

  // If user is not a parts provider, redirect to registration
  if (user.role !== 'parts_provider') {
    setLocation('/parts-provider-registration');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your application status...</p>
        </div>
      </div>
    );
  }

  // Handle error states
  if (error?.status === 404 || (!profile && !isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Package className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Complete Your Registration</h2>
            <p className="text-muted-foreground">
              Your parts provider registration is incomplete. Please complete your profile.
            </p>
            <Button 
              onClick={() => setLocation('/parts-provider-registration')}
              data-testid="button-complete-registration"
            >
              Complete Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && error.status !== 404) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Error Loading Application</h2>
            <p className="text-muted-foreground">
              {error.message || 'Unable to load your application status. Please try again.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} data-testid="button-retry">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setLocation('/')}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If approved, redirect to dashboard
  if (profile?.verificationStatus === 'approved') {
    setLocation('/parts-provider-dashboard');
    return null;
  }

  const statusInfo = getStatusInfo(profile?.verificationStatus || 'pending');
  const StatusIcon = statusInfo.icon;

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (!profile) return 0;
    switch (profile.verificationStatus) {
      case 'pending': return 25;
      case 'documents_submitted': return 50;
      case 'under_review': return 75;
      case 'approved': return 100;
      case 'rejected': return 60;
      case 'suspended': return 90;
      default: return 0;
    }
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                <Package className="w-6 h-6 mr-2 text-green-600" />
                Parts Provider Application Status
              </h1>
              <p className="text-sm text-muted-foreground">
                Track your verification progress
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/')}
                data-testid="button-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Overview */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Status Icon */}
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${statusInfo.color.replace('text-', '').replace('border-', '').split(' ')[0]} bg-opacity-20`}>
                <StatusIcon className="w-10 h-10" />
              </div>

              {/* Status Title */}
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">{statusInfo.title}</h2>
                <p className="text-lg text-muted-foreground mb-2">{statusInfo.description}</p>
                <p className="text-sm text-muted-foreground">{statusInfo.nextStep}</p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
              </div>

              {/* Status Badge */}
              <Badge className={statusInfo.color} data-testid="status-badge">
                {profile?.verificationStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Application Details */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="business" data-testid="tab-business">Business Info</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2" />
                  Application Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                    <p className="font-medium" data-testid="business-name">{profile?.businessName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Application ID</Label>
                    <p className="font-mono text-sm" data-testid="application-id">
                      #{profile?.userId?.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
                    <p className="capitalize" data-testid="business-type">
                      {profile?.businessType?.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                    <p data-testid="submitted-date">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {profile?.updatedAt && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p data-testid="last-updated-date">
                        {new Date(profile.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {profile?.verificationDate && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Verification Date</Label>
                      <p data-testid="verification-date">
                        {new Date(profile.verificationDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes & Feedback */}
            {(profile?.verificationNotes || profile?.rejectionReason || profile?.resubmissionReason) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Review Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                      <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">Rejection Reason:</h4>
                      <p className="text-red-700 dark:text-red-300" data-testid="rejection-reason">
                        {profile.rejectionReason}
                      </p>
                    </div>
                  )}
                  {profile.resubmissionReason && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                      <h4 className="font-medium text-amber-800 dark:text-amber-400 mb-2">Resubmission Required:</h4>
                      <p className="text-amber-700 dark:text-amber-300" data-testid="resubmission-reason">
                        {profile.resubmissionReason}
                      </p>
                    </div>
                  )}
                  {profile.verificationNotes && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Verification Notes:</h4>
                      <p data-testid="verification-notes">{profile.verificationNotes}</p>
                      {profile.verifiedBy && (
                        <p className="text-sm text-muted-foreground mt-2">Reviewed by: {profile.verifiedBy}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {profile?.verificationStatus === 'approved' && (
                <Button 
                  onClick={() => setLocation('/parts-provider-dashboard')}
                  className="flex-1"
                  data-testid="button-go-to-dashboard"
                >
                  Go to Parts Provider Dashboard
                </Button>
              )}
              
              {profile?.verificationStatus === 'rejected' && (
                <Button 
                  onClick={() => setLocation('/parts-provider-registration')}
                  className="flex-1"
                  data-testid="button-update-application"
                >
                  Update Application
                </Button>
              )}

              <Button 
                variant="outline"
                onClick={() => setLocation('/support')}
                className="flex-1"
                data-testid="button-contact-support"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Information */}
                <div>
                  <h3 className="font-semibold mb-3">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                      <p className="font-medium">{profile?.businessName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
                      <p className="capitalize">{profile?.businessType?.replace('_', ' ')}</p>
                    </div>
                    {profile?.gstNumber && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">GST Number</Label>
                        <p className="font-mono text-sm">{profile.gstNumber}</p>
                      </div>
                    )}
                    {profile?.panNumber && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">PAN Number</Label>
                        <p className="font-mono text-sm">{profile.panNumber}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                {profile?.businessAddress && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Business Address
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p>
                        {profile.businessAddress.street}<br />
                        {profile.businessAddress.city}, {profile.businessAddress.state}<br />
                        {profile.businessAddress.pincode}, {profile.businessAddress.country}
                      </p>
                    </div>
                  </div>
                )}

                {/* Operational Details */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Package className="w-4 h-4 mr-1" />
                    Operational Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Min Order Value</Label>
                      <p>₹{profile?.minOrderValue || 0}</p>
                    </div>
                    {profile?.maxOrderValue && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Max Order Value</Label>
                        <p>₹{profile.maxOrderValue}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Processing Time</Label>
                      <p>{profile?.processingTime || 0} hours</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Payment Terms</Label>
                      <p className="capitalize">{profile?.paymentTerms?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {/* Service Areas */}
                {profile?.shippingAreas && profile.shippingAreas.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Truck className="w-4 h-4 mr-1" />
                      Service Areas
                    </h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p>{profile.shippingAreas.join(', ')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Uploaded Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Required Documents */}
                <div>
                  <h3 className="font-semibold mb-3">Required Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <span>Business License</span>
                      </div>
                      {profile?.verificationDocuments?.businessLicense?.url ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {profile.verificationDocuments.businessLicense.verified ? 'Verified' : 'Uploaded'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <span>PAN Card</span>
                      </div>
                      {profile?.verificationDocuments?.panCard?.url ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {profile.verificationDocuments.panCard.verified ? 'Verified' : 'Uploaded'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span>Bank Statement</span>
                      </div>
                      {profile?.verificationDocuments?.bankStatement?.url ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {profile.verificationDocuments.bankStatement.verified ? 'Verified' : 'Uploaded'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional Documents */}
                <div>
                  <h3 className="font-semibold mb-3">Optional Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span>GST Certificate</span>
                      </div>
                      {profile?.verificationDocuments?.gstCertificate?.url ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {profile.verificationDocuments.gstCertificate.verified ? 'Verified' : 'Uploaded'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Provided</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <span>Trade License</span>
                      </div>
                      {profile?.verificationDocuments?.tradeLicense?.url ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {profile.verificationDocuments.tradeLicense.verified ? 'Verified' : 'Uploaded'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Provided</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span>Insurance Certificate</span>
                      </div>
                      {profile?.verificationDocuments?.insuranceCertificate?.url ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Provided</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Application Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Timeline items */}
                  <div className="relative">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">Application Submitted</h4>
                        <p className="text-sm text-muted-foreground">
                          {profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : 'N/A'}
                        </p>
                        <p className="text-sm">Your parts provider application was successfully submitted.</p>
                      </div>
                    </div>
                  </div>

                  {profile?.verificationStatus !== 'pending' && (
                    <div className="relative">
                      <div className="absolute left-5 top-0 h-6 w-px bg-border"></div>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          profile?.verificationStatus === 'documents_submitted' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400' 
                            : 'bg-primary'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">Documents Submitted</h4>
                          <p className="text-sm text-muted-foreground">
                            {profile?.updatedAt && ['documents_submitted', 'under_review', 'approved', 'rejected'].includes(profile.verificationStatus)
                              ? new Date(profile.updatedAt).toLocaleString() 
                              : 'In progress'}
                          </p>
                          <p className="text-sm">Your verification documents have been uploaded and submitted.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {['under_review', 'approved', 'rejected'].includes(profile?.verificationStatus || '') && (
                    <div className="relative">
                      <div className="absolute left-5 top-0 h-6 w-px bg-border"></div>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          profile?.verificationStatus === 'under_review' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400' 
                            : 'bg-primary'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">Under Review</h4>
                          <p className="text-sm text-muted-foreground">
                            {profile?.updatedAt && profile.verificationStatus === 'under_review' 
                              ? new Date(profile.updatedAt).toLocaleString() 
                              : 'In progress'}
                          </p>
                          <p className="text-sm">Our team is reviewing your documents and business information.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(profile?.verificationStatus === 'approved' || profile?.verificationStatus === 'rejected') && (
                    <div className="relative">
                      <div className="absolute left-5 top-0 h-6 w-px bg-border"></div>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          profile?.verificationStatus === 'approved' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                          {profile?.verificationStatus === 'approved' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <AlertCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {profile?.verificationStatus === 'approved' ? 'Application Approved' : 'Action Required'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {profile?.verificationDate 
                              ? new Date(profile.verificationDate).toLocaleString()
                              : profile?.updatedAt 
                              ? new Date(profile.updatedAt).toLocaleString() 
                              : 'N/A'}
                          </p>
                          <p className="text-sm">
                            {profile?.verificationStatus === 'approved' 
                              ? 'Congratulations! Your application has been approved and you can start selling.' 
                              : 'Your application requires updates. Please review the feedback above.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}