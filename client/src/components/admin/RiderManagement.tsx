import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Phone, Mail, User as UserIcon } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Types
type Rider = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  password?: string;
  availability?: string;
};

// Initial form state
const initialRiderState = {
  id: 0,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "rider",
  password: "",
  availability: "available"
};

export default function RiderManagement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentRider, setCurrentRider] = useState<Rider>(initialRiderState);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all riders
  const { data: riders, isLoading: isLoadingRiders } = useQuery({
    queryKey: ['/api/admin/riders'],
    queryFn: async () => {
      return await fetch('/api/admin/riders', { credentials: "include" })
        .then(res => res.json());
    }
  });

  // Create rider mutation
  const createRider = useMutation({
    mutationFn: async (rider: Omit<Rider, 'id'>) => {
      return await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rider),
        credentials: "include"
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/riders'] });
      toast({
        title: "Success",
        description: "Rider has been added successfully",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add rider",
        variant: "destructive"
      });
    }
  });

  // Handle dialog close
  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setCurrentRider(initialRiderState);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentRider({
      ...currentRider,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...newRider } = currentRider;
    createRider.mutate(newRider);
  };

  // Get rider availability status color
  const getAvailabilityColor = (status: string | undefined) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'busy': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'offline': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Riders</CardTitle>
          <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Add New Rider
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingRiders ? (
            <div className="text-center py-4">Loading riders...</div>
          ) : riders && riders.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {riders.map((rider: Rider) => (
                <div 
                  key={rider.id} 
                  className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <UserIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{rider.firstName} {rider.lastName}</h3>
                        <p className="text-sm text-muted-foreground">#{rider.id}</p>
                      </div>
                    </div>
                    <Badge 
                      className={getAvailabilityColor(rider.availability)}
                    >
                      {rider.availability || 'Unknown'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{rider.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{rider.phone || 'No phone number'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-primary"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">No riders found</div>
          )}
        </CardContent>
      </Card>

      {/* Add Rider Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Rider</DialogTitle>
            <DialogDescription>
              Add a new delivery rider to your team. All fields are required except phone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={currentRider.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={currentRider.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={currentRider.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={currentRider.phone || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={currentRider.password}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Set a temporary password for the rider. They can change it later.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                Add Rider
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}