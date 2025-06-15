import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, User } from "lucide-react";
import OrderManagement from "@/components/admin/OrderManagement";
import MenuManagement from "@/components/admin/MenuManagement";
import RiderManagement from "@/components/admin/RiderManagement";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("orders");
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  
  // Get real notification count
  const { data: notificationCount = { count: 0 } } = useQuery({
    queryKey: ['/api/notifications/count'],
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2">You don't have permission to access this page</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Admin Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => navigate("/admin/notifications")}
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
                  <DropdownMenuItem onClick={logout} className="text-red-500 cursor-pointer">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="menu">Menu Management</TabsTrigger>
            <TabsTrigger value="riders">Riders</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu">
            <MenuManagement />
          </TabsContent>

          {/* Riders Tab */}
          <TabsContent value="riders">
            <div className="grid gap-4">
              <RiderManagement />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}