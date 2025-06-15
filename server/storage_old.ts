import {
  User, InsertUser,
  Address, InsertAddress,
  Category, InsertCategory,
  Food, InsertFood,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  CartItem, InsertCartItem,
  Message, InsertMessage
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
  getFoods(): Promise<Food[]>;
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
  private paymentMethods: PaymentMethod[] = [];
  private payments: Payment[] = [];
  
  private nextId = {
    users: 1,
    addresses: 1,
    categories: 1,
    foods: 1,
    orders: 1,
    orderItems: 1,
    messages: 1,
    paymentMethods: 1,
    payments: 1
  };
  
  constructor() {
    // Initialize with default data - using just Meal and Snack categories
    const mealCategory = {
      id: this.nextId.categories++,
      name: "Meal",
      icon: "utensils"
    };
    this.categories.push(mealCategory);
    
    const snackCategory = {
      id: this.nextId.categories++,
      name: "Snack",
      icon: "cookie"
    };
    this.categories.push(snackCategory);
    
    // Initialize with some sample food items
    this.foods.push({
      id: this.nextId.foods++,
      name: "Jollof Rice",
      description: "Spicy rice dish cooked with tomatoes and spices",
      price: 1500, // ₦15.00
      image: "/images/jollof-rice.jpg",
      categoryId: mealCategory.id
    });
    
    this.foods.push({
      id: this.nextId.foods++,
      name: "Meat Pie",
      description: "Savory pastry filled with seasoned minced meat and vegetables",
      price: 800, // ₦8.00
      image: "/images/meat-pie.jpg",
      categoryId: snackCategory.id
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email === email);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    
    const user: User = {
      id: this.nextId.users++,
      ...insertUser,
      password: hashedPassword
    };
    
    this.users.push(user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const index = this.users.findIndex(user => user.id === id);
    if (index === -1) return undefined;
    
    // Hash password if it's being updated
    if (userData.password) {
      const saltRounds = 10;
      userData.password = await bcrypt.hash(userData.password, saltRounds);
    }
    
    this.users[index] = { ...this.users[index], ...userData };
    return this.users[index];
  }
  
  // Address methods
  async getAddresses(userId: number): Promise<Address[]> {
    return this.addresses.filter(address => address.userId === userId);
  }
  
  async getAddress(id: number): Promise<Address | undefined> {
    return this.addresses.find(address => address.id === id);
  }
  
  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const address: Address = {
      id: this.nextId.addresses++,
      ...insertAddress
    };
    
    this.addresses.push(address);
    return address;
  }
  
  async updateAddress(id: number, addressUpdate: Partial<InsertAddress>): Promise<Address | undefined> {
    const index = this.addresses.findIndex(address => address.id === id);
    if (index === -1) return undefined;
    
    this.addresses[index] = { ...this.addresses[index], ...addressUpdate };
    return this.addresses[index];
  }
  
  async deleteAddress(id: number): Promise<boolean> {
    const index = this.addresses.findIndex(address => address.id === id);
    if (index === -1) return false;
    
    this.addresses.splice(index, 1);
    return true;
  }
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return this.categories;
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.find(category => category.id === id);
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const category: Category = {
      id: this.nextId.categories++,
      ...insertCategory
    };
    
    this.categories.push(category);
    return category;
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
  
  async createFood(insertFood: InsertFood): Promise<Food> {
    const food: Food = {
      id: this.nextId.foods++,
      ...insertFood
    };
    
    this.foods.push(food);
    return food;
  }
  
  async updateFood(id: number, foodUpdate: Partial<Food>): Promise<Food | undefined> {
    const index = this.foods.findIndex(food => food.id === id);
    if (index === -1) return undefined;
    
    this.foods[index] = { ...this.foods[index], ...foodUpdate };
    return this.foods[index];
  }
  
  async deleteFood(id: number): Promise<boolean> {
    const index = this.foods.findIndex(food => food.id === id);
    if (index === -1) return false;
    
    this.foods.splice(index, 1);
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
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const now = new Date();
    const order: Order = {
      id: this.nextId.orders++,
      ...insertOrder,
      status: insertOrder.status || 'placed',
      createdAt: now.toISOString()
    };
    
    this.orders.push(order);
    console.log("New order created:", order); // Add logging for debugging
    console.log("All orders:", this.orders);  // Log all orders
    return order;
  }
  
  async updateOrder(id: number, orderUpdate: Partial<Order>): Promise<Order | undefined> {
    const index = this.orders.findIndex(order => order.id === id);
    if (index === -1) return undefined;
    
    this.orders[index] = { ...this.orders[index], ...orderUpdate };
    return this.orders[index];
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const index = this.orders.findIndex(order => order.id === id);
    if (index === -1) return undefined;
    
    this.orders[index].status = status;
    return this.orders[index];
  }
  
  async assignRider(orderId: number, riderId: number): Promise<Order | undefined> {
    const index = this.orders.findIndex(order => order.id === orderId);
    if (index === -1) return undefined;
    
    this.orders[index].riderId = riderId;
    return this.orders[index];
  }
  
  async deleteOrder(id: number): Promise<boolean> {
    const index = this.orders.findIndex(order => order.id === id);
    if (index === -1) return false;
    
    this.orders.splice(index, 1);
    return true;
  }
  
  // OrderItem methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return this.orderItems.filter(item => item.orderId === orderId);
  }
  
  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const orderItem: OrderItem = {
      id: this.nextId.orderItems++,
      ...insertOrderItem
    };
    
    this.orderItems.push(orderItem);
    return orderItem;
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
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const now = new Date();
    const message: Message = {
      id: this.nextId.messages++,
      ...insertMessage,
      timestamp: now.toISOString()
    };
    
    this.messages.push(message);
    return message;
  }
  
  // Payment methods
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter(paymentMethod => paymentMethod.userId === userId);
  }
  
  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    return this.paymentMethods.find(paymentMethod => paymentMethod.id === id);
  }
  
  async createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const now = new Date();
    const paymentMethod: PaymentMethod = {
      id: this.nextId.paymentMethods++,
      ...insertPaymentMethod,
      createdAt: now.toISOString()
    };
    
    this.paymentMethods.push(paymentMethod);
    return paymentMethod;
  }
  
  async updatePaymentMethod(id: number, update: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const index = this.paymentMethods.findIndex(paymentMethod => paymentMethod.id === id);
    if (index === -1) return undefined;
    
    this.paymentMethods[index] = { ...this.paymentMethods[index], ...update };
    return this.paymentMethods[index];
  }
  
  async deletePaymentMethod(id: number): Promise<boolean> {
    const index = this.paymentMethods.findIndex(paymentMethod => paymentMethod.id === id);
    if (index === -1) return false;
    
    this.paymentMethods.splice(index, 1);
    return true;
  }
  
  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const now = new Date();
    const payment: Payment = {
      id: this.nextId.payments++,
      ...insertPayment,
      createdAt: now.toISOString()
    };
    
    this.payments.push(payment);
    return payment;
  }
  
  async getPaymentByOrderId(orderId: number): Promise<Payment | undefined> {
    return this.payments.find(payment => payment.orderId === orderId);
  }
  
  async getPaymentByTransactionReference(reference: string): Promise<Payment | undefined> {
    return this.payments.find(payment => payment.transactionReference === reference);
  }
  
  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    const index = this.payments.findIndex(payment => payment.id === id);
    if (index === -1) return undefined;
    
    this.payments[index].status = status;
    return this.payments[index];
  }
  
  // Role methods
  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role === role);
  }
}

// PostgreSQL storage implementation
class PostgresStorage implements IStorage {
  constructor(private db: any) {}
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const users = await this.db.query.users.findMany({
      where: (users, { eq }) => eq(users.id, id)
    });
    return users.length > 0 ? users[0] : undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.db.query.users.findMany({
      where: (users, { eq }) => eq(users.email, email)
    });
    return users.length > 0 ? users[0] : undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    
    const user = {
      ...insertUser,
      password: hashedPassword
    };
    
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // Hash password if it's being updated
    if (userData.password) {
      const saltRounds = 10;
      userData.password = await bcrypt.hash(userData.password, saltRounds);
    }
    
    const result = await this.db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  // Address methods
  async getAddresses(userId: number): Promise<Address[]> {
    return await this.db.query.addresses.findMany({
      where: (addresses, { eq }) => eq(addresses.userId, userId)
    });
  }
  
  async getAddress(id: number): Promise<Address | undefined> {
    const addresses = await this.db.query.addresses.findMany({
      where: (addresses, { eq }) => eq(addresses.id, id)
    });
    return addresses.length > 0 ? addresses[0] : undefined;
  }
  
  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const result = await this.db.insert(addresses).values(insertAddress).returning();
    return result[0];
  }
  
  async updateAddress(id: number, addressUpdate: Partial<InsertAddress>): Promise<Address | undefined> {
    const result = await this.db.update(addresses)
      .set(addressUpdate)
      .where(eq(addresses.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteAddress(id: number): Promise<boolean> {
    const result = await this.db.delete(addresses).where(eq(addresses.id, id));
    return result.rowCount > 0;
  }
  
  // Category methods
  async getCategories(): Promise<Category[]> {
    return await this.db.query.categories.findMany();
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const categories = await this.db.query.categories.findMany({
      where: (categories, { eq }) => eq(categories.id, id)
    });
    return categories.length > 0 ? categories[0] : undefined;
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const result = await this.db.insert(categories).values(insertCategory).returning();
    return result[0];
  }
  
  // Food methods
  async getFoods(): Promise<Food[]> {
    return await this.db.query.foods.findMany();
  }
  
  async getFoodsByCategory(categoryId: number): Promise<Food[]> {
    return await this.db.query.foods.findMany({
      where: (foods, { eq }) => eq(foods.categoryId, categoryId)
    });
  }
  
  async getFood(id: number): Promise<Food | undefined> {
    const foods = await this.db.query.foods.findMany({
      where: (foods, { eq }) => eq(foods.id, id)
    });
    return foods.length > 0 ? foods[0] : undefined;
  }
  
  async createFood(insertFood: InsertFood): Promise<Food> {
    const result = await this.db.insert(foods).values(insertFood).returning();
    return result[0];
  }
  
  async updateFood(id: number, foodUpdate: Partial<Food>): Promise<Food | undefined> {
    const result = await this.db.update(foods)
      .set(foodUpdate)
      .where(eq(foods.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteFood(id: number): Promise<boolean> {
    const result = await this.db.delete(foods).where(eq(foods.id, id));
    return result.rowCount > 0;
  }
  
  // Order methods
  async getOrders(userId: number): Promise<Order[]> {
    return await this.db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.userId, userId)
    });
  }
  
  async getAllOrders(): Promise<Order[]> {
    return await this.db.query.orders.findMany();
  }
  
  async getOrdersByStatus(status: string): Promise<Order[]> {
    return await this.db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.status, status)
    });
  }
  
  async getOrder(id: number): Promise<Order | undefined> {
    const orders = await this.db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.id, id)
    });
    return orders.length > 0 ? orders[0] : undefined;
  }
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await this.db.insert(orders).values({
      ...insertOrder,
      status: insertOrder.status || 'placed'
    }).returning();
    
    console.log("New order created:", result[0]); // Add logging for debugging
    return result[0];
  }
  
  async updateOrder(id: number, orderUpdate: Partial<Order>): Promise<Order | undefined> {
    const result = await this.db.update(orders)
      .set(orderUpdate)
      .where(eq(orders.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const result = await this.db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  async assignRider(orderId: number, riderId: number): Promise<Order | undefined> {
    const result = await this.db.update(orders)
      .set({ riderId })
      .where(eq(orders.id, orderId))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deleteOrder(id: number): Promise<boolean> {
    const result = await this.db.delete(orders)
      .where(eq(orders.id, id))
      .returning();
      
    return result.length > 0;
  }
  
  // OrderItem methods
  async getOrderItems(orderId: number): Promise<any[]> {
    const items = await this.db.query.orderItems.findMany({
      where: (orderItems, { eq }) => eq(orderItems.orderId, orderId)
    });
    
    // Enhance items with food name information
    const enhancedItems = await Promise.all(items.map(async (item) => {
      // Get the food item to get its name
      const foodItem = await this.getFood(item.foodId);
      
      return {
        ...item,
        name: foodItem ? foodItem.name : `Item #${item.foodId}`
      };
    }));
    
    return enhancedItems;
  }
  
  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const result = await this.db.insert(orderItems).values(insertOrderItem).returning();
    return result[0];
  }
  
  async deleteOrderItems(orderId: number): Promise<boolean> {
    const result = await this.db.delete(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .returning();
      
    return result.length >= 0; // Returns true even if no items to delete
  }
  
  // Message methods
  async getMessages(userId: number): Promise<Message[]> {
    return await this.db.query.messages.findMany({
      where: (messages, { eq }) => eq(messages.userId, userId)
    });
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values(insertMessage).returning();
    return result[0];
  }
  
  // Payment method methods
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return await this.db.query.paymentMethods.findMany({
      where: (paymentMethods, { eq }) => eq(paymentMethods.userId, userId)
    });
  }
  
  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const paymentMethods = await this.db.query.paymentMethods.findMany({
      where: (paymentMethods, { eq }) => eq(paymentMethods.id, id)
    });
    return paymentMethods.length > 0 ? paymentMethods[0] : undefined;
  }
  
  async createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const result = await this.db.insert(paymentMethods).values(insertPaymentMethod).returning();
    return result[0];
  }
  
  async updatePaymentMethod(id: number, update: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const result = await this.db.update(paymentMethods)
      .set(update)
      .where(eq(paymentMethods.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }
  
  async deletePaymentMethod(id: number): Promise<boolean> {
    const result = await this.db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return result.rowCount > 0;
  }
  
  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const result = await this.db.insert(payments).values(insertPayment).returning();
    return result[0];
  }
  
  async getPaymentByOrderId(orderId: number): Promise<Payment | undefined> {
    const payments = await this.db.query.payments.findMany({
      where: (payments, { eq }) => eq(payments.orderId, orderId)
    });
    return payments.length > 0 ? payments[0] : undefined;
  }
  
  async getPaymentByTransactionReference(reference: string): Promise<Payment | undefined> {
    const payments = await this.db.query.payments.findMany({
      where: (payments, { eq }) => eq(payments.transactionReference, reference)
    });
    return payments.length > 0 ? payments[0] : undefined;
  }

  async getPaymentByReference(reference: string): Promise<Payment | undefined> {
    const payments = await this.db.query.payments.findMany({
      where: (payments, { eq }) => eq(payments.transactionReference, reference)
    });
    return payments.length > 0 ? payments[0] : undefined;
  }
  
  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    try {
      const result = await this.db.update(payments)
        .set({ status })
        .where(eq(payments.id, id))
        .returning();
        
      console.log(`Payment status update result for ID ${id}:`, result);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error(`Error updating payment status for ID ${id}:`, error);
      return undefined;
    }
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const result = await this.db.update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
      
    return result.length > 0 ? result[0] : undefined;
  }

  async getPaymentsByUserId(userId: number, status?: string): Promise<Payment[]> {
    if (status) {
      return await this.db.query.payments.findMany({
        where: (payments, { eq, and }) => and(
          eq(payments.userId, userId),
          eq(payments.status, status)
        )
      });
    } else {
      return await this.db.query.payments.findMany({
        where: (payments, { eq }) => eq(payments.userId, userId)
      });
    }
  }
  
  // Role methods
  async getUsersByRole(role: string): Promise<User[]> {
    return await this.db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, role)
    });
  }
  
  // Cart methods
  async getCartItems(userId: number): Promise<any[]> {
    const cartItems = await this.db.query.cartItems.findMany({
      where: (cartItems, { eq }) => eq(cartItems.userId, userId)
    });
    
    // Enhance cart items with food details
    const enhancedItems = await Promise.all(cartItems.map(async (item) => {
      const food = await this.getFood(item.foodId);
      return {
        ...item,
        foodName: food?.name || 'Unknown Item',
        foodPrice: food?.price || 0,
        total: (food?.price || 0) * item.quantity,
        foodImage: food?.image || ''
      };
    }));
    
    return enhancedItems;
  }
  
  async addToCart(userId: number, foodId: number, quantity: number): Promise<CartItem> {
    // Check if item already exists
    const existingItem = await this.db.query.cartItems.findFirst({
      where: (cartItems, { eq, and }) => and(
        eq(cartItems.userId, userId),
        eq(cartItems.foodId, foodId)
      )
    });
    
    if (existingItem) {
      // Update existing item
      const result = await this.db.update(schema.cartItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(eq(schema.cartItems.id, existingItem.id))
        .returning();
      return result[0];
    } else {
      // Add new item
      const result = await this.db.insert(schema.cartItems)
        .values({ userId, foodId, quantity })
        .returning();
      return result[0];
    }
  }
  
  async updateCartItem(userId: number, foodId: number, quantity: number): Promise<CartItem | undefined> {
    const result = await this.db.update(schema.cartItems)
      .set({ quantity })
      .where(and(
        eq(schema.cartItems.userId, userId),
        eq(schema.cartItems.foodId, foodId)
      ))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }
  
  async removeFromCart(userId: number, foodId: number): Promise<boolean> {
    await this.db.delete(schema.cartItems)
      .where(and(
        eq(schema.cartItems.userId, userId),
        eq(schema.cartItems.foodId, foodId)
      ));
    return true;
  }
  
  async clearCart(userId: number): Promise<boolean> {
    try {
      console.log(`Clearing cart for user ${userId}`);
      const result = await this.db.delete(schema.cartItems)
        .where(eq(schema.cartItems.userId, userId));
      console.log(`Cart cleared successfully for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Failed to clear cart for user ${userId}:`, error);
      throw error;
    }
  }
  
  async addOrderToCart(userId: number, orderId: number): Promise<{ success: boolean; items: string[]; total: number }> {
    try {
      // Get the order and verify it belongs to the user
      const order = await this.getOrder(orderId);
      if (!order || order.userId !== userId) {
        return { success: false, items: [], total: 0 };
      }
      
      // Get order items
      const orderItems = await this.getOrderItems(orderId);
      const addedItems: string[] = [];
      
      // Add each item to cart
      for (const item of orderItems) {
        const food = await this.getFood(item.foodId);
        if (food) {
          await this.addToCart(userId, item.foodId, item.quantity);
          addedItems.push(`${item.quantity}x ${food.name}`);
        }
      }
      
      return {
        success: true,
        items: addedItems,
        total: order.total
      };
    } catch (error) {
      console.error("Error adding order to cart:", error);
      return { success: false, items: [], total: 0 };
    }
  }
}

// Import from drizzle.ts
import { db } from './drizzle';
import { eq, and } from 'drizzle-orm';
import * as schema from '@shared/schema';

// Import the tables from schema for direct use with drizzle queries
import { 
  users, addresses, categories, foods, 
  orders, orderItems, messages, 
  payments, paymentMethods, cartItems
} from '@shared/schema';

// Export storage instance
export const storage = new PostgresStorage(db);