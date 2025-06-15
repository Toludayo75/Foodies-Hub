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
import { startWebSocketServer } from "./chat";
import { handleChatMessage } from "./chatService";
import adminRouter from './adminRoutes';
import orderRouter from './orderRoutes';
import riderRouter from './riderRoutes';
import { notificationRouter } from './notificationRoutes';
import { supportRouter } from './supportRoutes';
import { walletRouter } from './walletRoutes';
import { debitWallet, checkSufficientBalance } from './walletService';
import { db } from './drizzle';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';

import {
  insertUserSchema,
  insertAddressSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertMessageSchema,
  insertPaymentMethodSchema,
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

  // Wallet routes
  app.use('/api/wallet', walletRouter);

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

        // Create wallet for new user
        try {
          await db.insert(schema.wallets).values({
            userId: user.id,
            balance: 0,
            currency: 'NGN',
            status: 'active'
          });
          console.log("Wallet created successfully for user:", user.id);
        } catch (walletError) {
          console.error("Error creating wallet for user:", user.id, walletError);
        }

        // Set session
        req.session.userId = user.id;

        // Don't return password
        const { password: _, ...userWithoutPassword } = user;
        
        res.status(201).json({ 
          message: "User registered successfully", 
          user: userWithoutPassword 
        });

      } catch (dbError: any) {
        console.error("Database error during registration:", dbError);
        
        if (dbError.code === '23505') { // PostgreSQL unique violation
          return res.status(400).json({ message: "Email already in use" });
        }
        
        throw dbError;
      }

    } catch (error: any) {
      console.error("Registration error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Registration failed", 
        error: error.message 
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("Login attempt with email:", email);

      // Find user by email using direct DB query
      const users = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.email, email)
      });

      const user = users[0];

      if (!user) {
        console.log("User not found for email:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("User found, checking password for user ID:", user.id);

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log("Password check failed for user ID:", user.id);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Password check successful for user ID:", user.id);

      // Set session
      req.session.userId = user.id;

      console.log("Session set for user ID:", user.id);

      // Don't return password
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ 
        message: "Login successful", 
        user: userWithoutPassword 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ 
        message: "Login failed", 
        error: error.message 
      });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  // Categories Routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  // Foods Routes
  app.get('/api/foods', async (req, res) => {
    try {
      const { category } = req.query;
      const categoryId = category ? parseInt(category as string) : undefined;
      const foods = await storage.getFoods(categoryId);
      res.json(foods);
    } catch (error) {
      console.error("Error fetching foods:", error);
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
      console.error("Error fetching food:", error);
      res.status(500).json({ message: "Error fetching food" });
    }
  });

  // Cart Routes
  app.get('/api/cart', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const cartItems = await storage.getCartItems(userId);
      
      // Enrich cart items with food details
      const cartWithDetails = await Promise.all(
        cartItems.map(async (item) => {
          const food = await storage.getFood(item.foodId);
          return {
            id: item.id,
            name: food?.name || 'Unknown item',
            description: food?.description || '',
            price: food?.price || 0,
            image: food?.image || '',
            quantity: item.quantity,
            foodId: item.foodId
          };
        })
      );
      
      res.json(cartWithDetails);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Error fetching cart" });
    }
  });

  app.post('/api/cart', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { foodId, quantity } = req.body;

      if (!foodId || !quantity) {
        return res.status(400).json({ message: "Food ID and quantity are required" });
      }

      // Check if item already exists in cart
      const existingCartItems = await storage.getCartItems(userId);
      const existingItem = existingCartItems.find(item => item.foodId === foodId);

      if (existingItem) {
        // Update quantity
        await storage.updateCartItemQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Add new item
        await storage.addToCart(userId, foodId, quantity);
      }

      const updatedCart = await storage.getCartItems(userId);
      
      // Enrich cart items with food details
      const cartWithDetails = await Promise.all(
        updatedCart.map(async (item) => {
          const food = await storage.getFood(item.foodId);
          return {
            id: item.id,
            name: food?.name || 'Unknown item',
            description: food?.description || '',
            price: food?.price || 0,
            image: food?.image || '',
            quantity: item.quantity,
            foodId: item.foodId
          };
        })
      );
      
      res.json(cartWithDetails);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Error adding to cart" });
    }
  });

  app.put('/api/cart/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      const userId = req.session.userId as number;

      console.log(`Updating cart item ID: ${id}, quantity: ${quantity} for user: ${userId}`);

      // Verify the cart item belongs to the user
      const cartItems = await storage.getCartItems(userId);
      const cartItem = cartItems.find(item => item.id === id);
      
      if (!cartItem) {
        console.log(`Cart item ${id} not found for user ${userId}`);
        console.log(`Available cart items:`, cartItems.map(item => ({ id: item.id, foodId: item.foodId })));
        return res.status(404).json({ message: "Cart item not found" });
      }

      if (quantity <= 0) {
        await storage.removeFromCart(id);
      } else {
        await storage.updateCartItemQuantity(id, quantity);
      }

      const updatedCart = await storage.getCartItems(userId);
      
      // Enrich cart items with food details
      const cartWithDetails = await Promise.all(
        updatedCart.map(async (item) => {
          const food = await storage.getFood(item.foodId);
          return {
            id: item.id,
            name: food?.name || 'Unknown item',
            description: food?.description || '',
            price: food?.price || 0,
            image: food?.image || '',
            quantity: item.quantity,
            foodId: item.foodId
          };
        })
      );
      
      res.json(cartWithDetails);
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ message: "Error updating cart" });
    }
  });

  app.delete('/api/cart/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Verify the cart item belongs to the user
      const cartItems = await storage.getCartItems(userId);
      const cartItem = cartItems.find(item => item.id === id);
      
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      await storage.removeFromCart(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Error removing from cart" });
    }
  });

  app.delete('/api/cart', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Error clearing cart" });
    }
  });

  // Orders Routes
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

  // Addresses Routes
  app.get('/api/addresses', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const addresses = await storage.getAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
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
      console.error("Error creating address:", error);
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
      console.error("Error updating address:", error);
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
      console.error("Error deleting address:", error);
      res.status(500).json({ message: "Error deleting address" });
    }
  });

  // Chat Routes
  app.get('/api/chat/messages', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const messages = await storage.getMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  app.post('/api/chat/messages', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Store user message
      const userMessageData = insertMessageSchema.parse({
        userId,
        content,
        isFromUser: true
      });

      await storage.createMessage(userMessageData);

      // Generate AI response
      const aiResponse = await handleChatMessage(userId, content);

      // Store AI response
      const aiMessageData = insertMessageSchema.parse({
        userId,
        content: aiResponse,
        isFromUser: false
      });

      await storage.createMessage(aiMessageData);

      // Return AI response
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error handling chat message:", error);
      res.status(500).json({ message: "Error processing message" });
    }
  });

  // User profile update routes
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

  // Profile image upload endpoint with express-fileupload
  app.post('/api/user/profile-image', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;

      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      // Handle the file upload - assuming the field name is 'profileImage'
      const profileImage = Array.isArray(req.files.profileImage) 
        ? req.files.profileImage[0] 
        : req.files.profileImage as UploadedFile;

      if (!profileImage) {
        return res.status(400).json({ message: "Profile image field not found" });
      }

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

  // Payment Methods API routes
  app.get('/api/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const paymentMethods = await storage.getUserPaymentMethods(userId);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Error fetching payment methods" });
    }
  });

  app.post('/api/payment-methods', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const { cardNumber, expiryMonth, expiryYear, cvv, cardholderName, nickname } = req.body;

      // Basic validation
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
        return res.status(400).json({ message: "All card details are required" });
      }

      // Get card brand and last 4 digits
      const cardLast4 = cardNumber.replace(/\D/g, '').slice(-4);
      const cardBrand = getCardBrand(cardNumber.replace(/\D/g, ''));

      // Create payment method data
      const paymentMethodData = insertPaymentMethodSchema.parse({
        userId,
        type: 'card',
        provider: 'paystack',
        cardLast4,
        cardBrand: cardBrand.toLowerCase(),
        expiryMonth,
        expiryYear,
        cardholderName,
        nickname: nickname || null,
        isDefault: false,
        isActive: true
      });

      const paymentMethod = await storage.createPaymentMethod(paymentMethodData);
      
      // If this is the first payment method, make it default
      const userPaymentMethods = await storage.getUserPaymentMethods(userId);
      if (userPaymentMethods.length === 1) {
        await storage.updatePaymentMethod(paymentMethod.id, { isDefault: true });
      }

      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: "Error creating payment method" });
    }
  });

  app.put('/api/payment-methods/:id/default', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Verify the payment method belongs to the user
      const paymentMethod = await storage.getPaymentMethod(id);
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      // Remove default from all other payment methods
      const userPaymentMethods = await storage.getUserPaymentMethods(userId);
      for (const method of userPaymentMethods) {
        if (method.isDefault) {
          await storage.updatePaymentMethod(method.id, { isDefault: false });
        }
      }

      // Set this one as default
      const updatedPaymentMethod = await storage.updatePaymentMethod(id, { isDefault: true });
      res.json(updatedPaymentMethod);
    } catch (error) {
      console.error("Error setting default payment method:", error);
      res.status(500).json({ message: "Error setting default payment method" });
    }
  });

  app.delete('/api/payment-methods/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.userId as number;

      // Verify the payment method belongs to the user
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

  // Helper function to determine card brand
  function getCardBrand(cardNumber: string): string {
    if (cardNumber.startsWith('4')) return 'Visa';
    if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) return 'Mastercard';
    if (cardNumber.startsWith('3')) return 'American Express';
    return 'Unknown';
  }

  // File upload route
  app.post('/api/upload', upload.single('file'), uploadHandler);

  const server = createServer(app);
  
  // Start WebSocket server
  startWebSocketServer(app);
  
  return server;
}