import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Brain, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  X, 
  Zap, 
  Search,
  Bot,
  User,
  Lightbulb,
  Magic,
  Stars,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// TypeScript declarations for speech recognition APIs
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'suggestion';
  content: string;
  timestamp: Date;
  searchQueries?: string[];
  isTransformingToSearch?: boolean;
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSuggestion?: (query: string) => void;
  triggerElement?: HTMLElement;
}

export function AIChat({ isOpen, onClose, onSearchSuggestion, triggerElement }: AIChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "Hi! I'm your AI assistant. Describe what you need help with and I'll help you find the right services or parts. You can also use voice input! 🎤",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Voice search state
  const [voiceSearch, setVoiceSearch] = useState<VoiceSearchState>({
    isListening: false,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    transcript: ''
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Voice search setup
  useEffect(() => {
    if (voiceSearch.isSupported) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceSearch(prev => ({ ...prev, transcript, isListening: false }));
        setInputMessage(transcript);
        
        // Auto-send voice message after a short delay
        setTimeout(() => {
          handleSendMessage(transcript);
        }, 500);
      };

      recognitionRef.current.onerror = () => {
        setVoiceSearch(prev => ({ ...prev, isListening: false }));
        toast({
          title: "Voice input failed",
          description: "Please try again or type your message",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setVoiceSearch(prev => ({ ...prev, isListening: false }));
      };
    }
  }, [voiceSearch.isSupported, toast]);

  // Toggle voice search
  const toggleVoiceSearch = useCallback(() => {
    if (!voiceSearch.isSupported) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input",
        variant: "destructive"
      });
      return;
    }

    if (voiceSearch.isListening) {
      recognitionRef.current?.stop();
      setVoiceSearch(prev => ({ ...prev, isListening: false }));
    } else {
      setVoiceSearch(prev => ({ ...prev, isListening: true }));
      recognitionRef.current?.start();
      
      toast({
        title: "Listening...",
        description: "Speak now to describe what you need",
      });
    }
  }, [voiceSearch.isSupported, voiceSearch.isListening, toast]);

  // Send message to AI
  const handleSendMessage = async (messageContent: string = inputMessage) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Call AI service to get intelligent response
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent.trim(),
          context: {
            userId: user?.id,
            conversationHistory: messages.filter(m => m.type !== 'suggestion').slice(-5)
          }
        })
      });

      if (!response.ok) throw new Error('AI service unavailable');

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || "I understand you need help. Let me suggest some searches for you.",
        timestamp: new Date(),
        searchQueries: data.suggestedSearches || []
      };

      // Simulate typing delay for better UX
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, aiMessage]);
        
        // If there are search suggestions, create suggestion messages
        if (data.suggestedSearches && data.suggestedSearches.length > 0) {
          setTimeout(() => {
            data.suggestedSearches.forEach((query: string, index: number) => {
              setTimeout(() => {
                const suggestionMessage: ChatMessage = {
                  id: `suggestion-${Date.now()}-${index}`,
                  type: 'suggestion',
                  content: query,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, suggestionMessage]);
              }, index * 200);
            });
          }, 500);
        }
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      console.error('AI chat error:', error);
      setIsTyping(false);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm having trouble connecting right now. Let me create some search suggestions based on your message.",
        timestamp: new Date(),
        searchQueries: [messageContent.trim()]
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "AI temporarily unavailable",
        description: "I'll still help you with search suggestions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search suggestion click with magical transformation
  const handleSearchSuggestion = async (query: string, messageId: string) => {
    // Mark message as transforming
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isTransformingToSearch: true }
        : msg
    ));

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 800));

    // Close chat and navigate to search
    onClose();
    
    if (onSearchSuggestion) {
      onSearchSuggestion(query);
    } else {
      setLocation(`/search?q=${encodeURIComponent(query)}`);
    }

    toast({
      title: "Searching...",
      description: `Looking for "${query}"`,
    });
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get trigger element position for magical opening animation
  const getTriggerPosition = () => {
    if (!triggerElement) return { x: 0, y: 0 };
    
    const rect = triggerElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const triggerPos = getTriggerPosition();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with magical particles */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={onClose}
          >
            {/* Magical particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/60 rounded-full"
                initial={{
                  opacity: 0,
                  x: triggerPos.x,
                  y: triggerPos.y,
                  scale: 0
                }}
                animate={{
                  opacity: [0, 1, 0],
                  x: triggerPos.x + (Math.random() - 0.5) * 400,
                  y: triggerPos.y + (Math.random() - 0.5) * 400,
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>

          {/* Chat Modal with magical entrance */}
          <motion.div
            ref={chatRef}
            initial={{
              opacity: 0,
              scale: 0.1,
              x: triggerPos.x - 200,
              y: triggerPos.y - 300,
              rotate: -180
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
              rotate: 0
            }}
            exit={{
              opacity: 0,
              scale: 0.1,
              x: triggerPos.x - 200,
              y: triggerPos.y - 300,
              rotate: 180
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              duration: 0.6
            }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-96 h-[500px] shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
              {/* Header with magical glow */}
              <CardHeader className="relative bg-gradient-to-r from-primary/10 to-purple-500/10 border-b border-border/50">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-t-lg"
                  animate={{
                    background: [
                      'linear-gradient(90deg, rgba(139,92,246,0.05) 0%, rgba(168,85,247,0.05) 100%)',
                      'linear-gradient(90deg, rgba(168,85,247,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                      'linear-gradient(90deg, rgba(139,92,246,0.05) 0%, rgba(168,85,247,0.05) 100%)'
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center"
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity }
                      }}
                    >
                      <Brain className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center space-x-2">
                        <span>AI Assistant</span>
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        >
                          <Sparkles className="w-4 h-4 text-primary" />
                        </motion.div>
                      </h3>
                      <p className="text-xs text-muted-foreground">Powered by advanced AI</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 hover:bg-destructive/10"
                    data-testid="close-ai-chat"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="p-0 flex flex-col h-[380px]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: message.isTransformingToSearch ? [1, 1.1, 0] : 1 
                        }}
                        transition={{ 
                          delay: index * 0.1,
                          scale: message.isTransformingToSearch ? { duration: 0.8 } : {}
                        }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.type === 'suggestion' ? (
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-3 cursor-pointer hover:from-primary/20 hover:to-purple-500/20 transition-all duration-200 max-w-xs"
                            onClick={() => handleSearchSuggestion(message.content, message.id)}
                            data-testid={`search-suggestion-${index}`}
                          >
                            <div className="flex items-center space-x-2">
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Search className="w-4 h-4 text-primary" />
                              </motion.div>
                              <span className="text-sm font-medium text-foreground">
                                Search: "{message.content}"
                              </span>
                            </div>
                          </motion.div>
                        ) : (
                          <div className={`flex items-start space-x-2 max-w-xs ${
                            message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                            <motion.div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.type === 'user' 
                                  ? 'bg-primary text-white' 
                                  : 'bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary'
                              }`}
                              animate={message.type === 'ai' ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {message.type === 'user' ? (
                                <User className="w-4 h-4" />
                              ) : (
                                <Bot className="w-4 h-4" />
                              )}
                            </motion.div>
                            
                            <div className={`rounded-2xl p-3 ${
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-foreground'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="flex items-start space-x-2 max-w-xs">
                          <motion.div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Bot className="w-4 h-4" />
                          </motion.div>
                          
                          <div className="bg-muted/50 text-foreground rounded-2xl p-3">
                            <div className="flex space-x-1">
                              {[...Array(3)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 bg-primary/60 rounded-full"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    delay: i * 0.2
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-border/50 bg-muted/10">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Describe what you need help with..."
                        className="pr-12 border-2 border-border/50 focus:border-primary/50 rounded-xl"
                        disabled={isLoading}
                        data-testid="ai-chat-input"
                      />
                      
                      {/* Voice input button */}
                      {voiceSearch.isSupported && (
                        <motion.div
                          className="absolute right-2 top-1/2 transform -translate-y-1/2"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            type="button"
                            variant={voiceSearch.isListening ? "destructive" : "ghost"}
                            size="sm"
                            onClick={toggleVoiceSearch}
                            className="h-8 w-8 p-0 rounded-full"
                            data-testid="voice-input-button"
                          >
                            {voiceSearch.isListening ? (
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                <MicOff className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <Mic className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={!inputMessage.trim() || isLoading}
                        className="rounded-xl bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                        data-testid="send-message-button"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                  </div>
                  
                  {/* Voice listening indicator */}
                  {voiceSearch.isListening && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 flex items-center justify-center space-x-2 text-xs text-muted-foreground"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Mic className="w-3 h-3 text-primary" />
                      </motion.div>
                      <span>Listening... Speak now</span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}