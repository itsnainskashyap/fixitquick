import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { aiService, AISearchResult } from '@/lib/ai';
import { useDebounce } from '@/hooks/useDebounce';

interface AISearchBarProps {
  onSearch?: (query: string) => void;
  onResultSelect?: (result: AISearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AISearchBar({
  onSearch,
  onResultSelect,
  placeholder = "Search services or parts in Hinglish/English...",
  autoFocus = false,
}: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AISearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState([
    'fan repair',
    'tap leak fix',
    'house cleaning',
    'switch installation',
    'pipe fixing'
  ]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    // Load recent searches from localStorage
    const stored = localStorage.getItem('fixitquick-recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      performSearch(debouncedQuery);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    
    try {
      const results = await aiService.searchServices(searchQuery);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
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

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('fixitquick-recent-searches', JSON.stringify(updated));
      
      setShowSuggestions(false);
      onSearch?.(searchQuery);
    }
  };

  const handleResultSelect = (result: AISearchResult) => {
    setQuery(result.name);
    setShowSuggestions(false);
    handleSearch(result.name);
    onResultSelect?.(result);
  };

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
            className="ai-search-input"
            autoFocus={autoFocus}
            data-testid="search-input"
          />
          
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
              />
            )}
            
            <Badge 
              variant="secondary" 
              className="ai-badge"
              data-testid="ai-badge"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              AI
            </Badge>
          </div>
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
              {/* AI Search Results */}
              {suggestions.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Suggestions</span>
                  </div>
                  
                  {suggestions.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleResultSelect(result)}
                      className="ai-suggestion"
                      data-testid={`suggestion-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-primary text-sm">{result.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{result.name}</p>
                          <p className="text-xs text-muted-foreground">{result.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-primary font-semibold text-sm">₹{result.price}</span>
                            {result.rating && (
                              <div className="flex items-center">
                                <span className="text-xs text-muted-foreground">{result.rating}</span>
                                <span className="text-yellow-400 ml-1">★</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
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

              {/* Popular Searches */}
              {query.length === 0 && (
                <div className="p-2 border-t border-border">
                  <div className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>Popular Searches</span>
                  </div>
                  
                  {popularSearches.map((search, index) => (
                    <div
                      key={index}
                      onClick={() => handleQuickSearch(search)}
                      className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                      data-testid={`popular-search-${index}`}
                    >
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm capitalize">{search}</span>
                    </div>
                  ))}
                </div>
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
