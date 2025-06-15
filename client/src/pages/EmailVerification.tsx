import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function EmailVerification() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  
  const handleGoBack = () => {
    navigate("/forgot-password");
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would make an API call to send a verification code
    toast({
      title: "Verification email sent",
      description: "Please check your email for the verification code",
    });
    
    navigate("/verification-code");
  };
  
  return (
    <div>
      <div className="screen-header-with-back">
        <button className="mr-2" onClick={handleGoBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className="screen-title">Email Address</h1>
      </div>
      
      <div className="p-4 bg-white">
        <p className="mb-6">Enter your email address</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i className="fa-regular fa-envelope text-gray-400"></i>
              </div>
              <input 
                type="email" 
                placeholder="Your email" 
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
