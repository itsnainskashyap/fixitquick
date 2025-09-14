import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  CreditCard, 
  Plus, 
  Star, 
  Trash2, 
  Shield, 
  Smartphone,
  Building2,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo');

const addPaymentMethodSchema = z.object({
  nickname: z.string().optional(),
  setAsDefault: z.boolean().default(false),
});

type AddPaymentMethodForm = z.infer<typeof addPaymentMethodSchema>;

interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
  nickname?: string;
  isDefault: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  upiId?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

interface PaymentMethodsResponse {
  success: boolean;
  paymentMethods: PaymentMethod[];
  message?: string;
}

// Card logos component
const CardLogo = ({ brand }: { brand?: string }) => {
  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return (
          <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">
            VISA
          </div>
        );
      case 'mastercard':
        return (
          <div className="w-8 h-5 bg-red-500 rounded text-white text-xs font-bold flex items-center justify-center">
            MC
          </div>
        );
      case 'amex':
        return (
          <div className="w-8 h-5 bg-blue-500 rounded text-white text-xs font-bold flex items-center justify-center">
            AMEX
          </div>
        );
      case 'rupay':
        return (
          <div className="w-8 h-5 bg-green-600 rounded text-white text-xs font-bold flex items-center justify-center">
            RUPAY
          </div>
        );
      default:
        return <CreditCard className="w-5 h-5 text-gray-500" />;
    }
  };

  return getCardIcon(brand);
};

// Payment method card component
const PaymentMethodCard = ({ method, onDelete }: { method: PaymentMethod; onDelete: (id: string) => void }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(method.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPaymentMethodDisplay = () => {
    switch (method.type) {
      case 'card':
        return (
          <div className="flex items-center space-x-3">
            <CardLogo brand={method.cardBrand} />
            <div>
              <p className="font-medium">
                •••• •••• •••• {method.cardLast4}
              </p>
              <p className="text-sm text-gray-500">
                {method.cardBrand?.toUpperCase()} • Expires {method.cardExpMonth?.toString().padStart(2, '0')}/{method.cardExpYear}
              </p>
            </div>
          </div>
        );
      case 'upi':
        return (
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-medium">UPI</p>
              <p className="text-sm text-gray-500">{method.upiId}</p>
            </div>
          </div>
        );
      case 'netbanking':
        return (
          <div className="flex items-center space-x-3">
            <Building2 className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-medium">Net Banking</p>
              <p className="text-sm text-gray-500">Bank Account</p>
            </div>
          </div>
        );
      case 'wallet':
        return (
          <div className="flex items-center space-x-3">
            <Wallet className="w-5 h-5 text-purple-500" />
            <div>
              <p className="font-medium">Digital Wallet</p>
              <p className="text-sm text-gray-500">Wallet Payment</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium">Payment Method</p>
              <p className="text-sm text-gray-500">Unknown type</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card data-testid={`payment-method-${method.id}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {getPaymentMethodDisplay()}
            <div className="flex items-center space-x-2 mt-2">
              {method.nickname && (
                <Badge variant="secondary" className="text-xs">
                  {method.nickname}
                </Badge>
              )}
              {method.isDefault && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  <Star className="w-3 h-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            {method.lastUsedAt && (
              <p className="text-xs text-gray-400 mt-1">
                Last used {new Date(method.lastUsedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              data-testid={`button-delete-${method.id}`}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Add card form component (uses Stripe Elements)
const AddCardForm = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<AddPaymentMethodForm>({
    resolver: zodResolver(addPaymentMethodSchema),
    defaultValues: {
      nickname: '',
      setAsDefault: false,
    },
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async (data: { stripePaymentMethodId: string; nickname?: string; setAsDefault: boolean }) => {
      const response = await apiRequest('POST', '/api/v1/payment-methods', data);
      return response;
    },
  });

  const handleSubmit = async (data: AddPaymentMethodForm) => {
    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Stripe is not loaded properly",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method with Stripe
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Save payment method to our backend
      await addPaymentMethodMutation.mutateAsync({
        stripePaymentMethodId: paymentMethod.id,
        nickname: data.nickname || undefined,
        setAsDefault: data.setAsDefault,
      });

      toast({
        title: "Success",
        description: "Payment method added successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding payment method:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add payment method";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Card Details</label>
          <div className="border rounded-md p-3 bg-gray-50">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nickname (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Personal Card, Work Card"
                  data-testid="input-card-nickname"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="setAsDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Set as default payment method</FormLabel>
                <FormDescription className="text-sm text-gray-500">
                  Use this card for future payments by default
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-set-default"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex space-x-3 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading || !stripe}
            data-testid="button-save-card"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Card...
              </>
            ) : (
              'Add Card'
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            data-testid="button-cancel-add-card"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Main Payment Methods component
export default function PaymentMethods() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch payment methods
  const {
    data: paymentMethodsData,
    isLoading,
    error,
    refetch,
  } = useQuery<PaymentMethodsResponse>({
    queryKey: ['/api/v1/payment-methods'],
    retry: 1,
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/v1/payment-methods/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/payment-methods'] });
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment method",
        variant: "destructive",
      });
    },
  });

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    queryClient.invalidateQueries({ queryKey: ['/api/v1/payment-methods'] });
  };

  const handleDeletePaymentMethod = async (id: string) => {
    await deletePaymentMethodMutation.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const isStripeConfigured = paymentMethodsData?.message !== 'Stripe not configured - demo mode';
  const paymentMethods = paymentMethodsData?.paymentMethods || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-gray-600 mt-1">Manage your saved payment methods securely</p>
          </div>
          
          {isStripeConfigured && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-payment-method">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Card</DialogTitle>
                  <DialogDescription>
                    Add a new credit or debit card to your account
                  </DialogDescription>
                </DialogHeader>
                <Elements stripe={stripePromise}>
                  <AddCardForm
                    onSuccess={handleAddSuccess}
                    onCancel={() => setShowAddDialog(false)}
                  />
                </Elements>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Security notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Your payment information is secure
                </p>
                <p className="text-sm text-blue-700">
                  We use industry-standard encryption and never store your full card details.
                  All payments are processed securely through Stripe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe configuration status */}
        {!isStripeConfigured && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900">
                    Demo Mode
                  </p>
                  <p className="text-sm text-orange-700">
                    Payment processing is in demo mode. Configure Stripe API keys to enable real payments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment methods list */}
        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-900">
                    Error loading payment methods
                  </p>
                  <p className="text-sm text-red-700">
                    {error.message || 'Something went wrong. Please try again.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="mt-2"
                    data-testid="button-retry-payment-methods"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No payment methods saved
                </h3>
                <p className="text-gray-600 mb-4">
                  Add a payment method to make faster and secure payments
                </p>
                {isStripeConfigured && (
                  <Button 
                    onClick={() => setShowAddDialog(true)}
                    data-testid="button-add-first-payment-method"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Payment Method
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              Saved Payment Methods ({paymentMethods.length})
            </h2>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  onDelete={handleDeletePaymentMethod}
                />
              ))}
            </div>
          </div>
        )}

        {/* Support info */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <p>We support Visa, Mastercard, American Express, and RuPay cards</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <p>UPI payments are supported for Indian users</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <p>All transactions are secured with 256-bit SSL encryption</p>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                <p>You can set any payment method as your default for faster checkout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}