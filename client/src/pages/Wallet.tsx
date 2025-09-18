import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { 
  Wallet, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Gift,
  History,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote
} from 'lucide-react';

// Initialize Stripe
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripeKey) {
  console.warn('⚠️ VITE_STRIPE_PUBLISHABLE_KEY not found - Stripe payments disabled');
}
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// Stripe Payment Form Component
const StripePaymentForm = ({ amount, onSuccess, onCancel }: { 
  amount: number; 
  onSuccess: () => void; 
  onCancel: () => void; 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/wallet?payment=success`,
        },
      });

      if (error) {
        console.error('Stripe payment error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Money has been added to your wallet!",
        });
        onSuccess();
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      toast({
        title: "Payment Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Add ₹{amount} to Wallet</h3>
        <p className="text-sm text-muted-foreground">
          Complete your payment to add money to your wallet
        </p>
      </div>
      
      <PaymentElement />
      
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
          data-testid="complete-payment"
        >
          {processing ? 'Processing...' : `Pay ₹${amount}`}
        </Button>
      </div>
    </form>
  );
};

interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  orderId?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

interface WalletData {
  balance: string;
  fixiPoints: number;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Fetch wallet data
  const { data: walletData, isLoading } = useQuery<WalletData>({
    queryKey: ['/api/v1/wallet/balance'],
    enabled: !!user,
  });

  // Fetch transactions
  const { data: transactions } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/v1/wallet/transactions'],
    enabled: !!user,
  });

  // Top-up mutation - Updated for Stripe integration
  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/v1/wallet/topup', { amount });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.clientSecret) {
        // Set client secret for Stripe payment
        setClientSecret(data.clientSecret);
        setShowPaymentDialog(true);
        toast({
          title: "Payment Ready",
          description: "Complete your payment to add money to your wallet.",
        });
      } else {
        toast({
          title: "Payment Setup Failed",
          description: "Unable to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('Topup error:', error);
      toast({
        title: "Top-up failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Redeem points mutation
  const redeemPointsMutation = useMutation({
    mutationFn: async (points: number) => {
      const response = await apiRequest('POST', '/api/v1/wallet/redeem-points', { 
        points,
        for: 'discount'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/wallet/balance'] });
      toast({
        title: "Points redeemed successfully",
        description: "Discount has been added to your wallet.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to redeem points",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleTopup = () => {
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (minimum ₹1).",
        variant: "destructive",
      });
      return;
    }

    if (amount > 50000) {
      toast({
        title: "Amount too high",
        description: "Maximum top-up amount is ₹50,000.",
        variant: "destructive",
      });
      return;
    }

    topupMutation.mutate(amount);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
    setTopupAmount('');
    queryClient.invalidateQueries({ queryKey: ['/api/v1/wallet/balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/wallet/transactions'] });
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
  };

  const handleRedeemPoints = () => {
    const pointsToRedeem = Math.min(walletData?.fixiPoints || 0, 1000);
    if (pointsToRedeem < 100) {
      toast({
        title: "Insufficient points",
        description: "You need at least 100 FixiPoints to redeem.",
        variant: "destructive",
      });
      return;
    }

    redeemPointsMutation.mutate(pointsToRedeem);
  };

  const getTransactionIcon = (transaction: WalletTransaction) => {
    if (transaction.type === 'credit') {
      return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-red-600" />;
  };

  const getTransactionColor = (transaction: WalletTransaction) => {
    if (transaction.type === 'credit') {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <Layout>
      <main className="pb-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">My Wallet</h1>
          <p className="text-muted-foreground">Manage your balance and transactions</p>
        </motion.div>

        {/* Wallet Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-6 h-6" />
                  <span className="text-lg font-medium">Wallet Balance</span>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" data-testid="add-money-button">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Money
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Money to Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="Enter amount"
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(e.target.value)}
                          data-testid="topup-amount-input"
                        />
                      </div>
                      <div className="flex space-x-2">
                        {[100, 500, 1000, 2000].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setTopupAmount(amount.toString())}
                            data-testid={`quick-amount-${amount}`}
                          >
                            ₹{amount}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={handleTopup}
                        disabled={topupMutation.isPending}
                        className="w-full"
                        data-testid="confirm-topup"
                      >
                        {topupMutation.isPending ? 'Processing...' : 'Add Money'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="text-3xl font-bold mb-2">
                ₹{walletData?.balance ? parseFloat(walletData.balance).toFixed(2) : '0.00'}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-300" />
                    <span className="text-sm">{walletData?.fixiPoints || 0} FixiPoints</span>
                  </div>
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRedeemPoints}
                  disabled={redeemPointsMutation.isPending || (walletData?.fixiPoints || 0) < 100}
                  data-testid="redeem-points-button"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  Redeem
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Wallet Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" data-testid="overview-tab">
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions" data-testid="transactions-tab">
                Transactions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" data-testid="pay-bills">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay for Services
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/wallet/transfer')}
                      data-testid="transfer-money"
                    >
                      <Banknote className="w-4 h-4 mr-2" />
                      Transfer Money
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('transactions')}
                      data-testid="view-history"
                    >
                      <History className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </CardContent>
                </Card>

                {/* Spending Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-muted-foreground">Money Added</span>
                        </div>
                        <span className="font-medium text-green-600">₹2,500</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-muted-foreground">Money Spent</span>
                        </div>
                        <span className="font-medium text-red-600">₹1,850</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Net Balance</span>
                        <span className="font-bold text-primary">+₹650</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FixiPoints Info */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span>FixiPoints Program</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary mb-1">
                          {walletData?.fixiPoints || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Current Points</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary mb-1">₹1 = 1</div>
                        <div className="text-sm text-muted-foreground">Points Earned</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary mb-1">100</div>
                        <div className="text-sm text-muted-foreground">Min. Redeem</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Earn 1 FixiPoint for every ₹50 spent on services. 
                        Redeem 100 points for ₹10 wallet credit.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              {transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction: WalletTransaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              {getTransactionIcon(transaction)}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleString()}
                              </p>
                              {transaction.orderId && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Order #{transaction.orderId.slice(-6)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`font-semibold ${getTransactionColor(transaction)}`}>
                              {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                            </p>
                            <Badge
                              variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No transactions yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Your wallet transactions will appear here
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Stripe Payment Dialog */}
      {clientSecret && stripePromise && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#6366f1',
                  },
                },
              }}
            >
              <StripePaymentForm
                amount={parseFloat(topupAmount)}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
