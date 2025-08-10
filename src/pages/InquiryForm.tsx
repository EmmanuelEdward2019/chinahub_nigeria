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

interface InquirySettings {
  default_fee_naira: number;
  default_fee_dollar: number;
}

const InquiryForm = () => {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otherCategoryDetails, setOtherCategoryDetails] = useState("");
  const [wallet, setWallet] = useState<{naira_balance: number, dollar_balance: number} | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [inquirySettings, setInquirySettings] = useState<InquirySettings | null>(null);
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  
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

    const fetchInquirySettings = async () => {
      const { data, error } = await supabase
        .from('inquiry_settings')
        .select('default_fee_naira, default_fee_dollar')
        .single();
      
      if (error) {
        console.error('Error fetching inquiry settings:', error);
        // Fallback to default values
        setInquirySettings({ default_fee_naira: 100000, default_fee_dollar: 200 });
      } else {
        setInquirySettings(data);
      }
    };

    checkUser();
    fetchCategories();
    fetchInquirySettings();
  }, [navigate, searchParams]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Check each file size
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: `File "${file.name}" is too large. Please upload files smaller than 10MB`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check total number of files
    if (sampleFiles.length + files.length > 5) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 5 files",
        variant: "destructive",
      });
      return;
    }

    setSampleFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSampleFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitInquiry = async () => {
    if (!user || !wallet) return;

    setSubmitting(true);
    try {
      // Check if user has sufficient balance (₦1000)
      const requiredAmount = 100000; // ₦1000 in kobo
      if (wallet.naira_balance < requiredAmount) {
        toast({
          title: "Insufficient balance",
          description: "You need at least ₦1,000 to submit an inquiry. Please top up your wallet.",
          variant: "destructive",
        });
        setSubmitting(false);
        setShowPaymentDialog(false);
        return;
      }

      // Upload multiple files
      const uploadedFiles = [];
      for (let i = 0; i < sampleFiles.length; i++) {
        const file = sampleFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('samples')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        uploadedFiles.push({
          name: file.name,
          url: fileName,
          size: file.size
        });
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: requiredAmount,
          currency: 'NGN',
          transaction_type: 'inquiry_fee',
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Deduct from wallet balance (this will need a database function or edge function)
      const { error: walletError } = await supabase.rpc('deduct_wallet_balance', {
        user_id: user.id,
        amount: requiredAmount,
        currency: 'naira'
      });

      if (walletError) {
        // If wallet deduction fails, we should rollback the transaction
        throw walletError;
      }

      const { error: inquiryError } = await supabase
        .from('inquiries')
        .insert({
          user_id: user.id,
          category_id: selectedCategory || null,
          item_name: itemName,
          description,
          quantity,
          sample_files: uploadedFiles,
          payment_status: 'paid',
          processing_fee_naira: requiredAmount
        });

      if (inquiryError) throw inquiryError;

      toast({
        title: "Inquiry submitted successfully!",
        description: "Payment of ₦1,000 has been deducted from your wallet. We'll review your request and get back to you with a quote within 3-5 business days.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast({
        title: "Error submitting inquiry",
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
    if (!user) return;

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
            <div className="flex items-center space-x-4">
              {/* Currency Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Currency:</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "NGN" | "USD")}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="NGN">₦ NGN</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
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
                <Label htmlFor="sampleFiles">Sample Images/Documents (Max 5 files)</Label>
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
                      JPG, PNG, PDF up to 10MB each (Max 5 files)
                    </p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                  {sampleFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Selected files:</p>
                      {sampleFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-primary">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
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
                  {submitting ? "Submitting..." : "Submit Inquiry"}
                </Button>
              </div>

              {/* Submission Confirmation Dialog */}
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Payment & Submission</DialogTitle>
                    <DialogDescription>
                      You are about to submit your inquiry for "{itemName}". 
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Processing Fee:</span>
                        <span className="font-bold text-lg">₦1,000</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Your Wallet Balance:</span>
                        <span className={wallet && wallet.naira_balance >= 100000 ? "text-green-600" : "text-red-600"}>
                          ₦{wallet ? (wallet.naira_balance / 100).toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>
                    
                    {wallet && wallet.naira_balance < 100000 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">
                          Insufficient balance. Please top up your wallet before submitting.
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Once payment is processed:
                      </p>
                      <ul className="text-sm text-blue-600 mt-2 space-y-1">
                        <li>• ₦1,000 will be deducted from your wallet</li>
                        <li>• Our team will review your request within 3-5 business days</li>
                        <li>• You'll receive a quote with supplier details</li>
                      </ul>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button 
                        onClick={submitInquiry} 
                        disabled={submitting || !wallet || wallet.naira_balance < 100000} 
                        className="flex-1"
                      >
                        {submitting ? "Processing..." : "Pay ₦1,000 & Submit"}
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