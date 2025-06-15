import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as adminService from './adminService';
import { storage } from './storage';

const riderRouter = Router();

// Middleware to check if user is a rider
const requireRider = (req: Request, res: Response, next: Function) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Get the user and check if they have rider role
  storage.getUser(userId)
    .then(user => {
      if (!user || user.role !== 'rider') {
        return res.status(403).json({ message: "Forbidden: Rider access required" });
      }
      next();
    })
    .catch(err => {
      console.error('Error checking rider role:', err);
      res.status(500).json({ message: "Internal server error" });
    });
};

// Apply rider auth middleware to all routes
riderRouter.use(requireRider);

// Get orders assigned to this rider
riderRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const riderId = req.session.userId as number;
    
    // Get all orders
    const allOrders = await storage.getAllOrders();
    
    // Filter orders assigned to this rider
    const riderOrders = allOrders.filter(order => order.riderId === riderId);
    
    res.json(riderOrders);
  } catch (error) {
    console.error('Error getting rider orders:', error);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// Get specific order assigned to this rider
riderRouter.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const riderId = req.session.userId as number;
    
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check if this rider is assigned to this order
    if (order.riderId !== riderId) {
      return res.status(403).json({ message: "You are not assigned to this order" });
    }
    
    // Get order items for this order
    const orderItems = await storage.getOrderItems(orderId);
    
    // Get delivery address
    const address = await storage.getAddress(order.addressId);
    
    // Get customer details
    const customer = await storage.getUser(order.userId);
    
    // Return complete order details
    res.json({
      order,
      items: orderItems,
      address,
      customer: customer ? {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone
      } : null
    });
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({ message: "Error fetching order details" });
  }
});

// Update order status
riderRouter.post('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const riderId = req.session.userId as number;
    
    // Validate request body
    const schema = z.object({
      status: z.string().refine(
        (val) => ['picked_up', 'out_for_delivery', 'delivered'].includes(val),
        { message: "Invalid status. Allowed values: picked_up, out_for_delivery, delivered" }
      )
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request", errors: result.error.errors });
    }
    
    const { status } = result.data;
    
    // Check if this rider is assigned to this order
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    if (order.riderId !== riderId) {
      return res.status(403).json({ message: "You are not assigned to this order" });
    }
    
    // Update order status
    const updatedOrder = await adminService.updateOrderStatus(orderId, status, riderId);
    
    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: error.message || "Error updating order status" });
  }
});

// Verify delivery code
riderRouter.post('/orders/:id/verify', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const riderId = req.session.userId as number;
    
    // Validate request body
    const schema = z.object({
      code: z.string()
    });
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request", errors: result.error.errors });
    }
    
    const { code } = result.data;
    
    // Verify the delivery code
    const isValid = await adminService.verifyDeliveryCode(orderId, code, riderId);
    
    if (!isValid) {
      return res.status(400).json({ message: "Invalid delivery code" });
    }
    
    // Update order status to delivered when code is verified
    const updatedOrder = await adminService.updateOrderStatus(orderId, 'delivered', riderId);
    
    res.json({ success: true, message: "Delivery confirmed" });
  } catch (error: any) {
    console.error('Error verifying delivery code:', error);
    res.status(500).json({ message: error.message || "Error verifying delivery code" });
  }
});

export default riderRouter;