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

// Form schemas for each step
const personalDetailsSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  alternatePhone: z.string().optional(),
  businessType: z.enum(['individual', 'partnership', 'company'], {
    required_error: 'Please select business type'
  }),
});

const businessDetailsSchema = z.object({
  description: z.string().min(50, 'Business description must be at least 50 characters'),
  experience: z.number().min(0, 'Experience must be 0 or more years').max(50, 'Experience cannot exceed 50 years'),
  serviceRadius: z.number().min(1, 'Service radius must be at least 1 km').max(100, 'Service radius cannot exceed 100 km'),
  emergencyServices: z.boolean(),
  priceRange: z.enum(['budget', 'mid', 'premium'], {
    required_error: 'Please select price range'
  }),
});

const servicesSchema = z.object({
  selectedCategories: z.array(z.string()).min(1, 'Please select at least one service category'),
  skills: z.array(z.string()).min(1, 'Please add at least one skill'),
  specializations: z.array(z.string()),
});

const documentsSchema = z.object({
  aadharFront: z.boolean(),
  aadharBack: z.boolean(),
  photo: z.boolean(),
  businessLicense: z.boolean().optional(),
  insurance: z.boolean().optional(),
});

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
  const [documents, setDocuments] = useState<DocumentUploadStatus>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File upload refs
  const fileInputRefs = {
    aadharFront: useRef<HTMLInputElement>(null),
    aadharBack: useRef<HTMLInputElement>(null),
    photo: useRef<HTMLInputElement>(null),
    businessLicense: useRef<HTMLInputElement>(null),
    insurance: useRef<HTMLInputElement>(null),
  };

  // Form instances
  const personalForm = useForm<PersonalDetailsForm>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      businessName: '',
      contactPerson: user?.displayName || '',
      email: user?.email || '',
      phone: user?.phoneNumber || '',
      alternatePhone: '',
      businessType: 'individual',
    },
  });

  const businessForm = useForm<BusinessDetailsForm>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      description: '',
      experience: 0,
      serviceRadius: 10,
      emergencyServices: false,
      priceRange: 'mid',
    },
  });

  const servicesForm = useForm<ServicesForm>({
    resolver: zodResolver(servicesSchema),
    defaultValues: {
      selectedCategories: [],
      skills: [],
      specializations: [],
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

  // Fetch service categories
  const { data: categories } = useQuery({
    queryKey: ['/api/v1/categories'],
    queryFn: () => fetch('/api/v1/categories').then(res => res.json()),
  });

  // Document upload mutation
  const documentUploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const response = await apiRequest('POST', '/api/v1/providers/documents/upload', formData, {
        'Content-Type': 'multipart/form-data',
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setDocuments(prev => ({
        ...prev,
        [variables.documentType]: {
          uploaded: true,
          url: data.documentUrl,
          filename: data.filename
        }
      }));
      toast({
        title: 'Document uploaded successfully',
        description: `${variables.documentType} has been uploaded`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });

  // Final registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/v1/providers/apply', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Registration successful!',
        description: 'Your provider application has been submitted for verification.',
      });
      setLocation('/provider-pending');
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload JPG, PNG, WebP, or PDF files only',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload files smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Upload file
    documentUploadMutation.mutate({ file, documentType });
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

  // Handle final registration
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    
    const personalData = personalForm.getValues();
    const businessData = businessForm.getValues();
    const servicesData = servicesForm.getValues();
    
    const registrationData = {
      ...personalData,
      ...businessData,
      serviceCategories: servicesData.selectedCategories,
      skills: servicesData.skills,
      specializations: servicesData.specializations,
    };

    registerMutation.mutate(registrationData);
    setIsSubmitting(false);
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
                                  <SelectItem value="company">Company/Corporation</SelectItem>
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
                                placeholder="Describe your business, services offered, and what makes you unique..." 
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
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-experience"
                                />
                              </FormControl>
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
                                  onChange={e => field.onChange(parseInt(e.target.value) || 10)}
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

                        <FormField
                          control={businessForm.control}
                          name="priceRange"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price Range *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-price-range">
                                    <SelectValue placeholder="Select price range" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="budget">Budget-friendly</SelectItem>
                                  <SelectItem value="mid">Mid-range</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={businessForm.control}
                          name="emergencyServices"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-emergency-services"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Emergency Services</FormLabel>
                                <FormDescription>
                                  I can provide 24/7 emergency services
                                </FormDescription>
                              </div>
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
                        name="selectedCategories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Categories *</FormLabel>
                            <FormDescription>
                              Select the categories of services you provide
                            </FormDescription>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {categories?.map((category: ServiceCategory) => (
                                <div key={category.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`category-${category.id}`}
                                    checked={field.value.includes(category.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, category.id]);
                                      } else {
                                        field.onChange(field.value.filter((id) => id !== category.id));
                                      }
                                    }}
                                    data-testid={`checkbox-category-${category.id}`}
                                  />
                                  <Label 
                                    htmlFor={`category-${category.id}`} 
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {category.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
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
                                value={field.value.join(', ')}
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

                      {/* Specializations */}
                      <FormField
                        control={servicesForm.control}
                        name="specializations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specializations</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any special certifications or areas of expertise..." 
                                className="min-h-[80px]"
                                {...field}
                                onChange={(e) => {
                                  const specs = e.target.value.split(',').map(spec => spec.trim()).filter(Boolean);
                                  field.onChange(specs);
                                }}
                                value={field.value.join(', ')}
                                data-testid="textarea-specializations"
                              />
                            </FormControl>
                            <FormDescription>
                              Optional: Specialized areas or certifications
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

                    {/* Required Documents */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Required Documents</h3>
                      
                      {/* Aadhaar Front */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">Aadhaar Card (Front)</h4>
                            <p className="text-sm text-muted-foreground">Clear photo of front side</p>
                          </div>
                          {documents.aadharFront?.uploaded ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="outline">Required</Badge>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRefs.aadharFront}
                          onChange={(e) => handleFileUpload(e, 'aadhar_front')}
                          accept="image/*,application/pdf"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.aadharFront.current?.click()}
                          disabled={documentUploadMutation.isPending}
                          data-testid="button-upload-aadhar-front"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {documents.aadharFront?.uploaded ? 'Replace File' : 'Upload File'}
                        </Button>
                        {documents.aadharFront?.filename && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {documents.aadharFront.filename}
                          </p>
                        )}
                      </div>

                      {/* Aadhaar Back */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">Aadhaar Card (Back)</h4>
                            <p className="text-sm text-muted-foreground">Clear photo of back side</p>
                          </div>
                          {documents.aadharBack?.uploaded ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="outline">Required</Badge>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRefs.aadharBack}
                          onChange={(e) => handleFileUpload(e, 'aadhar_back')}
                          accept="image/*,application/pdf"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.aadharBack.current?.click()}
                          disabled={documentUploadMutation.isPending}
                          data-testid="button-upload-aadhar-back"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {documents.aadharBack?.uploaded ? 'Replace File' : 'Upload File'}
                        </Button>
                        {documents.aadharBack?.filename && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {documents.aadharBack.filename}
                          </p>
                        )}
                      </div>

                      {/* Profile Photo */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">Profile Photo</h4>
                            <p className="text-sm text-muted-foreground">Clear headshot for your profile</p>
                          </div>
                          {documents.photo?.uploaded ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="outline">Required</Badge>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRefs.photo}
                          onChange={(e) => handleFileUpload(e, 'photo')}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.photo.current?.click()}
                          disabled={documentUploadMutation.isPending}
                          data-testid="button-upload-photo"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {documents.photo?.uploaded ? 'Replace Photo' : 'Upload Photo'}
                        </Button>
                        {documents.photo?.filename && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {documents.photo.filename}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Optional Documents */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground">Optional Documents</h3>
                      <p className="text-sm text-muted-foreground">
                        These documents can help improve your credibility and get more bookings
                      </p>
                      
                      {/* Business License */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">Business License</h4>
                            <p className="text-sm text-muted-foreground">Valid business license or registration</p>
                          </div>
                          {documents.businessLicense?.uploaded ? (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Optional</Badge>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRefs.businessLicense}
                          onChange={(e) => handleFileUpload(e, 'license')}
                          accept="image/*,application/pdf"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.businessLicense.current?.click()}
                          disabled={documentUploadMutation.isPending}
                          data-testid="button-upload-license"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {documents.businessLicense?.uploaded ? 'Replace File' : 'Upload License'}
                        </Button>
                      </div>

                      {/* Insurance */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">Insurance Certificate</h4>
                            <p className="text-sm text-muted-foreground">Liability or business insurance</p>
                          </div>
                          {documents.insurance?.uploaded ? (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Optional</Badge>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRefs.insurance}
                          onChange={(e) => handleFileUpload(e, 'insurance')}
                          accept="image/*,application/pdf"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs.insurance.current?.click()}
                          disabled={documentUploadMutation.isPending}
                          data-testid="button-upload-insurance"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {documents.insurance?.uploaded ? 'Replace File' : 'Upload Certificate'}
                        </Button>
                      </div>
                    </div>

                    {/* Upload status */}
                    {documentUploadMutation.isPending && (
                      <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-blue-800 dark:text-blue-200">Uploading document...</span>
                      </div>
                    )}

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
                        disabled={!documents.aadharFront?.uploaded || !documents.aadharBack?.uploaded || !documents.photo?.uploaded}
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
                        <div><strong>Contact Person:</strong> {personalForm.getValues('contactPerson')}</div>
                        <div><strong>Email:</strong> {personalForm.getValues('email')}</div>
                        <div><strong>Phone:</strong> {personalForm.getValues('phone')}</div>
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
                        <div><strong>Experience:</strong> {businessForm.getValues('experience')} years</div>
                        <div><strong>Service Radius:</strong> {businessForm.getValues('serviceRadius')} km</div>
                        <div><strong>Price Range:</strong> {businessForm.getValues('priceRange')}</div>
                        <div><strong>Emergency Services:</strong> {businessForm.getValues('emergencyServices') ? 'Yes' : 'No'}</div>
                        <div><strong>Description:</strong> {businessForm.getValues('description').substring(0, 100)}...</div>
                      </div>
                    </div>

                    {/* Review Services */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center">
                        <Star className="w-4 h-4 mr-2" />
                        Services & Skills
                      </h3>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div><strong>Categories:</strong> {servicesForm.getValues('selectedCategories').length} selected</div>
                        <div><strong>Skills:</strong> {servicesForm.getValues('skills').join(', ')}</div>
                        {servicesForm.getValues('specializations').length > 0 && (
                          <div><strong>Specializations:</strong> {servicesForm.getValues('specializations').join(', ')}</div>
                        )}
                      </div>
                    </div>

                    {/* Review Documents */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Documents
                      </h3>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Aadhaar Card (Front) - {documents.aadharFront?.filename}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Aadhaar Card (Back) - {documents.aadharBack?.filename}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Profile Photo - {documents.photo?.filename}</span>
                        </div>
                        {documents.businessLicense?.uploaded && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span>Business License - {documents.businessLicense?.filename}</span>
                          </div>
                        )}
                        {documents.insurance?.uploaded && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span>Insurance Certificate - {documents.insurance?.filename}</span>
                          </div>
                        )}
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