import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderChat } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  MessageCircle, 
  Send, 
  Image as ImageIcon, 
  MapPin,
  Phone,
  Video,
  MoreVertical,
  X,
  Check,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatProps {
  orderId: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  compact?: boolean;
}

export function RealTimeChat({ orderId, isOpen = false, onToggle, compact = false }: ChatProps) {
  const { user } = useAuth();
  const {
    messages,
    typingUsers,
    unreadCount,
    isConnected,
    sendChatMessage,
    sendTypingIndicator,
    markAsRead,
  } = useOrderChat(orderId);
  
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [isOpen, unreadCount, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    const success = sendChatMessage(messageText);
    if (success) {
      setMessageText('');
      setIsTyping(false);
    }
  };

  const handleInputChange = (value: string) => {
    setMessageText(value);
    
    // Handle typing indicators
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string | Date) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const ChatContent = () => (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/50">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src="" />
            <AvatarFallback>SP</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-sm">Service Provider</h4>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Online' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" data-testid="button-call">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-video">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-more">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isOwn = message.senderId === user?.uid;
              const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
              
              return (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.id || index}`}
                >
                  <div className={`flex space-x-2 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {showAvatar && !isOwn && (
                      <Avatar className="w-6 h-6 mt-1">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {message.senderName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`px-3 py-2 rounded-lg max-w-full break-words ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        
                        {/* Message attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment: string, idx: number) => (
                              <div key={idx} className="text-xs opacity-75">
                                📎 {attachment}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className={`flex items-center space-x-1 text-xs text-muted-foreground ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <span>{formatMessageTime(message.createdAt || message.timestamp)}</span>
                        {isOwn && (
                          <div className="flex">
                            {message.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 text-sm text-muted-foreground"
            >
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{typingUsers[0]} is typing...</span>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-background/50">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={messageText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!isConnected}
            data-testid="input-message"
          />
          <Button
            variant="ghost"
            size="sm"
            data-testid="button-attach"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="button-location"
          >
            <MapPin className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !isConnected}
            size="sm"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-red-500 mt-1">
            Connection lost. Messages will be sent when reconnected.
          </p>
        )}
      </div>
    </div>
  );

  if (compact) {
    // Compact floating chat button
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
          <ChatContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Full chat component
  return (
    <Card className="w-full">
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
        <ChatContent />
      </CardContent>
    </Card>
  );
}

export default RealTimeChat;