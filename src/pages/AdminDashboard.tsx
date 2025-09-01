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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import TransactionHistory from "@/components/TransactionHistory";
import NotificationSystem from "@/components/NotificationSystem";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface OrderStage {
  id: string;
  inquiry_id: string;
  user_id: string;
  stage: string;
  quoted_amount?: number;
  quoted_currency?: string;
  admin_notes?: string;
  payment_reference?: string;
  payment_status: string;
  product_images?: any[];
  confirmed_quantity?: number;
  created_at: string;
  updated_at: string;
}

interface Inquiry {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  status: string;
  created_at: string;
  user_id: string;
  sample_file_url?: string;
  sample_files?: Array<{
    url: string;
    name: string;
    size: number;
  }>;
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
  const [feedbackImages, setFeedbackImages] = useState<File[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentInquiriesPage, setCurrentInquiriesPage] = useState(1);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [orderStages, setOrderStages] = useState<OrderStage[]>([]);
  const [selectedOrderStage, setSelectedOrderStage] = useState<OrderStage | null>(null);
  const [quotedAmount, setQuotedAmount] = useState('');
  const [orderAdminNotes, setOrderAdminNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');
  const inquiriesPerPage = 10;
  
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

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [currentInquiriesPage, isAdmin]);

  const fetchData = async () => {
    try {
      console.log('Fetching admin data...');
      
      // Fetch only PAID inquiries to ensure admins see inquiries after successful payment only
      const inquiriesTest = await supabase
        .from('inquiries')
        .select('*')
        .eq('payment_status', 'paid')
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

      // Get total count for pagination
      setTotalInquiries(inquiriesTest.data?.length || 0);

      // Fetch paginated inquiries with profiles
      const startIndex = (currentInquiriesPage - 1) * inquiriesPerPage;
      const endIndex = startIndex + inquiriesPerPage;
      const paginatedInquiries = inquiriesTest.data?.slice(startIndex, endIndex) || [];

      const inquiriesWithProfiles = [];
      for (const inquiry of paginatedInquiries) {
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

      // Fetch order stages with inquiry and user details
      const { data: orderStagesData, error: orderStagesError } = await supabase
        .from('order_stages')
        .select(`
          *,
          inquiries:inquiry_id (
            id,
            item_name,
            description,
            quantity,
            user_id,
            profiles:user_id (
              full_name,
              phone,
              country
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (orderStagesError) {
        console.error('Error fetching order stages:', orderStagesError);
      } else {
        console.log('Order stages:', orderStagesData);
        setOrderStages(orderStagesData?.map(stage => ({
          ...stage,
          product_images: Array.isArray(stage.product_images) ? stage.product_images : []
        })) || []);
      }

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
          .select('amount, currency, transaction_type')
          .eq('transaction_type', 'wallet_topup')
          .eq('status', 'completed')
      ]);
      
      setNotifications(notificationsResponse.data || []);

      const totalWalletTopups = walletDataResponse.data?.length || 0;
      
      // Calculate actual revenue from completed wallet top-ups only
      const revenue = walletDataResponse.data?.reduce((sum, transaction) => {
        // Only count wallet top-ups, not inquiry fees
        if (transaction.transaction_type === 'wallet_topup') {
          if (transaction.currency === 'NGN') {
            return sum + transaction.amount;
          } else if (transaction.currency === 'USD') {
            // Convert USD to Naira for display (approximate rate: 1 USD = 1600 NGN)
            return sum + (transaction.amount * 1600);
          }
        }
        return sum;
      }, 0) || 0;

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
      // Upload feedback images if any
      let uploadedImages = [];
      if (feedbackImages.length > 0) {
        for (const image of feedbackImages) {
          const fileExt = image.name.split('.').pop();
          const fileName = `feedback/${selectedInquiry.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('samples')
            .upload(fileName, image);

          if (uploadError) {
            console.error('Error uploading feedback image:', uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('samples')
              .getPublicUrl(fileName);

            uploadedImages.push({
              url: publicUrl,
              name: image.name,
              size: image.size
            });
          }
        }
      }

      updates.supplier_quote = supplierQuote;
      updates.admin_feedback = adminFeedback;
      if (uploadedImages.length > 0) {
        updates.admin_feedback += `\n\n[Attached Images: ${uploadedImages.length} files]`;
        // You could also store the image URLs in a separate field if needed
        updates.admin_feedback_images = uploadedImages;
      }
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
    setFeedbackImages([]);
    await fetchData();
  };

  const handleOrderQuote = async () => {
    if (!selectedOrderStage || !quotedAmount) {
      toast({
        title: "Error",
        description: "Please enter a quoted amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('process-order', {
        body: {
          action: 'admin_quote',
          orderStageId: selectedOrderStage.id,
          quotedAmount: parseFloat(quotedAmount),
          adminNotes: orderAdminNotes
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote sent to user successfully",
      });

      setSelectedOrderStage(null);
      setQuotedAmount('');
      setOrderAdminNotes('');
      await fetchData();
    } catch (error) {
      console.error('Error sending quote:', error);
      toast({
        title: "Error",
        description: "Failed to send quote",
        variant: "destructive",
      });
    }
  };

  const handleOrderStatusUpdate = async (orderStageId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_stages')
        .update({ stage: newStatus })
        .eq('id', orderStageId);

      if (error) throw error;

      if (newStatus === 'order_delivered' || newStatus === 'delivered' || newStatus === 'Delivered/Completed') {
        await supabase.functions.invoke('process-order', {
          body: {
            action: 'mark_delivered',
            orderStageId: orderStageId
          }
        });
      }

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      await fetchData();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
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
      <Navigation user={user} />
      
      {/* Admin-specific header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className={`font-bold text-primary ${isMobile ? 'text-sm' : 'text-xl'}`}>
                {isMobile ? 'Admin Dashboard' : 'Admin Dashboard'}
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
        {/* ... keep existing code (Stats Cards and Tabs sections) */}
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
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 gap-1 h-auto py-1' : 'grid-cols-6 gap-1'}`}>
            <TabsTrigger 
              value="inquiries" 
              className={`${isMobile ? 'text-xs px-2 py-2' : 'text-sm'}`}
            >
              {isMobile ? 'Inquiries' : 'Inquiries'}
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className={`${isMobile ? 'text-xs px-2 py-2' : 'text-sm'}`}
            >
              Orders
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
                            {inquiry.sample_files && inquiry.sample_files.length > 0 ? (
                              <img 
                                src={`https://enxrledmmhrmbxifnjbu.supabase.co/storage/v1/object/public/samples/${inquiry.sample_files[0].url}`}
                                alt={inquiry.item_name}
                                className="w-12 h-12 object-cover rounded-md"
                                 onError={(e) => {
                                   (e.currentTarget as HTMLImageElement).style.display = 'none';
                                   const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                   if (nextElement) nextElement.style.display = 'flex';
                                 }}
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
                            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0">
                              <div className="shrink-0 border-b px-6 py-4">
                                <DialogHeader>
                                  <DialogTitle>Review Inquiry</DialogTitle>
                                  <DialogDescription>
                                    Product: {selectedInquiry?.item_name}
                                  </DialogDescription>
                                </DialogHeader>
                              </div>
                              
                              {selectedInquiry && (
                                <>
                                  <ScrollArea className="flex-1 px-6 overflow-auto scrollbar-black pr-2" style={{ height: 'calc(90vh - 200px)' }}>
                                    <div className="space-y-6 py-6">
                                    <div>
                                      <strong>Description:</strong>
                                      <p className="text-sm text-muted-foreground mt-1">{selectedInquiry.description}</p>
                                    </div>
                                    
                                    <div>
                                      <strong>Quantity:</strong> {selectedInquiry.quantity}
                                    </div>

                                     {selectedInquiry.sample_files && selectedInquiry.sample_files.length > 0 && (
                                       <div>
                                         <strong>Sample Files:</strong>
                                         <div className="mt-2 space-y-2">
                                           {selectedInquiry.sample_files.map((file, index) => (
                                             <div key={index} className="flex items-center gap-2">
                                               <a 
                                                 href={`https://enxrledmmhrmbxifnjbu.supabase.co/storage/v1/object/public/samples/${file.url}`}
                                                 target="_blank" 
                                                 rel="noopener noreferrer"
                                                 className="text-primary hover:underline"
                                               >
                                                 {file.name}
                                               </a>
                                               <span className="text-xs text-muted-foreground">
                                                 ({Math.round(file.size / 1024)} KB)
                                               </span>
                                             </div>
                                           ))}
                                         </div>
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
                                    
                                    {/* Image Upload Section */}
                                    <div>
                                      <Label htmlFor="feedbackImages">Attach Product Images (Optional)</Label>
                                      <div className="border-2 border-dashed border-border rounded-lg p-4">
                                        <div className="text-center">
                                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                          <Label htmlFor="feedback-image-upload" className="cursor-pointer">
                                            <span className="text-primary hover:text-primary/80">
                                              Click to upload product images
                                            </span>
                                          </Label>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            JPG, PNG up to 10MB each (Max 5 images)
                                          </p>
                                        </div>
                                        <Input
                                          id="feedback-image-upload"
                                          type="file"
                                          accept=".jpg,.jpeg,.png"
                                          onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            
                                            // Check file size and count
                                            for (const file of files) {
                                              if (file.size > 10 * 1024 * 1024) {
                                                toast({
                                                  title: "File too large",
                                                  description: `File "${file.name}" is too large. Please upload files smaller than 10MB`,
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                            }
                                            
                                            if (feedbackImages.length + files.length > 5) {
                                              toast({
                                                title: "Too many files",
                                                description: "You can upload a maximum of 5 images",
                                                variant: "destructive",
                                              });
                                              return;
                                            }
                                            
                                            setFeedbackImages(prev => [...prev, ...files]);
                                          }}
                                          className="hidden"
                                          multiple
                                        />
                                        
                                        {feedbackImages.length > 0 && (
                                          <div className="mt-4 space-y-2">
                                            <p className="text-sm font-medium">Selected images:</p>
                                            {feedbackImages.map((file, index) => (
                                              <div key={index} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                                                <span className="text-sm text-primary">{file.name}</span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => setFeedbackImages(prev => prev.filter((_, i) => i !== index))}
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
                                    </div>
                                  </ScrollArea>
                                  
                                  <div className="shrink-0 border-t px-6 py-4">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                      <Button 
                                        onClick={() => handleInquiryAction('approve')}
                                        className="flex-1 min-h-[44px]"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                      </Button>
                                      <Button 
                                        onClick={() => handleInquiryAction('dismiss')}
                                        variant="destructive"
                                        className="flex-1 min-h-[44px]"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Dismiss
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                 </Table>

                 {/* Inquiries Pagination */}
                 {totalInquiries > inquiriesPerPage && (
                   <div className="mt-4">
                     <Pagination>
                       <PaginationContent>
                         <PaginationItem>
                           <PaginationPrevious 
                             href="#"
                             onClick={(e) => {
                               e.preventDefault();
                               if (currentInquiriesPage > 1) {
                                 setCurrentInquiriesPage(currentInquiriesPage - 1);
                               }
                             }}
                             className={currentInquiriesPage === 1 ? "pointer-events-none opacity-50" : ""}
                           />
                         </PaginationItem>
                         
                         {Array.from({ length: Math.ceil(totalInquiries / inquiriesPerPage) }, (_, i) => i + 1).map((pageNum) => (
                           <PaginationItem key={pageNum}>
                             <PaginationLink
                               href="#"
                               onClick={(e) => {
                                 e.preventDefault();
                                 setCurrentInquiriesPage(pageNum);
                               }}
                               isActive={currentInquiriesPage === pageNum}
                             >
                               {pageNum}
                             </PaginationLink>
                           </PaginationItem>
                         ))}
                         
                         <PaginationItem>
                           <PaginationNext 
                             href="#"
                             onClick={(e) => {
                               e.preventDefault();
                               if (currentInquiriesPage < Math.ceil(totalInquiries / inquiriesPerPage)) {
                                 setCurrentInquiriesPage(currentInquiriesPage + 1);
                               }
                             }}
                             className={currentInquiriesPage === Math.ceil(totalInquiries / inquiriesPerPage) ? "pointer-events-none opacity-50" : ""}
                           />
                         </PaginationItem>
                       </PaginationContent>
                     </Pagination>
                   </div>
                 )}
               </CardContent>
             </Card>
            </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Manage user orders, quotes, and order status</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderStages.map((orderStage) => (
                      <TableRow key={orderStage.id}>
                        <TableCell className="font-mono text-sm">
                          {orderStage.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {(orderStage as any).inquiries?.item_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {(orderStage as any).inquiries?.profiles?.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{orderStage.confirmed_quantity || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={
                            orderStage.stage === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            orderStage.stage === 'processing' || orderStage.stage === 'Processing' ? 'bg-purple-100 text-purple-800' :
                            orderStage.stage === 'shipped' || orderStage.stage === 'Shipped' ? 'bg-indigo-100 text-indigo-800' :
                            orderStage.stage === 'delivered' || orderStage.stage === 'order_delivered' || orderStage.stage === 'Delivered/Completed' ? 'bg-green-100 text-green-800' :
                            orderStage.stage === 'canceled' || orderStage.stage === 'Canceled' ? 'bg-red-100 text-red-800' :
                            orderStage.stage === 'refunded' || orderStage.stage === 'Refunded' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {orderStage.stage}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            orderStage.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            orderStage.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {orderStage.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(orderStage.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {orderStage.stage === 'awaiting_admin_quote' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedOrderStage(orderStage);
                                      setQuotedAmount(orderStage.quoted_amount?.toString() || '');
                                      setOrderAdminNotes(orderStage.admin_notes || '');
                                    }}
                                  >
                                    Quote
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-auto scrollbar-black">
                                  <DialogHeader>
                                    <DialogTitle>Provide Quote</DialogTitle>
                                    <DialogDescription>
                                      Set the order amount and notes for the user
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  {selectedOrderStage && (
                                    <div className="space-y-4">
                                      <div>
                                        <strong>Product:</strong> {(selectedOrderStage as any).inquiries?.item_name}
                                      </div>
                                      <div>
                                        <strong>Quantity:</strong> {selectedOrderStage.confirmed_quantity}
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label htmlFor="quotedAmount">Quoted Amount (₦)</Label>
                                        <Input
                                          id="quotedAmount"
                                          type="number"
                                          value={quotedAmount}
                                          onChange={(e) => setQuotedAmount(e.target.value)}
                                          placeholder="Enter amount in Naira"
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label htmlFor="orderAdminNotes">Admin Notes</Label>
                                        <Textarea
                                          id="orderAdminNotes"
                                          value={orderAdminNotes}
                                          onChange={(e) => setOrderAdminNotes(e.target.value)}
                                          placeholder="Additional notes for the user..."
                                          rows={3}
                                        />
                                      </div>
                                      
                                      <Button onClick={handleOrderQuote} className="w-full">
                                        Send Quote to User
                                      </Button>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            )}
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Status
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Order Status</DialogTitle>
                                  <DialogDescription>
                                    Change the current status of this order
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <div>
                                    <strong>Current Status:</strong> {orderStage.stage}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label>New Status</Label>
                                    <select 
                                      value={orderStatus} 
                                      onChange={(e) => setOrderStatus(e.target.value)}
                                      className="w-full p-2 border rounded"
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="Processing">Processing</option>
                                      <option value="Shipped">Shipped</option>
                                      <option value="Delivered/Completed">Delivered/Completed</option>
                                      <option value="Canceled">Canceled</option>
                                      <option value="Refunded">Refunded</option>
                                    </select>
                                  </div>
                                  
                                  <Button 
                                    onClick={() => handleOrderStatusUpdate(orderStage.id, orderStatus)}
                                    className="w-full"
                                  >
                                    Update Status
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

            {/* All Platform Transactions */}
            <TransactionHistory isAdmin={true} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;