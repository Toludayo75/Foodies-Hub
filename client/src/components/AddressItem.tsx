import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddressItemProps {
  id: number;
  name: string;
  address: string;
}

export default function AddressItem({ id, name, address }: AddressItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/addresses/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      toast({
        title: "Address deleted",
        description: `Your address "${name}" has been deleted.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete address",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = () => {
    deleteAddressMutation.mutate();
  };
  
  return (
    <div className="border-b border-gray-200 py-4">
      <div className="flex justify-between">
        <h3 className="font-medium mb-1">{name}</h3>
        <button 
          onClick={handleDelete}
          disabled={deleteAddressMutation.isPending}
        >
          <i className="fa-solid fa-circle-xmark text-gray-400"></i>
        </button>
      </div>
      <p className="text-sm text-secondary-content">{address}</p>
    </div>
  );
}
