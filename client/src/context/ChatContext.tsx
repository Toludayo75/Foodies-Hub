import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

interface Message {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  isOpen: boolean;
  toggleChat: () => void;
  closeChat: () => void;
  loading: boolean;
  unreadCount: number;
  markMessagesAsSeen: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only close chat when user logs out, but preserve message history
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsOpen(false);
      // Don't clear messages or messagesLoaded - let them persist
    }
  }, [isAuthenticated, user]);

  // Load previous messages when user is authenticated or when chat is opened
  useEffect(() => {
    if (isAuthenticated && user && (!messagesLoaded || isOpen)) {
      loadChatHistory();
    }
  }, [isAuthenticated, user, messagesLoaded, isOpen]);

  // Load last seen timestamp from localStorage
  useEffect(() => {
    if (isAuthenticated && user) {
      const stored = localStorage.getItem(`chat_last_seen_${user.id}`);
      if (stored) {
        setLastSeenTimestamp(new Date(stored));
      }
    }
  }, [isAuthenticated, user]);

  // Calculate unread count when messages or last seen timestamp changes
  useEffect(() => {
    if (lastSeenTimestamp && messages.length > 0) {
      const unread = messages.filter(msg => 
        !msg.isFromUser && msg.timestamp > lastSeenTimestamp
      ).length;
      setUnreadCount(unread);
    } else if (!lastSeenTimestamp && messages.length > 0) {
      // If no last seen timestamp, count all bot messages
      const unread = messages.filter(msg => !msg.isFromUser).length;
      setUnreadCount(unread);
    } else {
      setUnreadCount(0);
    }
  }, [messages, lastSeenTimestamp]);

  const loadChatHistory = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/chat/messages?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const chatMessages = await response.json();
        const formattedMessages: Message[] = chatMessages.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.content,
          isFromUser: msg.isFromUser,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(formattedMessages);
        setMessagesLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessagesLoaded(true); // Set to true even on error to prevent infinite loading
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          // Authenticate
          wsRef.current?.send(JSON.stringify({
            type: 'auth',
            userId: user.id
          }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'message') {
              const botMessage: Message = {
                id: Date.now().toString(),
                content: data.content,
                isFromUser: false,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, botMessage]);
              setLoading(false);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected - using HTTP fallback');
          wsRef.current = null;
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          wsRef.current = null;
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, user]);

  const sendMessage = async (content: string) => {
    if (!user) return;

    // Add user message to the list
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isFromUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Try WebSocket first
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'message',
          content
        }));
      } else {
        // Fallback to HTTP API - use /api/chat/messages for AI responses
        console.log('WebSocket not available, using HTTP API');
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        
        // The API returns { response: "AI response text" }
        if (data.response) {
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: data.response,
            isFromUser: false,
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, botMessage]);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setLoading(false);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting. Please try again.",
        isFromUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const markMessagesAsSeen = () => {
    if (isAuthenticated && user) {
      const now = new Date();
      setLastSeenTimestamp(now);
      localStorage.setItem(`chat_last_seen_${user.id}`, now.toISOString());
      setUnreadCount(0);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    // Mark messages as seen when opening chat
    if (!isOpen) {
      markMessagesAsSeen();
    }
  };

  const closeChat = () => setIsOpen(false);

  return (
    <ChatContext.Provider value={{
      messages,
      sendMessage,
      isOpen,
      toggleChat,
      closeChat,
      loading,
      unreadCount,
      markMessagesAsSeen,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}