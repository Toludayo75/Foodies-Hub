export const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  host: "0.0.0.0",
  
  // Session secret
  sessionSecret: process.env.SESSION_SECRET || "foodies-super-secret-key",
  
  // AI API keys
  openaiApiKey: process.env.OPENAI_API_KEY || "sk-placeholder-key-for-development",
  geminiApiKey: process.env.GEMINI_API_KEY,
  
  // Payment configuration
  paystackSecretKey: process.env.PAYSTACK_LIVE_SECRET_KEY,
  paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublicKey: process.env.VITE_STRIPE_PUBLIC_KEY,
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  flutterwavePublicKey: process.env.VITE_FLUTTERWAVE_PUBLIC_KEY,
  
  // Default avatar images
  defaultUserAvatar: "https://ui-avatars.com/api/?name=User&background=1E8E3E&color=fff",
  
  // Default settings
  defaultTaxRate: 0.00, // 0% tax
  defaultDeliveryFee: 1000, // ₦1,000
};
