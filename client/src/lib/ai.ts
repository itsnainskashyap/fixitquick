// AI service for DeepSeek integration via OpenRouter
export interface AISearchResult {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: string;
  type: 'service' | 'part';
  rating?: number;
}

export interface AIBundleSuggestion {
  mainItem: string;
  suggestedItems: Array<{
    id: string;
    name: string;
    price: number;
    discount: number;
  }>;
  totalSavings: number;
  combinedPrice: number;
}

export interface AIIconRequest {
  name: string;
  category: string;
  style?: 'cartoon' | 'minimalist' | 'detailed';
}

class AIService {
  private baseUrl = '/api/v1/ai';

  constructor() {
    // No API keys needed - all requests go through secure server endpoints
    console.log('🤖 NainsAI Service: Initialized with server-side endpoints');
  }

  private async makeServerRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Server AI request error:', error);
      throw error;
    }
  }

  async searchServices(query: string, filters?: {
    category?: string;
    priceRange?: { min: number; max: number };
    urgency?: 'low' | 'medium' | 'high';
    location?: string;
  }): Promise<AISearchResult[]> {
    try {
      const searchBody = {
        query,
        context: {
          urgency: filters?.urgency,
          searchType: 'services' as const,
          ...(filters?.location && {
            location: {
              latitude: 0, // Default coordinates
              longitude: 0,
              maxDistance: 10000
            }
          })
        },
        filters: {
          ...(filters?.category && { categories: [filters.category] }),
          ...(filters?.priceRange && { priceRange: filters.priceRange })
        }
      };

      const response = await this.makeServerRequest('/search', 'POST', searchBody);
      return response.results || [];
    } catch (error) {
      console.error('Error searching services:', error);
      return [];
    }
  }

  async suggestBundles(cartItems: Array<{ id: string; name: string; price: number; category: string }>): Promise<AIBundleSuggestion[]> {
    try {
      // For now, return static bundle suggestions until server endpoint is available
      // This is safer than direct API calls and maintains functionality
      const bundleSuggestions: AIBundleSuggestion[] = [];
      
      // Simple logic to suggest related services
      cartItems.forEach(item => {
        if (item.category === 'electrician') {
          bundleSuggestions.push({
            mainItem: item.name,
            suggestedItems: [
              { id: 'switch_install', name: 'Switch Installation', price: 80, discount: 15 },
              { id: 'outlet_repair', name: 'Outlet Repair', price: 60, discount: 10 }
            ],
            totalSavings: 25,
            combinedPrice: item.price + 140 - 25
          });
        } else if (item.category === 'plumber') {
          bundleSuggestions.push({
            mainItem: item.name,
            suggestedItems: [
              { id: 'drain_cleaning', name: 'Drain Cleaning', price: 120, discount: 20 },
              { id: 'faucet_repair', name: 'Faucet Repair', price: 90, discount: 15 }
            ],
            totalSavings: 35,
            combinedPrice: item.price + 210 - 35
          });
        }
      });
      
      return bundleSuggestions.slice(0, 3); // Limit to 3 suggestions
    } catch (error) {
      console.error('Error suggesting bundles:', error);
      return [];
    }
  }

  async generateServiceIcon(request: AIIconRequest): Promise<string> {
    try {
      const response = await this.makeServerRequest('/generate-icon', 'POST', {
        name: request.name,
        category: request.category,
        style: request.style || 'cartoon'
      });
      
      return response.icon || this.getEmojiIcon(request.category);
    } catch (error) {
      console.error('Error generating icon:', error);
      return this.getEmojiIcon(request.category);
    }
  }

  private getEmojiIcon(category: string): string {
    const emojiMap: Record<string, string> = {
      'electrician': '⚡',
      'plumber': '🔧',
      'cleaner': '🧽',
      'laundry': '👔',
      'carpentry': '🔨',
      'pest_control': '🐛',
      'parts': '🔩',
      'tools': '🛠️',
      'hardware': '⚙️',
    };
    
    return emojiMap[category.toLowerCase()] || '🔧';
  }

  async translateText(text: string, targetLanguage: 'hi' | 'bho' | 'en'): Promise<string> {
    try {
      // For now, return original text since no server translation endpoint available
      // This is safer than direct API calls and maintains functionality
      console.warn('Translation service disabled for security - using original text');
      return text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Return original text if translation fails
    }
  }

  async analyzeSearchIntent(query: string): Promise<{
    intent: 'service_search' | 'part_search' | 'emergency' | 'general';
    urgency: 'low' | 'medium' | 'high';
    category?: string;
    keywords: string[];
  }> {
    try {
      // Basic client-side intent analysis without direct API calls
      const lowerQuery = query.toLowerCase();
      const keywords = query.split(' ').filter(word => word.length > 2);
      
      // Detect urgency from keywords
      const urgentWords = ['emergency', 'urgent', 'asap', 'immediately', 'broken', 'leaking', 'not working'];
      const urgency = urgentWords.some(word => lowerQuery.includes(word)) ? 'high' : 'medium';
      
      // Detect intent from keywords
      const serviceWords = ['repair', 'fix', 'install', 'service', 'maintenance'];
      const partWords = ['part', 'spare', 'component', 'buy', 'purchase'];
      
      let intent: 'service_search' | 'part_search' | 'emergency' | 'general' = 'general';
      if (urgency === 'high') {
        intent = 'emergency';
      } else if (partWords.some(word => lowerQuery.includes(word))) {
        intent = 'part_search';
      } else if (serviceWords.some(word => lowerQuery.includes(word))) {
        intent = 'service_search';
      }
      
      // Detect category
      const categories = {
        'electrician': ['electric', 'fan', 'switch', 'light', 'wiring', 'mcb'],
        'plumber': ['water', 'pipe', 'tap', 'leak', 'drain', 'toilet'],
        'cleaner': ['clean', 'wash', 'dirty', 'vacuum'],
        'carpentry': ['wood', 'door', 'furniture', 'cabinet'],
        'pest_control': ['pest', 'cockroach', 'termite', 'rat']
      };
      
      let category: string | undefined;
      for (const [cat, words] of Object.entries(categories)) {
        if (words.some(word => lowerQuery.includes(word))) {
          category = cat;
          break;
        }
      }
      
      return { intent, urgency, category, keywords };
    } catch (error) {
      console.error('Error analyzing search intent:', error);
      return {
        intent: 'general',
        urgency: 'low',
        keywords: query.split(' ').filter(word => word.length > 2)
      };
    }
  }

  async generateProviderTips(metrics: {
    completionRate: number;
    avgRating: number;
    ordersCompleted: number;
    category: string;
  }): Promise<string[]> {
    try {
      // Generate basic tips based on metrics without direct API calls
      const tips: string[] = [];
      
      if (metrics.completionRate < 90) {
        tips.push('Focus on completing all accepted orders to build trust');
      }
      
      if (metrics.avgRating < 4.0) {
        tips.push('Ask customers for feedback and address their concerns promptly');
      }
      
      if (metrics.ordersCompleted < 10) {
        tips.push('Build your portfolio by completing more orders and showcasing your work');
      }
      
      // Category-specific tips
      const categoryTips: Record<string, string[]> = {
        'electrician': ['Always prioritize safety and use proper tools', 'Explain electrical issues clearly to customers'],
        'plumber': ['Carry essential spare parts for common repairs', 'Test your work thoroughly before leaving'],
        'cleaner': ['Bring your own cleaning supplies', 'Pay attention to detail in high-visibility areas'],
        'carpentry': ['Measure twice, cut once - precision is key', 'Clean up wood shavings and debris after work'],
        'pest_control': ['Educate customers about prevention methods', 'Follow up to ensure treatment effectiveness']
      };
      
      if (categoryTips[metrics.category]) {
        tips.push(...categoryTips[metrics.category]);
      }
      
      // Default tips if none generated
      if (tips.length === 0) {
        tips.push(
          'Maintain consistent communication with customers',
          'Arrive on time for all appointments',
          'Follow up after service completion'
        );
      }
      
      return tips.slice(0, 3); // Limit to 3 tips
    } catch (error) {
      console.error('Error generating provider tips:', error);
      return [
        'Maintain consistent communication with customers',
        'Arrive on time for all appointments',
        'Follow up after service completion'
      ];
    }
  }
}

export const aiService = new AIService();
