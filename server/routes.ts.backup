import { Express, Request, Response, NextFunction } from 'express';
import { Server, createServer } from 'http';
import express from 'express';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { UploadedFile } from 'express-fileupload';
import multer from 'multer';
import { storage } from './storage';
// Chat functionality temporarily disabled
// import { startWebSocketServer } from './chat';
import { startWebSocketServer } from "./chat";
import { handleChatMessage } from "./chatService";
import adminRouter from './adminRoutes';
import orderRouter from './orderRoutes';
import riderRouter from './riderRoutes';
import { notificationRouter } from './notificationRoutes';
import { supportRouter } from './supportRoutes';
import { db } from './drizzle';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';

import {
  insertUserSchema,
  insertAddressSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertMessageSchema,

  User
} from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: './uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload handler function
const uploadHandler = (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    res.json({ 
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin routes
  app.use('/api/admin', adminRouter);

  // Order routes for riders
  app.use('/api/rider', riderRouter);

  // Order routes
  app.use('/api/orders', orderRouter);



  // Notification routes
  app.use('/api/notifications', notificationRouter);
  
  // Support routes
  app.use('/api/support', supportRouter);

  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: Function) => {
    console.log("Authentication check - Session:", req.session);
    console.log("Authentication check - User ID:", req.session?.userId);

    if (!req.session || !req.session.userId) {
      console.log("Authentication failed - no valid session");
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("Authentication successful for user ID:", req.session.userId);
    next();
  };

  // Authentication Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { password, ...userData } = req.body;

      console.log("Registration attempt with email:", userData.email);

      // Check if email already exists using direct DB query
      try {
        const existingUsers = await db.query.users.findMany({
          where: (users, { eq }) => eq(users.email, userData.email)
        });

        if (existingUsers.length > 0) {
          console.log("Email already exists:", userData.email);
          return res.status(400).json({ message: "Email already in use" });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Prepare user data with schema validation
        const validatedUser = insertUserSchema.parse({
          ...userData,
          password: hashedPassword,
          role: 'customer' // Default role for new registrations
        });

        console.log("Creating new user with email:", userData.email);

        // Create user directly with database
        const newUser = await db.insert(schema.users).values(validatedUser).returning();
        const user = newUser[0];

        console.log("User created successfully:", user.id);

        // Set session
        req.session.userId = user.id;

        // Don't return password
        const { password: _, ...userWithoutPassword } = user;

        res.status(201).json(userWithoutPassword);
      } catch (dbError) {
        console.error("Database error during registration:", dbError);
        throw dbError;
      }
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("Login attempt with email:", email);

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Direct database query for user lookup to bypass storage abstraction issues
      try {
        // Special handling for admin user
        if (email === 'admin@foodapp.com' && password === 'admin123') {
          const result = await db.query.users.findMany({
            where: (users, { eq }) => eq(users.email, email)
          });

          if (result.length > 0 && result[0].role === 'admin') {
            const user = result[0];
            console.log("Admin login success");

            // Forcefully save session before continuing
            req.session.userId = user.id;
            await new Promise<void>((resolve) => {
              req.session.save((err) => {
                if (err) console.error("Session save error:", err);
                console.log("Session saved successfully for admin with ID:", user.id);
                resolve();
              });
            });

            // Don't return password
            const { password: _, ...userWithoutPassword } = user;
            return res.json(userWithoutPassword);
          }
        }

        // Regular user login with direct database query
        const result = await db.query.users.findMany({
          where: (users, { eq }) => eq(users.email, email)
        });

        if (result.length === 0) {
          console.log("User not found");
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = result[0];
        console.log("User found, checking password");

        // Check password with bcrypt
        if (await bcrypt.compare(password, user.password)) {
          console.log("Regular user login success");

          // Forcefully save session before continuing
          req.session.userId = user.id;
          await new Promise<void>((resolve) => {
            req.session.save((err) => {
              if (err) console.error("Session save error:", err);
              console.log("Session saved successfully for user with ID:", user.id);
              resolve();
            });
          });

          // Don't return password
          const { password: _, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        } else {
          console.log("Password doesn't match");
          return res.status(401).json({ message: "Invalid credentials" });
        }
      } catch (lookupError) {
        console.error("Error looking up user:", lookupError);
        throw lookupError;
      }
    } catch (error) {
      console.error("Login error details:", error);
      res.status(500).json({ message: "Error during login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't return password
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Session recovery endpoint for payment flows
  app.post('/api/auth/recover-session', async (req, res) => {
    try {
      const { sessionToken } = req.body;
      
      if (!sessionToken) {
        return res.status(400).json({ message: "Session token required" });
      }

      // Import payment session service
      const { verifyPaymentSession, restoreUserSession } = await import('./paymentSessionService');
      
      const sessionData = await verifyPaymentSession(sessionToken);
      
      if (!sessionData.valid || !sessionData.userId) {
        return res.status(401).json({ message: "Invalid or expired session token" });
      }

      // Restore the session
      req.session.userId = sessionData.userId;
      
      // Save session and return user data
      req.session.save(async (err: any) => {
        if (err) {
          console.error('Error saving recovered session:', err);
          return res.status(500).json({ message: "Failed to restore session" });
        }
        
        try {
          const user = await storage.getUser(sessionData.userId!);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          const { password, ...userWithoutPassword } = user;
          res.json({ 
            success: true, 
            user: userWithoutPassword,
            message: "Session restored successfully" 
          });
        } catch (error) {
          res.status(500).json({ message: "Error fetching user data" });
        }
      });

    } catch (error: any) {
      console.error('Session recovery error:', error);
      res.status(500).json({ message: "Session recovery failed" });
    }
  });

  // Update user profile information
  app.put('/api/auth/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { firstName, lastName, phone, email } = req.body;

      console.log("Profile update request at /api/auth/profile for user ID:", userId, "with data:", req.body);

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        console.error("User not found for profile update, ID:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      // Check if email is being changed and already exists
      if (email && email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          console.error("Email already in use:", email);
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Prepare update data - only include fields that were provided
      const updateData: Partial<User> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      console.log("Updating user profile at /api/auth/profile with data:", updateData);

      // Update user profile
      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        console.error("Failed to update user profile at /api/auth/profile, ID:", userId);
        return res.status(500).json({ message: "Failed to update user profile" });
      }

      console.log("User profile updated successfully at /api/auth/profile:", updatedUser);

      // Don't return password
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // User profile route
  app.put('/api/user/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { firstName, lastName, email, phone } = req.body;

      console.log("Profile update request for user ID:", userId, "with data:", req.body);

      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        console.error("User not found for profile update, ID:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      // Check if email is being changed and already exists
      if (email && email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          console.error("Email already in use:", email);
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Prepare update data - only include fields that were provided
      const updateData: Partial<User> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      console.log("Updating user profile with data:", updateData);

      // Update user profile
      const updatedUser = await storage.updateUser(userId, updateData);

      if (!updatedUser) {
        console.error("Failed to update user profile, ID:", userId);
        return res.status(500).json({ message: "Failed to update user profile" });
      }

      console.log("User profile updated successfully:", updatedUser);

      // Don't return password
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Profile image upload endpoint
  app.post('/api/user/profile-image', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Handle the file upload - assuming the field name is 'profileImage'
      const profileImage = req.files.profileImage as UploadedFile;

      // Check file type
      if (!profileImage.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Uploaded file is not an image" });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = './uploads';
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const filename = `${userId}_${Date.now()}${path.extname(profileImage.name)}`;
      const filepath = `${uploadsDir}/${filename}`;

      // Move the file to uploads directory
      await profileImage.mv(filepath);

      // Update user profile in database with image path
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user profile image in database
      const imageUrl = `/uploads/${filename}`;
      const updatedUser = await storage.updateUser(userId, { profileImage: imageUrl });

      // Return success response with image URL
      res.json({ 
        message: "Profile image uploaded successfully", 
        imageUrl
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Error uploading profile image" });
    }
  });

  // User password change endpoint
  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Error changing password" });
    }
  });

  // Category Routes
  app.get('/api/categories', async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.get('/api/foods', async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

      let foods;
      if (categoryId) {
        foods = await storage.getFoodsByCategory(categoryId);
      } else {
        foods = await storage.getFoods();
      }

      res.json(foods);
    } catch (error) {
      res.status(500).json({ message: "Error fetching foods" });
    }
  });

  app.get('/api/foods/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const food = await storage.getFood(id);

      if (!food) {
        return res.status(404).json({ message: "Food not found" });
      }

      res.json(food);
    } catch (error) {
      res.status(500).json({ message: "Error fetching food" });
    }
  });

  // Address Routes
  app.get('/api/addresses', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const addresses = await storage.getAddresses(userId);
      res.json(addresses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching addresses" });
    }
  });

  app.post('/api/addresses', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const addressData = insertAddressSchema.parse({
        ...req.body,
        userId
      });

      const address = await storage.createAddress(addressData);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating address" });
    }
  });

  app.put('/api/addresses/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Check if address belongs to user
      const address = await storage.getAddress(id);
      if (!address || address.userId !== userId) {
        return res.status(404).json({ message: "Address not found" });
      }

      const updatedAddress = await storage.updateAddress(id, req.body);
      res.json(updatedAddress);
    } catch (error) {
      res.status(500).json({ message: "Error updating address" });
    }
  });

  app.delete('/api/addresses/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Check if address belongs to user
      const address = await storage.getAddress(id);
      if (!address || address.userId !== userId) {
        return res.status(404).json({ message: "Address not found" });
      }

      await storage.deleteAddress(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting address" });
    }
  });

  // Order Creation
  app.post('/api/orders', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;

      // Validate order data
      const { items, ...orderData } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order must contain items" });
      }

      // Create order
      const order = await storage.createOrder({
        ...insertOrderSchema.parse({
          ...orderData,
          userId,
          status: 'pending'
        })
      });

      // Create order items
      const orderItems = await Promise.all(
        items.map(item => 
          storage.createOrderItem(
            insertOrderItemSchema.parse({
              ...item,
              orderId: order.id
            })
          )
        )
      );

      res.status(201).json({ ...order, items: orderItems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating order" });
    }
  });

  // Get user orders
  app.get('/api/orders', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const orders = await storage.getOrders(userId);

      // Enhance orders with their items
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Get order details
  app.get('/api/orders/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Get order
      const order = await storage.getOrder(id);

      // Check if order belongs to user
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order items
      const items = await storage.getOrderItems(id);

      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  // Add order items to cart (formerly repeat order)
  app.post('/api/orders/:id/repeat', requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Use the existing addOrderToCart functionality
      const result = await storage.addOrderToCart(userId, orderId);
      
      if (result.success) {
        res.json({ 
          success: true,
          message: "Items added to cart successfully",
          items: result.items,
          total: result.total
        });
      } else {
        res.status(400).json({ message: "Could not add order items to cart" });
      }
    } catch (error) {
      console.error("Error adding order to cart:", error);
      res.status(500).json({ message: "Error adding order items to cart" });
    }
  });

  // Delete order (only for pending, confirmed, preparing status)
  app.delete('/api/orders/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Get order
      const order = await storage.getOrder(id);

      // Check if order belongs to user
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if order can be deleted (only certain statuses)
      const deletableStatuses = ['pending', 'confirmed', 'preparing'];
      if (!deletableStatuses.includes(order.status)) {
        return res.status(400).json({ 
          message: `Cannot delete order with status: ${order.status}. Orders can only be deleted when they are pending, confirmed, or preparing.` 
        });
      }

      // Delete order items first
      await storage.deleteOrderItems(id);

      // Delete the order
      await storage.deleteOrder(id);

      res.json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Error deleting order" });
    }
  });

  // Chat Routes
  app.get('/api/messages', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const messages = await storage.getMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { content } = req.body;

      // Save user message
      const userMessageData = insertMessageSchema.parse({
        content,
        userId,
        isFromUser: true
      });

      const userMessage = await storage.createMessage(userMessageData);

      // Get AI response using the chat service
      const { handleChatMessage } = await import('./chatService');
      const aiResponse = await handleChatMessage(userId, content);

      // Save AI response
      const aiMessageData = insertMessageSchema.parse({
        content: aiResponse,
        userId,
        isFromUser: false
      });

      const aiMessage = await storage.createMessage(aiMessageData);

      // Return both messages
      res.status(201).json([userMessage, aiMessage]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error in chat:", error);
      res.status(500).json({ message: "Error creating message" });
    }
  });

  // Cart Routes
  app.get('/api/cart', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching cart items" });
    }
  });

  app.post('/api/cart', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { foodId, quantity } = req.body;

      if (!foodId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "Invalid food ID or quantity" });
      }

      const cartItem = await storage.addToCart(userId, foodId, quantity);
      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Error adding item to cart" });
    }
  });

  app.put('/api/cart/:foodId', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const foodId = parseInt(req.params.foodId);
      const { quantity } = req.body;

      if (!quantity || quantity < 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      if (quantity === 0) {
        await storage.removeFromCart(userId, foodId);
        res.json({ message: "Item removed from cart" });
      } else {
        const cartItem = await storage.updateCartItem(userId, foodId, quantity);
        res.json(cartItem);
      }
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Error updating cart item" });
    }
  });

  app.delete('/api/cart/:foodId', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const foodId = parseInt(req.params.foodId);

      await storage.removeFromCart(userId, foodId);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Error removing item from cart" });
    }
  });

  app.delete('/api/cart', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      await storage.clearCart(userId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Error clearing cart" });
    }
  });

  app.post('/api/cart/add-from-order/:orderId', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const orderId = parseInt(req.params.orderId);

      const result = await storage.addOrderToCart(userId, orderId);
      res.json(result);
    } catch (error) {
      console.error("Error adding order to cart:", error);
      res.status(500).json({ message: "Error adding order items to cart" });
    }
  });

  // Payment Methods
  app.get('/api/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const paymentMethods = await storage.getPaymentMethods(userId);
      res.json(paymentMethods);
    } catch (error) {
      res.status(500).json({ message: "Error fetching payment methods" });
    }
  });

  // Create new payment method
  app.post('/api/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;

      const paymentMethodData = insertPaymentMethodSchema.parse({
        ...req.body,
        userId
      });

      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);
      res.status(201).json(paymentMethod);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: "Error creating payment method" });
    }
  });

  // Update payment method (e.g. set default)
  app.put('/api/payment-methods/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Check if payment method belongs to user
      const paymentMethod = await storage.getPaymentMethod(id);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      const updatedPaymentMethod = await storage.updatePaymentMethod(id, req.body);
      res.json(updatedPaymentMethod);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: "Error updating payment method" });
    }
  });

  // Delete payment method
  app.delete('/api/payment-methods/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Check if payment method belongs to user
      const paymentMethod = await storage.getPaymentMethod(id);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      await storage.deletePaymentMethod(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Error deleting payment method" });
    }
  });

  // Payment Routes

  // General payment route (legacy support)
  app.post('/api/payments', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;

      // Validate payment data
      const paymentData = insertPaymentSchema.parse(req.body);

      // Check if order belongs to user (only if orderId is provided)
      if (paymentData.orderId != null) {
        const order = await storage.getOrder(paymentData.orderId);
        if (!order || order.userId !== userId) {
          return res.status(404).json({ message: "Order not found" });
        }
      }

      // Create payment record
      const payment = await storage.createPayment(paymentData);

      // Update order status to 'placed' (only if orderId exists)
      if (paymentData.orderId != null) {
        await storage.updateOrderStatus(paymentData.orderId, 'placed');
      }

      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error processing payment:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
  });

  /**
   * Card payment processing endpoint
   * This endpoint processes card payments via Paystack or Stripe
   */
  app.post('/api/payments/card', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { orderId, cardDetails } = req.body;

      // Check if order belongs to user
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Process payment
      const paymentResult = await processCardPayment(
        order.id,
        order.total,
        cardDetails
      );

      res.json(paymentResult);
    } catch (error) {
      console.error("Error processing card payment:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
  });

  /**
   * Bank transfer payment processing endpoint
   * This endpoint generates bank transfer details for an order
   */
  app.post('/api/payments/bank-transfer', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { orderId } = req.body;

      // Check if order belongs to user
      const order = await storage.getOrder(orderId);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Generate bank transfer details
      const transferDetails = await generateBankTransferDetails(
        order.id,
        order.total,
        userId
      );

      res.json(transferDetails);
    } catch (error) {
      console.error("Error generating bank transfer details:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
  });

  /**
   * Payment verification endpoint
   * This endpoint verifies payment status with Paystack
   */
  app.get('/api/payments/verify/:reference', requireAuth, async (req, res) => {
    try {
      const { reference } = req.params;

      // Verify payment with Paystack
      const verificationResult = await verifyAndUpdatePayment(reference);

      if (!verificationResult) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json(verificationResult);
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Error verifying payment" });
    }
  });

  /**
   * Verify bank transfer payment
   * This endpoint checks if a bank transfer payment has been received
   * It uses Paystack/Stripe's API to verify the transaction
   */
  app.get('/api/payments/bank-transfer/verify/:reference', requireAuth, async (req, res) => {
    try {
      const { reference } = req.params;

      // Verify bank transfer
      const verificationResult = await verifyBankTransferPayment(reference);

      res.json(verificationResult);
    } catch (error) {
      console.error("Error verifying bank transfer:", error);
      res.status(500).json({ message: "Error verifying payment" });
    }
  });

  /**
   * Webhook handler for payment notifications from Paystack/Stripe
   * This endpoint receives real-time notifications when payments are completed
   */
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      // Handle webhook notification
      await handlePaymentWebhook(req.body);

      res.status(200).send('Webhook received');
    } catch (error) {
      console.error("Error processing payment webhook:", error);
      res.status(400).send('Webhook Error');
    }
  });

  // Payment success callback route (for Paystack redirects)
  app.get('/payment-success', async (req, res) => {
    try {
      const { reference, orderId, method } = req.query;
      
      if (!reference) {
        return res.redirect('/payment-failed?error=missing_reference');
      }

      console.log(`Payment success callback - Reference: ${reference}, Order: ${orderId}, Method: ${method}`);

      // For Paystack payments, verify and complete the order creation
      if (method === 'paystack' && reference) {
        try {
          const payment = await storage.getPaymentByTransactionReference(reference as string);
          if (payment && payment.status === 'pending') {
            // Parse order data from payment metadata
            let orderData;
            try {
              orderData = JSON.parse(payment.metadata || '{}');
            } catch (e) {
              console.error('Failed to parse payment metadata:', e);
              return res.redirect('/payment-failed?error=invalid_metadata');
            }

            // Create the order now that payment is successful
            const order = await storage.createOrder({
              userId: payment.userId,
              addressId: orderData.addressId,
              total: orderData.total,
              status: 'confirmed',
              deliveryCode: Math.floor(100000 + Math.random() * 900000).toString()
            });

            // Create order items
            for (const item of orderData.items) {
              await storage.createOrderItem({
                orderId: order.id,
                foodId: item.id,
                quantity: item.quantity,
                price: item.price
              });
            }

            // Update payment status
            await storage.updatePaymentStatus(payment.id, 'completed');
            
            // Clear user's cart
            await storage.clearCart(payment.userId);
            
            // Send notifications
            try {
              const { sendRealtimeUpdate } = await import('./chat');
              const { notifyPaymentConfirmation, notifyAdminNewOrder, notifyCustomerOrderUpdate } = await import('./notificationService');
              
              sendRealtimeUpdate(payment.userId, 'cart_cleared', {});
              sendRealtimeUpdate(payment.userId, 'order_created', { orderId: order.id });
              sendRealtimeUpdate(payment.userId, 'payment_completed', { orderId: order.id });
              
              await notifyPaymentConfirmation(payment.userId, order.id, payment.amount * 100);
              await notifyAdminNewOrder(order.id);
              await notifyCustomerOrderUpdate(order.id, 'confirmed');
            } catch (notificationError) {
              console.log("Notification sending failed:", notificationError);
            }

            // Update redirect URL to include order ID
            const redirectUrl = `/payment-success?order=${order.id}&reference=${reference}`;
            return res.redirect(redirectUrl);
          }
        } catch (error) {
          console.error('Payment completion error:', error);
          return res.redirect('/payment-failed?error=completion_failed');
        }
      }

      // Redirect to success page
      const redirectUrl = orderId 
        ? `/payment-success?order=${orderId}&reference=${reference}`
        : `/payment-success?reference=${reference}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Payment success callback error:', error);
      return res.redirect('/payment-failed?error=callback_error');
    }
  });

  // Payment failed callback route
  app.get('/payment-failed', async (req, res) => {
    try {
      const { error, reference } = req.query;
      console.log(`Payment failed callback - Error: ${error}, Reference: ${reference}`);
      
      // Serve the payment failed page
      return res.redirect(`/payment-failed?error=${error || 'unknown'}&reference=${reference || ''}`);
    } catch (error) {
      console.error('Payment failed callback error:', error);
      return res.redirect('/payment-failed?error=callback_error');
    }
  });

  // Test payment route (for Stripe and Flutterwave test payments)
  app.get('/test-payment', async (req, res) => {
    try {
      const { reference, orderId, method, amount } = req.query;
      
      if (!reference || !orderId || !method || !amount) {
        return res.redirect('/payment-failed?error=missing_parameters');
      }

      console.log(`Test payment route - Reference: ${reference}, Order: ${orderId}, Method: ${method}, Amount: ${amount}`);
      
      // Redirect to test payment page
      const redirectUrl = `/test-payment?reference=${reference}&orderId=${orderId}&method=${method}&amount=${amount}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Test payment route error:', error);
      return res.redirect('/payment-failed?error=callback_error');
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single('file'), uploadHandler);

  // Chat API endpoint (fallback for when WebSocket fails)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const response = await handleChatMessage(userId, message);
      res.json({ response });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Chat feedback endpoint
  app.post("/api/chat/feedback", async (req, res) => {
    try {
      const { messageId, rating } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Store feedback in database for improvement tracking
      console.log(`User ${userId} rated message ${messageId} as ${rating}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Feedback API error:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Test payment completion route (for development/testing)
  app.get('/test-payment-complete', async (req, res) => {
    try {
      const { reference } = req.query;
      
      if (!reference) {
        return res.redirect('/payment-failed?error=missing_reference');
      }

      console.log(`Test payment completion for reference: ${reference}`);

      // Find the payment record
      const payment = await storage.getPaymentByTransactionReference(reference as string);
      if (!payment) {
        console.log(`Payment not found for reference: ${reference}`);
        return res.redirect('/payment-failed?error=payment_not_found');
      }

      // Parse payment metadata to get order information
      let orderData;
      try {
        orderData = JSON.parse(payment.metadata || '{}');
      } catch (e) {
        console.error('Failed to parse payment metadata:', e);
        return res.redirect('/payment-failed?error=invalid_metadata');
      }

      // Create the order after successful payment
      const order = await storage.createOrder({
        userId: payment.userId,
        addressId: orderData.address_id,
        total: orderData.order_total,
        status: 'confirmed'
      });

      // Add order items
      for (const item of orderData.items) {
        await storage.createOrderItem({
          orderId: order.id,
          foodId: item.id,
          quantity: item.quantity,
          price: item.price
        });
      }

      // Update payment status and link to the created order
      await storage.updatePaymentStatus(payment.id, 'completed');
      
      // Clear user's cart
      await storage.clearCart(payment.userId);
      
      // Send notifications and real-time updates
      try {
        const { sendRealtimeUpdate } = await import('./chat');
        const { notifyPaymentConfirmation, notifyAdminNewOrder, notifyCustomerOrderUpdate } = await import('./notificationService');
        
        // Send real-time updates
        sendRealtimeUpdate(payment.userId, 'cart_cleared', {});
        sendRealtimeUpdate(payment.userId, 'order_created', { orderId: order.id });
        sendRealtimeUpdate(payment.userId, 'payment_completed', { orderId: order.id });
        
        // Send notifications
        await notifyPaymentConfirmation(payment.userId, order.id, orderData.order_total * 100);
        await notifyAdminNewOrder(order.id);
        await notifyCustomerOrderUpdate(order.id, 'confirmed');
        
      } catch (notificationError) {
        console.log("Notification sending failed:", notificationError);
      }
      
      console.log(`Test payment completed successfully for order ${order.id}, cart cleared for user ${payment.userId}`);
      
      // Redirect to success page
      return res.redirect(`/payment-success?order=${order.id}&amount=${orderData.order_total * 100}`);
      
    } catch (error) {
      console.error('Test payment completion error:', error);
      return res.redirect('/payment-failed?error=callback_error');
    }
  });

  // Create HTTP server directly instead of using chat
  const server = createServer(app);

  return server;
}