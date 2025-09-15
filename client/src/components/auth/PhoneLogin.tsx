import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Phone, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SmartPhoneInput from '@/components/SmartPhoneInput';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getDefaultCountry } from './countryCodes';

// Enhanced phone number validation for E.164 format
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  // Validate E.164 format with enhanced Indian number support
  return /^\+[1-9]\d{7,14}$/.test(phone) && 
    (phone.startsWith('+91') ? /^\+91[6-9]\d{9}$/.test(phone) : true);
};

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
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | undefined>();

  const otpRequestMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest('POST', '/api/v1/auth/otp/request', {
        phone: phone,
      });
      
      return await response.json() as OtpRequestResponse;
    },
    onSuccess: (data, phoneNumber) => {
      if (data.success) {
        toast({
          title: "OTP Sent Successfully",
          description: `We've sent a verification code to ${phoneNumber}`,
        });
        onSuccess(data.challengeId, phoneNumber);
      } else {
        const errorMessage = data.message || 'Failed to send OTP';
        
        // Enhanced error handling for different scenarios
        if (errorMessage.includes('Too many OTP requests') || errorMessage.includes('Please wait until')) {
          toast({
            title: "Rate Limit Reached", 
            description: errorMessage,
            variant: "destructive",
          });
        } else if (errorMessage.includes('Invalid phone number')) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid Indian mobile number starting with 6, 7, 8, or 9",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to Send OTP",
            description: errorMessage,
            variant: "destructive",
          });
        }
        onError?.(errorMessage);
      }
    },
    onError: (error: any) => {
      console.error('🚨 OTP Request Error:', error);
      let errorMessage = 'Something went wrong. Please try again.';
      
      // Parse the actual error response for rate limiting
      const errorText = error.message || '';
      
      if (errorText.includes('Too many OTP requests') || errorText.includes('429')) {
        // Extract rate limiting message from response
        if (errorText.includes('Please wait until')) {
          const match = errorText.match(/Please wait until ([^"]+)/);
          if (match) {
            const waitTime = match[1];
            errorMessage = `Too many OTP requests. Please wait until ${waitTime} before requesting again.`;
          } else {
            errorMessage = 'Too many OTP requests. Please wait before trying again.';
          }
        } else {
          errorMessage = 'Too many requests. Please wait before trying again.';
        }
      } else if (errorText.includes('400') && !errorText.includes('Too many')) {
        // Only show phone number error for actual validation issues
        errorMessage = 'Please enter a valid phone number.';
      } else if (errorText.includes('500')) {
        errorMessage = 'Something went wrong. Please try again later.';
      } else if (errorText.toLowerCase().includes('network')) {
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

  const handleSubmit = () => {
    if (!isPhoneValid || !phoneNumber) {
      toast({
        title: "Invalid Phone Number",
        description: validationMessage || "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    // Submit the validated phone number
    otpRequestMutation.mutate(phoneNumber);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <img 
              src="/fixitquick-logo.jpg" 
              alt="FixitQuick Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Enter your phone number</h2>
          <p className="text-sm text-muted-foreground">
            We'll send you a verification code to confirm your number
          </p>
        </div>

        {/* Smart Phone Input */}
        <SmartPhoneInput
          label="Phone Number"
          placeholder="Enter your mobile number"
          defaultCountry={getDefaultCountry()}
          onChange={(formattedNumber, isValid) => {
            setPhoneNumber(formattedNumber);
            setIsPhoneValid(isValid && validatePhoneNumber(formattedNumber));
          }}
          onValidation={(isValid, message) => {
            setValidationMessage(message);
          }}
          required={true}
          showValidation={true}
          focusOnMount={true}
          autoFormat={true}
          testId="phone-login"
        />

        {/* API Error Display */}
        {otpRequestMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {otpRequestMutation.error?.message?.includes('429') 
                ? 'Too many requests. Please wait before trying again.'
                : otpRequestMutation.error?.message?.includes('Invalid phone number')
                ? 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9'
                : 'Failed to send OTP. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          className="w-full h-12 text-base font-medium"
          disabled={otpRequestMutation.isPending || !isPhoneValid}
          data-testid="send-otp-button"
        >
          {otpRequestMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
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
      </div>
    </motion.div>
  );
}