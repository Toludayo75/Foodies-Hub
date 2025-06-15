import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { UserCog, Truck, User } from "lucide-react";

export function RoleWelcome() {
  const { user } = useAuth();

  if (!user) return null;

  // Role-specific welcome messages and navigation
  if (user.role === 'admin') {
    return (
      <div className="bg-gray-100 p-4 rounded-lg mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <UserCog className="text-foodies-green" />
          <h2 className="font-semibold text-lg">Admin Dashboard</h2>
        </div>
        <p className="text-gray-600 mb-3">Manage orders, assign riders, and update menu items.</p>
        <Link href="/admin">
          <Button className="w-full">Go to Admin Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (user.role === 'rider') {
    return (
      <div className="bg-gray-100 p-4 rounded-lg mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="text-foodies-green" />
          <h2 className="font-semibold text-lg">Rider Dashboard</h2>
        </div>
        <p className="text-gray-600 mb-3">View assigned deliveries and manage delivery status.</p>
        <Link href="/rider">
          <Button className="w-full">Go to Rider Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Default for customer role
  return null;
}