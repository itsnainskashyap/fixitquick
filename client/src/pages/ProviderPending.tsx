import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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
  Refresh,
  ArrowLeft
} from 'lucide-react';

interface ProviderProfile {
  id: string;
  businessName: string;
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  verificationDate?: string;
  documents?: {
    aadhar?: { front?: string; back?: string };
    photo?: { url?: string };
    businessLicense?: { url?: string };
    insurance?: { url?: string };
  };
  adminNotes?: string;
  submittedAt: string;
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        title: 'Application Submitted',
        description: 'Your application has been submitted and is waiting for initial review.'
      };
    case 'under_review':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: FileText,
        title: 'Under Review',
        description: 'Our team is currently reviewing your documents and information.'
      };
    case 'approved':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        title: 'Approved',
        description: 'Congratulations! Your application has been approved.'
      };
    case 'rejected':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
        title: 'Requires Action',
        description: 'Your application needs some updates before approval.'
      };
    case 'suspended':
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertCircle,
        title: 'Suspended',
        description: 'Your provider account has been temporarily suspended.'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Clock,
        title: 'Unknown Status',
        description: 'Please contact support for assistance.'
      };
  }
};

export default function ProviderPending() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch provider profile
  const { data: provider, isLoading, refetch } = useQuery({
    queryKey: ['/api/v1/providers/profile', user?.uid],
    queryFn: () => fetch(`/api/v1/providers/profile`).then(res => res.json()),
    enabled: !!user,
  });

  if (!user) {
    setLocation('/login');
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

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">No Application Found</h2>
            <p className="text-muted-foreground">
              You haven't submitted a provider application yet.
            </p>
            <Button 
              onClick={() => setLocation('/provider/register')}
              data-testid="button-start-application"
            >
              Start Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(provider.verificationStatus);
  const StatusIcon = statusInfo.icon;

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    switch (provider.verificationStatus) {
      case 'pending': return 25;
      case 'under_review': return 50;
      case 'approved': return 100;
      case 'rejected': return 75;
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
              <h1 className="text-2xl font-bold text-foreground">Provider Application Status</h1>
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
                <Refresh className="w-4 h-4 mr-2" />
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
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${statusInfo.color.replace('text-', 'text-').replace('border-', 'bg-').replace('bg-', 'bg-opacity-20 bg-')}`}>
                <StatusIcon className="w-10 h-10" />
              </div>

              {/* Status Title */}
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">{statusInfo.title}</h2>
                <p className="text-lg text-muted-foreground">{statusInfo.description}</p>
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
                {provider.verificationStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Application Details */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
                    <p className="font-medium" data-testid="business-name">{provider.businessName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Application ID</Label>
                    <p className="font-mono text-sm" data-testid="application-id">#{provider.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                    <p data-testid="submitted-date">{new Date(provider.submittedAt).toLocaleDateString()}</p>
                  </div>
                  {provider.verificationDate && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p data-testid="verification-date">{new Date(provider.verificationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            {provider.adminNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Review Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <p data-testid="admin-notes">{provider.adminNotes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {provider.verificationStatus === 'approved' && (
                <Button 
                  onClick={() => setLocation('/provider')}
                  className="flex-1"
                  data-testid="button-go-to-dashboard"
                >
                  Go to Provider Dashboard
                </Button>
              )}
              
              {provider.verificationStatus === 'rejected' && (
                <Button 
                  onClick={() => setLocation('/provider/register')}
                  className="flex-1"
                  data-testid="button-update-application"
                >
                  Update Application
                </Button>
              )}

              <Button 
                variant="outline"
                onClick={() => setLocation('/contact')}
                className="flex-1"
                data-testid="button-contact-support"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
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
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span>Aadhaar Card (Front)</span>
                      </div>
                      {provider.documents?.aadhar?.front ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span>Aadhaar Card (Back)</span>
                      </div>
                      {provider.documents?.aadhar?.back ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <span>Profile Photo</span>
                      </div>
                      {provider.documents?.photo?.url ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Uploaded
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
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <span>Business License</span>
                      </div>
                      {provider.documents?.businessLicense?.url ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Uploaded
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
                      {provider.documents?.insurance?.url ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
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
                          {new Date(provider.submittedAt).toLocaleString()}
                        </p>
                        <p className="text-sm">Your provider application was successfully submitted.</p>
                      </div>
                    </div>
                  </div>

                  {provider.verificationStatus !== 'pending' && (
                    <div className="relative">
                      <div className="absolute left-5 top-0 h-6 w-px bg-border"></div>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          provider.verificationStatus === 'under_review' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-primary'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">Under Review</h4>
                          <p className="text-sm text-muted-foreground">
                            {provider.verificationDate ? new Date(provider.verificationDate).toLocaleString() : 'In progress'}
                          </p>
                          <p className="text-sm">Our team is reviewing your documents and information.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(provider.verificationStatus === 'approved' || provider.verificationStatus === 'rejected') && (
                    <div className="relative">
                      <div className="absolute left-5 top-0 h-6 w-px bg-border"></div>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          provider.verificationStatus === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {provider.verificationStatus === 'approved' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <AlertCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {provider.verificationStatus === 'approved' ? 'Approved' : 'Action Required'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {provider.verificationDate ? new Date(provider.verificationDate).toLocaleString() : ''}
                          </p>
                          <p className="text-sm">
                            {provider.verificationStatus === 'approved' 
                              ? 'Your application has been approved! You can now start accepting bookings.' 
                              : 'Your application requires some updates. Please check the review notes above.'}
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

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <label className={className}>{children}</label>
);