import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RiderHeader() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = React.useState([
    { id: 1, message: "New delivery assigned" },
    { id: 2, message: "Order ready for pickup" },
  ]);

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Rider Dashboard</h1>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex cursor-pointer py-2"
                    >
                      <span>{notification.message}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>{user?.firstName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-500 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}