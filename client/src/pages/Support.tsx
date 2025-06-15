import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageCircle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface SupportTicket {
  id: number;
  type: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  category: string;
  escalatedFromChat: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface TicketMessage {
  id: number;
  ticketId: number;
  message: string;
  isFromStaff: boolean;
  createdAt: string;
}

export default function Support() {
  const [, navigate] = useLocation();
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  // Fetch user's support tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/support/tickets'],
    enabled: true
  });

  // Fetch messages for selected ticket
  const { data: messages = [], isLoading: messagesLoading } = useQuery<TicketMessage[]>({
    queryKey: ['/api/support/tickets', selectedTicket, 'messages'],
    enabled: !!selectedTicket
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number; message: string }) => {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets', selectedTicket, 'messages'] });
      setNewMessage("");
    }
  });

  const handleSendMessage = () => {
    if (!selectedTicket || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      ticketId: selectedTicket,
      message: newMessage.trim()
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'open':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (selectedTicket) {
    const ticket = tickets.find(t => t.id === selectedTicket);
    
    return (
      <div className="container-app">
        <div className="screen-header-with-back">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTicket(null)}
            className="mr-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            <h1 className="screen-title">Support Ticket #{selectedTicket}</h1>
            {ticket && (
              <p className="text-sm text-gray-600 mt-1">{ticket.subject}</p>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {ticket && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(ticket.status)}
                    <span className="font-medium capitalize">{ticket.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPriorityColor(ticket.priority)} text-white`}>
                      {ticket.priority}
                    </Badge>
                    {ticket.escalatedFromChat && (
                      <Badge variant="outline">Escalated from Chat</Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Created: {new Date(ticket.createdAt).toLocaleDateString()}
                  {ticket.resolvedAt && (
                    <span className="ml-4">
                      Resolved: {new Date(ticket.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Messages */}
          <div className="space-y-3">
            {messagesLoading ? (
              <div className="text-center py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No messages yet</div>
            ) : (
              messages.map((message) => (
                <Card key={message.id} className={message.isFromStaff ? "bg-blue-50 border-blue-200" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm">
                        {message.isFromStaff ? "Support Agent" : "You"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{message.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Reply form */}
          {ticket && (ticket.status === 'open' || ticket.status === 'in_progress') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send Reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="w-full"
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container-app">
      <div className="screen-header-with-back">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/home")}
          className="mr-2"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="screen-title">Support Tickets</h1>
      </div>

      <div className="p-4">
        {ticketsLoading ? (
          <div className="text-center py-8">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Support Tickets</h3>
              <p className="text-gray-600 mb-4">
                You don't have any support tickets yet. If you need help, try chatting with our AI assistant first.
              </p>
              <Button onClick={() => navigate("/home")}>
                Go to Chat
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Your Support Requests</h2>
              <p className="text-sm text-gray-600">
                These tickets were created when our AI assistant escalated your inquiries to human support.
              </p>
            </div>
            
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTicket(ticket.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-1">#{ticket.id} - {ticket.subject}</h3>
                      <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${getPriorityColor(ticket.priority)} text-white`}>
                        {ticket.priority}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(ticket.status)}
                        <span className="text-sm capitalize">{ticket.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Category: {ticket.category.replace('_', ' ')}</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {ticket.escalatedFromChat && (
                    <Badge variant="outline" className="mt-2">
                      Escalated from AI Chat
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}