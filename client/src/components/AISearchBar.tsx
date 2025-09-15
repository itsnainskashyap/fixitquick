import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Search, Sparkles, Clock, TrendingUp, Mic, MicOff, Brain, X, Zap, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

interface AISearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  enableVoice?: boolean;
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
}

export function AISearchBar({
  onSearch,
  placeholder = "Search services, parts, or describe what you need...",
  autoFocus = false,
  enableVoice = true,
}: AISearchBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Voice search state
  const [voiceSearch, setVoiceSearch] = useState<VoiceSearchState>({
    isListening: false,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    transcript: ''
  });

  // Refs
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Enhanced AI-powered suggestions - reliable and fast
  const [aiSuggestions, setAiSuggestions] = useState<SearchSuggestion[]>([]);
  const [showMagicalEffects, setShowMagicalEffects] = useState(false);

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

  // Voice search setup
  useEffect(() => {
    if (enableVoice && voiceSearch.isSupported) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceSearch(prev => ({ ...prev, transcript, isListening: false }));
        setQuery(transcript);
        handleSearch(transcript);
      };

      recognitionRef.current.onerror = () => {
        setVoiceSearch(prev => ({ ...prev, isListening: false }));
        toast({
          title: "Voice search failed",
          description: "Please try again or use text search",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setVoiceSearch(prev => ({ ...prev, isListening: false }));
      };
    }
  }, [enableVoice, voiceSearch.isSupported, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  const handleInputFocus = () => {
    if (query.length > 1 || recentSearches.length > 0) {
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
      <div className="relative">
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </motion.div>
          
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-12 pr-24 h-12 text-base rounded-2xl border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-gradient-to-r from-background via-background to-primary/5"
            autoFocus={autoFocus}
            data-testid="search-input"
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
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

            {/* Enhanced Loading Indicator with Magical Effects */}
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
                {showMagicalEffects && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-primary/40 rounded-full"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0],
                          x: Math.cos(i * Math.PI / 3) * 12,
                          y: Math.sin(i * Math.PI / 3) * 12,
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                      />
                    ))}
                  </>
                )}
              </motion.div>
            )}
            
            {/* Enhanced Magical AI Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 text-xs px-2 py-1 relative overflow-hidden"
                data-testid="ai-badge"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <Brain className="w-3 h-3 mr-1" />
                </motion.div>
                AI
                
                {/* Magical shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: [-20, 40] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 2 }}
                />
              </Badge>
              
              {/* Floating particles around badge */}
              {showMagicalEffects && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-primary/60 rounded-full"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        y: [-5, -15, -5],
                        x: [-2 + i, 2 + i, -2 + i],
                        scale: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      style={{
                        top: -2,
                        left: 8 + i * 6
                      }}
                    />
                  ))}
                </>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Magical Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
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
                  </motion.div>
                  
                  {recentSearches.slice(0, 3).map((search, index) => (
                    <motion.div
                      key={search}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center space-x-3 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-all duration-200"
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                      data-testid={`recent-search-${index}`}
                    >
                      <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-foreground">{search}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}