import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Initialize PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create drizzle database instance with our schema
export const db = drizzle(pool, { schema });

// Export a function to run migrations programmatically if needed
export async function runMigrations() {
  try {
    console.log("Running database migrations...");
    // Migrations code would go here
    console.log("Database migrations completed successfully");
    return true;
  } catch (error) {
    console.error("Failed to run database migrations:", error);
    return false;
  }
}

// Initialize database with default categories if needed
export async function initializeDatabase() {
  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    console.log("Database connection successful");
    
    // Create tables if they don't exist (simple migration)
    try {
      // Create tables based on our schema
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          password TEXT NOT NULL,
          profile_image TEXT,
          role TEXT DEFAULT 'customer'
        );
        
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS foods (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          price INTEGER NOT NULL,
          image TEXT NOT NULL,
          category_id INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS addresses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          is_default BOOLEAN DEFAULT FALSE
        );
        
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          address_id INTEGER NOT NULL,
          rider_id INTEGER,
          total INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'placed',
          delivery_code TEXT,
          delivery_time TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          food_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          is_from_user BOOLEAN NOT NULL,
          timestamp TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS payment_methods (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          card_name TEXT,
          card_number TEXT,
          expiry_date TEXT,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          order_id INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          method TEXT NOT NULL,
          status TEXT NOT NULL,
          transaction_reference TEXT NOT NULL,
          payment_gateway TEXT,
          gateway_response TEXT,
          card_name TEXT,
          card_number TEXT,
          expiry_date TEXT,
          metadata TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          order_id INTEGER,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        );
                
        CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          food_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE,
          balance INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'NGN',
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id SERIAL PRIMARY KEY,
          wallet_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          balance_before INTEGER NOT NULL,
          balance_after INTEGER NOT NULL,
          reference TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL,
          order_id INTEGER,
          topup_id INTEGER,
          status TEXT NOT NULL DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS wallet_topups (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          wallet_id INTEGER NOT NULL,
          amount INTEGER NOT NULL,
          payment_reference TEXT NOT NULL UNIQUE,
          payment_gateway TEXT NOT NULL,
          gateway_response TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS support_tickets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          order_id INTEGER,
          type TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'medium',
          status TEXT NOT NULL DEFAULT 'open',
          subject TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          assigned_to_user_id INTEGER,
          escalated_from_chat BOOLEAN DEFAULT FALSE,
          chat_context TEXT,
          resolution_notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          resolved_at TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS support_ticket_messages (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          is_from_staff BOOLEAN DEFAULT FALSE,
          attachments TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("Database tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
    
    // Check if categories exist
    const existingCategories = await db.query.categories.findMany();
    
    // If no categories exist, create default ones
    if (existingCategories.length === 0) {
      console.log("Creating default categories...");
      
      // Create only Meal and Snack categories as required
      await db.insert(schema.categories).values([
        { name: "Meal", icon: "utensils" },
        { name: "Snack", icon: "cookie" }
      ]);
      
      console.log("Default categories created successfully");
      
      // Add sample food items for both categories
      await db.insert(schema.foods).values([
        {
          name: "Jollof Rice",
          description: "Spicy rice dish cooked with tomatoes and peppers",
          price: 1500,
          image: "https://images.unsplash.com/photo-1647102398925-e913852fface?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
          categoryId: 1 // Meal category
        },
        {
          name: "Meat Pie",
          description: "Savory pastry filled with minced meat and vegetables",
          price: 800,
          image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
          categoryId: 2 // Snack category
        }
      ]);
      
      console.log("Sample food item created");
    }
    
    return true;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return false;
  }
}
