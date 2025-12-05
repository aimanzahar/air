/**
 * Chat Service
 * 
 * AI-powered chat service for NafasLokal air quality assistant.
 * Provides personalized health recommendations based on:
 * - Current air quality data
 * - User health profile (respiratory conditions, age, etc.)
 * - Location-based pollution levels
 * 
 * Features:
 * - OpenAI/GPT integration with configurable models
 * - Context-aware responses with air quality data
 * - Health-focused recommendations for vulnerable groups
 * - Caching for air quality context
 * - Timeout handling for API calls
 * 
 * @module chatService
 */

import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  HealthProfile,
  AirQualityContext,
  Recommendation
} from '@/types/chat';
import type { AirQualityStation } from '@/types/airQuality';
import OpenAI from 'openai';

/** AI configuration interface */
interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** OpenAI message format */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenAI API response structure */
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
      thinking?: string | { content?: string };
      reasoning?: string;
      analysis?: string;
    };
    thinking?: string;
    reasoning?: string;
    text?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Extended interface for thinking model responses (e.g., GPT-4) */
interface ThinkingModelChoice {
  message?: {
    content?: string;
    role?: string;
    thinking?: string | { content?: string };
    reasoning?: string;
    analysis?: string;
  };
  thinking?: string;
  reasoning?: string;
  text?: string;
}

/**
 * ChatService - Main service class for AI chat functionality
 * 
 * Handles all AI chat interactions including:
 * - Message processing and response generation
 * - Air quality context injection
 * - Health profile-based recommendations
 */
class ChatService {
  private config: AIConfig;
  private airQualityCache = new Map<string, AirQualityContext>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache for air quality data
  private apiTimeout = 45 * 1000; // 45 second timeout for AI API calls

  private openai: OpenAI;

  constructor() {
    // Initialize AI configuration from environment variables
    // Supports multiple AI providers (OpenAI, Gemini, etc.)
    this.config = {
      baseUrl: process.env.OPENAI_BASE_URL || process.env.GEMINI_BASE_URL || process.env.NEXT_PUBLIC_GEMINI_BASE_URL || 'https://apipro.maynor1024.live',
      apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      model: process.env.OPENAI_MODEL || process.env.GEMINI_MODEL || 'gemini-3-pro-preview-11-2025'
    };

    // Initialize OpenAI client with custom base URL for flexibility
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: `${this.config.baseUrl}/v1`,
    });
    
    // Service is initialized
  }

  private generateSystemPrompt(healthProfile?: HealthProfile, airQualityData?: AirQualityContext | null): string {
    const healthContext = healthProfile ? 
      `\n\nUser Health Profile:\n- Has respiratory condition: ${healthProfile.hasRespiratoryCondition}\n${healthProfile.conditions ? `- Specific conditions: ${healthProfile.conditions.join(', ')}` : ''}\n- Sensitivity level: ${healthProfile.sensitivityLevel}` : '';

    const airQualityContext = airQualityData ?
      `\n\nCurrent Air Quality Data:\n- Location: ${airQualityData.location.name || `${airQualityData.location.lat}, ${airQualityData.location.lng}`}\n- AQI: ${airQualityData.aqi}\n- Risk Level: ${airQualityData.riskLevel}\n- Pollutants: ${JSON.stringify(airQualityData.pollutants, null, 2)}` : '';

    return `You are Air Quality Assistant, an AI assistant specialized in providing personalized air quality recommendations and health advice.

Your core responsibilities:
1. Always consider the user's respiratory health status when providing recommendations
2. Use real-time air quality data to inform your advice
3. Provide location-specific air quality assessments
4. Suggest safer routes when air quality varies by location
5. Give actionable health recommendations based on current conditions

Health Risk Levels:
- Low (AQI 75+): Generally safe for all activities
- Moderate (AQI 45-74): Sensitive individuals should take precautions
- High (AQI <45): Everyone should take precautions${healthContext}

For users with respiratory conditions:
- Be extra cautious with recommendations
- Suggest indoor alternatives when AQI is below 100
- Recommend wearing masks (N95/FFP2) for outdoor activities
- Suggest best times for outdoor activities (typically early morning)

Data Sources:
- Primary: DOE Malaysia (Department of Environment)
- Fallback: WAQI (World Air Quality Index)${airQualityContext}

Always:
1. Ask about respiratory conditions on first interaction if not known
2. Provide specific, actionable advice
3. Consider the user's location when assessing air quality
4. Update recommendations based on real-time data
5. Be empathetic and supportive

Response Format:
- Start with a friendly greeting (for new conversations)
- Provide clear air quality assessment
- Give specific recommendations based on health status
- Offer follow-up questions if needed
- Keep responses concise but informative

Example response structure:
"Hi! I can help you understand air quality conditions and how they might affect you.

Current air quality in [Location]:
- AQI: [value] ([risk level])
- Main pollutants: [list]

Based on your respiratory condition status:
[Personalized recommendations]

Would you like to know about [follow-up suggestion]?"`;
  }

  // Get cached air quality data without fetching (non-blocking)
  private getCachedAirQuality(lat: number, lng: number): AirQualityContext | null {
    const cacheKey = `${lat.toFixed(3)}-${lng.toFixed(3)}`;
    const cached = this.airQualityCache.get(cacheKey);

    if (cached) {
      const timestamp = cached.timestamp instanceof Date ? cached.timestamp : new Date(cached.timestamp);
      if (Date.now() - timestamp.getTime() < this.cacheTimeout) {
        return { ...cached, timestamp };
      }
    }
    return null;
  }

  private async fetchAirQuality(lat: number, lng: number): Promise<AirQualityContext | null> {
    const cacheKey = `${lat.toFixed(3)}-${lng.toFixed(3)}`;
    
    // Check cache first
    const cached = this.getCachedAirQuality(lat, lng);
    if (cached) {
      return cached;
    }

    try {
      // Use the existing air quality API
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/air-quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lng }),
      });

      if (!response.ok) {
        console.error('Air quality API error:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data.location) {
        return null;
      }

      // Determine risk level based on AQI
      let riskLevel: 'low' | 'moderate' | 'high';
      const aqi = data.aqi || 0;
      if (aqi >= 75) {
        riskLevel = 'low';
      } else if (aqi >= 45) {
        riskLevel = 'moderate';
      } else {
        riskLevel = 'high';
      }

      const airQualityContext: AirQualityContext = {
        location: {
          lat,
          lng,
          name: data.location || `${lat.toFixed(2)}, ${lng.toFixed(2)}`
        },
        aqi,
        riskLevel,
        pollutants: {
          pm25: data.pm25 || 0,
          no2: data.no2 || 0,
          co: data.co || 0,
          o3: data.o3 || 0,
          so2: data.so2 || 0
        },
        timestamp: new Date()
      };

      // Cache the data
      this.airQualityCache.set(cacheKey, airQualityContext);

      return airQualityContext;
    } catch (error) {
      console.error('Error fetching air quality:', error);
      return null;
    }
  }

  private parseRecommendations(response: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Extract recommendations using regex patterns (without 's' flag for ES2017 compatibility)
    const recommendationPatterns = [
      /- (.+?):\s*(.+?)(?=\n-|$)/g,
      /• (.+?):\s*(.+?)(?=\n•|$)/g,
      /(\*|✓|✔)?\s*(.+?):\s*(.+?)(?=\n|$)/g
    ];

    for (const pattern of recommendationPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const title = match[1] || match[2];
        const content = match[2] || match[3];
        
        if (title && content) {
          recommendations.push({
            type: 'general',
            priority: 'medium',
            title: title.replace(/^\*\s*/, '').trim(),
            content: content.trim(),
            actionableSteps: content.split('.').filter(s => s.trim()).map(s => s.trim() + '.')
          });
        }
      }
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // Use provided air quality data from dashboard if available (ensures consistency)
    // Otherwise fetch from API
    let airQualityData: AirQualityContext | null = null;
    
    if (request.currentAirQuality) {
      // Use the air quality data passed from dashboard for consistency
      const riskLevel = request.currentAirQuality.aqi >= 75 ? 'low' : 
                       request.currentAirQuality.aqi >= 45 ? 'moderate' : 'high';
      airQualityData = {
        location: {
          lat: request.location?.lat || 0,
          lng: request.location?.lng || 0,
          name: request.currentAirQuality.location,
        },
        aqi: request.currentAirQuality.aqi,
        riskLevel,
        pollutants: {
          pm25: request.currentAirQuality.pm25 || 0,
          no2: request.currentAirQuality.no2 || 0,
          co: request.currentAirQuality.co || 0,
          o3: request.currentAirQuality.o3 || 0,
          so2: request.currentAirQuality.so2 || 0,
        },
        timestamp: new Date(),
      };
    } else if (request.location) {
      // Fallback: fetch air quality if not provided
      airQualityData = await this.fetchAirQuality(request.location.lat, request.location.lng);
    }

    // Prepare messages for AI
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: this.generateSystemPrompt(request.healthProfile, airQualityData)
      }
    ];

    // Add conversation history (limit to last 10 messages)
    const history = request.conversationHistory?.slice(-10) || [];
    for (const msg of history) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: request.message
    });

    try {
      if (!this.config.apiKey) {
        throw new Error('AI service API key is not configured');
      }

      let completion: OpenAI.ChatCompletion | unknown = null;
      let aiMessage: string | undefined;
      
      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.apiTimeout);
      
      try {
        // First try with OpenAI SDK
        completion = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: messages as OpenAI.ChatCompletionMessageParam[],
          temperature: 0.7,
          max_tokens: 4096,
        }, {
          signal: abortController.signal,
        });

        // Log the full response structure for debugging
        console.log('Full API Response from SDK:', JSON.stringify(completion, null, 2));
        
        // Try to extract message from SDK response
        const completionTyped = completion as OpenAI.ChatCompletion;
        const message = completionTyped.choices[0]?.message;
        
        // Try content first
        aiMessage = message?.content || undefined;
        
        // For thinking models, content should contain the actual response
        // reasoning_content contains internal thinking that should NOT be shown to users
        if (aiMessage === '') {
          // Empty content indicates the model might not be configured properly
          // or the response format is different
          console.warn('Model returned empty content - this may indicate a configuration issue');
          aiMessage = undefined;
        }
        
        // Check for alternative formats in thinking models
        if (!aiMessage) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const choice = (completion as any).choices?.[0];
          if (choice) {
            // Check for various possible fields
            // Handle thinking field which might be an object
            if (choice.thinking && typeof choice.thinking === 'object' && choice.thinking.content) {
              // Never use thinking content as it contains internal AI reasoning
              aiMessage = undefined;
            } else {
              // Never use thinking/reasoning content as they contain internal AI processes
              aiMessage = undefined;
            }
          }
        }
      } catch (sdkError) {
        console.error('OpenAI SDK error, trying direct fetch:', sdkError);
        
        // Fallback: Make direct fetch request to see raw response
        const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        completion = await response.json();
        
        // Log the raw response
        console.log('Raw API Response:', JSON.stringify(completion, null, 2));
        
        // Try to extract from raw response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseAny = completion as any;
        aiMessage = responseAny.choices?.[0]?.message?.content;
        
        // IMPORTANT: NEVER use reasoning_content - it contains internal thinking
        // If content is empty, this indicates the model may have hit length limits
        // or needs different configuration
        if (!aiMessage && responseAny.choices?.[0]?.message?.reasoning_content) {
          console.warn('Model returned reasoning_content instead of content - model may need configuration adjustment');
          // Don't use reasoning_content as it contains internal thinking
        }
        
        // Check for thinking model specific fields
        if (!aiMessage) {
          const choice = responseAny.choices?.[0];
          if (choice) {
            const message = choice.message;
            
            // For thinking models, content should contain the actual response
            // NEVER use thinking, reasoning, or reasoning_content fields as they contain internal AI thinking
            if (message?.content) {
              // Use the actual response content
              aiMessage = message.content;
            }
          }
          
          // No fallback to thinking/reasoning content - these contain internal AI processes
          // If we reach here, it means the model didn't provide actual response content
          
          // Check if the entire choice is just a string (rare case)
          if (!aiMessage && typeof choice === 'string') {
            aiMessage = choice;
          }
          
          // Check if message itself is a string
          // This case was already handled above, so we don't need this duplicate check
        }
      }

      if (!aiMessage) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseAny = completion as any;
        console.error('Unable to extract message from response. Response structure:', {
          choices: responseAny?.choices,
          hasChoices: !!responseAny?.choices?.length,
          choiceKeys: responseAny?.choices?.[0] ? Object.keys(responseAny.choices[0]) : [],
          messageKeys: responseAny?.choices?.[0]?.message ? Object.keys(responseAny.choices[0].message) : []
        });
        
        // Provide a fallback message instead of throwing an error
        aiMessage = "I apologize, but I couldn't generate a response. This might be due to the model configuration. Please try again.";
      }
      
      console.log('Successfully extracted AI message (first 200 chars):',
                  aiMessage.substring(0, 200) + (aiMessage.length > 200 ? '...' : ''));

      // Clear timeout on success
      clearTimeout(timeoutId);
      
      // Parse recommendations from the response
      const recommendations = this.parseRecommendations(aiMessage);
      // Convert recommendations to string array for ChatResponse compatibility
      const suggestions = recommendations.map(r => `${r.title}: ${r.content}`);

      // Create response message
      const responseMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiMessage,
        timestamp: new Date(),
        metadata: {
          airQualityData: airQualityData || undefined,
          healthProfile: request.healthProfile
        }
      };

      return {
        message: responseMessage,
        airQualityData: airQualityData || undefined,
        suggestions
      };
    } catch (error) {
      console.error('Error calling AI service:', error);
      
      // Check for timeout/abort error
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('AI API call timed out after', this.apiTimeout / 1000, 'seconds');
        const fallbackMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: "I'm sorry, my response is taking too long. Please try again with a simpler question, or check back in a moment.",
          timestamp: new Date()
        };

        return {
          message: fallbackMessage,
          suggestions: [
            "Try asking a shorter question",
            "Check current air quality",
            "Ask about health recommendations"
          ]
        };
      }
      
      // Check if it's an OpenAI API error and log more details
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error:', {
          status: error.status,
          message: error.message,
          code: error.code,
          type: error.type
        });
      } else if (error instanceof Error) {
        console.error('General Error:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // Return a fallback response
      const fallbackMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. In the meantime, remember to check current air quality levels before outdoor activities, especially if you have respiratory conditions.",
        timestamp: new Date()
      };

      return {
        message: fallbackMessage,
        suggestions: [
          "Check air quality before outdoor activities",
          "Wear a mask if air quality is poor",
          "Consider indoor activities during high pollution hours"
        ]
      };
    }
  }

  // Clear cache method
  clearCache(): void {
    this.airQualityCache.clear();
  }

  // Streaming method for real-time responses
  async *streamMessage(request: ChatRequest): AsyncGenerator<{
    type: 'chunk' | 'done' | 'error' | 'air_quality';
    content?: string;
    airQualityData?: AirQualityContext;
    error?: string;
  }, void, unknown> {
    // Use provided air quality data from dashboard if available (ensures consistency)
    let airQualityData: AirQualityContext | null = null;
    
    if (request.currentAirQuality) {
      // Use the air quality data passed from dashboard for consistency
      const riskLevel = request.currentAirQuality.aqi >= 75 ? 'low' : 
                       request.currentAirQuality.aqi >= 45 ? 'moderate' : 'high';
      airQualityData = {
        location: {
          lat: request.location?.lat || 0,
          lng: request.location?.lng || 0,
          name: request.currentAirQuality.location,
        },
        aqi: request.currentAirQuality.aqi,
        riskLevel,
        pollutants: {
          pm25: request.currentAirQuality.pm25 || 0,
          no2: request.currentAirQuality.no2 || 0,
          co: request.currentAirQuality.co || 0,
          o3: request.currentAirQuality.o3 || 0,
          so2: request.currentAirQuality.so2 || 0,
        },
        timestamp: new Date(),
      };
      // Yield the air quality data immediately
      yield { type: 'air_quality', airQualityData };
    } else if (request.location) {
      // Fallback: try to get cached data (non-blocking, instant)
      airQualityData = this.getCachedAirQuality(request.location.lat, request.location.lng);
      
      if (airQualityData) {
        // Yield cached air quality data immediately
        yield { type: 'air_quality', airQualityData };
      } else {
        // Start background fetch to populate cache for next request (fire and forget)
        this.fetchAirQuality(request.location.lat, request.location.lng)
          .then(data => {
            if (data) {
              console.log('Air quality data fetched in background for:', request.location);
            }
          })
          .catch(err => console.error('Background air quality fetch failed:', err));
      }
    }

    // Prepare messages for AI
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: this.generateSystemPrompt(request.healthProfile, airQualityData)
      }
    ];

    // Add conversation history (limit to last 10 messages)
    const history = request.conversationHistory?.slice(-10) || [];
    for (const msg of history) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: request.message
    });

    try {
      if (!this.config.apiKey) {
        throw new Error('AI service API key is not configured');
      }

      // Create abort controller for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.apiTimeout);

      // Create streaming completion with timeout
      const stream = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }, {
        signal: abortController.signal,
      });

      // Iterate over the stream and yield chunks
      let hasContent = false;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          hasContent = true;
          yield { type: 'chunk', content };
        }
        
        // Check for finish reason
        if (chunk.choices[0]?.finish_reason === 'stop') {
          clearTimeout(timeoutId);
          yield { type: 'done' };
          return;
        }
      }

      // Clear timeout and ensure we send done if stream ends without explicit stop
      clearTimeout(timeoutId);
      yield { type: 'done' };

    } catch (error) {
      console.error('Error in streaming AI service:', error);
      
      // Check for timeout/abort error
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('AI streaming timed out after', this.apiTimeout / 1000, 'seconds');
        yield {
          type: 'error',
          error: 'Response timed out. Please try again with a simpler question.'
        };
        return;
      }
      
      // Check if it's an OpenAI API error and log more details
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error:', {
          status: error.status,
          message: error.message,
          code: error.code,
          type: error.type
        });
        yield {
          type: 'error',
          error: `API Error: ${error.message}`
        };
      } else if (error instanceof Error) {
        yield {
          type: 'error',
          error: error.message
        };
      } else {
        yield {
          type: 'error',
          error: 'An unexpected error occurred'
        };
      }
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();