import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Phone, Check, ChevronDown, AlertCircle } from 'lucide-react';

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
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { countryCodes, getDefaultCountry, CountryCode } from './countryCodes';

// Phone number validation schema
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
    .regex(/^\d+$/, 'Phone number should contain only digits')
    .min(6, 'Phone number is too short')
    .max(15, 'Phone number is too long'),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

interface PhoneLoginProps {
  onSuccess: (challengeId: string, phoneNumber: string) => void;
  onError?: (error: string) => void;
}

interface OtpRequestResponse {
  success: boolean;
  challengeId: string;
  message: string;
}

export default function PhoneLogin({ onSuccess, onError }: PhoneLoginProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      countryCode: getDefaultCountry(),
      phoneNumber: '',
    },
  });

  const otpRequestMutation = useMutation({
    mutationFn: async (data: PhoneFormData) => {
      const fullPhoneNumber = `${data.countryCode.dialCode}${data.phoneNumber}`;
      
      const response = await apiRequest('POST', '/api/v1/auth/otp/request', {
        phone: fullPhoneNumber,
      });
      
      return await response.json() as OtpRequestResponse;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        const fullPhoneNumber = `${variables.countryCode.dialCode}${variables.phoneNumber}`;
        toast({
          title: "OTP Sent Successfully",
          description: `We've sent a verification code to ${fullPhoneNumber}`,
        });
        onSuccess(data.challengeId, fullPhoneNumber);
      } else {
        const errorMessage = data.message || 'Failed to send OTP';
        toast({
          title: "Failed to Send OTP",
          description: errorMessage,
          variant: "destructive",
        });
        onError?.(errorMessage);
      }
    },
    onError: (error: any) => {
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message.includes('429')) {
        errorMessage = 'Too many requests. Please wait before trying again.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Please enter a valid phone number.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Something went wrong. Please try again later.';
      } else if (error.message.toLowerCase().includes('network')) {
        errorMessage = 'Connection error. Please try again.';
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError?.(errorMessage);
    },
  });

  const onSubmit = (data: PhoneFormData) => {
    otpRequestMutation.mutate(data);
  };

  const selectedCountry = form.watch('countryCode');
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mx-auto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/attached_assets/WhatsApp Image 2025-09-14 at 11.38.25_67200540_1757830108540.jpg" 
                alt="FixitQuick Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Enter your phone number</h2>
            <p className="text-sm text-muted-foreground">
              We'll send you a verification code to confirm your number
            </p>
          </div>

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
                        className="w-full justify-between h-12"
                        data-testid="country-selector"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{field.value.flag}</span>
                          <span className="text-sm text-muted-foreground">
                            {field.value.dialCode}
                          </span>
                          <span className="text-sm">{field.value.name}</span>
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search countries..." 
                          data-testid="country-search"
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
                                }}
                                className="flex items-center space-x-2"
                                data-testid={`country-option-${country.code}`}
                              >
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-sm text-muted-foreground min-w-[3rem]">
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
                <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-sm text-muted-foreground">
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span>{selectedCountry.dialCode}</span>
                    </div>
                    <Input
                      {...field}
                      type="tel"
                      placeholder={selectedCountry.format}
                      className="h-12 pl-20 text-base"
                      data-testid="phone-input"
                      autoComplete="tel"
                    />
                  </div>
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: {selectedCountry.format}
                </p>
              </FormItem>
            )}
          />

          {/* Error Display */}
          {otpRequestMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {otpRequestMutation.error?.message?.includes('429') 
                  ? 'Too many requests. Please wait before trying again.'
                  : 'Failed to send OTP. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={otpRequestMutation.isPending}
            data-testid="send-otp-button"
          >
            {otpRequestMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="loading-spinner w-5 h-5" />
                <span>Sending OTP...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>Send OTP</span>
              </div>
            )}
          </Button>

          {/* Additional Info */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}