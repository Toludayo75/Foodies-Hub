import { db } from "./drizzle";
import * as schema from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { sendNotificationToUser, sendRealtimeUpdate } from "./chat";

export interface NotificationData {
  userId: number;
  type: 'order' | 'payment' | 'delivery' | 'system';
  title: string;
  message: string;
  orderId?: number;
}

/**
 * Create a new notification and send real-time update
 */
export const createNotification = async (data: NotificationData): Promise<schema.Notification> => {
  try {
    const [notification] = await db.insert(schema.notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      orderId: data.orderId,
      isRead: false,
    }).returning();

    // Send real-time notification via WebSocket
    sendNotificationToUser(data.userId, notification);
    
    // Also send a general update to refresh notification count
    sendRealtimeUpdate(data.userId, 'notifications_updated', { 
      unreadCount: await getUnreadNotificationCount(data.userId) 
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a specific user
 */
export const getUserNotifications = async (userId: number, unreadOnly: boolean = false): Promise<schema.Notification[]> => {
  try {
    const conditions = unreadOnly 
      ? and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false))
      : eq(schema.notifications.userId, userId);

    return await db.query.notifications.findMany({
      where: conditions,
      orderBy: desc(schema.notifications.createdAt),
      limit: 50,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: number, userId: number): Promise<boolean> => {
  try {
    const result = await db.update(schema.notifications)
      .set({ isRead: true })
      .where(and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      ))
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: number): Promise<boolean> => {
  try {
    await db.update(schema.notifications)
      .set({ isRead: true })
      .where(and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      ));

    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (userId: number): Promise<number> => {
  try {
    const notifications = await db.query.notifications.findMany({
      where: and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      ),
    });

    return notifications.length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Role-based notification creators

/**
 * Notify customer about order events
 */
export const notifyCustomerOrderUpdate = async (orderId: number, status: string): Promise<void> => {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      with: {
        user: true,
      },
    });

    if (!order) return;

    let title = '';
    let message = '';

    switch (status) {
      case 'confirmed':
        title = 'Order Confirmed';
        message = `Your order #${orderId} has been confirmed and is being prepared.`;
        break;
      case 'preparing':
        title = 'Order Being Prepared';
        message = `Your order #${orderId} is being prepared by our kitchen.`;
        break;
      case 'ready':
        title = 'Order Ready';
        message = `Your order #${orderId} is ready for pickup by our rider.`;
        break;
      case 'out_for_delivery':
        title = 'Out for Delivery';
        message = `Your order #${orderId} is on its way to you!`;
        break;
      case 'delivered':
        title = 'Order Delivered';
        message = `Your order #${orderId} has been delivered successfully.`;
        break;
      default:
        title = 'Order Update';
        message = `Your order #${orderId} status has been updated.`;
    }

    await createNotification({
      userId: order.userId,
      type: 'order',
      title,
      message,
      orderId,
    });
  } catch (error) {
    console.error('Error notifying customer:', error);
  }
};

/**
 * Notify rider about new delivery assignment
 */
export const notifyRiderNewDelivery = async (riderId: number, orderId: number): Promise<void> => {
  try {
    await createNotification({
      userId: riderId,
      type: 'delivery',
      title: 'New Delivery Assignment',
      message: `You have been assigned to deliver order #${orderId}.`,
      orderId,
    });
  } catch (error) {
    console.error('Error notifying rider:', error);
  }
};

/**
 * Notify admin about new order
 */
export const notifyAdminNewOrder = async (orderId: number): Promise<void> => {
  try {
    // Get all admin users
    const admins = await db.query.users.findMany({
      where: eq(schema.users.role, 'admin'),
    });

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: 'order',
        title: 'New Order Received',
        message: `A new order #${orderId} has been placed and needs attention.`,
        orderId,
      });
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

/**
 * Notify customer about payment confirmation
 */
export const notifyPaymentConfirmation = async (userId: number, orderId: number, amount: number): Promise<void> => {
  try {
    await createNotification({
      userId,
      type: 'payment',
      title: 'Payment Confirmed',
      message: `Your payment of ₦${(amount / 100).toLocaleString()} for order #${orderId} has been confirmed.`,
      orderId,
    });
  } catch (error) {
    console.error('Error notifying payment confirmation:', error);
  }
};