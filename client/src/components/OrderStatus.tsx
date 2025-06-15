import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderStatusProps {
  id: number;
  name: string;
  price: number;
  status: string;
  date: string;
  time: string;
}

export default function OrderStatus({ id, name, price, status, date, time }: OrderStatusProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Format price to show with thousand separator
  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price).replace('NGN', '₦');
  
  // Status color classes
  const statusClasses = {
    pending: "text-pending",
    completed: "text-success",
    canceled: "text-canceled"
  };
  
  // Mutation for deleting order
  const deleteOrderMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/orders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order deleted",
        description: "Your order has been successfully deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete order",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Mutation for repeating order
  const repeatOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/orders/${id}/repeat`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: `Items from ${name} have been added to your cart.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to repeat order",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  const handleRepeatOrder = () => {
    repeatOrderMutation.mutate();
  };
  
  const handleViewDetails = () => {
    // Navigate to order details page
    navigate(`/orders/${id}`);
  };

  const handleDeleteOrder = () => {
    deleteOrderMutation.mutate();
  };

  const canDeleteOrder = () => {
    return ['pending', 'confirmed', 'preparing'].includes(status);
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between">
        <h3 className="font-medium">{name}</h3>
        <span className={`${statusClasses[status as keyof typeof statusClasses]} font-medium`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="font-medium text-primary-color">{formattedPrice}</span>
        <div className="text-right">
          <span className="block text-sm text-secondary-content">{time}</span>
          <span className="block text-sm text-secondary-content">{date}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRepeatOrder}
            disabled={isLoading || repeatOrderMutation.isPending}
            className="text-secondary-content flex items-center gap-1 text-sm"
          >
            <i className="fa-solid fa-cart-plus text-xs"></i>
            <span>Add to Cart</span>
          </button>
          
          {canDeleteOrder() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button 
                  disabled={deleteOrderMutation.isPending}
                  className="text-red-500 flex items-center gap-1 text-sm hover:text-red-700 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this order? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteOrder}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        <button 
          onClick={handleViewDetails}
          className="text-secondary-color font-medium text-sm"
        >
          Details
        </button>
      </div>
    </div>
  );
}
