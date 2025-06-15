# Foodies-Hub

# Foodies Hub - File Structure

## Root Directory
```
├── .config/                    # NPM configuration
├── attached_assets/            # Design assets and documentation
├── client/                     # Frontend React application
├── server/                     # Backend Express server
├── shared/                     # Shared TypeScript schemas
├── uploads/                    # File upload storage
├── .env                        # Environment variables
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── .replit                    # Replit configuration
├── components.json            # UI components config
├── drizzle.config.ts         # Database configuration
├── package.json              # Dependencies and scripts
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite build configuration
```

## Client Directory Structure
```
client/
├── src/
│   ├── assets/                # Static assets
│   │   ├── onboarding-1.png
│   │   ├── onboarding-2.png
│   │   └── onboarding-3.png
│   │
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components (shadcn/ui)
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (30+ UI components)
│   │   │
│   │   ├── admin/            # Admin-specific components
│   │   │   ├── MenuManagement.tsx
│   │   │   ├── OrderManagement.tsx
│   │   │   └── RiderManagement.tsx
│   │   │
│   │   ├── AddressItem.tsx   # Address display component
│   │   ├── AdminHeader.tsx   # Admin dashboard header
│   │   ├── BottomNavigation.tsx # Mobile navigation
│   │   ├── CartItem.tsx      # Shopping cart item
│   │   ├── CategoryItem.tsx  # Food category display
│   │   ├── ChatSupport.tsx   # Customer support chat
│   │   ├── DeliveryCodeDisplay.tsx # Order delivery code
│   │   ├── FloatingCartButton.tsx # Floating cart access
│   │   ├── FoodCard.tsx      # Food item card
│   │   ├── LogoutConfirmation.tsx # Logout modal
│   │   ├── MessageFeedback.tsx # Chat message feedback
│   │   ├── OrderStatus.tsx   # Order status display
│   │   ├── OrderSuccessDialog.tsx # Order success modal
│   │   ├── PageTransition.tsx # Page animations
│   │   ├── RiderHeader.tsx   # Rider dashboard header
│   │   ├── RoleWelcome.tsx   # Role-based welcome
│   │   ├── SwipeableCard.tsx # Swipeable UI card
│   │   └── VerificationCode.tsx # SMS/Email verification
│   │
│   ├── context/              # React context providers
│   │   ├── AuthContext.tsx   # User authentication
│   │   ├── CartContext.tsx   # Shopping cart state
│   │   ├── ChatContext.tsx   # Chat support state
│   │   ├── FoodContext.tsx   # Menu and food data
│   │   ├── NavigationContext.tsx # Navigation state
│   │   ├── ThemeContext.tsx  # Theme management
│   │   └── WebSocketContext.tsx # Real-time connections
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── use-mobile.tsx    # Mobile detection
│   │   ├── use-toast.ts      # Toast notifications
│   │   ├── usePullToRefresh.ts # Pull-to-refresh gesture
│   │   ├── useSwipeGesture.ts # Swipe gesture handling
│   │   └── useWebSocket.ts   # WebSocket connection
│   │
│   ├── lib/                  # Utility libraries
│   │   ├── api.ts           # API client functions
│   │   ├── chat.ts          # Chat utilities
│   │   ├── price.ts         # Price formatting
│   │   ├── protected-route.tsx # Route protection
│   │   ├── queryClient.ts   # React Query client
│   │   └── utils.ts         # General utilities
│   │
│   ├── pages/               # Application pages/screens
│   │   ├── Addresses.tsx    # Address management
│   │   ├── AdminDashboard.tsx # Admin control panel
│   │   ├── AdminNotifications.tsx # Admin notifications
│   │   ├── Cart.tsx         # Shopping cart
│   │   ├── EditProfile.tsx  # Profile editing
│   │   ├── EmailVerification.tsx # Email verification
│   │   ├── ForgotPassword.tsx # Password reset
│   │   ├── HelpCenter.tsx   # Help and support
│   │   ├── Home.tsx         # Main homepage
│   │   ├── Login.tsx        # User login
│   │   ├── ManageCards.tsx  # Payment card management
│   │   ├── Menu.tsx         # Food menu browse
│   │   ├── Notifications.tsx # User notifications
│   │   ├── NotificationsNew.tsx # New notification style
│   │   ├── Onboarding.tsx   # App onboarding
│   │   ├── OrderConfirmation.tsx # Order confirmation
│   │   ├── OrderDetail.tsx  # Order details view
│   │   ├── Orders.tsx       # Order history
│   │   ├── PasswordResetSuccess.tsx # Reset success
│   │   ├── PaymentMethodSelection.tsx # Payment selection
│   │   ├── PersonalInfo.tsx # User profile info
│   │   ├── PhoneVerification.tsx # Phone verification
│   │   ├── Register.tsx     # User registration
│   │   ├── RiderDashboard.tsx # Delivery rider panel
│   │   ├── RiderNotifications.tsx # Rider notifications
│   │   ├── Settings.tsx     # App settings
│   │   ├── SplashScreen.tsx # App loading screen
│   │   ├── Support.tsx      # Customer support
│   │   ├── VerificationCode.tsx # Code verification
│   │   ├── Wallet.tsx       # Digital wallet
│   │   ├── WalletTopup.tsx  # Wallet funding
│   │   ├── WalletTopupPayment.tsx # Topup payment
│   │   └── not-found.tsx    # 404 error page
│   │
│   ├── utils/               # Utility functions
│   │   └── orderUtils.ts    # Order-related utilities
│   │
│   ├── App.tsx             # Main app component
│   ├── config.ts           # App configuration
│   ├── index.css           # Global styles
│   └── main.tsx            # App entry point
│
└── index.html              # HTML template
```

## Server Directory Structure
```
server/
├── adminRoutes.ts          # Admin API endpoints
├── adminService.ts         # Admin business logic
├── chat.ts                 # Chat WebSocket handlers
├── chatService.ts          # AI chat service logic
├── config.ts               # Server configuration
├── createTestUsers.ts      # Test data creation
├── db.ts                   # Database connection (legacy)
├── drizzle.ts              # Database ORM setup
├── escalationService.ts    # Support escalation logic
├── index.ts                # Server entry point
├── notificationRoutes.ts   # Notification API endpoints
├── notificationService.ts  # Notification business logic
├── orderRoutes.ts          # Order API endpoints
├── riderRoutes.ts          # Rider API endpoints
├── routes.ts               # Main API routes
├── storage.ts              # File upload handling
├── supportRoutes.ts        # Support API endpoints
├── vite.ts                 # Vite integration
├── walletRoutes.ts         # Wallet API endpoints
└── walletService.ts        # Wallet business logic
```

## Shared Directory
```
shared/
└── schema.ts               # Database schema definitions
```

## Uploads Directory
```
uploads/
├── tmp/                    # Temporary file storage
└── [user_id]_[timestamp].[ext] # Uploaded files
```

## Key Features by Directory

### Frontend (Client)
- **React** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Query** for data fetching
- **Wouter** for routing
- **WebSocket** for real-time features

### Backend (Server)
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **WebSocket** support
- **File upload** handling
- **Session-based** authentication
- **AI-powered** customer support

### Database Schema
- Users (customers, riders, admins)
- Foods and categories
- Orders and order items
- Addresses and payments
- Messages and notifications
- Wallet and payment methods

This structure supports a full-featured food delivery app with customer ordering, rider delivery, admin management, AI customer support, and real-time tracking capabilities.
