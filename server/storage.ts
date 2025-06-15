import {
  User, InsertUser,
  Address, InsertAddress,
  Category, InsertCategory,
  Food, InsertFood,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  CartItem, InsertCartItem,
  Message, InsertMessage,
  Wallet, InsertWallet,
  WalletTransaction, InsertWalletTransaction,
  WalletTopup, InsertWalletTopup,
  PaymentMethod, InsertPaymentMethod
} from "@shared/schema";
import bcrypt from 'bcrypt';

interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Address methods
  getAddresses(userId: number): Promise<Address[]>;
  getAddress(id: number): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, addressUpdate: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: number): Promise<boolean>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Food methods
  getFoods(categoryId?: number): Promise<Food[]>;
  getFoodsByCategory(categoryId: number): Promise<Food[]>;
  getFood(id: number): Promise<Food | undefined>;
  createFood(food: InsertFood): Promise<Food>;
  updateFood(id: number, foodUpdate: Partial<Food>): Promise<Food | undefined>;
  deleteFood(id: number): Promise<boolean>;
  
  // Order methods
  getOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, orderUpdate: Partial<Order>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  assignRider(orderId: number, riderId: number): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  
  // OrderItem methods
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  deleteOrderItems(orderId: number): Promise<boolean>;
  
  // Message methods
  getMessages(userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Role methods
  getUsersByRole(role: string): Promise<User[]>;
  
  // Cart methods
  getCartItems(userId: number): Promise<CartItem[]>;
  addToCart(userId: number, foodId: number, quantity: number): Promise<CartItem>;
  updateCartItem(userId: number, foodId: number, quantity: number): Promise<CartItem | undefined>;
  updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<boolean>;
  clearCart(userId: number): Promise<boolean>;
  addOrderToCart(userId: number, orderId: number): Promise<{ success: boolean; items: string[]; total: number }>;

  // Wallet methods
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(walletId: number, newBalance: number): Promise<Wallet | undefined>;
  
  // Wallet Transaction methods
  getWalletTransactions(walletId: number): Promise<WalletTransaction[]>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  
  // Wallet Topup methods
  getWalletTopups(userId: number): Promise<WalletTopup[]>;
  getWalletTopup(id: number): Promise<WalletTopup | undefined>;
  getWalletTopupByReference(reference: string): Promise<WalletTopup | undefined>;
  createWalletTopup(topup: InsertWalletTopup): Promise<WalletTopup>;
  updateWalletTopup(id: number, updates: Partial<WalletTopup>): Promise<WalletTopup | undefined>;
  
  // Payment Method methods
  getUserPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<boolean>;
}

// In-memory storage implementation
class MemStorage implements IStorage {
  private users: User[] = [];
  private addresses: Address[] = [];
  private categories: Category[] = [];
  private foods: Food[] = [];
  private orders: Order[] = [];
  private orderItems: OrderItem[] = [];
  private messages: Message[] = [];
  private cartItems: CartItem[] = [];
  private wallets: Wallet[] = [];
  private walletTransactions: WalletTransaction[] = [];
  private walletTopups: WalletTopup[] = [];
  private paymentMethods: PaymentMethod[] = [];
  private nextId = 1;

  // Helper to get next ID
  private getNextId(): number {
    return this.nextId++;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.getNextId(),
      profileImage: null,
      phone: user.phone ?? null,
      role: user.role ?? null
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return undefined;
    
    this.users[userIndex] = { ...this.users[userIndex], ...userData };
    return this.users[userIndex];
  }

  // Address methods
  async getAddresses(userId: number): Promise<Address[]> {
    return this.addresses.filter(address => address.userId === userId);
  }

  async getAddress(id: number): Promise<Address | undefined> {
    return this.addresses.find(address => address.id === id);
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const newAddress: Address = {
      ...address,
      id: this.getNextId(),
      isDefault: address.isDefault ?? false
    };
    this.addresses.push(newAddress);
    return newAddress;
  }

  async updateAddress(id: number, addressUpdate: Partial<InsertAddress>): Promise<Address | undefined> {
    const addressIndex = this.addresses.findIndex(address => address.id === id);
    if (addressIndex === -1) return undefined;
    
    this.addresses[addressIndex] = { ...this.addresses[addressIndex], ...addressUpdate };
    return this.addresses[addressIndex];
  }

  async deleteAddress(id: number): Promise<boolean> {
    const addressIndex = this.addresses.findIndex(address => address.id === id);
    if (addressIndex === -1) return false;
    
    this.addresses.splice(addressIndex, 1);
    return true;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return this.categories;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.find(category => category.id === id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: this.getNextId()
    };
    this.categories.push(newCategory);
    return newCategory;
  }

  // Food methods
  async getFoods(): Promise<Food[]> {
    return this.foods;
  }

  async getFoodsByCategory(categoryId: number): Promise<Food[]> {
    return this.foods.filter(food => food.categoryId === categoryId);
  }

  async getFood(id: number): Promise<Food | undefined> {
    return this.foods.find(food => food.id === id);
  }

  async createFood(food: InsertFood): Promise<Food> {
    const newFood: Food = {
      ...food,
      id: this.getNextId()
    };
    this.foods.push(newFood);
    return newFood;
  }

  async updateFood(id: number, foodUpdate: Partial<Food>): Promise<Food | undefined> {
    const foodIndex = this.foods.findIndex(food => food.id === id);
    if (foodIndex === -1) return undefined;
    
    this.foods[foodIndex] = { ...this.foods[foodIndex], ...foodUpdate };
    return this.foods[foodIndex];
  }

  async deleteFood(id: number): Promise<boolean> {
    const foodIndex = this.foods.findIndex(food => food.id === id);
    if (foodIndex === -1) return false;
    
    this.foods.splice(foodIndex, 1);
    return true;
  }

  // Order methods
  async getOrders(userId: number): Promise<Order[]> {
    return this.orders.filter(order => order.userId === userId);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.orders;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.orders.filter(order => order.status === status);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find(order => order.id === id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = {
      ...order,
      id: this.getNextId(),
      createdAt: new Date(),
      status: order.status ?? 'pending',
      riderId: order.riderId ?? null,
      deliveryCode: order.deliveryCode ?? null,
      deliveryTime: order.deliveryTime ?? null
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: number, orderUpdate: Partial<Order>): Promise<Order | undefined> {
    const orderIndex = this.orders.findIndex(order => order.id === id);
    if (orderIndex === -1) return undefined;
    
    this.orders[orderIndex] = { ...this.orders[orderIndex], ...orderUpdate };
    return this.orders[orderIndex];
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    return this.updateOrder(id, { status });
  }

  async assignRider(orderId: number, riderId: number): Promise<Order | undefined> {
    return this.updateOrder(orderId, { riderId });
  }

  async deleteOrder(id: number): Promise<boolean> {
    const orderIndex = this.orders.findIndex(order => order.id === id);
    if (orderIndex === -1) return false;
    
    this.orders.splice(orderIndex, 1);
    return true;
  }

  // OrderItem methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.orderItems.filter(item => item.orderId === orderId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const newOrderItem: OrderItem = {
      ...orderItem,
      id: this.getNextId()
    };
    this.orderItems.push(newOrderItem);
    return newOrderItem;
  }

  async deleteOrderItems(orderId: number): Promise<boolean> {
    const initialLength = this.orderItems.length;
    this.orderItems = this.orderItems.filter(item => item.orderId !== orderId);
    return this.orderItems.length < initialLength;
  }

  // Message methods
  async getMessages(userId: number): Promise<Message[]> {
    return this.messages.filter(message => message.userId === userId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: this.getNextId(),
      timestamp: new Date()
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  // Role methods
  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role === role);
  }

  // Cart methods
  async getCartItems(userId: number): Promise<CartItem[]> {
    const userCartItems = this.cartItems.filter(item => item.userId === userId);
    
    // Transform to include food details
    const result = [];
    for (const item of userCartItems) {
      const food = await this.getFood(item.foodId);
      if (food) {
        result.push({
          ...item,
          foodName: food.name,
          foodPrice: food.price,
          foodImage: food.image,
          food: food
        });
      }
    }
    return result;
  }

  async addToCart(userId: number, foodId: number, quantity: number): Promise<CartItem> {
    const newCartItem: CartItem = {
      id: this.getNextId(),
      userId,
      foodId,
      quantity,
      createdAt: new Date()
    };
    this.cartItems.push(newCartItem);
    return newCartItem;
  }

  async updateCartItem(userId: number, foodId: number, quantity: number): Promise<CartItem | undefined> {
    const itemIndex = this.cartItems.findIndex(item => item.userId === userId && item.foodId === foodId);
    if (itemIndex === -1) return undefined;
    
    this.cartItems[itemIndex] = { ...this.cartItems[itemIndex], quantity };
    return this.cartItems[itemIndex];
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const itemIndex = this.cartItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return undefined;
    
    this.cartItems[itemIndex] = { ...this.cartItems[itemIndex], quantity };
    return this.cartItems[itemIndex];
  }

  async removeFromCart(id: number): Promise<boolean> {
    const itemIndex = this.cartItems.findIndex(item => item.id === id);
    if (itemIndex === -1) return false;
    
    this.cartItems.splice(itemIndex, 1);
    return true;
  }

  async clearCart(userId: number): Promise<boolean> {
    const initialLength = this.cartItems.length;
    this.cartItems = this.cartItems.filter(item => item.userId !== userId);
    return this.cartItems.length < initialLength;
  }

  async addOrderToCart(userId: number, orderId: number): Promise<{ success: boolean; items: string[]; total: number }> {
    // Get order items
    const orderItems = await this.getOrderItems(orderId);
    const addedItems: string[] = [];
    let total = 0;

    for (const orderItem of orderItems) {
      const food = await this.getFood(orderItem.foodId);
      if (food) {
        await this.addToCart(userId, orderItem.foodId, orderItem.quantity);
        addedItems.push(food.name);
        total += orderItem.price * orderItem.quantity;
      }
    }

    return {
      success: addedItems.length > 0,
      items: addedItems,
      total
    };
  }

  // Wallet methods
  async getWallet(userId: number): Promise<Wallet | undefined> {
    return this.wallets.find(wallet => wallet.userId === userId);
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const newWallet: Wallet = {
      ...wallet,
      id: this.getNextId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: wallet.status ?? 'active',
      balance: wallet.balance ?? 0,
      currency: wallet.currency ?? 'NGN'
    };
    this.wallets.push(newWallet);
    return newWallet;
  }

  async updateWalletBalance(walletId: number, newBalance: number): Promise<Wallet | undefined> {
    const walletIndex = this.wallets.findIndex(wallet => wallet.id === walletId);
    if (walletIndex === -1) return undefined;
    
    this.wallets[walletIndex] = { 
      ...this.wallets[walletIndex], 
      balance: newBalance,
      updatedAt: new Date()
    };
    return this.wallets[walletIndex];
  }

  // Wallet Transaction methods
  async getWalletTransactions(walletId: number): Promise<WalletTransaction[]> {
    return this.walletTransactions.filter(transaction => transaction.walletId === walletId);
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const newTransaction: WalletTransaction = {
      ...transaction,
      id: this.getNextId(),
      createdAt: new Date(),
      status: transaction.status ?? 'completed',
      orderId: transaction.orderId ?? null,
      topupId: transaction.topupId ?? null
    };
    this.walletTransactions.push(newTransaction);
    return newTransaction;
  }

  // Wallet Topup methods
  async getWalletTopups(userId: number): Promise<WalletTopup[]> {
    return this.walletTopups.filter(topup => topup.userId === userId);
  }

  async getWalletTopup(id: number): Promise<WalletTopup | undefined> {
    return this.walletTopups.find(topup => topup.id === id);
  }

  async getWalletTopupByReference(reference: string): Promise<WalletTopup | undefined> {
    return this.walletTopups.find(topup => topup.paymentReference === reference);
  }

  async createWalletTopup(topup: InsertWalletTopup): Promise<WalletTopup> {
    const newTopup: WalletTopup = {
      ...topup,
      id: this.getNextId(),
      createdAt: new Date(),
      status: topup.status ?? 'pending',
      gatewayResponse: topup.gatewayResponse ?? null,
      completedAt: topup.completedAt ?? null
    };
    this.walletTopups.push(newTopup);
    return newTopup;
  }

  async updateWalletTopup(id: number, updates: Partial<WalletTopup>): Promise<WalletTopup | undefined> {
    const topupIndex = this.walletTopups.findIndex(topup => topup.id === id);
    if (topupIndex === -1) return undefined;
    
    this.walletTopups[topupIndex] = { 
      ...this.walletTopups[topupIndex], 
      ...updates
    };
    return this.walletTopups[topupIndex];
  }

  // Payment Method methods
  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter(method => method.userId === userId);
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    return this.paymentMethods.find(method => method.id === id);
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const newPaymentMethod: PaymentMethod = {
      id: this.getNextId(),
      userId: paymentMethod.userId,
      type: paymentMethod.type ?? 'card',
      provider: paymentMethod.provider ?? 'paystack',
      isDefault: paymentMethod.isDefault ?? false,
      isActive: paymentMethod.isActive ?? true,
      cardLast4: paymentMethod.cardLast4 ?? null,
      cardBrand: paymentMethod.cardBrand ?? null,
      expiryMonth: paymentMethod.expiryMonth ?? null,
      expiryYear: paymentMethod.expiryYear ?? null,
      cardholderName: paymentMethod.cardholderName ?? null,
      nickname: paymentMethod.nickname ?? null,
      gatewayCustomerId: paymentMethod.gatewayCustomerId ?? null,
      gatewayCardId: paymentMethod.gatewayCardId ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.paymentMethods.push(newPaymentMethod);
    return newPaymentMethod;
  }

  async updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const methodIndex = this.paymentMethods.findIndex(method => method.id === id);
    if (methodIndex === -1) return undefined;
    
    this.paymentMethods[methodIndex] = { 
      ...this.paymentMethods[methodIndex], 
      ...updates,
      updatedAt: new Date()
    };
    return this.paymentMethods[methodIndex];
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const methodIndex = this.paymentMethods.findIndex(method => method.id === id);
    if (methodIndex === -1) return false;
    
    this.paymentMethods.splice(methodIndex, 1);
    return true;
  }
}

// PostgreSQL storage implementation
import { db } from './drizzle';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';

class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const users = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.id, id)
    });
    return users[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.email, email)
    });
    return users[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const result = await db.update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  }

  // Address methods
  async getAddresses(userId: number): Promise<Address[]> {
    return await db.query.addresses.findMany({
      where: (addresses, { eq }) => eq(addresses.userId, userId)
    });
  }

  async getAddress(id: number): Promise<Address | undefined> {
    const addresses = await db.query.addresses.findMany({
      where: (addresses, { eq }) => eq(addresses.id, id)
    });
    return addresses[0];
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const result = await db.insert(schema.addresses).values(address).returning();
    return result[0];
  }

  async updateAddress(id: number, addressUpdate: Partial<InsertAddress>): Promise<Address | undefined> {
    const result = await db.update(schema.addresses)
      .set(addressUpdate)
      .where(eq(schema.addresses.id, id))
      .returning();
    return result[0];
  }

  async deleteAddress(id: number): Promise<boolean> {
    const result = await db.delete(schema.addresses)
      .where(eq(schema.addresses.id, id))
      .returning();
    return result.length > 0;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return await db.query.categories.findMany();
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const categories = await db.query.categories.findMany({
      where: (categories, { eq }) => eq(categories.id, id)
    });
    return categories[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(schema.categories).values(category).returning();
    return result[0];
  }

  // Food methods
  async getFoods(categoryId?: number): Promise<Food[]> {
    if (categoryId) {
      return await db.query.foods.findMany({
        where: (foods, { eq }) => eq(foods.categoryId, categoryId)
      });
    }
    return await db.query.foods.findMany();
  }

  async getFoodsByCategory(categoryId: number): Promise<Food[]> {
    return await db.query.foods.findMany({
      where: (foods, { eq }) => eq(foods.categoryId, categoryId)
    });
  }

  async getFood(id: number): Promise<Food | undefined> {
    const foods = await db.query.foods.findMany({
      where: (foods, { eq }) => eq(foods.id, id)
    });
    return foods[0];
  }

  async createFood(food: InsertFood): Promise<Food> {
    const result = await db.insert(schema.foods).values(food).returning();
    return result[0];
  }

  async updateFood(id: number, foodUpdate: Partial<Food>): Promise<Food | undefined> {
    const result = await db.update(schema.foods)
      .set(foodUpdate)
      .where(eq(schema.foods.id, id))
      .returning();
    return result[0];
  }

  async deleteFood(id: number): Promise<boolean> {
    const result = await db.delete(schema.foods)
      .where(eq(schema.foods.id, id))
      .returning();
    return result.length > 0;
  }

  // Order methods
  async getOrders(userId: number): Promise<Order[]> {
    return await db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.userId, userId)
    });
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.query.orders.findMany();
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return await db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.status, status)
    });
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const orders = await db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.id, id)
    });
    return orders[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(schema.orders).values(order).returning();
    return result[0];
  }

  async updateOrder(id: number, orderUpdate: Partial<Order>): Promise<Order | undefined> {
    const result = await db.update(schema.orders)
      .set(orderUpdate)
      .where(eq(schema.orders.id, id))
      .returning();
    return result[0];
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    return this.updateOrder(id, { status });
  }

  async assignRider(orderId: number, riderId: number): Promise<Order | undefined> {
    return this.updateOrder(orderId, { riderId });
  }

  async deleteOrder(id: number): Promise<boolean> {
    const result = await db.delete(schema.orders)
      .where(eq(schema.orders.id, id))
      .returning();
    return result.length > 0;
  }

  // OrderItem methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.query.orderItems.findMany({
      where: (orderItems, { eq }) => eq(orderItems.orderId, orderId),
      with: {
        food: true
      }
    }).then(items => items.map(item => ({
      ...item,
      foodName: item.food?.name || 'Unknown'
    })));
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const result = await db.insert(schema.orderItems).values(orderItem).returning();
    return result[0];
  }

  async deleteOrderItems(orderId: number): Promise<boolean> {
    const result = await db.delete(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId))
      .returning();
    return result.length > 0;
  }

  // Message methods
  async getMessages(userId: number): Promise<Message[]> {
    return await db.query.messages.findMany({
      where: (messages, { eq }) => eq(messages.userId, userId)
    });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(schema.messages).values(message).returning();
    return result[0];
  }

  // Role methods
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, role)
    });
  }

  // Cart methods
  async getCartItems(userId: number): Promise<CartItem[]> {
    try {
      return await db.query.cartItems.findMany({
        where: (cartItems, { eq }) => eq(cartItems.userId, userId)
      });
    } catch (error) {
      console.error("Error getting cart items:", error);
      return [];
    }
  }

  async addToCart(userId: number, foodId: number, quantity: number): Promise<CartItem> {
    const cartItem = { userId, foodId, quantity };
    const result = await db.insert(schema.cartItems).values(cartItem).returning();
    return result[0];
  }

  async updateCartItem(userId: number, foodId: number, quantity: number): Promise<CartItem | undefined> {
    const result = await db.update(schema.cartItems)
      .set({ quantity })
      .where(and(eq(schema.cartItems.userId, userId), eq(schema.cartItems.foodId, foodId)))
      .returning();
    return result[0];
  }

  async updateCartItemQuantity(id: number, quantity: number): Promise<CartItem | undefined> {
    const result = await db.update(schema.cartItems)
      .set({ quantity })
      .where(eq(schema.cartItems.id, id))
      .returning();
    return result[0];
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(schema.cartItems)
      .where(eq(schema.cartItems.id, id))
      .returning();
    return result.length > 0;
  }

  async clearCart(userId: number): Promise<boolean> {
    const result = await db.delete(schema.cartItems)
      .where(eq(schema.cartItems.userId, userId))
      .returning();
    return result.length > 0;
  }

  async addOrderToCart(userId: number, orderId: number): Promise<{ success: boolean; items: string[]; total: number }> {
    // Get order items
    const orderItems = await this.getOrderItems(orderId);
    const addedItems: string[] = [];
    let total = 0;

    for (const orderItem of orderItems) {
      const food = await this.getFood(orderItem.foodId);
      if (food) {
        await this.addToCart(userId, orderItem.foodId, orderItem.quantity);
        addedItems.push(food.name);
        total += orderItem.price * orderItem.quantity;
      }
    }

    return {
      success: addedItems.length > 0,
      items: addedItems,
      total
    };
  }

  // Wallet methods
  async getWallet(userId: number): Promise<Wallet | undefined> {
    const wallets = await db.query.wallets.findMany({
      where: (wallets, { eq }) => eq(wallets.userId, userId)
    });
    return wallets[0];
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const result = await db.insert(schema.wallets).values(wallet).returning();
    return result[0];
  }

  async updateWalletBalance(walletId: number, newBalance: number): Promise<Wallet | undefined> {
    const result = await db.update(schema.wallets)
      .set({ 
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(schema.wallets.id, walletId))
      .returning();
    return result[0];
  }

  // Wallet Transaction methods
  async getWalletTransactions(walletId: number): Promise<WalletTransaction[]> {
    return await db.query.walletTransactions.findMany({
      where: (walletTransactions, { eq }) => eq(walletTransactions.walletId, walletId),
      orderBy: (walletTransactions, { desc }) => [desc(walletTransactions.createdAt)]
    });
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    const result = await db.insert(schema.walletTransactions).values(transaction).returning();
    return result[0];
  }

  // Wallet Topup methods
  async getWalletTopups(userId: number): Promise<WalletTopup[]> {
    return await db.query.walletTopups.findMany({
      where: (walletTopups, { eq }) => eq(walletTopups.userId, userId),
      orderBy: (walletTopups, { desc }) => [desc(walletTopups.createdAt)]
    });
  }

  async getWalletTopup(id: number): Promise<WalletTopup | undefined> {
    const topups = await db.query.walletTopups.findMany({
      where: (walletTopups, { eq }) => eq(walletTopups.id, id)
    });
    return topups[0];
  }

  async getWalletTopupByReference(reference: string): Promise<WalletTopup | undefined> {
    const topups = await db.query.walletTopups.findMany({
      where: (walletTopups, { eq }) => eq(walletTopups.paymentReference, reference)
    });
    return topups[0];
  }

  async createWalletTopup(topup: InsertWalletTopup): Promise<WalletTopup> {
    const result = await db.insert(schema.walletTopups).values(topup).returning();
    return result[0];
  }

  async updateWalletTopup(id: number, updates: Partial<WalletTopup>): Promise<WalletTopup | undefined> {
    const result = await db.update(schema.walletTopups)
      .set(updates)
      .where(eq(schema.walletTopups.id, id))
      .returning();
    return result[0];
  }

  // Payment Method methods
  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return await db.query.paymentMethods.findMany({
      where: (paymentMethods, { eq }) => eq(paymentMethods.userId, userId)
    });
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const paymentMethods = await db.query.paymentMethods.findMany({
      where: (paymentMethods, { eq }) => eq(paymentMethods.id, id)
    });
    return paymentMethods[0];
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const result = await db.insert(schema.paymentMethods).values(paymentMethod).returning();
    return result[0];
  }

  async updatePaymentMethod(id: number, updates: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const result = await db.update(schema.paymentMethods)
      .set(updates)
      .where(eq(schema.paymentMethods.id, id))
      .returning();
    return result[0];
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const result = await db.delete(schema.paymentMethods)
      .where(eq(schema.paymentMethods.id, id))
      .returning();
    return result.length > 0;
  }
}

// Export the storage instance
export const storage: IStorage = new PostgresStorage();