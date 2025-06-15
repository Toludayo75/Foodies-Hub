import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft, Camera, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";

// Form schema
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfile() {
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form initialization
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });
  
  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || "",
      });
    }
  }, [user, form]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setSaving(true);
      console.log("Submitting profile update with data:", data);
      
      // Create a FormData object if there's an image to upload
      if (uploadedImage) {
        const formData = new FormData();
        formData.append("profileImage", uploadedImage);
        
        console.log("Uploading profile image...");
        
        // Upload the image first
        const imageResponse = await fetch("/api/user/profile-image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          throw new Error(errorData.message || 'Failed to upload profile image');
        }
        
        console.log("Profile image uploaded successfully");
      }
      
      // Try both endpoints for profile updates to ensure compatibility
      console.log("Updating profile data...");
      let response;
      
      try {
        // First try the user profile endpoint
        response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
          credentials: "include"
        });
        
        if (!response.ok) {
          console.log("First endpoint failed, trying auth profile endpoint...");
          // If first endpoint fails, try the auth profile endpoint
          response = await fetch("/api/auth/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
            credentials: "include"
          });
        }
      } catch (fetchError) {
        console.error("Error with first endpoint:", fetchError);
        // If first endpoint throws, try the second endpoint
        response = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data),
          credentials: "include"
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
      const updatedUserData = await response.json();
      console.log("Profile data updated successfully:", updatedUserData);
      
      // Refresh the user data in the auth context with a direct fetch to ensure latest data
      try {
        console.log("Refreshing user data in context...");
        await refreshUser();
        console.log("User data refreshed in context");
      } catch (refreshError) {
        console.error("Failed to refresh user data:", refreshError);
      }
      
      // Clear the uploaded image state
      setUploadedImage(null);
      setImagePreview(null);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      setSaving(false);
      
      // Redirect back to settings page after successful update
      navigate("/settings");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };
  
  const handleGoBack = () => {
    navigate("/settings");
  };
  
  // Handle image upload preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-foodies-green border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Header */}
      <div className="p-4 flex items-center border-b">
        <button
          onClick={handleGoBack}
          className="mr-4"
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold">Edit Profile</h1>
      </div>
      
      {/* Profile Image */}
      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
            <img 
              src={imagePreview || user?.profileImage || "https://via.placeholder.com/96"} 
              alt={`${user?.firstName} ${user?.lastName}`}
              className="w-full h-full object-cover"
            />
          </div>
          <label 
            className="absolute bottom-0 right-0 bg-foodies-green text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md cursor-pointer"
            aria-label="Change profile picture"
          >
            <Camera size={16} />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        </div>
        {uploadedImage && (
          <p className="text-xs text-gray-500 mt-2">
            New profile picture selected: {uploadedImage.name}
          </p>
        )}
      </div>
      
      {/* Form */}
      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Your phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-foodies-green hover:bg-foodies-green/90 text-white"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}