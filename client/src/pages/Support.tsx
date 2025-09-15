import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { RealTimeChat } from '@/components/RealTimeChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  supportTicketCreateSchema,
  supportCallbackRequestCreateSchema,
  supportTicketRatingSchema,
  type SupportTicketCreateData,
  type SupportCallbackRequestCreateData,
  type SupportTicketRatingData,
  type SupportTicket as SharedSupportTicket,
  type SupportTicketMessage as SharedSupportTicketMessage,
  type FAQ as SharedFAQ
} from '@shared/schema';
import { 
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  Search,
  HelpCircle,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Send,
  Paperclip,
  Star,
  ThumbsUp,
  ThumbsDown,
  Users,
  MessageSquare,
  PhoneCall,
  Video,
  Calendar,
  ExternalLink,
  Download,
  Upload,
  Image,
  Loader2,
  Plus,
  Filter,
  MoreVertical,
  RefreshCw,
  Archive,
  Ban,
  Shield,
  Award,
  BookOpen,
  Lightbulb,
  Target,
  TrendingUp,
  Globe,
  Smartphone,
  Headphones,
  Bot,
  User,
  Building,
  Settings,
  Bell,
  Bookmark,
  Share2,
  Copy,
  Flag,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Timer,
  Dot,
  ChevronRight,
  X
} from 'lucide-react';

// Use shared schemas for consistency
type SupportTicketFormData = SupportTicketCreateData;
type CallbackRequestFormData = SupportCallbackRequestCreateData;
type SupportRatingFormData = SupportTicketRatingData;

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  description: string;
  orderId?: string;
  assignedAgent?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  messages: SupportMessage[];
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  rating?: number;
  tags: string[];
}

interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName: string;
  message: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
}

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpfulCount: number;
  tags: string[];
  lastUpdated: string;
}

interface ContactOption {
  id: string;
  type: 'chat' | 'email' | 'phone' | 'whatsapp' | 'video';
  title: string;
  description: string;
  availability: string;
  responseTime: string;
  icon: React.ReactNode;
  isAvailable: boolean;
}

interface SupportStats {
  openTickets: number;
  avgResponseTime: string;
  resolutionRate: number;
  satisfactionScore: number;
}

export default function Support() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [showCallbackDialog, setShowCallbackDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [ticketFilters, setTicketFilters] = useState({ status: 'all', priority: 'all', category: 'all' });
  
  // Forms
  const ticketForm = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketCreateSchema),
    defaultValues: {
      category: 'general',
      priority: 'medium',
      subject: '',
      description: '',
    },
  });

  const callbackForm = useForm<CallbackRequestFormData>({
    resolver: zodResolver(supportCallbackRequestCreateSchema),
    defaultValues: {
      priority: 'medium',
    },
  });

  // Contact options configuration
  const contactOptions: ContactOption[] = [
    {
      id: 'live-chat',
      type: 'chat',
      title: 'Live Chat',
      description: 'Get instant help from our support agents',
      availability: '24/7',
      responseTime: 'Immediate',
      icon: <MessageCircle className="h-6 w-6" />,
      isAvailable: true,
    },
    {
      id: 'phone',
      type: 'phone',
      title: 'Phone Support',
      description: 'Speak directly with our support team',
      availability: '6 AM - 12 AM',
      responseTime: 'Immediate',
      icon: <Phone className="h-6 w-6" />,
      isAvailable: true,
    },
    {
      id: 'email',
      type: 'email',
      title: 'Email Support',
      description: 'Send detailed queries and get comprehensive responses',
      availability: '24/7',
      responseTime: 'Within 4 hours',
      icon: <Mail className="h-6 w-6" />,
      isAvailable: true,
    },
    {
      id: 'whatsapp',
      type: 'whatsapp',
      title: 'WhatsApp Support',
      description: 'Chat with us on WhatsApp for quick assistance',
      availability: '8 AM - 8 PM',
      responseTime: 'Within 15 minutes',
      icon: <MessageSquare className="h-6 w-6" />,
      isAvailable: true,
    },
    {
      id: 'video',
      type: 'video',
      title: 'Video Call',
      description: 'Schedule a video consultation for complex issues',
      availability: 'By appointment',
      responseTime: 'Within 24 hours',
      icon: <Video className="h-6 w-6" />,
      isAvailable: true,
    },
  ];

  // Data fetching
  const { data: supportTickets = [], isLoading: isLoadingTickets } = useQuery<SupportTicket[]>({
    queryKey: ['/api/v1/support/tickets'],
  });

  const { data: faqData = [], isLoading: isLoadingFAQ } = useQuery<FAQ[]>({
    queryKey: ['/api/v1/support/faq'],
  });

  const { data: supportStats } = useQuery<SupportStats>({
    queryKey: ['/api/v1/support/stats'],
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async (data: SupportTicketFormData) => {
      const response = await apiRequest('POST', '/api/v1/support/tickets', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/support/tickets'] });
      setShowNewTicketDialog(false);
      ticketForm.reset();
      toast({
        title: "Support ticket created",
        description: `Ticket #${data.ticketNumber} has been created. We'll respond within 4 hours.`,
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

  const requestCallbackMutation = useMutation({
    mutationFn: async (data: CallbackRequestFormData) => {
      const response = await apiRequest('POST', '/api/v1/support/callback-request', data);
      return response.json();
    },
    onSuccess: () => {
      setShowCallbackDialog(false);
      callbackForm.reset();
      toast({
        title: "Callback requested",
        description: "We'll call you back within 30 minutes during business hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to request callback",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Filter and search
  const filteredTickets = supportTickets.filter((ticket) => {
    const matchesSearch = !searchQuery || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = ticketFilters.status === 'all' || ticket.status === ticketFilters.status;
    const matchesPriority = ticketFilters.priority === 'all' || ticket.priority === ticketFilters.priority;
    const matchesCategory = ticketFilters.category === 'all' || ticket.category === ticketFilters.category;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const filteredFAQ = faqData.filter((faq) =>
    !searchQuery || 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handlers
  const handleContactOption = (option: ContactOption) => {
    switch (option.type) {
      case 'chat':
        setShowChatDialog(true);
        break;
      case 'phone':
        setShowCallbackDialog(true);
        break;
      case 'email':
        setShowNewTicketDialog(true);
        break;
      case 'whatsapp':
        window.open('https://wa.me/919999999999?text=Hi, I need help with FixitQuick', '_blank');
        break;
      case 'video':
        // Implement video call scheduling
        toast({
          title: "Video call booking",
          description: "Video call feature will be available soon. Please use other contact methods for now.",
        });
        break;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/account')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Support Center</h1>
                <p className="text-muted-foreground">Get help and find answers to your questions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowNewTicketDialog(true)}
                data-testid="button-new-ticket"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowChatDialog(true)}
                data-testid="button-live-chat"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Live Chat
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-bold">{supportStats?.openTickets ?? 0}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{supportStats?.avgResponseTime ?? '2h'}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Timer className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolution Rate</p>
                  <p className="text-2xl font-bold">{supportStats?.resolutionRate ?? 95}%</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Satisfaction</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    {supportStats?.satisfactionScore ?? 4.8}
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="contact" data-testid="tab-contact">Contact Us</TabsTrigger>
              <TabsTrigger value="tickets" data-testid="tab-tickets">My Tickets</TabsTrigger>
              <TabsTrigger value="faq" data-testid="tab-faq">FAQ</TabsTrigger>
              <TabsTrigger value="resources" data-testid="tab-resources">Resources</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Contact Methods Grid */}
              <div>
                <h2 className="text-xl font-semibold mb-4">How can we help you today?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contactOptions.map((option) => (
                    <Card 
                      key={option.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleContactOption(option)}
                      data-testid={`card-contact-${option.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            {option.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold">{option.title}</h3>
                            <Badge variant={option.isAvailable ? "default" : "secondary"}>
                              {option.isAvailable ? 'Available' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{option.availability}</span>
                          <span>{option.responseTime}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick FAQ */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Popular Questions</h2>
                <div className="space-y-3">
                  {faqData.slice(0, 5).map((faq: FAQ) => (
                    <Card key={faq.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{faq.question}</h3>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setActiveTab('faq')}
                  data-testid="button-view-all-faq"
                >
                  View All FAQs
                </Button>
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {contactOptions.map((option) => (
                  <Card key={option.id}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="flex items-center justify-between">
                            {option.title}
                            <Badge variant={option.isAvailable ? "default" : "secondary"}>
                              {option.isAvailable ? 'Available' : 'Offline'}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Availability:</span>
                          <span className="font-medium">{option.availability}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Response Time:</span>
                          <span className="font-medium">{option.responseTime}</span>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => handleContactOption(option)}
                          disabled={!option.isAvailable}
                          data-testid={`button-contact-${option.id}`}
                        >
                          {option.type === 'chat' ? 'Start Chat' :
                           option.type === 'phone' ? 'Request Call' :
                           option.type === 'email' ? 'Send Email' :
                           option.type === 'whatsapp' ? 'Message on WhatsApp' :
                           'Schedule Call'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search tickets..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-tickets"
                        />
                      </div>
                    </div>
                    <Select value={ticketFilters.status} onValueChange={(value) => setTicketFilters(prev => ({...prev, status: value}))}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={ticketFilters.priority} onValueChange={(value) => setTicketFilters(prev => ({...prev, priority: value}))}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Tickets List */}
              {isLoadingTickets ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="space-y-4">
                  {filteredTickets.map((ticket: SupportTicket) => (
                    <Card 
                      key={ticket.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTicket(ticket)}
                      data-testid={`card-ticket-${ticket.ticketNumber}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm font-semibold">#{ticket.ticketNumber}</span>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {ticket.priority.toUpperCase()}
                              </Badge>
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status.toUpperCase()}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {ticket.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                              <span>Category: {ticket.category}</span>
                              {ticket.orderId && <span>Order: #{ticket.orderId}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {ticket.assignedAgent && (
                              <div className="flex items-center gap-2 text-xs">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-3 w-3" />
                                </div>
                                <span>{ticket.assignedAgent.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageCircle className="h-3 w-3" />
                              <span>{ticket.messages.length}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No support tickets found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || ticketFilters.status !== 'all' || ticketFilters.priority !== 'all' 
                        ? "Try adjusting your search or filters"
                        : "You haven't created any support tickets yet"
                      }
                    </p>
                    <Button onClick={() => setShowNewTicketDialog(true)} data-testid="button-create-first-ticket">
                      Create Your First Ticket
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* FAQ Tab */}
            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search FAQs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-faq"
                    />
                  </div>
                </CardContent>
              </Card>

              {isLoadingFAQ ? (
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {filteredFAQ.map((faq: FAQ) => (
                    <Card key={faq.id}>
                      <AccordionItem value={faq.id} className="border-none">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <div className="flex items-start gap-4 text-left">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1 flex-shrink-0">
                              <HelpCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{faq.question}</h3>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{faq.category}</Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ThumbsUp className="h-3 w-3" />
                                  {faq.helpfulCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                          <div className="pl-12">
                            <div className="prose max-w-none text-sm text-muted-foreground mb-4">
                              {faq.answer}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                {faq.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Was this helpful?</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                  ))}
                </Accordion>
              )}

              {filteredFAQ.length === 0 && !isLoadingFAQ && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No FAQs found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery 
                        ? "Try searching with different keywords" 
                        : "FAQs will appear here once they are added"
                      }
                    </p>
                    <Button onClick={() => setShowNewTicketDialog(true)} data-testid="button-ask-question">
                      Ask a Question
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      User Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Complete guide on how to use FixitQuick platform effectively.
                    </p>
                    <Button variant="outline" className="w-full" data-testid="button-user-guide">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open User Guide
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Video Tutorials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Step-by-step video tutorials for common tasks.
                    </p>
                    <Button variant="outline" className="w-full" data-testid="button-video-tutorials">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Watch Tutorials
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Community Forum
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Connect with other users and share experiences.
                    </p>
                    <Button variant="outline" className="w-full" data-testid="button-community-forum">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Community
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Mobile App
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Download our mobile app for better experience on the go.
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full" data-testid="button-download-android">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Download for Android
                      </Button>
                      <Button variant="outline" className="w-full" data-testid="button-download-ios">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Download for iOS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <BottomNavigation />

      {/* New Support Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue in detail so we can help you better.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...ticketForm}>
            <form onSubmit={ticketForm.handleSubmit((data) => createTicketMutation.mutate(data))} className="space-y-4">
              <FormField
                control={ticketForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief description of your issue" 
                        {...field} 
                        data-testid="input-ticket-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ticketForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="billing">Billing & Payments</SelectItem>
                          <SelectItem value="account">Account Management</SelectItem>
                          <SelectItem value="order">Order Support</SelectItem>
                          <SelectItem value="provider">Provider Issues</SelectItem>
                          <SelectItem value="general">General Inquiry</SelectItem>
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
              </div>

              <FormField
                control={ticketForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide detailed information about your issue..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-ticket-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={ticketForm.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order ID (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter order ID if this issue is related to a specific order" 
                        {...field}
                        data-testid="input-ticket-order-id"
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
                  {createTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Ticket
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Callback Request Dialog */}
      <Dialog open={showCallbackDialog} onOpenChange={setShowCallbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Callback</DialogTitle>
            <DialogDescription>
              We'll call you back within 30 minutes during business hours.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...callbackForm}>
            <form onSubmit={callbackForm.handleSubmit((data) => requestCallbackMutation.mutate(data))} className="space-y-4">
              <FormField
                control={callbackForm.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+91 9999999999" 
                        {...field}
                        data-testid="input-callback-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={callbackForm.control}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-callback-time">
                          <SelectValue placeholder="Select preferred time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="now">Right Now</SelectItem>
                        <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                        <SelectItem value="evening">Evening (6 PM - 9 PM)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={callbackForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-callback-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={callbackForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What would you like to discuss?"
                        {...field}
                        data-testid="textarea-callback-reason"
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
                  onClick={() => setShowCallbackDialog(false)}
                  data-testid="button-cancel-callback"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={requestCallbackMutation.isPending}
                  data-testid="button-request-callback"
                >
                  {requestCallbackMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Request Callback
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Live Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Live Chat Support</DialogTitle>
            <DialogDescription>
              Chat with our support team for immediate assistance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 p-6 pt-4">
            <RealTimeChat 
              orderId={`support-${user?.id || 'guest'}`}
              variant="modal"
              showHeader={false}
              maxHeight="400px"
              autoFocus={true}
              showQuickReplies={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <span>#{selectedTicket.ticketNumber}</span>
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.toUpperCase()}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>{selectedTicket.subject}</DialogDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedTicket(null)}
                  data-testid="button-close-ticket-detail"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-6 pt-4">
              <div className="space-y-4">
                {selectedTicket.messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex gap-3 ${message.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.senderType === 'customer' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{message.senderName}</span>
                        <span className="text-xs opacity-70">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-6 pt-0 border-t">
              <div className="flex gap-2">
                <Input 
                  placeholder="Type your reply..." 
                  className="flex-1"
                  data-testid="input-ticket-reply"
                />
                <Button data-testid="button-send-reply">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}