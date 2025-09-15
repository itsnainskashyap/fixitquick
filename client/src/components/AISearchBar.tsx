import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Search, Sparkles, Clock, TrendingUp, Mic, MicOff, Brain, X, Zap, Package, Send, Bot, User, Loader2, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AIService, AISearchResult } from '@/lib/ai';

// TypeScript declarations for speech recognition APIs
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SearchSuggestion {
  id: string;
  text: string;
  category: string;
  type: 'service' | 'part' | 'suggestion';
  icon?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'suggestion';
  content: string;
  timestamp: Date;
  searchQueries?: string[];
  isTransformingToSearch?: boolean;
}

interface AISearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  enableVoice?: boolean;
  enableAIChat?: boolean; // New prop to enable/disable AI chat mode
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
}

export function AISearchBar({
  onSearch,
  placeholder = "Tell me what you need - I'm NainsAI, here to help you figure it out...",
  autoFocus = false,
  enableVoice = true,
  enableAIChat = true,
}: AISearchBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Mode state - the key new feature
  const [mode, setMode] = useState<'search' | 'chat'>('search');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // NEW: Track whether chat has been opened by user (for search button visibility)
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  
  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'ai',
      content: "Hey there! I'm NainsAI. Skip the small talk - what's broken, what needs fixing, or what are you looking for? I'll cut through the noise and help you find exactly what you need. Voice input works too if you're feeling chatty! 🎤",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Voice search state
  const [voiceSearch, setVoiceSearch] = useState<VoiceSearchState>({
    isListening: false,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    transcript: ''
  });

  // Refs
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Enhanced AI-powered suggestions - reliable and fast
  const [aiSuggestions, setAiSuggestions] = useState<SearchSuggestion[]>([]);
  const [showMagicalEffects, setShowMagicalEffects] = useState(false);

  // NEW: Service suggestions after chat state
  const [serviceSuggestions, setServiceSuggestions] = useState<AISearchResult[]>([]);
  const [suggestionAnalysis, setSuggestionAnalysis] = useState<any>(null);
  const [suggestionReason, setSuggestionReason] = useState<string>('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [isLoadingServiceSuggestions, setIsLoadingServiceSuggestions] = useState(false);

  // AI Service instance
  const aiService = useState(() => new AIService())[0];

  // Built-in search suggestions - fallback when AI is unavailable
  const builtInSuggestions: SearchSuggestion[] = [
    { id: '1', text: 'Plumbing repair', category: 'Home Services', type: 'service', icon: '🔧' },
    { id: '2', text: 'Electrical work', category: 'Home Services', type: 'service', icon: '⚡' },
    { id: '3', text: 'AC repair', category: 'Home Services', type: 'service', icon: '❄️' },
    { id: '4', text: 'Cleaning service', category: 'Home Services', type: 'service', icon: '🧹' },
    { id: '5', text: 'Appliance repair', category: 'Home Services', type: 'service', icon: '🔨' },
    { id: '6', text: 'Phone screen replacement', category: 'Electronics', type: 'service', icon: '📱' },
    { id: '7', text: 'Laptop repair', category: 'Electronics', type: 'service', icon: '💻' },
    { id: '8', text: 'Washing machine parts', category: 'Parts', type: 'part', icon: '🔩' },
    { id: '9', text: 'AC filters', category: 'Parts', type: 'part', icon: '🌬️' },
    { id: '10', text: 'Electrical switches', category: 'Parts', type: 'part', icon: '⚡' },
  ];

  // Auto-scroll to bottom when new messages arrive in chat mode
  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM updates complete before scrolling
    requestAnimationFrame(() => {
      try {
        if (messagesEndRef.current) {
          // Primary scroll method - scroll the end marker into view
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest'
          });
        } else {
          // Fallback: Find and scroll the ScrollArea viewport
          const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight;
          }
        }
      } catch (error) {
        console.warn('Scroll to bottom failed:', error);
        // Final fallback: Force scroll using parent container
        try {
          const messagesContainer = messagesEndRef.current?.parentElement?.parentElement;
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        } catch (fallbackError) {
          console.warn('Fallback scroll also failed:', fallbackError);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (mode === 'chat') {
      // Add timeout to ensure DOM updates complete before scrolling
      // This prevents race conditions between message rendering and scroll
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages, mode, scrollToBottom]);

  // NEW: Generate service suggestions after meaningful conversations
  const generateServiceSuggestions = useCallback(async () => {
    // Only generate suggestions if we have enough conversation and we're in chat mode
    if (mode !== 'chat' || messages.length < 3 || isLoadingServiceSuggestions) {
      return;
    }

    // Check if we have meaningful user messages (not just AI responses)
    const userMessages = messages.filter(msg => msg.type === 'user');
    if (userMessages.length < 2) {
      return;
    }

    // Don't regenerate if we already have suggestions for this conversation
    if (showServiceSuggestions && serviceSuggestions.length > 0) {
      return;
    }

    try {
      setIsLoadingServiceSuggestions(true);
      console.log('🎯 Generating service suggestions from chat conversation');

      const result = await aiService.getChatSuggestions(messages, {
        location: user?.location ? { 
          latitude: user.location.latitude, 
          longitude: user.location.longitude 
        } : undefined,
        extractedInfo: {}
      });

      if (result.suggestions.length > 0) {
        setServiceSuggestions(result.suggestions);
        setSuggestionAnalysis(result.analysis);
        setSuggestionReason(result.recommendationReason);
        setShowServiceSuggestions(true);

        // Show a toast notification about suggestions
        toast({
          title: "Service Suggestions Ready! 🎯",
          description: `Found ${result.suggestions.length} services that match your needs`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error generating service suggestions:', error);
      // Don't show error toast to avoid disrupting chat experience
    } finally {
      setIsLoadingServiceSuggestions(false);
    }
  }, [mode, messages, isLoadingServiceSuggestions, showServiceSuggestions, serviceSuggestions.length, aiService, user?.location, toast]);

  // Trigger service suggestions after chat conversations
  useEffect(() => {
    // Wait a bit after the last message to generate suggestions
    const timer = setTimeout(() => {
      generateServiceSuggestions();
    }, 2000); // Wait 2 seconds after last message

    return () => clearTimeout(timer);
  }, [messages, generateServiceSuggestions]);

  // Mode toggle functionality
  const toggleMode = useCallback(() => {
    const newMode = mode === 'search' ? 'chat' : 'search';
    setMode(newMode);
    setIsExpanded(newMode === 'chat');
    
    // CRITICAL: Only set hasOpenedChat to true when user opens chat mode
    if (newMode === 'chat') {
      setHasOpenedChat(true); // Enable search button for future search mode use
    }
    
    // Focus appropriate input
    setTimeout(() => {
      if (newMode === 'search') {
        inputRef.current?.focus();
      } else {
        chatInputRef.current?.focus();
      }
    }, 300);

    // Reset states when switching modes
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    toast({
      title: newMode === 'chat' ? "NainsAI Chat Mode" : "Search Mode",
      description: newMode === 'chat' ? "Let's have a real conversation about what you need!" : "Search for services and parts",
    });
  }, [mode, toast]);

  // Initialize recent searches
  useEffect(() => {
    const stored = localStorage.getItem('fixitquick-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.warn('Failed to parse recent searches from localStorage');
        setRecentSearches([]);
      }
    }
  }, []);

  // Enhanced AI-powered search with magical effects
  useEffect(() => {
    if (query.length > 1) {
      setIsLoading(true);
      setShowMagicalEffects(true);
      
      // Try AI suggestions first, fallback to built-in
      const timer = setTimeout(async () => {
        try {
          // Call AI typeahead endpoint
          const response = await fetch(`/api/v1/ai/typeahead?query=${encodeURIComponent(query)}&limit=6`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.suggestions) {
              const aiSuggestions: SearchSuggestion[] = data.suggestions.map((s: any, index: number) => ({
                id: `ai-${index}`,
                text: s.text,
                category: s.category || 'AI Suggestion',
                type: 'service' as const,
                icon: s.category === 'Electrician' ? '⚡' : 
                      s.category === 'Plumber' ? '🔧' : 
                      s.category === 'Cleaning' ? '🧹' : '🛠️'
              }));
              setSuggestions(aiSuggestions);
              setAiSuggestions(aiSuggestions);
            } else {
              throw new Error('AI suggestions failed');
            }
          } else {
            throw new Error('AI service unavailable');
          }
        } catch (error) {
          console.warn('AI suggestions failed, using built-in:', error);
          // Fallback to built-in suggestions
          const filtered = builtInSuggestions.filter(s => 
            s.text.toLowerCase().includes(query.toLowerCase()) ||
            s.category.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 6);
          setSuggestions(filtered);
        } finally {
          setShowSuggestions(true);
          setIsLoading(false);
          setTimeout(() => setShowMagicalEffects(false), 500);
        }
      }, 200); // Slight delay for magical effect

      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      setShowMagicalEffects(false);
    }
  }, [query]);

  // Chat message handling
  const handleSendMessage = async (messageContent: string = inputMessage) => {
    if (!messageContent.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsChatLoading(true);
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
      setIsChatLoading(false);
    }
  };

  // Handle search suggestion click from chat with transformation
  const handleSearchSuggestion = async (query: string, messageId: string) => {
    // Mark message as transforming
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isTransformingToSearch: true }
        : msg
    ));

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 800));

    // Switch to search mode and perform search
    setMode('search');
    setIsExpanded(false);
    setQuery(query);
    handleSearch(query);

    toast({
      title: "Searching...",
      description: `Looking for "${query}"`,
    });
  };

  // Voice search setup - enhanced for both modes
  useEffect(() => {
    if (enableVoice && voiceSearch.isSupported) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceSearch(prev => ({ ...prev, transcript, isListening: false }));
        
        if (mode === 'search') {
          setQuery(transcript);
          handleSearch(transcript);
        } else {
          setInputMessage(transcript);
          // Auto-send voice message in chat mode after short delay
          setTimeout(() => {
            handleSendMessage(transcript);
          }, 500);
        }
      };

      recognitionRef.current.onerror = () => {
        setVoiceSearch(prev => ({ ...prev, isListening: false }));
        toast({
          title: mode === 'search' ? "Voice search failed" : "Voice input failed",
          description: "Please try again or type your message",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setVoiceSearch(prev => ({ ...prev, isListening: false }));
      };
    }
  }, [enableVoice, voiceSearch.isSupported, mode, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };

  // Enhanced keyboard navigation for both modes
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode === 'search') {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            const selected = suggestions[selectedIndex];
            setQuery(selected.text);
            handleSearch(selected.text);
          } else {
            handleSearch();
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    }
  };

  // Chat keyboard handling
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputFocus = () => {
    // Only show suggestions if we have query content or recent searches
    // Do NOT set hasOpenedChat here - button should only appear after chat is opened
    if (mode === 'search' && (query.length > 1 || recentSearches.length > 0)) {
      setShowSuggestions(true);
    }
  };

  // Voice search controls
  const toggleVoiceSearch = useCallback(() => {
    if (!enableVoice || !voiceSearch.isSupported) {
      toast({
        title: "Voice search not supported",
        description: "Your browser doesn't support voice search",
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
    }
  }, [enableVoice, voiceSearch.isSupported, voiceSearch.isListening, toast]);

  // Remove from recent searches function
  const removeFromRecentSearches = useCallback((itemToRemove: string, event?: React.MouseEvent) => {
    // Prevent event bubbling to parent elements
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const updated = recentSearches.filter(search => search !== itemToRemove);
    setRecentSearches(updated);
    localStorage.setItem('fixitquick-recent-searches', JSON.stringify(updated));
    
    // Show subtle feedback
    toast({
      title: "Removed from recent searches",
      description: `"${itemToRemove}" removed from history`,
      duration: 2000,
    });
  }, [recentSearches, toast]);

  // Clean search handler
  const handleSearch = useCallback((searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('fixitquick-recent-searches', JSON.stringify(updated));
      
      setShowSuggestions(false);
      setSelectedIndex(-1);
      
      // Navigate to search results or call callback
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
      }

      // Show success toast
      toast({
        title: "Searching...",
        description: `Looking for "${searchQuery}"`,
      });
    }
  }, [query, recentSearches, onSearch, setLocation, toast]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch(suggestion.text);
  }, [handleSearch]);

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="ai-search-bar" data-testid="ai-search-bar">
      <motion.div 
        className="relative"
        animate={{
          height: isExpanded ? 'auto' : 'auto',
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Main Search/Chat Interface */}
        <motion.div 
          className={`relative ${isExpanded ? 'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl' : ''}`}
          whileHover={{ scale: mode === 'search' ? 1.01 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          animate={{
            borderRadius: isExpanded ? '1rem' : '1.5rem',
          }}
        >
          {/* Search Mode UI */}
          {mode === 'search' && (
            <>
              {/* Search Icon */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </motion.div>
              
              {/* Search Input */}
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="pl-12 pr-32 h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-gradient-to-r from-background via-background to-primary/5"
                autoFocus={autoFocus}
                data-testid="search-input"
              />
            </>
          )}

          {/* Chat Mode UI */}
          {mode === 'chat' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 400 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card/95 backdrop-blur-xl rounded-2xl border-2 border-primary/30 shadow-2xl"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-t-2xl relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Brain className="w-4 h-4 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="font-semibold text-foreground flex items-center space-x-2">
                        <span>AI Assistant</span>
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        >
                          <Sparkles className="w-3 h-3 text-primary" />
                        </motion.div>
                      </h3>
                      <p className="text-xs text-muted-foreground">Ask me anything</p>
                    </div>
                  </div>
                  
                  {/* Chat Mode Header Controls - Positioned in header */}
                  <div className="flex items-center space-x-2">
                    {/* Voice Search Button */}
                    {enableVoice && voiceSearch.isSupported && (
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Button
                          type="button"
                          variant={voiceSearch.isListening ? "destructive" : "ghost"}
                          size="sm"
                          onClick={toggleVoiceSearch}
                          className="h-8 w-8 p-0"
                          data-testid="button-voice-search-header"
                        >
                          {voiceSearch.isListening ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <MicOff className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </Button>
                      </motion.div>
                    )}

                    {/* Switch to Search Mode Button */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMode('search');
                          setIsExpanded(false);
                          setTimeout(() => inputRef.current?.focus(), 300);
                        }}
                        className="h-8 w-8 p-0 bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20 hover:from-primary/20 hover:to-blue-500/20"
                        data-testid="switch-to-search-button"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="h-64">
                <ScrollArea className="h-full p-4" data-testid="chat-messages-scroll-area">
                  <div className="space-y-3">
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
                          delay: index * 0.05,
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
                                <Search className="w-3 h-3 text-primary" />
                              </motion.div>
                              <span className="text-xs font-medium text-foreground">
                                Search: "{message.content}"
                              </span>
                            </div>
                          </motion.div>
                        ) : (
                          <div className={`flex items-start space-x-2 max-w-xs ${
                            message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                            <motion.div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                message.type === 'user' 
                                  ? 'bg-primary text-white' 
                                  : 'bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary'
                              }`}
                              animate={message.type === 'ai' ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {message.type === 'user' ? (
                                <User className="w-3 h-3" />
                              ) : (
                                <Bot className="w-3 h-3" />
                              )}
                            </motion.div>
                            
                            <div className={`rounded-xl p-2 ${
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-foreground'
                            }`}>
                              <p className="text-xs">{message.content}</p>
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
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Bot className="w-3 h-3" />
                          </motion.div>
                          
                          <div className="bg-muted/50 text-foreground rounded-xl p-2">
                            <div className="flex space-x-1">
                              {[...Array(3)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 h-1 bg-primary/60 rounded-full"
                                  animate={{ y: [0, -2, 0] }}
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

                    {/* NEW: Service Suggestions after meaningful conversations */}
                    <AnimatePresence>
                      {showServiceSuggestions && serviceSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 30, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.9 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 200, 
                            damping: 20,
                            delay: 0.2
                          }}
                          className="mt-4 p-3 bg-gradient-to-br from-green-50 via-primary/5 to-blue-50 dark:from-green-950/30 dark:via-primary/10 dark:to-blue-950/30 rounded-xl border border-green-200 dark:border-green-800/50"
                          data-testid="service-suggestions-container"
                        >
                          {/* Suggestions Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </motion.div>
                              <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
                                Perfect Match Services 🎯
                              </h4>
                              <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                                {serviceSuggestions.length} found
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowServiceSuggestions(false)}
                              className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/50"
                              data-testid="close-suggestions-button"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>

                          {/* Suggestion Reason */}
                          {suggestionReason && (
                            <p className="text-xs text-green-700 dark:text-green-300 mb-3 bg-green-100/50 dark:bg-green-900/30 p-2 rounded-lg">
                              {suggestionReason}
                            </p>
                          )}

                          {/* Service Cards */}
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {serviceSuggestions.slice(0, 4).map((service, index) => (
                              <motion.div
                                key={service.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800/50 rounded-lg border border-green-200 dark:border-green-800/30 cursor-pointer hover:border-green-300 dark:hover:border-green-700 transition-all duration-200 group"
                                onClick={() => {
                                  // Navigate to service booking
                                  setLocation(`/service-booking?serviceId=${service.id}&fromChat=true`);
                                  toast({
                                    title: "Opening Service Booking",
                                    description: `Booking ${service.name} with chat context`,
                                  });
                                }}
                                data-testid={`service-suggestion-${service.id}`}
                              >
                                <div className="text-lg group-hover:scale-110 transition-transform">
                                  {service.icon || '🔧'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-xs font-medium text-foreground truncate">
                                    {service.name}
                                  </h5>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {service.description}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                      ₹{service.price}
                                    </span>
                                    {service.rating && (
                                      <div className="flex items-center space-x-1">
                                        <span className="text-xs text-yellow-500">⭐</span>
                                        <span className="text-xs text-muted-foreground">
                                          {service.rating.toFixed(1)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <motion.div
                                  whileHover={{ x: 4 }}
                                  className="text-green-600 dark:text-green-400"
                                >
                                  <Package className="w-4 h-4" />
                                </motion.div>
                              </motion.div>
                            ))}
                          </div>

                          {/* View All Button */}
                          {serviceSuggestions.length > 4 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full mt-3 text-xs border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30"
                              onClick={() => {
                                // Navigate to search results with chat context
                                const searchQuery = suggestionAnalysis?.extractedInfo?.problemDescription || 'services';
                                setLocation(`/search?q=${encodeURIComponent(searchQuery)}&chatSuggested=true`);
                              }}
                              data-testid="view-all-suggestions-button"
                            >
                              View All {serviceSuggestions.length} Suggestions
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Loading indicator for service suggestions */}
                    <AnimatePresence>
                      {isLoadingServiceSuggestions && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/20"
                          data-testid="service-suggestions-loading"
                        >
                          <div className="flex items-center space-x-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="w-4 h-4 text-primary" />
                            </motion.div>
                            <span className="text-xs text-muted-foreground">
                              Analyzing conversation for service suggestions...
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {/* Scroll anchor - placed after all messages */}
                  <div 
                    ref={messagesEndRef} 
                    className="h-1 w-1" 
                    data-testid="messages-end-marker" 
                    aria-hidden="true"
                  />
                </ScrollArea>
              </div>

              {/* Chat Input Area */}
              <div className="p-3 border-t border-border/50 bg-muted/10 rounded-b-2xl">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input
                      ref={chatInputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      placeholder="Ask me anything about services..."
                      className="pr-10 text-sm border-2 border-border/50 focus:border-primary/50 rounded-xl"
                      disabled={isChatLoading}
                      data-testid="ai-chat-input"
                    />
                    
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isChatLoading}
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                      data-testid="send-message-button"
                    >
                      {isChatLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Right Side Controls - Only for Search Mode AFTER Chat Has Been Opened */}
          {mode === 'search' && hasOpenedChat && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 z-10">
              {/* Clear Button */}
              {query && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="h-8 w-8 p-0 hover:bg-destructive/10"
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </motion.div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                    data-testid="search-loading"
                  />
                </motion.div>
              )}

              {/* Voice Search Button */}
              {enableVoice && voiceSearch.isSupported && (
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    type="button"
                    variant={voiceSearch.isListening ? "destructive" : "ghost"}
                    size="sm"
                    onClick={toggleVoiceSearch}
                    className="h-8 w-8 p-0"
                    data-testid="button-voice-search"
                  >
                    {voiceSearch.isListening ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <MicOff className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Search Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handleSearch()}
                  className="h-8 w-8 p-0 relative bg-gradient-to-r from-primary to-blue-500 text-white border-0"
                  data-testid="search-button"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Search className="w-4 h-4" />
                  </motion.div>
                  
                  {/* Magical shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-lg"
                    animate={{ x: [-20, 40] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  />
                </Button>
              </motion.div>

              {/* AI Chat Mode Toggle Button */}
              {enableAIChat && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHasOpenedChat(true); // Enable search button for future use
                      setMode('chat');
                      setIsExpanded(true);
                      setTimeout(() => chatInputRef.current?.focus(), 300);
                    }}
                    className="h-8 w-8 p-0 relative bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 hover:from-primary/20 hover:to-purple-500/20"
                    data-testid="ai-chat-toggle-button"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Brain className="w-4 h-4" />
                    </motion.div>
                    
                    {/* Magical shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-lg"
                      animate={{ x: [-20, 40] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 3 }}
                    />
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Search Suggestions Dropdown - Only in Search Mode */}
        <AnimatePresence>
          {mode === 'search' && showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.3
              }}
              className="absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl mt-2 shadow-2xl z-50 max-h-96 overflow-y-auto"
              data-testid="search-suggestions"
            >
              {/* Suggestions Section */}
              {suggestions.length > 0 && (
                <div className="p-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2 px-2 py-1 text-sm text-muted-foreground mb-3"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                    </motion.div>
                    <span className="font-medium">Suggestions for you</span>
                  </motion.div>
                  
                  {suggestions.map((suggestion, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 transform scale-[1.02]' 
                            : 'hover:bg-gradient-to-r hover:from-muted/50 hover:to-primary/5 hover:transform hover:scale-[1.01]'
                        }`}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        data-testid={`suggestion-${index}`}
                      >
                        <motion.div
                          className="w-10 h-10 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg flex items-center justify-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <span className="text-lg">{suggestion.icon || (suggestion.type === 'service' ? '⚡' : '🔧')}</span>
                        </motion.div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {suggestion.text}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.category}
                          </p>
                        </div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: isSelected ? 1 : 0 }}
                          className="text-primary"
                        >
                          <Zap className="w-4 h-4" />
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Recent Searches Section */}
              {recentSearches.length > 0 && query.length === 0 && (
                <div className="p-4 border-t border-border/50">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-2 px-2 py-1 text-sm text-muted-foreground mb-3"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Recent searches</span>
                    {recentSearches.length > 0 && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {recentSearches.length}
                      </Badge>
                    )}
                  </motion.div>
                  
                  <AnimatePresence mode="popLayout">
                    {recentSearches.slice(0, 3).map((search, index) => (
                      <motion.div
                        key={search}
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                        exit={{ 
                          opacity: 0, 
                          x: -20, 
                          height: 0,
                          transition: { duration: 0.3, ease: "easeInOut" }
                        }}
                        transition={{ delay: index * 0.05, layout: { duration: 0.2 } }}
                        layout
                        className="group flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-200"
                        onClick={() => {
                          setQuery(search);
                          handleSearch(search);
                        }}
                        data-testid={`recent-search-${index}`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-200">
                            <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1">
                            {search}
                          </p>
                        </div>
                        
                        {/* Remove Button */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ 
                            opacity: 1, 
                            scale: 1,
                            transition: { delay: 0.1 }
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 rounded-md"
                            onClick={(e) => removeFromRecentSearches(search, e)}
                            data-testid={`remove-recent-search-${index}`}
                            aria-label={`Remove "${search}" from recent searches`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Show More Recent Searches Link if there are more than 3 */}
                  {recentSearches.length > 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-2 px-3"
                    >
                      <button
                        className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200 underline-offset-2 hover:underline"
                        onClick={() => {
                          // Could expand to show more or clear all
                          toast({
                            title: "Recent searches",
                            description: `You have ${recentSearches.length} recent searches in total`,
                          });
                        }}
                        data-testid="show-more-recent-searches"
                      >
                        +{recentSearches.length - 3} more searches
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}