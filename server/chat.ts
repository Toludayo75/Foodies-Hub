import { Express } from 'express';
import { Server, createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleChatMessage } from './chatService';

// Store active connections by userId
const clients: Map<number, WebSocket> = new Map();

export function startWebSocketServer(app: Express): Server {
  const server = createServer(app);
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');
    let userId: number | null = null;

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message
        if (data.type === 'auth') {
          userId = parseInt(data.userId);
          clients.set(userId, ws);
          console.log(`User ${userId} authenticated on WebSocket`);
          ws.send(JSON.stringify({ type: 'auth_success' }));
          return;
        }
        
        // Handle chat message
        if (data.type === 'message' && userId) {
          console.log(`Received message from user ${userId}: ${data.content}`);
          
          // Import required dependencies
          const { db } = await import('./drizzle');
          const schemaModule = await import('../shared/schema');
          
          // Save user message to database
          const userMessageData = schemaModule.insertMessageSchema.parse({
            content: data.content,
            userId,
            isFromUser: true
          });
          await db.insert(schemaModule.messages).values(userMessageData);
          
          // Process message with AI
          const aiResponse = await handleChatMessage(userId, data.content);
          
          // Save AI response to database
          const aiMessageData = schemaModule.insertMessageSchema.parse({
            content: aiResponse,
            userId,
            isFromUser: false
          });
          await db.insert(schemaModule.messages).values(aiMessageData);
          
          // Send response back to client
          ws.send(JSON.stringify({
            type: 'message',
            content: aiResponse,
            isFromUser: false,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Error processing message' 
        }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });

  return server;
}

// Function to send message to a specific user
export function sendMessageToUser(userId: number, message: string): boolean {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: 'message',
      text: message,
      fromBot: true,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}

// Function to send real-time updates to a specific user
export function sendRealtimeUpdate(userId: number, updateType: string, data: any): boolean {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: 'realtime_update',
      updateType,
      data,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}

// Function to broadcast updates to all connected users with a specific role
export function broadcastToRole(role: string, updateType: string, data: any): void {
  // This would require role information in the WebSocket connection
  // For now, we'll send to all connected clients
  clients.forEach((client, userId) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'realtime_update',
        updateType,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

// Function to send notification to a specific user via WebSocket
export function sendNotificationToUser(userId: number, notification: any): boolean {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  return false;
}