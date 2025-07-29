import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  icon: string;
}

const InquiryForm = () => {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otherCategoryDetails, setOtherCategoryDetails] = useState("");
  const [wallet, setWallet] = useState<{naira_balance: number, dollar_balance: number} | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [inquiryFee] = useState(5000); // ₦50 inquiry fee
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      
      // Fetch user wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('naira_balance, dollar_balance')
        .eq('user_id', session.user.id)
        .single();
      
      setWallet(walletData);
    };

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setCategories(data || []);
        
        // Pre-select category from URL params
        const categoryParam = searchParams.get('category');
        if (categoryParam) {
          const category = data?.find(cat => cat.name.toLowerCase() === categoryParam.toLowerCase());
          if (category) {
            setSelectedCategory(category.id);
          }
        }
      }
    };

    checkUser();
    fetchCategories();
  }, [navigate, searchParams]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSampleFile(file);
    }
  };

  const processPayment = async () => {
    if (!user || !wallet) return;

    if (wallet.naira_balance < inquiryFee) {
      toast({
        title: "Insufficient Funds",
        description: `You need ₦${(inquiryFee / 100).toLocaleString()} to submit an inquiry. Please fund your wallet first.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Deduct payment from wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ naira_balance: wallet.naira_balance - inquiryFee })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Submit inquiry with payment status
      let sampleFileUrl = null;
      if (sampleFile) {
        const fileExt = sampleFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('samples')
          .upload(fileName, sampleFile);

        if (uploadError) throw uploadError;
        sampleFileUrl = fileName;
      }

      const { data: inquiryData, error: inquiryError } = await supabase
        .from('inquiries')
        .insert({
          user_id: user.id,
          category_id: selectedCategory || null,
          item_name: itemName,
          description,
          quantity,
          sample_file_url: sampleFileUrl,
          payment_status: 'paid'
        })
        .select()
        .single();

      if (inquiryError) throw inquiryError;

      // Create order record
      await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          inquiry_id: inquiryData.id,
          amount: inquiryFee,
          currency: 'NGN',
          status: 'completed',
          payment_method: 'wallet'
        });

      // Create transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          inquiry_id: inquiryData.id,
          transaction_type: 'payment',
          amount: inquiryFee,
          currency: 'NGN',
          status: 'completed',
          reference: `INQ-${inquiryData.id.substring(0, 8)}`
        });

      toast({
        title: "Inquiry submitted successfully!",
        description: "Payment processed. We'll review your request and get back to you soon.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error processing payment",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowPaymentDialog(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !wallet) return;

    // Check if user has sufficient funds
    if (wallet.naira_balance < inquiryFee) {
      toast({
        title: "Insufficient Funds",
        description: `You need ₦${(inquiryFee / 100).toLocaleString()} to submit an inquiry. Please fund your wallet first.`,
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setShowPaymentDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <img src="/lovable-uploads/0bdcaaca-e82b-4c23-9eb4-934cd15493e9.png" alt="ChinaHub Logo" className="h-8 w-auto" />
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Product Sourcing Inquiry</CardTitle>
            <CardDescription>
              Fill out the form below to request a quote for your desired product from China
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Product Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory && categories.find(cat => cat.id === selectedCategory)?.name === 'Others' && (
                  <div className="space-y-2">
                    <Label htmlFor="otherDetails">Please specify the category *</Label>
                    <Input
                      id="otherDetails"
                      value={otherCategoryDetails}
                      onChange={(e) => setOtherCategoryDetails(e.target.value)}
                      placeholder="e.g., Pet supplies, Art materials, Custom machinery"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="itemName">Product Name *</Label>
                  <Input
                    id="itemName"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g., Office Chair, LED TV, Kitchen Mixer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Product Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed specifications, materials, colors, size requirements, etc."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sampleFile">Sample Image/Document</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary hover:text-primary/80">
                        Click to upload
                      </span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG, PDF up to 10MB
                    </p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {sampleFile && (
                    <p className="mt-2 text-sm text-primary">
                      Selected: {sampleFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !itemName || !description}
                  className="min-w-32"
                >
                  {submitting ? "Processing..." : `Pay ₦${(inquiryFee / 100).toLocaleString()} & Submit`}
                </Button>
              </div>

              {/* Payment Confirmation Dialog */}
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Payment</DialogTitle>
                    <DialogDescription>
                      You are about to pay ₦{(inquiryFee / 100).toLocaleString()} to submit your inquiry for "{itemName}"
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Current Wallet Balance:</span>
                        <span className="font-semibold">₦{wallet ? (wallet.naira_balance / 100).toLocaleString() : '0'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Inquiry Fee:</span>
                        <span className="font-semibold">₦{(inquiryFee / 100).toLocaleString()}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between items-center">
                        <span>Balance After Payment:</span>
                        <span className="font-semibold">₦{wallet ? ((wallet.naira_balance - inquiryFee) / 100).toLocaleString() : '0'}</span>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={processPayment} disabled={submitting}>
                        {submitting ? "Processing..." : "Confirm Payment"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InquiryForm;