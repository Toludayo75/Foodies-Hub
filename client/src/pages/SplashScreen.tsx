import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export default function SplashScreen() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Auto-navigate to home if authenticated, or onboarding if not
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate("/home");
      } else {
        navigate("/onboarding/1");
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);
  
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-foodies-yellow">
      <div className="text-5xl font-bold italic text-black">
        Foodies
        <span className="block h-2 w-32 bg-foodies-green rounded-full mt-1 ml-auto transform translate-y-2"></span>
      </div>
    </div>
  );
}