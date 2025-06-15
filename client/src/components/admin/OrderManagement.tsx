import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";

// Types
type Order = {
  id: number;
  userId: number;
  addressId: number;
  riderId: number | null;
  total: number;
  status: string;
  deliveryCode: string | null;
  createdAt: string;
  customerName?: string;
  address?: string;
};

type Rider = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type OrderDetail = {
  items: Array<OrderItem>;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  address: {
    address: string;
  };
};

export default function OrderManagement() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAssignRiderDialog, setShowAssignRiderDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['/api/admin/orders', selectedStatus],
    queryFn: async () => {
      const url = selectedStatus 
        ? `/api/admin/orders?status=${selectedStatus}` 
        : '/api/admin/orders';
      return await fetch(url, { credentials: "include" })
        .then(res => res.json());
    }
  });

  // Get order details when an order is selected
  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/admin/orders', selectedOrder?.id, 'details'],
    queryFn: async () => {
      if (!selectedOrder) return null;
      return await fetch(`/api/admin/orders/${selectedOrder.id}/details`, { 
        credentials: "include" 
      }).then(res => res.json());
    },
    enabled: !!selectedOrder
  });

  // Get riders for assignment
  const { data: riders, isLoading: isLoadingRiders } = useQuery({
    queryKey: ['/api/admin/riders'],
    queryFn: async () => {
      return await fetch('/api/admin/riders', { credentials: "include" })
        .then(res => res.json());
    }
  });

  // Mutation to update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number, status: string }) => {
      return await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: "include"
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive"
      });
    }
  });

  // Mutation to assign rider
  const assignRider = useMutation({
    mutationFn: async ({ orderId, riderId }: { orderId: number, riderId: number }) => {
      return await fetch(`/api/admin/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId }),
        credentials: "include"
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Rider Assigned",
        description: "Rider has been assigned to the order",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign rider",
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

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status === 'all' ? null : status);
  };

  // Handle order status update
  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    updateOrderStatus.mutate({ orderId, status: newStatus });
    // If we're updating from the detail view, also update the selected order
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({
        ...selectedOrder,
        status: newStatus
      });
    }
  };

  // Handle rider assignment
  const handleRiderAssign = (orderId: number, riderId: number) => {
    assignRider.mutate({ orderId, riderId });
  };

  // View order details
  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
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

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Order Management</CardTitle>
          <Select
            value={selectedStatus || ""}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : orders && orders.length > 0 ? (
            <div className="grid gap-4">
              {orders.map((order: Order) => (
                <Card key={order.id} className="p-4 border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold">Order #{order.id}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      {order.customerName && (
                        <p className="text-sm">Customer: {order.customerName}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="my-2">
                    <p className="font-semibold">Total: {formatPrice(order.total)}</p>
                    {order.deliveryCode && (
                      <p className="text-sm">Delivery Code: {order.deliveryCode}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewOrderDetails(order)}
                    >
                      View Details
                    </Button>
                    
                    {/* Action buttons based on current status */}
                    {order.status === 'placed' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Confirm Order
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        Mark as Preparing
                      </Button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        Mark as Ready
                      </Button>
                    )}
                    
                    {/* Rider assignment */}
                    {['confirmed', 'preparing', 'ready'].includes(order.status) && (
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(value) => handleRiderAssign(order.id, parseInt(value))}
                          value={order.riderId?.toString() || ""}
                          disabled={isLoadingRiders}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Assign Rider" />
                          </SelectTrigger>
                          <SelectContent>
                            {riders && riders.map((rider: Rider) => (
                              <SelectItem key={rider.id} value={rider.id.toString()}>
                                {rider.firstName} {rider.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">No orders found</div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {isLoadingDetails ? (
            <div className="text-center py-4">Loading order details...</div>
          ) : orderDetails ? (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Customer</h3>
                <p>Name: {orderDetails.customer.firstName} {orderDetails.customer.lastName}</p>
                <p>Email: {orderDetails.customer.email}</p>
                {orderDetails.customer.phone && <p>Phone: {orderDetails.customer.phone}</p>}
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <p>{orderDetails.address?.address || 'Address not available'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <ul className="space-y-2">
                  {orderDetails.items.map((item: OrderItem) => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.name || `Item #${item.id}`}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="border-t mt-4 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder?.total || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Order Status Update Section */}
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-3">Update Order Status</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Select 
                    defaultValue={selectedOrder?.status}
                    onValueChange={(value) => handleStatusUpdate(selectedOrder?.id as number, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {!selectedOrder?.riderId && (
                    <Button 
                      onClick={() => setShowAssignRiderDialog(true)} 
                      variant="outline"
                    >
                      Assign Rider
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">Could not load order details</div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowOrderDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}