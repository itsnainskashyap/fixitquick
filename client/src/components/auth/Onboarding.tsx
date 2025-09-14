import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, UserPlus, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Name validation schema
const onboardingSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name should contain only letters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name should contain only letters'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingProps {
  accessToken: string;
  refreshToken: string;
  phoneNumber: string;
  onSuccess: (userData: any) => void;
  onError?: (error: string) => void;
}

interface OnboardingResponse {
  success: boolean;
  user?: {
    id: string;
    phone: string;
    firstName: string;
    lastName: string;
    role?: string;
    isVerified?: boolean;
  };
  message: string;
}

export default function Onboarding({ 
  accessToken,
  refreshToken,
  phoneNumber,
  onSuccess, 
  onError 
}: OnboardingProps) {
  const { toast } = useToast();
  
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange', // Enable real-time validation to fix button gating issue
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const response = await apiRequest('POST', '/api/v1/auth/onboarding', {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      }, {
        Authorization: `Bearer ${accessToken}`,
      });
      
      return await response.json() as OnboardingResponse;
    },
    onSuccess: (data) => {
      if (data.success && data.user) {
        toast({
          title: "Welcome to FixitQuick!",
          description: `Hi ${data.user.firstName}! Your profile has been created successfully.`,
        });
        onSuccess({
          accessToken,
          refreshToken,
          user: data.user,
        });
      } else {
        const errorMessage = data.message || 'Failed to create your profile. Please try again.';
        toast({
          title: "Profile Creation Failed",
          description: errorMessage,
          variant: "destructive",
        });
        onError?.(errorMessage);
      }
    },
    onError: (error: any) => {
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message.includes('400')) {
        errorMessage = 'Please check your details and try again.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.message.includes('409')) {
        errorMessage = 'An account with these details already exists.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Something went wrong. Please try again later.';
      }

      toast({
        title: "Profile Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError?.(errorMessage);
    },
  });

  const onSubmit = (data: OnboardingFormData) => {
    onboardingMutation.mutate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center"
          >
            <User className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Complete your profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Let's get to know you better! Enter your name to get started.
          </p>
          <p className="text-xs text-muted-foreground mt-2 opacity-70">
            Phone: {phoneNumber}
          </p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* First Name Input */}
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your first name"
                        className="h-12 text-base"
                        data-testid="first-name-input"
                        autoComplete="given-name"
                        autoFocus
                        disabled={onboardingMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Last Name Input */}
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Last Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your last name"
                        className="h-12 text-base"
                        data-testid="last-name-input"
                        autoComplete="family-name"
                        disabled={onboardingMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Error Display */}
              {onboardingMutation.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {onboardingMutation.error?.message?.includes('400') 
                      ? 'Please check your details and try again.'
                      : onboardingMutation.error?.message?.includes('401')
                      ? 'Session expired. Please log in again.'
                      : 'Failed to create profile. Please try again.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={onboardingMutation.isPending || !form.formState.isValid}
                data-testid="complete-profile-button"
              >
                {onboardingMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="loading-spinner w-5 h-5" />
                    <span>Creating Profile...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Complete Profile</span>
                  </div>
                )}
              </Button>

              {/* Additional Info */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Your information is secure and will be used to personalize your experience
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}