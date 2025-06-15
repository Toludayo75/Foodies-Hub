import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, CreditCard, Plus, Trash2, Star, StarOff, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const addCardSchema = z.object({
  cardNumber: z.string().min(16, 'Card number must be at least 16 digits').max(19, 'Card number is too long'),
  expiryMonth: z.string().min(2, 'Month is required').max(2, 'Invalid month'),
  expiryYear: z.string().min(4, 'Year is required').max(4, 'Invalid year'),
  cvv: z.string().min(3, 'CVV must be at least 3 digits').max(4, 'CVV is too long'),
  cardholderName: z.string().min(2, 'Cardholder name is required'),
  nickname: z.string().optional()
});

type AddCardForm = z.infer<typeof addCardSchema>;

interface PaymentMethod {
  id: number;
  userId: number;
  type: 'card';
  provider: string;
  cardLast4: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  nickname?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ManageCards() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);

  const form = useForm<AddCardForm>({
    resolver: zodResolver(addCardSchema),
    defaultValues: {
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: '',
      nickname: ''
    }
  });

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading, refetch } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
    enabled: true
  });

  // Add card mutation
  const addCardMutation = useMutation({
    mutationFn: async (data: AddCardForm) => {
      const response = await apiRequest('POST', '/api/payment-methods', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Card Added",
        description: "Your payment method has been added successfully"
      });
      setIsAddCardOpen(false);
      form.reset();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive"
      });
    }
  });

  // Set default card mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await apiRequest('PUT', `/api/payment-methods/${cardId}/default`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Default Card Updated",
        description: "Default payment method has been updated"
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default card",
        variant: "destructive"
      });
    }
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const response = await apiRequest('DELETE', `/api/payment-methods/${cardId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Card Removed",
        description: "Payment method has been removed successfully"
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive"
      });
    }
  });

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const getCardBrand = (cardNumber: string) => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'Visa';
    if (digits.startsWith('5') || digits.startsWith('2')) return 'Mastercard';
    if (digits.startsWith('3')) return 'American Express';
    return 'Unknown';
  };

  const onSubmit = (data: AddCardForm) => {
    // Basic validation for card number
    const digits = data.cardNumber.replace(/\D/g, '');
    if (digits.length < 16) {
      toast({
        title: "Invalid Card",
        description: "Please enter a valid card number",
        variant: "destructive"
      });
      return;
    }

    // Basic expiry validation
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expiryYear = parseInt(data.expiryYear);
    const expiryMonth = parseInt(data.expiryMonth);

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      toast({
        title: "Invalid Expiry",
        description: "Card has expired",
        variant: "destructive"
      });
      return;
    }

    addCardMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 pb-32 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-32 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/wallet">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Manage Cards</h1>
            <p className="text-muted-foreground">Add and manage your payment methods</p>
          </div>
        </div>
        <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Card</DialogTitle>
              <DialogDescription>
                Add a new payment method for wallet top-ups and orders
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234 5678 9012 3456"
                          {...field}
                          value={formatCardNumber(field.value)}
                          onChange={(e) => field.onChange(e.target.value.replace(/\s/g, ''))}
                          maxLength={19}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expiryMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <FormControl>
                          <Input placeholder="MM" {...field} maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input placeholder="YYYY" {...field} maxLength={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cvv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} maxLength={4} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cardholder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Nickname (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Work Card, Personal Card, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddCardOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addCardMutation.isPending}>
                    {addCardMutation.isPending ? 'Adding...' : 'Add Card'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Methods List */}
      {paymentMethods.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="text-sm text-muted-foreground">
              Your payment information is encrypted and secure
            </span>
          </div>

          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.isDefault ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {method.cardBrand} •••• {method.cardLast4}
                        </span>
                        {method.isDefault && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {method.cardholderName}
                        {method.nickname && ` • ${method.nickname}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires {method.expiryMonth}/{method.expiryYear}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(method.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this payment method? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCardMutation.mutate(method.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
            <p className="text-muted-foreground mb-6">
              Add a payment method to easily top up your wallet and make purchases
            </p>
            <Button onClick={() => setIsAddCardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}