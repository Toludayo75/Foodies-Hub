import { db } from "./drizzle";
import * as schema from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { createNotification } from "./notificationService";
import { sendRealtimeUpdate } from "./chat";

interface EscalationTrigger {
  keywords: string[];
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'technical' | 'complaint' | 'refund' | 'escalation' | 'general';
}

// Define escalation triggers that identify when human support is needed
const ESCALATION_TRIGGERS: EscalationTrigger[] = [
  // Technical Issues
  {
    keywords: ['login', 'cant login', "can't login", 'password', 'account locked', 'app crash', 'payment failed', 'card declined', 'technical', 'error', 'bug', 'broken'],
    category: 'technical_issue',
    priority: 'high',
    type: 'technical'
  },
  
  // Quality Complaints requiring empathy
  {
    keywords: ['terrible', 'awful', 'disgusting', 'horrible', 'worst', 'disappointed', 'angry', 'furious', 'unacceptable', 'poor quality', 'cold food', 'wrong order'],
    category: 'quality_complaint',
    priority: 'high',
    type: 'complaint'
  },
  
  // Refund/Money Issues
  {
    keywords: ['refund', 'money back', 'charged twice', 'wrong amount', 'dispute', 'fraud', 'unauthorized', 'billing', 'overcharged'],
    category: 'payment_problem',
    priority: 'urgent',
    type: 'refund'
  },
  
  // Delivery Issues
  {
    keywords: ['never arrived', 'hours late', 'driver rude', 'spilled', 'damaged', 'missing items', 'incomplete order'],
    category: 'delivery_issue',
    priority: 'medium',
    type: 'complaint'
  },
  
  // Escalation requests
  {
    keywords: ['speak to manager', 'human agent', 'real person', 'escalate', 'supervisor', 'not satisfied', 'this is ridiculous'],
    category: 'escalation',
    priority: 'high',
    type: 'escalation'
  }
];

/**
 * Analyze message to determine if escalation to human support is needed
 */
export function shouldEscalateToHuman(message: string, conversationHistory: any[] = []): {
  shouldEscalate: boolean;
  trigger?: EscalationTrigger;
  confidence: number;
} {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Check for direct escalation triggers
  for (const trigger of ESCALATION_TRIGGERS) {
    const matchedKeywords = trigger.keywords.filter(keyword => 
      normalizedMessage.includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      const confidence = Math.min(1, matchedKeywords.length / trigger.keywords.length * 2);
      return {
        shouldEscalate: true,
        trigger,
        confidence
      };
    }
  }
  
  // Check conversation patterns that suggest frustration
  if (conversationHistory.length >= 3) {
    const recentMessages = conversationHistory.slice(-3);
    const negativePatterns = ['not working', 'still not', 'again', 'same problem', 'frustrated', 'help me'];
    
    const negativeCount = recentMessages.filter(msg => 
      negativePatterns.some(pattern => msg.content?.toLowerCase().includes(pattern))
    ).length;
    
    if (negativeCount >= 2) {
      return {
        shouldEscalate: true,
        trigger: {
          keywords: ['repeated issues'],
          category: 'escalation',
          priority: 'medium',
          type: 'escalation'
        },
        confidence: 0.7
      };
    }
  }
  
  return {
    shouldEscalate: false,
    confidence: 0
  };
}

/**
 * Create a support ticket for escalated conversations
 */
export async function createSupportTicket(
  userId: number,
  message: string,
  trigger: EscalationTrigger,
  conversationHistory: any[] = [],
  orderId?: number
): Promise<schema.SupportTicket> {
  
  // Generate subject from message or use category
  const subject = message.length > 50 
    ? message.substring(0, 47) + "..." 
    : message || `${trigger.category.replace('_', ' ')} - Customer Issue`;
  
  // Prepare chat context from recent conversation
  const chatContext = conversationHistory
    .slice(-5) // Last 5 messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n---\n');
  
  // Create support ticket
  const [ticket] = await db.insert(schema.supportTickets).values({
    userId,
    orderId,
    type: trigger.type,
    priority: trigger.priority,
    status: 'open',
    subject,
    description: message,
    category: trigger.category,
    escalatedFromChat: true,
    chatContext: chatContext || 'No previous conversation context'
  }).returning();
  
  // Create first message in ticket thread
  await db.insert(schema.supportTicketMessages).values({
    ticketId: ticket.id,
    userId,
    message: message,
    isFromStaff: false
  });
  
  // Notify user about ticket creation
  await createNotification({
    userId,
    type: 'system',
    title: 'Support Ticket Created',
    message: `Your support request has been escalated to our team. Ticket #${ticket.id}`,
    orderId
  });
  
  // Notify admins about new ticket
  await notifyAdminsAboutNewTicket(ticket);
  
  return ticket;
}

/**
 * Get support tickets for a user
 */
export async function getUserSupportTickets(userId: number): Promise<schema.SupportTicket[]> {
  return await db.query.supportTickets.findMany({
    where: eq(schema.supportTickets.userId, userId),
    orderBy: desc(schema.supportTickets.createdAt)
  });
}

/**
 * Get support ticket messages/thread
 */
export async function getSupportTicketMessages(ticketId: number): Promise<schema.SupportTicketMessage[]> {
  return await db.query.supportTicketMessages.findMany({
    where: eq(schema.supportTicketMessages.ticketId, ticketId),
    orderBy: schema.supportTicketMessages.createdAt
  });
}

/**
 * Add message to support ticket thread
 */
export async function addMessageToTicket(
  ticketId: number,
  userId: number,
  message: string,
  isFromStaff: boolean = false
): Promise<schema.SupportTicketMessage> {
  
  const [ticketMessage] = await db.insert(schema.supportTicketMessages).values({
    ticketId,
    userId,
    message,
    isFromStaff
  }).returning();
  
  // Update ticket status if customer responds
  if (!isFromStaff) {
    await db.update(schema.supportTickets)
      .set({ 
        status: 'open',
        updatedAt: new Date()
      })
      .where(eq(schema.supportTickets.id, ticketId));
  }
  
  // Send real-time update to relevant users
  if (isFromStaff) {
    // Notify customer of staff response
    const ticket = await db.query.supportTickets.findFirst({
      where: eq(schema.supportTickets.id, ticketId)
    });
    if (ticket) {
      sendRealtimeUpdate(ticket.userId, 'support_response', {
        ticketId,
        message: ticketMessage
      });
    }
  } else {
    // Notify staff of customer response
    sendRealtimeUpdate(0, 'support_update', {
      ticketId,
      message: ticketMessage
    });
  }
  
  return ticketMessage;
}

/**
 * Update support ticket status
 */
export async function updateTicketStatus(
  ticketId: number,
  status: string,
  resolutionNotes?: string,
  assignedToUserId?: number
): Promise<schema.SupportTicket | undefined> {
  
  const updateData: any = {
    status,
    updatedAt: new Date()
  };
  
  if (resolutionNotes) {
    updateData.resolutionNotes = resolutionNotes;
  }
  
  if (assignedToUserId) {
    updateData.assignedToUserId = assignedToUserId;
  }
  
  if (status === 'resolved' || status === 'closed') {
    updateData.resolvedAt = new Date();
  }
  
  const [ticket] = await db.update(schema.supportTickets)
    .set(updateData)
    .where(eq(schema.supportTickets.id, ticketId))
    .returning();
  
  if (ticket && (status === 'resolved' || status === 'closed')) {
    // Notify customer of resolution
    await createNotification({
      userId: ticket.userId,
      type: 'system',
      title: 'Support Ticket Updated',
      message: `Your support ticket #${ticketId} has been ${status}`,
      orderId: ticket.orderId || undefined
    });
  }
  
  return ticket;
}

/**
 * Get all open support tickets for admin dashboard
 */
export async function getAllOpenTickets(): Promise<schema.SupportTicket[]> {
  return await db.query.supportTickets.findMany({
    where: eq(schema.supportTickets.status, 'open'),
    orderBy: [
      desc(schema.supportTickets.priority),
      desc(schema.supportTickets.createdAt)
    ]
  });
}

/**
 * Notify admins about new support ticket
 */
async function notifyAdminsAboutNewTicket(ticket: schema.SupportTicket): Promise<void> {
  // Get all admin users
  const admins = await db.query.users.findMany({
    where: eq(schema.users.role, 'admin')
  });
  
  // Notify each admin
  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      type: 'system',
      title: 'New Support Ticket',
      message: `New ${ticket.priority} priority ticket #${ticket.id}: ${ticket.subject}`,
      orderId: ticket.orderId || undefined
    });
    
    // Send real-time notification
    sendRealtimeUpdate(admin.id, 'new_support_ticket', {
      ticket,
      priority: ticket.priority
    });
  }
}

/**
 * Generate escalation response for chat
 */
export function generateEscalationResponse(trigger: EscalationTrigger, ticketId: number): string {
  const responses = {
    technical_issue: `I understand you're experiencing technical difficulties. I've created support ticket #${ticketId} and escalated this to our technical team who can provide specialized assistance. They'll contact you shortly to resolve this issue.`,
    
    quality_complaint: `I sincerely apologize for this disappointing experience. Your feedback is very important to us, and I've escalated this to our customer care team as ticket #${ticketId}. A manager will personally review your case and ensure we make this right.`,
    
    payment_problem: `I understand your concern about payment issues. For your security and to resolve this properly, I've created urgent ticket #${ticketId} for our billing specialists. They have the tools to investigate and resolve payment matters safely.`,
    
    delivery_issue: `I'm sorry about the delivery problems you've experienced. I've escalated this as ticket #${ticketId} to our operations team who will investigate and take appropriate action to prevent future occurrences.`,
    
    escalation: `I've escalated your request to a senior support specialist as ticket #${ticketId}. A human agent will reach out to you directly to provide the personalized assistance you need.`
  };
  
  return responses[trigger.category as keyof typeof responses] || 
         `I've created support ticket #${ticketId} and escalated your inquiry to our specialized team for immediate attention.`;
}