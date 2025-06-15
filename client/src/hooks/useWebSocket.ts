import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: 'cart_updated' | 'payment_success' | 'order_update' | 'notification';
  message: string;
  orderId?: number;
  data?: any;
}

export function useWebSocket(userId?: number) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      try {
        const wsUrl = `ws://${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
          
          // Send user ID to identify connection
          ws.send(JSON.stringify({ type: 'identify', userId }));
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected, attempting to reconnect...');
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
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

    const handleWebSocketMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'cart_updated':
          // Refresh cart data
          queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          toast({
            title: "Cart Updated",
            description: "Your cart has been updated"
          });
          break;

        case 'payment_success':
          // Clear cart and show success message
          queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          toast({
            title: "Payment Successful!",
            description: message.message
          });
          break;

        case 'order_update':
          // Refresh orders
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          toast({
            title: "Order Update",
            description: message.message
          });
          break;

        case 'notification':
          toast({
            title: "Notification",
            description: message.message
          });
          break;

        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId, toast, queryClient]);

  return { isConnected };
}