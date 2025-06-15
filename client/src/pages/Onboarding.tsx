import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import onboarding1 from '@assets/Fresh meal_1749126699417.jpg';
import onboarding2 from '@assets/Delivery_1749126704766.jpg';
import onboarding3 from '@assets/start today_1749126709476.jpg';

interface OnboardingSlide {
  image: string;
  title: string;
  description: string;
}

export default function Onboarding() {
  const params = useParams<{ step: string }>();
  const step = parseInt(params.step) || 1;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Redirect to home if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  // Define the onboarding slides
  const slides: OnboardingSlide[] = [
    {
      image: onboarding1,
      title: "Fresh meals",
      description: "Discover fresh, healthy meals deliver straight to your doorstep"
    },
    {
      image: onboarding2,
      title: "Quick Delivery",
      description: "Get your meal delivered quickly and conveniently"
    },
    {
      image: onboarding3,
      title: "Start Today",
      description: "Start your journey today with us."
    }
  ];
  
  const currentSlide = slides[step - 1];
  
  const handleNext = () => {
    if (step < slides.length) {
      navigate(`/onboarding/${step + 1}`);
    } else {
      navigate("/login");
    }
  };
  
  const handleSkip = () => {
    navigate("/login");
  };
  
  return (
    <div className="h-screen flex flex-col items-center justify-between py-16 bg-foodies-yellow">
      <div className="w-full flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-36 h-36 rounded-full overflow-hidden mb-8">
          <img 
            src={currentSlide.image} 
            alt={currentSlide.title} 
            className="w-full h-full object-cover"
          />
        </div>
        
        <h2 className="text-2xl font-bold text-black mb-2">{currentSlide.title}</h2>
        <p className="text-center text-black opacity-80 max-w-xs">
          {currentSlide.description}
        </p>
        
        <div className="flex space-x-2 mt-8">
          {slides.map((_, index) => (
            <div 
              key={index}
              className={`h-2 w-2 rounded-full ${index === step - 1 ? 'bg-foodies-green' : 'bg-white opacity-50'}`}
            />
          ))}
        </div>
      </div>
      
      <div className="w-full px-8 flex justify-between">
        <button 
          onClick={handleSkip} 
          className="text-foodies-green font-medium py-2"
        >
          Skip
        </button>
        
        {step === slides.length ? (
          <button 
            onClick={handleNext} 
            className="bg-foodies-green text-white font-medium py-3 px-16 rounded-md"
          >
            Get started
          </button>
        ) : (
          <button 
            onClick={handleNext} 
            className="bg-foodies-green text-white font-medium py-2 px-8 rounded-md"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}