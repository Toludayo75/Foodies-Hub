import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Types
type Food = {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
  categoryId: number;
  category?: string;
};

type Category = {
  id: number;
  name: string;
  icon?: string;
};

// Initial form state
const initialFoodState = {
  id: 0,
  name: "",
  description: "",
  price: 0,
  image: "",
  categoryId: 0,
};

export default function MenuManagement() {
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentFood, setCurrentFood] = useState<Food>(initialFoodState);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all food items
  const { data: foods, isLoading: isLoadingFoods, refetch: refetchFoods } = useQuery({
    queryKey: ['/api/admin/foods'],
    queryFn: async () => {
      const response = await fetch('/api/admin/foods', { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch foods");
      }
      return await response.json();
    }
  });

  // Get all categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/admin/categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/categories', { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      return await response.json();
    }
  });

  // Create food mutation
  const createFood = useMutation({
    mutationFn: async (food: Omit<Food, 'id'>) => {
      const response = await fetch('/api/admin/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create food item");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/foods'] });
      // Also invalidate customer-facing food data
      queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
      toast({
        title: "Success",
        description: "New food item has been created",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create food item",
        variant: "destructive"
      });
    }
  });

  // Update food mutation
  const updateFood = useMutation({
    mutationFn: async (food: Food) => {
      const response = await fetch(`/api/admin/foods/${food.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update food item');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/foods'] });
      // Also invalidate customer-facing food data
      queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
      toast({
        title: "Success",
        description: "Food item has been updated",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update food item",
        variant: "destructive"
      });
    }
  });

  // Delete food mutation
  const deleteFood = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/foods/${id}`, {
        method: 'DELETE',
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete food item');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/foods'] });
      // Also invalidate customer-facing food data
      queryClient.invalidateQueries({ queryKey: ['/api/foods'] });
      toast({
        title: "Success",
        description: "Food item has been deleted",
      });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete food item",
        variant: "destructive"
      });
    }
  });

  // Handle opening the add/edit dialog
  const handleAddFood = () => {
    setCurrentFood(initialFoodState);
    setIsEditing(false);
    setShowAddEditDialog(true);
  };

  // Handle opening edit dialog
  const handleEditFood = (food: Food) => {
    setCurrentFood(food);
    setIsEditing(true);
    setShowAddEditDialog(true);
  };

  // Handle opening delete confirmation dialog
  const handleDeleteFood = (food: Food) => {
    setCurrentFood(food);
    setShowDeleteDialog(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setShowAddEditDialog(false);
    setCurrentFood(initialFoodState);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentFood({
      ...currentFood,
      [name]: name === 'price' ? parseFloat(value) : value,
    });
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setCurrentFood({
      ...currentFood,
      categoryId: parseInt(value),
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        // Ensure price is a number
        const updatedFood = {
          ...currentFood,
          price: typeof currentFood.price === 'string' 
            ? parseFloat(currentFood.price) 
            : currentFood.price
        };
        
        await updateFood.mutateAsync(updatedFood);
        // Manually refetch to ensure UI is updated
        await refetchFoods();
      } else {
        // Remove id for new items
        const { id, ...newFoodData } = currentFood;
        
        // Ensure price is a number
        const newFood = {
          ...newFoodData,
          price: typeof newFoodData.price === 'string' 
            ? parseFloat(newFoodData.price) 
            : newFoodData.price
        };
        
        await createFood.mutateAsync(newFood);
        // Manually refetch to ensure UI is updated
        await refetchFoods();
      }
    } catch (error) {
      console.error("Error saving food item:", error);
      toast({
        title: "Error",
        description: "Failed to save food item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    try {
      await deleteFood.mutateAsync(currentFood.id);
      // Manually refetch to ensure UI is updated
      await refetchFoods();
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete food item. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return `₦${price.toFixed(2)}`;
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    if (!categories) return "Unknown";
    const category = categories.find((c: Category) => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Menu Items</CardTitle>
          <Button onClick={handleAddFood} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Add New Item
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingFoods || isLoadingCategories ? (
            <div className="text-center py-4">Loading menu items...</div>
          ) : foods && foods.length > 0 && categories && categories.length > 0 ? (
            <div className="space-y-8">
              {categories.map((category: Category) => {
                const categoryFoods = foods.filter((food: Food) => food.categoryId === category.id);
                
                return (
                  <div key={category.id} className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">{category.name}</h3>
                    {categoryFoods.length > 0 ? (
                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryFoods.map((food: Food) => (
                              <TableRow key={food.id}>
                                <TableCell className="font-medium">{food.name}</TableCell>
                                <TableCell className="max-w-[300px] truncate">{food.description}</TableCell>
                                <TableCell>{formatPrice(food.price)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditFood(food)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteFood(food)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 border rounded-lg">No items in this category</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">No menu items or categories found</div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Food Dialog */}
      <Dialog open={showAddEditDialog} onOpenChange={setShowAddEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update the details of this menu item" 
                : "Add a new item to your menu. All fields are required."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={currentFood.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={currentFood.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="price">Price (in Naira)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentFood.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  name="image"
                  value={currentFood.image || ''}
                  onChange={handleInputChange}
                  placeholder="Enter a valid image URL (e.g., https://example.com/image.jpg)"
                />
                <span className="text-xs text-muted-foreground mt-1">
                  Recommended: Use high-quality images from Unsplash (e.g., https://images.unsplash.com/photo-ID)
                </span>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                {isLoadingCategories ? (
                  <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                ) : (
                  <Select 
                    value={currentFood.categoryId.toString()} 
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories && categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoadingCategories}>
                {isEditing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentFood.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}