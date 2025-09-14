import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderChat } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from 'date-fns';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  MapPin,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Search,
  Flag,
  Download,
  Archive,
  Copy,
  Reply,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Camera,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  StopCircle,
  Trash2,
  Eye,
  EyeOff,
  Edit,
  MessageCircle,
  Users,
  Settings,
  Star,
  StarOff,
  Pin,
  PinOff,
  ExternalLink,
  Check,
  CheckCheck
} from 'lucide-react';

interface Message {
  id: string;
  orderId: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: 'text' | 'image' | 'location' | 'voice' | 'file' | 'system';
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
  senderName?: string;
  senderImage?: string;
  editedAt?: string;
  replyTo?: string;
  reactions?: { emoji: string; userId: string; userName: string }[];
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number; // for voice messages
    location?: { latitude: number; longitude: number; address?: string };
  };
}

interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  role: 'user' | 'service_provider' | 'parts_provider' | 'admin';
  isOnline?: boolean;
  lastSeen?: string;
}

interface ChatProps {
  orderId: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  compact?: boolean;
  className?: string;
  variant?: 'sidebar' | 'modal' | 'inline' | 'floating';
  showHeader?: boolean;
  maxHeight?: string;
  onClose?: () => void;
  autoFocus?: boolean;
  allowFileUpload?: boolean;
  allowVoiceMessages?: boolean;
  allowLocationSharing?: boolean;
  showQuickReplies?: boolean;
  quickReplies?: string[];
  customActions?: React.ReactNode;
}

const defaultQuickReplies = [
  "I'll be there in 10 minutes",
  "Work has been completed",
  "Please check and confirm",
  "Need more details",
  "Running a bit late",
  "All set, thank you!"
];

const emojiOptions = ['👍', '👎', '❤️', '😊', '😢', '😂', '😮', '😡', '🔥', '✅'];

export function RealTimeChat({ 
  orderId, 
  isOpen = false, 
  onToggle, 
  compact = false,
  className = '',
  variant = 'inline',
  showHeader = true,
  maxHeight = '500px',
  onClose,
  autoFocus = false,
  allowFileUpload = true,
  allowVoiceMessages = true,
  allowLocationSharing = true,
  showQuickReplies = true,
  quickReplies = defaultQuickReplies,
  customActions
}: ChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Chat hook with real-time functionality
  const {
    messages: hookMessages,
    sendChatMessage,
    markAsRead,
    unreadCount,
    typingUsers,
    isConnected,
    sendTypingIndicator
  } = useOrderChat(orderId);
  
  // Local state management
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickRepliesPanel, setShowQuickRepliesPanel] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get order and participant details
  const { data: orderDetails } = useQuery({
    queryKey: ['/api/v1/orders', orderId],
    enabled: !!orderId,
  });

  const { data: participants } = useQuery({
    queryKey: ['/api/v1/chat', orderId, 'participants'],
    enabled: !!orderId,
  });

  // Convert messages with proper typing
  const messages = useMemo(() => {
    return (hookMessages || []).map(msg => ({
      ...msg,
      createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString(),
    } as Message));
  }, [hookMessages]);

  // Filter messages based on search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg => 
      msg.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Mark messages as read when chat is visible
  useEffect(() => {
    if (messages.length > 0 && user && (isOpen || variant === 'inline')) {
      const unreadMessages = messages.filter(msg => !msg.isRead && msg.senderId !== user.uid);
      if (unreadMessages.length > 0) {
        markAsRead(unreadMessages.map(msg => msg.id));
      }
    }
  }, [messages, user, markAsRead, isOpen, variant]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 3000);
  }, [isTyping, sendTypingIndicator]);

  // Send message function
  const handleSendMessage = useCallback(async (messageText?: string, messageType: 'text' | 'image' | 'location' | 'voice' | 'file' = 'text', attachments: string[] = []) => {
    const content = messageText || newMessage.trim();
    if (!content && attachments.length === 0) return;

    const success = sendChatMessage(content, messageType, attachments);
    if (success) {
      setNewMessage('');
      setReplyTo(null);
      setShowQuickRepliesPanel(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
        sendTypingIndicator(false);
      }
    }
  }, [newMessage, sendChatMessage, sendTypingIndicator]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File upload mutation
  const fileUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderId', orderId);
      
      const response = await fetch('/api/v1/upload/chat', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      handleSendMessage(`Shared a file: ${data.originalName}`, 'file', [data.url]);
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    fileUploadMutation.mutate(file);
    
    // Clear input
    e.target.value = '';
  };

  // Voice recording functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingDuration(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice-message.wav');
    formData.append('orderId', orderId);
    formData.append('duration', recordingDuration.toString());

    try {
      const response = await fetch('/api/v1/upload/voice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      handleSendMessage(`Voice message (${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')})`, 'voice', [data.url]);
      
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send voice message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAudioBlob(null);
      setRecordingDuration(0);
      setIsUploading(false);
    }
  };

  const discardVoiceMessage = () => {
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  // Share location
  const shareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Get address from coordinates (could use reverse geocoding API)
          const locationMessage = `📍 My location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          handleSendMessage(locationMessage, 'location', [`${latitude},${longitude}`]);
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Could not access location. Please check permissions.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Not Supported",
        description: "Location sharing is not supported in this browser.",
        variant: "destructive",
      });
    }
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  // Message component
  const MessageBubble = ({ message }: { message: Message }) => {
    const isOwn = message.senderId === user?.uid;
    const isSystem = message.messageType === 'system';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 ${isSystem ? 'justify-center' : ''}`}
      >
        {!isOwn && !isSystem && (
          <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
            <AvatarImage src={message.senderImage} />
            <AvatarFallback>
              {message.senderName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[70%] ${isSystem ? 'max-w-[90%]' : ''}`}>
          {!isOwn && !isSystem && (
            <div className="text-sm text-muted-foreground mb-1">
              {message.senderName}
            </div>
          )}
          
          <div
            className={`
              rounded-lg px-4 py-2 relative group
              ${isSystem 
                ? 'bg-muted text-muted-foreground text-center text-sm' 
                : isOwn 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }
            `}
          >
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="text-xs opacity-70 mb-1 border-l-2 border-current pl-2">
                Replying to message
              </div>
            )}
            
            {/* Message content based on type */}
            {message.messageType === 'text' && (
              <div className="whitespace-pre-wrap break-words">
                {message.message}
              </div>
            )}
            
            {message.messageType === 'image' && message.attachments?.[0] && (
              <div>
                <img 
                  src={message.attachments[0]} 
                  alt="Shared image"
                  className="max-w-full rounded border cursor-pointer hover:opacity-90"
                  onClick={() => window.open(message.attachments![0], '_blank')}
                />
                {message.message && (
                  <div className="mt-2 whitespace-pre-wrap">{message.message}</div>
                )}
              </div>
            )}
            
            {message.messageType === 'voice' && message.attachments?.[0] && (
              <div className="flex items-center space-x-2 min-w-[200px]">
                <Button size="sm" variant="ghost" className="p-1">
                  <Play className="w-4 h-4" />
                </Button>
                <div className="flex-1 bg-background/20 rounded-full h-1">
                  <div className="bg-current h-1 rounded-full w-0"></div>
                </div>
                <span className="text-xs">
                  {message.metadata?.duration ? 
                    `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}` 
                    : '0:00'
                  }
                </span>
              </div>
            )}
            
            {message.messageType === 'file' && message.attachments?.[0] && (
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {message.metadata?.fileName || 'File'}
                  </div>
                  {message.metadata?.fileSize && (
                    <div className="text-xs opacity-70">
                      {(message.metadata.fileSize / 1024 / 1024).toFixed(1)} MB
                    </div>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="p-1"
                  onClick={() => window.open(message.attachments![0], '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {message.messageType === 'location' && (
              <div className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Location Shared</div>
                  <div className="text-xs opacity-70">
                    {message.metadata?.location?.address || 'Tap to view on map'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Message actions (show on hover) */}
            {!isSystem && (
              <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" align="end">
                    <div className="space-y-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setReplyTo(message)}
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => {
                          navigator.clipboard.writeText(message.message);
                          toast({ title: "Copied to clipboard" });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      {isOwn && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => setEditingMessage(message)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-destructive"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          
          {/* Message metadata */}
          <div className={`flex items-center mt-1 text-xs text-muted-foreground ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwn && (
              <span className="ml-1">
                {message.isRead ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
              </span>
            )}
            {message.editedAt && (
              <span className="ml-1 italic">edited</span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const chatContent = (
    <div className={`flex flex-col h-full ${className}`} style={{ maxHeight }}>
      {/* Chat Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={participants?.[0]?.profileImage} />
                <AvatarFallback>
                  {participants?.[0]?.firstName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {participants?.[0]?.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div>
              <div className="font-medium">
                {participants?.[0] ? `${participants[0].firstName} ${participants[0].lastName}` : 'Chat'}
              </div>
              {participants?.[0]?.isOnline ? (
                <div className="text-sm text-green-600">Online</div>
              ) : participants?.[0]?.lastSeen ? (
                <div className="text-sm text-muted-foreground">
                  Last seen {formatDistanceToNow(parseISO(participants[0].lastSeen))} ago
                </div>
              ) : null}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isConnected && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            
            {/* Search */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <div className="text-sm text-muted-foreground">
                      {filteredMessages.length} message(s) found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Actions menu */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Phone className="w-4 h-4 mr-2" />
                    Voice Call
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Video className="w-4 h-4 mr-2" />
                    Video Call
                  </Button>
                  <Separator />
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Chat
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Chat
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
            
            {customActions}
          </div>
        </div>
      )}

      
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence>
          {filteredMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-2 text-sm text-muted-foreground mb-4"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>
      
      {/* Voice Recording Preview */}
      {audioBlob && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Voice Message</div>
                <div className="text-sm text-muted-foreground">
                  Duration: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={discardVoiceMessage}>
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={sendVoiceMessage} disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Replies */}
      {showQuickReplies && showQuickRepliesPanel && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Quick Replies</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowQuickRepliesPanel(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage(reply)}
                className="text-xs"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Reply Preview */}
      {replyTo && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-primary mb-1">
                Replying to {replyTo.senderName}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {replyTo.message}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setReplyTo(null)}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-end space-x-2">
          {/* Attachment Options */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                <Paperclip className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start" side="top">
              <div className="grid grid-cols-2 gap-2">
                {allowFileUpload && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto flex-col py-3"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 mb-1 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5 mb-1" />
                    )}
                    <span className="text-xs">File</span>
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto flex-col py-3"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={isUploading}
                >
                  <ImageIcon className="w-5 h-5 mb-1" />
                  <span className="text-xs">Photo</span>
                </Button>
                
                {allowLocationSharing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto flex-col py-3"
                    onClick={shareLocation}
                  >
                    <MapPin className="w-5 h-5 mb-1" />
                    <span className="text-xs">Location</span>
                  </Button>
                )}
                
                {allowVoiceMessages && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto flex-col py-3"
                    onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                  >
                    {isRecordingVoice ? (
                      <>
                        <StopCircle className="w-5 h-5 mb-1 text-red-500" />
                        <span className="text-xs text-red-500">{recordingDuration}s</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mb-1" />
                        <span className="text-xs">Voice</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {showQuickReplies && (
                <>
                  <Separator className="my-2" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setShowQuickRepliesPanel(!showQuickRepliesPanel)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Quick Replies
                  </Button>
                </>
              )}
            </PopoverContent>
          </Popover>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyPress}
              placeholder={isRecordingVoice ? "Recording voice message..." : "Type a message..."}
              className="min-h-[40px] max-h-[120px] resize-none pr-10"
              disabled={isRecordingVoice || isUploading}
              data-testid="input-chat-message"
            />
            
            {/* Emoji Picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute bottom-2 right-2 h-6 w-6 p-0"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="grid grid-cols-8 gap-1">
                  {emojiOptions.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-lg hover:bg-accent"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                        inputRef.current?.focus();
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Send Button */}
          <Button
            onClick={() => handleSendMessage()}
            disabled={(!newMessage.trim() && !audioBlob) || isUploading || isRecordingVoice}
            className="h-10 w-10 p-0"
            data-testid="button-send-message"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3 mr-1" />
            Connecting...
          </div>
        )}
      </div>
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="*/*"
      />
    </div>
  );

  // Render based on variant
  if (variant === 'modal') {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Chat</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {chatContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === 'sidebar') {
    return (
      <Sheet open onOpenChange={onClose}>
        <SheetContent side="right" className="w-96 p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Chat</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {chatContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (variant === 'floating') {
    return (
      <Card className={`fixed bottom-4 right-4 w-80 shadow-lg z-50 ${className}`}>
        {chatContent}
      </Card>
    );
  }

  if (compact) {
    // Compact floating chat button (legacy support)
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
            data-testid="button-chat-toggle"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 px-2 min-w-[20px] h-5 text-xs bg-red-500">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Order Chat</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            {chatContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Default: inline variant
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span>Chat with Provider</span>
        </CardTitle>
        {unreadCount > 0 && (
          <Badge className="bg-red-500">
            {unreadCount} new
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {chatContent}
      </CardContent>
    </Card>
  );
}

export default RealTimeChat;