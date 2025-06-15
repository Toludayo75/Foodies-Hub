import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { Bell, Check, CheckCheck, Package, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminNotifications() {
  const [, navigate] = useLocation();
  
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
  });

  const { data: notificationCount = { count: 0 } } = useQuery({
    queryKey: ['/api/notifications/count'],
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/notifications/read-all`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4" />;
      case 'payment':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-500';
      case 'payment':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/admin")}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Admin Notifications</h1>
          {(notificationCount as any)?.count > 0 && (
            <Badge variant="destructive">{(notificationCount as any)?.count}</Badge>
          )}
        </div>

        {notifications.length > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="flex items-center gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Notifications</h3>
            <p className="text-gray-500">You're all caught up! New notifications will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification: any) => (
            <Card
              key={notification.id}
              className={`transition-all duration-200 hover:shadow-md ${
                !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)} text-white`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-2 leading-relaxed">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {notification.orderId && (
                          <Badge variant="outline" className="text-xs">
                            Order #{notification.orderId}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                      disabled={markAsReadMutation.isPending}
                      className="flex-shrink-0 ml-2"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}