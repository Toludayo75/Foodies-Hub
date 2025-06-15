import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PersonalInfo() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  
  const handleGoBack = () => {
    navigate("/settings");
  };
  
  const handleEditProfile = () => {
    navigate("/edit-profile");
  };
  
  const handleChangePassword = () => {
    // Navigate to change password page once implemented
    navigate("/change-password");
  };
  
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-foodies-green border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Header */}
      <div className="p-4 flex items-center border-b bg-white">
        <button
          onClick={handleGoBack}
          className="mr-4"
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold">Personal Information</h1>
      </div>
      
      {/* Personal Info */}
      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center">
            <div className="w-12 h-12 rounded-full overflow-hidden mr-4 bg-gray-200">
              <img 
                src={user?.profileImage || "https://via.placeholder.com/48"} 
                alt={`${user?.firstName} ${user?.lastName}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-gray-500">Basic account information</p>
            </div>
            <button 
              onClick={handleEditProfile}
              aria-label="Edit profile"
            >
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
          
          <div className="px-4 py-3 border-b">
            <p className="text-sm text-gray-500 mb-1">Email</p>
            <p>{user.email}</p>
          </div>
          
          <div className="px-4 py-3">
            <p className="text-sm text-gray-500 mb-1">Phone</p>
            <p>{user.phone || "Not provided"}</p>
          </div>
        </div>
        
        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="font-medium">Security</h3>
          </div>
          
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div>
              <p>Password</p>
              <p className="text-sm text-gray-500">Change your password</p>
            </div>
            <button 
              onClick={handleChangePassword}
              aria-label="Change password"
            >
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="font-medium">Account Information</h3>
          </div>
          
          <div className="px-4 py-3 border-t">
            <p className="text-sm text-gray-500 mb-1">Account Created</p>
            <p>May 7, 2023</p>
          </div>
          
          <div className="px-4 py-3 border-t">
            <p className="text-sm text-gray-500 mb-1">Account Status</p>
            <p className="text-foodies-green">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}