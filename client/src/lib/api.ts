import { apiRequest } from "./queryClient";

// User API
export const userApi = {
  login: async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    return response.json();
  },
  
  register: async (username: string, email: string, password: string, phone?: string) => {
    const response = await apiRequest("POST", "/api/auth/register", { 
      username, 
      email, 
      password,
      ...(phone && { phone })
    });
    return response.json();
  },
  
  getCurrentUser: async () => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },
  
  logout: async () => {
    const response = await apiRequest("POST", "/api/auth/logout");
    return response.json();
  }
};

// Food API
export const foodApi = {
  getCategories: async () => {
    const response = await apiRequest("GET", "/api/categories");
    return response.json();
  },
  
  getFoods: async (categoryId?: number) => {
    let url = "/api/foods";
    if (categoryId) {
      url += `?categoryId=${categoryId}`;
    }
    const response = await apiRequest("GET", url);
    return response.json();
  },
  
  getFood: async (id: number) => {
    const response = await apiRequest("GET", `/api/foods/${id}`);
    return response.json();
  }
};

// Order API
export const orderApi = {
  getOrders: async () => {
    const response = await apiRequest("GET", "/api/orders");
    return response.json();
  },
  
  getOrder: async (id: number) => {
    const response = await apiRequest("GET", `/api/orders/${id}`);
    return response.json();
  },
  
  createOrder: async (orderData: any) => {
    const response = await apiRequest("POST", "/api/orders", orderData);
    return response.json();
  },
  
  updateOrderStatus: async (id: number, status: string) => {
    const response = await apiRequest("PUT", `/api/orders/${id}/status`, { status });
    return response.json();
  }
};

// Address API
export const addressApi = {
  getAddresses: async () => {
    const response = await apiRequest("GET", "/api/addresses");
    return response.json();
  },
  
  createAddress: async (addressData: any) => {
    const response = await apiRequest("POST", "/api/addresses", addressData);
    return response.json();
  },
  
  updateAddress: async (id: number, addressData: any) => {
    const response = await apiRequest("PUT", `/api/addresses/${id}`, addressData);
    return response.json();
  },
  
  deleteAddress: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/addresses/${id}`);
    return response.json();
  }
};

// Payment API
export const paymentApi = {
  processPayment: async (paymentData: any) => {
    const response = await apiRequest("POST", "/api/payments", paymentData);
    return response.json();
  }
};

// Chat API
export const chatApi = {
  getMessages: async () => {
    const response = await apiRequest("GET", "/api/messages");
    return response.json();
  },
  
  sendMessage: async (content: string) => {
    const response = await apiRequest("POST", "/api/messages", { content });
    return response.json();
  }
};
