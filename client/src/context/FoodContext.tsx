import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface Food {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: number;
  prepTime?: string; // Optional preparation time 
  rating?: number;   // Optional rating
}

interface FoodContextType {
  categories: Category[];
  foods: Food[];
  popularFoods: Food[];
  recommendedFoods: Food[];
  topCategories: {
    id: number;
    name: string;
    icon: string;
    image: string;
    price: number;
  }[];
  foodsByCategory: Record<number, Food[]>;
  loadingCategories: boolean;
  loadingFoods: boolean;
  errorCategories: Error | null;
  errorFoods: Error | null;
  getIconClass: (icon: string) => string;
  refreshFoods: () => Promise<void>;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export function FoodProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [foodsByCategory, setFoodsByCategory] = useState<Record<number, Food[]>>({});
  const [popularFoods, setPopularFoods] = useState<Food[]>([]);
  const [recommendedFoods, setRecommendedFoods] = useState<Food[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);

  // Fetch categories
  const { 
    data: categories = [], 
    isLoading: loadingCategories,
    error: errorCategories
  } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch all foods
  const { 
    data: foods = [], 
    isLoading: loadingFoods,
    error: errorFoods
  } = useQuery<Food[]>({
    queryKey: ['/api/foods'],
  });

  // Process data once foods and categories are loaded
  useEffect(() => {
    if (foods.length > 0 && categories.length > 0) {
      // 1. Organize foods by category
      const byCategory: Record<number, Food[]> = {};
      
      foods.forEach(food => {
        if (!byCategory[food.categoryId]) {
          byCategory[food.categoryId] = [];
        }
        byCategory[food.categoryId].push(food);
      });
      
      setFoodsByCategory(byCategory);
      
      // 2. Add prep time and ratings to food items
      const enhancedFoods = foods.map(food => ({
        ...food,
        prepTime: `${20 + Math.floor(Math.random() * 20)}-${30 + Math.floor(Math.random() * 15)}Min`,
        rating: Number((3.5 + Math.random() * 1.5).toFixed(1))
      }));
      
      // 3. Set popular foods (most recent 4 items for now, in a real app you'd track popularity)
      setPopularFoods(
        [...enhancedFoods]
          .sort((a, b) => b.id - a.id) // Sort by ID descending to get most recent
          .slice(0, 4)
      );
      
      // 4. Set recommended foods (random selection from different categories)
      const recommendedItems: Food[] = [];
      const usedCategories = new Set<number>();
      
      // Try to get one food from each category first for diversity
      for (const category of categories) {
        if (recommendedItems.length >= 4) break;
        
        const categoryFoods = byCategory[category.id];
        if (categoryFoods && categoryFoods.length > 0) {
          const randomIndex = Math.floor(Math.random() * categoryFoods.length);
          const selectedFood = {
            ...categoryFoods[randomIndex],
            prepTime: `${20 + Math.floor(Math.random() * 20)}-${30 + Math.floor(Math.random() * 15)}Min`,
            rating: Number((3.5 + Math.random() * 1.5).toFixed(1))
          };
          
          recommendedItems.push(selectedFood);
          usedCategories.add(category.id);
        }
      }
      
      setRecommendedFoods(recommendedItems);
      
      // 5. Set top categories (display items for the category scroller)
      const topCategoryItems: any[] = [];
      
      // Use the first 3 foods from different categories for the top scroller
      categories.slice(0, 3).forEach(category => {
        const categoryFoods = byCategory[category.id];
        if (categoryFoods && categoryFoods.length > 0) {
          topCategoryItems.push({
            id: categoryFoods[0].id,
            name: category.name,
            icon: category.icon,
            image: categoryFoods[0].image,
            price: categoryFoods[0].price
          });
        }
      });
      
      setTopCategories(topCategoryItems);
    }
  }, [foods, categories]);

  // Helper function to get icon class (kept for backwards compatibility)
  const getIconClass = (icon: string) => {
    return icon;
  };

  // Function to refresh food data
  const refreshFoods = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
  };

  return (
    <FoodContext.Provider
      value={{
        categories,
        foods,
        popularFoods,
        recommendedFoods,
        topCategories,
        foodsByCategory,
        loadingCategories,
        loadingFoods,
        errorCategories: errorCategories as Error | null,
        errorFoods: errorFoods as Error | null,
        getIconClass,
        refreshFoods
      }}
    >
      {children}
    </FoodContext.Provider>
  );
}

export function useFood() {
  const context = useContext(FoodContext);
  if (context === undefined) {
    throw new Error("useFood must be used within a FoodProvider");
  }
  return context;
}
