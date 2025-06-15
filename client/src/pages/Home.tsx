import { useEffect, useRef, useState } from "react";
import { useFood } from "@/context/FoodContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNavigation } from "@/context/NavigationContext";
import FoodCard from "@/components/FoodCard";
import CategoryItem from "@/components/CategoryItem";
import { RoleWelcome } from "@/components/RoleWelcome";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Bell, Star, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";


export default function Home() {
  const { categories, foods, popularFoods, recommendedFoods, loadingCategories, loadingFoods } = useFood();
  const { isAuthenticated, user } = useAuth();
  const { addItem } = useCart();
  const { setPreviousPage } = useNavigation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  
  // Fetch user's addresses to show current location
  const { data: addressesData } = useQuery<any[]>({
    queryKey: ['/api/addresses'],
    enabled: !!user, // Only fetch if user is logged in
  });
  
  const addresses = Array.isArray(addressesData) ? addressesData : [];
  
  // Pull-to-refresh touch handlers
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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/categories'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/foods'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/addresses'] })
        ]);
      } catch (error) {
        console.error('Failed to refresh:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    isPulling.current = false;
    setPullDistance(0);
  };


  
  // Get user's default address or first address
  const getUserLocation = () => {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return "Set Location";
    }
    
    const defaultAddress = addresses.find((addr: any) => addr.isDefault);
    const displayAddress = defaultAddress || addresses[0];
    
    // Truncate long addresses
    if (displayAddress?.address && displayAddress.address.length > 20) {
      return displayAddress.address.substring(0, 20) + "...";
    }
    
    return displayAddress?.address || "Set Location";
  };
  
  // Function to add food to cart
  const handleAddToCart = (food: any) => {
    addItem({
      id: food.id,
      name: food.name,
      description: food.description,
      price: food.price || 2500, // Default price if not provided
      image: food.image
    });
    
    // Show toast notification
    toast({
      title: "Added to cart",
      description: `${food.name} has been added to your cart.`,
    });
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div 
      ref={containerRef}
      className="bg-gray-50 pb-24 min-h-screen relative transition-all duration-300 ease-in-out"
      style={{ 
        touchAction: 'pan-y pinch-zoom',
        transform: `translateY(${pullDistance}px)`
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
      <div className="pt-4 px-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              <div>
                <p className="text-sm font-medium">Hi {user?.firstName || 'User'}</p>
                <button 
                  onClick={() => {
                    setPreviousPage("/home");
                    navigate("/addresses");
                  }}
                  className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <MapPin size={12} className="mr-1" />
                  <span>{getUserLocation()}</span>
                </button>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full border-gray-200"
            onClick={() => {
              setPreviousPage("/home");
              navigate("/notifications");
            }}
          >
            <Bell size={18} />
          </Button>
        </div>
        
        {/* Role-specific welcome message */}
        <RoleWelcome />
      </div>
      
      {/* Discount Banner */}
      <div className="mx-4 mt-4 bg-foodies-green text-white rounded-lg p-4 flex justify-between">
        <div className="w-2/3">
          <h3 className="font-semibold text-lg">Grab Our Exclusive Food Discount Now!</h3>
          <Button 
            onClick={() => navigate("/menu")}
            className="mt-2 bg-foodies-yellow hover:bg-foodies-yellow/90 text-foodies-green font-medium px-4 py-2 text-sm"
          >
            Order Now
          </Button>
        </div>
        <div className="w-1/3 relative overflow-hidden rounded-lg">
          <div className="absolute -right-4 -bottom-4">
            <img 
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80" 
              alt="Burger"
              className="w-24 h-24 object-cover"
            />
          </div>
        </div>
      </div>
      
      {/* Menu Items */}
      <div className="mt-6 px-4">
        <div 
          className="flex overflow-x-auto gap-4 scrollbar-hide pb-2"
          style={{
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x'
          }}
        >
          {loadingFoods ? (
            // Skeleton loader for menu items
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex-shrink-0">
                <Skeleton className="w-16 h-16 rounded-full mb-2" />
                <Skeleton className="w-14 h-3 mx-auto mb-1" />
                <Skeleton className="w-12 h-2 mx-auto" />
              </div>
            ))
          ) : (
            <>
              {foods.slice(0, 10).map((food) => (
                <button 
                  key={food.id} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddToCart(food);
                  }}
                  className="flex flex-col items-center flex-shrink-0 min-w-[70px] touch-manipulation"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 mb-2">
                    <img 
                      src={food.image} 
                      alt={food.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1";
                      }}
                    />
                  </div>
                  <p className="text-xs text-center w-16 truncate font-medium">{food.name}</p>
                  <p className="text-xs text-foodies-green font-semibold">₦{food.price || 2500}</p>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      
      {/* Popular Demand */}
      <div className="mt-6 px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Popular Demand</h2>
          <button 
            className="text-xs text-gray-500"
            onClick={() => navigate("/menu")}
          >
            See All
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {loadingFoods ? (
            // Skeleton loader for popular foods
            Array(4).fill(0).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-2">
                <Skeleton className="w-full h-24 rounded-lg" />
                <div className="mt-2">
                  <Skeleton className="w-3/4 h-4 mb-1" />
                  <Skeleton className="w-full h-3 mb-2" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : popularFoods.length > 0 ? (
            // Map through popular foods from context
            popularFoods.map((food) => (
              <div key={food.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="relative">
                  <img 
                    src={food.image} 
                    alt={food.name}
                    className="w-full h-28 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1";
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-foodies-yellow text-xs font-bold text-white p-1 rounded">
                    <Star size={12} className="inline mr-1" />
                    {food.rating || "4.5"}
                  </div>
                  <button 
                    onClick={() => handleAddToCart(food)} 
                    className="absolute bottom-0 right-0 bg-foodies-yellow text-white p-1 rounded-tl-lg"
                  >
                    <Plus size={14} className="text-white" />
                  </button>
                </div>
                <div className="p-2">
                  <h3 className="font-medium text-sm">{food.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{food.description}</p>
                  <p className="text-xs font-medium mt-1">{food.prepTime || "30-45Min"}</p>
                </div>
              </div>
            ))
          ) : (
            // If no popular foods exist yet
            <div className="col-span-2 text-center py-4 text-gray-500">
              No popular items available yet
            </div>
          )}
        </div>
      </div>
      
      {/* Recommended for you */}
      <div className="mt-6 px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <button 
            className="text-xs text-gray-500"
            onClick={() => navigate("/menu")}
          >
            See All
          </button>
        </div>
        
        <div 
          className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide"
          style={{
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain',
            pointerEvents: 'auto'
          }}
        >
          {loadingFoods ? (
            // Skeleton loader for recommended foods
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="flex-shrink-0 w-40 bg-white rounded-lg shadow p-2">
                <Skeleton className="w-full h-24 rounded-lg" />
                <div className="mt-2">
                  <Skeleton className="w-3/4 h-4 mb-1" />
                  <Skeleton className="w-full h-3 mb-2" />
                  <Skeleton className="w-16 h-3" />
                </div>
              </div>
            ))
          ) : recommendedFoods.length > 0 ? (
            // Map through recommended foods from context
            recommendedFoods.map((food) => (
              <div key={food.id} className="flex-shrink-0 w-40 bg-white rounded-lg shadow overflow-hidden">
                <div className="relative">
                  <img 
                    src={food.image} 
                    alt={food.name}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1";
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-foodies-yellow text-xs font-bold text-white p-1 rounded">
                    <Star size={12} className="inline mr-1" />
                    {food.rating || "4.3"}
                  </div>
                  <button 
                    onClick={() => handleAddToCart(food)}
                    className="absolute bottom-0 right-0 bg-foodies-yellow text-white p-1 rounded-tl-lg"
                  >
                    <Plus size={14} className="text-white" />
                  </button>
                </div>
                <div className="p-2">
                  <h3 className="font-medium text-sm">{food.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{food.description}</p>
                  <p className="text-xs font-medium mt-1">{food.prepTime || "30-35Min"}</p>
                </div>
              </div>
            ))
          ) : (
            // If no recommended foods exist yet
            <div className="flex-shrink-0 w-full text-center py-4 text-gray-500">
              No recommendations available yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
