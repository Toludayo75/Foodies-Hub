let socket: WebSocket | null = null;
let messageCallback: ((messages: any[]) => void) | null = null;

export function connectChat(userId: number, onMessage: (messages: any[]) => void) {
  // If already connected, disconnect first
  if (socket) {
    disconnectChat();
  }
  
  // Set up the message callback
  messageCallback = onMessage;
  
  // Create WebSocket connection
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onopen = () => {
    console.log("WebSocket connection established");
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chat' && Array.isArray(data.messages)) {
        if (messageCallback) {
          messageCallback(data.messages);
        }
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };
  
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  
  socket.onclose = () => {
    console.log("WebSocket connection closed");
  };
  
  // Return cleanup function
  return disconnectChat;
}

export function disconnectChat() {
  if (socket) {
    socket.close();
    socket = null;
  }
  
  messageCallback = null;
}

export function sendChatMessage(message: string) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'chat',
      message
    }));
  } else {
    console.error("WebSocket is not connected");
  }
}

export function isChatConnected(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}
