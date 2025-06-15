import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeliveryCodeProps = {
  orderId: number;
}

export function DeliveryCodeDisplay({ orderId }: DeliveryCodeProps) {
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeliveryCode = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', `/api/orders/${orderId}/code`);
        const data = await response.json();
        setDeliveryCode(data.code);
      } catch (error) {
        console.error("Failed to fetch delivery code:", error);
        toast({
          title: "Error",
          description: "Could not retrieve your delivery code. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchDeliveryCode();
    }
  }, [orderId, toast]);

  const copyToClipboard = () => {
    if (deliveryCode) {
      navigator.clipboard.writeText(deliveryCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Delivery code copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Delivery Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-2">Loading delivery code...</div>
        </CardContent>
      </Card>
    );
  }

  if (!deliveryCode) {
    return null;
  }

  return (
    <Card className="mb-4 border border-yellow-500">
      <CardHeader className="bg-yellow-50">
        <CardTitle className="flex items-center">
          <span>Your Delivery Code</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-600 mb-2">
            Share this code with your delivery rider when they arrive:
          </p>
          <div className="text-3xl font-bold tracking-widest mb-3 bg-gray-100 px-6 py-3 rounded-md">
            {deliveryCode}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 flex items-center gap-2"
            onClick={copyToClipboard}
          >
            <Clipboard size={16} />
            {copied ? "Copied!" : "Copy Code"}
          </Button>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Your rider will ask for this code to verify delivery.
            This helps ensure that your order is delivered to the correct person.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}