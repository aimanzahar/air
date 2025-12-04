import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChatMessage, HealthProfile, AirQualityContext, ChatResponse } from '@/types/chat';

interface ChatContextType {
  messages: ChatMessage[];
  sessionId: string;
  healthProfile: HealthProfile | null;
  isOpen: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (message: string, location?: { lat: number; lng: number }) => Promise<void>;
  updateHealthProfile: (profile: HealthProfile) => void;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
}

// Type for streaming chunk from API
interface StreamChunk {
  type: 'chunk' | 'done' | 'error' | 'air_quality';
  content?: string;
  airQualityData?: AirQualityContext;
  error?: string;
}

interface ChatProviderProps {
  children: ReactNode;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SESSION_ID: 'air-quality-chat-session-id',
  HEALTH_PROFILE: 'air-quality-chat-health-profile',
  MESSAGES: 'air-quality-chat-messages',
} as const;

const MAX_MESSAGES = 50; // Keep last 50 messages to avoid excessive storage

const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getMessageKey = (messageId: string): string => {
  return `air-quality-chat-message-${messageId}`;
};

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return generateSessionId();
    
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (stored) return stored;
    
    const newId = generateSessionId();
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, newId);
    return newId;
  });

  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(STORAGE_KEYS.HEALTH_PROFILE);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed as HealthProfile;
      } catch (error) {
        console.error('Error parsing health profile from localStorage:', error);
      }
    }
    return null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    
    // Load messages from localStorage (individual message keys)
    const messageKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('air-quality-chat-message-'))
      .sort((a, b) => {
        // Sort by timestamp embedded in key if available
        const aTime = parseInt(a.split('-').pop() || '0');
        const bTime = parseInt(b.split('-').pop() || '0');
        return aTime - bTime;
      });
    
    const loadedMessages: ChatMessage[] = [];
    messageKeys.slice(-MAX_MESSAGES).forEach(key => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          
          // Skip thinking/placeholder messages
          if (parsed.id?.includes('thinking') || parsed.content === '...') {
            localStorage.removeItem(key);
            return;
          }
          
          // Convert timestamp string back to Date object
          if (parsed.timestamp) {
            parsed.timestamp = new Date(parsed.timestamp);
            // Check if the date is invalid, if so, use current date
            if (isNaN(parsed.timestamp.getTime())) {
              console.warn('Invalid timestamp found in message, using current date');
              parsed.timestamp = new Date();
            }
          }
          // Ensure role is a string and is valid
          if (!parsed.role || !['user', 'assistant', 'system'].includes(parsed.role)) {
            console.warn('Invalid or missing role in message, defaulting to assistant:', parsed.role);
            parsed.role = 'assistant';
          }
          // Ensure content is a string
          if (typeof parsed.content !== 'string') {
            console.warn('Invalid content type in message, converting to string');
            parsed.content = String(parsed.content || '');
          }
          loadedMessages.push(parsed as ChatMessage);
        } catch (error) {
          console.error('Error parsing message from localStorage:', error);
          localStorage.removeItem(key);
        }
      }
    });
    
    return loadedMessages;
  });

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    
    const stored = localStorage.getItem('air-quality-chat-is-open');
    return stored === 'true';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Function to update a streaming message's content
  const updateStreamingMessage = useCallback((messageId: string, content: string, airQualityData?: AirQualityContext) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const messageIndex = newMessages.findIndex(m => m.id === messageId);
      
      if (messageIndex !== -1) {
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          content,
          metadata: airQualityData ? {
            ...newMessages[messageIndex].metadata,
            airQualityData,
          } : newMessages[messageIndex].metadata,
        };
      }
      
      return newMessages;
    });
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear old messages from localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith('air-quality-chat-message-'))
      .forEach(key => localStorage.removeItem(key));
    
    // Save current messages (limit to MAX_MESSAGES)
    // Filter out thinking/placeholder messages that have "..." content or thinking IDs
    const messagesToSave = messages
      .filter(message => 
        !message.id.includes('thinking') && 
        message.content !== '...'
      )
      .slice(-MAX_MESSAGES);
    messagesToSave.forEach(message => {
      const key = getMessageKey(message.id);
      localStorage.setItem(key, JSON.stringify({
        ...message,
        timestamp: message.timestamp instanceof Date
          ? message.timestamp.toISOString()
          : message.timestamp,
      }));
    });
  }, [messages]);

  // Save session ID to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }, [sessionId]);

  // Save health profile to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (healthProfile) {
      localStorage.setItem(STORAGE_KEYS.HEALTH_PROFILE, JSON.stringify(healthProfile));
    } else {
      localStorage.removeItem(STORAGE_KEYS.HEALTH_PROFILE);
    }
  }, [healthProfile]);

  // Save open state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('air-quality-chat-is-open', isOpen.toString());
  }, [isOpen]);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateHealthProfile = useCallback((profile: HealthProfile) => {
    setHealthProfile(profile);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastFailedMessage(null);
    
    // Clear messages from localStorage
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(key => key.startsWith('air-quality-chat-message-'))
        .forEach(key => localStorage.removeItem(key));
    }
    
    // Generate new session ID
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
    }
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    location?: { lat: number; lng: number }
  ) => {
    if (!message.trim()) return;

    // Clear previous errors
    setError(null);
    setLastFailedMessage(null);

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    // Create assistant thinking message
    const thinkingMessage: ChatMessage = {
      id: `assistant-thinking-${Date.now()}`,
      role: 'assistant',
      content: '...',
      timestamp: new Date(),
    };

    // Create streaming message placeholder (will be updated as chunks arrive)
    const streamingMessageId = `assistant-${Date.now()}`;
    const streamingMessage: ChatMessage = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    // Add user message and streaming placeholder
    setMessages(prev => [...prev, userMessage, streamingMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Prepare request payload
      const payload = {
        message: message.trim(),
        sessionId,
        location,
        healthProfile: healthProfile || undefined,
        conversationHistory: [...messages, userMessage],
      };

      // Call streaming chat API
      const response = await fetch('/api/chat?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let airQualityData: AirQualityContext | undefined;

      // Hide loading indicator once streaming starts
      setIsLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE data lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk' && data.content) {
                accumulatedContent += data.content;
                updateStreamingMessage(streamingMessageId, accumulatedContent, airQualityData);
              } else if (data.type === 'air_quality' && data.airQualityData) {
                airQualityData = data.airQualityData;
                updateStreamingMessage(streamingMessageId, accumulatedContent, airQualityData);
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error');
              }
              // 'done' type is handled by stream ending
            } catch (parseError) {
              // Skip lines that can't be parsed (might be partial chunks)
              if (line.trim() && !line.includes('[DONE]')) {
                console.warn('Failed to parse SSE line:', line, parseError);
              }
            }
          }
        }
      }

      // Finalize the message
      setMessages(prev => {
        const newMessages = [...prev];
        const messageIndex = newMessages.findIndex(m => m.id === streamingMessageId);
        
        if (messageIndex !== -1) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: accumulatedContent || 'No response received.',
            metadata: {
              airQualityData,
            },
          };
        }
        
        return newMessages;
      });

      // Extract health profile information from AI response if detected
      if (accumulatedContent && !healthProfile) {
        const hasHealthInfo =
          accumulatedContent.toLowerCase().includes('asthma') ||
          accumulatedContent.toLowerCase().includes('copd') ||
          accumulatedContent.toLowerCase().includes('respiratory');
          
        if (hasHealthInfo) {
          const detectedProfile: HealthProfile = {
            hasRespiratoryCondition: true,
            conditions: ['User reported respiratory condition'],
            sensitivityLevel: 'sensitive',
          };
          setHealthProfile(detectedProfile);
        }
      }

    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setLastFailedMessage(message);
      
      // Update the streaming message to show error
      setMessages(prev => {
        const newMessages = [...prev];
        const messageIndex = newMessages.findIndex(m => m.id === streamingMessageId);
        
        if (messageIndex !== -1) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            id: `error-${Date.now()}`,
            content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
          };
        }
        
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [sessionId, healthProfile, messages, updateStreamingMessage]);

  const retryLastMessage = useCallback(async () => {
    if (lastFailedMessage) {
      await sendMessage(lastFailedMessage);
    }
  }, [lastFailedMessage, sendMessage]);

  const value: ChatContextType = {
    messages,
    sessionId,
    healthProfile,
    isOpen,
    isLoading,
    isStreaming,
    error,
    openChat,
    closeChat,
    sendMessage,
    updateHealthProfile,
    clearChat,
    retryLastMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;