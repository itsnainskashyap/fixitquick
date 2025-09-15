import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, Check, ChevronDown, AlertCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { countryCodes, getDefaultCountry, CountryCode } from './auth/countryCodes';

// Enhanced phone number validation schema with smart formatting
const phoneSchema = z.object({
  countryCode: z.object({
    name: z.string(),
    code: z.string(),
    dialCode: z.string(),
    flag: z.string(),
    format: z.string(),
  }),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .max(15, 'Phone number is too long')
    .transform((val) => val.replace(/\D/g, '')) // Remove non-digits
    .refine((val) => val.length >= 7, 'Phone number is too short')
    .refine((val) => val.length <= 11, 'Phone number is too long'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

interface SmartPhoneInputProps {
  label?: string;
  placeholder?: string;
  defaultCountry?: CountryCode;
  value?: string;
  onChange?: (formattedNumber: string, isValid: boolean) => void;
  onValidation?: (isValid: boolean, message?: string) => void;
  required?: boolean;
  disabled?: boolean;
  showValidation?: boolean;
  focusOnMount?: boolean;
  autoFormat?: boolean;
  className?: string;
  testId?: string;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
  formattedNumber?: string;
  detectedCountry?: CountryCode;
}

export default function SmartPhoneInput({
  label = "Phone Number",
  placeholder,
  defaultCountry,
  value = '',
  onChange,
  onValidation,
  required = true,
  disabled = false,
  showValidation = true,
  focusOnMount = false,
  autoFormat = true,
  className = '',
  testId = 'smart-phone-input'
}: SmartPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      countryCode: defaultCountry || getDefaultCountry(),
      phoneNumber: '',
    },
  });

  // Smart phone number formatting and validation
  const validateAndFormatPhoneNumber = useCallback((
    phone: string, 
    selectedCountry: CountryCode
  ): ValidationResult => {
    if (!phone || phone.length === 0) {
      return { isValid: !required, message: required ? 'Phone number is required' : undefined };
    }

    // Remove all non-digit characters
    const cleanedPhone = phone.replace(/\D/g, '');
    
    if (cleanedPhone.length === 0) {
      return { isValid: false, message: 'Please enter a valid phone number' };
    }

    // Enhanced Indian number detection and formatting
    let detectedCountry = selectedCountry;
    let formattedNumber = '';
    let subscriberNumber = cleanedPhone;

    // Handle various input patterns for Indian numbers
    if (selectedCountry.code === 'IN' || selectedCountry.dialCode === '+91') {
      // Remove country code if included in input
      if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
        subscriberNumber = cleanedPhone.substring(2);
      } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
        subscriberNumber = cleanedPhone.substring(1);
      } else if (cleanedPhone.length === 10) {
        subscriberNumber = cleanedPhone;
      } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith('0')) {
        subscriberNumber = cleanedPhone.substring(1);
      }

      // Validate Indian mobile number pattern
      if (subscriberNumber.length === 10 && /^[6-9]\d{9}$/.test(subscriberNumber)) {
        formattedNumber = `+91${subscriberNumber}`;
        return {
          isValid: true,
          formattedNumber,
          detectedCountry,
          message: undefined
        };
      } else if (subscriberNumber.length === 10) {
        return {
          isValid: false,
          message: 'Indian mobile numbers must start with 6, 7, 8, or 9',
          detectedCountry
        };
      } else if (subscriberNumber.length < 10) {
        return {
          isValid: false,
          message: `Enter ${10 - subscriberNumber.length} more digit${10 - subscriberNumber.length > 1 ? 's' : ''}`,
          detectedCountry
        };
      } else {
        return {
          isValid: false,
          message: 'Indian mobile numbers should be 10 digits',
          detectedCountry
        };
      }
    }

    // Auto-detect country based on number pattern if not Indian
    if (cleanedPhone.length === 10) {
      // Check if it's a US number (starts with 2-9)
      if (/^[2-9]\d{9}$/.test(cleanedPhone)) {
        const usCountry = countryCodes.find(c => c.code === 'US');
        if (usCountry) {
          detectedCountry = usCountry;
          formattedNumber = `+1${cleanedPhone}`;
          return { isValid: true, formattedNumber, detectedCountry };
        }
      }
      // Check if it's a UK mobile (starts with 7)
      else if (cleanedPhone.startsWith('7')) {
        const ukCountry = countryCodes.find(c => c.code === 'GB');
        if (ukCountry) {
          detectedCountry = ukCountry;
          formattedNumber = `+44${cleanedPhone}`;
          return { isValid: true, formattedNumber, detectedCountry };
        }
      }
    }

    // General validation for other countries
    if (selectedCountry.dialCode === '+1' && cleanedPhone.length === 10) {
      if (/^[2-9]\d{9}$/.test(cleanedPhone)) {
        formattedNumber = `+1${cleanedPhone}`;
        return { isValid: true, formattedNumber, detectedCountry };
      } else {
        return { isValid: false, message: 'US/Canada numbers must start with 2-9', detectedCountry };
      }
    }

    // Default validation
    const minLength = selectedCountry.code === 'SG' ? 8 : 10;
    const maxLength = selectedCountry.code === 'IN' ? 10 : 11;

    if (cleanedPhone.length < minLength) {
      return {
        isValid: false,
        message: `Enter ${minLength - cleanedPhone.length} more digit${minLength - cleanedPhone.length > 1 ? 's' : ''}`,
        detectedCountry
      };
    } else if (cleanedPhone.length > maxLength) {
      return {
        isValid: false,
        message: 'Phone number is too long',
        detectedCountry
      };
    }

    // Format with selected country code
    formattedNumber = `${selectedCountry.dialCode}${cleanedPhone}`;
    return { isValid: true, formattedNumber, detectedCountry };
  }, [required]);

  // Format input for display (add spaces for readability)
  const formatDisplayNumber = useCallback((phone: string, country: CountryCode): string => {
    if (!autoFormat || !phone) return phone;
    
    const cleanedPhone = phone.replace(/\D/g, '');
    
    if (country.code === 'IN' && cleanedPhone.length <= 10) {
      // Format as: 98765 43210
      if (cleanedPhone.length > 5) {
        return `${cleanedPhone.slice(0, 5)} ${cleanedPhone.slice(5)}`;
      }
      return cleanedPhone;
    } else if (country.code === 'US' && cleanedPhone.length <= 10) {
      // Format as: (987) 654-3210
      if (cleanedPhone.length >= 6) {
        return `(${cleanedPhone.slice(0, 3)}) ${cleanedPhone.slice(3, 6)}-${cleanedPhone.slice(6)}`;
      } else if (cleanedPhone.length >= 3) {
        return `(${cleanedPhone.slice(0, 3)}) ${cleanedPhone.slice(3)}`;
      }
      return cleanedPhone;
    }
    
    return cleanedPhone;
  }, [autoFormat]);

  // Handle input changes with real-time validation
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const selectedCountry = form.getValues('countryCode');
    const validation = validateAndFormatPhoneNumber(value, selectedCountry);
    
    setValidation(validation);
    
    // Update country if auto-detected
    if (validation.detectedCountry && validation.detectedCountry.code !== selectedCountry.code) {
      form.setValue('countryCode', validation.detectedCountry);
    }
    
    // Call callbacks
    onChange?.(validation.formattedNumber || '', validation.isValid);
    onValidation?.(validation.isValid, validation.message);
  }, [form, validateAndFormatPhoneNumber, onChange, onValidation]);

  // Initialize with value prop
  useEffect(() => {
    if (value && value !== inputValue) {
      setInputValue(value);
      handleInputChange(value);
    }
  }, [value, inputValue, handleInputChange]);

  const selectedCountry = form.watch('countryCode');
  const displayValue = formatDisplayNumber(inputValue, selectedCountry);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`space-y-2 ${className}`}
    >
      <Form {...form}>
        <div className="space-y-4">
          {/* Country Code Selection */}
          <FormField
            control={form.control}
            name="countryCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Country</FormLabel>
                <FormControl>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-11"
                        disabled={disabled}
                        data-testid={`${testId}-country-selector`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{field.value.flag}</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {field.value.dialCode}
                          </span>
                          <span className="text-sm truncate">{field.value.name}</span>
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search countries..." 
                          data-testid={`${testId}-country-search`}
                        />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countryCodes.map((country) => (
                              <CommandItem
                                key={country.code}
                                value={`${country.name} ${country.dialCode}`}
                                onSelect={() => {
                                  field.onChange(country);
                                  setOpen(false);
                                  // Re-validate with new country
                                  handleInputChange(inputValue);
                                }}
                                className="flex items-center space-x-2"
                                data-testid={`${testId}-country-option-${country.code}`}
                              >
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-sm text-muted-foreground min-w-[4rem] font-mono">
                                  {country.dialCode}
                                </span>
                                <span className="flex-1">{country.name}</span>
                                {field.value.code === country.code && (
                                  <Check className="h-4 w-4" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone Number Input */}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{label}</FormLabel>
                <FormControl>
                  <div className="relative">
                    {/* Country prefix display */}
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-sm text-muted-foreground pointer-events-none z-10">
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span className="font-mono">{selectedCountry.dialCode}</span>
                    </div>
                    
                    {/* Main input */}
                    <Input
                      type="tel"
                      placeholder={placeholder || selectedCountry.format}
                      value={displayValue}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        field.onChange(rawValue);
                        handleInputChange(rawValue);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className={`h-11 pl-20 pr-10 text-base font-mono ${
                        validation.isValid 
                          ? 'border-input focus:border-primary' 
                          : 'border-destructive focus:border-destructive'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={disabled}
                      autoComplete="tel"
                      data-testid={`${testId}-phone-input`}
                      autoFocus={focusOnMount}
                    />
                    
                    {/* Validation indicator */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AnimatePresence mode="wait">
                        {showValidation && inputValue && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                          >
                            {validation.isValid ? (
                              <Check className="h-4 w-4 text-green-500" data-testid={`${testId}-valid-icon`} />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" data-testid={`${testId}-invalid-icon`} />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </FormControl>
                
                {/* Format example */}
                <p className="text-xs text-muted-foreground mt-1">
                  Example: {selectedCountry.format}
                </p>
                
                {/* Validation message */}
                <AnimatePresence>
                  {showValidation && validation.message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      data-testid={`${testId}-validation-message`}
                    >
                      <p className={`text-xs mt-1 ${
                        validation.isValid ? 'text-green-600' : 'text-destructive'
                      }`}>
                        {validation.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </motion.div>
  );
}

// Utility function to validate phone number format
export const validatePhoneNumber = (phone: string): { isValid: boolean; message?: string } => {
  if (!phone) return { isValid: false, message: 'Phone number is required' };
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check E.164 format
  if (!cleaned.startsWith('+')) {
    return { isValid: false, message: 'Phone number must include country code' };
  }
  
  // Basic E.164 validation
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return { isValid: false, message: 'Invalid phone number format' };
  }
  
  // Indian number specific validation
  if (cleaned.startsWith('+91')) {
    const subscriber = cleaned.substring(3);
    if (subscriber.length !== 10 || !/^[6-9]\d{9}$/.test(subscriber)) {
      return { isValid: false, message: 'Invalid Indian mobile number' };
    }
  }
  
  return { isValid: true };
};

// Utility function to format phone number to E.164
export const formatToE164 = (phone: string, countryCode: string = '+91'): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    return `${countryCode}${cleaned}`;
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `${countryCode}${cleaned.substring(1)}`;
  }
  
  return `${countryCode}${cleaned}`;
};