import { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import BottomNavigation from "@/components/BottomNavigation";
import ChatSupport from "@/components/ChatSupport";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import Cart from "@/pages/Cart";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Addresses from "@/pages/Addresses";
import EditProfile from "@/pages/EditProfile";
import PersonalInfo from "@/pages/PersonalInfo";
import Notifications from "@/pages/Notifications";
import AdminNotifications from "@/pages/AdminNotifications";
import RiderNotifications from "@/pages/RiderNotifications";
import ForgotPassword from "@/pages/ForgotPassword";
import EmailVerification from "@/pages/EmailVerification";
import PhoneVerification from "@/pages/PhoneVerification";
import VerificationCode from "@/pages/VerificationCode";
import PasswordResetSuccess from "@/pages/PasswordResetSuccess";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Settings from "@/pages/Settings";
import HelpCenter from "@/pages/HelpCenter";
import SplashScreen from "@/pages/SplashScreen";
import Onboarding from "@/pages/Onboarding";
import AdminDashboard from "@/pages/AdminDashboard";
import RiderDashboard from "@/pages/RiderDashboard";
import Support from "@/pages/Support";
import Wallet from "@/pages/Wallet";
import WalletTopup from "@/pages/WalletTopup";
import WalletTopupPayment from "@/pages/WalletTopupPayment";
import PaymentMethodSelection from "@/pages/PaymentMethodSelection";
import ManageCards from "@/pages/ManageCards";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { NavigationProvider } from "@/context/NavigationContext";
import { FoodProvider } from "@/context/FoodContext";
import { ChatProvider } from "@/context/ChatContext";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { apiRequest } from "@/lib/queryClient";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, RiderRoute } from "./lib/protected-route";
import { useAuth } from "@/context/AuthContext";

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  // Check if user is in splashscreen or onboarding flow
  const isOnboardingFlow = location === '/' || 
                          location === '/splash' || 
                          location.startsWith('/onboarding');
                          
  // Hide bottom navigation on these pages and for admin/rider users
  const hideNavigation = [
    '/',
    '/splash',
    '/onboarding/1',
    '/onboarding/2',
    '/onboarding/3',
    '/login',
    '/register',
    '/forgot-password',
    '/email-verification',
    '/phone-verification',
    '/verification-code',
    '/password-reset-success'
  ].includes(location) || 
  location.startsWith('/admin') || 
  location.startsWith('/rider') ||
  (user?.role === 'admin') ||
  (user?.role === 'rider');
  
  return (
    <>
      <Switch>
        {/* Onboarding Flow */}
        <Route path="/" component={SplashScreen} />
        <Route path="/splash" component={SplashScreen} />
        <Route path="/onboarding/:step" component={Onboarding} />
        
        {/* Public Routes - If user is authenticated, they'll be redirected to home */}
        <PublicOnlyRoute path="/login" component={Login} />
        <PublicOnlyRoute path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/email-verification" component={EmailVerification} />
        <Route path="/phone-verification" component={PhoneVerification} />
        <Route path="/verification-code" component={VerificationCode} />
        <Route path="/password-reset-success" component={PasswordResetSuccess} />
        
        {/* Protected Routes - User must be logged in */}
        <ProtectedRoute path="/home" component={Home} />
        <ProtectedRoute path="/menu" component={Menu} />
        <ProtectedRoute path="/cart" component={Cart} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
        <ProtectedRoute path="/orders" component={Orders} />
        <ProtectedRoute path="/orders/:id" component={OrderDetail} />
        <ProtectedRoute path="/addresses" component={Addresses} />
        <ProtectedRoute path="/settings" component={Settings} />
        <ProtectedRoute path="/help-center" component={HelpCenter} />
        <ProtectedRoute path="/edit-profile" component={EditProfile} />
        <ProtectedRoute path="/personal-info" component={PersonalInfo} />
        <ProtectedRoute path="/notifications" component={Notifications} />
        <ProtectedRoute path="/support" component={Support} />
        
        {/* Wallet Routes */}
        <ProtectedRoute path="/wallet" component={Wallet} />
        <ProtectedRoute path="/wallet/topup" component={WalletTopup} />
        <ProtectedRoute path="/wallet/topup/payment" component={WalletTopupPayment} />
        <ProtectedRoute path="/payment-method-selection" component={PaymentMethodSelection} />
        <ProtectedRoute path="/payment-method" component={ManageCards} />
        
        {/* Admin and Rider Dashboards - with role-specific protection */}
        <AdminRoute path="/admin" component={AdminDashboard} />
        <AdminRoute path="/admin/notifications" component={AdminNotifications} />
        <RiderRoute path="/rider" component={RiderDashboard} />
        <RiderRoute path="/rider/notifications" component={RiderNotifications} />
        
        {/* Not Found */}
        <Route component={NotFound} />
      </Switch>
      {!hideNavigation && <BottomNavigation />}
      {isAuthenticated && <ChatSupport />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <NavigationProvider>
            <FoodProvider>
              <CartProvider>
                <ChatProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Router />
                  </TooltipProvider>
                </ChatProvider>
              </CartProvider>
            </FoodProvider>
          </NavigationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
