import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Package, FileText, LogOut, PlusCircle, Bell, Settings, MessageSquare, DollarSign, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WalletTopup from "@/components/WalletTopup";
import ProfileSettings from "@/components/ProfileSettings";
import TransactionHistory from "@/components/TransactionHistory";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { OrderFlow } from "@/components/OrderFlow";
import RecentInquiries from "@/components/RecentInquiries";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  country: string;
}

interface WalletData {
  naira_balance: number;
  dollar_balance: number;
}

interface Inquiry {
  id: string;
  item_name: string;
  status: string;
  created_at: string;
  quantity: number;
  supplier_quote?: string;
  admin_feedback?: string;
  unit_price?: number;
  processing_fee?: number;
  admin_pricing_currency?: string;
  processing_fee_naira?: number;
  processing_fee_dollar?: number;
  quote_confirmed_at?: string;
  quote_payment_processed?: boolean;
  order_stage_id?: string;
  description: string;
}

interface OrderStage {
  id: string;
  inquiry_id: string;
  stage: string;
  product_images: any;
  confirmed_quantity?: number;
  quoted_amount?: number;
  quoted_currency?: string;
  admin_notes?: string;
  payment_reference?: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  inquiry_id?: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orderStages, setOrderStages] = useState<OrderStage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchUserData(session.user.id);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch inquiries with more details
      const { data: inquiriesData } = await supabase
        .from('inquiries')
        .select('id, item_name, description, status, created_at, supplier_quote, admin_feedback, unit_price, processing_fee, admin_pricing_currency, processing_fee_naira, processing_fee_dollar, quote_confirmed_at, quote_payment_processed, order_stage_id, quantity')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch order stages
      const { data: orderStagesData } = await supabase
        .from('order_stages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setOrderStages((orderStagesData || []).map(stage => ({
        ...stage,
        product_images: Array.isArray(stage.product_images) ? stage.product_images : []
      })));

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      setProfile(profileData);
      setWallet(walletData);
      setInquiries(inquiriesData || []);
      setNotifications(notificationsData || []);
      setIsAdmin(!!roleData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Realtime updates for transactions and wallets
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('realtime-wallet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user?.id}` }, () => {
        fetchUserData(user!.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user?.id}` }, () => {
        fetchUserData(user!.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const markNotificationsAsRead = async () => {
    if (!user || notifications.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    await fetchUserData(user.id);
  };

  const viewQuoteDetails = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setIsQuoteDialogOpen(true);
  };

  const confirmQuote = async (inquiry: Inquiry) => {
    if (!user || !wallet) return;

    const processingFee = currency === "NGN" ? inquiry.processing_fee_naira : inquiry.processing_fee_dollar;
    const currentBalance = currency === "NGN" ? wallet.naira_balance : wallet.dollar_balance;

    if (!processingFee) {
      toast({
        title: "Error",
        description: "No processing fee set for this currency",
        variant: "destructive",
      });
      return;
    }

    if (currentBalance < processingFee) {
      toast({
        title: "Insufficient Funds",
        description: `You need ${currency === "NGN" ? "₦" : "$"}${(processingFee / 100).toLocaleString()} to confirm this quote. Please top up your wallet.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('confirm-quote', {
        body: {
          inquiry_id: inquiry.id,
          currency: currency
        }
      });

      if (error) throw error;

      toast({
        title: "Quote Confirmed",
        description: "Payment processed successfully. We'll proceed with sourcing your product.",
      });

      // Refresh data
      await fetchUserData(user.id);
      setIsQuoteDialogOpen(false);
    } catch (error) {
      console.error('Error confirming quote:', error);
      toast({
        title: "Error",
        description: "Failed to confirm quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, curr: "NGN" | "USD") => {
    const value = curr === "NGN" ? amount / 100 : amount / 100; // Convert from kobo/cents
    return curr === "NGN" ? `₦${value.toLocaleString()}` : `$${value.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation user={user} />
      
      {/* Dashboard-specific header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 overflow-x-auto">
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              <h1 className="text-lg font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-1 md:space-x-4 flex-shrink-0">
              {/* Notifications */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={markNotificationsAsRead}
                  className="relative h-8 w-8 p-0 md:h-auto md:w-auto md:px-3"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></div>
                  )}
                </Button>
              </div>

              {/* Currency Selector - Hidden on mobile */}
              <div className="hidden md:flex items-center space-x-2">
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

              {/* Settings */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 md:h-auto md:w-auto md:px-3">
                    <Settings className="h-4 w-4" />
                    <span className="hidden md:inline md:ml-2">Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Account Settings</DialogTitle>
                    <DialogDescription>
                      Manage your profile and account preferences
                    </DialogDescription>
                  </DialogHeader>
                  {user && <ProfileSettings user={user} onUpdate={() => fetchUserData(user.id)} />}
                </DialogContent>
              </Dialog>

              {/* Admin Panel Link */}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin_2025store")} className="hidden md:inline-flex">
                  Admin Panel
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 w-8 p-0 md:h-auto md:w-auto md:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline md:ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {profile?.full_name || 'User'}!</h2>
          <p className="text-muted-foreground">Manage your product sourcing requests and track your progress.</p>
        </div>

        {/* Recent Notifications Card - Only unread notifications and new inquiries */}
        {notifications.filter(n => !n.read).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
              <CardDescription>
                Unread notifications and new inquiries - click the bell icon above for all notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.filter(n => !n.read).slice(0, 3).map((notification) => (
                  <div 
                    key={notification.id} 
                    className="p-4 border rounded-lg bg-blue-50 border-blue-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={notification.type === 'success' ? 'default' : notification.type === 'warning' ? 'destructive' : 'secondary'}>
                          {notification.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          New
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
              {notifications.filter(n => !n.read).length > 3 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  +{notifications.filter(n => !n.read).length - 3} more unread notifications - click the bell icon above to view all
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {wallet ? formatCurrency(
                  currency === "NGN" ? wallet.naira_balance : wallet.dollar_balance,
                  currency
                ) : "₦0"}
              </div>
              <p className="text-xs text-muted-foreground">
                Available balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Inquiries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inquiries.filter(i => i.status === 'pending' || i.status === 'reviewed').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inquiries.length}</div>
              <p className="text-xs text-muted-foreground">
                All time requests
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="mb-8">
          <TransactionHistory userId={user?.id} currency={currency} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your next sourcing request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={() => navigate("/inquiry")}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Submit New Inquiry
              </Button>
              <WalletTopup userId={user?.id || ""} onSuccess={() => fetchUserData(user?.id || "")} />
            </CardContent>
          </Card>

                           <Card>
                             <CardHeader>
                               <CardTitle>Recent Inquiries</CardTitle>
                               <CardDescription>Your latest sourcing requests</CardDescription>
                             </CardHeader>
                             <CardContent>
                               <RecentInquiries 
                                 userId={user?.id || ""} 
                                 currency={currency} 
                                 orderStages={orderStages}
                                 onViewQuote={viewQuoteDetails}
                               />
                             </CardContent>
                           </Card>
        </div>

        {/* Quote Details Dialog */}
        <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader className="text-center">
              <DialogTitle>Supplier Quote Details</DialogTitle>
              <DialogDescription>
                {selectedInquiry?.item_name} - Approved Quote
              </DialogDescription>
            </DialogHeader>

            {selectedInquiry && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-center">Quote Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Item</label>
                      <p className="text-lg font-semibold">{selectedInquiry.item_name}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                      <p className="text-lg font-semibold">{selectedInquiry.quantity?.toLocaleString()}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Supplier Quote</label>
                      <p className="text-sm mt-1 p-2 bg-gray-50 rounded border">
                        {selectedInquiry.supplier_quote || "No quote details provided"}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Admin Feedback</label>
                      <p className="text-sm mt-1 p-2 bg-gray-50 rounded border">
                        {selectedInquiry.admin_feedback || "No additional feedback"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-2">
                  <OrderFlow 
                    inquiry={selectedInquiry} 
                    orderStage={orderStages.find(os => os.inquiry_id === selectedInquiry.id)}
                    onUpdate={() => fetchUserData(user?.id || "")}
                  />
                </div>

                <div className="pt-4 border-t text-center">
                  {selectedInquiry?.quote_payment_processed ? (
                    <div>
                      <p className="text-sm text-green-600 mb-4 font-medium">
                        ✓ Quote confirmed and payment processed. Our team is now sourcing your product.
                      </p>
                      <div className="flex justify-center">
                        <Button variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">
                        This quote has been approved. Contact us on WhatsApp for further details: +8619589456744 or +234 8133628713.
                      </p>
                      <div className="flex justify-center">
                        <Button variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;