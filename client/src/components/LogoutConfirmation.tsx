import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LogoutConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function LogoutConfirmation({ open, onOpenChange, onConfirm }: LogoutConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-lg p-6">
        <DialogTitle className="sr-only">Confirm Logout</DialogTitle>
        <DialogDescription className="sr-only">
          Are you sure you want to log out of your account?
        </DialogDescription>
        <div className="text-center">
          <p className="text-base text-gray-800 mb-6">
            Are you sure you want to log out
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[48px] text-base"
            >
              Back
            </Button>
            <Button 
              onClick={onConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white min-h-[48px] text-base"
            >
              Yes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}