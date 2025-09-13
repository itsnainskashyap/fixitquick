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
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'deepseek/deepseek-chat-v3.1:free';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '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';
  }

  private async makeRequest(messages: Array<{ role: string; content: string }>, responseFormat?: { type: string }) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'FixitQuick',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          ...(responseFormat && { response_format: responseFormat }),
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content;
    } catch (error) {
      console.error('AI request error:', error);
      throw error;
    }
  }

  async searchServices(query: string, filters?: {
    category?: string;
    priceRange?: { min: number; max: number };
    urgency?: 'low' | 'medium' | 'high';
    location?: string;
  }): Promise<AISearchResult[]> {
    const prompt = `
    You are an AI assistant for FixitQuick, a service marketplace. 
    Convert the following search query into relevant service suggestions.
    
    Query: "${query}"
    ${filters ? `Filters: ${JSON.stringify(filters)}` : ''}
    
    Available service categories:
    - Electrician: Fan repair, switch installation, wiring, MCB, light fixtures
    - Plumber: Tap repair, pipe fixing, drain cleaning, water heater
    - Cleaner: House cleaning, deep cleaning, carpet cleaning
    - Laundry: Washing, dry cleaning, ironing
    - Carpentry: Furniture repair, door fixing, cabinet installation
    - Pest Control: Cockroach treatment, termite control, rodent control
    
    Return a JSON array of 5-10 relevant services with this exact structure:
    [
      {
        "id": "service_id",
        "name": "Service Name",
        "description": "Brief description",
        "price": 60,
        "icon": "🔧",
        "category": "electrician",
        "type": "service",
        "rating": 4.5
      }
    ]
    
    Make sure prices are realistic (₹30-500) and icons are relevant emojis.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
        { role: 'user', content: prompt }
      ], { type: 'json_object' });

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : parsed.services || [];
    } catch (error) {
      console.error('Error searching services:', error);
      return [];
    }
  }

  async suggestBundles(cartItems: Array<{ id: string; name: string; price: number; category: string }>): Promise<AIBundleSuggestion[]> {
    const prompt = `
    Based on the following cart items, suggest 2-3 complementary service bundles that would provide value to the customer.
    
    Cart items: ${JSON.stringify(cartItems)}
    
    Consider:
    - Services that are commonly needed together
    - Geographic efficiency (same area visits)
    - Tools/materials that can be shared
    - Seasonal or maintenance bundles
    
    Return JSON with this structure:
    [
      {
        "mainItem": "Fan Repair",
        "suggestedItems": [
          {
            "id": "switch_install",
            "name": "Switch Installation", 
            "price": 80,
            "discount": 15
          }
        ],
        "totalSavings": 25,
        "combinedPrice": 125
      }
    ]
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a helpful assistant that returns only valid JSON.' },
        { role: 'user', content: prompt }
      ], { type: 'json_object' });

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : parsed.bundles || [];
    } catch (error) {
      console.error('Error suggesting bundles:', error);
      return [];
    }
  }

  async generateServiceIcon(request: AIIconRequest): Promise<string> {
    const prompt = `
    Generate a simple 2D ${request.style || 'cartoon'} SVG icon for "${request.name}" in the ${request.category} category.
    
    Requirements:
    - White background with black outlines
    - Purple accents (#8B5CF6)
    - Optimized for 24x24px display
    - Clean, recognizable design
    - SVG format with proper viewBox
    
    Return only the SVG code, no explanations.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are an SVG icon designer. Return only clean SVG code.' },
        { role: 'user', content: prompt }
      ]);

      // Basic validation and cleanup
      if (response.includes('<svg') && response.includes('</svg>')) {
        return response.trim();
      } else {
        // Fallback to emoji if SVG generation fails
        return this.getEmojiIcon(request.category);
      }
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
    const languageMap = {
      'hi': 'Hindi',
      'bho': 'Bhojpuri', 
      'en': 'English'
    };

    const prompt = `
    Translate the following text to ${languageMap[targetLanguage]}:
    
    "${text}"
    
    Return only the translated text, maintaining the original meaning and context for a service marketplace app.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: `You are a professional translator specializing in Indian languages.` },
        { role: 'user', content: prompt }
      ]);

      return response.trim();
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
    const prompt = `
    Analyze the search intent for this query from a service marketplace:
    
    Query: "${query}"
    
    Determine:
    1. Intent type: service_search, part_search, emergency, or general
    2. Urgency level: low, medium, high
    3. Most likely service category if applicable
    4. Key search keywords
    
    Return JSON:
    {
      "intent": "service_search",
      "urgency": "medium", 
      "category": "electrician",
      "keywords": ["fan", "repair", "ceiling"]
    }
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a search intent analyzer. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ], { type: 'json_object' });

      return JSON.parse(response);
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
    const prompt = `
    Based on these service provider metrics, suggest 3 specific improvement tips:
    
    Completion Rate: ${metrics.completionRate}%
    Average Rating: ${metrics.avgRating}/5
    Orders Completed: ${metrics.ordersCompleted}
    Category: ${metrics.category}
    
    Provide actionable, specific advice for improving performance in this service category.
    Return as JSON array of strings.
    `;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a business advisor for service providers. Return only JSON array.' },
        { role: 'user', content: prompt }
      ], { type: 'json_object' });

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : parsed.tips || [];
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
