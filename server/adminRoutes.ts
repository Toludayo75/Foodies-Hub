import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as adminService from './adminService';
import { storage } from './storage';

const adminRouter = Router();

// Middleware to check if user is an admin
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Get the user and check if they have admin role
  adminService.getUserRole(userId)
    .then(role => {
      if (role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      next();
    })
    .catch(err => {
      console.error('Error checking admin role:', err);
      res.status(500).json({ message: "Internal server error" });
    });
};

// Apply admin auth middleware to all routes
adminRouter.use(requireAdmin);

// Get all orders with optional status filter
adminRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const orders = await adminService.getAllOrders(status);
    res.json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// Get detailed information for a specific order
adminRouter.get('/orders/:id/details', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    
    console.log(`Fetching order details for order ID: ${orderId}`);
    
    // Get order details
    const order = await adminService.getOrder(orderId);
    if (!order) {
      console.log(`Order ${orderId} not found`);
      return res.status(404).json({ message: "Order not found" });
    }
    
    console.log(`Found order: ${JSON.stringify(order)}`);
    
    // Get customer info
    const customer = await adminService.getUser(order.userId);
    console.log(`Customer data: ${customer ? 'found' : 'not found'}`);
    
    // Get address
    const address = await adminService.getAddress(order.addressId);
    console.log(`Address data: ${address ? 'found' : 'not found'}`);
    
    // Get order items
    const items = await adminService.getOrderItems(orderId);
    console.log(`Order items: ${items.length} items found`);
    
    const response = {
      order,
      customer: customer ? {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      } : null,
      address: address ? {
        id: address.id,
        address: address.address
      } : null,
      items
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting order details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: "Error fetching order details", error: errorMessage });
  }
});

// Get available riders
adminRouter.get('/riders', async (_req: Request, res: Response) => {
  try {
    const riders = await adminService.getAvailableRiders();
    res.json(riders);
  } catch (error) {
    console.error('Error getting riders:', error);
    res.status(500).json({ message: "Error fetching riders" });
  }
});

// Add new rider
adminRouter.post('/riders', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "First name, last name, email, and password are required" });
    }
    
    // Create the rider user
    const riderData = {
      firstName,
      lastName,
      email,
      phone: phone || null,
      password,
      role: 'rider'
    };
    
    const newRider = await storage.createUser(riderData);
    
    res.status(201).json({
      id: newRider.id,
      firstName: newRider.firstName,
      lastName: newRider.lastName,
      email: newRider.email,
      phone: newRider.phone,
      role: newRider.role
    });
  } catch (error) {
    console.error('Error creating rider:', error);
    if (error instanceof Error && error.message.includes('unique')) {
      res.status(400).json({ message: "Email already exists" });
    } else {
      res.status(500).json({ message: "Error creating rider" });
    }
  }
});

// Assign rider to order
adminRouter.post('/orders/:id/assign', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    
    // Validate request body
    const schema = z.object({
      riderId: z.number()
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request", errors: result.error.errors });
    }
    
    const { riderId } = result.data;
    
    const updatedOrder = await adminService.assignRiderToOrder(orderId, riderId);
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Send real-time updates and notifications
    try {
      const { sendRealtimeUpdate } = await import('./chat');
      const { notifyRiderNewDelivery, notifyCustomerOrderUpdate } = await import('./notificationService');
      
      // Notify the rider about new assignment
      await notifyRiderNewDelivery(riderId, orderId);
      
      // Notify customer about rider assignment
      await notifyCustomerOrderUpdate(orderId, 'out_for_delivery');
      
      // Send real-time updates to refresh order data
      sendRealtimeUpdate(updatedOrder.userId, 'order_status_updated', { orderId, status: 'out_for_delivery' });
      sendRealtimeUpdate(riderId, 'rider_assigned', { orderId });
      
    } catch (notificationError) {
      console.log("Notification sending failed:", notificationError);
    }
    
    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error assigning rider:', error);
    res.status(500).json({ message: error.message || "Error assigning rider" });
  }
});

// Update order status
adminRouter.post('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.session.userId as number;
    
    // Validate request body
    const schema = z.object({
      status: z.string().refine(
        (val) => ['confirmed', 'preparing', 'ready', 'cancelled'].includes(val),
        { message: "Invalid status. Allowed values: confirmed, preparing, ready, cancelled" }
      )
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request", errors: result.error.errors });
    }
    
    const { status } = result.data;
    
    const updatedOrder = await adminService.updateOrderStatus(orderId, status, userId);
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Send real-time updates and notifications
    try {
      const { sendRealtimeUpdate } = await import('./chat');
      const { notifyCustomerOrderUpdate } = await import('./notificationService');
      
      // Notify customer about order status change
      await notifyCustomerOrderUpdate(orderId, status);
      
      // Send real-time updates to refresh order data
      sendRealtimeUpdate(updatedOrder.userId, 'order_status_updated', { orderId, status });
      
      // If order has a rider, notify them too
      if (updatedOrder.riderId) {
        sendRealtimeUpdate(updatedOrder.riderId, 'order_status_updated', { orderId, status });
      }
      
    } catch (notificationError) {
      console.log("Notification sending failed:", notificationError);
    }
    
    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message || "Error updating order status" });
  }
});

// Food/Menu Management
adminRouter.get('/foods', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const foods = await adminService.getFoods(categoryId);
    res.json(foods);
  } catch (error) {
    console.error('Error getting foods:', error);
    res.status(500).json({ message: "Error fetching foods" });
  }
});

adminRouter.post('/foods', async (req: Request, res: Response) => {
  try {
    // Validate request body using the existing insert schema from shared/schema.ts
    const food = req.body;
    const newFood = await adminService.createFood(food);
    res.status(201).json(newFood);
  } catch (error) {
    console.error('Error creating food:', error);
    res.status(500).json({ message: "Error creating food" });
  }
});

// Update food item
adminRouter.put('/foods/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const updatedFood = await adminService.updateFood(id, updates);
    
    if (!updatedFood) {
      return res.status(404).json({ message: "Food item not found" });
    }
    
    res.json(updatedFood);
  } catch (error) {
    console.error('Error updating food:', error);
    res.status(500).json({ message: "Error updating food item" });
  }
});

// Delete food item
adminRouter.delete('/foods/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await adminService.deleteFood(id);
    
    if (!success) {
      return res.status(404).json({ message: "Food item not found" });
    }
    
    res.json({ success: true, message: "Food item deleted successfully" });
  } catch (error) {
    console.error('Error deleting food:', error);
    res.status(500).json({ message: "Error deleting food item" });
  }
});

adminRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await adminService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

adminRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    // Validate request body using the existing insert schema from shared/schema.ts
    const category = req.body;
    const newCategory = await adminService.createCategory(category);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: "Error creating category" });
  }
});

export default adminRouter;