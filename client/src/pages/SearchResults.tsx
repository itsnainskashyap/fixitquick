import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AISearchBar } from '@/components/AISearchBar';
import { AIChat } from '@/components/AIChat';
import { ServiceCard } from '@/components/ServiceCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Filter, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Star, 
  ShoppingCart,
  Eye,
  Mic,
  MicOff,
  Lightbulb,
  Zap,
  Package,
  Users,
  BarChart3,
  Brain,
  Target,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface AISearchResult {
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
}

interface SearchFilters {
  categories: string[];
  priceRange: { min: number; max: number };
  inStockOnly: boolean;
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popularity';
  urgency: 'low' | 'medium' | 'high';
  searchType: 'services' | 'parts' | 'mixed';
}

interface AIInsights {
  explanation: string;
  confidence: number;
  suggestions: string[];
  recommendations: {
    bundles: any[];
    trending: any[];
    similar: any[];
  };
}

interface VoiceSearchState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
}

export default function SearchResults() {
  const [location, setLocation] = useLocation();
  const [match] = useRoute('/search');
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();

  // Get search query from URL search parameters
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const queryFromUrl = urlParams.get('q') || '';

  // Search state
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    categories: [],
    priceRange: { min: 0, max: 10000 },
    inStockOnly: true,
    sortBy: 'relevance',
    urgency: 'medium',
    searchType: 'mixed'
  });

  // Update search query when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const newQuery = urlParams.get('q') || '';
    if (newQuery !== searchQuery) {
      setSearchQuery(newQuery);
    }
  }, [location]);
  const [showFilters, setShowFilters] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsights>({
    explanation: '',
    confidence: 0.8,
    suggestions: [],
    recommendations: {
      bundles: [],
      trending: [],
      similar: []
    }
  });

  // Voice search state
  const [voiceSearch, setVoiceSearch] = useState<VoiceSearchState>({
    isListening: false,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    transcript: ''
  });

  // Refs
  const recognitionRef = useRef<any>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Enhanced AI search with infinite scroll
  const {
    data: searchResults,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['ai-search', searchQuery, searchFilters],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      if (!searchQuery.trim()) return { results: { services: [], parts: [], totalResults: 0 }, hasMore: false };

      const response = await fetch('/api/v1/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          context: {
            userId: user?.id,
            urgency: searchFilters.urgency,
            searchType: searchFilters.searchType,
            budget: searchFilters.priceRange
          },
          filters: {
            categories: searchFilters.categories,
            priceRange: searchFilters.priceRange,
            inStockOnly: searchFilters.inStockOnly,
            offset: pageParam * 20,
            limit: 20
          }
        })
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      return {
        results: data.results,
        hasMore: data.results.totalResults > (pageParam + 1) * 20
      };
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!searchQuery.trim()
  });

  // Get personalized suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['ai-suggestions', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/v1/ai/suggestions?type=${searchFilters.searchType}&limit=6`);
      return response.json();
    },
    enabled: !!user?.id
  });

  // Get trending items
  const { data: trending } = useQuery({
    queryKey: ['ai-trending'],
    queryFn: async () => {
      const response = await fetch(`/api/v1/ai/trending?type=${searchFilters.searchType}&limit=8`);
      return response.json();
    }
  });

  // Search analytics mutation
  const trackAnalytics = useMutation({
    mutationFn: async (analytics: any) => {
      await fetch('/api/v1/ai/search-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytics)
      });
    }
  });

  // URL params are now handled by the initial state and the useEffect for location changes

  // Set up AI insights when search results change
  useEffect(() => {
    if (searchResults?.pages[0]?.results) {
      const firstPage = searchResults.pages[0].results;
      setAiInsights({
        explanation: firstPage.explanation || `Found ${firstPage.totalResults} results for "${searchQuery}"`,
        confidence: firstPage.confidence || 0.8,
        suggestions: firstPage.suggestions || [],
        recommendations: firstPage.recommendations || { bundles: [], trending: [], similar: [] }
      });
    }
  }, [searchResults, searchQuery]);

  // Voice search setup
  useEffect(() => {
    if (voiceSearch.isSupported) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceSearch(prev => ({ ...prev, transcript, isListening: false }));
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
  }, [voiceSearch.isSupported]);

  // Infinite scroll setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setSearchQuery(query);
    setLocation(`/search?q=${encodeURIComponent(query)}`);
    
    // Track search analytics
    trackAnalytics.mutate({
      query,
      results: 0, // Will be updated when results come in
      category: searchFilters.categories[0],
      clicked: false,
      duration: Date.now()
    });
  }, [searchFilters.categories, setLocation, trackAnalytics]);

  const toggleVoiceSearch = useCallback(() => {
    if (!voiceSearch.isSupported) {
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
  }, [voiceSearch.isSupported, voiceSearch.isListening, toast]);

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
    // Refetch with new filters
    setTimeout(() => refetch(), 100);
  }, [refetch]);

  const handleAddToCart = useCallback((item: AISearchResult) => {
    if (item.type === 'part' && item.stock === 0) {
      toast({
        title: "Out of stock",
        description: "This part is currently out of stock",
        variant: "destructive"
      });
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      type: item.type,
      category: item.category,
      providerId: item.provider?.id
    });

    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart`
    });

    // Track click analytics
    trackAnalytics.mutate({
      query: searchQuery,
      results: searchResults?.pages[0]?.results.totalResults || 0,
      category: item.category,
      clicked: true,
      duration: Date.now()
    });
  }, [addItem, toast, searchQuery, searchResults, trackAnalytics]);

  const allResults = searchResults?.pages?.flatMap(page => [
    ...(page?.results?.services || []),
    ...(page?.results?.parts || [])
  ]) || [];

  const totalResults = searchResults?.pages?.[0]?.results?.totalResults || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-20">
        {/* Enhanced Search Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <AISearchBar
                onSearch={handleSearch}
                placeholder="Search services, parts, or ask in natural language..."
                autoFocus
                data-testid="search-results-search-bar"
              />
            </div>
            
            {/* Voice Search Button */}
            {voiceSearch.isSupported && (
              <Button
                variant={voiceSearch.isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleVoiceSearch}
                data-testid="button-voice-search"
                className="flex-shrink-0"
              >
                {voiceSearch.isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
              className="flex-shrink-0"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          {/* Search Query Info */}
          {searchQuery && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span data-testid="text-search-query">
                Showing results for "<strong>{searchQuery}</strong>"
              </span>
              {totalResults > 0 && (
                <Badge variant="secondary" data-testid="badge-result-count">
                  {totalResults.toLocaleString()} results
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        <AnimatePresence>
          {aiInsights && aiInsights.explanation && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Search Insights
                    <Badge variant="secondary" className="ml-auto">
                      {Math.round(aiInsights.confidence * 100)}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm" data-testid="text-ai-explanation">
                    {aiInsights.explanation}
                  </p>
                  
                  {aiInsights?.suggestions?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Related searches:</p>
                      <div className="flex flex-wrap gap-2">
                        {(aiInsights?.suggestions || []).map((suggestion, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSearch(suggestion)}
                            data-testid={`button-suggestion-${idx}`}
                            className="text-xs"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Filters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Search Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Type</label>
                    <Select
                      value={searchFilters.searchType}
                      onValueChange={(value) => handleFilterChange('searchType', value)}
                      data-testid="select-search-type"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Services & Parts</SelectItem>
                        <SelectItem value="services">Services Only</SelectItem>
                        <SelectItem value="parts">Parts Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select
                      value={searchFilters.sortBy}
                      onValueChange={(value) => handleFilterChange('sortBy', value)}
                      data-testid="select-sort-by"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="price_low">Price: Low to High</SelectItem>
                        <SelectItem value="price_high">Price: High to Low</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="popularity">Most Popular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Urgency */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Urgency</label>
                    <Select
                      value={searchFilters.urgency}
                      onValueChange={(value) => handleFilterChange('urgency', value)}
                      data-testid="select-urgency"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Whenever convenient</SelectItem>
                        <SelectItem value="medium">Medium - Within few days</SelectItem>
                        <SelectItem value="high">High - Urgent/Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Price Range: ₹{searchFilters.priceRange.min} - ₹{searchFilters.priceRange.max}
                    </label>
                    <Slider
                      value={[searchFilters.priceRange.min, searchFilters.priceRange.max]}
                      onValueChange={([min, max]) => handleFilterChange('priceRange', { min, max })}
                      max={10000}
                      min={0}
                      step={50}
                      className="w-full"
                      data-testid="slider-price-range"
                    />
                  </div>

                  {/* In Stock Only */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="in-stock-only"
                      checked={searchFilters.inStockOnly}
                      onCheckedChange={(checked) => handleFilterChange('inStockOnly', checked)}
                      data-testid="switch-in-stock-only"
                    />
                    <label htmlFor="in-stock-only" className="text-sm font-medium">
                      In stock only
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Results */}
          <div className="lg:col-span-3 space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">AI is searching for the best results...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h3 className="text-lg font-semibold mb-2">Search Failed</h3>
                <p className="text-muted-foreground mb-4">
                  {(error as Error)?.message || 'Something went wrong'}
                </p>
                <Button onClick={() => refetch()} data-testid="button-retry-search">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </Card>
            )}

            {/* Search Results */}
            {allResults.length > 0 && (
              <div className="space-y-4">
                {allResults.map((item, index) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={item.type === 'service' ? 'default' : 'secondary'}>
                                {item.type === 'service' ? <Zap className="h-3 w-3 mr-1" /> : <Package className="h-3 w-3 mr-1" />}
                                {item.type.toUpperCase()}
                              </Badge>
                              {item.provider?.verified && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-semibold mb-2" data-testid={`text-result-name-${index}`}>
                              {item.name}
                            </h3>
                            
                            <p className="text-muted-foreground mb-3" data-testid={`text-result-description-${index}`}>
                              {item.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm">
                              {item.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{item.rating.toFixed(1)}</span>
                                </div>
                              )}
                              
                              {item.totalBookings && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{item.totalBookings} bookings</span>
                                </div>
                              )}
                              
                              {item.type === 'part' && item.stock !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                                  </span>
                                </div>
                              )}
                              
                              {item.provider && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{item.provider.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold mb-2" data-testid={`text-result-price-${index}`}>
                              ₹{item.price.toLocaleString()}
                            </div>
                            
                            <div className="space-y-2">
                              <Button
                                onClick={() => handleAddToCart(item)}
                                disabled={item.type === 'part' && item.stock === 0}
                                className="w-full"
                                data-testid={`button-add-to-cart-${index}`}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                {item.type === 'part' && item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                              </Button>
                              
                              <Button
                                variant="outline"
                                onClick={() => setLocation(`/${item.type}s/${item.id}`)}
                                className="w-full"
                                data-testid={`button-view-details-${index}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                
                {/* Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="py-8">
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading more results...</span>
                    </div>
                  )}
                  
                  {!hasNextPage && allResults.length > 0 && (
                    <div className="text-center text-muted-foreground">
                      You've seen all results for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && !isError && allResults.length === 0 && searchQuery && (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find anything matching "{searchQuery}". Try adjusting your search or filters.
                </p>
                {aiInsights?.suggestions && Array.isArray(aiInsights.suggestions) && aiInsights.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Try these suggestions:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(aiInsights?.suggestions || []).slice(0, 3).map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSearch(suggestion)}
                          data-testid={`button-no-results-suggestion-${idx}`}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Items */}
            {trending?.trending && Array.isArray(trending.trending) && trending.trending.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(trending.trending || []).slice(0, 4).map((item: any, index: number) => (
                    <div
                      key={`trending-${item.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleSearch(item.name)}
                      data-testid={`trending-item-${index}`}
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        {item.type === 'service' ? <Zap className="h-5 w-5 text-primary" /> : <Package className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price || item.basePrice}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Personalized Suggestions */}
            {suggestions?.suggestions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    For You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(suggestions.suggestions.reasons || []).map((reason: string, index: number) => (
                    <div key={index} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <Lightbulb className="h-3 w-3 inline mr-1" />
                      {reason}
                    </div>
                  ))}
                  
                  {[...(suggestions.suggestions.services || []), ...(suggestions.suggestions.parts || [])].slice(0, 3).map((item: any, index: number) => (
                    <div
                      key={`suggestion-${item.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleSearch(item.name)}
                      data-testid={`suggestion-item-${index}`}
                    >
                      <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price || item.basePrice}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}