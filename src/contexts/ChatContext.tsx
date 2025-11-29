import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChatMessage, HealthProfile, AirQualityContext, ChatResponse } from '@/types/chat';

interface ChatContextType {
  messages: ChatMessage[];
  sessionId: string;
  healthProfile: HealthProfile | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (message: string, location?: { lat: number; lng: number }) => Promise<void>;
  updateHealthProfile: (profile: HealthProfile) => void;
  clearChat: () => void;
  retryLastMessage: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Clear old messages from localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith('air-quality-chat-message-'))
      .forEach(key => localStorage.removeItem(key));
    
    // Save current messages (limit to MAX_MESSAGES)
    const messagesToSave = messages.slice(-MAX_MESSAGES);
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

    // Add messages to state
    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    try {
      // Prepare request payload
      const payload = {
        message: message.trim(),
        sessionId,
        location,
        healthProfile: healthProfile || undefined,
        conversationHistory: [...messages, userMessage], // Don't include thinking message
      };

      // Call chat API
      const response = await fetch('/api/chat', {
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

      const data: ChatResponse = await response.json();
      
      // Log the received data
      console.log('[DEBUG] Received response from API:', data);
      console.log('[DEBUG] Main message content:', data.message.content);

      // Replace thinking message with actual response
      setMessages(prev => {
        const newMessages = [...prev];
        const thinkingIndex = newMessages.findIndex(m => m.id === thinkingMessage.id);
        
        if (thinkingIndex !== -1) {
          newMessages[thinkingIndex] = {
            ...data.message,
            metadata: {
              ...data.message.metadata,
              airQualityData: data.airQualityData,
            },
          };
        }
        
        // NOTE: Suggestions are no longer displayed as separate messages
        // They were causing formatting issues with malformed markdown from AI responses
        // The main AI response should contain all necessary information
        
        return newMessages;
      });

      // Extract health profile information from AI response if detected
      if (data.message.content && !healthProfile) {
        const hasHealthInfo = 
          data.message.content.toLowerCase().includes('asthma') ||
          data.message.content.toLowerCase().includes('copd') ||
          data.message.content.toLowerCase().includes('respiratory');
          
        if (hasHealthInfo) {
          // Simple detection - could be enhanced with more sophisticated parsing
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
      
      // Remove thinking message and add error message
      setMessages(prev => {
        const newMessages = prev.filter(m => m.id !== thinkingMessage.id);
        return [
          ...newMessages,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, healthProfile, messages]);

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