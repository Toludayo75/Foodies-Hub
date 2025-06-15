import { Router, Request, Response } from "express";
import { 
  getOrCreateWallet, 
  getWalletBalance, 
  debitWallet, 
  creditWallet,
  getWalletTransactionHistory,
  initializeWalletTopup,
  completeWalletTopup,
  checkSufficientBalance,
  getWalletTopupHistory,
  verifyPaystackPayment
} from "./walletService";
import { z } from "zod";

export const walletRouter = Router();

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

/**
 * Get wallet information including balance
 */
walletRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId as number;
    const wallet = await getOrCreateWallet(userId);
    const balanceInfo = await getWalletBalance(userId);
    
    res.json({
      id: wallet.id,
      userId: wallet.userId,
      balance: balanceInfo.balance,
      formattedBalance: balanceInfo.formattedBalance,
      currency: wallet.currency,
      status: wallet.status,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    });
  } catch (error: any) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ message: "Error fetching wallet information" });
  }
});

/**
 * Get wallet transaction history
 */
walletRouter.get('/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId as number;
    const transactions = await getWalletTransactionHistory(userId);
    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching wallet transactions:', error);
    res.status(500).json({ message: "Error fetching transaction history" });
  }
});

/**
 * Check if user has sufficient balance for amount
 */
walletRouter.post('/check-balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId as number;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const balanceCheck = await checkSufficientBalance(userId, amount);
    res.json(balanceCheck);
  } catch (error: any) {
    console.error('Error checking balance:', error);
    res.status(500).json({ message: "Error checking balance" });
  }
});

/**
 * Initialize wallet topup
 */
walletRouter.post('/topup/initialize', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId as number;
    const { amount, gateway } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    if (!gateway) {
      return res.status(400).json({ message: "Payment gateway is required" });
    }

    // Minimum topup amount validation
    const minTopup = 100; // ₦100 minimum
    if (amount < minTopup) {
      return res.status(400).json({ 
        message: `Minimum topup amount is ₦${minTopup.toLocaleString()}` 
      });
    }

    const result = await initializeWalletTopup(userId, amount, gateway);
    
    if (result.success) {
      const response: any = {
        success: true,
        reference: result.reference,
        amount: amount,
        gateway: result.gateway || gateway
      };
      
      // Add authorization URL for Paystack, or indicate demo mode for others
      if (result.authorizationUrl) {
        response.authorizationUrl = result.authorizationUrl;
      }
      
      res.json(response);
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error: any) {
    console.error('Error initializing topup:', error);
    res.status(500).json({ message: "Error initializing wallet topup" });
  }
});

/**
 * Paystack payment callback endpoint
 */
walletRouter.get('/topup/paystack/callback', async (req: Request, res: Response) => {
  try {
    const { reference, trxref } = req.query;
    const paymentReference = reference || trxref;

    if (!paymentReference) {
      return res.redirect('/wallet?error=missing_reference');
    }

    // Verify payment with Paystack
    const verificationResult = await verifyPaystackPayment(paymentReference as string);
    
    if (verificationResult.success) {
      const result = await completeWalletTopup(paymentReference as string, verificationResult.data);
      
      if (result.success) {
        return res.redirect('/wallet?success=payment_completed');
      } else {
        return res.redirect('/wallet?error=completion_failed');
      }
    } else {
      return res.redirect('/wallet?error=verification_failed');
    }
  } catch (error: any) {
    console.error('Error in Paystack callback:', error);
    res.redirect('/wallet?error=callback_error');
  }
});

/**
 * Complete wallet topup (webhook/callback endpoint)
 */
walletRouter.post('/topup/complete', async (req: Request, res: Response) => {
  try {
    const { reference, gatewayData } = req.body;

    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    const result = await completeWalletTopup(reference, gatewayData || {});
    
    if (result.success) {
      res.json({
        success: true,
        message: "Wallet topup completed successfully",
        newBalance: result.newBalance
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error: any) {
    console.error('Error completing topup:', error);
    res.status(500).json({ message: "Error completing wallet topup" });
  }
});

/**
 * Get wallet topup history
 */
walletRouter.get('/topups', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId as number;
    const topups = await getWalletTopupHistory(userId);
    res.json(topups);
  } catch (error: any) {
    console.error('Error fetching topup history:', error);
    res.status(500).json({ message: "Error fetching topup history" });
  }
});

/**
 * Simulate topup completion (for development/testing)
 */
walletRouter.post('/topup/simulate-complete', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    // Simulate successful payment
    const gatewayData = {
      status: 'success',
      simulatedAt: new Date().toISOString(),
      gateway: 'simulation'
    };

    const result = await completeWalletTopup(reference, gatewayData);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Wallet topup simulation completed successfully",
        newBalance: result.newBalance
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error: any) {
    console.error('Error simulating topup completion:', error);
    res.status(500).json({ message: "Error simulating wallet topup completion" });
  }
});

/**
 * Admin endpoint to credit user wallet (for customer support)
 */
walletRouter.post('/admin/credit', requireAuth, async (req: Request, res: Response) => {
  try {
    const { targetUserId, amount, description } = req.body;
    const adminUserId = req.session?.userId as number;

    // Check if current user is admin
    // You would implement proper admin role checking here
    
    if (!targetUserId || !amount || !description) {
      return res.status(400).json({ 
        message: "Target user ID, amount, and description are required" 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be positive" });
    }

    const result = await creditWallet(targetUserId, amount, `Admin credit: ${description}`);
    
    if (result.success) {
      res.json({
        success: true,
        message: "Wallet credited successfully",
        newBalance: result.newBalance
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error: any) {
    console.error('Error crediting wallet:', error);
    res.status(500).json({ message: "Error crediting wallet" });
  }
});