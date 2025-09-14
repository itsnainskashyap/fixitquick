import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, RotateCcw, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// OTP validation schema
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

type OtpFormData = z.infer<typeof otpSchema>;

interface OtpVerificationProps {
  challengeId: string;
  phoneNumber: string;
  onSuccess: (accessToken: string, refreshToken: string, userData?: any) => void;
  onBack: () => void;
  onResend: () => void;
  onError?: (error: string) => void;
}

interface OtpVerifyResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isVerified?: boolean;
  };
  message: string;
}

interface ResendOtpResponse {
  success: boolean;
  challengeId: string;
  message: string;
}

export default function OtpVerification({ 
  challengeId, 
  phoneNumber, 
  onSuccess, 
  onBack,
  onResend,
  onError 
}: OtpVerificationProps) {
  const [timer, setTimer] = useState(3);
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();

  const form = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  // WebOTP API integration for automatic SMS detection
  const requestOtpFromSms = useCallback(async () => {
    if ('OTPCredential' in window) {
      try {
        // Use AbortController for cleanup
        const abortController = new AbortController();
        
        // Request OTP from SMS
        const otpCredential = await (navigator.credentials as any).get({
          otp: { transport: ['sms'] },
          signal: abortController.signal,
        });
        
        if (otpCredential?.code) {
          // Auto-fill the OTP
          form.setValue('otp', otpCredential.code);
          // Auto-submit the form
          form.handleSubmit(onSubmit)();
        }
        
        // Return cleanup function
        return () => abortController.abort();
      } catch (error) {
        // WebOTP failed, user can still enter OTP manually
        console.log('WebOTP failed, manual entry available:', error);
      }
    }
    return null;
  }, [form]);

  // Initialize WebOTP on component mount
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    
    requestOtpFromSms().then(cleanupFn => {
      cleanup = cleanupFn;
    });
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [requestOtpFromSms]);

  // Countdown timer for resend button
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: OtpFormData) => {
      // OTP verification attempt (sensitive data not logged for security)
      
      const response = await apiRequest('POST', '/api/v1/auth/otp/verify', {
        phone: phoneNumber,
        code: data.otp,
      });
      
      const result = await response.json() as OtpVerifyResponse;
      // OTP verification response received
      
      return result;
    },
    onSuccess: (data) => {
      if (data.success && data.accessToken) {
        toast({
          title: "Phone Verified Successfully",
          description: "Welcome to FixitQuick!",
        });
        // Auto-login user immediately without continue button
        onSuccess(data.accessToken, data.refreshToken || '', data);
      } else {
        const errorMessage = data.message || 'Invalid OTP. Please try again.';
        
        // Check if OTP is expired
        const isExpired = errorMessage.toLowerCase().includes('expired') || 
                         errorMessage.toLowerCase().includes('no active verification');
        
        if (isExpired) {
          toast({
            title: "OTP Expired",
            description: "Your OTP has expired. Please request a new one.",
            variant: "destructive",
          });
          
          // Auto-enable resend for expired OTP
          setCanResend(true);
          setTimer(0);
        } else {
          toast({
            title: "Verification Failed", 
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        // Clear the form for retry
        form.reset();
        onError?.(errorMessage);
      }
    },
    onError: (error: any) => {
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message.includes('400')) {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      } else if (error.message.includes('410')) {
        // Handle expired OTP with consistent UX
        setCanResend(true);
        setTimer(0);
        form.reset();
        
        toast({
          title: "OTP Expired",
          description: "Your OTP has expired. Please request a new one.",
          variant: "destructive",
        });
        
        onError?.('OTP has expired. Please request a new one.');
        return; // Don't show the generic toast below
      } else if (error.message.includes('500')) {
        errorMessage = 'Something went wrong. Please try again later.';
      }

      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError?.(errorMessage);
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/v1/auth/otp/request', {
        phone: phoneNumber,
      });
      
      return await response.json() as ResendOtpResponse;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "OTP Sent",
          description: "A new verification code has been sent to your phone.",
        });
        setTimer(3);
        setCanResend(false);
        form.reset();
        onResend();
      } else {
        const errorMessage = data.message || 'Failed to resend OTP';
        toast({
          title: "Resend Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      if (error.message.includes('429')) {
        errorMessage = 'Too many requests. Please wait before trying again.';
      }

      toast({
        title: "Resend Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OtpFormData) => {
    verifyOtpMutation.mutate(data);
  };

  // Auto-submit when 6 digits are entered
  const handleOtpChange = (value: string) => {
    form.setValue('otp', value);
    if (value.length === 6) {
      // Auto-submit after a brief delay to ensure UI updates
      setTimeout(() => {
        form.handleSubmit(onSubmit)();
      }, 100);
    }
  };

  const handleResend = () => {
    resendOtpMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mx-auto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="absolute left-0 top-0 p-2"
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/fixitquick-logo.jpg" 
                alt="FixitQuick Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground">Verify your number</h2>
            <p className="text-sm text-muted-foreground">
              We've sent a 6-digit code to
            </p>
            <p className="text-sm font-medium text-foreground">
              {phoneNumber}
            </p>
          </div>

          {/* OTP Input */}
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-sm font-medium text-center block">
                  Enter verification code
                </FormLabel>
                <FormControl>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={handleOtpChange}
                      data-testid="otp-input"
                      disabled={verifyOtpMutation.isPending}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                        <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </FormControl>
                <FormMessage className="text-center" />
              </FormItem>
            )}
          />

          {/* Error Display */}
          {verifyOtpMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {verifyOtpMutation.error?.message?.includes('400') 
                  ? 'Invalid OTP. Please check and try again.'
                  : verifyOtpMutation.error?.message?.includes('410')
                  ? 'OTP has expired. Please request a new one.'
                  : 'Verification failed. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Verify Button */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            disabled={verifyOtpMutation.isPending || !form.watch('otp') || form.watch('otp').length !== 6}
            data-testid="verify-otp-button"
          >
            {verifyOtpMutation.isPending ? (
              <div className="flex items-center space-x-2">
                <div className="loading-spinner w-5 h-5" />
                <span>Verifying...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Verify & Continue</span>
              </div>
            )}
          </Button>

          {/* Resend Section */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            
            {canResend ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resendOtpMutation.isPending}
                className="w-full"
                data-testid="resend-otp-button"
              >
                {resendOtpMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading-spinner w-4 h-4" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="h-4 w-4" />
                    <span>Resend code</span>
                  </div>
                )}
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">
                Resend code in {timer}s
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Make sure you have good network coverage and SMS is enabled
            </p>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}