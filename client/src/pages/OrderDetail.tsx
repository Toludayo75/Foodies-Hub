import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { DeliveryCodeDisplay } from "@/components/DeliveryCodeDisplay";
import { apiRequest } from "@/lib/queryClient";

// Types for order details
type OrderItem = {
  id: number;
  orderId: number;
  foodId: number;
  quantity: number;
  price: number;
  name?: string;
  image?: string;
};

type Order = {
  id: number;
  userId: number;
  addressId: number;
  riderId: number | null;
  total: number;
  status: string;
  createdAt: string;
  deliveryCode?: string;
};

type Address = {
  id: number;
  userId: number;
  name: string;
  address: string;
};

type OrderDetail = {
  order: Order;
  items: OrderItem[];
  address: Address;
};

export default function OrderDetail() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Extract order ID from URL
  const orderId = parseInt(location.split('/').pop() || '0');
  
  // Fetch order details
  const { data: orderDetail, isLoading } = useQuery<OrderDetail>({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${orderId}`);
      return response.json();
    },
    enabled: isAuthenticated && !!orderId,
  });
  
  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-500';
      case 'confirmed': return 'bg-purple-500';
      case 'preparing': return 'bg-amber-500';
      case 'ready': return 'bg-indigo-500';
      case 'picked_up': return 'bg-yellow-500';
      case 'out_for_delivery': return 'bg-orange-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  // Format status display
  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="container mx-auto max-w-md p-4 pb-20">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/home")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold ml-2">Order Details</h1>
      </div>
      
      {isLoading || !orderDetail ? (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foodies-green mx-auto"></div>
          <p className="mt-2">Loading order details...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div>
                  <CardTitle>Order #{orderDetail.order.id}</CardTitle>
                  <div className="text-sm text-gray-500 flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(new Date(orderDetail.order.createdAt), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
                <Badge className={getStatusColor(orderDetail.order.status)}>
                  {formatStatus(orderDetail.order.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Delivery Code - Only show if order is out for delivery */}
              {orderDetail.order.status === 'out_for_delivery' && (
                <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                  <div className="font-semibold mb-2">Delivery Code</div>
                  <DeliveryCodeDisplay orderId={orderDetail.order.id} />
                  <p className="text-xs text-gray-500 mt-2">
                    Share this code with your delivery rider when they arrive.
                  </p>
                </div>
              )}
              
              {/* Delivery Address */}
              <div className="mb-4">
                <h3 className="font-medium text-sm mb-2">Delivery Address</h3>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{orderDetail.address?.name || 'Address Name'}</div>
                    <div className="text-gray-600">{orderDetail.address?.address || 'Address not available'}</div>
                  </div>
                </div>
              </div>
              
              {/* Order Items */}
              <div>
                <h3 className="font-medium text-sm mb-2">Order Items</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  {orderDetail.items.map((item) => (
                    <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="font-medium">{item.name || `Item #${item.foodId}`}</div>
                        <div className="text-sm text-gray-500">x{item.quantity}</div>
                      </div>
                      <div className="font-medium">
                        ₦{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>₦{orderDetail.order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mt-1 font-medium">
                      <span>Delivery Fee</span>
                      <span>₦0.00</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 font-bold">
                      <span>Total</span>
                      <span>₦{orderDetail.order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Help and Support Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">Need help with your order?</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => navigate("/help-center")}
            >
              Contact Support
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}