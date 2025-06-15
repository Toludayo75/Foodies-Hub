import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WalletData {
  id: number;
  userId: number;
  balance: number;
  formattedBalance: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  formattedAmount: string;
  description: string;
  reference: string;
  orderId?: number;
  topupId?: number;
  status: string;
  typeDisplay: string;
  statusDisplay: string;
  createdAt: string;
}

interface Topup {
  id: number;
  amount: number;
  formattedAmount: string;
  paymentReference: string;
  paymentGateway: string;
  status: string;
  statusDisplay: string;
  gatewayDisplay: string;
  createdAt: string;
  completedAt?: string;
}

export default function Wallet() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'topups'>('overview');
  const { toast } = useToast();

  // Fetch wallet data
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
    enabled: true
  });

  // Fetch transaction history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/wallet/transactions'],
    enabled: activeTab === 'transactions'
  });

  // Fetch topup history
  const { data: topups = [], isLoading: topupsLoading } = useQuery<Topup[]>({
    queryKey: ['/api/wallet/topups'],
    enabled: activeTab === 'topups'
  });

  // Handle payment callback messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'payment_completed') {
      toast({
        title: "Payment Successful",
        description: "Your wallet has been credited successfully",
      });
      // Refresh wallet data
      refetchWallet();
      // Clean URL
      window.history.replaceState({}, '', '/wallet');
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        missing_reference: "Payment reference is missing",
        verification_failed: "Payment verification failed",
        completion_failed: "Payment could not be completed",
        callback_error: "Payment processing error"
      };
      
      toast({
        title: "Payment Failed",
        description: errorMessages[error] || "Payment could not be processed",
        variant: "destructive"
      });
      // Clean URL
      window.history.replaceState({}, '', '/wallet');
    }
  }, [toast, refetchWallet]);

  // Initialize topup mutation
  const initializeTopupMutation = useMutation({
    mutationFn: async ({ amount, gateway }: { amount: number; gateway: string }) => {
      const response = await apiRequest('POST', '/api/wallet/topup/initialize', { amount, gateway });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.authorizationUrl) {
        // In a real app, you'd redirect to payment gateway
        // For development, we'll show a demo payment page
        window.location.href = data.authorizationUrl;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "destructive" | "outline" | "secondary" } = {
      completed: "default",
      pending: "secondary",
      failed: "destructive"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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
      <div className="max-w-md mx-auto px-4 py-4 sm:max-w-4xl sm:px-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link href="/settings">
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold truncate">My Wallet</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your food ordering funds</p>
              </div>
            </div>
            <div className="shrink-0 ml-2 sm:ml-3">
              <Link href="/wallet/topup">
                <Button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-base h-8 sm:h-10">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Money</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Wallet Balance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your available balance for food orders</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="text-2xl sm:text-4xl font-bold text-primary mb-2">
                  {wallet?.formattedBalance || '₦0'}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Badge variant={wallet?.status === 'active' ? 'default' : 'secondary'} className="w-fit text-xs">
                    {wallet?.status || 'Unknown'}
                  </Badge>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Currency: {wallet?.currency || 'NGN'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:text-right">
                <Link href="/wallet/topup">
                  <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-auto text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Top Up
                  </Button>
                </Link>
                <div className="text-xs text-muted-foreground">
                  Last updated: {wallet?.updatedAt ? formatDate(wallet.updatedAt) : 'Never'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Tab Navigation */}
      <div className="flex border-b mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 sm:px-4 py-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 sm:px-4 py-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('topups')}
          className={`px-3 sm:px-4 py-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
            activeTab === 'topups'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Top-ups
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/wallet/topup">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Money to Wallet
                </Button>
              </Link>
              <Link href="/payment-method">
                <Button className="w-full justify-start" variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Cards
                </Button>
              </Link>
              <Link href="/cart">
                <Button className="w-full justify-start" variant="outline">
                  <WalletIcon className="h-4 w-4 mr-2" />
                  Use Wallet for Orders
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="font-medium text-sm">{transaction.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{transaction.formattedAmount}
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All wallet transactions and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="shrink-0 mt-0.5">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base truncate">{transaction.description}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">
                            <div className="truncate">{transaction.reference}</div>
                            <div className="mt-1">{formatDate(transaction.createdAt)}</div>
                          </div>
                          {transaction.orderId && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Order #{transaction.orderId}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`font-bold text-sm sm:text-lg ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'credit' ? '+' : '-'}{transaction.formattedAmount}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <WalletIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-4">Your transaction history will appear here</p>
                <Link href="/wallet/topup">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'topups' && (
        <Card>
          <CardHeader>
            <CardTitle>Top-up History</CardTitle>
            <CardDescription>All wallet funding transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {topupsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : topups.length > 0 ? (
              <div className="space-y-4">
                {topups.map((topup) => (
                  <div key={topup.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="shrink-0 mt-0.5">
                          <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base truncate">Wallet Top-up via {topup.gatewayDisplay}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">
                            <div className="truncate">{topup.paymentReference}</div>
                            <div className="mt-1">{formatDate(topup.createdAt)}</div>
                          </div>
                          {topup.completedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Completed: {formatDate(topup.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-bold text-sm sm:text-lg text-green-600">
                          +{topup.formattedAmount}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(topup.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No top-ups yet</h3>
                <p className="text-muted-foreground mb-4">Your wallet funding history will appear here</p>
                <Link href="/wallet/topup">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}