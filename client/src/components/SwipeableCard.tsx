import { useState, useRef, useEffect } from 'react';
import { Plus, Heart, Star } from 'lucide-react';
import { formatPrice } from '@/lib/price';

interface SwipeableCardProps {
  food: any;
  onAddToCart: (food: any) => void;
  onFavorite?: (food: any) => void;
}

export default function SwipeableCard({ food, onAddToCart, onFavorite }: SwipeableCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeActive) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 80;
    const constrainedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setSwipeX(constrainedDiff);
  };

  const handleTouchEnd = () => {
    if (!isSwipeActive) return;
    
    const diff = currentX.current - startX.current;
    
    // Trigger actions based on swipe distance and direction
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swipe right - add to cart
        onAddToCart(food);
      } else {
        // Swipe left - favorite (if function provided)
        if (onFavorite) {
          onFavorite(food);
        }
      }
    }
    
    // Reset swipe
    setSwipeX(0);
    setIsSwipeActive(false);
  };

  const handleClick = () => {
    if (Math.abs(swipeX) < 5) {
      // Only trigger click if not swiping
      onAddToCart(food);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Right action (Add to cart) */}
        <div className="flex-1 bg-green-500 flex items-center justify-center">
          <div className="text-white text-center">
            <Plus className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs font-medium">Add</span>
          </div>
        </div>
        {/* Left action (Favorite) */}
        <div className="flex-1 bg-red-500 flex items-center justify-center">
          <div className="text-white text-center">
            <Heart className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs font-medium">Like</span>
          </div>
        </div>
      </div>
      
      {/* Main card */}
      <div
        ref={cardRef}
        className="bg-white rounded-lg p-4 shadow-sm border relative z-10 transition-transform"
        style={{ 
          transform: `translateX(${swipeX}px)`,
          touchAction: 'pan-y' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex gap-3">
          <img 
            src={food.image} 
            alt={food.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{food.name}</h3>
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{food.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-primary">{formatPrice(food.price)}</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-current text-yellow-400" />
                <span>{food.rating}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Swipe hint */}
        {swipeX !== 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-xs font-medium">
                {swipeX > 0 ? '→ Release to add' : '← Release to like'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}