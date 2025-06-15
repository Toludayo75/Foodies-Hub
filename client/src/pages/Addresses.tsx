import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddressItem from "@/components/AddressItem";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const addressSchema = z.object({
  name: z.string().min(1, { message: "Address name is required" }),
  address: z.string().min(3, { message: "Address is required" }),
  isDefault: z.boolean().optional()
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface Address {
  id: number;
  name: string;
  address: string;
  isDefault: boolean;
}

export default function Addresses() {
  const { isAuthenticated } = useAuth();
  const { navigateBack } = useNavigation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form setup
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: "",
      address: "",
      isDefault: false
    }
  });
  
  // Fetch user addresses
  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ['/api/addresses'],
    enabled: isAuthenticated,
  });
  
  // Add address mutation
  const addAddressMutation = useMutation({
    mutationFn: async (values: AddressFormValues) => {
      // Make sure isDefault is included in the data even if not explicitly set
      const addressData = {
        ...values,
        isDefault: values.isDefault === undefined ? false : values.isDefault
      };
      const res = await apiRequest("POST", "/api/addresses", addressData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      form.reset();
      setIsAddDialogOpen(false);
      toast({
        title: "Address added",
        description: "Your new address has been added",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add address",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  const onSubmit = (values: AddressFormValues) => {
    addAddressMutation.mutate(values);
  };
  
  const handleGoBack = () => {
    const backRoute = navigateBack();
    navigate(backRoute);
  };
  
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div>
      <div className="screen-header">
        <div className="flex items-center">
          <button className="mr-2" onClick={handleGoBack}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <h1 className="screen-title">Addresses</h1>
        </div>
      </div>
      
      <div className="p-4 bg-white">
        {/* Add Address Button */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-2 text-primary-color font-medium mb-4">
              <i className="fa-solid fa-plus"></i>
              <span>Add addresses</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Address Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Home, Work, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mb-4">
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary-color hover:bg-primary-color/90"
                  disabled={addAddressMutation.isPending}
                >
                  {addAddressMutation.isPending ? "Adding..." : "Add Address"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Addresses List */}
        {isLoading ? (
          // Skeleton loader for addresses
          <div className="flex flex-col gap-3">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="border-b border-gray-200 py-4">
                <div className="flex justify-between mb-2">
                  <Skeleton className="w-16 h-5" />
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
                <Skeleton className="w-full h-4" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8">
            <i className="fa-solid fa-map-marker-alt text-4xl text-gray-300 mb-4"></i>
            <p>You haven't added any addresses yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {addresses.map((address) => (
              <AddressItem
                key={address.id}
                id={address.id}
                name={address.name}
                address={address.address}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
