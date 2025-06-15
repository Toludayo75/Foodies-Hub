import { storage } from "./storage";
import { createNotification } from "./notificationService";
import { sendRealtimeUpdate } from "./chat";
import { config } from "./config";
import https from 'https';

/**
 * Wallet Service - Handles all wallet operations including balance management,
 * transactions, and topups
 */

// Generate unique transaction reference
const generateTransactionReference = () => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate unique topup reference
const generateTopupReference = () => {
  return `topup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get or create wallet for a user
 */
export const getOrCreateWallet = async (userId: number) => {
  let wallet = await storage.getWallet(userId);
  
  if (!wallet) {
    // Create wallet with zero balance
    wallet = await storage.createWallet({
      userId,
      balance: 0,
      currency: "NGN",
      status: "active"
    });

    // Send notification about wallet creation
    await createNotification({
      userId,
      type: 'system',
      title: 'Wallet Created',
      message: 'Your wallet has been created successfully. Start by adding funds to place orders.'
    });
  }
  
  return wallet;
};

/**
 * Get wallet balance in a readable format
 */
export const getWalletBalance = async (userId: number): Promise<{ balance: number; formattedBalance: string }> => {
  const wallet = await getOrCreateWallet(userId);
  const balanceInNaira = wallet.balance / 100; // Convert from cents to naira
  
  return {
    balance: balanceInNaira,
    formattedBalance: `₦${balanceInNaira.toLocaleString()}`
  };
};

/**
 * Debit wallet for order payment
 */
export const debitWallet = async (userId: number, amount: number, orderId: number): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
  try {
    const wallet = await getOrCreateWallet(userId);
    const amountInCents = Math.round(amount * 100);
    
    // Check if sufficient balance
    if (wallet.balance < amountInCents) {
      return { 
        success: false, 
        error: `Insufficient balance. You have ₦${(wallet.balance / 100).toLocaleString()}, but need ₦${amount.toLocaleString()}`
      };
    }
    
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amountInCents;
    
    // Create transaction record
    const transaction = await storage.createWalletTransaction({
      walletId: wallet.id,
      type: "debit",
      amount: amountInCents,
      balanceBefore,
      balanceAfter,
      reference: generateTransactionReference(),
      description: `Payment for Order #${orderId}`,
      orderId,
      status: "completed"
    });
    
    // Update wallet balance
    const updatedWallet = await storage.updateWalletBalance(wallet.id, balanceAfter);
    
    // Send notification
    await createNotification({
      userId,
      type: 'order',
      title: 'Payment Successful',
      message: `₦${amount.toLocaleString()} deducted from your wallet for Order #${orderId}`,
      orderId
    });
    
    // Send real-time update
    sendRealtimeUpdate(userId, 'wallet_debited', {
      amount: amount,
      newBalance: balanceAfter / 100,
      orderId,
      transactionId: transaction.id
    });
    
    return { 
      success: true, 
      newBalance: balanceAfter / 100 
    };
    
  } catch (error: any) {
    console.error('Error debiting wallet:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Credit wallet (for topups or refunds)
 */
export const creditWallet = async (userId: number, amount: number, description: string, topupId?: number): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
  try {
    const wallet = await getOrCreateWallet(userId);
    const amountInCents = Math.round(amount * 100);
    
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amountInCents;
    
    // Create transaction record
    const transaction = await storage.createWalletTransaction({
      walletId: wallet.id,
      type: "credit",
      amount: amountInCents,
      balanceBefore,
      balanceAfter,
      reference: generateTransactionReference(),
      description,
      topupId,
      status: "completed"
    });
    
    // Update wallet balance
    const updatedWallet = await storage.updateWalletBalance(wallet.id, balanceAfter);
    
    // Send notification
    await createNotification({
      userId,
      type: 'payment',
      title: 'Wallet Credited',
      message: `₦${amount.toLocaleString()} added to your wallet. ${description}`
    });
    
    // Send real-time update
    sendRealtimeUpdate(userId, 'wallet_credited', {
      amount: amount,
      newBalance: balanceAfter / 100,
      transactionId: transaction.id
    });
    
    return { 
      success: true, 
      newBalance: balanceAfter / 100 
    };
    
  } catch (error: any) {
    console.error('Error crediting wallet:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Get wallet transaction history
 */
export const getWalletTransactionHistory = async (userId: number): Promise<any[]> => {
  const wallet = await getOrCreateWallet(userId);
  const transactions = await storage.getWalletTransactions(wallet.id);
  
  // Format transactions for frontend
  return transactions.map(transaction => ({
    ...transaction,
    amount: transaction.amount / 100, // Convert to naira
    balanceBefore: transaction.balanceBefore / 100,
    balanceAfter: transaction.balanceAfter / 100,
    formattedAmount: `₦${(transaction.amount / 100).toLocaleString()}`,
    typeDisplay: transaction.type === 'credit' ? 'Credit' : 'Debit',
    statusDisplay: transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)
  }));
};

/**
 * Initialize Paystack live payment
 */
const initializePaystackPayment = async (userId: number, amount: number, reference: string): Promise<{ success: boolean; authorizationUrl?: string; error?: string }> => {
  try {
    const paystackKey = config.paystackSecretKey || process.env.PAYSTACK_LIVE_SECRET_KEY;
    
    if (!paystackKey) {
      console.log('Paystack key check:', {
        configKey: !!config.paystackSecretKey,
        envKey: !!process.env.PAYSTACK_LIVE_SECRET_KEY,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('PAYSTACK'))
      });
      
      return {
        success: false,
        error: 'Paystack secret key not configured'
      };
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const paymentData = {
      email: user.email,
      amount: Math.round(amount * 100), // Convert to kobo
      reference: reference,
      currency: 'NGN',
      callback_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/wallet/topup/paystack/callback`,
      metadata: {
        userId: userId,
        walletTopup: true
      }
    };

    return new Promise((resolve) => {
      const postData = JSON.stringify(paymentData);
      
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status && response.data?.authorization_url) {
              resolve({
                success: true,
                authorizationUrl: response.data.authorization_url
              });
            } else {
              resolve({
                success: false,
                error: response.message || 'Failed to initialize payment'
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: 'Invalid response from payment gateway'
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      req.write(postData);
      req.end();
    });

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize wallet topup
 */
export const initializeWalletTopup = async (userId: number, amount: number, gateway: string): Promise<{ success: boolean; reference?: string; authorizationUrl?: string; gateway?: string; error?: string }> => {
  try {
    const wallet = await getOrCreateWallet(userId);
    const amountInCents = Math.round(amount * 100);
    const reference = generateTopupReference();
    
    // Create topup record
    const topup = await storage.createWalletTopup({
      userId,
      walletId: wallet.id,
      amount: amountInCents,
      paymentReference: reference,
      paymentGateway: gateway,
      status: "pending"
    });
    
    if (gateway === 'paystack') {
      // For Paystack: Initialize live payment with actual Paystack API
      const paystackResult = await initializePaystackPayment(userId, amount, reference);
      if (paystackResult.success) {
        return {
          success: true,
          reference,
          authorizationUrl: paystackResult.authorizationUrl,
          gateway
        };
      } else {
        return {
          success: false,
          error: paystackResult.error
        };
      }
    } else {
      // For Stripe/Flutterwave: Use demo mode
      return {
        success: true,
        reference,
        gateway
      };
    }
    
  } catch (error: any) {
    console.error('Error initializing wallet topup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify Paystack payment
 */
export const verifyPaystackPayment = async (reference: string): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const paystackKey = config.paystackSecretKey || process.env.PAYSTACK_LIVE_SECRET_KEY;
    
    if (!paystackKey) {
      return {
        success: false,
        error: 'Paystack secret key not configured'
      };
    }

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status && response.data?.status === 'success') {
              resolve({
                success: true,
                data: response.data
              });
            } else {
              resolve({
                success: false,
                error: response.message || 'Payment verification failed'
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: 'Invalid response from payment gateway'
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      req.end();
    });

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Complete wallet topup after payment verification
 */
export const completeWalletTopup = async (reference: string, gatewayData: any): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
  try {
    const topup = await storage.getWalletTopupByReference(reference);
    
    if (!topup) {
      return { success: false, error: 'Topup not found' };
    }
    
    if (topup.status === 'completed') {
      return { success: false, error: 'Topup already completed' };
    }
    
    // Update topup status
    await storage.updateWalletTopup(topup.id, {
      status: 'completed',
      completedAt: new Date(),
      gatewayResponse: JSON.stringify(gatewayData)
    });
    
    // Credit the wallet
    const amount = topup.amount / 100; // Convert to naira
    const result = await creditWallet(
      topup.userId, 
      amount, 
      `Wallet topup via ${topup.paymentGateway}`,
      topup.id
    );
    
    if (result.success) {
      return {
        success: true,
        newBalance: result.newBalance
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error: any) {
    console.error('Error completing wallet topup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if user has sufficient wallet balance for amount
 */
export const checkSufficientBalance = async (userId: number, amount: number): Promise<{ sufficient: boolean; currentBalance: number; shortfall?: number }> => {
  const wallet = await getOrCreateWallet(userId);
  const currentBalance = wallet.balance / 100; // Convert to naira
  const sufficient = currentBalance >= amount;
  
  return {
    sufficient,
    currentBalance,
    shortfall: sufficient ? undefined : amount - currentBalance
  };
};

/**
 * Get wallet topup history
 */
export const getWalletTopupHistory = async (userId: number): Promise<any[]> => {
  const topups = await storage.getWalletTopups(userId);
  
  return topups.map(topup => ({
    ...topup,
    amount: topup.amount / 100, // Convert to naira
    formattedAmount: `₦${(topup.amount / 100).toLocaleString()}`,
    statusDisplay: topup.status.charAt(0).toUpperCase() + topup.status.slice(1),
    gatewayDisplay: topup.paymentGateway.charAt(0).toUpperCase() + topup.paymentGateway.slice(1)
  }));
};