// OpenRouter API Service for DeepSeek integration
import fetch from 'node-fetch';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: 'json_object' };
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private model = 'deepseek/deepseek-chat-v3.1:free';
  private siteUrl: string;
  private siteName: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.siteUrl = process.env.SITE_URL || 'http://localhost:5000';
    this.siteName = process.env.SITE_NAME || 'FixitQuick';
    
    if (!this.apiKey) {
      console.error('❌ CRITICAL: OPENROUTER_API_KEY not found in environment variables');
      console.error('   Please add OPENROUTER_API_KEY to your Replit Secrets');
      throw new Error('OpenRouter API key is required but not configured. Please add OPENROUTER_API_KEY to environment secrets.');
    }
    
    console.log('🤖 AI Service: Initialized with OpenRouter');
    console.log('📡 Using model:', this.model);
    console.log('🌐 Site URL:', this.siteUrl);
    console.log('🔑 API Key configured:', this.apiKey ? 'YES' : 'NO');
  }

  async makeRequest(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: { type: 'json_object' };
    } = {}
  ): Promise<string> {
    try {
      console.log('🚀 OpenRouter API Request:', {
        model: this.model,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) + '...'
      });

      const requestBody: OpenRouterRequest = {
        model: this.model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: 0.9,
        frequency_penalty: 0,
        presence_penalty: 0,
      };

      if (options.responseFormat) {
        requestBody.response_format = options.responseFormat;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenRouter API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json() as OpenRouterResponse;
      
      console.log('✅ OpenRouter API Response:', {
        tokensUsed: data.usage?.total_tokens || 0,
        responseLength: data.choices[0]?.message?.content?.length || 0
      });

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenRouter API');
      }

      return content;

    } catch (error) {
      console.error('💥 OpenRouter Request Error:', error);
      throw error;
    }
  }

  async generateChatResponse(
    userMessage: string,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    const messages: OpenRouterMessage[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    } else {
      messages.push({
        role: 'system',
        content: `You are a helpful AI assistant for FixitQuick, a service marketplace platform. 
        You help users find home services like electricians, plumbers, cleaners, etc. 
        Be friendly, concise, and focus on helping users find the right services for their needs.
        Always prioritize safety and quality in your recommendations.`
      });
    }

    // Add context if provided
    if (context) {
      messages.push({
        role: 'system',
        content: `Context: ${context}`
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    return await this.makeRequest(messages, {
      temperature: 0.8,
      maxTokens: 500
    });
  }

  async analyzeSearchIntent(query: string): Promise<{
    intent: string;
    category?: string;
    urgency: 'low' | 'medium' | 'high';
    extractedInfo: Record<string, any>;
  }> {
    const systemPrompt = `You are an AI that analyzes search queries for a home services marketplace. 
    Analyze the user's query and determine their intent, urgency level, service category, and extract key information.
    
    Service categories available: electrician, plumber, cleaner, laundry, carpentry, pest_control
    Intent types: service_request, part_search, emergency, general_inquiry, price_inquiry
    Urgency levels: low (flexible timing), medium (normal), high (urgent/emergency)
    
    Return a JSON object with the analysis.`;

    const userPrompt = `Analyze this search query: "${query}"
    
    Return JSON in this exact format:
    {
      "intent": "service_request",
      "category": "electrician",
      "urgency": "medium",
      "extractedInfo": {
        "problem": "ceiling fan not working",
        "keywords": ["fan", "ceiling", "repair"],
        "location_mentioned": false,
        "budget_mentioned": false,
        "timing_mentioned": false
      }
    }`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        responseFormat: { type: 'json_object' },
        temperature: 0.3
      });

      const parsed = JSON.parse(response);
      return parsed;
    } catch (error) {
      console.error('Error analyzing search intent:', error);
      // Fallback analysis
      return {
        intent: 'general_inquiry',
        urgency: 'medium',
        extractedInfo: {
          problem: query,
          keywords: query.split(' ').filter(word => word.length > 2),
          location_mentioned: false,
          budget_mentioned: false,
          timing_mentioned: false
        }
      };
    }
  }

  async generateServiceDescription(serviceName: string, category: string): Promise<string> {
    const prompt = `Generate a professional, concise description for the service "${serviceName}" in the ${category} category.
    
    The description should:
    - Be 1-2 sentences long
    - Highlight key benefits and expertise
    - Sound trustworthy and professional
    - Mention safety/quality when relevant
    - Be suitable for a service marketplace
    
    Service: ${serviceName}
    Category: ${category}`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a professional copywriter for a service marketplace.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        maxTokens: 150
      });

      return response.trim();
    } catch (error) {
      console.error('Error generating service description:', error);
      return `Professional ${serviceName} service with experienced technicians. Quality work with reliable results.`;
    }
  }

  async generateSmartSuggestions(
    query: string,
    userContext?: {
      recentSearches?: string[];
      location?: string;
      preferences?: string[];
    }
  ): Promise<string[]> {
    const contextInfo = userContext ? `
    User context:
    - Recent searches: ${userContext.recentSearches?.join(', ') || 'none'}
    - Location: ${userContext.location || 'not specified'}
    - Preferences: ${userContext.preferences?.join(', ') || 'none'}` : '';

    const prompt = `Generate 5 smart search suggestions based on the user's query and context.
    
    Original query: "${query}"
    ${contextInfo}
    
    Suggestions should be:
    - Related to home services (electrician, plumber, cleaner, etc.)
    - More specific than the original query
    - Helpful for finding exact services
    - Varied in scope (immediate needs, related services, preventive maintenance)
    
    Return as JSON array: ["suggestion 1", "suggestion 2", ...]`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a smart search assistant for a home services marketplace.' },
        { role: 'user', content: prompt }
      ], {
        responseFormat: { type: 'json_object' },
        temperature: 0.8,
        maxTokens: 300
      });

      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : parsed.suggestions || [];
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [
        `${query} near me`,
        `${query} cost`,
        `${query} emergency`,
        `best ${query} service`,
        `${query} same day`
      ];
    }
  }

  async analyzeTrendingPatterns(
    searchData: Array<{
      query: string;
      count: number;
      category?: string;
      timestamp: Date;
    }>
  ): Promise<{
    insights: string[];
    recommendations: string[];
    seasonalTrends: string[];
  }> {
    const dataString = searchData.slice(0, 20).map(item => 
      `${item.query} (${item.count} searches, ${item.category || 'general'})`
    ).join('\n');

    const prompt = `Analyze these trending search patterns from a home services marketplace:

    ${dataString}
    
    Provide insights about:
    1. Popular service categories and trends
    2. Seasonal patterns or urgent needs
    3. Recommendations for service providers
    
    Return JSON with:
    {
      "insights": ["insight 1", "insight 2", ...],
      "recommendations": ["recommendation 1", "recommendation 2", ...], 
      "seasonalTrends": ["trend 1", "trend 2", ...]
    }`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: 'You are a data analyst specializing in home services trends.' },
        { role: 'user', content: prompt }
      ], {
        responseFormat: { type: 'json_object' },
        temperature: 0.6,
        maxTokens: 600
      });

      const parsed = JSON.parse(response);
      return {
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        seasonalTrends: parsed.seasonalTrends || []
      };
    } catch (error) {
      console.error('Error analyzing trending patterns:', error);
      return {
        insights: ['High demand for electrical and plumbing services'],
        recommendations: ['Focus on quick response times for urgent repairs'],
        seasonalTrends: ['Increased AC servicing in summer months']
      };
    }
  }
}

export const openRouterService = new OpenRouterService();