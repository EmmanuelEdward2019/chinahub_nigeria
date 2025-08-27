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
  const [quantity, setQuantity] = useState<string>("");
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
      const requiredAmount = currency === "NGN" ? (inquirySettings?.default_fee_naira || 100000) : (inquirySettings?.default_fee_dollar || 200); // ₦1000 in kobo or $2 in cents
      const requiredCurrency = currency === "NGN" ? "NGN" : "USD";
      
      // Check if user has sufficient balance
      const currentBalance = currency === "NGN" ? wallet.naira_balance : wallet.dollar_balance;
      if (currentBalance < requiredAmount) {
        toast({
          title: "Insufficient balance",
          description: `You need at least ${currency === "NGN" ? "₦" : "$"}${(requiredAmount / 100).toLocaleString()} to submit an inquiry. Please top up your wallet.`,
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

      // Create inquiry first to get the ID
      const { data: inquiry, error: inquiryError } = await supabase
        .from('inquiries')
        .insert({
          user_id: user.id,
          category_id: selectedCategory || null,
          item_name: itemName,
          description,
          quantity: parseInt(quantity) || 1,
          sample_files: uploadedFiles,
          payment_status: 'paid',
          processing_fee_naira: currency === "NGN" ? requiredAmount : null,
          processing_fee_dollar: currency === "USD" ? requiredAmount : null
        })
        .select()
        .single();

      if (inquiryError) throw inquiryError;

      // Process the inquiry fee using the edge function
      const { error: feeError } = await supabase.functions.invoke('process-inquiry-fee', {
        body: {
          inquiry_id: inquiry.id,
          currency: requiredCurrency
        }
      });

      if (feeError) {
        // If fee processing fails, delete the inquiry
        await supabase.from('inquiries').delete().eq('id', inquiry.id);
        throw feeError;
      }

      // Navigate to success page instead of showing toast
      navigate('/inquiry-success');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast({
        title: "Error submitting inquiry",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowPaymentDialog(false);
    }
  };

  const handleTopUp = async () => {
    // Check if we have pending inquiry data
    const pendingInquiry = localStorage.getItem('pendingInquiry');
    
    if (pendingInquiry) {
      // If we have pending inquiry data, we need to submit the inquiry after payment
      // For now, let's handle the payment first and then submit the inquiry
      const inquiryData = JSON.parse(pendingInquiry);
      
      try {
        // Process payment first
        const { data, error } = await supabase.functions.invoke('paystack-topup', {
          body: {
            amount: 1000, // ₦1,000
            currency: 'NGN',
            user_id: user?.id,
            redirect_url: `${window.location.origin}/inquiry-success?pendingInquiry=true`
          }
        });

        if (error) throw error;

        // Redirect to Paystack checkout
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
        }
      } catch (error) {
        console.error('Error initiating payment:', error);
        toast({
          title: "Payment Error",
          description: "Failed to initiate payment. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }
    
    // Regular top-up flow
    if (!user) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('paystack-topup', {
        body: {
          amount: 1000, // ₦1,000
          currency: 'NGN',
          user_id: user.id,
          redirect_url: window.location.href
        }
      });

      if (error) throw error;

      // Redirect to Paystack checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

      // Store inquiry data for payment flow
      const inquiryData = {
        categoryId: selectedCategory,
        itemName,
        description,
        quantity: parseInt(quantity),
        sampleFiles,
        processingFee: currency === 'NGN' ? inquirySettings?.default_fee_naira : inquirySettings?.default_fee_dollar,
        currency: currency
      };
      
      // Save inquiry data to localStorage for payment flow
      localStorage.setItem('pendingInquiry', JSON.stringify(inquiryData));
      
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
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
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
                  disabled={submitting || !itemName || !description || !quantity}
                  className="min-w-32"
                >
                  {submitting ? "Processing..." : "Pay ₦1,000"}
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
                        <p className="text-sm text-red-600 mb-2">
                          Insufficient balance. You'll be redirected to payment.
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
                        onClick={wallet && wallet.naira_balance >= 100000 ? submitInquiry : handleTopUp}
                        disabled={submitting} 
                        className="flex-1"
                      >
                        {submitting ? "Processing..." : 
                         wallet && wallet.naira_balance >= 100000 ? "Pay ₦1,000 & Submit" : "Pay ₦1,000"}
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