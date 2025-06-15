import { Home, Menu, ShoppingCart, Settings, Clock } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useCart } from '@/context/CartContext';

export default function BottomNavigation() {
  const [location] = useLocation();
  const { getTotalItems } = useCart();
  const totalItems = getTotalItems();

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      path: '/home',
      isActive: location === '/home' || location === '/'
    },
    {
      label: 'Menu',
      icon: Menu,
      path: '/menu',
      isActive: location === '/menu'
    },
    {
      label: 'Orders',
      icon: Clock,
      path: '/orders',
      isActive: location === '/orders'
    },
    {
      label: 'Cart',
      icon: ShoppingCart,
      path: '/cart',
      isActive: location === '/cart',
      badge: totalItems > 0 ? totalItems : undefined
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      isActive: location === '/settings'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-foodies-green border-t border-gray-200 z-50">
      <div 
        className="flex justify-around items-center py-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 8px, 8px)' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <div className="flex flex-col items-center p-2 min-w-[60px] relative">
                <div className="relative">
                  <Icon 
                    className={`h-6 w-6 ${
                      item.isActive 
                        ? 'text-white' 
                        : 'text-green-200'
                    }`} 
                  />
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={`text-xs mt-1 ${
                    item.isActive 
                      ? 'text-white font-medium' 
                      : 'text-green-200'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}