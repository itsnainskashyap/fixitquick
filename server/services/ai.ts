// Mock AI Service - stub for development without API keys
console.log('Using AI service stub - no real AI API connection');

interface AISearchFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  urgency?: 'low' | 'medium' | 'high';
  location?: string;
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

class ServerAIService {
  private mockServices: ServiceSuggestion[] = [
    {
      id: 'mock-1',
      name: 'AC Repair',
      description: 'Complete air conditioner repair and maintenance',
      price: 800,
      category: 'electrician',
      icon: 'AirVent',
      rating: 4.5,
      estimatedDuration: 120
    },
    {
      id: 'mock-2', 
      name: 'Tap Repair',
      description: 'Fix leaking taps and faucets',
      price: 300,
      category: 'plumber',
      icon: 'Wrench',
      rating: 4.8,
      estimatedDuration: 60
    },
    {
      id: 'mock-3',
      name: 'House Cleaning',
      description: 'Deep cleaning service for your home',
      price: 1200,
      category: 'cleaner', 
      icon: 'Sparkles',
      rating: 4.6,
      estimatedDuration: 180
    }
  ];

  async searchServices(query: string, filters?: AISearchFilters): Promise<ServiceSuggestion[]> {
    console.log('Mock AI: Searching for:', query, 'with filters:', filters);
    
    // Simple mock search - filter by category if provided
    let results = [...this.mockServices];
    
    if (filters?.category) {
      results = results.filter(s => s.category === filters.category);
    }
    
    if (filters?.priceRange) {
      results = results.filter(s => 
        s.price >= filters.priceRange!.min && s.price <= filters.priceRange!.max
      );
    }
    
    // Add some delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return results;
  }

  async getSuggestions(userInput: string, context?: any): Promise<ServiceSuggestion[]> {
    console.log('Mock AI: Getting suggestions for:', userInput);
    
    // Simple keyword matching for demo
    const lowercaseInput = userInput.toLowerCase();
    let suggestions = this.mockServices;
    
    if (lowercaseInput.includes('ac') || lowercaseInput.includes('air')) {
      suggestions = [this.mockServices[0]]; // AC Repair
    } else if (lowercaseInput.includes('tap') || lowercaseInput.includes('leak')) {
      suggestions = [this.mockServices[1]]; // Tap Repair  
    } else if (lowercaseInput.includes('clean')) {
      suggestions = [this.mockServices[2]]; // House Cleaning
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return suggestions;
  }

  async generateServiceDescription(serviceName: string, category: string): Promise<string> {
    console.log('Mock AI: Generating description for:', serviceName, category);
    
    const descriptions = {
      electrician: `Professional ${serviceName} service with experienced technicians. Safety first approach with quality materials.`,
      plumber: `Expert ${serviceName} service using modern tools and techniques. Quick response and reliable repairs.`,
      cleaner: `Thorough ${serviceName} service with eco-friendly products. Attention to detail guaranteed.`,
      laundry: `Premium ${serviceName} service with care for all fabric types. Quick turnaround time.`,
      carpentry: `Skilled ${serviceName} service with precision workmanship. Quality wood and materials used.`,
      pest_control: `Effective ${serviceName} service using safe and approved methods. Long-lasting results guaranteed.`
    };
    
    await new Promise(resolve => setTimeout(resolve, 200));
    return descriptions[category as keyof typeof descriptions] || `Professional ${serviceName} service with experienced providers.`;
  }

  async analyzeUserIntent(input: string): Promise<{
    intent: string;
    category?: string;
    urgency: 'low' | 'medium' | 'high';
    extractedInfo: Record<string, any>;
  }> {
    console.log('Mock AI: Analyzing intent for:', input);
    
    const lowercaseInput = input.toLowerCase();
    let category = 'general';
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    // Simple intent analysis
    if (lowercaseInput.includes('urgent') || lowercaseInput.includes('emergency')) {
      urgency = 'high';
    } else if (lowercaseInput.includes('whenever') || lowercaseInput.includes('sometime')) {
      urgency = 'low';
    }
    
    // Category detection
    if (lowercaseInput.includes('electric') || lowercaseInput.includes('ac') || lowercaseInput.includes('fan')) {
      category = 'electrician';
    } else if (lowercaseInput.includes('plumb') || lowercaseInput.includes('tap') || lowercaseInput.includes('leak')) {
      category = 'plumber';
    } else if (lowercaseInput.includes('clean')) {
      category = 'cleaner';
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      intent: 'service_request',
      category,
      urgency,
      extractedInfo: {
        originalQuery: input,
        detectedKeywords: lowercaseInput.split(' ').filter(w => w.length > 2)
      }
    };
  }

  async generateChatResponse(message: string, context?: any): Promise<string> {
    console.log('Mock AI: Generating chat response for:', message);
    
    const responses = [
      "I'd be happy to help you with that! Let me find the best service providers in your area.",
      "Based on your requirements, I can suggest some great options. What's your preferred time for the service?",
      "That's a common issue! Our verified professionals can handle that efficiently. Would you like to see available slots?",
      "Great choice! I'll connect you with top-rated service providers. Do you have any specific preferences?"
    ];
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export const aiService = new ServerAIService();