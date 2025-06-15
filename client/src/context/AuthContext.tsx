import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  recoverSession: (sessionToken: string) => Promise<User | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  
  // Function to refresh the user data
  const refreshUser = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const userData = await response.json();
      console.log("Refreshed user data:", userData);
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      setLoading(false);
      return null;
    }
  };

  // Function to recover session from payment token
  const recoverSession = async (sessionToken: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/recover-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ sessionToken }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to recover session");
      }
      
      const result = await response.json();
      if (result.success && result.user) {
        setUser(result.user);
        console.log("Session recovered successfully:", result.user);
        return result.user;
      }
      
      throw new Error("Session recovery failed");
    } catch (error) {
      console.error("Failed to recover session:", error);
      setLoading(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const response = await apiRequest("GET", "/api/auth/me");
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const result = await response.json();
      const userData = result.user || result;
      setUser(userData);
      
      // Redirect based on user role
      if (userData.role === 'admin') {
        setLocation("/admin");
        toast({
          title: "Admin Login successful",
          description: "Welcome to Admin Dashboard",
        });
      } else if (userData.role === 'rider') {
        setLocation("/rider");
        toast({
          title: "Rider Login successful",
          description: "Welcome to Rider Dashboard",
        });
      } else {
        setLocation("/home");
        toast({
          title: "Login successful",
          description: "Welcome back to Foodies!",
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string, phone?: string) => {
    try {
      setLoading(true);
      const response = await apiRequest("POST", "/api/auth/register", {
        firstName,
        lastName,
        email,
        password,
        ...(phone && { phone }),
      });
      const userData = await response.json();
      setUser(userData);
      setLocation("/home");
      toast({
        title: "Registration successful",
        description: "Welcome to Foodies!",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      setLocation("/login");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        recoverSession,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
