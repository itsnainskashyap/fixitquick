import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript declarations for speech recognition APIs
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, Clock, TrendingUp, Mic, MicOff, Brain, Zap, Package, MapPin, Star, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { aiService, AISearchResult } from '@/lib/ai';
import { useDebounce } from '@/hooks/useDebounce';

interface EnhancedSearchResult {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  type: 'service' | 'part';
  rating?: number;
  totalBookings?: number;
  stock?: number;
  provider?: {
    id: string;
    name: string;
    rating: number;
    verified: boolean;
  };
  icon?: string;
}

interface AISearchBarProps {
  onSearch?: (query: string) => void;
  onResultSelect?: (result: EnhancedSearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  enableVoice?: boolean;
  enableFilters?: boolean;
  showTrending?: boolean;
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
}

export function AISearchBar({
  onSearch,
  onResultSelect,
  placeholder = "Search services, parts, or ask in natural language...",
  autoFocus = false,
  enableVoice = true,
  enableFilters = false,
  showTrending = true,
}: AISearchBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<EnhancedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<{explanation: string; confidence: number} | null>(null);

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
  const debouncedQuery = useDebounce(query, 300);

  // Fetch trending searches and personalized suggestions
  const { data: trendingData } = useQuery({
    queryKey: ['ai-trending'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/trending?type=mixed&limit=5');
      return response.json();
    },
    enabled: showTrending
  });

  const { data: personalizedSuggestions } = useQuery({
    queryKey: ['ai-suggestions', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return null;
      const response = await fetch(`/api/v1/ai/suggestions?type=mixed&limit=6`);
      return response.json();
    },
    enabled: !!user?.uid && showTrending
  });

  const { data: popularSearchesData } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ai/popular-searches?limit=8');
      return response.json();
    }
  });

  // Initialize effects
  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem('fixitquick-recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

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

  // Enhanced search with debouncing
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      performEnhancedSearch(debouncedQuery);
    } else {
      setSuggestions([]);
      setAiInsights(null);
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  // Enhanced search with database integration and AI insights
  const performEnhancedSearch = async (searchQuery: string) => {
    setIsLoading(true);
    
    try {
      // Use new enhanced search endpoint for suggestions
      const response = await fetch('/api/v1/ai/search-suggestions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const searchResults: EnhancedSearchResult[] = [
          ...(data.suggestions?.services || []).map((s: any) => ({
            ...s,
            type: 'service' as const,
            icon: '⚡'
          })),
          ...(data.suggestions?.parts || []).map((p: any) => ({
            ...p,
            type: 'part' as const,
            icon: '🔧'
          }))
        ].slice(0, 6);

        setSuggestions(searchResults);
        setShowSuggestions(true);
        
        // Set AI insights if available
        if (data.explanation && data.confidence) {
          setAiInsights({
            explanation: data.explanation,
            confidence: data.confidence
          });
        }
      } else {
        // Fallback to existing AI service
        const results = await aiService.searchServices(searchQuery);
        const enhancedResults: EnhancedSearchResult[] = results.map(result => ({
          ...result,
          type: result.category.includes('service') ? 'service' : 'part'
        }));
        setSuggestions(enhancedResults);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Enhanced search error:', error);
      // Fallback to existing AI service
      try {
        const results = await aiService.searchServices(searchQuery);
        const enhancedResults: EnhancedSearchResult[] = results.map(result => ({
          ...result,
          type: result.category.includes('service') ? 'service' : 'part'
        }));
        setSuggestions(enhancedResults);
        setShowSuggestions(true);
      } catch (fallbackError) {
        console.error('Fallback search error:', fallbackError);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (query.length === 0) {
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

  // Enhanced search handler with navigation
  const handleSearch = useCallback((searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('fixitquick-recent-searches', JSON.stringify(updated));
      
      setShowSuggestions(false);
      
      // If no onSearch callback, navigate to search results page
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        setLocation(`/search/${encodeURIComponent(searchQuery)}`);
      }
    }
  }, [query, recentSearches, onSearch, setLocation]);

  const handleResultSelect = useCallback((result: EnhancedSearchResult) => {
    setQuery(result.name);
    setShowSuggestions(false);
    handleSearch(result.name);
    onResultSelect?.(result);
  }, [handleSearch, onResultSelect]);

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    handleSearch(searchTerm);
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder={placeholder}
            className="ai-search-input pr-24"
            autoFocus={autoFocus}
            data-testid="search-input"
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {/* Voice Search Button */}
            {enableVoice && voiceSearch.isSupported && (
              <Button
                type="button"
                variant={voiceSearch.isListening ? "destructive" : "ghost"}
                size="sm"
                onClick={toggleVoiceSearch}
                className="h-8 w-8 p-0"
                data-testid="button-voice-search"
              >
                {voiceSearch.isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                data-testid="search-loading"
              />
            )}
            
            {/* AI Badge */}
            <Badge 
              variant="secondary" 
              className="ai-badge text-xs px-2"
              data-testid="ai-badge"
            >
              <Brain className="w-3 h-3 mr-1" />
              AI
            </Badge>
          </div>

          {/* AI Insights */}
          <AnimatePresence>
            {aiInsights && showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 bg-primary/10 border border-primary/20 rounded-lg mt-1 p-3 text-xs"
                data-testid="ai-insights"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary">AI Insight</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(aiInsights.confidence * 100)}% confident
                  </Badge>
                </div>
                <p className="text-muted-foreground">{aiInsights.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg mt-1 shadow-lg z-50 max-h-96 overflow-y-auto"
              data-testid="search-suggestions"
            >
              {/* Enhanced AI Search Results */}
              {suggestions.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                    <Brain className="w-4 h-4 text-primary" />
                    <span>AI Powered Results</span>
                  </div>
                  
                  {suggestions.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleResultSelect(result)}
                      className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-primary/20"
                      data-testid={`suggestion-${index}`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg flex items-center justify-center">
                        {result.type === 'service' ? (
                          <Zap className="w-5 h-5 text-primary" />
                        ) : (
                          <Package className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-foreground truncate">{result.name}</p>
                          <Badge 
                            variant={result.type === 'service' ? 'default' : 'secondary'}
                            className="text-xs px-2 py-0.5"
                          >
                            {result.type === 'service' ? 'SERVICE' : 'PART'}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-1">{result.description}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-primary font-semibold text-sm">₹{result.price?.toLocaleString()}</span>
                            
                            {result.rating && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-muted-foreground">{result.rating.toFixed(1)}</span>
                              </div>
                            )}
                            
                            {result.type === 'part' && result.stock !== undefined && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                result.stock > 0 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {result.stock > 0 ? `${result.stock} in stock` : 'Out of stock'}
                              </span>
                            )}
                            
                            {result.totalBookings && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{result.totalBookings} bookings</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {result.provider && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-xs text-muted-foreground">by</span>
                            <span className="text-xs font-medium text-foreground">{result.provider.name}</span>
                            {result.provider.verified && (
                              <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-600">
                                ✓
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {query.length === 0 && recentSearches.length > 0 && (
                <div className="p-2 border-t border-border">
                  <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Recent Searches</span>
                  </div>
                  
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      onClick={() => handleQuickSearch(search)}
                      className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                      data-testid={`recent-search-${index}`}
                    >
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{search}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trending & Popular Searches */}
              {query.length === 0 && (
                <>
                  {/* Personalized Suggestions */}
                  {personalizedSuggestions?.suggestions && (
                    <div className="p-2 border-t border-border">
                      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Recommended for You</span>
                      </div>
                      
                      {[...personalizedSuggestions.suggestions.services, ...personalizedSuggestions.suggestions.parts]
                        .slice(0, 3)
                        .map((item: any, index: number) => (
                          <div
                            key={`personalized-${index}`}
                            onClick={() => handleQuickSearch(item.name)}
                            className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                            data-testid={`personalized-suggestion-${index}`}
                          >
                            <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-primary" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-medium">{item.name}</span>
                              <p className="text-xs text-muted-foreground">₹{item.price || item.basePrice}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Trending Items */}
                  {trendingData?.trending && (
                    <div className="p-2 border-t border-border">
                      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span>Trending Now</span>
                      </div>
                      
                      {trendingData.trending.slice(0, 4).map((item: any, index: number) => (
                        <div
                          key={`trending-${index}`}
                          onClick={() => handleQuickSearch(item.name)}
                          className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                          data-testid={`trending-search-${index}`}
                        >
                          <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/20 rounded flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-orange-500" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.name}</span>
                            <p className="text-xs text-muted-foreground">₹{item.price || item.basePrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Popular Searches */}
                  {popularSearchesData?.popular && (
                    <div className="p-2 border-t border-border">
                      <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                        <Search className="w-4 h-4" />
                        <span>Popular Searches</span>
                      </div>
                      
                      {popularSearchesData.popular.slice(0, 4).map((search: any, index: number) => (
                        <div
                          key={`popular-${index}`}
                          onClick={() => handleQuickSearch(search.query)}
                          className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                          data-testid={`popular-search-${index}`}
                        >
                          <Search className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="text-sm capitalize">{search.query}</span>
                            <p className="text-xs text-muted-foreground">{search.count} searches</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* No results */}
              {query.length > 2 && suggestions.length === 0 && !isLoading && (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">No services found for "{query}"</p>
                  <p className="text-xs mt-1">Try different keywords or browse categories</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
