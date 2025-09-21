import { useState, useRef, useEffect } from 'react';
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
import { 
  getCurrentProviderUser,
  signOutProvider,
  isInProviderRegistrationFlow,
  getPendingProviderType
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Calendar,
  Clock,
  IndianRupee,
  Languages,
  Shield,
  Globe,
  Home,
  MessageSquare,
  Truck,
  Timer,
  Settings
} from 'lucide-react';

// Enhanced form schemas for comprehensive provider registration
const personalDetailsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  businessType: z.enum(['individual', 'company'] as const),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required').max(15),
  alternatePhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'] as const).optional(),
  aadharNumber: z.string().length(12, 'Aadhar number must be 12 digits').regex(/^\d{12}$/, 'Aadhar number must contain only digits'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    area: z.string().min(1, 'Area is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().length(6, 'Pincode must be 6 digits').regex(/^\d{6}$/, 'Invalid pincode'),
    landmark: z.string().optional()
  }),
  languagesSpoken: z.array(z.string()).min(1, 'At least one language must be selected'),
  educationLevel: z.enum(['below_10th', '10th_pass', '12th_pass', 'graduate', 'post_graduate', 'diploma', 'technical_certification'] as const).optional()
});

const businessDetailsSchema = z.object({
  experienceYears: z.coerce.number().min(0, 'Experience must be 0 or more years').max(50, 'Experience cannot exceed 50 years'),
  serviceRadius: z.coerce.number().min(1, 'Service radius must be at least 1 km').max(100, 'Service radius cannot exceed 100 km'),
  businessRegistrationNumber: z.string().optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format').optional(),
  businessAddress: z.object({
    sameAsPersonal: z.boolean(),
    street: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    landmark: z.string().optional()
  }),
  bankingDetails: z.object({
    accountHolderName: z.string().min(1, 'Account holder name is required'),
    accountNumber: z.string().min(9, 'Account number is required'),
    confirmAccountNumber: z.string().min(9, 'Please confirm account number'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
    bankName: z.string().min(1, 'Bank name is required'),
    branchName: z.string().min(1, 'Branch name is required'),
    upiId: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format').optional()
  }).refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers don't match",
    path: ["confirmAccountNumber"]
  }),
  workingHours: z.object({
    isFullTime: z.boolean(),
    availability: z.array(z.object({
      day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const),
      isAvailable: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional()
    }))
  }),
  emergencyServices: z.boolean().default(false),
  minimumJobValue: z.coerce.number().min(0).optional(),
  maximumJobValue: z.coerce.number().min(0).optional(),
  vehicleOwned: z.boolean().default(false),
  vehicleType: z.enum(['two_wheeler', 'three_wheeler', 'four_wheeler', 'commercial_vehicle'] as const).optional()
});

const servicesSchema = z.object({
  serviceIds: z.array(z.string()).min(1, 'Please select at least one service'),
  specializations: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  certifications: z.array(z.object({
    name: z.string().min(1, 'Certification name is required'),
    issuingAuthority: z.string().min(1, 'Issuing authority is required'),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    certificateNumber: z.string().optional()
  })).optional().default([]),
  portfolioDescription: z.string().max(1000, 'Portfolio description must be less than 1000 characters').optional(),
  preferredJobTypes: z.array(z.enum(['installation', 'repair', 'maintenance', 'consultation', 'emergency'] as const)).optional().default([]),
  workPreferences: z.object({
    preferredTimeSlots: z.array(z.enum(['morning', 'afternoon', 'evening', 'night'] as const)).optional().default([]),
    weekendAvailability: z.boolean().default(true),
    holidayAvailability: z.boolean().default(false),
    advanceBookingDays: z.coerce.number().min(0).max(30).default(7)
  })
});

const documentsSchema = z.object({
  aadharVerified: z.boolean().default(false),
  photoUploaded: z.boolean().default(false),
  addressProofUploaded: z.boolean().default(false),
  businessLicenseUploaded: z.boolean().default(false),
  certificationsUploaded: z.boolean().default(false),
  insuranceUploaded: z.boolean().default(false),
  portfolioUploaded: z.boolean().default(false),
  policeClearanceUploaded: z.boolean().default(false)
});

// Complete registration schema
const providerRegistrationSchema = personalDetailsSchema
  .merge(businessDetailsSchema)
  .merge(servicesSchema)
  .merge(documentsSchema);

type ProviderRegistrationForm = z.infer<typeof providerRegistrationSchema>;
type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;
type BusinessDetailsForm = z.infer<typeof businessDetailsSchema>;
type ServicesForm = z.infer<typeof servicesSchema>;
type DocumentsForm = z.infer<typeof documentsSchema>;

// Enhanced document types for Indian marketplace
const enhancedDocumentTypes: DocumentType[] = [
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
    description: 'Professional headshot photo for your profile',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    tips: [
      'Use professional attire',
      'Clear, well-lit photo',
      'Face should be clearly visible',
      'No filters or heavy editing'
    ]
  },
  {
    id: 'pan_card',
    name: 'PAN Card',
    description: 'Copy of your PAN card for tax compliance',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure PAN number is clearly visible',
      'Name should match other documents',
      'Card should be valid and not expired'
    ]
  },
  {
    id: 'address_proof',
    name: 'Address Proof',
    description: 'Utility bill, bank statement, or rental agreement',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Document should be recent (within 3 months)',
      'Address should match registration details',
      'Document should be in your name'
    ]
  },
  {
    id: 'business_license',
    name: 'Business License/Registration',
    description: 'Business registration certificate or trade license',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure license is current and valid',
      'Business name should match registration',
      'Include issuing authority information'
    ]
  },
  {
    id: 'certifications',
    name: 'Professional Certifications',
    description: 'Trade certifications, skill certificates, and training documents',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Upload relevant skill certificates',
      'Include certification from recognized institutions',
      'Ensure certificate details are readable'
    ]
  },
  {
    id: 'insurance',
    name: 'Insurance Certificate',
    description: 'Professional liability or business insurance',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Ensure policy is current and active',
      'Include coverage amount details',
      'Beneficiary should match business name'
    ]
  },
  {
    id: 'portfolio',
    name: 'Work Portfolio',
    description: 'Photos of your previous work and projects',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    tips: [
      'Show your best quality work',
      'Include before and after photos',
      'Diverse range of projects preferred',
      'Good lighting and clear images'
    ]
  },
  {
    id: 'police_clearance',
    name: 'Police Verification Certificate',
    description: 'Police clearance certificate for background verification',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Certificate should be recent (within 6 months)',
      'Issued by local police station',
      'Should be in your name',
      'Clear and legible document'
    ]
  }
];

const ENHANCED_STEPS = [
  { id: 1, title: 'Personal Information', icon: User, description: 'Basic details and identity verification' },
  { id: 2, title: 'Business Setup', icon: Building, description: 'Business details and banking information' },
  { id: 3, title: 'Services & Expertise', icon: Star, description: 'Services offered and qualifications' },
  { id: 4, title: 'Documents & Verification', icon: FileText, description: 'Upload required documents' },
  { id: 5, title: 'Review & Submit', icon: CheckCircle, description: 'Final review and submission' },
];

// Indian states for dropdown
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu'
];

// Languages spoken in India
const INDIAN_LANGUAGES = [
  'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Urdu', 'Kannada', 'Odia',
  'Malayalam', 'Punjabi', 'Assamese', 'Maithili', 'Sanskrit', 'Nepali', 'Konkani', 'Sindhi', 'Dogri', 'Manipuri'
];

// Time slots for availability
const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' }
];

export default function EnhancedProviderRegistration() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);

  // Check Google authentication on mount
  useEffect(() => {
    const checkGoogleAuth = () => {
      const currentUser = getCurrentProviderUser();
      if (currentUser) {
        setGoogleUser(currentUser);
        console.log('✅ Google user found:', currentUser.email);
      } else {
        // Redirect to authentication if no Google user
        console.log('❌ No Google authentication found, redirecting...');
        setLocation('/provider/auth');
      }
    };

    checkGoogleAuth();
  }, [setLocation]);

  // Form instances for each step
  const personalForm = useForm<PersonalDetailsForm>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: {
      businessName: '',
      businessType: 'individual',
      firstName: googleUser?.displayName?.split(' ')[0] || '',
      lastName: googleUser?.displayName?.split(' ').slice(1).join(' ') || '',
      email: googleUser?.email || '',
      phone: '',
      alternatePhone: '',
      aadharNumber: '',
      panNumber: '',
      address: {
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        landmark: ''
      },
      languagesSpoken: ['Hindi', 'English'],
      educationLevel: 'graduate'
    },
  });

  const businessForm = useForm<BusinessDetailsForm>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      experienceYears: 0,
      serviceRadius: 25,
      businessRegistrationNumber: '',
      gstNumber: '',
      businessAddress: {
        sameAsPersonal: true,
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        landmark: ''
      },
      bankingDetails: {
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        ifscCode: '',
        bankName: '',
        branchName: '',
        upiId: ''
      },
      workingHours: {
        isFullTime: true,
        availability: [
          { day: 'monday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
          { day: 'tuesday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
          { day: 'wednesday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
          { day: 'thursday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
          { day: 'friday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
          { day: 'saturday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
          { day: 'sunday', isAvailable: false, startTime: '', endTime: '' }
        ]
      },
      emergencyServices: false,
      minimumJobValue: 500,
      maximumJobValue: 50000,
      vehicleOwned: false
    },
  });

  const servicesForm = useForm<ServicesForm>({
    resolver: zodResolver(servicesSchema),
    defaultValues: {
      serviceIds: [],
      specializations: [],
      skills: [],
      certifications: [],
      portfolioDescription: '',
      preferredJobTypes: ['installation', 'repair'],
      workPreferences: {
        preferredTimeSlots: ['morning', 'afternoon'],
        weekendAvailability: true,
        holidayAvailability: false,
        advanceBookingDays: 7
      }
    },
  });

  const documentsForm = useForm<DocumentsForm>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      aadharVerified: false,
      photoUploaded: false,
      addressProofUploaded: false,
      businessLicenseUploaded: false,
      certificationsUploaded: false,
      insuranceUploaded: false,
      portfolioUploaded: false,
      policeClearanceUploaded: false
    },
  });

  // Fetch available services for selection
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    enabled: currentStep === 3
  });

  // Calculate progress percentage
  const progressPercentage = (currentStep / ENHANCED_STEPS.length) * 100;

  // Navigation functions
  const nextStep = () => {
    if (currentStep < ENHANCED_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step validation functions
  const validateCurrentStep = async () => {
    switch (currentStep) {
      case 1:
        return await personalForm.trigger();
      case 2:
        return await businessForm.trigger();
      case 3:
        return await servicesForm.trigger();
      case 4:
        return await documentsForm.trigger();
      default:
        return true;
    }
  };

  // Handle step navigation with validation
  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      nextStep();
    } else {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the errors before proceeding to the next step.",
      });
    }
  };

  // Document upload handlers
  const handleDocumentUpload = (documentType: string, uploadedDoc: UploadedDocument) => {
    setUploadedDocuments(prev => [
      ...prev.filter(doc => doc.documentType !== documentType),
      uploadedDoc
    ]);

    // Update form state based on document type
    switch (documentType) {
      case 'aadhar_front':
      case 'aadhar_back':
        documentsForm.setValue('aadharVerified', 
          uploadedDocuments.some(doc => doc.documentType === 'aadhar_front') ||
          uploadedDocuments.some(doc => doc.documentType === 'aadhar_back')
        );
        break;
      case 'photo':
        documentsForm.setValue('photoUploaded', true);
        break;
      case 'address_proof':
        documentsForm.setValue('addressProofUploaded', true);
        break;
      // Add other document types as needed
    }

    toast({
      title: "Document Uploaded",
      description: `${enhancedDocumentTypes.find(type => type.id === documentType)?.name} uploaded successfully.`,
    });
  };

  const handleDocumentDelete = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast({
      title: "Document Removed",
      description: "Document has been removed successfully.",
    });
  };

  // Submit registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: ProviderRegistrationForm) => {
      const response = await apiRequest('/api/provider/register', 'POST', {
        ...data,
        documents: uploadedDocuments,
        authMethod: 'google',
        googleUserId: googleUser?.uid
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Registration Submitted!",
        description: "Your provider registration has been submitted for review.",
      });
      setLocation('/provider-pending');
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "There was an error submitting your registration.",
      });
    },
  });

  // Final submission handler
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const personalData = personalForm.getValues();
      const businessData = businessForm.getValues();
      const servicesData = servicesForm.getValues();
      const documentsData = documentsForm.getValues();

      const completeData = {
        ...personalData,
        ...businessData,
        ...servicesData,
        ...documentsData
      };

      await registerMutation.mutateAsync(completeData);
    } catch (error) {
      console.error('Registration submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google sign out
  const handleSignOut = async () => {
    try {
      await signOutProvider();
      setLocation('/provider/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!googleUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                Service Provider Registration
              </h1>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Mail className="w-3 h-3 mr-1" />
                {googleUser.email}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Step {currentStep} of {ENHANCED_STEPS.length}: {ENHANCED_STEPS[currentStep - 1]?.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {ENHANCED_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex flex-col items-center space-y-2 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                      isActive ? 'border-primary bg-primary/10' : 
                      isCompleted ? 'border-green-600 bg-green-50' : 'border-muted-foreground/30'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-24 text-center">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < ENHANCED_STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-600' : 'bg-muted-foreground/30'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form content */}
        <main className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Personal Details Step */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Personal Information
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Provide your personal details and contact information. This information will be used for identity verification.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Form {...personalForm}>
                      <form className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={personalForm.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business/Service Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter your business name" data-testid="input-business-name" />
                                </FormControl>
                                <FormDescription>
                                  This will be displayed to customers
                                </FormDescription>
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
                                    <SelectItem value="company">Company/Partnership</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter first name" data-testid="input-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter last name" data-testid="input-last-name" />
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
                                  <Input {...field} type="email" placeholder="Enter email" disabled data-testid="input-email" />
                                </FormControl>
                                <FormDescription>
                                  This is your Google account email and cannot be changed
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Phone Number *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="+91 9876543210" data-testid="input-phone" />
                                </FormControl>
                                <FormDescription>
                                  This will be used for customer contact and verification
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="alternatePhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Alternate Phone Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="+91 9876543210" data-testid="input-alternate-phone" />
                                </FormControl>
                                <FormDescription>
                                  Optional backup contact number
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="aadharNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aadhaar Number *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="123456789012" maxLength={12} data-testid="input-aadhar" />
                                </FormControl>
                                <FormDescription>
                                  12-digit Aadhaar number for identity verification
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="panNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PAN Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="ABCDE1234F" maxLength={10} data-testid="input-pan" />
                                </FormControl>
                                <FormDescription>
                                  Required for tax compliance (optional for individuals)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-gender">
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={personalForm.control}
                            name="educationLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Education Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-education">
                                      <SelectValue placeholder="Select education level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="below_10th">Below 10th</SelectItem>
                                    <SelectItem value="10th_pass">10th Pass</SelectItem>
                                    <SelectItem value="12th_pass">12th Pass</SelectItem>
                                    <SelectItem value="diploma">Diploma</SelectItem>
                                    <SelectItem value="graduate">Graduate</SelectItem>
                                    <SelectItem value="post_graduate">Post Graduate</SelectItem>
                                    <SelectItem value="technical_certification">Technical Certification</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Address Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center">
                            <Home className="w-5 h-5 mr-2" />
                            Residential Address
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={personalForm.control}
                              name="address.street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Street Address *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="House/Flat no, Building name" data-testid="input-street" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={personalForm.control}
                              name="address.area"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Area/Locality *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Area, Locality" data-testid="input-area" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={personalForm.control}
                              name="address.city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="City" data-testid="input-city" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={personalForm.control}
                              name="address.state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State *</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-state">
                                        <SelectValue placeholder="Select state" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {INDIAN_STATES.map((state) => (
                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={personalForm.control}
                              name="address.pincode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pincode *</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="123456" maxLength={6} data-testid="input-pincode" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={personalForm.control}
                              name="address.landmark"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Landmark</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Near prominent landmark" data-testid="input-landmark" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Languages Section */}
                        <FormField
                          control={personalForm.control}
                          name="languagesSpoken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <Languages className="w-4 h-4 mr-2" />
                                Languages Spoken *
                              </FormLabel>
                              <FormDescription>
                                Select all languages you can communicate in with customers
                              </FormDescription>
                              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                                {INDIAN_LANGUAGES.map((language) => (
                                  <div key={language} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`lang-${language}`}
                                      checked={field.value?.includes(language)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, language]);
                                        } else {
                                          field.onChange(field.value.filter((lang: string) => lang !== language));
                                        }
                                      }}
                                      data-testid={`checkbox-lang-${language.toLowerCase()}`}
                                    />
                                    <label htmlFor={`lang-${language}`} className="text-sm">{language}</label>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end">
                          <Button 
                            type="button" 
                            onClick={handleNextStep}
                            data-testid="button-next-personal"
                          >
                            Next: Business Setup
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* Navigation buttons for other steps would be added here */}
              {currentStep > 1 && (
                <div className="flex justify-between mt-8">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  {currentStep < ENHANCED_STEPS.length && (
                    <Button 
                      type="button" 
                      onClick={handleNextStep}
                      data-testid="button-next"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}

              {/* Placeholder for other steps - would implement similar detailed forms */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Business Setup - Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Business details, banking information, and working hours configuration will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Continue with other steps... */}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}