import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/chatService';
import type { ChatRequest, ChatResponse, ChatbotResponse } from '@/types/chat';

// Type for streaming chunk
interface StreamChunk {
  type: 'chunk' | 'done' | 'error' | 'air_quality';
  content?: string;
  airQualityData?: any;
  error?: string;
}

// Rate limiting store (in production, use Redis or a proper rate limiting solution)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60;

// Validate request body
function validateRequest(body: any): body is ChatRequest {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof body.message === 'string' &&
    typeof body.sessionId === 'string' &&
    body.message.trim().length > 0 &&
    body.message.length <= 5000
  );
}

// Check rate limit
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // Reset or create new window
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  clientData.count++;
  return true;
}

// Get client ID from request
function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `chat:${ip}`;
}

// POST /api/chat
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientId = getClientId(request);
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          message: 'Too many requests. Please wait a moment before continuing.',
          success: false
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request
    if (!validateRequest(body)) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          message: 'Please provide a valid message and session ID.',
          success: false
        },
        { status: 400 }
      );
    }

    // Validate location if provided
    if (body.location && (
      typeof body.location.lat !== 'number' ||
      typeof body.location.lng !== 'number' ||
      isNaN(body.location.lat) ||
      isNaN(body.location.lng)
    )) {
      return NextResponse.json(
        { 
          error: 'Invalid location format',
          message: 'Location coordinates must be valid numbers.',
          success: false
        },
        { status: 400 }
      );
    }

    // Validate health profile if provided
    if (body.healthProfile && (
      typeof body.healthProfile.hasRespiratoryCondition !== 'boolean' ||
      (body.healthProfile.sensitivityLevel && 
       !['normal', 'sensitive', 'very_sensitive'].includes(body.healthProfile.sensitivityLevel))
    )) {
      return NextResponse.json(
        { 
          error: 'Invalid health profile format',
          message: 'Please provide valid health information.',
          success: false
        },
        { status: 400 }
      );
    }

    // Check if streaming is requested
    const url = new URL(request.url);
    const isStreaming = url.searchParams.get('stream') === 'true';

    if (isStreaming) {
      // Handle streaming response
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const streamGenerator = chatService.streamMessage(body as ChatRequest);
            
            for await (const chunk of streamGenerator) {
              // Send as SSE format
              const data = JSON.stringify(chunk);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              
              // If done or error, close the stream
              if (chunk.type === 'done' || chunk.type === 'error') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
            }
            
            // Ensure stream is closed if generator ends without done/error
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Streaming failed'
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming: Call chat service as before
    const response: ChatResponse = await chatService.sendMessage(body as ChatRequest);

    // Return the ChatResponse directly as expected by the frontend
    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return a generic error response
    const errorResponse: ChatbotResponse = {
      success: false,
      message: "I'm having trouble processing your request right now. Please try again in a moment.",
      recommendations: [
        {
          type: 'general',
          priority: 'high',
          title: 'Service Unavailable',
          content: 'The chat service is temporarily unavailable. Please try again later.',
          actionableSteps: ['Refresh the page and try again', 'Check your internet connection']
        }
      ]
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Extract follow-up questions from AI response
function extractFollowUpQuestions(content: string): string[] {
  const questions: string[] = [];
  
  // Look for question patterns
  const questionPatterns = [
    /Would you like to know about ([^?]+)/gi,
    /Do you want to ([^?]+)/gi,
    /Would you like me to ([^?]+)/gi,
    /Should I ([^?]+)/gi,
    /Can I ([^?]+)/gi
  ];

  for (const pattern of questionPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      questions.push(...matches.slice(0, 2)); // Limit to prevent too many questions
    }
  }

  // Look for sentences ending with ?
  const questionSentences = content.match(/[^.!?]*\?/g);
  if (questionSentences) {
    questions.push(...questionSentences.slice(0, 2));
  }

  // Return unique questions
  return [...new Set(questions)].slice(0, 3); // Limit to 3 follow-up questions
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}