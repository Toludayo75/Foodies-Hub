import { Router, Request, Response } from "express";
import * as notificationService from "./notificationService";

export const notificationRouter = Router();

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

/**
 * Get notifications for the authenticated user
 */
notificationRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await notificationService.getUserNotifications(userId as number, unreadOnly);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

/**
 * Get unread notification count
 */
notificationRouter.get('/count', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const count = await notificationService.getUnreadNotificationCount(userId as number);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ message: "Error fetching notification count" });
  }
});

/**
 * Mark a specific notification as read
 */
notificationRouter.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    
    const success = await notificationService.markNotificationAsRead(notificationId, userId as number);
    
    if (success) {
      res.json({ message: "Notification marked as read" });
    } else {
      res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: "Error marking notification as read" });
  }
});

/**
 * Mark all notifications as read for the user
 */
notificationRouter.patch('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const success = await notificationService.markAllNotificationsAsRead(userId as number);
    
    if (success) {
      res.json({ message: "All notifications marked as read" });
    } else {
      res.status(500).json({ message: "Error marking notifications as read" });
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: "Error marking notifications as read" });
  }
});