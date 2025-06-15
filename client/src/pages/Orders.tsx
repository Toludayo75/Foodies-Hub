import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import OrderStatus from "@/components/OrderStatus";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

interface Order {
  id: number;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    foodId: number;
    quantity: number;
    price: number;
    name?: string;
  }>;
}

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  
  // Pull-to-refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0 && distance < 120) {
      setPullDistance(distance);
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling.current && pullDistance > 60) {
      setIsRefreshing(true);
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } catch (error) {
        console.error('Failed to refresh orders:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    isPulling.current = false;
    setPullDistance(0);
  };

  // Fetch user orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: isAuthenticated,
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: number) => 
      apiRequest('DELETE', `/api/orders/${orderId}`),
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
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  const handleGoBack = () => {
    navigate("/home");
  };

  const canDeleteOrder = (status: string) => {
    return ['pending', 'confirmed', 'preparing'].includes(status);
  };

  const handleDeleteOrder = (orderId: number) => {
    deleteOrderMutation.mutate(orderId);
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div 
      ref={containerRef}
      className="mobile-page bg-gray-50 pb-24 relative"
      style={{ transform: `translateY(${pullDistance}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-white py-4 z-50"
          style={{ transform: `translateY(-${100 - pullDistance}px)` }}
        >
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      <div className="screen-header-with-back sticky top-0 bg-white z-40 shadow-sm">
        <button className="mr-2" onClick={handleGoBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className="screen-title">Order status</h1>
      </div>
      
      <div className="p-4 bg-white">
        {isLoading ? (
          // Skeleton loader for orders
          <div className="flex flex-col gap-3">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between mb-2">
                  <Skeleton className="w-1/3 h-5" />
                  <Skeleton className="w-20 h-5" />
                </div>
                <div className="flex justify-between mb-3">
                  <Skeleton className="w-16 h-5" />
                  <div className="text-right">
                    <Skeleton className="w-12 h-4 mb-1" />
                    <Skeleton className="w-20 h-4" />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Skeleton className="w-28 h-4" />
                  <Skeleton className="w-14 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <i className="fa-solid fa-clock-rotate-left text-4xl text-gray-300 mb-4"></i>
            <p>You haven't placed any orders yet</p>
            <button 
              onClick={() => navigate("/menu")}
              className="mt-4 text-primary-color font-medium"
            >
              Start shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              // Format date
              const date = new Date(order.createdAt);
              const formattedDate = format(date, "dd/MM/yyyy");
              const formattedTime = format(date, "HH:mm");
              
              // Use the first item's name as the order name
              const orderName = order.items && order.items.length > 0 && order.items[0]?.name
                ? order.items[0].name
                : `Order #${order.id}`;
              
              return (
                <OrderStatus
                  key={order.id}
                  id={order.id}
                  name={orderName}
                  price={order.total}
                  status={order.status}
                  date={formattedDate}
                  time={formattedTime}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
