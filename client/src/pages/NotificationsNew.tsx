import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Bell, ShoppingBag, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: number;
  userId: number;
  type: 'order' | 'payment' | 'delivery' | 'system';
  title: string;
  message: string;
  orderId?: number;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Notification settings
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promos, setPromos] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  
  // Fetch notifications from API
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
  });

  // Fetch unread count
  const { data: notificationCount } = useQuery<{count: number}>({
    queryKey: ['/api/notifications/count'],
    enabled: isAuthenticated,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
      toast({
        title: "All notifications marked as read",
        duration: 2000,
      });
    },
  });
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleGoBack = () => {
    navigate("/settings");
  };
  
  const handleNotificationClick = (id: number) => {
    markAsReadMutation.mutate(id);
  };
  
  const handleClearAll = () => {
    markAllAsReadMutation.mutate();
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      case 'payment':
        return <Bell className="h-5 w-5 text-green-500" />;
      case 'delivery':
        return <ShoppingBag className="h-5 w-5 text-orange-500" />;
      case 'system':
        return <Info className="h-5 w-5 text-gray-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  if (loading || loadingNotifications) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-foodies-green border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  const unreadCount = notificationCount?.count || 0;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b bg-white">
        <div className="flex items-center">
          <button
            onClick={handleGoBack}
            className="mr-4"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Notifications</h1>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearAll}
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      {/* Notifications List */}
      <div className="p-4">
        <Tabs defaultValue="all" className="mb-4">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`bg-white rounded-lg p-4 shadow-sm relative flex cursor-pointer ${!notification.isRead ? 'border-l-4 border-foodies-green' : ''}`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="mr-3 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-black">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-foodies-green"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="unread" className="mt-4 space-y-3">
            {notifications.filter(n => !n.isRead).length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No unread notifications</p>
              </div>
            ) : (
              notifications
                .filter(notification => !notification.isRead)
                .map(notification => (
                  <div 
                    key={notification.id}
                    className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-foodies-green flex cursor-pointer"
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="mr-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-black">
                          {notification.title}
                        </h3>
                        <div className="w-2 h-2 rounded-full bg-foodies-green"></div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                    </div>
                  </div>
                ))
            )}
          </TabsContent>
        </Tabs>
        
        {/* Notification Settings */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
          
          <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="order-updates" className="text-base font-medium">Order Updates</Label>
                <p className="text-sm text-gray-500">Get notified about your order status</p>
              </div>
              <Switch 
                id="order-updates"
                checked={orderUpdates}
                onCheckedChange={setOrderUpdates}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="promos" className="text-base font-medium">Promotions</Label>
                <p className="text-sm text-gray-500">Receive special offers and deals</p>
              </div>
              <Switch 
                id="promos"
                checked={promos}
                onCheckedChange={setPromos}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="app-updates" className="text-base font-medium">App Updates</Label>
                <p className="text-sm text-gray-500">Get notified about new features</p>
              </div>
              <Switch 
                id="app-updates"
                checked={appUpdates}
                onCheckedChange={setAppUpdates}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}