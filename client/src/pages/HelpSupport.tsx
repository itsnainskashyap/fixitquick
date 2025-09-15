import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  Search,
  Plus,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  Calendar,
  Loader2
} from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  message: string;
  isFromCustomer: boolean;
  timestamp: string;
  attachments?: string[];
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

// Support ticket form schema
const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(100, 'Subject too long'),
  description: z.string().min(20, 'Please provide a detailed description').max(1000, 'Description too long'),
  category: z.string().min(1, 'Please select a category'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type SupportTicketFormData = z.infer<typeof supportTicketSchema>;

const FAQ_DATA: FAQ[] = [
  {
    id: '1',
    question: 'How do I book a service?',
    answer: 'You can book a service by selecting the category from our home page, choosing your preferred service, selecting date and time, and confirming your booking.',
    category: 'booking',
    helpful: 45,
    notHelpful: 2
  },
  {
    id: '2',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards, UPI, net banking, and digital wallets. You can also pay cash on delivery.',
    category: 'payment',
    helpful: 38,
    notHelpful: 1
  },
  {
    id: '3',
    question: 'Can I reschedule my service?',
    answer: 'Yes, you can reschedule your service up to 4 hours before the scheduled time. Go to "My Orders" and select "Reschedule" option.',
    category: 'booking',
    helpful: 32,
    notHelpful: 3
  },
  {
    id: '4',
    question: 'How do I cancel my booking?',
    answer: 'You can cancel your booking from "My Orders" section. Cancellation charges may apply based on the timing of cancellation.',
    category: 'booking',
    helpful: 29,
    notHelpful: 5
  },
  {
    id: '5',
    question: 'Is my data safe with FixitQuick?',
    answer: 'Yes, we use industry-standard encryption and security measures to protect your personal and payment information.',
    category: 'security',
    helpful: 41,
    notHelpful: 1
  },
  {
    id: '6',
    question: 'How do I track my service provider?',
    answer: 'Once your service is confirmed, you will receive real-time tracking information and can contact your service provider directly.',
    category: 'tracking',
    helpful: 35,
    notHelpful: 2
  }
];

const SUPPORT_CATEGORIES = [
  'booking',
  'payment',
  'account',
  'service_quality',
  'technical_issue',
  'refund',
  'other'
];

export default function HelpSupport() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);

  // Support ticket form
  const ticketForm = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: '',
      description: '',
      category: '',
      priority: 'medium',
    },
  });

  // Fetch support tickets
  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery<SupportTicket[]>({
    queryKey: ['/api/v1/support/tickets'],
    enabled: !!user && activeTab === 'tickets',
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: SupportTicketFormData) => {
      const response = await apiRequest('POST', '/api/v1/support/tickets', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/support/tickets'] });
      setShowNewTicketDialog(false);
      ticketForm.reset();
      toast({
        title: "Support ticket created",
        description: "Our team will respond to you shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create ticket",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Filter FAQs based on search
  const filteredFAQs = FAQ_DATA.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBack = () => {
    setLocation('/account');
  };

  const handleTicketSubmit = (data: SupportTicketFormData) => {
    createTicketMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'closed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (!user) {
    setLocation('/login');
    return null;
  }

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
          
          <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
          <p className="text-muted-foreground">
            Get help and support for your FixitQuick experience
          </p>
        </motion.div>

        {/* Quick Contact Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium mb-1">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-3">Available 24/7</p>
              <Button size="sm" className="w-full" data-testid="button-live-chat">
                Start Chat
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-1">Call Support</h3>
              <p className="text-sm text-muted-foreground mb-3">+91 1800-123-4567</p>
              <Button variant="outline" size="sm" className="w-full" data-testid="button-call-support">
                Call Now
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium mb-1">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-3">support@fixitquick.com</p>
              <Button variant="outline" size="sm" className="w-full" data-testid="button-email-support">
                Send Email
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq" className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4" />
              <span>FAQs</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>My Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Resources</span>
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search frequently asked questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-faq"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* FAQ List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Find answers to common questions about our services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredFAQs.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No results found</h3>
                      <p className="text-muted-foreground">
                        Try searching with different keywords or browse all FAQs
                      </p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {filteredFAQs.map((faq, index) => (
                        <AccordionItem key={faq.id} value={`item-${index}`}>
                          <AccordionTrigger className="text-left">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3">
                            <p className="text-muted-foreground">{faq.answer}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                                <div className="flex items-center space-x-2">
                                  <Button variant="ghost" size="sm" data-testid={`button-helpful-${faq.id}`}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Yes ({faq.helpful})
                                  </Button>
                                  <Button variant="ghost" size="sm" data-testid={`button-not-helpful-${faq.id}`}>
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    No ({faq.notHelpful})
                                  </Button>
                                </div>
                              </div>
                              <Badge variant="secondary" className="capitalize">
                                {faq.category}
                              </Badge>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            {/* New Ticket Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex justify-between items-center"
            >
              <div>
                <h2 className="text-lg font-semibold">Support Tickets</h2>
                <p className="text-muted-foreground">Track and manage your support requests</p>
              </div>
              <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-ticket">
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create Support Ticket</DialogTitle>
                    <DialogDescription>
                      Describe your issue and our support team will help you.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...ticketForm}>
                    <form onSubmit={ticketForm.handleSubmit(handleTicketSubmit)} className="space-y-4">
                      <FormField
                        control={ticketForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Brief description of your issue"
                                data-testid="input-ticket-subject"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={ticketForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ticket-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SUPPORT_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category.replace('_', ' ').toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={ticketForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-ticket-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={ticketForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Please provide a detailed description of your issue..."
                                rows={4}
                                data-testid="textarea-ticket-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewTicketDialog(false)}
                          data-testid="button-cancel-ticket"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createTicketMutation.isPending}
                          data-testid="button-submit-ticket"
                        >
                          {createTicketMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Create Ticket
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Tickets List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  {isLoadingTickets ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" />
                      <p className="text-muted-foreground">Loading your tickets...</p>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No support tickets</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven't created any support tickets yet
                      </p>
                      <Button onClick={() => setShowNewTicketDialog(true)} data-testid="button-create-first-ticket">
                        Create Your First Ticket
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          data-testid={`ticket-${ticket.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium">{ticket.subject}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>#{ticket.id}</span>
                            <div className="flex items-center space-x-4">
                              <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                              <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Video Tutorials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="w-5 h-5" />
                    <span>Video Tutorials</span>
                  </CardTitle>
                  <CardDescription>
                    Learn how to use FixitQuick with step-by-step videos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-tutorial-booking">
                      <Video className="w-4 h-4 mr-2" />
                      How to book a service
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-tutorial-payment">
                      <Video className="w-4 h-4 mr-2" />
                      Setting up payment methods
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-tutorial-tracking">
                      <Video className="w-4 h-4 mr-2" />
                      Tracking your service
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* User Guides */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>User Guides</span>
                  </CardTitle>
                  <CardDescription>
                    Detailed guides and documentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-guide-getting-started">
                      <FileText className="w-4 h-4 mr-2" />
                      Getting Started Guide
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-guide-troubleshooting">
                      <FileText className="w-4 h-4 mr-2" />
                      Troubleshooting Guide
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" data-testid="button-guide-safety">
                      <FileText className="w-4 h-4 mr-2" />
                      Safety Guidelines
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Headphones className="w-5 h-5" />
                    <span>Contact Information</span>
                  </CardTitle>
                  <CardDescription>
                    Get in touch with our support team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Phone Support</p>
                        <p className="text-sm text-muted-foreground">+91 1800-123-4567</p>
                        <p className="text-xs text-muted-foreground">Available 24/7</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-sm text-muted-foreground">support@fixitquick.com</p>
                        <p className="text-xs text-muted-foreground">Response within 24 hours</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Business Hours</p>
                        <p className="text-sm text-muted-foreground">Monday - Sunday: 6 AM - 12 AM</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* App Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Info className="w-5 h-5" />
                    <span>App Information</span>
                  </CardTitle>
                  <CardDescription>
                    About the FixitQuick app
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">App Version</span>
                    <span className="text-sm font-medium">2.1.4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm font-medium">Dec 15, 2023</span>
                  </div>
                  <Separator />
                  <Button variant="ghost" className="w-full justify-start" data-testid="button-privacy-policy">
                    <FileText className="w-4 h-4 mr-2" />
                    Privacy Policy
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" data-testid="button-terms-service">
                    <FileText className="w-4 h-4 mr-2" />
                    Terms of Service
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Button>
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