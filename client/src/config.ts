// Application configuration
const config = {
  // Payment keys - use environment variables with fallback for testing
  paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_46f5e419ff5793e744eebf88edd098bdfbe3dff5",
  
  // API URLs
  apiUrl: "/api",
  
  // App settings
  appName: "Foodies",
  currency: "NGN",
  currencySymbol: "₦",
  
  // Delivery settings
  deliveryFeePercentage: 0.05, // 5% of order total
  
  // Default images
  defaultFoodImage: "/images/default-food.jpg",
  defaultCategoryIcon: "utensils"
};

export default config;