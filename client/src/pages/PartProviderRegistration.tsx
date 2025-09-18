import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import DocumentUpload, { type UploadedDocument, type DocumentType } from '@/components/DocumentUpload';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';

import {
  User,
  FileText,
  Camera,
  MapPin,
  Star,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building,
  Phone,
  Mail,
  CreditCard,
  Award,
  Briefcase,
  Package,
  Truck,
  ShoppingCart
} from 'lucide-react';

// Form schemas for each step
const personalDetailsSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  alternatePhone: z.string().optional(),
  businessType: z.enum(['individual', 'partnership', 'private_limited', 'public_limited', 'llp'], {
    required_error: 'Please select business type'
  }),
});

const businessDetailsSchema = z.object({
  businessAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(6, 'Valid pincode is required').max(6, 'Pincode must be 6 digits'),
    country: z.string().default('India'),
  }),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolderName: z.string().optional(),
  minOrderValue: z.number().min(0, 'Minimum order value must be 0 or more').default(0),
  maxOrderValue: z.number().min(0, 'Maximum order value must be 0 or more').optional(),
  processingTime: z.number().min(1, 'Processing time must be at least 1 hour').default(24),
  shippingAreas: z.array(z.string()).default([]),
  paymentTerms: z.enum(['immediate', '15_days', '30_days', '45_days']).default('immediate'),
});

const inventorySchema = z.object({
  selectedCategories: z.array(z.string()).min(1, 'Please select at least one parts category'),
  specializations: z.array(z.string()),
  brandsDeal: z.array(z.string()).min(1, 'Please add at least one brand you deal with'),
  qualityCertifications: z.array(z.string()),
});

const documentsSchema = z.object({
  aadharFront: z.boolean(),
  aadharBack: z.boolean(),
  photo: z.boolean(),
  businessLicense: z.boolean().optional(),
  gstCertificate: z.boolean().optional(),
  bankStatement: z.boolean().optional(),
});

type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;
type BusinessDetailsForm = z.infer<typeof businessDetailsSchema>;
type InventoryForm = z.infer<typeof inventorySchema>;
type DocumentsForm = z.infer<typeof documentsSchema>;

interface PartsCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

// Enhanced document types for the DocumentUpload component
const partsProviderDocumentTypes: DocumentType[] = [
  {
    id: 'aadhar_front',
    name: 'Aadhaar Card (Front)',
    description: 'Clear photo of the front side of your Aadhaar card',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure all text is clearly readable',
      'Include all four corners of the card',
      'Avoid glare and shadows',
      'Use good lighting'
    ]
  },
  {
    id: 'aadhar_back',
    name: 'Aadhaar Card (Back)',
    description: 'Clear photo of the back side of your Aadhaar card',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure address is clearly readable',
      'Include all four corners of the card',
      'Avoid glare and shadows'
    ]
  },
  {
    id: 'photo',
    name: 'Profile Photo',
    description: 'A clear headshot photo for your profile',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    tips: [
      'Use good lighting',
      'Face should be clearly visible',
      'Professional appearance recommended',
      'No filters or editing'
    ]
  },
  {
    id: 'business_license',
    name: 'Business License',
    description: 'Valid business license or registration certificate',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure license details are readable',
      'Include issuing authority information',
      'Check expiry date is visible'
    ]
  },
  {
    id: 'gst_certificate',
    name: 'GST Certificate',
    description: 'GST registration certificate for tax compliance',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure GST number is clearly visible',
      'Include issuing authority details',
      'Check certificate validity'
    ]
  },
  {
    id: 'bank_statement',
    name: 'Bank Statement',
    description: 'Recent bank statement for account verification',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Use recent statement (within 3 months)',
      'Ensure account details are visible',
      'Hide sensitive information if needed'
    ]
  }
];

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Business Info', icon: Building },
  { id: 3, title: 'Inventory & Categories', icon: Package },
  { id: 4, title: 'Documents', icon: FileText },
  { id: 5, title: 'Review', icon: CheckCircle },
];

export default function PartProviderRegistration() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form instances
  const personalForm = useForm<PersonalDetailsForm>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      businessName: '',
      contactPerson: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
      email: user?.email || '',
      phone: user?.phone || '',
      alternatePhone: '',
      businessType: 'individual',
    },
  });

  const businessForm = useForm<BusinessDetailsForm>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      businessAddress: {
        street: '',
        city: user?.location?.city || '',
        state: '',
        pincode: user?.location?.pincode || '',
        country: 'India',
      },
      gstNumber: '',
      panNumber: '',
      bankAccountNumber: '',
      bankName: '',
      bankBranch: '',
      ifscCode: '',
      accountHolderName: '',
      minOrderValue: 0,
      maxOrderValue: undefined,
      processingTime: 24,
      shippingAreas: [],
      paymentTerms: 'immediate',
    },
  });

  const inventoryForm = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      selectedCategories: [],
      specializations: [],
      brandsDeal: [],
      qualityCertifications: [],
    },
  });

  const documentsForm = useForm<DocumentsForm>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      aadharFront: false,
      aadharBack: false,
      photo: false,
      businessLicense: false,
      gstCertificate: false,
      bankStatement: false,
    },
  });

  // Fetch parts categories
  const { data: categories } = useQuery({
    queryKey: ['/api/v1/parts-categories'],
    queryFn: () => fetch('/api/v1/parts-categories').then(res => res.json()),
  });

  // Document upload handlers
  const handleDocumentUpload = (newDocuments: UploadedDocument[]) => {
    setUploadedDocuments(prev => {
      // Remove any existing documents of the same type and add new ones
      const filtered = prev.filter(doc => 
        !newDocuments.some(newDoc => newDoc.documentType === doc.documentType)
      );
      return [...filtered, ...newDocuments];
    });
    
    toast({
      title: 'Document uploaded successfully',
      description: 'Your document has been uploaded and is ready for verification.',
    });
  };

  const handleDocumentRemove = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast({
      title: 'Document removed',
      description: 'The document has been removed successfully.',
    });
  };

  // Final registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/v1/parts-provider/register', data);
    },
    onSuccess: () => {
      toast({
        title: 'Registration successful!',
        description: 'Your parts provider application has been submitted for verification.',
      });
      // Invalidate user profile to update role
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/parts-provider/profile'] });
      setLocation('/parts-provider-pending');
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    },
  });

  // Check if required documents are uploaded
  const getRequiredDocumentsStatus = () => {
    const requiredTypes = partsProviderDocumentTypes.filter(type => type.required).map(type => type.id);
    const uploadedTypes = uploadedDocuments.map(doc => doc.documentType);
    return requiredTypes.every(type => uploadedTypes.includes(type));
  };

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form submissions for each step
  const handlePersonalDetailsSubmit = (data: PersonalDetailsForm) => {
    console.log('Personal details:', data);
    nextStep();
  };

  const handleBusinessDetailsSubmit = (data: BusinessDetailsForm) => {
    console.log('Business details:', data);
    nextStep();
  };

  const handleInventorySubmit = (data: InventoryForm) => {
    console.log('Inventory:', data);
    nextStep();
  };

  const handleDocumentsSubmit = (data: DocumentsForm) => {
    console.log('Documents:', data);
    nextStep();
  };

  // Handle final registration
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Check if required documents are uploaded before proceeding
      if (!getRequiredDocumentsStatus()) {
        toast({
          title: 'Missing Required Documents',
          description: 'Please upload all required documents before submitting your application.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const personalData = personalForm.getValues();
      const businessData = businessForm.getValues();
      
      // Format data to match exact backend schema - only include accepted fields
      const registrationData = {
        businessName: personalData.businessName,
        businessType: personalData.businessType,
        businessAddress: businessData.businessAddress,
        gstNumber: businessData.gstNumber || undefined,
        panNumber: businessData.panNumber || undefined,
        bankAccountNumber: businessData.bankAccountNumber || undefined,
        bankName: businessData.bankName || undefined,
        bankBranch: businessData.bankBranch || undefined,
        ifscCode: businessData.ifscCode || undefined,
        accountHolderName: businessData.accountHolderName || undefined,
        minOrderValue: businessData.minOrderValue,
        maxOrderValue: businessData.maxOrderValue,
        processingTime: businessData.processingTime,
        shippingAreas: businessData.shippingAreas,
        paymentTerms: businessData.paymentTerms,
      };

      // Validate the complete registration data against backend schema
      await registerMutation.mutateAsync(registrationData);
    } catch (error) {
      console.error('Registration submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is eligible for registration
  if (!user) {
    setLocation('/login');
    return null;
  }

  if (user.role === 'parts_provider') {
    setLocation('/parts-provider-dashboard');
    return null;
  }

  const progress = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Become a Parts Provider</h1>
              <p className="text-sm text-muted-foreground">
                Complete your registration to start selling parts on FixitQuick
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              data-testid="back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-900 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" data-testid="registration-progress" />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCompleted 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : isActive 
                        ? 'border-primary text-primary bg-primary/10' 
                        : 'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Personal Details */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal & Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...personalForm}>
                    <form onSubmit={personalForm.handleSubmit(handlePersonalDetailsSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={personalForm.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Your business or store name" 
                                  {...field} 
                                  data-testid="input-business-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalForm.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Person *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Your full name" 
                                  {...field} 
                                  data-testid="input-contact-person"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="your@email.com" 
                                  {...field} 
                                  data-testid="input-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+91 98765 43210" 
                                  {...field} 
                                  data-testid="input-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalForm.control}
                          name="alternatePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alternate Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+91 98765 43210" 
                                  {...field} 
                                  data-testid="input-alternate-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={personalForm.control}
                          name="businessType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-business-type">
                                    <SelectValue placeholder="Select business type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="individual">Individual/Freelancer</SelectItem>
                                  <SelectItem value="partnership">Partnership</SelectItem>
                                  <SelectItem value="private_limited">Private Limited</SelectItem>
                                  <SelectItem value="public_limited">Public Limited</SelectItem>
                                  <SelectItem value="llp">LLP</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" data-testid="button-next-personal">
                          Next: Business Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...businessForm}>
                    <form onSubmit={businessForm.handleSubmit(handleBusinessDetailsSubmit)} className="space-y-6">
                      <FormField
                        control={businessForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Description *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your business, types of parts you deal with, and what makes you unique..." 
                                className="min-h-[120px]"
                                {...field} 
                                data-testid="textarea-description"
                              />
                            </FormControl>
                            <FormDescription>
                              Minimum 50 characters. This will be displayed on your profile.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={businessForm.control}
                          name="experience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years of Experience *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="0"
                                  max="50"
                                  placeholder="5" 
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-experience"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="processingTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Processing Time (hours) *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="1"
                                  max="720"
                                  placeholder="24" 
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-processing-time"
                                />
                              </FormControl>
                              <FormDescription>
                                Average time to process and prepare orders for shipping
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="minOrderValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Order Value (₹) *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="0"
                                  placeholder="500" 
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-min-order"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="maxOrderValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Order Value (₹) *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="0"
                                  placeholder="100000" 
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-max-order"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="gstNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GST Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 22AAAAA0000A1Z5" 
                                  {...field} 
                                  data-testid="input-gst"
                                />
                              </FormControl>
                              <FormDescription>
                                GST registration is recommended for business compliance
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="panNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PAN Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., ABCDE1234F" 
                                  {...field} 
                                  data-testid="input-pan"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={prevStep} data-testid="button-prev-business">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button type="submit" data-testid="button-next-business">
                          Next: Inventory & Categories
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Inventory & Categories */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Inventory & Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...inventoryForm}>
                    <form onSubmit={inventoryForm.handleSubmit(handleInventorySubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Parts Categories *</Label>
                          <p className="text-sm text-muted-foreground mb-3">
                            Select the categories of parts you deal with
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {['Automotive', 'Electronics', 'Home Appliances', 'Mobile & Gadgets', 'Tools & Hardware', 'Others'].map((category) => (
                              <div key={category} className="flex items-center space-x-2">
                                <Checkbox id={category} data-testid={`checkbox-category-${category.toLowerCase()}`} />
                                <Label htmlFor={category} className="text-sm">{category}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-base font-medium">Brands You Deal With *</Label>
                          <p className="text-sm text-muted-foreground mb-3">
                            Add brands you sell parts for (one per line)
                          </p>
                          <Textarea 
                            placeholder="e.g., Bosch, Philips, Samsung, LG, Maruti Suzuki, etc."
                            className="min-h-[100px]"
                            data-testid="textarea-brands"
                          />
                        </div>

                        <div>
                          <Label className="text-base font-medium">Specializations</Label>
                          <p className="text-sm text-muted-foreground mb-3">
                            Any specific areas of expertise (optional)
                          </p>
                          <Textarea 
                            placeholder="e.g., Genuine parts, Aftermarket parts, Refurbished parts, etc."
                            className="min-h-[80px]"
                            data-testid="textarea-specializations"
                          />
                        </div>

                        <div>
                          <Label className="text-base font-medium">Quality Certifications</Label>
                          <p className="text-sm text-muted-foreground mb-3">
                            Any quality certifications you have (optional)
                          </p>
                          <Textarea 
                            placeholder="e.g., ISO 9001, OEM Certified, Authorized Dealer, etc."
                            className="min-h-[80px]"
                            data-testid="textarea-certifications"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={prevStep} data-testid="button-prev-inventory">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Previous
                        </Button>
                        <Button type="submit" data-testid="button-next-inventory">
                          Next: Documents
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Documents */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Document Upload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <DocumentUpload
                      documents={uploadedDocuments}
                      onChange={handleDocumentUpload}
                      documentTypes={partsProviderDocumentTypes}
                      endpoint="/api/v1/parts-provider/documents/upload"
                      showStatus={true}
                      allowReupload={true}
                      data-testid="document-upload"
                    />

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={prevStep} data-testid="button-prev-documents">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button 
                        onClick={nextStep}
                        disabled={!getRequiredDocumentsStatus()}
                        data-testid="button-next-documents"
                      >
                        Next: Review & Submit
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Review & Submit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Ready to Submit Application</h3>
                      <p className="text-muted-foreground">
                        Please review your information and submit your application for verification.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Personal Details</h4>
                        <p className="text-sm text-muted-foreground">
                          {personalForm.getValues().businessName} • {personalForm.getValues().email}
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Business Type</h4>
                        <p className="text-sm text-muted-foreground">
                          {personalForm.getValues().businessType}
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Processing Time</h4>
                        <p className="text-sm text-muted-foreground">
                          {businessForm.getValues().processingTime} hours
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Documents</h4>
                        <p className="text-sm text-muted-foreground">
                          {uploadedDocuments.length} documents uploaded
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={prevStep} data-testid="button-prev-review">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <Button 
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting || registerMutation.isPending}
                        data-testid="button-submit-application"
                      >
                        {isSubmitting || registerMutation.isPending ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 mr-2"
                            >
                              <Upload className="w-4 h-4" />
                            </motion.div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}