import express, { Request, Response } from 'express';
import { storage } from './storage';
import { debitWallet, checkSufficientBalance } from './walletService';

const orderRouter = express.Router();

// Get a specific order with items and address details
orderRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if the user owns this order
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get order items for this order
    const items = await storage.getOrderItems(orderId);
    
    // Get delivery address
    const address = await storage.getAddress(order.addressId);
    
    // Return complete order details
    return res.json({
      order,
      items,
      address
    });
    
  } catch (error) {
    console.error('Error retrieving order details:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get delivery code for a specific order
orderRouter.get('/:id/code', async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if the user owns this order
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Only return the delivery code if the order is confirmed or later in the flow
    const allowedStatuses = ['confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery'];
    
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ 
        message: 'Delivery code is not available yet. Your order needs to be confirmed first.' 
      });
    }
    
    return res.json({ code: order.deliveryCode });
    
  } catch (error) {
    console.error('Error retrieving delivery code:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create order with wallet payment
orderRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { addressId, items, paymentMethod = 'wallet' } = req.body;

    if (!addressId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Address ID and order items are required" });
    }

    // Calculate total
    let total = 0;
    for (const item of items) {
      const food = await storage.getFood(item.foodId);
      if (!food) {
        return res.status(400).json({ message: `Food item with ID ${item.foodId} not found` });
      }
      total += food.price * item.quantity;
    }

    // For wallet payment, check balance first
    if (paymentMethod === 'wallet') {
      const balanceCheck = await checkSufficientBalance(userId, total);
      if (!balanceCheck.sufficient) {
        return res.status(400).json({ 
          message: `Insufficient wallet balance. You have ₦${balanceCheck.currentBalance.toLocaleString()}, but need ₦${total.toLocaleString()}. Please top up ₦${balanceCheck.shortfall?.toLocaleString()} to complete this order.`,
          currentBalance: balanceCheck.currentBalance,
          requiredAmount: total,
          shortfall: balanceCheck.shortfall
        });
      }
    }

    // Create order
    const order = await storage.createOrder({
      userId,
      addressId,
      total,
      status: 'pending',
      deliveryCode: Math.floor(100000 + Math.random() * 900000).toString()
    });

    // Create order items
    for (const item of items) {
      const food = await storage.getFood(item.foodId);
      if (food) {
        await storage.createOrderItem({
          orderId: order.id,
          foodId: item.foodId,
          quantity: item.quantity,
          price: food.price
        });
      }
    }

    // Process wallet payment
    if (paymentMethod === 'wallet') {
      const paymentResult = await debitWallet(userId, total, order.id);
      if (!paymentResult.success) {
        // Delete the order if payment fails
        await storage.deleteOrder(order.id);
        return res.status(400).json({ 
          message: paymentResult.error || "Payment failed" 
        });
      }
      
      // Update order status to confirmed after successful payment
      await storage.updateOrderStatus(order.id, 'confirmed');
    }

    // Clear cart after successful order creation
    await storage.clearCart(userId);

    res.status(201).json({
      ...order,
      paymentMethod,
      paymentStatus: paymentMethod === 'wallet' ? 'completed' : 'pending'
    });
    
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: "Error creating order" });
  }
});

export default orderRouter;