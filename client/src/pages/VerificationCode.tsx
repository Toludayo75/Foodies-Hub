import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import VerificationCodeInput from "@/components/VerificationCode";

export default function VerificationCode() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleGoBack = () => {
    navigate("/forgot-password");
  };
  
  const handleSubmit = (code: string) => {
    if (code.length !== 4) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 4-digit code",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // In a real app, this would validate the code with an API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Code verified",
        description: "Your verification code is correct",
      });
      navigate("/password-reset-success");
    }, 1000);
  };
  
  const handleResend = () => {
    toast({
      title: "Code resent",
      description: "A new verification code has been sent",
    });
  };
  
  return (
    <div>
      <div className="screen-header-with-back">
        <button className="mr-2" onClick={handleGoBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className="screen-title">Verification Code</h1>
      </div>
      
      <div className="p-4 bg-white">
        <p className="text-center mb-6">please enter the code</p>
        
        <VerificationCodeInput 
          onSubmit={handleSubmit}
          onResend={handleResend}
        />
      </div>
    </div>
  );
}
