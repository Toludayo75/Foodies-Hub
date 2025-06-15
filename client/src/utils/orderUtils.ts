import { apiRequest } from "@/lib/queryClient";

/**
 * Creates a new order in the database
 * 
 * @param addressId - The ID of the delivery address
 * @param total - The total amount of the order
 * @param cartItems - The items in the cart
 * @returns The created order or null if creation failed
 */
export const createOrder = async (
  addressId: number, 
  total: number, 
  cartItems: any[]
) => {
  try {
    // Map cart items to order items format
    const orderItems = cartItems.map(item => ({
      foodId: item.id,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Send request to create order
    const response = await apiRequest("POST", "/api/orders", {
      addressId,
      total,
      items: orderItems,
      status: 'pending'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to create order:", errorData);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating order:", error);
    return null;
  }
};

/**
 * Get order details from localStorage
 */
export const getCurrentOrderId = (): number | null => {
  try {
    const orderData = localStorage.getItem("currentOrder");
    return orderData ? JSON.parse(orderData).id : null;
  } catch (error) {
    console.error("Error parsing order data:", error);
    return null;
  }
};

/**
 * Save order details to localStorage
 */
export const saveCurrentOrder = (order: any) => {
  localStorage.setItem("currentOrder", JSON.stringify(order));
};