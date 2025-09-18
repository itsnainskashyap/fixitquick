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
  Briefcase
} from 'lucide-react';

// Backend-compatible form schemas (matches the backend providerRegistrationSchema)
const providerRegistrationSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  businessType: z.enum(['individual', 'company'] as const, {
    required_error: 'Please select business type'
  }),
  serviceIds: z.array(z.string()).min(1, 'At least one service must be selected'),
  skills: z.array(z.string()).optional().default([]),
  experienceYears: z.coerce.number().min(0).max(50),
  serviceRadius: z.coerce.number().min(1).max(100).default(25),
  serviceAreas: z.array(z.object({
    name: z.string(),
    cities: z.array(z.string()),
  })).optional().default([]),
});

// Step-specific schemas that map to the main schema
const personalDetailsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  businessType: z.enum(['individual', 'company'] as const),
});

const businessDetailsSchema = z.object({
  experienceYears: z.coerce.number().min(0, 'Experience must be 0 or more years').max(50, 'Experience cannot exceed 50 years'),
  serviceRadius: z.coerce.number().min(1, 'Service radius must be at least 1 km').max(100, 'Service radius cannot exceed 100 km'),
});

const servicesSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Please select at least one service'),
  skills: z.array(z.string()).optional().default([]),
});

const documentsSchema = z.object({
  aadharFront: z.boolean(),
  aadharBack: z.boolean(),
  photo: z.boolean(),
  businessLicense: z.boolean().optional(),
  insurance: z.boolean().optional(),
});

type ProviderRegistrationForm = z.infer<typeof providerRegistrationSchema>;
type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;
type BusinessDetailsForm = z.infer<typeof businessDetailsSchema>;
type ServicesForm = z.infer<typeof servicesSchema>;
type DocumentsForm = z.infer<typeof documentsSchema>;

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface DocumentUploadStatus {
  aadharFront?: { uploaded: boolean; url?: string; filename?: string };
  aadharBack?: { uploaded: boolean; url?: string; filename?: string };
  photo?: { uploaded: boolean; url?: string; filename?: string };
  businessLicense?: { uploaded: boolean; url?: string; filename?: string };
  insurance?: { uploaded: boolean; url?: string; filename?: string };
  portfolio?: { uploaded: boolean; url?: string; filename?: string }[];
}

// Enhanced document types for the DocumentUpload component
const providerDocumentTypes: DocumentType[] = [
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
    id: 'license',
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
    id: 'insurance',
    name: 'Insurance Certificate',
    description: 'Liability or business insurance certificate',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure certificate is current and valid',
      'Include coverage details',
      'Check expiry date'
    ]
  },
  {
    id: 'certificate',
    name: 'Training Certificates',
    description: 'Professional certifications and training certificates',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Upload relevant skill certificates',
      'Ensure certificate details are readable',
      'Include issuing authority information'
    ]
  }
];

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Business Info', icon: Building },
  { id: 3, title: 'Services & Skills', icon: Star },
  { id: 4, title: 'Documents', icon: FileText },
  { id: 5, title: 'Review', icon: CheckCircle },
];

export default function ProviderRegistration() {
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
      businessType: 'individual',
    },
  });

  const businessForm = useForm<BusinessDetailsForm>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      experienceYears: 0,
      serviceRadius: 25,
    },
  });

  const servicesForm = useForm<ServicesForm>({
    resolver: zodResolver(servicesSchema),
    defaultValues: {
      serviceIds: [],
      skills: [],
    },
  });

  const documentsForm = useForm<DocumentsForm>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      aadharFront: false,
      aadharBack: false,
      photo: false,
      businessLicense: false,
      insurance: false,
    },
  });

  // Fetch service categories - connect to real API
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/v1/services/categories'],
  });

  // Fetch services for selected categories
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/v1/services'],
    select: (data: any) => Array.isArray(data) ? data : [],
  });

  // Document upload handlers - connect to real API
  const handleDocumentUpload = async (newDocuments: UploadedDocument[]) => {
    try {
      // Documents are already uploaded by the DocumentUpload component
      // Just update local state with the uploaded documents
      setUploadedDocuments(prev => {
        const filtered = prev.filter(doc => 
          !newDocuments.some(newDoc => newDoc.documentType === doc.documentType)
        );
        return [...filtered, ...newDocuments];
      });
      
    } catch (error) {
      console.error('Document upload error:', error);
    }
  };

  const handleDocumentRemove = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast({
      title: 'Document removed',
      description: 'The document has been removed successfully.',
    });
  };

  // Provider registration mutation - connect to real API
  const registerMutation = useMutation({
    mutationFn: async (data: ProviderRegistrationForm) => {
      return await apiRequest('POST', '/api/v1/providers/register', data);
    },
    onSuccess: (response) => {
      toast({
        title: 'Registration successful!',
        description: 'Your provider application has been submitted for verification.',
      });
      // Invalidate user profile to update role
      queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/providers/profile'] });
      setLocation('/provider-pending');
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error?.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Document upload mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      
      const response = await fetch('/api/v1/providers/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (response, { documentType }) => {
      toast({
        title: 'Document uploaded successfully',
        description: `Your ${documentType} has been uploaded and is ready for verification.`,
      });
    },
    onError: (error: any, { documentType }) => {
      toast({
        title: 'Upload failed',
        description: `Failed to upload ${documentType}: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Check if required documents are uploaded
  const getRequiredDocumentsStatus = () => {
    const requiredTypes = providerDocumentTypes.filter(type => type.required).map(type => type.id);
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

  const handleServicesSubmit = (data: ServicesForm) => {
    console.log('Services:', data);
    nextStep();
  };

  const handleDocumentsSubmit = (data: DocumentsForm) => {
    console.log('Documents:', data);
    nextStep();
  };

  // Handle final registration - combine all form data into backend-compatible format
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const personalData = personalForm.getValues();
      const businessData = businessForm.getValues();
      const servicesData = servicesForm.getValues();
      
      // Combine data to match backend schema
      const registrationData: ProviderRegistrationForm = {
        businessName: personalData.businessName,
        businessType: personalData.businessType,
        serviceIds: servicesData.serviceIds,
        skills: servicesData.skills || [],
        experienceYears: businessData.experienceYears,
        serviceRadius: businessData.serviceRadius,
        serviceAreas: [], // Default empty for now, could add location step later
      };

      // Validate the complete registration data
      const validatedData = providerRegistrationSchema.parse(registrationData);
      
      await registerMutation.mutateAsync(validatedData);
    } catch (error) {
      console.error('Registration submission error:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: 'Please check all required fields are properly filled.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is eligible for registration
  if (!user) {
    setLocation('/login');
    return null;
  }

  if (user.role === 'service_provider') {
    setLocation('/provider');
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
              <h1 className="text-2xl font-bold text-foreground">Become a Service Provider</h1>
              <p className="text-sm text-muted-foreground">
                Complete your registration to start earning with FixitQuick
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
                                  placeholder="Your business or service name" 
                                  {...field} 
                                  data-testid="input-business-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="md:col-span-2">
                          <div className="bg-muted/50 p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground">
                              <strong>Contact Information:</strong> We'll use your account details ({user?.firstName} {user?.lastName}, {user?.email}, {user?.phone}) for communication.
                            </p>
                          </div>
                        </div>

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
                                  <SelectItem value="company">Company/Corporation</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Choose the type that best describes your business structure.
                              </FormDescription>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={businessForm.control}
                          name="experienceYears"
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
                                  data-testid="input-experience-years"
                                />
                              </FormControl>
                              <FormDescription>
                                How many years have you been providing services in this field?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="serviceRadius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Radius (km) *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="1"
                                  max="100"
                                  placeholder="10" 
                                  {...field}
                                  data-testid="input-service-radius"
                                />
                              </FormControl>
                              <FormDescription>
                                How far are you willing to travel for services?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                      </div>

                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          data-testid="button-back-business"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" data-testid="button-next-business">
                          Next: Services & Skills
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Services & Skills */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    Services & Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...servicesForm}>
                    <form onSubmit={servicesForm.handleSubmit(handleServicesSubmit)} className="space-y-6">
                      {/* Service Categories */}
                      <FormField
                        control={servicesForm.control}
                        name="serviceIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Services Offered *</FormLabel>
                            <FormDescription>
                              Select the specific services you want to offer
                            </FormDescription>
                            {servicesLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-2 text-sm text-muted-foreground">Loading services...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                                {services && services.length > 0 ? (
                                  services.map((service: any) => (
                                    <div key={service.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={service.id}
                                        checked={field.value?.includes(service.id) || false}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            field.onChange([...field.value, service.id]);
                                          } else {
                                            field.onChange(field.value.filter((id: string) => id !== service.id));
                                          }
                                        }}
                                        data-testid={`checkbox-service-${service.id}`}
                                      />
                                      <div className="flex-1">
                                        <Label
                                          htmlFor={service.id}
                                          className="text-sm font-medium leading-none cursor-pointer"
                                        >
                                          {service.name}
                                        </Label>
                                        {service.description && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {service.description.substring(0, 100)}...
                                          </p>
                                        )}
                                        {service.basePrice && (
                                          <p className="text-xs font-medium text-primary mt-1">
                                            Base Price: ₹{service.basePrice}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-2 text-center py-4">
                                    <p className="text-sm text-muted-foreground">No services available</p>
                                  </div>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Skills */}
                      <FormField
                        control={servicesForm.control}
                        name="skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Skills *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="List your key skills, separated by commas. E.g., Plumbing, Pipe fitting, Leak repair, Bathroom installation..." 
                                className="min-h-[80px]"
                                {...field}
                                onChange={(e) => {
                                  const skills = e.target.value.split(',').map(skill => skill.trim()).filter(Boolean);
                                  field.onChange(skills);
                                }}
                                value={field.value?.join(', ') || ''}
                                data-testid="textarea-skills"
                              />
                            </FormControl>
                            <FormDescription>
                              Separate multiple skills with commas
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={prevStep}
                          data-testid="button-back-services"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button type="submit" data-testid="button-next-services">
                          Next: Upload Documents
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
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-sm text-muted-foreground">
                      Please upload clear, high-quality images of your documents. All required documents must be uploaded before you can submit your application.
                    </div>

                    {/* Document Upload Component */}
                    <DocumentUpload
                      documents={uploadedDocuments}
                      onChange={setUploadedDocuments}
                      documentTypes={providerDocumentTypes}
                      endpoint="/api/v1/providers/documents/upload"
                      showStatus={true}
                      allowReupload={true}
                      className="w-full"
                    />


                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={prevStep}
                        data-testid="button-back-documents"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button 
                        type="button"
                        onClick={nextStep}
                        disabled={!getRequiredDocumentsStatus()}
                        data-testid="button-next-documents"
                      >
                        Review Application
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
                    Review Your Application
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-sm text-muted-foreground">
                      Please review all information before submitting your application. You can go back to edit any section.
                    </div>

                    {/* Review Personal Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Personal Details
                      </h3>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div><strong>Business Name:</strong> {personalForm.getValues('businessName')}</div>
                        <div><strong>Contact Person:</strong> {user?.firstName} {user?.lastName}</div>
                        <div><strong>Email:</strong> {user?.email}</div>
                        <div><strong>Phone:</strong> {user?.phone}</div>
                        <div><strong>Business Type:</strong> {personalForm.getValues('businessType')}</div>
                      </div>
                    </div>

                    {/* Review Business Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center">
                        <Building className="w-4 h-4 mr-2" />
                        Business Information
                      </h3>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div><strong>Experience:</strong> {businessForm.getValues('experienceYears')} years</div>
                        <div><strong>Service Radius:</strong> {businessForm.getValues('serviceRadius')} km</div>
                      </div>
                    </div>

                    {/* Review Services */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center">
                        <Star className="w-4 h-4 mr-2" />
                        Services & Skills
                      </h3>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div><strong>Services:</strong> {servicesForm.getValues('serviceIds').length} selected</div>
                        <div><strong>Skills:</strong> {Array.isArray(servicesForm.getValues('skills')) ? servicesForm.getValues('skills').join(', ') : 'None specified'}</div>
                      </div>
                    </div>

                    {/* Review Documents */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Documents
                      </h3>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        {uploadedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center space-x-2">
                            <CheckCircle className={`w-4 h-4 ${
                              doc.status === 'approved' ? 'text-green-600' : 
                              doc.status === 'rejected' ? 'text-red-600' :
                              doc.status === 'under_review' ? 'text-blue-600' : 'text-yellow-600'
                            }`} />
                            <span>{providerDocumentTypes.find(type => type.id === doc.documentType)?.name} - {doc.filename}</span>
                            {doc.status !== 'pending' && (
                              <Badge variant="outline" className="text-xs">
                                {doc.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Terms and conditions */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox required data-testid="checkbox-terms" />
                        <div className="text-sm">
                          <p className="font-medium">I agree to the Terms and Conditions</p>
                          <p className="text-muted-foreground mt-1">
                            By submitting this application, I agree to FixitQuick's Terms of Service and Privacy Policy. 
                            I confirm that all information provided is accurate and I have the right to use the uploaded documents.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={prevStep}
                        data-testid="button-back-review"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Documents
                      </Button>
                      <Button 
                        type="button"
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting || registerMutation.isPending}
                        data-testid="button-submit-application"
                      >
                        {isSubmitting || registerMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Application
                            <CheckCircle className="w-4 h-4 ml-2" />
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