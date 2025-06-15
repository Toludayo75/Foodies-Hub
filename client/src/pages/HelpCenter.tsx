import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, MessageCircle, Mail, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageFeedback from "@/components/MessageFeedback";

import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

export default function HelpCenter() {
  const [, navigate] = useLocation();
  const [showFullChat, setShowFullChat] = useState(false);
  const { messages, sendMessage, loading } = useChat();
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleMessageFeedback = async (messageId: string, rating: 'helpful' | 'not_helpful') => {
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId, rating }),
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleGoBack = () => {
    navigate("/settings");
  };

  // Swipe gestures for navigation
  const { bindEvents } = useSwipeGesture({
    onSwipeRight: () => navigate("/settings"),
    threshold: 100
  });

  const handleStartChat = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setShowFullChat(true);
  };

  // Auto-scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (showFullChat && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showFullChat, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() === "") return;
    
    try {
      await sendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleReportIssue = () => {
    // Navigate to report issue page or open email client
    window.location.href = "mailto:support@foodies181758.com?subject=Policy Violation Report";
  };

  return (
    <div 
      className="mobile-page bg-gray-50 transition-all duration-300 ease-in-out"
      ref={(el) => {
        if (el) bindEvents(el);
      }}
    >
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-40">
        <button 
          onClick={handleGoBack} 
          className="mr-4 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors duration-200 active:scale-95"
        >
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">Help Center</h1>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Chat with Support */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <MessageCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium">Chat with Support</h3>
              <p className="text-sm text-gray-500">Get quick answer from our support team</p>
            </div>
          </div>
          <Button 
            onClick={handleStartChat}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 active:scale-98 shadow-lg hover:shadow-xl min-h-[48px]"
          >
            Start Chat
          </Button>
        </div>

        {/* Email Support */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Mail className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium">Email Support</h3>
              <p className="text-sm text-gray-500">We'll respond within few minutes</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block">
            <span className="text-green-700 font-medium">Support@foodies181758.com</span>
          </div>
        </div>

        {/* Phone Support */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <Phone className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium">Phone Support</h3>
              <p className="text-sm text-gray-500">Available Mon-Fri, 9AM-11PM</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block">
            <span className="text-green-700 font-medium">(+234)76487555</span>
          </div>
        </div>

        {/* Policy Violation Report */}
        <div className="mt-8">
          <p className="text-center text-sm text-gray-600 mb-4">
            If you encounter any policy violation,please report immediately.
          </p>
          <Button 
            onClick={handleReportIssue}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg font-medium transition-all duration-200 active:scale-98 shadow-lg hover:shadow-xl min-h-[48px]"
          >
            Report an issue
          </Button>
        </div>
      </div>

      {/* Full Screen Chat */}
      {showFullChat && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center p-4 bg-green-600 text-white border-b">
            <button 
              onClick={() => setShowFullChat(false)}
              className="p-2 hover:bg-green-700 rounded-full transition-colors mr-3"
              aria-label="Close chat"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h3 className="font-medium text-lg">Support Chat</h3>
              <p className="text-xs text-green-200">Online. Typically replies instantly</p>
            </div>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {messages.length === 0 && !loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-4 rounded-2xl max-w-[80%]">
                  <p className="text-sm">Hello! How can I help you with your order today?</p>
                </div>
              </div>
            )}
            
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] ${
                    msg.isFromUser ? '' : 'w-full'
                  }`}
                >
                  <div 
                    className={`p-4 rounded-2xl ${
                      msg.isFromUser 
                        ? "bg-green-600 text-white rounded-br-md" 
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  {!msg.isFromUser && (
                    <MessageFeedback 
                      messageId={msg.id} 
                      onFeedback={handleMessageFeedback}
                    />
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area - Always visible at bottom */}
          <div className="border-t bg-white p-4 pb-20">
            <form onSubmit={handleSendMessage} className="w-full">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  disabled={loading || !message.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full w-12 h-12 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}