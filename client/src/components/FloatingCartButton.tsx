import { useState, useEffect } from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Link } from 'wouter';

export default function FloatingCartButton() {
  const { getTotalItems, getTotalPrice } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const totalItems = getTotalItems();
  
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show/hide based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false); // Scrolling down
      } else {
        setIsVisible(true); // Scrolling up
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (totalItems === 0) return null;

  return (
    <Link href="/cart">
      <div 
        className={`fixed z-50 transition-all duration-300 transform ${
          isVisible ? 'translate-y-0' : 'translate-y-20 opacity-0'
        }`}
        style={{
          bottom: 'max(env(safe-area-inset-bottom, 0px) + 16px, 32px)',
          right: 'max(env(safe-area-inset-right, 0px) + 16px, 16px)'
        }}
      >
        <div className="bg-primary text-white rounded-full p-4 shadow-lg flex items-center gap-3 min-w-[160px] hover:scale-105 transition-transform">
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </div>
          <div className="text-sm">
            <div className="font-medium">₦{getTotalPrice().toLocaleString()}</div>
            <div className="text-xs opacity-90">{totalItems} item{totalItems !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}