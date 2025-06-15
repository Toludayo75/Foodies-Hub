import { useLocation } from "wouter";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  
  const handleGoBack = () => {
    navigate("/login");
  };
  
  const handleEmailReset = () => {
    navigate("/email-verification");
  };
  
  const handlePhoneReset = () => {
    navigate("/phone-verification");
  };
  
  return (
    <div>
      <div className="screen-header-with-back">
        <button className="mr-2" onClick={handleGoBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h1 className="screen-title">Forgotten Password</h1>
      </div>
      
      <div className="p-4 bg-white">
        <p className="mb-6">Select which contact should be used to reset your password.</p>
        
        <button 
          onClick={handleEmailReset}
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 flex items-center"
        >
          <i className="fa-regular fa-envelope text-gray-400 mr-3"></i>
          <span className="text-secondary-content">Send to Email</span>
        </button>
        
        <button 
          onClick={handlePhoneReset}
          className="w-full p-3 border border-gray-300 rounded-lg mb-6 flex items-center"
        >
          <i className="fa-solid fa-phone text-gray-400 mr-3"></i>
          <span className="text-secondary-content">Phone number</span>
        </button>
      </div>
    </div>
  );
}
