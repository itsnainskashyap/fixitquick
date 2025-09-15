import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft,
  Gift,
  Copy,
  Share2,
  Users,
  IndianRupee,
  Star,
  Trophy,
  Smartphone,
  MessageCircle,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  ExternalLink,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  availableEarnings: number;
  pendingEarnings: number;
  referralHistory: ReferralRecord[];
  currentTier: string;
  nextTierProgress: number;
  monthlyTarget: number;
  monthlyProgress: number;
}

interface ReferralRecord {
  id: string;
  friendName: string;
  friendEmail?: string;
  status: 'pending' | 'completed' | 'cancelled';
  inviteDate: string;
  completionDate?: string;
  earnings: number;
  serviceUsed?: string;
}

const REFERRAL_TIERS = [
  { name: 'Bronze', min: 0, max: 4, bonus: 50, color: 'text-orange-600' },
  { name: 'Silver', min: 5, max: 9, bonus: 75, color: 'text-gray-600' },
  { name: 'Gold', min: 10, max: 19, bonus: 100, color: 'text-yellow-600' },
  { name: 'Platinum', min: 20, max: 49, bonus: 150, color: 'text-purple-600' },
  { name: 'Diamond', min: 50, max: 999, bonus: 200, color: 'text-blue-600' },
];

export default function ReferEarn() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch referral data
  const { data: referralData, isLoading } = useQuery<ReferralData>({
    queryKey: ['/api/v1/referrals/my-data'],
    enabled: !!user,
  });

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `${type} copied!`,
        description: `Your ${type.toLowerCase()} has been copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const shareVia = (platform: string) => {
    const text = `Join FixitQuick with my referral code ${referralData?.referralCode} and get ₹100 off your first service! ${referralData?.referralLink}`;
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData?.referralLink || '')}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'instagram':
        copyToClipboard(text, 'Message');
        toast({
          title: "Ready for Instagram",
          description: "The message is copied. You can paste it in your Instagram story or DM.",
        });
        break;
      case 'email':
        window.open(`mailto:?subject=Join FixitQuick&body=${encodeURIComponent(text)}`, '_blank');
        break;
      default:
        break;
    }
  };

  const getCurrentTier = () => {
    if (!referralData) return REFERRAL_TIERS[0];
    return REFERRAL_TIERS.find(tier => 
      referralData.successfulReferrals >= tier.min && 
      referralData.successfulReferrals <= tier.max
    ) || REFERRAL_TIERS[0];
  };

  const getNextTier = () => {
    if (!referralData) return REFERRAL_TIERS[1];
    const currentIndex = REFERRAL_TIERS.findIndex(tier => 
      referralData.successfulReferrals >= tier.min && 
      referralData.successfulReferrals <= tier.max
    );
    return REFERRAL_TIERS[currentIndex + 1] || REFERRAL_TIERS[REFERRAL_TIERS.length - 1];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <div className="w-4 h-4 rounded-full bg-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleBack = () => {
    setLocation('/account');
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 px-4 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progressToNext = nextTier ? ((referralData?.successfulReferrals || 0) / nextTier.min) * 100 : 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="pt-32 px-4 pb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">Refer & Earn</h1>
          <p className="text-muted-foreground">
            Invite friends and earn rewards together
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center space-x-2">
              <Share2 className="w-4 h-4" />
              <span>Invite</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Earnings Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full">
                        <IndianRupee className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">₹{referralData?.totalEarnings || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Earnings</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{referralData?.successfulReferrals || 0}</p>
                      <p className="text-sm text-muted-foreground">Successful Referrals</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-full">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{referralData?.pendingReferrals || 0}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full">
                        <Star className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{currentTier.name}</p>
                      <p className="text-sm text-muted-foreground">Current Tier</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tier Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5" />
                    <span>Tier Progress</span>
                  </CardTitle>
                  <CardDescription>
                    Reach the next tier to unlock higher bonuses
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className={currentTier.color}>
                        {currentTier.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">₹{currentTier.bonus} per referral</span>
                    </div>
                    {nextTier && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Next:</span>
                        <Badge variant="outline" className={nextTier.color}>
                          {nextTier.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">₹{nextTier.bonus} per referral</span>
                      </div>
                    )}
                  </div>
                  
                  {nextTier && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress to {nextTier.name}</span>
                        <span>{referralData?.successfulReferrals || 0} / {nextTier.min}</span>
                      </div>
                      <Progress value={Math.min(progressToNext, 100)} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {Math.max(0, nextTier.min - (referralData?.successfulReferrals || 0))} more referrals to reach {nextTier.name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Referral Code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Your Referral Code</CardTitle>
                  <CardDescription>
                    Share this code with friends to start earning
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={referralData?.referralCode || ''}
                      readOnly
                      className="font-mono text-lg text-center bg-muted"
                      data-testid="input-referral-code"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(referralData?.referralCode || '', 'Referral code')}
                      data-testid="button-copy-code"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Input
                      value={referralData?.referralLink || ''}
                      readOnly
                      className="text-sm bg-muted"
                      data-testid="input-referral-link"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(referralData?.referralLink || '', 'Referral link')}
                      data-testid="button-copy-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Invite Tab */}
          <TabsContent value="invite" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Share2 className="w-5 h-5" />
                    <span>Share & Invite</span>
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to invite your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Share Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => shareVia('whatsapp')}
                      data-testid="button-share-whatsapp"
                    >
                      <MessageCircle className="w-6 h-6 text-green-600" />
                      <span className="text-sm">WhatsApp</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => shareVia('sms')}
                      data-testid="button-share-sms"
                    >
                      <Smartphone className="w-6 h-6 text-blue-600" />
                      <span className="text-sm">SMS</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => shareVia('facebook')}
                      data-testid="button-share-facebook"
                    >
                      <Facebook className="w-6 h-6 text-blue-700" />
                      <span className="text-sm">Facebook</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => shareVia('email')}
                      data-testid="button-share-email"
                    >
                      <Mail className="w-6 h-6 text-gray-600" />
                      <span className="text-sm">Email</span>
                    </Button>
                  </div>

                  <Separator />

                  {/* How it works */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">How it works:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">1</span>
                        </div>
                        <h4 className="font-medium">Share your code</h4>
                        <p className="text-sm text-muted-foreground">
                          Send your referral code to friends via your preferred method
                        </p>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">2</span>
                        </div>
                        <h4 className="font-medium">Friend signs up</h4>
                        <p className="text-sm text-muted-foreground">
                          They use your code to get ₹100 off their first service
                        </p>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">3</span>
                        </div>
                        <h4 className="font-medium">You both earn</h4>
                        <p className="text-sm text-muted-foreground">
                          You get ₹{currentTier.bonus} when they complete their first service
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Referral History</span>
                  </CardTitle>
                  <CardDescription>
                    Track all your referrals and earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!referralData?.referralHistory?.length ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No referrals yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start inviting friends to see your referral history here
                      </p>
                      <Button onClick={() => setActiveTab('invite')} data-testid="button-start-inviting">
                        Start Inviting
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {referralData.referralHistory.map((referral) => (
                        <div
                          key={referral.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>
                                {referral.friendName.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{referral.friendName}</p>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                {getStatusIcon(referral.status)}
                                <span className="capitalize">{referral.status}</span>
                                <span>•</span>
                                <span>{new Date(referral.inviteDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-medium">₹{referral.earnings}</p>
                            <Badge variant="outline" className={getStatusColor(referral.status)}>
                              {referral.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}