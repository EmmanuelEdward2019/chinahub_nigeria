import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, DollarSign } from "lucide-react";

interface PaymentPlan {
  id: string;
  name: string;
  naira_price: number;
  dollar_price: number;
  size_range?: string;
  weight_range?: string;
  is_default: boolean;
  created_at: string;
}

const PaymentPlansManager = () => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [nairaPrice, setNairaPrice] = useState("");
  const [dollarPrice, setDollarPrice] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [weightRange, setWeightRange] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setNairaPrice("");
    setDollarPrice("");
    setSizeRange("");
    setWeightRange("");
    setIsDefault(false);
    setEditingPlan(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setNairaPrice((plan.naira_price / 100).toString());
    setDollarPrice((plan.dollar_price / 100).toString());
    setSizeRange(plan.size_range || "");
    setWeightRange(plan.weight_range || "");
    setIsDefault(plan.is_default);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !nairaPrice || !dollarPrice) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const planData = {
        name,
        naira_price: parseInt(nairaPrice) * 100, // Convert to kobo
        dollar_price: parseInt(dollarPrice) * 100, // Convert to cents
        size_range: sizeRange || null,
        weight_range: weightRange || null,
        is_default: isDefault
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('payment_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment plan updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('payment_plans')
          .insert(planData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Payment plan created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      await fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (planId: string) => {
    try {
      // First remove default from all plans
      await supabase
        .from('payment_plans')
        .update({ is_default: false })
        .neq('id', '');

      // Then set the selected plan as default
      const { error } = await supabase
        .from('payment_plans')
        .update({ is_default: true })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default plan updated",
      });

      await fetchPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading payment plans...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Plans Management
            </CardTitle>
            <CardDescription>
              Manage pricing tiers and processing fees
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? 'Edit Payment Plan' : 'Create Payment Plan'}
                </DialogTitle>
                <DialogDescription>
                  Set pricing based on product weight, size, or general categories
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Small Items, Electronics, etc."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nairaPrice">Price (₦)</Label>
                    <Input
                      id="nairaPrice"
                      type="number"
                      value={nairaPrice}
                      onChange={(e) => setNairaPrice(e.target.value)}
                      placeholder="1000"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dollarPrice">Price ($)</Label>
                    <Input
                      id="dollarPrice"
                      type="number"
                      value={dollarPrice}
                      onChange={(e) => setDollarPrice(e.target.value)}
                      placeholder="2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sizeRange">Size Range (Optional)</Label>
                  <Input
                    id="sizeRange"
                    value={sizeRange}
                    onChange={(e) => setSizeRange(e.target.value)}
                    placeholder="e.g., < 30cm x 30cm x 30cm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightRange">Weight Range (Optional)</Label>
                  <Input
                    id="weightRange"
                    value={weightRange}
                    onChange={(e) => setWeightRange(e.target.value)}
                    placeholder="e.g., < 1kg"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                  <Label htmlFor="isDefault">Set as default plan</Label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Size Range</TableHead>
              <TableHead>Weight Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>
                  ₦{(plan.naira_price / 100).toLocaleString()} / ${(plan.dollar_price / 100).toFixed(2)}
                </TableCell>
                <TableCell>{plan.size_range || "N/A"}</TableCell>
                <TableCell>{plan.weight_range || "N/A"}</TableCell>
                <TableCell>
                  {plan.is_default ? (
                    <Badge>Default</Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSetDefault(plan.id)}
                    >
                      Set Default
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {plans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No payment plans configured. Create your first plan to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentPlansManager;