import { storage } from './storage';
import { Order, Food, Category, User, Address, OrderItem } from '@shared/schema';
import crypto from 'crypto';

/**
 * Gets a user's role
 * @param userId The user ID
 * @returns The user's role or null if user not found
 */
export const getUserRole = async (userId: number): Promise<string | null> => {
  const user = await storage.getUser(userId);
  return user?.role || null;
};

/**
 * Get all users with a specific role
 * @param role The role to filter by (admin, rider, customer)
 */
export const getUsersByRole = async (role: string): Promise<User[]> => {
  return await storage.getUsersByRole(role);
};

/**
 * Gets all orders with optional filtering by status
 * @param status Optional status to filter by
 */
export const getAllOrders = async (status?: string): Promise<Order[]> => {
  const orders = await storage.getAllOrders();
  
  if (status) {
    return orders.filter(order => order.status === status);
  }
  
  return orders;
};

/**
 * Get available riders who can be assigned to orders
 */
export const getAvailableRiders = async (): Promise<User[]> => {
  // In a real system, you might check rider availability status
  // For now, we'll just return all users with the 'rider' role
  return await storage.getUsersByRole('rider');
};

/**
 * Get a specific order by ID
 * @param orderId The order ID
 * @returns The order object or undefined if not found
 */
export const getOrder = async (orderId: number): Promise<Order | undefined> => {
  return await storage.getOrder(orderId);
};

/**
 * Get a specific user by ID
 * @param userId The user ID
 * @returns The user object or undefined if not found
 */
export const getUser = async (userId: number): Promise<User | undefined> => {
  return await storage.getUser(userId);
};

/**
 * Get a specific address by ID
 * @param addressId The address ID
 * @returns The address object or undefined if not found
 */
export const getAddress = async (addressId: number): Promise<Address | undefined> => {
  return await storage.getAddress(addressId);
};

/**
 * Get order items for a specific order with food names
 * @param orderId The order ID
 * @returns Array of order items with food names
 */
export const getOrderItems = async (orderId: number): Promise<OrderItem[]> => {
  const orderItems = await storage.getOrderItems(orderId);
  
  // Enhance order items with food information
  const enhancedItems = await Promise.all(orderItems.map(async (item) => {
    // Get food details for this item to get the proper name
    const food = await storage.getFood(item.foodId);
    
    return {
      ...item,
      name: food ? food.name : `Item #${item.foodId}`
    };
  }));
  
  return enhancedItems;
};

/**
 * Assign a rider to an order
 * @param orderId The order ID
 * @param riderId The rider ID
 */
export const assignRiderToOrder = async (orderId: number, riderId: number): Promise<Order | undefined> => {
  // Get the order
  const order = await storage.getOrder(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Verify order is in a state where rider can be assigned
  if (!['confirmed', 'preparing', 'ready'].includes(order.status)) {
    throw new Error(`Cannot assign rider to order in ${order.status} status. Order must be confirmed, preparing, or ready.`);
  }
  
  // Verify rider exists and has the rider role
  const rider = await storage.getUser(riderId);
  if (!rider) {
    throw new Error('Rider not found');
  }
  
  if (rider.role !== 'rider') {
    throw new Error('User is not a rider');
  }
  
  // Generate a delivery code when a rider is assigned
  // This will be used for verification when the rider delivers the order
  const deliveryCode = generateDeliveryCode();
  
  // Update the order with the rider ID and delivery code
  const updatedOrder = await storage.updateOrder(orderId, {
    riderId,
    deliveryCode
  });
  
  // Send notification to rider about new delivery assignment
  try {
    const { notifyRiderNewDelivery } = await import('./notificationService');
    await notifyRiderNewDelivery(riderId, orderId);
  } catch (error) {
    console.error('Error sending rider notification:', error);
  }
  
  return updatedOrder;
};

/**
 * Update an order's status
 * @param orderId The order ID
 * @param status The new status
 * @param userId The ID of the user making the change (for authorization)
 */
export const updateOrderStatus = async (
  orderId: number, 
  status: string, 
  userId: number
): Promise<Order | undefined> => {
  // Get the order and user
  const order = await storage.getOrder(orderId);
  const user = await storage.getUser(userId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Define valid status transitions based on user role
  const validTransitions: Record<string, string[]> = {
    admin: ['confirmed', 'preparing', 'ready', 'cancelled'],
    rider: ['picked_up', 'out_for_delivery', 'delivered'],
    customer: ['placed', 'cancelled']
  };
  
  const userRole = user.role || 'customer';
  if (!validTransitions[userRole] || !validTransitions[userRole].includes(status)) {
    throw new Error(`User with role ${userRole} cannot change order status to ${status}`);
  }
  
  // Validate status transition logic
  const validStatusFlow: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'placed': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['picked_up', 'cancelled'],
    'picked_up': ['out_for_delivery'],
    'out_for_delivery': ['delivered'],
    'delivered': [],
    'cancelled': []
  };
  
  // Make sure we have valid transitions for the current status
  if (!validStatusFlow[order.status]) {
    console.error(`Unknown current order status: ${order.status}`);
    // If we don't know the current status, allow the update as a fallback
    // This can happen if new statuses were added but flow logic wasn't updated
  } else if (!validStatusFlow[order.status].includes(status)) {
    throw new Error(`Cannot change order status from ${order.status} to ${status}`);
  }
  
  // If moving to delivered status, record the delivery time
  const updates: Partial<Order> = { status };
  if (status === 'delivered') {
    updates.deliveryTime = new Date();
  }
  
  // Update the order status
  const updatedOrder = await storage.updateOrder(orderId, updates);
  
  // Send notification to customer about status change
  try {
    const { notifyCustomerOrderUpdate } = await import('./notificationService');
    await notifyCustomerOrderUpdate(orderId, status);
  } catch (error) {
    console.error('Error sending customer notification:', error);
  }
  
  return updatedOrder;
};

/**
 * Verify a delivery code when a rider is completing delivery
 * @param orderId The order ID
 * @param code The delivery code to verify
 * @param riderId The ID of the rider making the verification
 */
export const verifyDeliveryCode = async (
  orderId: number, 
  code: string, 
  riderId: number
): Promise<boolean> => {
  // Get the order
  const order = await storage.getOrder(orderId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Check if this rider is assigned to this order
  if (order.riderId !== riderId) {
    throw new Error('Rider is not assigned to this order');
  }
  
  // Verify the code matches
  if (order.deliveryCode !== code) {
    return false;
  }
  
  // If code matches, update the order status to delivered
  await updateOrderStatus(orderId, 'delivered', riderId);
  return true;
};

/**
 * Generate a random 6-digit delivery code
 */
function generateDeliveryCode(): string {
  // Generate a 6-digit random code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get foods (menu items) with optional category filtering
 * @param categoryId Optional category ID to filter by
 */
export const getFoods = async (categoryId?: number): Promise<Food[]> => {
  if (categoryId) {
    return await storage.getFoodsByCategory(categoryId);
  }
  return await storage.getFoods();
};

/**
 * Create a new food item (menu item)
 * @param food The food data
 */
export const createFood = async (food: any): Promise<Food> => {
  return await storage.createFood(food);
};

/**
 * Update a food item
 * @param id The food ID
 * @param updates The updates to apply
 */
export const updateFood = async (id: number, updates: any): Promise<Food | undefined> => {
  try {
    return await storage.updateFood(id, updates);
  } catch (error) {
    console.error("Error in updateFood service:", error);
    throw error;
  }
};

/**
 * Delete a food item
 * @param id The food ID
 */
export const deleteFood = async (id: number): Promise<boolean> => {
  try {
    return await storage.deleteFood(id);
  } catch (error) {
    console.error("Error in deleteFood service:", error);
    throw error;
  }
};

/**
 * Get all categories
 */
export const getCategories = async (): Promise<Category[]> => {
  return await storage.getCategories();
};

/**
 * Create a new category
 * @param category The category data
 */
export const createCategory = async (category: any): Promise<Category> => {
  return await storage.createCategory(category);
};