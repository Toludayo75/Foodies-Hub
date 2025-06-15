import { Router, Request, Response } from "express";
import { 
  getUserSupportTickets, 
  getSupportTicketMessages, 
  addMessageToTicket, 
  updateTicketStatus,
  getAllOpenTickets
} from "./escalationService";
import { getUserRole } from "./adminService";

export const supportRouter = Router();

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check admin/staff role
const requireStaff = async (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userRole = await getUserRole(req.session.userId);
  if (userRole !== 'admin') {
    return res.status(403).json({ message: "Staff access required" });
  }
  
  next();
};

/**
 * Get user's support tickets
 */
supportRouter.get('/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.userId as number;
    const tickets = await getUserSupportTickets(userId);
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching user support tickets:", error);
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

/**
 * Get messages for a specific support ticket
 */
supportRouter.get('/tickets/:ticketId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const userId = req.session!.userId as number;
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    // Get ticket to verify ownership or staff access
    const userRole = await getUserRole(userId);
    if (userRole !== 'admin') {
      // For customers, verify they own the ticket
      const userTickets = await getUserSupportTickets(userId);
      const ticketExists = userTickets.some(ticket => ticket.id === ticketId);
      
      if (!ticketExists) {
        return res.status(403).json({ message: "Access denied to this ticket" });
      }
    }
    
    const messages = await getSupportTicketMessages(ticketId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching ticket messages:", error);
    res.status(500).json({ message: "Failed to fetch ticket messages" });
  }
});

/**
 * Add message to support ticket
 */
supportRouter.post('/tickets/:ticketId/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const userId = req.session!.userId as number;
    const { message } = req.body;
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }
    
    // Check if user is staff or ticket owner
    const userRole = await getUserRole(userId);
    const isFromStaff = userRole === 'admin';
    
    if (!isFromStaff) {
      // For customers, verify they own the ticket
      const userTickets = await getUserSupportTickets(userId);
      const ticketExists = userTickets.some(ticket => ticket.id === ticketId);
      
      if (!ticketExists) {
        return res.status(403).json({ message: "Access denied to this ticket" });
      }
    }
    
    const ticketMessage = await addMessageToTicket(ticketId, userId, message.trim(), isFromStaff);
    res.json(ticketMessage);
  } catch (error) {
    console.error("Error adding message to ticket:", error);
    res.status(500).json({ message: "Failed to add message to ticket" });
  }
});

/**
 * Update support ticket status (Admin only)
 */
supportRouter.patch('/tickets/:ticketId/status', requireStaff, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { status, resolutionNotes, assignedToUserId } = req.body;
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ message: "Status is required" });
    }
    
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    const ticket = await updateTicketStatus(
      ticketId, 
      status, 
      resolutionNotes, 
      assignedToUserId
    );
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({ message: "Failed to update ticket status" });
  }
});

/**
 * Get all open support tickets (Admin only)
 */
supportRouter.get('/admin/tickets', requireStaff, async (req: Request, res: Response) => {
  try {
    const tickets = await getAllOpenTickets();
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching all support tickets:", error);
    res.status(500).json({ message: "Failed to fetch support tickets" });
  }
});

/**
 * Assign ticket to staff member (Admin only)
 */
supportRouter.patch('/tickets/:ticketId/assign', requireStaff, async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { assignedToUserId } = req.body;
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    if (!assignedToUserId || isNaN(parseInt(assignedToUserId))) {
      return res.status(400).json({ message: "Valid assigned user ID is required" });
    }
    
    const ticket = await updateTicketStatus(
      ticketId, 
      'in_progress', 
      undefined, 
      parseInt(assignedToUserId)
    );
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({ message: "Failed to assign ticket" });
  }
});