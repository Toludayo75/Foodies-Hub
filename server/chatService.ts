import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "./config";
import { db } from "./drizzle";
import * as schema from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { shouldEscalateToHuman, createSupportTicket, generateEscalationResponse } from "./escalationService";

// Initialize Google Gemini client lazily
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

function getGeminiModel() {
  if (!genAI) {
    // Load the API key directly from process.env
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAah6BDgb8tcs6NdbvLrVwg_bDYKHK54T0";
    console.log("Loading Gemini API key:", apiKey ? "Key found" : "Key missing");
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not available");
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    try {
      genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      console.log("Gemini model initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Gemini model:", error);
      throw error;
    }
  }
  return model;
}

// Get conversation history from database
async function getConversationHistory(userId: number): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
  try {
    const messages = await db.query.messages.findMany({
      where: eq(schema.messages.userId, userId),
      orderBy: desc(schema.messages.timestamp),
      limit: 10 // Keep last 10 messages for context
    });
    
    const history = messages.reverse().map(msg => ({
      role: msg.isFromUser ? "user" as const : "assistant" as const,
      content: msg.content
    }));
    
    return history;
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return [];
  }
}

// Analyze customer preferences based on order history
function analyzeCustomerPreferences(userOrders: any[], menuItems: any[]) {
  if (userOrders.length === 0) {
    return { favorites: [], averageOrderValue: '0.00' };
  }

  // Calculate average order value
  const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = (totalSpent / userOrders.length / 100).toFixed(2);

  // Find most frequently ordered items (placeholder logic)
  const favorites = ['Jollof Rice', 'Meat Pie']; // In real implementation, analyze order items

  return { favorites, averageOrderValue };
}

// Get popular food combinations
function getPopularCombinations(userOrders: any[]) {
  // In a real implementation, this would analyze order patterns
  return ['Jollof Rice + Meat Pie', 'Amala + Egusi'];
}

// Get time-based recommendations
function getTimeBasedRecommendations() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 11) {
    return 'Light breakfast options like Meat Pie';
  } else if (hour >= 11 && hour < 16) {
    return 'Hearty lunch meals like Jollof Rice';
  } else if (hour >= 16 && hour < 20) {
    return 'Dinner specials and combo meals';
  } else {
    return 'Late night snacks and light meals';
  }
}

// Helper function to get user's order information
async function getUserOrders(userId: number) {
  try {
    const orders = await db.query.orders.findMany({
      where: eq(schema.orders.userId, userId),
      orderBy: desc(schema.orders.createdAt),
      limit: 5
    });
    return orders;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
}

// Helper function to get user information
async function getUserInfo(userId: number) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId)
    });
    return user;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

// Helper function to get all available food items
async function getMenuItems() {
  try {
    const foods = await db.query.foods.findMany();
    return foods;
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }
}

// Helper function to get user's addresses
async function getUserAddresses(userId: number) {
  try {
    const addresses = await db.query.addresses.findMany({
      where: eq(schema.addresses.userId, userId)
    });
    return addresses;
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    return [];
  }
}

// Helper function to get user's saved payment methods
async function getUserPaymentMethods(userId: number) {
  try {
    const paymentMethods = await db.query.paymentMethods.findMany({
      where: eq(schema.paymentMethods.userId, userId)
    });
    return paymentMethods;
  } catch (error) {
    console.error("Error fetching user payment methods:", error);
    return [];
  }
}

// Helper function to track order status - supports single, multiple, or all orders
async function getOrderStatus(userId: number, orderIds?: number[]) {
  try {
    const foods = await getMenuItems();
    
    if (orderIds && orderIds.length > 0) {
      // Get specific orders
      const orders = await db.query.orders.findMany({
        where: eq(schema.orders.userId, userId),
        orderBy: desc(schema.orders.createdAt)
      });
      
      const matchedOrders = orders.filter(order => orderIds.includes(order.id));
      
      if (matchedOrders.length > 0) {
        const orderDetails = await Promise.all(matchedOrders.map(async (order) => {
          const orderItems = await db.query.orderItems.findMany({
            where: eq(schema.orderItems.orderId, order.id)
          });
          
          const itemDetails = orderItems.map(item => {
            const food = foods.find(f => f.id === item.foodId);
            return `${item.quantity}x ${food?.name || 'Unknown item'}`;
          }).join(', ');
          
          return {
            order,
            itemDetails
          };
        }));
        
        return {
          orders: orderDetails,
          found: true,
          multiple: true
        };
      }
      return { found: false };
    } else {
      // Get all recent orders or latest order
      const recentOrders = await db.query.orders.findMany({
        where: eq(schema.orders.userId, userId),
        orderBy: desc(schema.orders.createdAt),
        limit: 5
      });
      
      if (recentOrders.length > 0) {
        const orderDetails = await Promise.all(recentOrders.map(async (order) => {
          const orderItems = await db.query.orderItems.findMany({
            where: eq(schema.orderItems.orderId, order.id)
          });
          
          const itemDetails = orderItems.map(item => {
            const food = foods.find(f => f.id === item.foodId);
            return `${item.quantity}x ${food?.name || 'Unknown item'}`;
          }).join(', ');
          
          return {
            order,
            itemDetails
          };
        }));
        
        return {
          orders: orderDetails,
          found: true,
          multiple: recentOrders.length > 1
        };
      }
      return { found: false };
    }
  } catch (error) {
    console.error("Error tracking orders:", error);
    return { found: false };
  }
}

// Helper function to add items to cart from last order using API
async function addLastOrderToCart(userId: number) {
  try {
    const { storage } = await import('./storage');
    
    // Get user's orders to find the latest one
    const userOrders = await storage.getOrders(userId);
    
    if (userOrders.length === 0) {
      return { success: false, items: [], total: 0 };
    }
    
    // Get the most recent order
    const latestOrder = userOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    if (latestOrder) {
      const result = await storage.addOrderToCart(userId, latestOrder.id);
      return result;
    }
    
    return { success: false, items: [], total: 0 };
  } catch (error) {
    console.error("Error adding last order to cart:", error);
    return { success: false, items: [], total: 0 };
  }
}

// Helper function to add item to cart using storage service
async function addToCart(userId: number, foodId: number, quantity: number) {
  try {
    const { storage } = await import('./storage');
    console.log(`Attempting to add to cart: userId=${userId}, foodId=${foodId}, quantity=${quantity}`);
    const result = await storage.addToCart(userId, foodId, quantity);
    console.log("Cart add result:", result);
    
    if (!result) {
      console.error("Storage addToCart returned null/undefined");
      return false;
    }
    
    // Send real-time notification to user about cart update
    try {
      const { sendMessageToUser } = await import('./chat');
      sendMessageToUser(userId, JSON.stringify({
        type: 'cart_updated',
        message: 'Cart updated - please refresh'
      }));
    } catch (wsError) {
      console.log("WebSocket notification failed, will rely on polling");
    }
    
    return true;
  } catch (error) {
    console.error("Error adding to cart:", error);
    return false;
  }
}

// Enhanced function to parse menu items from natural language
function parseMenuItemsFromMessage(message: string, menuItems: any[]) {
  const items: Array<{foodId: number, quantity: number, name: string}> = [];
  
  // Normalize the message
  let normalizedMessage = message.toLowerCase()
    .replace(/\b(add|to|my|cart|please|can|you|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by common separators first to handle multiple items
  const segments = normalizedMessage.split(/\s+and\s+|\s*,\s+|\s*;\s+|\s+also\s+|\s+plus\s+/);
  
  // Process each segment for items
  for (const segment of segments) {
    const trimmedSegment = segment.trim();
    if (!trimmedSegment) continue;
    
    // Try different patterns for this segment
    let quantity = 1;
    let itemName = '';
    
    // Pattern 1: "2 jollof rice" or "1 meat pie"
    const quantityFirstMatch = trimmedSegment.match(/^(\d+)\s+(.+)$/);
    if (quantityFirstMatch) {
      quantity = parseInt(quantityFirstMatch[1]);
      itemName = quantityFirstMatch[2].trim();
    }
    // Pattern 2: "jollof rice x2" or "meat pie x1"
    else {
      const xNotationMatch = trimmedSegment.match(/^(.+?)\s*x\s*(\d+)$/);
      if (xNotationMatch) {
        itemName = xNotationMatch[1].trim();
        quantity = parseInt(xNotationMatch[2]);
      }
      // Pattern 3: just item name (default quantity 1)
      else {
        itemName = trimmedSegment;
        quantity = 1;
      }
    }
    
    if (itemName && quantity > 0) {
      // Find matching menu item
      const matchedItem = findBestMenuMatch(itemName, menuItems);
      if (matchedItem) {
        // Check if item already exists, if so add to quantity
        const existingIndex = items.findIndex(item => item.foodId === matchedItem.id);
        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity;
        } else {
          items.push({
            foodId: matchedItem.id,
            quantity: quantity,
            name: matchedItem.name
          });
        }
      }
    }
  }
  
  // Always try to match additional items from menu (not just when items.length === 0)
  // This ensures we catch all items mentioned, even if some were already found with explicit quantities
  for (const menuItem of menuItems) {
    const menuItemLower = menuItem.name.toLowerCase().trim();
    
    // Check if the menu item name appears in the message
    if (normalizedMessage.includes(menuItemLower) || 
        normalizedMessage.includes(menuItemLower.replace(/\s+/g, '')) ||
        findBestMenuMatch(menuItem.name, [{ name: normalizedMessage }])) {
      
      // Avoid duplicates
      const existingIndex = items.findIndex(item => item.foodId === menuItem.id);
      if (existingIndex === -1) {
        items.push({
          foodId: menuItem.id,
          quantity: 1,
          name: menuItem.name
        });
      }
    }
  }
  
  // If still no items found, try aggressive fuzzy matching for the whole message
  if (items.length === 0) {
    const matchedItem = findBestMenuMatch(normalizedMessage, menuItems);
    if (matchedItem) {
      items.push({
        foodId: matchedItem.id,
        quantity: 1,
        name: matchedItem.name
      });
    }
  }
  
  return items;
}

// Fuzzy matching for menu items
function findBestMenuMatch(searchTerm: string, menuItems: any[]) {
  const normalized = searchTerm.toLowerCase().trim();
  
  // Exact match first - trim both sides for comparison
  let match = menuItems.find(item => 
    item.name.toLowerCase().trim() === normalized
  );
  if (match) return match;
  
  // Partial match with better trimming
  match = menuItems.find(item => {
    const itemName = item.name.toLowerCase().trim();
    return itemName.includes(normalized) || normalized.includes(itemName);
  });
  if (match) return match;
  
  // Common variations including our menu items
  const variations: {[key: string]: string[]} = {
    'jollof': ['jollof rice', 'jollof'],
    'meat pie': ['meat pie', 'meatpie', 'meat pies', 'meatpies'],
    'rice': ['jollof rice', 'fried rice'],
    'pie': ['meat pie'],
    'amala': ['amala'],
    'chinchin': ['chinchin', 'chin chin'],
    'chin': ['chinchin']
  };
  
  for (const [key, variants] of Object.entries(variations)) {
    if (variants.some(variant => normalized.includes(variant))) {
      match = menuItems.find(item => 
        item.name.toLowerCase().trim().includes(key)
      );
      if (match) return match;
    }
  }
  
  return null;
}

// Helper function to get cart items using storage service
async function getCartItems(userId: number) {
  try {
    const { storage } = await import('./storage');
    const cartItems = await storage.getCartItems(userId);
    
    const menuItems = await getMenuItems();
    const cartWithDetails = cartItems.map((item: any) => {
      const food = menuItems.find(f => f.id === item.foodId);
      return {
        ...item,
        foodName: food?.name || 'Unknown item',
        price: food?.price || 0,
        total: (food?.price || 0) * item.quantity
      };
    });
    
    const totalAmount = cartWithDetails.reduce((sum: number, item: any) => sum + item.total, 0);
    
    return {
      items: cartWithDetails,
      total: totalAmount,
      count: cartItems.length
    };
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return { items: [], total: 0, count: 0 };
  }
}

export async function handleChatMessage(userId: number, message: string): Promise<string> {
  try {
    // Get conversation history for escalation analysis
    const conversationHistory = await getConversationHistory(userId);
    
    // Check if message should be escalated to human support
    const escalationAnalysis = shouldEscalateToHuman(message, conversationHistory);
    
    if (escalationAnalysis.shouldEscalate && escalationAnalysis.trigger) {
      // Create support ticket and escalate
      const ticket = await createSupportTicket(
        userId, 
        message, 
        escalationAnalysis.trigger, 
        conversationHistory
      );
      
      // Return escalation response
      const escalationResponse = generateEscalationResponse(escalationAnalysis.trigger, ticket.id);
      
      // Save this response to conversation history
      await db.insert(schema.messages).values({
        userId,
        content: escalationResponse,
        isFromUser: false,
        timestamp: new Date()
      });
      
      return escalationResponse;
    }
    
    // Get user data for personalized support
    const userInfo = await getUserInfo(userId);
    const userOrders = await getUserOrders(userId);
    const userPaymentMethods = await getUserPaymentMethods(userId);
    
    // Get current menu items
    const menuItems = await getMenuItems();
    const menuText = menuItems.map(item => `- ${item.name} (₦${item.price}) - ${item.description}`).join('\n');
    
    // Payment methods summary for AI context
    const paymentMethodsText = userPaymentMethods.length > 0 
      ? userPaymentMethods.map(pm => `- ${pm.type.toUpperCase()} ending in ${pm.cardLast4 || 'XXXX'} (${pm.isDefault ? 'Default' : 'Available'})`).join('\n')
      : 'No saved payment methods';

    // Analyze customer preferences from order history
    const customerPreferences = analyzeCustomerPreferences(userOrders, menuItems);
    const popularCombos = getPopularCombinations(userOrders);
    const timeBasedRecs = getTimeBasedRecommendations();
    
    const systemPrompt = `You are a helpful customer support assistant for Foodies Hub, a food delivery app. Your role is to provide excellent customer service, answer questions, help resolve issues, and assist customers with adding items to their cart. You do NOT process payments or complete orders - customers must use the app's checkout interface for that.

CUSTOMER PROFILE:
- Name: ${userInfo?.firstName || 'Customer'} ${userInfo?.lastName || ''}
- Email: ${userInfo?.email || 'Not provided'}
- Order History: ${userOrders.length} previous orders

RECENT ORDERS:
${userOrders.length > 0 ? userOrders.map(order => `Order #${order.id}: ${order.status} - ₦${order.total}`).join('\n') : 'No previous orders'}

AVAILABLE MENU (for information only):
${menuText}

## MY CAPABILITIES & SERVICES
When asked about my capabilities, what I can do, or what services I provide, respond with:

"I'm your Foodies Hub support assistant! Here's how I can help you:

🍽️ **Order Support**
• Track your current orders and delivery status
• Help with order issues like wrong items or delays
• Add items from previous orders to your cart
• Provide delivery time estimates (usually 30-45 minutes)

🛒 **Shopping Assistant**
• Help you find menu items and add them to your cart
• Add specific items with quantities (e.g. "add 2 jollof rice and 1 meat pie")
• Add items from your previous orders to cart
• Handle complex orders with multiple items
• Provide information about ingredients and prices
• Suggest popular items and combinations

💳 **Payment & Billing**
• Help with payment issues and methods
• Assist with refund processes
• Resolve billing questions

🔧 **Technical Help**
• Troubleshoot app problems
• Help with login issues
• Guide you through using app features

📞 **General Support**
• Answer questions about our menu and restaurants
• Provide information about delivery areas
• Help with account settings
• Address any concerns or complaints

Just let me know what you need help with, and I'll do my best to assist you!"

CUSTOMER SUPPORT SCENARIOS:

## ORDER PLACEMENT & HELP
- Guide users to the app's ordering interface for placing new orders
- Explain how to use the app's features and navigate menus
- Help with cart and checkout issues
- Provide information about scheduling orders for later
- Assist with promo codes and discount applications
- Help users find restaurants and menu items

## DELIVERY & TRACKING
- Help track existing orders using: "TRACK_ORDER: [OrderId]" or "TRACK_ORDER:"
- Provide delivery time estimates: "Our typical delivery time is 30-45 minutes depending on your location and restaurant preparation time"
- Assist with delivery address issues and changes
- Help when riders can't be located or are delayed
- Explain delivery areas and coverage zones
- Handle delivery time questions: "Delivery usually takes 30-45 minutes, but can vary based on distance, weather, and order volume"
- Peak hours information: "During lunch (12-2PM) and dinner (6-9PM) times, delivery may take slightly longer due to high demand"

## ORDER ISSUES & COMPLAINTS
- Handle complaints about wrong orders with empathy
- Address food quality issues (cold food, wrong items, poor preparation)
- Assist with missing items and incomplete orders
- Help with allergy concerns and dietary restriction issues
- Resolve portion size and food presentation complaints
- Handle spilled or damaged food deliveries

## PAYMENTS & REFUNDS
- Explain available payment methods and processes
- Guide users through refund processes and timelines
- Help with double charges or failed payment issues
- Assist with payment method changes and updates
- Handle billing discrepancies and disputed charges

## TECHNICAL SUPPORT
- Help with app crashes and performance issues
- Assist with login problems and password resets
- Troubleshoot card addition and payment setup problems
- Help when restaurants don't appear in search results
- Resolve checkout functionality and processing issues
- Guide users through app updates and feature changes

## MENU & RESTAURANT INFORMATION
- Provide information about available restaurants and cuisines
- Answer questions about ingredients and nutritional information
- Share information about restaurant operating hours
- Help with customization requests and special instructions
- Discuss vegetarian, vegan, and dietary restriction options
- Explain seasonal menus and limited-time offers

## ORDER HISTORY & CART ASSISTANCE
- Help users add items from previous orders to cart using: "ADD_TO_CART_FROM_ORDER:"
- Assist with finding past order information and receipts
- Guide users to their order history and favorites
- Add specific menu items to cart when requested

## RESPONSE GUIDELINES
- Be empathetic and understanding, especially with complaints
- Use the customer's name when available for personalization
- Apologize sincerely when issues occur and take ownership
- Offer specific solutions and clear next steps
- Be proactive in suggesting alternatives and solutions
- Recognize emotional cues and respond appropriately
- Keep responses helpful, clear, and concise
- Always maintain a friendly, professional tone
- Acknowledge customer loyalty and previous orders when relevant

## SPECIAL INSTRUCTIONS
- For order tracking, use: "TRACK_ORDER:" (for latest order) or "TRACK_ORDER: [OrderId]"
- For adding items to cart from previous orders, use: "ADD_TO_CART_FROM_ORDER:"
- For adding specific menu items to cart, use: "ADD_TO_CART: [foodId] [quantity]"
- For showing cart contents, use: "SHOW_CART:"
- Direct customers to checkout in the app to complete their purchase
- Always show prices in Nigerian Naira (₦) format
- Provide accurate menu information when requested
- Never process payments or complete orders directly

## COMMON SCENARIOS & DETAILED RESPONSES

### FRUSTRATED CUSTOMERS
- Multiple complaints: "I can see you've been having several issues, and I sincerely apologize for these problems. Let me personally ensure we resolve everything properly."
- Angry tone: "I completely understand your frustration. No one should have to deal with these issues. Let me make this right for you immediately."
- Repeated problems: "I apologize that this keeps happening. This is clearly not acceptable, and I want to escalate this to ensure it doesn't happen again."

### ORDER ISSUES
- Wrong order: "I understand your frustration about receiving the wrong order. Let me help fix this immediately. Can you tell me what you received vs what you ordered?"
- Missing items: "I'm sorry some items are missing from your order. Let me track this down and arrange for the missing items to be delivered right away."
- Cold food: "I apologize that your food arrived cold. This definitely impacts the quality of your meal. Let me see what we can do to make this right."
- Delivery delay: "I sincerely apologize for the delay. Let me check your order status and provide you with an accurate update and estimated delivery time."

### TECHNICAL PROBLEMS
- App crashes: "I'm sorry the app is crashing. This is frustrating when you're trying to order. Let me help you troubleshoot this or place your order another way."
- Login issues: "I understand how annoying login problems can be. Let me guide you through resetting your password or resolving the login issue."
- Payment failures: "Payment problems are particularly frustrating. Let me help you resolve this payment issue so you can complete your order smoothly."

### FIRST-TIME USERS
- Confusion: "Welcome to Foodies Hub! I can see you're new here. Let me guide you through how to place your first order step by step."
- Navigation help: "No worries about being confused with the app. Let me walk you through finding restaurants and adding items to your cart."

### DIETARY & ALLERGIES
- Allergy concerns: "Food allergies are very serious. Let me help you find safe options and ensure restaurants are aware of your dietary restrictions."
- Special diets: "I'd be happy to help you find options that fit your dietary needs. We have filters to help find vegetarian, vegan, and other specific options."

### DELIVERY TIME QUESTIONS
When users ask about delivery times, estimates, or "how long", always provide helpful time estimates:
- General delivery time: "Our typical delivery time is 30-45 minutes from when your order is confirmed, depending on your location and the restaurant's preparation time."
- Specific time inquiry: "Delivery times usually range from 30-45 minutes. During peak hours (lunch 12-2PM and dinner 6-9PM), it might take a bit longer due to higher demand."
- Estimate questions: "For delivery estimates, it typically takes 30-45 minutes total. If you have a specific order, I can track it for you!"
- Rush orders: "Unfortunately, we can't guarantee faster delivery, but most orders arrive within 30-45 minutes. Our riders work hard to get your food to you as quickly as possible."
- Location-based: "Delivery time depends on your distance from the restaurant. Nearby locations typically receive orders in 20-30 minutes, while farther areas may take up to 45 minutes."
- Weather delays: "During bad weather, delivery might take longer for safety reasons. We appreciate your patience during these times."
- Late delivery concerns: "If your order is taking longer than expected, let me check the status for you. Use the tracking feature or ask me to track your order."
- Order-specific estimates: "If you're asking about a specific order, I can track it and give you a more accurate estimate based on its current status."

## IMPORTANT COMMAND USAGE
Use these special commands when the user requests these actions:

- Use "TRACK_ORDER:" when user asks to track an order, check order status, or asks "where is my order"
- Use "TRACK_ORDER: [order_id]" when user provides a specific order number to track
- Use "ADD_TO_CART_FROM_ORDER:" when user asks to add items from previous orders to cart, reorder, repeat order, or add last/previous order to cart
- Use "ADD_TO_CART: [foodId] [quantity]" when user asks to add specific menu items to cart
- Use "SHOW_CART:" when user asks to see their current cart contents

When users mention wanting to repeat an order, reorder, or add their previous order to cart, proactively use ADD_TO_CART_FROM_ORDER: to help them.

For questions about capabilities, services, or "what can you do", provide the capabilities response directly without any commands.

Remember: You are a customer support assistant who can help add items to cart, NOT a complete ordering system. Help customers with their questions and cart management, but direct them to the app's checkout for completing purchases. Be helpful, empathetic, and solution-focused.`;

    // Get conversation history from database
    const dbHistory = await getConversationHistory(userId);
    
    // Build context with system prompt and conversation history
    const contextMessages = [
      { role: "system" as const, content: systemPrompt },
      ...dbHistory
    ];
    
    // Get response from Google Gemini
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;
    
    let aiResponse = "I'm here to help! You can ask me about orders, delivery times, menu items, or I can help you add items to your cart.";
    
    try {
      const geminiModel = getGeminiModel();
      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      aiResponse = response.text() || "I'm sorry, I couldn't process that. Can you try again?";
    } catch (geminiError) {
      console.error("Gemini API error:", geminiError);
      // Use a helpful fallback response instead of error message
      aiResponse = "I'm here to help! You can ask me about orders, delivery times, menu items, or I can help you add items to your cart.";
    }
    
    // Check if user's message indicates they want specific actions
    const userWantsTracking = /track|status|where.*order|order.*status|check.*order/i.test(message);
    const userWantsToAddPreviousOrder = /add.*previous.*order|add.*last.*order|reorder|repeat.*order|same.*order|order.*again/i.test(message);
    const userWantsToAddToCart = /add.*cart|add.*to.*cart/i.test(message);
    const userWantsToSeeCart = /show.*cart|view.*cart|what.*cart|cart.*contents/i.test(message);
    const userWantsSpecificItems = /add.*\d+|(\d+\s+\w+)|(\w+\s+x\d+)|add.*\w+.*cart|add.*\w+.*to/i.test(message);
    
    // Handle special AI commands for customer support actions (only if user actually requested them)
    if (aiResponse.includes("TRACK_ORDER:") && userWantsTracking) {
      // Parse order IDs from the message - supports "order 4, 5, 6" or "all orders"
      let orderIds: number[] = [];
      const trackAllMatch = /all.*orders?|status.*all|orders?.*status/i.test(message);
      
      if (!trackAllMatch) {
        const orderNumberMatches = message.match(/order\s+(\d+(?:\s*,\s*\d+)*)/i);
        if (orderNumberMatches) {
          orderIds = orderNumberMatches[1].split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else {
          const singleMatch = aiResponse.match(/TRACK_ORDER:\s*(\d+)?/i);
          if (singleMatch && singleMatch[1]) {
            orderIds = [parseInt(singleMatch[1])];
          }
        }
      }
      
      const trackResult = await getOrderStatus(userId, orderIds.length > 0 ? orderIds : undefined);
      
      if (trackResult.found && trackResult.orders) {
        if (trackResult.multiple && trackResult.orders.length > 1) {
          // Multiple orders response
          const orderStatusList = trackResult.orders.map((orderDetail: any) => {
            const statusEmoji = {
              'placed': '📝',
              'confirmed': '✅', 
              'preparing': '👨‍🍳',
              'cooking': '🔥',
              'ready': '🍽️',
              'dispatched': '🚴‍♂️',
              'delivered': '✅'
            }[orderDetail.order.status as string] || '📦';
            
            return `${statusEmoji} Order #${orderDetail.order.id}: ${orderDetail.order.status.toUpperCase()} - ₦${orderDetail.order.total}`;
          }).join('\n');
          
          aiResponse = `Here's the status of your orders:\n\n${orderStatusList}\n\nWould you like more details about any specific order?`;
        } else if (trackResult.orders.length > 0) {
          // Single order detailed response
          const orderDetail = trackResult.orders[0];
          const statusEmoji = {
            'placed': '📝',
            'confirmed': '✅', 
            'preparing': '👨‍🍳',
            'cooking': '🔥',
            'ready': '🍽️',
            'dispatched': '🚴‍♂️',
            'delivered': '✅'
          }[orderDetail.order.status as string] || '📦';
          
          // Add delivery time estimates based on status
          let estimateText = '';
          if (orderDetail.order.status === 'placed' || orderDetail.order.status === 'confirmed') {
            estimateText = '\nEstimated delivery: 30-45 minutes from order confirmation.';
          } else if (orderDetail.order.status === 'preparing' || orderDetail.order.status === 'cooking') {
            estimateText = '\nEstimated delivery: 20-30 minutes (food is being prepared).';
          } else if (orderDetail.order.status === 'ready') {
            estimateText = '\nEstimated delivery: 10-20 minutes (ready for pickup by rider).';
          } else if (orderDetail.order.status === 'dispatched' || orderDetail.order.status === 'picked_up') {
            estimateText = '\nEstimated delivery: 5-15 minutes (rider is on the way).';
          } else if (orderDetail.order.status === 'delivered') {
            estimateText = '\nOrder completed - delivered successfully!';
          }

          aiResponse = `${statusEmoji} Order #${orderDetail.order.id} Status: ${orderDetail.order.status.toUpperCase()}

Items: ${orderDetail.itemDetails}
Total: ₦${orderDetail.order.total}${estimateText}

${orderDetail.order.status === 'delivered' ? 'Your order has been delivered! Enjoy your meal!' : 
  orderDetail.order.status === 'dispatched' || orderDetail.order.status === 'picked_up' ? 'Your order is on the way! The rider should arrive soon.' :
  orderDetail.order.status === 'cooking' || orderDetail.order.status === 'preparing' ? 'Your food is being prepared right now.' :
  'Your order is being processed.'}`;
        }
      } else {
        if (orderIds.length > 0) {
          aiResponse = `I couldn't find orders #${orderIds.join(', ')} for your account. Please check the order numbers.`;
        } else {
          aiResponse = `You don't have any recent orders to track.`;
        }
      }
    }
    // Handle specific menu items first (higher priority)
    else if (userWantsSpecificItems && userWantsToAddToCart) {
      const menuItems = await getMenuItems();
      const parsedItems = parseMenuItemsFromMessage(message, menuItems);
      
      if (parsedItems.length > 0) {
        const successfulItems: string[] = [];
        const failedItems: string[] = [];
        
        // Add each parsed item to cart
        for (const item of parsedItems) {
          const success = await addToCart(userId, item.foodId, item.quantity);
          if (success) {
            successfulItems.push(`${item.quantity}x ${item.name}`);
          } else {
            failedItems.push(`${item.quantity}x ${item.name}`);
          }
        }
        
        if (successfulItems.length > 0) {
          aiResponse = `Great! I've added these items to your cart:

${successfulItems.join('\n')}`;
          
          if (failedItems.length > 0) {
            aiResponse += `\n\nI couldn't add these items (they might not be available):\n${failedItems.join('\n')}`;
          }
          
          aiResponse += `\n\nYou can continue shopping or proceed to checkout in the app!`;
        } else {
          aiResponse = `I couldn't find any of those items on our menu. Here are our available items:

${menuItems.slice(0, 5).map(item => `• ${item.name} - ₦${item.price}`).join('\n')}

Would you like to add any of these to your cart?`;
        }
      } else {
        aiResponse = `I couldn't understand which specific items you'd like to add. Could you try something like "add 2 jollof rice and 1 meat pie to my cart"?`;
      }
    }
    else if ((aiResponse.includes("ADD_TO_CART_FROM_ORDER:") || userWantsToAddPreviousOrder) && userWantsToAddPreviousOrder) {
      const cartResult = await addLastOrderToCart(userId);
      if (cartResult.success && cartResult.items && cartResult.items.length > 0) {
        aiResponse = `Great! I've added items from your last order to your cart:

Items added:
${cartResult.items.join('\n')}

Total value: ₦${cartResult.total}

You can now proceed to checkout in the app to complete your order!`;
      } else {
        aiResponse = `I couldn't find a previous order to add to your cart. Would you like to browse our menu and add items manually?`;
      }
    }
    else if (aiResponse.includes("ADD_TO_CART:") || (userWantsSpecificItems && userWantsToAddToCart)) {
      // Handle AI-generated ADD_TO_CART commands
      const addMatch = aiResponse.match(/ADD_TO_CART:\s*(\d+)\s*(\d+)/i);
      if (addMatch) {
        const foodId = parseInt(addMatch[1]);
        const quantity = parseInt(addMatch[2]);
        const success = await addToCart(userId, foodId, quantity);
        
        if (success) {
          const menuItems = await getMenuItems();
          const food = menuItems.find(f => f.id === foodId);
          aiResponse = `Perfect! I've added ${quantity}x ${food?.name || 'item'} to your cart.

You can continue shopping or proceed to checkout in the app to complete your order!`;
        } else {
          aiResponse = `Sorry, I had trouble adding that item to your cart. Please try again or add it manually through the app.`;
        }
      }
      // Handle natural language menu item requests
      else if (userWantsSpecificItems && userWantsToAddToCart) {
        const menuItems = await getMenuItems();
        const parsedItems = parseMenuItemsFromMessage(message, menuItems);
        
        if (parsedItems.length > 0) {
          const successfulItems: string[] = [];
          const failedItems: string[] = [];
          
          // Add each parsed item to cart
          for (const item of parsedItems) {
            const success = await addToCart(userId, item.foodId, item.quantity);
            if (success) {
              successfulItems.push(`${item.quantity}x ${item.name}`);
            } else {
              failedItems.push(`${item.quantity}x ${item.name}`);
            }
          }
          
          if (successfulItems.length > 0) {
            aiResponse = `Great! I've added these items to your cart:

${successfulItems.join('\n')}`;
            
            if (failedItems.length > 0) {
              aiResponse += `\n\nI couldn't add these items (they might not be available):\n${failedItems.join('\n')}`;
            }
            
            aiResponse += `\n\nYou can continue shopping or proceed to checkout in the app!`;
          } else {
            aiResponse = `I couldn't find any of those items on our menu. Here are our available items:

${menuItems.slice(0, 5).map(item => `• ${item.name} - ₦${item.price}`).join('\n')}

Would you like to add any of these to your cart?`;
          }
        } else {
          aiResponse = `I couldn't understand which specific items you'd like to add. Could you try something like "add 2 jollof rice and 1 meat pie to my cart"?`;
        }
      }
    }
    else if (aiResponse.includes("SHOW_CART:") && userWantsToSeeCart) {
      const cart = await getCartItems(userId);
      if (cart.items.length > 0) {
        const itemsList = cart.items.map((item: any) => `${item.quantity}x ${item.foodName} - ₦${item.total}`).join('\n');
        aiResponse = `Here's what's currently in your cart:

${itemsList}

Total: ₦${cart.total}
Items: ${cart.count}

Ready to checkout? Head to the app to complete your order!`;
      } else {
        aiResponse = `Your cart is currently empty. Would you like me to help you find some delicious items to add?`;
      }
    }
    else if (aiResponse.includes("TRACK_ORDER:") || aiResponse.includes("ADD_TO_CART") || aiResponse.includes("SHOW_CART:")) {
      // If AI generated these commands but user didn't request them, strip them out
      aiResponse = aiResponse.replace(/TRACK_ORDER:\s*\d*/gi, '')
                            .replace(/ADD_TO_CART_FROM_ORDER:/gi, '')
                            .replace(/ADD_TO_CART:\s*\d+\s*\d*/gi, '')
                            .replace(/SHOW_CART:/gi, '')
                            .trim();
      
      // If the response is now empty or very short, provide a fallback
      if (aiResponse.length < 20) {
        aiResponse = "I'm here to help! You can ask me about orders, delivery times, menu items, or I can help you add items to your cart.";
      }
    }

    
    // The AI response is already saved to database via the routes handler
    
    return aiResponse;
  } catch (error) {
    console.error("Error in chat service:", error);
    
    // Provide a fallback response if Gemini request fails
    return "I'm sorry, I'm having trouble connecting to our servers right now. Please try again in a moment.";
  }
}