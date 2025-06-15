import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, Clock, MapPin, Phone } from "lucide-react";

export default function OrderConfirmation() {
  const [, navigate] = useLocation();
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setOrderId(id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="text-gray-600">Your delicious meal is on its way</p>
        </div>

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order #{orderId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium">Estimated Delivery</p>
                <p className="text-sm text-gray-600">25-35 minutes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium">Delivery Address</p>
                <p className="text-sm text-gray-600">Your saved address</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium">Order Updates</p>
                <p className="text-sm text-gray-600">We'll send SMS updates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Steps */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Order Confirmed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Preparing your food</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-500">Out for delivery</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-500">Delivered</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/orders')}
            className="w-full bg-foodies-green hover:bg-foodies-green/90"
          >
            Track Order
          </Button>
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
}