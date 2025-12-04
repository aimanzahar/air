'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, HealthProfile, AirQualityContext } from '@/types/chat';
import { useChat } from '@/contexts/ChatContext';
import './ChatWidget.css';

// StreamingText component for typewriter animation effect
interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

const StreamingText: React.FC<StreamingTextProps> = ({ content, isStreaming }) => {
  // Track the previously rendered content length
  const previousLengthRef = useRef<number>(0);
  // Track animated segments with unique keys
  const [segments, setSegments] = useState<Array<{ text: string; key: string; isNew: boolean; index?: number }>>([]);
  
  useEffect(() => {
    if (!isStreaming) {
      // When streaming ends, reset and show all content as static
      previousLengthRef.current = 0;
      setSegments([{ text: content, key: 'final', isNew: false }]);
      return;
    }
    
    const prevLength = previousLengthRef.current;
    const currentLength = content.length;
    
    if (currentLength > prevLength) {
      // New content has arrived
      const staticPart = content.slice(0, prevLength);
      const newPart = content.slice(prevLength);
      
      // Create new segments - static part without animation, new part with animation
      const newSegments: Array<{ text: string; key: string; isNew: boolean; index?: number }> = [];
      
      if (staticPart) {
        newSegments.push({ text: staticPart, key: 'static', isNew: false });
      }
      
      if (newPart) {
        // Split new content by words/chunks for smoother animation
        const words = newPart.split(/(\s+)/);
        words.forEach((word, idx) => {
          if (word) {
            newSegments.push({
              text: word,
              key: `new-${prevLength}-${idx}-${Date.now()}`,
              isNew: true,
              index: idx,
            });
          }
        });
      }
      
      setSegments(newSegments);
      previousLengthRef.current = currentLength;
    }
  }, [content, isStreaming]);
  
  // Reset when content is cleared
  useEffect(() => {
    if (!content) {
      previousLengthRef.current = 0;
      setSegments([]);
    }
  }, [content]);
  
  // Render with ReactMarkdown for the final static content, or animated spans during streaming
  if (!isStreaming || segments.length === 0) {
    return (
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="markdown-paragraph">{children}</p>,
          strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
          em: ({ children }) => <em className="markdown-em">{children}</em>,
          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
          li: ({ children }) => <li className="markdown-li">{children}</li>,
          h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
          h5: ({ children }) => <h5 className="markdown-h5">{children}</h5>,
          h6: ({ children }) => <h6 className="markdown-h6">{children}</h6>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ?
              <code className="markdown-code-inline">{children}</code> :
              <code className="markdown-code-block">{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }
  
  // During streaming, render segments with animation
  return (
    <div className="streaming-content">
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={segment.isNew ? 'typewriter-word' : 'typewriter-static'}
          style={segment.isNew && segment.index !== undefined ? { animationDelay: `${segment.index * 50}ms` } : undefined}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
};

interface LocationState {
  lat: number;
  lng: number;
  name?: string;
  error?: string;
  loading: boolean;
}

interface WidgetDimensions {
  width: number;
  height: number;
}

const ChatWidget: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [location, setLocation] = useState<LocationState>({
    lat: 3.1390, // Default: Kuala Lumpur
    lng: 101.6869,
    name: 'Kuala Lumpur',
    loading: false,
  });
  const [hasAskedAboutHealth, setHasAskedAboutHealth] = useState(() => {
    // Check localStorage on init to see if user already answered
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('air-quality-chat-health-asked');
      return stored === 'true';
    }
    return false;
  });
  const [widgetDimensions, setWidgetDimensions] = useState<WidgetDimensions>({
    width: 360,
    height: 520,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatWidgetRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isOpen,
    isLoading,
    isStreaming,
    error,
    openChat,
    closeChat,
    sendMessage,
    updateHealthProfile,
    clearChat,
    healthProfile,
  } = useChat();

  // Load saved dimensions from localStorage on mount
  useEffect(() => {
    if (isMounted) {
      const savedDimensions = localStorage.getItem('chat-widget-dimensions');
      if (savedDimensions) {
        try {
          const dimensions = JSON.parse(savedDimensions);
          setWidgetDimensions({
            width: Math.max(320, Math.min(600, dimensions.width || 360)),
            height: Math.max(400, Math.min(800, dimensions.height || 520)),
          });
        } catch (error) {
          console.error('Failed to parse saved dimensions:', error);
        }
      }
    }
  }, [isMounted]);

  // Save dimensions to localStorage when they change
  useEffect(() => {
    if (isMounted && !isResizing) {
      localStorage.setItem(
        'chat-widget-dimensions',
        JSON.stringify({
          width: widgetDimensions.width,
          height: widgetDimensions.height,
        })
      );
    }
  }, [widgetDimensions, isMounted, isResizing]);

  // Prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Check if health profile already exists (user answered before)
    if (healthProfile !== null) {
      setHasAskedAboutHealth(true);
      localStorage.setItem('air-quality-chat-health-asked', 'true');
    }
  }, [healthProfile]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive or content is streaming
    scrollToBottom();
  }, [messages, isStreaming]);

  // Scroll more frequently during streaming
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        scrollToBottom();
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  useEffect(() => {
    // Get user location on mount (only on client)
    if (isMounted) {
      getUserLocation();
    }
  }, [isMounted]);

  useEffect(() => {
    // Focus input when chat opens
    if (isOpen && inputRef.current && isMounted) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMounted]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: undefined }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Get location name using reverse geocoding (optional enhancement)
        const locationName = await getLocationName(latitude, longitude);
        
        setLocation({
          lat: latitude,
          lng: longitude,
          name: locationName || 'Your Location',
          loading: false,
        });
      },
      (error) => {
        // Improve error handling with meaningful messages
        let errorMessage = 'Unable to get your location. Using default location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Using default location.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Using default location.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Using default location.';
            break;
          default:
            errorMessage = `Location error: ${error.message || 'Unknown error'}. Using default location.`;
            break;
        }
        
        console.error('Error getting location:', error.message || error);
        setLocation(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    );
  }, []);

  const getLocationName = async (lat: number, lng: number): Promise<string | null> => {
    try {
      // Using Nominatim reverse geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        {
          headers: {
            'User-Agent': 'AirQualityChat/1.0',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.address?.city || data.address?.town || data.address?.county || data.address?.state || null;
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
    return null;
  };

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isLoading) return;

    // Clear input
    setInputMessage('');

    // Use ChatContext's sendMessage function
    await sendMessage(trimmedMessage, { lat: location.lat, lng: location.lng });
  }, [inputMessage, isLoading, sendMessage, location]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    closeChat();
  };

  const handleResetChat = () => {
    // Show confirmation dialog
    const shouldReset = window.confirm('Are you sure you want to reset the chat? This will clear all messages.');
    if (shouldReset) {
      clearChat();
      setHasAskedAboutHealth(false);
    }
  };

  const formatMessage = (message: string, isAssistant: boolean = false) => {
    // Use ReactMarkdown for assistant messages to render markdown
    if (isAssistant) {
      return (
        <ReactMarkdown
          components={{
            // Customize paragraph rendering to avoid extra margins
            p: ({ children }) => <p className="markdown-paragraph">{children}</p>,
            // Customize strong/bold text
            strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
            // Customize emphasis/italic text
            em: ({ children }) => <em className="markdown-em">{children}</em>,
            // Customize lists
            ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
            ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
            li: ({ children }) => <li className="markdown-li">{children}</li>,
            // Customize headers if used
            h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
            h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
            h5: ({ children }) => <h5 className="markdown-h5">{children}</h5>,
            h6: ({ children }) => <h6 className="markdown-h6">{children}</h6>,
            // Customize code blocks
            code: ({ children, className }) => {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !className;
              return isInline ?
                <code className="markdown-code-inline">{children}</code> :
                <code className="markdown-code-block">{children}</code>;
            },
          }}
        >
          {message}
        </ReactMarkdown>
      );
    }
    
    // For user messages, keep the simple formatting
    return message
      .split('\n')
      .map((line, i) => {
        return (
          <p key={i}>{line}</p>
        );
      });
  };

  const formatTime = (timestamp: Date | string): string => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const rect = chatWidgetRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    }
  };

  const handleResize = useCallback((e: globalThis.MouseEvent) => {
    if (!isResizing) return;

    const deltaX = resizeStart.x - e.clientX;
    const deltaY = resizeStart.y - e.clientY;

    const newWidth = Math.min(
      Math.max(320, resizeStart.width + deltaX),
      Math.min(600, window.innerWidth - 48)
    );
    
    const newHeight = Math.min(
      Math.max(400, resizeStart.height + deltaY),
      Math.min(800, window.innerHeight - 120)
    );

    setWidgetDimensions({
      width: newWidth,
      height: newHeight,
    });
  }, [isResizing, resizeStart]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  const renderHealthPrompt = () => {
    // Don't show if already answered or health profile exists
    if (hasAskedAboutHealth || healthProfile !== null || messages.length > 5) return null;
    
    return (
      <div className="health-prompt">
        <p>Do you have any respiratory conditions (e.g., asthma, COPD) that I should consider when giving air quality advice?</p>
        <div className="health-buttons">
          <button 
            onClick={() => {
              updateHealthProfile({
                hasRespiratoryCondition: true,
                conditions: ['asthma'],
                sensitivityLevel: 'sensitive',
              });
              setHasAskedAboutHealth(true);
              localStorage.setItem('air-quality-chat-health-asked', 'true');
            }}
            className="health-button"
          >
            Yes
          </button>
          <button 
            onClick={() => {
              updateHealthProfile({
                hasRespiratoryCondition: false,
                conditions: [],
                sensitivityLevel: 'normal',
              });
              setHasAskedAboutHealth(true);
              localStorage.setItem('air-quality-chat-health-asked', 'true');
            }}
            className="health-button"
          >
            No
          </button>
        </div>
      </div>
    );
  };

  const renderAirQualityBadge = (airQuality?: AirQualityContext) => {
    if (!airQuality) return null;
    
    const getAQIColor = (aqi: number) => {
      if (aqi >= 75) return 'good';
      if (aqi >= 45) return 'moderate';
      return 'poor';
    };

    const colorClass = getAQIColor(airQuality.aqi);
    
    return (
      <div className={`air-quality-badge ${colorClass}`}>
        <span className="aqi-value">{airQuality.aqi}</span>
        <span className="aqi-label">{airQuality.riskLevel}</span>
      </div>
    );
  };

  // Don't render until mounted on client
  if (!isMounted) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="chat-widget">
        <button
          className="chat-fab"
          onClick={openChat}
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`chat-widget ${isResizing ? 'resizing' : ''}`} ref={chatWidgetRef}>
      <div
        className="chat-panel"
        style={{
          width: `${widgetDimensions.width}px`,
          height: `${widgetDimensions.height}px`,
          maxWidth: `calc(100vw - 48px)`,
          maxHeight: `calc(100vh - 120px)`,
        }}
      >
        <div className="resize-handle" onMouseDown={handleResizeStart} />
        <div className="chat-header">
          <div className="header-content">
            <div className="header-title">
              <div className="bot-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2>Air Quality Assistant</h2>
            </div>
            {location.name && (
              <div className="location-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{location.name}</span>
              </div>
            )}
          </div>
          <div className="header-actions">
            <button className="reset-button" onClick={handleResetChat} aria-label="Reset chat" title="Reset Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="close-button" onClick={handleClose} aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-content">
                <div className="welcome-avatar">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Hello! I&apos;m your Air Quality Assistant</h3>
                <p>I can help you:</p>
                <ul>
                  <li>Check current air quality at your location</li>
                  <li>Recommend safe routes and activities</li>
                  <li>Provide personalized advice based on health conditions</li>
                </ul>
                <p>Ask me anything about air quality!</p>
              </div>
            </div>
          )}
          
          {messages
            .filter(message => message.content !== '...' && !message.id.includes('thinking'))
            .map((message, index) => {
              // Check if this is the last message and it's currently streaming
              const isLastMessage = index === messages.filter(m => m.content !== '...' && !m.id.includes('thinking')).length - 1;
              const isCurrentlyStreaming = isStreaming && isLastMessage && message.role === 'assistant';
              
              return (
                <div key={message.id} className={`message ${message.role} ${isCurrentlyStreaming ? 'streaming' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="message-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <div className="message-bubble">
                    <div className="message-content">
                        {message.role === 'assistant' ? (
                          isCurrentlyStreaming ? (
                            <>
                              <StreamingText content={message.content} isStreaming={true} />
                              <span className="streaming-cursor">▊</span>
                            </>
                          ) : (
                            <StreamingText content={message.content} isStreaming={false} />
                          )
                        ) : (
                          formatMessage(message.content, false)
                        )}
                      </div>
                    {message.metadata?.airQualityData && renderAirQualityBadge(message.metadata.airQualityData)}
                    {!isCurrentlyStreaming && (
                      <div className="message-timestamp">
                        {formatTime(message.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          
          {renderHealthPrompt()}
          
          {isLoading && !isStreaming && (
            <div className="message assistant">
              <div className="message-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          {location.error && (
            <div className="location-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {location.error}
              <button onClick={getUserLocation} className="retry-button">
                Retry
              </button>
            </div>
          )}
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about air quality..."
              rows={1}
              disabled={isLoading}
              className="message-input"
            />
            <button 
              className="send-button" 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              aria-label="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;