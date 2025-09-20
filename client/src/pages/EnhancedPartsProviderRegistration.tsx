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
  Package,
  Building,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Factory,
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
  Settings,
  MapPin,
  User,
  Box,
  Warehouse,
  ShoppingCart,
  TrendingUp,
  Star,
  Zap,
  Target,
  Users,
  Database,
  BarChart3
} from 'lucide-react';

// Comprehensive schemas for parts provider registration
const businessDetailsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  businessType: z.enum(['sole_proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp'] as const),
  businessRegistrationNumber: z.string().min(1, 'Business registration number is required'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  tanNumber: z.string().optional(),
  incorporationDate: z.string().optional(),
  companySize: z.enum(['micro', 'small', 'medium', 'large'] as const),
  yearEstablished: z.coerce.number().min(1950).max(new Date().getFullYear()),
  website: z.string().url().optional().or(z.literal('')),
  businessDescription: z.string().min(10, 'Business description is required').max(1000),
  manufacturingUnit: z.boolean().default(false),
  warehouseCapacity: z.coerce.number().min(0),
  qualityCertifications: z.array(z.string()).optional().default([]),
  environmentalClearances: z.boolean().default(false)
});

const contactDetailsSchema = z.object({
  contactPersonName: z.string().min(1, 'Contact person name is required'),
  designation: z.string().min(1, 'Designation is required'),
  primaryPhone: z.string().min(10, 'Valid phone number is required').max(15),
  secondaryPhone: z.string().optional(),
  email: z.string().email('Valid email is required'),
  whatsappNumber: z.string().optional(),
  businessAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    area: z.string().min(1, 'Area is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().length(6, 'Pincode must be 6 digits').regex(/^\d{6}$/, 'Invalid pincode'),
    landmark: z.string().optional()
  }),
  warehouseAddress: z.object({
    sameAsBusinessAddress: z.boolean(),
    street: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    landmark: z.string().optional()
  }),
  operationalHours: z.object({
    weekdays: z.object({
      startTime: z.string(),
      endTime: z.string()
    }),
    weekends: z.object({
      isOpen: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional()
    }),
    publicHolidays: z.boolean().default(false)
  })
});

const bankingDetailsSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string().min(9, 'Account number is required'),
  confirmAccountNumber: z.string().min(9, 'Please confirm account number'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  bankName: z.string().min(1, 'Bank name is required'),
  branchName: z.string().min(1, 'Branch name is required'),
  accountType: z.enum(['savings', 'current', 'overdraft'] as const),
  upiId: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format').optional(),
  preferredPaymentMethods: z.array(z.enum(['bank_transfer', 'upi', 'cheque', 'online_payment'] as const)).min(1, 'Select at least one payment method'),
  creditDays: z.coerce.number().min(0).max(180),
  minimumOrderValue: z.coerce.number().min(0),
  securityDeposit: z.coerce.number().min(0)
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: "Account numbers don't match",
  path: ["confirmAccountNumber"]
});

const catalogDetailsSchema = z.object({
  productCategories: z.array(z.string()).min(1, 'Select at least one product category'),
  specializations: z.array(z.string()).optional().default([]),
  brands: z.array(z.object({
    name: z.string().min(1, 'Brand name is required'),
    isAuthorizedDealer: z.boolean(),
    authorizationNumber: z.string().optional()
  })).min(1, 'Add at least one brand'),
  productRange: z.object({
    totalSKUs: z.coerce.number().min(1),
    fastMovingItems: z.coerce.number().min(0),
    averageInventoryValue: z.coerce.number().min(0),
    monthlyTurnover: z.coerce.number().min(0)
  }),
  supplierCapacity: z.object({
    dailyOrderCapacity: z.coerce.number().min(1),
    maxOrderValue: z.coerce.number().min(0),
    deliveryRadius: z.coerce.number().min(1).max(500),
    stockUpdateFrequency: z.enum(['real_time', 'daily', 'weekly'] as const),
    bulkOrderDiscount: z.boolean().default(false),
    emergencySupplyCapability: z.boolean().default(false)
  }),
  qualityAssurance: z.object({
    qualityCheckProcess: z.boolean().default(true),
    returnPolicy: z.string().min(1, 'Return policy is required'),
    warrantySupport: z.boolean().default(true),
    defectiveItemsHandling: z.string().min(1, 'Defective items handling process is required')
  }),
  logisticsCapabilities: z.object({
    ownDeliveryFleet: z.boolean().default(false),
    fleetSize: z.coerce.number().min(0).optional(),
    thirdPartyLogistics: z.boolean().default(true),
    sameDeliveryCapability: z.boolean().default(false),
    packagingStandards: z.array(z.string()).optional().default([]),
    trackingSupport: z.boolean().default(true)
  })
});

const documentsSchema = z.object({
  businessRegistrationUploaded: z.boolean().default(false),
  gstCertificateUploaded: z.boolean().default(false),
  panCardUploaded: z.boolean().default(false),
  tradeLicenseUploaded: z.boolean().default(false),
  bankStatementUploaded: z.boolean().default(false),
  msmeRegistrationUploaded: z.boolean().default(false),
  authorizedDealerCertificatesUploaded: z.boolean().default(false),
  qualityCertificationsUploaded: z.boolean().default(false),
  warehousePhotosUploaded: z.boolean().default(false),
  productCatalogUploaded: z.boolean().default(false)
});

// Complete registration schema
const partsProviderRegistrationSchema = businessDetailsSchema
  .merge(contactDetailsSchema)
  .merge(bankingDetailsSchema)
  .merge(catalogDetailsSchema)
  .merge(documentsSchema);

type PartsProviderRegistrationForm = z.infer<typeof partsProviderRegistrationSchema>;
type BusinessDetailsForm = z.infer<typeof businessDetailsSchema>;
type ContactDetailsForm = z.infer<typeof contactDetailsSchema>;
type BankingDetailsForm = z.infer<typeof bankingDetailsSchema>;
type CatalogDetailsForm = z.infer<typeof catalogDetailsSchema>;
type DocumentsForm = z.infer<typeof documentsSchema>;

// Enhanced document types for parts providers
const partsProviderDocumentTypes: DocumentType[] = [
  {
    id: 'business_registration',
    name: 'Business Registration Certificate',
    description: 'Certificate of incorporation or business registration',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Original registration certificate from ROC/Registrar',
      'Ensure all details are clearly visible',
      'Document should be current and valid'
    ]
  },
  {
    id: 'gst_certificate',
    name: 'GST Registration Certificate',
    description: 'Valid GST registration certificate',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Certificate should show active GST status',
      'GST number must match registration details',
      'Include all pages if multi-page document'
    ]
  },
  {
    id: 'pan_card',
    name: 'PAN Card',
    description: 'Company PAN card for tax compliance',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Company PAN card, not individual',
      'Ensure PAN number is clearly visible',
      'Name should match business registration'
    ]
  },
  {
    id: 'trade_license',
    name: 'Trade License',
    description: 'Municipal trade license for business operations',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Current and valid trade license',
      'Should cover parts trading/distribution',
      'Issued by local municipal authority'
    ]
  },
  {
    id: 'bank_statement',
    name: 'Bank Statement',
    description: 'Recent bank statement (last 3 months)',
    required: true,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Last 3 months bank statement',
      'Account should match banking details',
      'Bank letterhead/stamp should be visible'
    ]
  },
  {
    id: 'msme_registration',
    name: 'MSME Registration',
    description: 'Micro, Small & Medium Enterprise registration certificate',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Udyam registration certificate',
      'Valid and current registration',
      'Helps with priority vendor status'
    ]
  },
  {
    id: 'authorized_dealer_certificates',
    name: 'Authorized Dealer Certificates',
    description: 'Brand authorization certificates',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'Official brand authorization letters',
      'Current and valid certificates',
      'Upload separate files for each brand'
    ]
  },
  {
    id: 'quality_certifications',
    name: 'Quality Certifications',
    description: 'ISO, quality management certificates',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    tips: [
      'ISO certifications (ISO 9001, etc.)',
      'Quality management certificates',
      'Industry-specific certifications'
    ]
  },
  {
    id: 'warehouse_photos',
    name: 'Warehouse/Storage Facility Photos',
    description: 'Photos of your warehouse and storage facilities',
    required: false,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    tips: [
      'Show organized storage systems',
      'Include inventory management setup',
      'Good lighting and clear images',
      'Multiple angles of facility'
    ]
  },
  {
    id: 'product_catalog',
    name: 'Product Catalog',
    description: 'Comprehensive product catalog with pricing',
    required: false,
    allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    maxSize: 20 * 1024 * 1024,
    tips: [
      'Detailed product specifications',
      'Include pricing information',
      'Brand-wise categorization',
      'Regular update capability'
    ]
  }
];

const PARTS_PROVIDER_STEPS = [
  { id: 1, title: 'Business Details', icon: Building, description: 'Company information and legal details' },
  { id: 2, title: 'Contact & Location', icon: MapPin, description: 'Contact details and addresses' },
  { id: 3, title: 'Banking & Finance', icon: CreditCard, description: 'Banking details and payment preferences' },
  { id: 4, title: 'Product Catalog', icon: Package, description: 'Products, brands, and capabilities' },
  { id: 5, title: 'Documents & Compliance', icon: FileText, description: 'Upload required documents' },
  { id: 6, title: 'Review & Submit', icon: CheckCircle, description: 'Final review and submission' },
];

// Product categories for parts providers
const PRODUCT_CATEGORIES = [
  { id: 'electrical', name: 'Electrical Components', description: 'Switches, wires, panels, motors' },
  { id: 'plumbing', name: 'Plumbing Parts', description: 'Pipes, fittings, valves, fixtures' },
  { id: 'hardware', name: 'Hardware & Tools', description: 'Screws, bolts, tools, fasteners' },
  { id: 'appliance_parts', name: 'Appliance Parts', description: 'AC parts, washing machine parts' },
  { id: 'automotive', name: 'Automotive Parts', description: 'Car parts, bike parts, accessories' },
  { id: 'building_materials', name: 'Building Materials', description: 'Cement, tiles, paint, adhesives' },
  { id: 'safety_equipment', name: 'Safety Equipment', description: 'PPE, safety gear, protection equipment' },
  { id: 'electronics', name: 'Electronic Components', description: 'Circuits, sensors, controllers' }
];

// Business size categories
const BUSINESS_SIZES = [
  { value: 'micro', label: 'Micro Enterprise', description: 'Turnover up to ₹5 crores' },
  { value: 'small', label: 'Small Enterprise', description: 'Turnover ₹5-50 crores' },
  { value: 'medium', label: 'Medium Enterprise', description: 'Turnover ₹50-250 crores' },
  { value: 'large', label: 'Large Enterprise', description: 'Turnover above ₹250 crores' }
];

// Quality certifications
const QUALITY_CERTIFICATIONS = [
  'ISO 9001:2015', 'ISO 14001:2015', 'OHSAS 18001', 'CE Marking', 'BIS Certification',
  'ISI Mark', 'Agmark', 'FPO Mark', 'Ecomark', 'Energy Star'
];

// Indian states (same as service provider)
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu'
];

export default function EnhancedPartsProviderRegistration() {
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
  const businessForm = useForm<BusinessDetailsForm>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      businessName: '',
      businessType: 'private_limited',
      businessRegistrationNumber: '',
      gstNumber: '',
      panNumber: '',
      tanNumber: '',
      incorporationDate: '',
      companySize: 'small',
      yearEstablished: new Date().getFullYear() - 5,
      website: '',
      businessDescription: '',
      manufacturingUnit: false,
      warehouseCapacity: 1000,
      qualityCertifications: [],
      environmentalClearances: false
    },
  });

  const contactForm = useForm<ContactDetailsForm>({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: {
      contactPersonName: googleUser?.displayName || '',
      designation: '',
      primaryPhone: '',
      secondaryPhone: '',
      email: googleUser?.email || '',
      whatsappNumber: '',
      businessAddress: {
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        landmark: ''
      },
      warehouseAddress: {
        sameAsBusinessAddress: true,
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        landmark: ''
      },
      operationalHours: {
        weekdays: {
          startTime: '09:00',
          endTime: '18:00'
        },
        weekends: {
          isOpen: true,
          startTime: '10:00',
          endTime: '16:00'
        },
        publicHolidays: false
      }
    },
  });

  const bankingForm = useForm<BankingDetailsForm>({
    resolver: zodResolver(bankingDetailsSchema),
    defaultValues: {
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'current',
      upiId: '',
      preferredPaymentMethods: ['bank_transfer', 'upi'],
      creditDays: 30,
      minimumOrderValue: 1000,
      securityDeposit: 10000
    },
  });

  const catalogForm = useForm<CatalogDetailsForm>({
    resolver: zodResolver(catalogDetailsSchema),
    defaultValues: {
      productCategories: [],
      specializations: [],
      brands: [{ name: '', isAuthorizedDealer: false, authorizationNumber: '' }],
      productRange: {
        totalSKUs: 100,
        fastMovingItems: 50,
        averageInventoryValue: 500000,
        monthlyTurnover: 1000000
      },
      supplierCapacity: {
        dailyOrderCapacity: 50,
        maxOrderValue: 500000,
        deliveryRadius: 50,
        stockUpdateFrequency: 'daily',
        bulkOrderDiscount: true,
        emergencySupplyCapability: true
      },
      qualityAssurance: {
        qualityCheckProcess: true,
        returnPolicy: '',
        warrantySupport: true,
        defectiveItemsHandling: ''
      },
      logisticsCapabilities: {
        ownDeliveryFleet: false,
        fleetSize: 0,
        thirdPartyLogistics: true,
        sameDeliveryCapability: false,
        packagingStandards: [],
        trackingSupport: true
      }
    },
  });

  const documentsForm = useForm<DocumentsForm>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      businessRegistrationUploaded: false,
      gstCertificateUploaded: false,
      panCardUploaded: false,
      tradeLicenseUploaded: false,
      bankStatementUploaded: false,
      msmeRegistrationUploaded: false,
      authorizedDealerCertificatesUploaded: false,
      qualityCertificationsUploaded: false,
      warehousePhotosUploaded: false,
      productCatalogUploaded: false
    },
  });

  // Calculate progress percentage
  const progressPercentage = (currentStep / PARTS_PROVIDER_STEPS.length) * 100;

  // Navigation functions
  const nextStep = () => {
    if (currentStep < PARTS_PROVIDER_STEPS.length) {
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
        return await businessForm.trigger();
      case 2:
        return await contactForm.trigger();
      case 3:
        return await bankingForm.trigger();
      case 4:
        return await catalogForm.trigger();
      case 5:
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
    const fieldMapping: Record<string, keyof DocumentsForm> = {
      'business_registration': 'businessRegistrationUploaded',
      'gst_certificate': 'gstCertificateUploaded',
      'pan_card': 'panCardUploaded',
      'trade_license': 'tradeLicenseUploaded',
      'bank_statement': 'bankStatementUploaded',
      'msme_registration': 'msmeRegistrationUploaded',
      'authorized_dealer_certificates': 'authorizedDealerCertificatesUploaded',
      'quality_certifications': 'qualityCertificationsUploaded',
      'warehouse_photos': 'warehousePhotosUploaded',
      'product_catalog': 'productCatalogUploaded'
    };

    const fieldName = fieldMapping[documentType];
    if (fieldName) {
      documentsForm.setValue(fieldName, true);
    }

    toast({
      title: "Document Uploaded",
      description: `${partsProviderDocumentTypes.find(type => type.id === documentType)?.name} uploaded successfully.`,
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
    mutationFn: async (data: PartsProviderRegistrationForm) => {
      const response = await apiRequest('/api/parts-provider/register', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          documents: uploadedDocuments,
          authMethod: 'google',
          googleUserId: googleUser?.uid
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Registration Submitted!",
        description: "Your parts provider registration has been submitted for review.",
      });
      setLocation('/parts-provider-pending');
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
      const businessData = businessForm.getValues();
      const contactData = contactForm.getValues();
      const bankingData = bankingForm.getValues();
      const catalogData = catalogForm.getValues();
      const documentsData = documentsForm.getValues();

      const completeData = {
        ...businessData,
        ...contactData,
        ...bankingData,
        ...catalogData,
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                Parts Provider Registration
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
                Step {currentStep} of {PARTS_PROVIDER_STEPS.length}: {PARTS_PROVIDER_STEPS[currentStep - 1]?.title}
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
        <div className="flex items-center justify-center mb-8 overflow-x-auto">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-max">
            {PARTS_PROVIDER_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex flex-col items-center space-y-2 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border-2 ${
                      isActive ? 'border-primary bg-primary/10' : 
                      isCompleted ? 'border-green-600 bg-green-50' : 'border-muted-foreground/30'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                      ) : (
                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`text-xs md:text-sm font-medium ${isActive ? 'text-primary' : ''} max-w-20 text-center`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < PARTS_PROVIDER_STEPS.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-2 md:mx-4 ${
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
              {/* Business Details Step */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Business Details
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Provide comprehensive information about your business, including legal details and certifications.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Form {...businessForm}>
                      <form className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={businessForm.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter registered business name" data-testid="input-business-name" />
                                </FormControl>
                                <FormDescription>
                                  Exact name as per business registration
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
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
                                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                                    <SelectItem value="partnership">Partnership</SelectItem>
                                    <SelectItem value="private_limited">Private Limited Company</SelectItem>
                                    <SelectItem value="public_limited">Public Limited Company</SelectItem>
                                    <SelectItem value="llp">Limited Liability Partnership</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="businessRegistrationNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Registration Number *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="CIN/Registration number" data-testid="input-registration-number" />
                                </FormControl>
                                <FormDescription>
                                  CIN for companies, Registration number for others
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="gstNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GST Number *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="27AAAAA0000A1Z5" maxLength={15} data-testid="input-gst-number" />
                                </FormControl>
                                <FormDescription>
                                  15-character GST registration number
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
                                <FormLabel>PAN Number *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="ABCDE1234F" maxLength={10} data-testid="input-pan-number" />
                                </FormControl>
                                <FormDescription>
                                  Company PAN number
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="companySize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Size *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-company-size">
                                      <SelectValue placeholder="Select company size" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {BUSINESS_SIZES.map((size) => (
                                      <SelectItem key={size.value} value={size.value}>
                                        <div>
                                          <div className="font-medium">{size.label}</div>
                                          <div className="text-xs text-muted-foreground">{size.description}</div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="yearEstablished"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Year Established *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="1950" max={new Date().getFullYear()} data-testid="input-year-established" />
                                </FormControl>
                                <FormDescription>
                                  Year your business was established
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="website"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Website URL</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://yourwebsite.com" data-testid="input-website" />
                                </FormControl>
                                <FormDescription>
                                  Company website (optional)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={businessForm.control}
                            name="warehouseCapacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Warehouse Capacity (sq ft) *</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" placeholder="10000" data-testid="input-warehouse-capacity" />
                                </FormControl>
                                <FormDescription>
                                  Total warehouse/storage space in square feet
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={businessForm.control}
                          name="businessDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Description *</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Describe your business, products, and services in detail..."
                                  rows={4}
                                  data-testid="textarea-business-description"
                                />
                              </FormControl>
                              <FormDescription>
                                Detailed description of your business activities and product range (10-1000 characters)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center">
                            <Award className="w-5 h-5 mr-2" />
                            Quality Certifications & Standards
                          </h3>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                              control={businessForm.control}
                              name="qualityCertifications"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quality Certifications</FormLabel>
                                  <FormDescription>
                                    Select all applicable quality certifications
                                  </FormDescription>
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {QUALITY_CERTIFICATIONS.map((cert) => (
                                      <div key={cert} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`cert-${cert}`}
                                          checked={field.value?.includes(cert)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              field.onChange([...field.value, cert]);
                                            } else {
                                              field.onChange(field.value.filter((c: string) => c !== cert));
                                            }
                                          }}
                                          data-testid={`checkbox-cert-${cert.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                        />
                                        <label htmlFor={`cert-${cert}`} className="text-sm">{cert}</label>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="space-y-4">
                              <FormField
                                control={businessForm.control}
                                name="manufacturingUnit"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="checkbox-manufacturing-unit"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Own Manufacturing Unit</FormLabel>
                                      <FormDescription>
                                        Do you own/operate a manufacturing facility?
                                      </FormDescription>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={businessForm.control}
                                name="environmentalClearances"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="checkbox-environmental-clearances"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Environmental Clearances</FormLabel>
                                      <FormDescription>
                                        Do you have required environmental clearances?
                                      </FormDescription>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button 
                            type="button" 
                            onClick={handleNextStep}
                            data-testid="button-next-business"
                          >
                            Next: Contact & Location
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* Navigation buttons for other steps */}
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
                  {currentStep < PARTS_PROVIDER_STEPS.length && (
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
                    <CardTitle>Contact & Location - Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Contact details, business address, warehouse location, and operational hours will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Banking & Finance - Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Banking details, payment preferences, credit terms, and financial information will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Product Catalog - Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Product categories, brands, inventory details, and supplier capabilities will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {currentStep === 5 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Documents & Compliance - Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Document uploads for business registration, GST certificate, trade license, and other compliance documents will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {currentStep === 6 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review & Submit - Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Final review of all information and submission will be implemented here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}