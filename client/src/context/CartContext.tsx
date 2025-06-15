import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  quantity: number;
  foodId?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: (silent?: boolean) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isLoading: boolean;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const DELIVERY_FEE = 1000; // ₦1,000
const TAX_RATE = 0.00; // 0% tax

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cart from backend
  const { data: cartData, isLoading, refetch } = useQuery({
    queryKey: ['/api/cart'],
    enabled: true, // Only fetch if user is authenticated
    staleTime: 5000, // 5 seconds for more frequent updates
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Sync backend cart data with local state
  useEffect(() => {
    if (cartData && Array.isArray(cartData)) {
      // Transform backend cart data to frontend format
      const transformedItems = cartData.map((item: any) => ({
        id: item.id,
        foodId: item.foodId,
        name: item.name || 'Unknown item',
        description: item.description || '',
        price: item.price || 0,
        image: item.image || '',
        quantity: item.quantity
      }));
      setItems(transformedItems);
    }
  }, [cartData]);

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<CartItem, "quantity">) => {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodId: item.id, quantity: 1 })
      });
      if (!response.ok) throw new Error('Failed to add item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    }
  });

  const addItem = (item: Omit<CartItem, "quantity">) => {
    addItemMutation.mutate(item, {
      onSuccess: () => {
        toast({
          title: "Item added",
          description: `${item.name} has been added to your cart`,
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to add item to cart",
          variant: "destructive"
        });
      }
    });
  };

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ foodId, quantity }: { foodId: number, quantity: number }) => {
      const response = await fetch(`/api/cart/${foodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      if (!response.ok) throw new Error('Failed to update quantity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    }
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (foodId: number) => {
      const response = await fetch(`/api/cart/${foodId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    }
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cart', {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to clear cart');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    }
  });

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    
    updateQuantityMutation.mutate({ foodId: id, quantity });
  };

  const removeItem = (id: number) => {
    const item = items.find(item => item.id === id);
    const itemName = item?.name;
    
    removeItemMutation.mutate(id, {
      onSuccess: () => {
        if (itemName) {
          toast({
            title: "Item removed",
            description: `${itemName} has been removed from your cart`,
          });
        }
      }
    });
  };

  const clearCart = (silent: boolean = false) => {
    clearCartMutation.mutate(undefined, {
      onSuccess: () => {
        if (!silent) {
          toast({
            title: "Cart cleared",
            description: "All items have been removed from your cart",
          });
        }
      },
      onError: (error) => {
        console.error("Failed to clear cart:", error);
        if (!silent) {
          toast({
            title: "Error",
            description: "Failed to clear cart. Please try again.",
            variant: "destructive"
          });
        }
      }
    });
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTax = () => {
    return Math.round(getSubtotal() * TAX_RATE);
  };

  const getDeliveryFee = () => {
    return items.length > 0 ? DELIVERY_FEE : 0;
  };

  const getTotal = () => {
    return getSubtotal() + getTax() + getDeliveryFee();
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const getTotalItems = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return getTotal();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        getSubtotal,
        getTax,
        getDeliveryFee,
        getTotal,
        getItemCount,
        getTotalItems,
        getTotalPrice,
        isLoading,
        refreshCart: refetch
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
