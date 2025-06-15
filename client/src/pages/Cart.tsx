import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/context/NavigationContext";
import CartItem from "@/components/CartItem";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronDown, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/price";

interface Address {
  id: number;
  name: string;
  address: string;
  isDefault: boolean;
}

export default function Cart() {
  const { isAuthenticated } = useAuth();
  const { items, clearCart, getSubtotal, getTax, getDeliveryFee, getTotal } = useCart();
  const { setPreviousPage } = useNavigation();
  const [, navigate] = useLocation();
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch user addresses
  const { data: addresses = [], isLoading: loadingAddresses } = useQuery<Address[]>({
    queryKey: ['/api/addresses'],
    enabled: isAuthenticated,
  });
  
  // Set default address on load
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  const handleGoBack = () => {
    navigate("/home");
  };
  
  const handleClearCart = () => {
    clearCart();
  };
  
  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to your cart before checkout",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedAddressId) {
      toast({
        title: "Address required",
        description: "Please select a delivery address",
        variant: "destructive",
      });
      return;
    }
    
    // Store the cart info in local storage for the checkout process
    localStorage.setItem("checkoutAddress", selectedAddressId.toString());
    localStorage.setItem("checkoutTotal", getTotal().toString());
    
    // Navigate to payment method selection
    navigate("/payment-method-selection");
  };
  
  if (!isAuthenticated) {
    return null;
  }
  

  
  return (
    <div className="bg-gray-100 min-h-screen pb-32">
      <div className="bg-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button 
            className="mr-3" 
            onClick={handleGoBack}
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">My cart</h1>
        </div>
        <button 
          className="text-foodies-green font-medium"
          onClick={handleClearCart}
        >
          Delete all
        </button>
      </div>
      
      <div className="p-4">
        {/* Cart Items */}
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg mt-4">
            <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
            <button 
              onClick={() => navigate("/menu")}
              className="mt-4 text-foodies-green font-medium"
            >
              Start shopping
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              {items.map(item => (
                <CartItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  image={item.image}
                  quantity={item.quantity}
                />
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="mt-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Cart total</span>
                <span className="text-foodies-green font-medium">{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium">{formatPrice(getTax())}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Delivery</span>
                <span className="text-foodies-green font-medium">{formatPrice(getDeliveryFee())}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Promo discount</span>
                <span className="font-medium">{formatPrice(0)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold text-foodies-green">{formatPrice(getTotal())}</span>
              </div>
            </div>
            
            {/* Address Selection */}
            <div className="mt-6">
              <p className="font-medium mb-3">Address</p>
              {loadingAddresses ? (
                <div className="animate-pulse w-full h-14 bg-gray-200 rounded-lg"></div>
              ) : addresses.length === 0 ? (
                <div>
                  <p className="text-gray-500 mb-2">No addresses found</p>
                  <button 
                    onClick={() => {
                      setPreviousPage("/cart");
                      navigate("/addresses");
                    }}
                    className="text-foodies-green font-medium"
                  >
                    Add new address
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select 
                    className="w-full p-4 border border-gray-300 rounded-lg appearance-none pr-10 bg-white"
                    value={selectedAddressId || ""}
                    onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                  >
                    {addresses.map(address => (
                      <option key={address.id} value={address.id}>
                        {address.address}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <ChevronDown size={18} />
                  </div>
                </div>
              )}
            </div>
            
            {/* Fixed Checkout Button */}
            <div className="mt-10 pb-4">
              <button 
                className="w-full bg-foodies-green text-white font-medium py-4 rounded-lg"
                onClick={handleCheckout}
              >
                Check out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
