import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),
  profileImage: text("profile_image"),
  role: text("role").default("customer"), // Options: customer, rider, admin
});

export const insertUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Addresses
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  isDefault: boolean("is_default").default(false),
});

export const insertAddressSchema = createInsertSchema(addresses).pick({
  userId: true,
  name: true,
  address: true,
  isDefault: true,
});

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

// Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  icon: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Foods
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  image: text("image").notNull(),
  categoryId: integer("category_id").notNull(),
});

export const insertFoodSchema = createInsertSchema(foods).pick({
  name: true,
  description: true,
  price: true,
  image: true,
  categoryId: true,
});

export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foods.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  addressId: integer("address_id").notNull(),
  riderId: integer("rider_id"),
  total: integer("total").notNull(),
  status: text("status").notNull().default("placed"), // 'placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'
  deliveryCode: text("delivery_code"),
  deliveryTime: timestamp("delivery_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  addressId: true,
  riderId: true,
  total: true,
  status: true,
  deliveryCode: true,
  deliveryTime: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  foodId: integer("food_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  foodId: true,
  quantity: true,
  price: true,
});

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Cart Items
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  foodId: integer("food_id").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).pick({
  userId: true,
  foodId: true,
  quantity: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Chat Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isFromUser: boolean("is_from_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  content: true,
  isFromUser: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;



// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'order', 'payment', 'delivery', 'system'
  title: text("title").notNull(),
  message: text("message").notNull(),
  orderId: integer("order_id"), // Optional, for order-related notifications
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  orderId: true,
  isRead: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Support Tickets for escalation system
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  orderId: integer("order_id"), // Optional, for order-related issues
  type: text("type").notNull(), // 'technical', 'complaint', 'refund', 'escalation', 'general'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'order_issue', 'payment_problem', 'technical_issue', 'quality_complaint', 'delivery_issue'
  assignedToUserId: integer("assigned_to_user_id"), // Admin/support agent assigned
  escalatedFromChat: boolean("escalated_from_chat").default(false),
  chatContext: text("chat_context"), // Last few chat messages for context
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).pick({
  userId: true,
  orderId: true,
  type: true,
  priority: true,
  status: true,
  subject: true,
  description: true,
  category: true,
  assignedToUserId: true,
  escalatedFromChat: true,
  chatContext: true,
  resolutionNotes: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Support Ticket Messages for communication thread
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  isFromStaff: boolean("is_from_staff").default(false),
  attachments: text("attachments"), // JSON array of file paths
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).pick({
  ticketId: true,
  userId: true,
  message: true,
  isFromStaff: true,
  attachments: true,
});

export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;

// Wallets
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: integer("balance").notNull().default(0), // Balance in cents
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("active"), // active, suspended, closed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).pick({
  userId: true,
  balance: true,
  currency: true,
  status: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// Wallet Transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  type: text("type").notNull(), // credit, debit
  amount: integer("amount").notNull(), // Amount in cents
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reference: text("reference").notNull().unique(),
  description: text("description").notNull(),
  orderId: integer("order_id"), // Optional, for order-related transactions
  topupId: integer("topup_id"), // Optional, for topup-related transactions
  status: text("status").notNull().default("completed"), // pending, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).pick({
  walletId: true,
  type: true,
  amount: true,
  balanceBefore: true,
  balanceAfter: true,
  reference: true,
  description: true,
  orderId: true,
  topupId: true,
  status: true,
});

export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

// Wallet Topups
export const walletTopups = pgTable("wallet_topups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  walletId: integer("wallet_id").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  paymentReference: text("payment_reference").notNull().unique(),
  paymentGateway: text("payment_gateway").notNull(), // paystack, stripe, flutterwave
  gatewayResponse: text("gateway_response"), // Store response from payment gateway
  status: text("status").notNull().default("pending"), // pending, completed, failed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWalletTopupSchema = createInsertSchema(walletTopups).pick({
  userId: true,
  walletId: true,
  amount: true,
  paymentReference: true,
  paymentGateway: true,
  gatewayResponse: true,
  status: true,
  completedAt: true,
});

export type InsertWalletTopup = z.infer<typeof insertWalletTopupSchema>;
export type WalletTopup = typeof walletTopups.$inferSelect;

// Payment Methods
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull().default("card"), // card, bank_account, mobile_money
  provider: text("provider").notNull().default("paystack"), // paystack, stripe, flutterwave
  cardLast4: text("card_last4"),
  cardBrand: text("card_brand"), // visa, mastercard, amex
  expiryMonth: text("expiry_month"),
  expiryYear: text("expiry_year"),
  cardholderName: text("cardholder_name"),
  nickname: text("nickname"), // User-friendly name for the card
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  gatewayCustomerId: text("gateway_customer_id"), // Customer ID from payment gateway
  gatewayCardId: text("gateway_card_id"), // Card ID from payment gateway
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).pick({
  userId: true,
  type: true,
  provider: true,
  cardLast4: true,
  cardBrand: true,
  expiryMonth: true,
  expiryYear: true,
  cardholderName: true,
  nickname: true,
  isDefault: true,
  isActive: true,
  gatewayCustomerId: true,
  gatewayCardId: true,
});

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// Relations - Defined after all tables
export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  cartItems: many(cartItems),
  messages: many(messages),
  wallets: many(wallets),
  walletTopups: many(walletTopups),
  paymentMethods: many(paymentMethods)
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id]
  })
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  foods: many(foods)
}));

export const foodsRelations = relations(foods, ({ one, many }) => ({
  category: one(categories, {
    fields: [foods.categoryId],
    references: [categories.id]
  }),
  orderItems: many(orderItems),
  cartItems: many(cartItems)
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id]
  }),
  address: one(addresses, {
    fields: [orders.addressId],
    references: [addresses.id]
  }),
  rider: one(users, {
    fields: [orders.riderId],
    references: [users.id]
  }),
  orderItems: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  food: one(foods, {
    fields: [orderItems.foodId],
    references: [foods.id]
  })
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id]
  }),
  food: one(foods, {
    fields: [cartItems.foodId],
    references: [foods.id]
  })
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id]
  })
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id]
  }),
  transactions: many(walletTransactions),
  topups: many(walletTopups)
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id]
  })
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id]
  })
}));

export const walletTopupsRelations = relations(walletTopups, ({ one }) => ({
  user: one(users, {
    fields: [walletTopups.userId],
    references: [users.id]
  }),
  wallet: one(wallets, {
    fields: [walletTopups.walletId],
    references: [wallets.id]
  })
}));


