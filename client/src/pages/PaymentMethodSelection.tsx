import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Wallet, 
  CreditCard, 
  AlertCircle, 
  CheckCircle,
  Plus 
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/context/CartContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/price';

interface WalletData {
  id: number;
  userId: number;
  balance: number;
  formattedBalance: string;
  currency: string;
  status: string;
}

interface Address {
  id: number;
  name: string;
  address: string;
  isDefault: boolean;
}

export default function PaymentMethodSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items, getTotal, clearCart } = useCart();
  const [selectedPayment, setSelectedPayment] = useState<'wallet' | 'card'>('wallet');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Fetch wallet data
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
  });

  // Fetch addresses
  const { data: addresses = [], isLoading: addressesLoading } = useQuery<Address[]>({
    queryKey: ['/api/addresses'],
  });

  // Set default address
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [addresses]);

  // Check wallet balance - wallet.balance is already in naira from the API
  const walletBalance = wallet?.balance || 0;
  const orderTotal = getTotal();
  const hasInsufficientFunds = walletBalance < orderTotal;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest('POST', '/api/orders/create', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Order Placed Successfully",
        description: `Your order #${data.id} has been placed and will be prepared soon.`,
      });
      clearCart();
      setLocation(`/orders/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Could not place your order. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handlePlaceOrder = () => {
    if (!selectedAddressId) {
      toast({
        title: "Address Required",
        description: "Please select a delivery address",
        variant: "destructive"
      });
      return;
    }

    if (selectedPayment === 'wallet' && hasInsufficientFunds) {
      toast({
        title: "Insufficient Funds",
        description: "Please top up your wallet or choose a different payment method",
        variant: "destructive"
      });
      return;
    }

    const orderData = {
      addressId: selectedAddressId,
      paymentMethod: selectedPayment,
      items: items.map(item => ({
        foodId: item.foodId || item.id,
        quantity: item.quantity
      })),
      total: orderTotal
    };

    createOrderMutation.mutate(orderData);
  };

  if (items.length === 0) {
    setLocation('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-32 max-w-2xl min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
        <Link href="/cart">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Choose Payment Method</h1>
          <p className="text-muted-foreground">Select how you'd like to pay for your order</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{items.length} item{items.length > 1 ? 's' : ''}</span>
                <span className="font-medium">{formatPrice(orderTotal)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatPrice(orderTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent>
            {addressesLoading ? (
              <div className="animate-pulse h-16 bg-muted rounded" />
            ) : addresses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">No addresses found</p>
                <Link href="/addresses">
                  <Button variant="outline">Add Address</Button>
                </Link>
              </div>
            ) : (
              <RadioGroup
                value={selectedAddressId?.toString()}
                onValueChange={(value) => setSelectedAddressId(Number(value))}
              >
                {addresses.map((address) => (
                  <div key={address.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value={address.id.toString()} id={`address-${address.id}`} />
                    <Label htmlFor={`address-${address.id}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{address.name}</div>
                          <div className="text-sm text-muted-foreground">{address.address}</div>
                        </div>
                        {address.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedPayment}
              onValueChange={(value: 'wallet' | 'card') => setSelectedPayment(value)}
              className="space-y-4"
            >
              {/* Wallet Payment */}
              <div className={`border rounded-lg p-4 ${selectedPayment === 'wallet' ? 'border-primary' : 'border-muted'}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="wallet" id="wallet" />
                  <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Wallet Payment</div>
                          <div className="text-sm text-muted-foreground">
                            {walletLoading ? (
                              "Loading balance..."
                            ) : (
                              `Available: ${wallet?.formattedBalance || '₦0'}`
                            )}
                          </div>
                        </div>
                      </div>
                      {wallet?.status === 'active' && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </Label>
                </div>
                
                {selectedPayment === 'wallet' && (
                  <div className="mt-3 ml-6">
                    {hasInsufficientFunds ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Insufficient wallet balance. You need {formatPrice(orderTotal - walletBalance)} more.
                          <Link href="/wallet/topup">
                            <Button variant="link" className="p-0 h-auto ml-2">
                              Top up wallet
                            </Button>
                          </Link>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Your order will be paid from your wallet balance. 
                          Remaining balance after payment: {formatPrice(walletBalance - orderTotal)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              {/* Card Payment */}
              <div className={`border rounded-lg p-4 ${selectedPayment === 'card' ? 'border-primary' : 'border-muted'}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Card Payment</div>
                        <div className="text-sm text-muted-foreground">Pay with debit or credit card</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {/* Wallet Top-up Option */}
            {selectedPayment === 'wallet' && hasInsufficientFunds && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">Top up your wallet</h3>
                    <p className="text-sm text-blue-700">Add money to your wallet for quick and easy payments</p>
                  </div>
                  <Link href="/wallet/topup">
                    <Button variant="outline" size="sm">
                      Add Money
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Place Order Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handlePlaceOrder}
              className="w-full h-12"
              disabled={
                createOrderMutation.isPending || 
                !selectedAddressId || 
                (selectedPayment === 'wallet' && hasInsufficientFunds)
              }
            >
              {createOrderMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Placing Order...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {selectedPayment === 'wallet' ? (
                    <Wallet className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Place Order - {formatPrice(orderTotal)}
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}