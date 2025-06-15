import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface OrderSuccessDialogProps {
  open: boolean;
  onClose?: () => void;
}

const OrderSuccessDialog: React.FC<OrderSuccessDialogProps> = ({ open, onClose }) => {
  const [, navigate] = useLocation();

  const handleContinueShopping = () => {
    if (onClose) onClose();
    navigate("/home");
  };

  const handleGoToOrders = () => {
    if (onClose) onClose();
    navigate("/orders");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 rounded-2xl overflow-hidden">
        <div className="flex flex-col items-center p-6 pb-4 text-center">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200 flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-foodies-green" strokeWidth={3} />
          </div>
          
          <h2 className="text-xl font-bold mb-1">Your order is successful.</h2>
          
          <div className="w-full mt-6 mb-4">
            <Button 
              onClick={handleContinueShopping}
              className="w-full py-6 bg-foodies-green hover:bg-foodies-green/90 text-white font-semibold"
            >
              Continue Shopping
            </Button>
          </div>
          
          <div className="flex justify-center space-x-2 mb-2">
            {[1, 2, 3, 4].map((star) => (
              <div key={star} className="text-foodies-green">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            ))}
          </div>
          
          <button 
            onClick={handleGoToOrders}
            className="text-gray-700 font-medium text-sm underline-offset-2 hover:underline"
          >
            Go to orders
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderSuccessDialog;