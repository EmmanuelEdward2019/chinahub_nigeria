import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletTopupProps {
  userId: string;
  onSuccess: () => void;
}

const WalletTopup = ({ userId, onSuccess }: WalletTopupProps) => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleTopup = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const minAmount = getMinAmount();
    if (parseFloat(amount) < minAmount) {
      toast({
        title: "Error",
        description: `Minimum amount is ${getCurrencySymbol()}${minAmount}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        amount: parseFloat(amount),
        currency,
        user_id: userId,
        redirect_url: window.location.origin + "/dashboard"
      };

      if (currency === "NGN") {
        // Use Paystack for Naira payments
        const { data, error } = await supabase.functions.invoke('paystack-topup', {
          body: paymentData
        });

        if (error) throw error;

        if (!data.authorization_url) {
          throw new Error("No payment URL received from Paystack");
        }

        // Redirect to Paystack checkout in the same tab
        window.location.href = data.authorization_url;
      } else {
        // Use PayPal for USD payments
        const { data, error } = await supabase.functions.invoke('paypal-topup', {
          body: paymentData
        });

        if (error) throw error;

        if (!data.approval_url) {
          throw new Error("No payment URL received from PayPal");
        }

        // Redirect to PayPal checkout in the same tab
        window.location.href = data.approval_url;
      }

      toast({
        title: "Redirecting to Payment",
        description: "Please wait while we redirect you to the payment gateway...",
      });

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getMinAmount = () => currency === "NGN" ? 1000 : 5;
  const getCurrencySymbol = () => currency === "NGN" ? "₦" : "$";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Wallet className="h-4 w-4 mr-2" />
          Top Up Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-w-[95vw] mx-4">
        <DialogHeader>
          <DialogTitle>Top Up Your Wallet</DialogTitle>
          <DialogDescription>
            Add funds to your wallet to pay for processing fees
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={(value: "NGN" | "USD") => setCurrency(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-full">
                <SelectItem value="NGN">₦ Nigerian Naira</SelectItem>
                <SelectItem value="USD">$ US Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({getCurrencySymbol()})</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Minimum ${getCurrencySymbol()}${getMinAmount()}`}
              min={getMinAmount()}
              step={currency === "NGN" ? "100" : "1"}
            />
            <p className="text-xs text-muted-foreground">
              Minimum amount: {getCurrencySymbol()}{getMinAmount()}
            </p>
          </div>

          <Card className="p-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Payment via {currency === "NGN" ? "Paystack" : "PayPal"}
              </span>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button 
              onClick={handleTopup} 
              disabled={loading || !amount}
              className="flex-1 w-full"
            >
              {loading ? "Processing..." : `Pay ${getCurrencySymbol()}${amount || "0"}`}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletTopup;