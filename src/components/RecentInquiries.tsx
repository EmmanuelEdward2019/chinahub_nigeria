import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, DollarSign, Search, Package } from "lucide-react";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Inquiry {
  id: string;
  item_name: string;
  description: string;
  status: string;
  created_at: string;
  quantity: number;
  supplier_quote?: string;
  admin_feedback?: string;
  processing_fee_naira?: number;
  processing_fee_dollar?: number;
  quote_confirmed_at?: string;
  quote_payment_processed?: boolean;
  order_stage_id?: string;
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

interface RecentInquiriesProps {
  userId: string;
  currency: "NGN" | "USD";
  orderStages: OrderStage[];
  onViewQuote: (inquiry: Inquiry) => void;
}

const RecentInquiries = ({ userId, currency, orderStages, onViewQuote }: RecentInquiriesProps) => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const inquiriesPerPage = 10;

  useEffect(() => {
    fetchInquiries();
  }, [userId, currentPage, searchTerm]);

  const fetchInquiries = async () => {
    try {
      let query = supabase
        .from('inquiries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`item_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * inquiriesPerPage, currentPage * inquiriesPerPage - 1);

      if (error) throw error;
      setInquiries(data || []);
      setTotalInquiries(count || 0);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, curr: "NGN" | "USD") => {
    const value = curr === "NGN" ? amount / 100 : amount / 100;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Inquiries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Recent Inquiries
        </CardTitle>
        <CardDescription>
          Your sourcing requests and their current status
        </CardDescription>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search inquiries by name, description, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {inquiries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? `No inquiries found matching "${searchTerm}"` : "No inquiries found"}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {inquiries.map((inquiry) => {
                const orderStage = orderStages.find(os => os.inquiry_id === inquiry.id);
                return (
                  <div key={inquiry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{inquiry.item_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {inquiry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inquiry.created_at).toLocaleDateString()} • Qty: {inquiry.quantity?.toLocaleString()}
                      </p>
                      {inquiry.status === 'pending' && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          Awaiting admin review (3-5 days)
                        </p>
                      )}
                      {inquiry.supplier_quote && inquiry.status === 'approved' && !inquiry.quote_payment_processed && !orderStage && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs p-0 h-auto mt-1 text-green-600"
                          onClick={() => onViewQuote(inquiry)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          View Quote & Confirm
                        </Button>
                      )}
                      {inquiry.supplier_quote && inquiry.status === 'approved' && inquiry.quote_payment_processed && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs p-0 h-auto mt-1"
                          onClick={() => onViewQuote(inquiry)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          View Quote
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={getStatusColor(inquiry.status)}>
                        {inquiry.status}
                      </Badge>
                      {inquiry.processing_fee_naira && inquiry.status === 'approved' && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(
                            currency === "NGN" ? inquiry.processing_fee_naira : (inquiry.processing_fee_dollar || 0),
                            currency
                          )}
                          {inquiry.quote_payment_processed && (
                            <span className="ml-1 text-green-600">✓ Paid</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalInquiries > inquiriesPerPage && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        disabled={currentPage === 1}
                        className="h-10 px-4 py-2"
                      >
                        Previous
                      </Button>
                    </PaginationItem>

                    {Array.from({ length: Math.ceil(totalInquiries / inquiriesPerPage) }, (_, i) => i + 1).map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <Button
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-10 w-10"
                        >
                          {pageNum}
                        </Button>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (currentPage < Math.ceil(totalInquiries / inquiriesPerPage)) setCurrentPage(currentPage + 1);
                        }}
                        disabled={currentPage === Math.ceil(totalInquiries / inquiriesPerPage)}
                        className="h-10 px-4 py-2"
                      >
                        Next
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentInquiries;