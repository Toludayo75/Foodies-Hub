import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = () => {
    if (!user?.id) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        
        // Authenticate with the server
        ws.send(JSON.stringify({
          type: 'auth',
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          switch (data.type) {
            case 'auth_success':
              console.log('WebSocket authentication successful');
              break;
              
            case 'notification':
              // Handle new notification
              handleNotification(data.data);
              break;
              
            case 'realtime_update':
              // Handle real-time data updates
              handleRealtimeUpdate(data.updateType, data.data);
              break;
              
            case 'message':
              // Handle chat messages (existing functionality)
              break;
              
            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (user?.id && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const handleNotification = (notification: any) => {
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
    });
    
    // Invalidate notifications cache to refresh the notification list
    queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
  };

  const handleRealtimeUpdate = (updateType: string, data: any) => {
    console.log(`Real-time update: ${updateType}`, data);
    
    switch (updateType) {
      case 'cart_cleared':
        // Invalidate cart queries
        queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
        toast({
          title: "Cart Updated",
          description: "Your cart has been cleared after successful payment.",
        });
        break;
        
      case 'order_created':
        // Invalidate orders queries
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        if (data.orderId) {
          queryClient.invalidateQueries({ queryKey: ['/api/orders', data.orderId] });
        }
        break;
        
      case 'payment_completed':
        // Invalidate payment-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        toast({
          title: "Payment Successful",
          description: "Your order has been confirmed and is being prepared.",
        });
        break;
        
      case 'order_status_updated':
        // Invalidate order queries
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        if (data.orderId) {
          queryClient.invalidateQueries({ queryKey: ['/api/orders', data.orderId] });
        }
        break;
        
      case 'notifications_updated':
        // Refresh notification data
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
        break;
        
      case 'rider_assigned':
        // Update order data
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        if (data.orderId) {
          queryClient.invalidateQueries({ queryKey: ['/api/orders', data.orderId] });
        }
        break;
        
      default:
        console.log('Unhandled update type:', updateType);
    }
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};