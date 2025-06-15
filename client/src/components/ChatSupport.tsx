import { useState, useRef, useEffect } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { MessageCircle, X, Send } from "lucide-react";

export default function ChatSupport() {
  const { messages, sendMessage, isOpen, toggleChat, closeChat, loading, unreadCount, markMessagesAsSeen } = useChat();
  const { isAuthenticated, user } = useAuth();
  const [message, setMessage] = useState("");
  const [, navigate] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [messages, isOpen]);

  // Mark messages as seen when chat becomes visible
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        markMessagesAsSeen();
      }, 1000); // Mark as seen after 1 second of being open
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, markMessagesAsSeen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    if (message.trim() === "") return;
    
    try {
      await sendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Don't show chat support for admin or rider users
  if (!isAuthenticated || !user || user.role === 'admin' || user.role === 'rider') {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed z-10"
        style={{
          bottom: 'max(env(safe-area-inset-bottom, 0px) + 88px, 108px)',
          right: 'max(env(safe-area-inset-right, 0px) + 16px, 16px)'
        }}
      >
        <button 
          onClick={toggleChat} 
          className="relative w-12 h-12 bg-primary-color rounded-full flex items-center justify-center text-white shadow-lg"
          aria-label="Open chat support"
        >
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-10"
      style={{
        bottom: 'max(env(safe-area-inset-bottom, 0px) + 88px, 108px)',
        right: 'max(env(safe-area-inset-right, 0px) + 16px, 16px)'
      }}
    >
      <div className="bg-white rounded-lg shadow-lg w-72 max-h-96 flex flex-col">
        <div className="p-3 bg-primary-color text-white rounded-t-lg flex justify-between items-center">
          <div>
            <h3 className="font-medium">Support Agent</h3>
            <p className="text-xs text-green-200">Online. Typically replies instantly</p>
          </div>
          <button 
            onClick={closeChat}
            className="p-1 hover:bg-green-700 rounded-full transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto max-h-64">
          <div className="flex flex-col gap-2">
            {messages.length === 0 && !loading && (
              <div className="bg-gray-100 p-3 rounded-lg max-w-[85%] self-start">
                <p className="text-sm">Hello! How can I help you with your order today?</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-3 rounded-lg max-w-[85%] ${
                  msg.isFromUser 
                    ? "bg-primary-color text-white self-end" 
                    : "bg-gray-100 self-start"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
            
            {loading && (
              <div className="bg-gray-100 p-3 rounded-lg max-w-[85%] self-start">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <form onSubmit={handleSendMessage} className="p-3 border-t">
          <div className="flex">
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:border-primary-color"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="bg-primary-color text-white px-3 py-2 rounded-r-lg hover:bg-green-700 transition-colors"
              disabled={loading}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
