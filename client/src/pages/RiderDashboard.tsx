import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { LogOut, Bell, User, Navigation, CheckCircle2, MapPin, Phone } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Types for orders
type Order = {
  id: number;
  userId: number;
  addressId: number;
  riderId: number | null;
  total: number;
  status: string;
  deliveryCode: string | null;
  createdAt: string;
};

type OrderItem = {
  id: number;
  orderId: number;
  foodId: number;
  quantity: number;
  price: number;
  foodName?: string;
};

type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

type Address = {
  id: number;
  userId: number;
  name: string;
  address: string;
};

type OrderDetails = {
  order: Order;
  items: OrderItem[];
  customer: Customer;
  address: Address;
};

export default function RiderDashboard() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeliveryCodeModal, setShowDeliveryCodeModal] = useState(false);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Get real notification count
  const { data: notificationCount = { count: 0 } } = useQuery({
    queryKey: ['/api/notifications/count'],
  });

  // Get orders assigned to this rider
  const { data: riderOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/rider/orders'],
    queryFn: async () => {
      return await fetch('/api/rider/orders', { credentials: "include" })
        .then(res => res.json());
    },
    enabled: !!user && user.role === 'rider'
  });

  // Get specific order details
  const { refetch: refetchOrderDetails } = useQuery({
    queryKey: ['/api/rider/orders', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) throw new Error("No order selected");
      return await fetch(`/api/rider/orders/${selectedOrder.id}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          setSelectedOrderDetails(data);
          return data;
        });
    },
    enabled: !!selectedOrder,
  });

  // Mutation to update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      return await fetch(`/api/rider/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: "include"
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rider/orders'] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      });
    }
  });

  // Mutation to verify delivery code
  const verifyDeliveryCode = useMutation({
    mutationFn: async ({ orderId, code }: { orderId: number, code: string }) => {
      return await fetch(`/api/rider/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: "include"
      }).then(res => res.json());
    },
    onSuccess: () => {
      setShowDeliveryCodeModal(false);
      setDeliveryCode("");
      queryClient.invalidateQueries({ queryKey: ['/api/rider/orders'] });
      toast({
        title: "Delivery Confirmed",
        description: "The delivery has been successfully confirmed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid delivery code",
        variant: "destructive"
      });
    }
  });

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-gray-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-purple-500';
      case 'picked_up': return 'bg-yellow-500';
      case 'out_for_delivery': return 'bg-indigo-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Handle viewing order details
  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    refetchOrderDetails();
  };

  // Handle status update
  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateOrderStatus.mutate({ orderId, status: newStatus });
  };

  // Handle delivery code verification
  const handleVerifyDeliveryCode = () => {
    if (!selectedOrder) return;
    verifyDeliveryCode.mutate({ orderId: selectedOrder.id, code: deliveryCode });
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Open maps with address
  const openMapsWithAddress = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
  };

  // Make a phone call
  const callCustomer = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (price % 1 === 0) {
      // Whole number - no decimals
      return `₦${price.toLocaleString()}`;
    } else {
      // Has decimals - show 2 decimal places
      return `₦${price.toFixed(2)}`;
    }
  };

  if (!user || user.role !== 'rider') {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">You don't have permission to access this page</p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Return to Home
        </Button>
      </div>
    </div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Rider Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Rider Dashboard</h1>
            
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => navigate("/rider/notifications")}
              >
                <Bell className="h-5 w-5" />
                {(notificationCount as any)?.count > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                )}
              </Button>
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span>{user.firstName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto p-4 flex-1">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column - Order list */}
          <div>
            <h2 className="text-xl font-semibold mb-4">My Deliveries</h2>
            {isLoadingOrders ? (
              <div className="text-center py-4">Loading orders...</div>
            ) : riderOrders && riderOrders.length > 0 ? (
              <div className="grid gap-4">
                {riderOrders.map((order: Order) => (
                  <Card 
                    key={order.id} 
                    className={`p-4 border cursor-pointer hover:border-primary transition-colors ${selectedOrder?.id === order.id ? 'border-primary-500 border-2' : ''}`}
                    onClick={() => handleViewOrderDetails(order)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">Order #{order.id}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="mt-2">
                      <p className="font-semibold">Total: {formatPrice(order.total)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600">No deliveries assigned to you yet</p>
              </div>
            )}
          </div>
          
          {/* Right column - Selected order details */}
          <div>
            {selectedOrder && selectedOrderDetails ? (
              <Card className="p-4 border">
                <CardHeader className="pb-2">
                  <CardTitle>Order Details #{selectedOrder.id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm text-gray-500">Status</h3>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm text-gray-500">Customer</h3>
                    <p>{selectedOrderDetails.customer.firstName} {selectedOrderDetails.customer.lastName}</p>
                    {selectedOrderDetails.customer.phone && (
                      <div className="flex items-center mt-1">
                        <p className="text-sm">{selectedOrderDetails.customer.phone}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2 h-6 w-6 p-0 rounded-full" 
                          onClick={() => selectedOrderDetails.customer.phone && callCustomer(selectedOrderDetails.customer.phone)}
                        >
                          <Phone className="h-4 w-4 text-green-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm text-gray-500">Delivery Address</h3>
                    <div className="flex items-center">
                      <p>{selectedOrderDetails.address?.address || 'Address not available'}</p>
                      {selectedOrderDetails.address?.address && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-2 h-6 w-6 p-0 rounded-full" 
                          onClick={() => openMapsWithAddress(selectedOrderDetails.address.address)}
                        >
                          <MapPin className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm text-gray-500">Items</h3>
                    <ul className="mt-1 space-y-1">
                      {selectedOrderDetails.items.map((item: OrderItem) => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.quantity}x {item.foodName || `Item #${item.foodId}`}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                  
                  {/* Action buttons based on current status */}
                  <div className="mt-6 flex flex-col gap-2">
                    {selectedOrder.status === 'ready' && (
                      <Button 
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'picked_up')}
                        className="w-full"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Picked Up
                      </Button>
                    )}
                    
                    {selectedOrder.status === 'picked_up' && (
                      <Button 
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'out_for_delivery')}
                        className="w-full"
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Start Delivery
                      </Button>
                    )}
                    
                    {selectedOrder.status === 'out_for_delivery' && (
                      <Button 
                        onClick={() => setShowDeliveryCodeModal(true)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete Delivery
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg p-8">
                <div className="text-center text-gray-500">
                  <h3 className="font-semibold mb-2">Select an order to view details</h3>
                  <p className="text-sm">Click on an order from the list to see its details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Delivery code verification modal */}
      <Dialog open={showDeliveryCodeModal} onOpenChange={setShowDeliveryCodeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Delivery</DialogTitle>
            <DialogDescription>
              Ask the customer for their delivery code to complete the delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value)}
              placeholder="Enter delivery code"
              className="text-center text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryCodeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerifyDeliveryCode}>
              Verify & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}