import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, AlertCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PaymentDetails {
  reference: string;
  amount: number;
  gateway: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function WalletTopupPayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Extract payment details from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const amount = params.get('amount');
    const gateway = params.get('gateway');

    if (reference && amount && gateway) {
      setPaymentDetails({
        reference,
        amount: parseFloat(amount),
        gateway,
        status: 'pending'
      });
    } else {
      // Redirect back to wallet if no valid params
      setLocation('/wallet');
    }
  }, [setLocation]);

  // Simulate payment completion (for development)
  const simulatePaymentMutation = useMutation({
    mutationFn: async (reference: string) => {
      const response = await apiRequest('POST', '/api/wallet/topup/simulate-complete', { reference });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPaymentDetails(prev => prev ? { ...prev, status: 'completed' } : null);
        toast({
          title: "Payment Successful",
          description: `Your wallet has been credited with ₦${paymentDetails?.amount.toLocaleString()}`,
        });
        
        // Invalidate wallet queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/topups'] });
        
        // Redirect to wallet after 3 seconds
        setTimeout(() => {
          setLocation('/wallet');
        }, 3000);
      } else {
        setPaymentDetails(prev => prev ? { ...prev, status: 'failed' } : null);
        toast({
          title: "Payment Failed",
          description: data.message || "Payment could not be processed",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      setPaymentDetails(prev => prev ? { ...prev, status: 'failed' } : null);
      toast({
        title: "Payment Error",
        description: "An error occurred while processing your payment",
        variant: "destructive"
      });
    }
  });

  const handleSimulatePayment = () => {
    if (paymentDetails?.reference) {
      setIsSimulating(true);
      setPaymentDetails(prev => prev ? { ...prev, status: 'processing' } : null);
      
      // Simulate processing delay
      setTimeout(() => {
        simulatePaymentMutation.mutate(paymentDetails.reference);
        setIsSimulating(false);
      }, 2000);
    }
  };

  const getStatusIcon = () => {
    switch (paymentDetails?.status) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'processing':
        return <Clock className="h-8 w-8 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <CreditCard className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const variants: { [key: string]: "default" | "destructive" | "outline" | "secondary" } = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
      pending: "outline"
    };

    return (
      <Badge variant={variants[paymentDetails?.status || 'pending']}>
        {(paymentDetails?.status || 'pending').charAt(0).toUpperCase() + (paymentDetails?.status || 'pending').slice(1)}
      </Badge>
    );
  };

  const getGatewayName = (gateway: string) => {
    const names: { [key: string]: string } = {
      paystack: 'Paystack',
      stripe: 'Stripe',
      flutterwave: 'Flutterwave'
    };
    return names[gateway] || gateway;
  };

  if (!paymentDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/wallet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Payment Processing</h1>
          <p className="text-muted-foreground">Complete your wallet topup</p>
        </div>
      </div>

      {/* Payment Status */}
      <Card className="mb-8">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">
            {paymentDetails.status === 'completed' && 'Payment Successful!'}
            {paymentDetails.status === 'processing' && 'Processing Payment...'}
            {paymentDetails.status === 'failed' && 'Payment Failed'}
            {paymentDetails.status === 'pending' && 'Ready to Pay'}
          </CardTitle>
          <CardDescription>
            {paymentDetails.status === 'completed' && 'Your wallet has been credited successfully'}
            {paymentDetails.status === 'processing' && 'Please wait while we process your payment'}
            {paymentDetails.status === 'failed' && 'There was an issue processing your payment'}
            {paymentDetails.status === 'pending' && 'Review your payment details below'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            {getStatusBadge()}
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-bold text-xl">₦{paymentDetails.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-medium">{getGatewayName(paymentDetails.gateway)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference:</span>
            <span className="font-mono text-sm">{paymentDetails.reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processing Fee:</span>
            <span className="font-medium text-green-600">₦0</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg">
            <span className="font-medium">Total to Pay:</span>
            <span className="font-bold">₦{paymentDetails.amount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          {paymentDetails.status === 'pending' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Demo Payment Mode</h3>
                <p className="text-sm text-blue-700">
                  This is a demo environment. Click the button below to simulate a successful payment.
                  In production, you would be redirected to the actual payment gateway.
                </p>
              </div>
              <Button
                onClick={handleSimulatePayment}
                className="w-full h-12"
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Processing Payment...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Simulate Payment
                  </div>
                )}
              </Button>
            </div>
          )}

          {paymentDetails.status === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Please wait while we process your payment...</p>
            </div>
          )}

          {paymentDetails.status === 'completed' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-green-900">Payment Completed Successfully</h3>
                <p className="text-sm text-green-700 mt-1">
                  Your wallet has been credited and you can now use the funds for orders.
                </p>
              </div>
              <Link href="/wallet">
                <Button className="w-full">
                  Return to Wallet
                </Button>
              </Link>
            </div>
          )}

          {paymentDetails.status === 'failed' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <h3 className="font-medium text-red-900">Payment Failed</h3>
                <p className="text-sm text-red-700 mt-1">
                  Your payment could not be processed. Please try again or contact support.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/wallet/topup">
                  <Button variant="outline" className="w-full">
                    Try Again
                  </Button>
                </Link>
                <Link href="/wallet">
                  <Button className="w-full">
                    Back to Wallet
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}