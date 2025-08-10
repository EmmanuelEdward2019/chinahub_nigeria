import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Eye,
  Upload,
  LogOut,
  Settings,
  Bell
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import ProfileSettings from "@/components/ProfileSettings";
import PaymentPlansManager from "@/components/PaymentPlansManager";
import UserManagement from "@/components/UserManagement";
import NotificationSystem from "@/components/NotificationSystem";

interface Inquiry {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  status: string;
  created_at: string;
  user_id: string;
  sample_file_url?: string;
  supplier_quote?: string;
  admin_feedback?: string;
  profiles: {
    full_name: string;
    phone?: string;
    country?: string;
  } | null;
}

interface AdminStats {
  totalInquiries: number;
  pendingInquiries: number;
  approvedQuotes: number;
  totalUsers: number;
  totalWalletTopups: number;
  revenue: number;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalInquiries: 0,
    pendingInquiries: 0,
    approvedQuotes: 0,
    totalUsers: 0,
    totalWalletTopups: 0,
    revenue: 0
  });
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [supplierQuote, setSupplierQuote] = useState("");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();
      
      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
      setIsAdmin(true);
      await fetchData();
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate, toast]);

  const fetchData = async () => {
    try {
      console.log('Fetching admin data...');
      
      // First test basic inquiry fetch
      const inquiriesTest = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Basic inquiries fetch:', inquiriesTest);
      
      if (inquiriesTest.error) {
        console.error('Error fetching inquiries:', inquiriesTest.error);
        toast({
          title: "Error",
          description: `Failed to fetch inquiries: ${inquiriesTest.error.message}`,
          variant: "destructive",
        });
        return;
      }

      // Now fetch with profiles using a manual join approach
      const inquiriesWithProfiles = [];
      for (const inquiry of inquiriesTest.data || []) {
        const profileResponse = await supabase
          .from('profiles')
          .select('full_name, phone, country')
          .eq('user_id', inquiry.user_id)
          .maybeSingle();
        
        inquiriesWithProfiles.push({
          ...inquiry,
          profiles: profileResponse.data
        });
      }
      
      console.log('Inquiries with profiles:', inquiriesWithProfiles);
      setInquiries(inquiriesWithProfiles);

      // Fetch other data
      const [
        notificationsResponse,
        totalInquiriesResponse,
        pendingInquiriesResponse,
        approvedQuotesResponse,
        totalUsersResponse,
        walletDataResponse
      ] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('inquiries')
          .select('*', { count: 'exact', head: true }),
        
        supabase
          .from('inquiries')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'reviewed']),
        
        supabase
          .from('inquiries')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        
        supabase
          .from('transactions')
          .select('amount, currency')
          .eq('transaction_type', 'topup')
          .eq('status', 'completed')
      ]);
      
      setNotifications(notificationsResponse.data || []);

      const totalWalletTopups = walletDataResponse.data?.length || 0;
      const revenue = walletDataResponse.data?.reduce((sum, transaction) => 
        sum + (transaction.currency === 'NGN' ? transaction.amount / 100 : transaction.amount / 100 * 500), 0
      ) || 0;

      setStats({
        totalInquiries: totalInquiriesResponse.count || 0,
        pendingInquiries: pendingInquiriesResponse.count || 0,
        approvedQuotes: approvedQuotesResponse.count || 0,
        totalUsers: totalUsersResponse.count || 0,
        totalWalletTopups,
        revenue
      });

      console.log('Admin data fetched successfully');
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: `Failed to fetch data: ${error}`,
        variant: "destructive",
      });
    }
  };

  const markNotificationsAsRead = async () => {
    if (notifications.length === 0) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);
    
    await fetchData();
  };

  const handleInquiryAction = async (action: 'approve' | 'dismiss') => {
    if (!selectedInquiry) return;

    const updates: any = {
      status: action === 'approve' ? 'approved' : 'dismissed',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updates.supplier_quote = supplierQuote;
      updates.admin_feedback = adminFeedback;
    }

    const { error } = await supabase
      .from('inquiries')
      .update(updates)
      .eq('id', selectedInquiry.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update inquiry",
        variant: "destructive",
      });
      return;
    }

    // Create notification for user
    await supabase
      .from('notifications')
      .insert({
        user_id: selectedInquiry.user_id,
        title: action === 'approve' ? 'Inquiry Approved' : 'Inquiry Dismissed',
        message: action === 'approve' 
          ? `Your inquiry "${selectedInquiry.item_name}" has been approved with supplier feedback.`
          : `Your inquiry "${selectedInquiry.item_name}" has been dismissed.`,
        type: action === 'approve' ? 'success' : 'warning',
        inquiry_id: selectedInquiry.id
      });

    toast({
      title: "Success",
      description: `Inquiry ${action === 'approve' ? 'approved' : 'dismissed'} successfully`,
    });

    setSelectedInquiry(null);
    setSupplierQuote("");
    setAdminFeedback("");
    await fetchData();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img src="/lovable-uploads/0bdcaaca-e82b-4c23-9eb4-934cd15493e9.png" alt="ChinaHub Logo" className="h-6 sm:h-8 w-auto" />
              <h1 className={`font-bold text-primary ${isMobile ? 'text-sm' : 'text-xl'}`}>
                {isMobile ? 'Admin' : 'Admin Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  size={isMobile ? "sm" : "sm"}
                  onClick={markNotificationsAsRead}
                  className="relative p-2"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></div>
                  )}
                </Button>
              </div>
              
              {/* Settings */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className={isMobile ? "p-2" : ""}>
                    <Settings className="h-4 w-4" />
                    {!isMobile && <span className="ml-2">Settings</span>}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl mx-2">
                  <DialogHeader>
                    <DialogTitle>Admin Settings</DialogTitle>
                    <DialogDescription>
                      Manage your admin account settings
                    </DialogDescription>
                  </DialogHeader>
                  {user && <ProfileSettings user={user} onUpdate={fetchData} />}
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={handleSignOut} className={isMobile ? "p-2" : ""}>
                <LogOut className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Sign Out</span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInquiries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInquiries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{stats.revenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inquiries" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 gap-1 h-auto py-1' : 'grid-cols-5 gap-1'}`}>
            <TabsTrigger 
              value="inquiries" 
              className={`${isMobile ? 'text-xs px-2 py-2' : 'text-sm'}`}
            >
              {isMobile ? 'Inquiries' : 'Inquiries'}
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className={`${isMobile ? 'text-xs px-2 py-2' : 'text-sm'}`}
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className={`${isMobile ? 'text-xs px-2 py-2' : 'text-sm'}`}
            >
              {isMobile ? 'Plans' : 'Payment Plans'}
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className={`${isMobile ? 'text-xs px-2 py-2 col-span-3 mt-1' : 'text-sm'}`}
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className={`${isMobile ? 'text-xs px-2 py-2 col-span-3 mt-1' : 'text-sm'}`}
            >
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inquiries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Inquiries</CardTitle>
                <CardDescription>Review and process user inquiries</CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Image</TableHead>
                       <TableHead>Product</TableHead>
                       <TableHead>User</TableHead>
                       <TableHead>Quantity</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Date</TableHead>
                       <TableHead>Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {inquiries.map((inquiry) => (
                       <TableRow key={inquiry.id}>
                         <TableCell>
                           {inquiry.sample_file_url ? (
                             <img 
                               src={inquiry.sample_file_url} 
                               alt={inquiry.item_name}
                               className="w-12 h-12 object-cover rounded-md"
                             />
                           ) : (
                             <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                               <span className="text-xs text-muted-foreground">No image</span>
                             </div>
                           )}
                         </TableCell>
                         <TableCell className="font-medium">{inquiry.item_name}</TableCell>
                         <TableCell>{inquiry.profiles?.full_name || 'N/A'}</TableCell>
                         <TableCell>{inquiry.quantity}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(inquiry.status)}>
                            {inquiry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(inquiry.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedInquiry(inquiry);
                                  setSupplierQuote(inquiry.supplier_quote || "");
                                  setAdminFeedback(inquiry.admin_feedback || "");
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Review Inquiry</DialogTitle>
                                <DialogDescription>
                                  Product: {selectedInquiry?.item_name}
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedInquiry && (
                                <div className="space-y-4">
                                  <div>
                                    <strong>Description:</strong>
                                    <p className="text-sm text-muted-foreground mt-1">{selectedInquiry.description}</p>
                                  </div>
                                  
                                  <div>
                                    <strong>Quantity:</strong> {selectedInquiry.quantity}
                                  </div>

                                  {selectedInquiry.sample_file_url && (
                                    <div>
                                      <strong>Sample File:</strong>
                                      <a 
                                        href={selectedInquiry.sample_file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline ml-2"
                                      >
                                        View File
                                      </a>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <Label htmlFor="supplierQuote">Supplier Quote</Label>
                                    <Textarea
                                      id="supplierQuote"
                                      value={supplierQuote}
                                      onChange={(e) => setSupplierQuote(e.target.value)}
                                      placeholder="Enter supplier quote details..."
                                      rows={3}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="adminFeedback">Admin Feedback</Label>
                                    <Textarea
                                      id="adminFeedback"
                                      value={adminFeedback}
                                      onChange={(e) => setAdminFeedback(e.target.value)}
                                      placeholder="Enter feedback for the user..."
                                      rows={3}
                                    />
                                  </div>


                                  <div className="flex space-x-2 pt-4">
                                    <Button 
                                      onClick={() => handleInquiryAction('approve')}
                                      className="flex-1"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button 
                                      onClick={() => handleInquiryAction('dismiss')}
                                      variant="destructive"
                                      className="flex-1"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Dismiss
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentPlansManager />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationSystem isAdmin={true} currentUserId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inquiry Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Inquiries:</span>
                      <span className="font-medium">{stats.totalInquiries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Reviews:</span>
                      <span className="font-medium">{stats.pendingInquiries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved Quotes:</span>
                      <span className="font-medium">{stats.approvedQuotes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <span className="font-medium">{stats.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wallet Top-ups:</span>
                      <span className="font-medium">{stats.totalWalletTopups}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium">₦{stats.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;