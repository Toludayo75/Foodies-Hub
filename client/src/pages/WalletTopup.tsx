import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Wallet as WalletIcon, Shield, Clock } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const topupSchema = z.object({
  amount: z.number().min(100, 'Minimum topup amount is ₦100').max(1000000, 'Maximum topup amount is ₦1,000,000'),
  gateway: z.string().min(1, 'Please select a payment method')
});

type TopupForm = z.infer<typeof topupSchema>;

interface WalletData {
  id: number;
  userId: number;
  balance: number;
  formattedBalance: string;
  currency: string;
  status: string;
}

const predefinedAmounts = [500, 1000, 2000, 5000, 10000, 20000];

const paymentMethods = [
  { value: 'paystack', label: 'Paystack', description: 'Pay with Card, Bank Transfer, or USSD' },
  { value: 'stripe', label: 'Stripe', description: 'International cards accepted' },
  { value: 'flutterwave', label: 'Flutterwave', description: 'Multiple payment options' }
];

export default function WalletTopup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  // Fetch wallet data
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
  });

  const form = useForm<TopupForm>({
    resolver: zodResolver(topupSchema),
    defaultValues: {
      amount: 0,
      gateway: ''
    }
  });

  // Initialize topup mutation
  const initializeTopupMutation = useMutation({
    mutationFn: async (data: TopupForm) => {
      const response = await apiRequest('POST', '/api/wallet/topup/initialize', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.gateway === 'paystack' && data.authorizationUrl) {
          // For Paystack: Redirect to actual Paystack payment interface
          window.location.href = data.authorizationUrl;
        } else if (data.gateway !== 'paystack' && data.reference) {
          // For Stripe/Flutterwave: Go to demo payment processing page
          setLocation(`/wallet/topup/payment?reference=${data.reference}&amount=${data.amount}&gateway=${data.gateway}`);
        } else {
          toast({
            title: "Topup Failed",
            description: data.message || "Could not initialize topup",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Topup Failed",
          description: data.message || "Could not initialize topup",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Topup Error", 
        description: error.message || "Could not initialize topup",
        variant: "destructive"
      });
    }
  });

  const handlePredefinedAmount = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue('amount', amount);
  };

  const onSubmit = (data: TopupForm) => {
    initializeTopupMutation.mutate(data);
  };

  if (walletLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <div className="max-w-md mx-auto px-4 py-4 sm:max-w-2xl sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow-sm">
          <Link href="/wallet">
            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 sm:h-12 sm:w-12">
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold truncate">Add Money</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Top up your wallet for easy payments</p>
          </div>
        </div>

      {/* Current Balance */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <WalletIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl sm:text-3xl font-bold text-primary mb-2">
            {wallet?.formattedBalance || '₦0'}
          </div>
          <Badge variant={wallet?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
            {wallet?.status || 'Unknown'}
          </Badge>
        </CardContent>
      </Card>

      {/* Topup Form */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Choose Amount</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select or enter the amount you want to add to your wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Predefined Amounts */}
              <div>
                <Label className="text-sm sm:text-base font-medium">Quick Select</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-2 sm:mt-3">
                  {predefinedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={selectedAmount === amount ? "default" : "outline"}
                      className="h-12 sm:h-14 text-sm sm:text-base font-medium touch-manipulation"
                      onClick={() => handlePredefinedAmount(amount)}
                    >
                      ₦{amount.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custom Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base font-medium">Custom Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm sm:text-base">₦</span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          className="pl-8 h-12 sm:h-14 text-base"
                          {...field}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                            setSelectedAmount(value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Minimum: ₦100, Maximum: ₦1,000,000
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="gateway"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base font-medium">Payment Method</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-14 sm:h-16 text-base">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value} className="py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm sm:text-base">{method.label}</span>
                                <span className="text-xs sm:text-sm text-muted-foreground">{method.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary */}
              {form.watch('amount') > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Amount to add:</span>
                        <span className="font-medium">₦{form.watch('amount').toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing fee:</span>
                        <span className="font-medium text-green-600">₦0</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total to pay:</span>
                        <span>₦{form.watch('amount').toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>New wallet balance:</span>
                        <span>₦{((wallet?.balance || 0) / 100 + form.watch('amount')).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-14 sm:h-16 text-base sm:text-lg font-medium touch-manipulation"
                disabled={initializeTopupMutation.isPending || form.watch('amount') < 100}
              >
                {initializeTopupMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Proceed to Payment
                  </div>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">
                Your payment information is encrypted and processed securely through our trusted payment partners.
                We never store your card details.
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Instant Processing</h3>
              <p className="text-sm text-muted-foreground">
                Your wallet will be credited instantly upon successful payment. You can start using the funds immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}