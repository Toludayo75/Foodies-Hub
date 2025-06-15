import { useLocation } from "wouter";

export default function PasswordResetSuccess() {
  const [, navigate] = useLocation();
  
  const handleGoBack = () => {
    navigate("/login");
  };
  
  const handleSignIn = () => {
    navigate("/login");
  };
  
  return (
    <div>
      <div className="screen-header-with-back">
        <button className="mr-2" onClick={handleGoBack}>
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      </div>
      
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 bg-white">
        <div className="w-20 h-20 rounded-full border-2 border-primary-color flex items-center justify-center mb-6">
          <i className="fa-solid fa-check text-3xl text-primary-color"></i>
        </div>
        
        <h2 className="text-xl font-semibold mb-2">Password Reset</h2>
        <p className="text-center text-secondary-content mb-8">Your password has been reset successfully</p>
        
        <button 
          onClick={handleSignIn}
          className="btn-primary"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
