import { useState, useEffect, useRef } from "react";
import { useFood } from "@/context/FoodContext";
import { useCart } from "@/context/CartContext";
import { ChevronLeft, Plus, Star, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { formatPrice } from "@/lib/price";

export default function Menu() {
  const { foods, categories, foodsByCategory, loadingFoods, loadingCategories, refreshFoods } = useFood();
  const { addItem } = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [displayedFoods, setDisplayedFoods] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  
  // Set the initial active category once categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      // Check for category parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const categoryParam = urlParams.get('category');
      
      if (categoryParam) {
        const categoryId = parseInt(categoryParam);
        const foundCategory = categories.find(cat => cat.id === categoryId);
        if (foundCategory) {
          setActiveCategoryId(categoryId);
          return;
        }
      }
      
      // Default to first category if no valid category parameter
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // Update displayed foods when category changes or foods are loaded
  useEffect(() => {
    if (activeCategoryId && foods.length > 0) {
      // Filter foods for the active category
      const categoryFoods = foods.filter(food => food.categoryId === activeCategoryId);
      
      // Add a default rating for display purposes
      const displayFoods = categoryFoods.map(food => ({
        ...food,
        rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1) // Random rating between 3.5-5.0
      }));
      
      setDisplayedFoods(displayFoods);
    }
  }, [activeCategoryId, foods]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    if (distance > 0 && distance < 120) {
      setPullDistance(distance);
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling.current && pullDistance > 60) {
      setIsRefreshing(true);
      try {
        if (refreshFoods) {
          await refreshFoods();
        }
      } catch (error) {
        console.error('Failed to refresh:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    isPulling.current = false;
    setPullDistance(0);
  };

  const handleAddToCart = (food: any) => {
    addItem({
      id: food.id,
      name: food.name,
      description: food.description,
      price: food.price,
      image: food.image
    });
  };

  return (
    <div 
      className="mobile-page bg-gray-50 pb-24 relative"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDistance}px)` }}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-white py-4 z-50"
          style={{ transform: `translateY(-${100 - pullDistance}px)` }}
        >
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 flex items-center sticky top-0 z-40 shadow-sm">
        <Link href="/home" className="mr-4">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Menu</h1>
      </div>

      {/* Category Tabs */}
      <div className="flex px-4 py-3 gap-4 overflow-x-auto">
        {loadingCategories ? (
          <div className="px-4 py-2">Loading categories...</div>
        ) : (
          categories.map((category) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeCategoryId === category.id
                  ? "bg-foodies-yellow text-black" 
                  : "bg-gray-100 text-gray-500"
              }`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))
        )}
      </div>

      {/* Food Grid */}
      <div className="px-4 pb-4">
        {loadingFoods ? (
          <div className="text-center py-8">Loading menu items...</div>
        ) : displayedFoods.length === 0 ? (
          <div className="text-center py-8">No items in this category yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {displayedFoods.map((food) => (
              <div key={food.id} className="bg-white rounded-lg overflow-hidden shadow">
                <div className="relative">
                  <img
                    src={food.image}
                    alt={food.name}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      // Fallback to a placeholder image if the actual image fails to load
                      e.currentTarget.src = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=928&q=80";
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-foodies-yellow text-xs p-1 rounded flex items-center">
                    <Star size={12} className="text-white mr-1" />
                    <span className="text-white font-bold">{food.rating}</span>
                  </div>
                  <button
                    onClick={() => handleAddToCart(food)}
                    className="absolute bottom-0 right-0 bg-foodies-yellow p-1 rounded-tl-lg"
                  >
                    <Plus size={16} className="text-white" />
                  </button>
                </div>
                <div className="p-2">
                  <h3 className="font-medium text-sm">{food.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{food.description}</p>
                  <p className="text-xs font-bold mt-1">{formatPrice(food.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}