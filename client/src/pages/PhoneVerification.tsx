import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PhoneVerification() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");
  const { toast } = useToast();
  
  const handleGoBack = () => {
    navigate("/forgot-password");
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would make an API call to send a verification code
    toast({
      title: "Verification SMS sent",
      description: "Please check your phone for the verification code",
    });
    
    navigate("/verification-code");
  };
  
  return (
    <div>
      <div className="screen-header-with-back">
        <button className="mr-2" onClick={handleGoBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className="screen-title">Phone number</h1>
      </div>
      
      <div className="p-4 bg-white">
        <p className="mb-6">Enter your phone number</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="fa-solid fa-phone text-gray-400"></i>
              </div>
              <input 
                type="tel" 
                placeholder="Phone number" 
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
