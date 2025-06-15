import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { ChevronRight, LogOut, User, CreditCard, MapPin, Bell, HelpCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LogoutConfirmation from "@/components/LogoutConfirmation";

export default function Settings() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [, navigate] = useLocation();
  const { setPreviousPage } = useNavigation();
  const { toast } = useToast();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  
  const handleEditProfile = () => {
    navigate("/edit-profile");
  };
  
  const handlePersonalInfo = () => {
    navigate("/personal-info");
  };
  
  const handleManageAddresses = () => {
    setPreviousPage("/settings");
    navigate("/addresses");
  };
  
  const handleManagePayments = () => {
    setPreviousPage("/settings");
    navigate("/payment-method");
  };
  
  const handleNotifications = () => {
    setPreviousPage("/settings");
    navigate("/notifications");
  };
  
  const handleWallet = () => {
    setPreviousPage("/settings");
    navigate("/wallet");
  };

  const handleHelpCenter = () => {
    setPreviousPage("/settings");
    navigate("/help-center");
  };
  
  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    await logout();
    setShowLogoutConfirmation(false);
  };
  
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-foodies-green border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="pb-20 bg-gray-50 min-h-screen">
      {/* Profile Section */}
      <div className="bg-white p-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full overflow-hidden mb-2">
          <img 
            src={user.profileImage || "https://via.placeholder.com/80"} 
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-xl font-semibold mb-2">{user.firstName} {user.lastName}</h2>
        <Button 
          onClick={handleEditProfile}
          className="bg-foodies-green hover:bg-foodies-green/90 text-white rounded-full px-6 py-1 h-auto text-sm"
        >
          Edit profile
        </Button>
      </div>
      
      {/* Settings List */}
      <div className="p-4 space-y-4">
        {/* Personal Information */}
        <button 
          onClick={handlePersonalInfo}
          className="w-full bg-white rounded-lg p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-base">Personal Information</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        

        {/* Address */}
        <button 
          onClick={handleManageAddresses}
          className="w-full bg-white rounded-lg p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-base">Address</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        
        {/* Wallet */}
        <button 
          onClick={handleWallet}
          className="w-full bg-white rounded-lg p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center">
            <Wallet className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-base">Wallet</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        
        {/* Notification */}
        <button 
          onClick={handleNotifications}
          className="w-full bg-white rounded-lg p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-base">Notification</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        
        {/* Help Center */}
        <button 
          onClick={handleHelpCenter}
          className="w-full bg-white rounded-lg p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center">
            <HelpCircle className="h-5 w-5 text-gray-500 mr-3" />
            <span className="text-base">Help Center</span>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>
        
        {/* Logout */}
        <div className="flex justify-center mt-8">
          <button 
            onClick={handleLogout}
            className="flex items-center text-red-500"
          >
            <LogOut className="h-5 w-5 mr-2" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmation 
        open={showLogoutConfirmation}
        onOpenChange={setShowLogoutConfirmation}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
