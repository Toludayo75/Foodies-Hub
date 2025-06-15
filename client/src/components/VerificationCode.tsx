import { useState } from "react";

interface VerificationCodeProps {
  onSubmit: (code: string) => void;
  onResend: () => void;
}

export default function VerificationCode({ onSubmit, onResend }: VerificationCodeProps) {
  const [code, setCode] = useState(["", "", "", ""]);
  
  const handleDigitChange = (index: number, value: string) => {
    if (/^\d?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      // Auto focus next input if value is entered
      if (value && index < 3) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };
  
  const handleNumberClick = (number: string) => {
    // Find first empty slot or replace last digit
    const index = code.findIndex(digit => !digit);
    
    if (index !== -1) {
      handleDigitChange(index, number);
    } else {
      handleDigitChange(3, number);
    }
  };
  
  const handleSubmit = () => {
    const fullCode = code.join("");
    if (fullCode.length === 4) {
      onSubmit(fullCode);
    }
  };
  
  return (
    <div>
      {/* Code Input Boxes */}
      <div className="flex justify-center gap-2 mb-4">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 border border-gray-300 rounded-lg flex items-center justify-center font-medium text-center"
            maxLength={1}
          />
        ))}
      </div>
      
      <p className="text-center mb-8">
        <span className="text-sm text-secondary-content">if you don't receive a code? </span>
        <button 
          onClick={onResend}
          className="text-sm text-secondary-color font-medium"
        >
          Resend
        </button>
      </p>
      
      {/* Number Keypad */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, "*", 0, "#"].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-12 font-medium text-lg"
          >
            {num}
          </button>
        ))}
      </div>
      
      <button 
        onClick={handleSubmit}
        className="w-full bg-primary-color text-white py-3 rounded-lg font-medium"
      >
        Continue
      </button>
    </div>
  );
}
