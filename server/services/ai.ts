// Enhanced AI Service with real OpenRouter integration
console.log('🤖 AI Service: Initialized with OpenRouter');

import { storage } from '../storage';
import { openRouterService } from './openrouter';

interface AISearchFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  urgency?: 'low' | 'medium' | 'high';
  location?: { latitude: number; longitude: number; maxDistance?: number };
}

interface ServiceSuggestion {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  icon: string;
  rating?: number;
  estimatedDuration?: number;
}

interface SearchContext {
  userId?: string;
  location?: { latitude: number; longitude: number };
  budget?: { min: number; max: number };
  urgency?: 'low' | 'medium' | 'high';
  searchType?: 'services' | 'parts' | 'mixed';
}

interface EnhancedAISearchResponse {
  services: any[];
  parts: any[];
  suggestions: string[];
  explanation: string;
  confidence: number;
  totalResults: number;
  recommendations?: {
    bundles: any[];
    trending: any[];
    similar: any[];
  };
}

class ServerAIService {
  // Parse natural language queries to extract intent
  private parseSearchIntent(query: string): {
    cleanQuery: string;
    categories: string[];
    urgency: 'low' | 'medium' | 'high';
    keywords: string[];
  } {
    const lowercaseQuery = query.toLowerCase();
    const categories: string[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    // Urgency detection
    if (lowercaseQuery.includes('urgent') || lowercaseQuery.includes('emergency') || lowercaseQuery.includes('immediate')) {
      urgency = 'high';
    } else if (lowercaseQuery.includes('whenever') || lowercaseQuery.includes('sometime') || lowercaseQuery.includes('later')) {
      urgency = 'low';
    }
    
    // Category detection patterns
    const categoryPatterns = {
      'electrician': ['electric', 'fan', 'switch', 'light', 'wiring', 'ac', 'air conditioner', 'mcb', 'power'],
      'plumber': ['plumb', 'tap', 'leak', 'pipe', 'water', 'drain', 'toilet', 'basin', 'heater'],
      'cleaner': ['clean', 'cleaning', 'dust', 'maid', 'housekeeping', 'carpet', 'deep clean'],
      'laundry': ['wash', 'laundry', 'clothes', 'dry clean', 'iron', 'starch'],
      'carpentry': ['wood', 'door', 'window', 'cabinet', 'furniture', 'repair', 'carpenter'],
      'pest_control': ['pest', 'cockroach', 'termite', 'rat', 'mouse', 'insect', 'spray']
    };
    
    for (const [category, keywords] of Object.entries(categoryPatterns)) {
      if (keywords.some(keyword => lowercaseQuery.includes(keyword))) {
        categories.push(category);
      }
    }
    
    // Extract keywords for search
    const keywords = query.split(' ')
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''));
    
    return {
      cleanQuery: query.trim(),
      categories,
      urgency,
      keywords
    };
  }

  async searchServices(query: string, filters?: AISearchFilters): Promise<ServiceSuggestion[]> {
    console.log('Enhanced AI: Searching services for:', query, 'with filters:', filters);
    
    try {
      // Parse the query to understand intent
      const intent = this.parseSearchIntent(query);
      
      // Build search filters
      const searchFilters = {
        query: intent.cleanQuery,
        categories: intent.categories.length > 0 ? intent.categories : filters?.category ? [filters.category] : undefined,
        priceRange: filters?.priceRange,
        location: filters?.location,
        urgency: filters?.urgency || intent.urgency,
        limit: 20,
        offset: 0
      };
      
      // Search database for services
      const searchResult = await storage.searchServices(searchFilters);
      
      // Transform database results to AI service format
      const suggestions: ServiceSuggestion[] = searchResult.services.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description || '',
        price: parseFloat(service.basePrice),
        category: service.category.name.toLowerCase().replace(/\s+/g, '_'),
        icon: service.icon || this.getCategoryIcon(service.category.name),
        rating: service.rating ? parseFloat(service.rating) : undefined,
        estimatedDuration: service.estimatedDuration || undefined
      }));
      
      console.log(`Found ${suggestions.length} services from database`);
      return suggestions;
      
    } catch (error) {
      console.error('Error in enhanced AI service search:', error);
      // Fallback to basic search if enhanced search fails
      return [];
    }
  }

  async searchParts(query: string, filters?: {
    category?: string;
    priceRange?: { min: number; max: number };
    inStockOnly?: boolean;
    providerId?: string;
  }): Promise<ServiceSuggestion[]> {
    console.log('Enhanced AI: Searching parts for:', query, 'with filters:', filters);
    
    try {
      // Build search filters for parts
      const searchFilters = {
        query: query.trim(),
        categories: filters?.category ? [filters.category] : undefined,
        priceRange: filters?.priceRange,
        inStockOnly: filters?.inStockOnly,
        providerId: filters?.providerId,
        limit: 20,
        offset: 0
      };
      
      // Search database for parts
      const searchResult = await storage.searchParts(searchFilters);
      
      // Transform database results to AI service format
      const suggestions: ServiceSuggestion[] = searchResult.parts.map(part => ({
        id: part.id,
        name: part.name,
        description: part.description || '',
        price: parseFloat(part.price),
        category: part.category.name.toLowerCase().replace(/\s+/g, '_'),
        icon: part.category.icon || this.getCategoryIcon(part.category.name),
        rating: part.rating ? parseFloat(part.rating) : undefined,
      }));
      
      console.log(`Found ${suggestions.length} parts from database`);
      return suggestions;
      
    } catch (error) {
      console.error('Error in enhanced AI parts search:', error);
      return [];
    }
  }

  async enhancedSearch(query: string, context?: SearchContext): Promise<EnhancedAISearchResponse> {
    console.log('Enhanced AI: Performing enhanced search for:', query, 'with context:', context);
    
    try {
      const intent = this.parseSearchIntent(query);
      let services: any[] = [];
      let parts: any[] = [];
      let totalResults = 0;
      
      // Search based on type preference
      if (!context?.searchType || context.searchType === 'services' || context.searchType === 'mixed') {
        const serviceFilters = {
          query: intent.cleanQuery,
          categories: intent.categories,
          priceRange: context?.budget,
          location: context?.location,
          urgency: context?.urgency || intent.urgency,
          limit: context?.searchType === 'mixed' ? 10 : 20
        };
        
        const serviceResult = await storage.searchServices(serviceFilters);
        services = serviceResult.services;
        totalResults += serviceResult.total;
      }
      
      if (!context?.searchType || context.searchType === 'parts' || context.searchType === 'mixed') {
        const partFilters = {
          query: intent.cleanQuery,
          categories: intent.categories,
          priceRange: context?.budget,
          inStockOnly: true,
          limit: context?.searchType === 'mixed' ? 10 : 20
        };
        
        const partResult = await storage.searchParts(partFilters);
        parts = partResult.parts;
        totalResults += partResult.total;
      }
      
      // Generate AI insights and recommendations
      const suggestions = await storage.getSearchSuggestions(query, context?.userId);
      const confidence = this.calculateConfidence(query, services.length + parts.length);
      const explanation = this.generateExplanation(query, intent, services.length, parts.length);
      
      // Get additional recommendations
      const recommendations = await this.getRecommendations(context?.userId, intent.categories);
      
      return {
        services,
        parts,
        suggestions,
        explanation,
        confidence,
        totalResults,
        recommendations
      };
      
    } catch (error) {
      console.error('Error in enhanced AI search:', error);
      return {
        services: [],
        parts: [],
        suggestions: [],
        explanation: 'Search temporarily unavailable. Please try again.',
        confidence: 0,
        totalResults: 0
      };
    }
  }

  async getSuggestions(userInput: string, context?: any): Promise<ServiceSuggestion[]> {
    console.log('🤖 Enhanced AI: Getting suggestions for:', userInput);
    
    try {
      // Get AI-powered smart suggestions
      const smartSuggestions = await openRouterService.generateSmartSuggestions(userInput, context);
      
      // Convert suggestions to search results
      const suggestionResults: ServiceSuggestion[] = [];
      for (const suggestion of smartSuggestions.slice(0, 5)) {
        const searchResult = await this.searchServices(suggestion);
        if (searchResult.length > 0) {
          suggestionResults.push(searchResult[0]); // Add the top result from each suggestion
        }
      }
      
      // If we don't have enough results, fill with direct search
      if (suggestionResults.length < 3) {
        const directResults = await this.searchServices(userInput);
        suggestionResults.push(...directResults.slice(0, 5 - suggestionResults.length));
      }
      
      return suggestionResults.slice(0, 5); // Return top 5 suggestions
    } catch (error) {
      console.error('❌ Error getting AI suggestions:', error);
      
      // Fallback to database search if AI fails
      const results = await this.searchServices(userInput);
      return results.slice(0, 5);
    }
  }

  async generateServiceDescription(serviceName: string, category: string): Promise<string> {
    console.log('🤖 Enhanced AI: Generating description for:', serviceName, category);
    
    try {
      // Use OpenRouter for intelligent description generation
      return await openRouterService.generateServiceDescription(serviceName, category);
    } catch (error) {
      console.error('❌ Error generating AI description:', error);
      
      // Fallback to template descriptions if OpenRouter fails
      const descriptions = {
        electrician: `Professional ${serviceName} service with experienced technicians. Safety first approach with quality materials.`,
        plumber: `Expert ${serviceName} service using modern tools and techniques. Quick response and reliable repairs.`,
        cleaner: `Thorough ${serviceName} service with eco-friendly products. Attention to detail guaranteed.`,
        laundry: `Premium ${serviceName} service with care for all fabric types. Quick turnaround time.`,
        carpentry: `Skilled ${serviceName} service with precision workmanship. Quality wood and materials used.`,
        pest_control: `Effective ${serviceName} service using safe and approved methods. Long-lasting results guaranteed.`
      };
      
      return descriptions[category as keyof typeof descriptions] || `Professional ${serviceName} service with experienced providers.`;
    }
  }

  async analyzeUserIntent(input: string): Promise<{
    intent: string;
    category?: string;
    urgency: 'low' | 'medium' | 'high';
    extractedInfo: Record<string, any>;
  }> {
    console.log('🤖 Enhanced AI: Analyzing intent for:', input);
    
    try {
      // Use OpenRouter for intelligent intent analysis
      const result = await openRouterService.analyzeSearchIntent(input);
      return result;
    } catch (error) {
      console.error('❌ Error analyzing user intent with AI:', error);
      
      // Fallback to pattern matching if OpenRouter fails
      const parsed = this.parseSearchIntent(input);
      
      return {
        intent: 'service_request',
        category: parsed.categories[0] || 'general',
        urgency: parsed.urgency,
        extractedInfo: {
          originalQuery: input,
          detectedKeywords: parsed.keywords,
          detectedCategories: parsed.categories,
          cleanQuery: parsed.cleanQuery
        }
      };
    }
  }

  async generateChatResponse(message: string, context?: any): Promise<string> {
    console.log('🤖 Enhanced AI: Generating chat response for:', message);
    
    try {
      // Use OpenRouter for intelligent chat response
      const contextString = context ? JSON.stringify(context) : '';
      return await openRouterService.generateChatResponse(message, contextString);
    } catch (error) {
      console.error('❌ Error generating AI chat response:', error);
      
      // Fallback to pattern matching if OpenRouter fails
      const intent = this.parseSearchIntent(message);
      
      if (intent.urgency === 'high') {
        return "I understand this is urgent! I'll help you find emergency service providers who can respond immediately. Let me search for available professionals in your area.";
      } else if (intent.categories.length > 0) {
        const categoryName = intent.categories[0];
        return `I can help you find ${categoryName} services. Based on your request, I'll show you top-rated providers with competitive prices. What's your preferred budget range?`;
      } else {
        return "I'd be happy to help you find the right service! Could you tell me more about what you need? For example, what type of repair or service are you looking for?";
      }
    }
  }

  private calculateConfidence(query: string, resultCount: number): number {
    // Simple confidence calculation based on query specificity and result count
    const queryLength = query.trim().split(' ').length;
    const hasSpecificTerms = /\b(repair|fix|install|clean|replace)\b/i.test(query);
    
    let confidence = 0.5; // Base confidence
    
    if (queryLength > 2) confidence += 0.2;
    if (hasSpecificTerms) confidence += 0.2;
    if (resultCount > 0) confidence += 0.1;
    if (resultCount > 5) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateExplanation(query: string, intent: any, serviceCount: number, partCount: number): string {
    let explanation = `I found ${serviceCount + partCount} results for "${query}".`;
    
    if (intent.urgency === 'high') {
      explanation += ' I prioritized urgent service providers who can respond quickly.';
    } else if (intent.urgency === 'low') {
      explanation += ' I included cost-effective options since timing is flexible.';
    }
    
    if (intent.categories.length > 0) {
      explanation += ` Results focus on ${intent.categories.join(', ')} services.`;
    }
    
    if (serviceCount > 0 && partCount > 0) {
      explanation += ' I found both services and parts to help with your request.';
    } else if (serviceCount > 0) {
      explanation += ' These are professional services to address your needs.';
    } else if (partCount > 0) {
      explanation += ' These parts can help you fix the issue yourself.';
    }
    
    return explanation;
  }

  private async getRecommendations(userId?: string, categories?: string[]): Promise<{
    bundles: any[];
    trending: any[];
    similar: any[];
  }> {
    try {
      const trending = await storage.getTrendingItems('mixed', 5);
      const bundles: any[] = []; // TODO: Implement bundle recommendations
      const similar: any[] = []; // TODO: Implement based on current results
      
      return {
        bundles,
        trending: [...trending.services, ...trending.parts],
        similar
      };
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return { bundles: [], trending: [], similar: [] };
    }
  }

  private getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      'electrician': '⚡',
      'electrical': '⚡',
      'plumber': '🔧',
      'plumbing': '🔧',
      'cleaner': '🧽',
      'cleaning': '🧽',
      'laundry': '👔',
      'carpentry': '🔨',
      'carpenter': '🔨',
      'pest control': '🐛',
      'pest': '🐛',
      'parts': '🔩',
      'hardware': '⚙️',
      'tools': '🛠️',
    };
    
    const key = categoryName.toLowerCase();
    return iconMap[key] || '🔧';
  }
}

export const aiService = new ServerAIService();