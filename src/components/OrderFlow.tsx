import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ShoppingCart, CreditCard, MessageSquare, Package, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Inquiry {
  id: string;
  item_name: string;
  description?: string;
  quantity: number;
  status: string;
  supplier_quote?: string;
  admin_feedback?: string;
  order_stage_id?: string;
  unit_price?: number;
  processing_fee?: number;
  admin_pricing_currency?: string;
}

interface OrderStage {
  id: string;
  stage: string;
  quoted_amount?: number;
  quoted_currency?: string;
  admin_notes?: string;
  payment_reference?: string;
  payment_status: string;
}

interface OrderFlowProps {
  inquiry: Inquiry;
  orderStage?: OrderStage;
  onUpdate: () => void;
}

export const OrderFlow = ({ inquiry, orderStage, onUpdate }: OrderFlowProps) => {
  const [productImages, setProductImages] = useState<File[]>([]);
  const [confirmedQuantity, setConfirmedQuantity] = useState(inquiry.quantity || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleProceedWithOrder = async () => {
    if (productImages.length === 0) {
      toast({
        title: "Images required",
        description: "Please attach product images to proceed with the order",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload images
      const uploadedImages = [];
      for (const image of productImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user?.id}/orders/${inquiry.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('samples')
          .upload(fileName, image);

        if (uploadError) {
          throw uploadError;
        }

        uploadedImages.push({
          url: fileName,
          name: image.name,
          size: image.size
        });
      }

      // Create order stage directly (client-side)
      const { data: orderStage, error: insertError } = await supabase
        .from('order_stages')
        .insert({
          inquiry_id: inquiry.id,
          user_id: user.id,
          stage: 'awaiting_admin_quote',
          product_images: uploadedImages,
          confirmed_quantity: confirmedQuantity
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Link inquiry to order stage
      await supabase
        .from('inquiries')
        .update({ order_stage_id: orderStage.id })
        .eq('id', inquiry.id);

      toast({
        title: "Order submitted successfully",
        description: "Your order has been submitted. The admin will provide a quote within 3-5 business days.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error submitting order:', error); 
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderPayment = async () => {
    if (!inquiry.unit_price || !inquiry.processing_fee) return;
    
    setIsLoading(true);
    const totalAmount = (inquiry.unit_price * confirmedQuantity) + inquiry.processing_fee;

    try {
      const { data, error } = await supabase.functions.invoke('process-order-payment', {
        body: {
          inquiryId: inquiry.id,
          totalAmount,
          quantity: confirmedQuantity,
          unitPrice: inquiry.unit_price,
          processingFee: inquiry.processing_fee
        }
      });

      if (error) throw error;

      // Open payment in new tab
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
      }

      toast({
        title: "Payment Initiated",
        description: "Complete your payment in the new window to proceed with your order.",
      });

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!orderStage?.quoted_amount) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-order', {
        body: {
          action: 'create_payment',
          orderStageId: orderStage.id,
          quotedAmount: orderStage.quoted_amount
        }
      });

      if (error) throw error;

      // Open payment in new tab
      window.open(data.paymentUrl, '_blank');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStageDisplay = (stage: string) => {
    switch (stage) {
      case 'pending_user_confirmation':
        return { text: 'Waiting for your confirmation', color: 'bg-yellow-100 text-yellow-800' };
      case 'awaiting_admin_quote':
        return { text: 'Awaiting admin quote', color: 'bg-blue-100 text-blue-800' };
      case 'pending_payment':
        return { text: 'Payment required', color: 'bg-orange-100 text-orange-800' };
      case 'payment_completed':
        return { text: 'Payment completed', color: 'bg-green-100 text-green-800' };
      case 'order_delivered':
      case 'delivered':
      case 'Delivered/Completed':
      case 'delivered/completed':
        return { text: 'Order delivered', color: 'bg-green-100 text-green-800' };
      case 'processing':
      case 'Processing':
        return { text: 'Processing', color: 'bg-purple-100 text-purple-800' };
      case 'shipped':
      case 'Shipped':
        return { text: 'Shipped', color: 'bg-indigo-100 text-indigo-800' };
      case 'canceled':
      case 'Canceled':
        return { text: 'Canceled', color: 'bg-red-100 text-red-800' };
      case 'refunded':
      case 'Refunded':
        return { text: 'Refunded', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: stage, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Show order confirmation modal for approved inquiries with pricing
  if (inquiry.status === 'approved' && inquiry.unit_price && inquiry.processing_fee && !orderStage) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Pay and Process Order
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Pay and Process Order</DialogTitle>
            <DialogDescription>
              Confirm your order details and proceed with payment via Paystack
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Order Summary</h4>
              <div className="space-y-2">
                <p><strong>Product:</strong> {inquiry.item_name}</p>
                <p><strong>Unit Price:</strong> ₦{inquiry.unit_price?.toLocaleString()}</p>
                <div className="flex items-center gap-4">
                  <Label htmlFor="quantity">Quantity:</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={confirmedQuantity}
                    onChange={(e) => setConfirmedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-24"
                  />
                </div>
                <p><strong>Processing Fee:</strong> ₦{inquiry.processing_fee?.toLocaleString()}</p>
                <div className="border-t pt-2 mt-3">
                  <p className="text-lg font-bold text-blue-900">
                    <strong>Total: ₦{((inquiry.unit_price * confirmedQuantity) + inquiry.processing_fee).toLocaleString()}</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    (₦{inquiry.unit_price?.toLocaleString()} × {confirmedQuantity}) + ₦{inquiry.processing_fee?.toLocaleString()} processing fee
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Feedback Display */}
            {inquiry.admin_feedback && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Admin Feedback:</h4>
                <p className="text-sm text-gray-700">{inquiry.admin_feedback}</p>
              </div>
            )}

            <Button 
              onClick={handleOrderPayment} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Processing Payment..." : `Pay ₦${((inquiry.unit_price * confirmedQuantity) + inquiry.processing_fee).toLocaleString()} and Process Order`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show proceed with order button for approved inquiries without pricing yet
  if (inquiry.status === 'approved' && !inquiry.unit_price && !orderStage) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Proceed with Order
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-auto scrollbar-black">
          <DialogHeader>
            <DialogTitle>Confirm Your Order</DialogTitle>
            <DialogDescription>
              Please reattach product images and confirm quantity as a final confirmation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-lg">{inquiry.item_name}</h3>
              <p className="text-sm text-muted-foreground">{inquiry.description || "No description available"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={confirmedQuantity}
                onChange={(e) => setConfirmedQuantity(parseInt(e.target.value))}
                min="1"
              />
            </div>

            <div>
              <Label>Product Images *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 mt-2">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <Label htmlFor="order-image-upload" className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80">
                      Click to upload product images
                    </span>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG up to 10MB each (Required)
                  </p>
                </div>
                <Input
                  id="order-image-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setProductImages(prev => [...prev, ...files]);
                  }}
                  className="hidden"
                  multiple
                />
                
                {productImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected images:</p>
                    {productImages.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                        <span className="text-sm text-primary">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductImages(prev => prev.filter((_, i) => i !== index))}
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

            <Button 
              onClick={handleProceedWithOrder} 
              className="w-full"
              disabled={isLoading || productImages.length === 0}
            >
              {isLoading ? "Submitting..." : "Confirm Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show order stage information if order stage exists
  if (orderStage) {
    const stageDisplay = getStageDisplay(orderStage.stage);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Status
          </CardTitle>
          <CardDescription>
            Track your order progress for {inquiry.item_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Current Status:</span>
            <Badge className={stageDisplay.color}>
              {stageDisplay.text}
            </Badge>
          </div>

          {orderStage.stage === 'pending_payment' && orderStage.quoted_amount && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Quote Ready</h4>
                <p className="text-blue-800 text-sm mt-1">
                  Amount: ₦{orderStage.quoted_amount.toLocaleString()}
                </p>
                {orderStage.admin_notes && (
                  <p className="text-blue-800 text-sm mt-2">
                    <strong>Admin Notes:</strong> {orderStage.admin_notes}
                  </p>
                )}
              </div>
              
              <Button onClick={handlePayment} disabled={isLoading} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                {isLoading ? "Processing..." : "Proceed with Payment"}
              </Button>
            </div>
          )}

          {orderStage.stage === 'payment_completed' && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-900">
                <CheckCircle className="h-5 w-5" />
                <h4 className="font-medium">Payment Successful</h4>
              </div>
              <p className="text-green-800 text-sm mt-1">
                Your order has been confirmed. The admin will provide updates on delivery.
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-sm">Contact support for updates:</p>
                <a
                  href="https://wa.me/8619589456744"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800"
                >
                  <MessageSquare className="h-4 w-4" />
                  +86 19589456744
                </a>
                <span className="mx-2 text-gray-400">|</span>
                <a
                  href="https://wa.me/2348133628713"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800"
                >
                  <MessageSquare className="h-4 w-4" />
                  +234 8133628713
                </a>
              </div>
            </div>
          )}

          {orderStage.stage === 'order_delivered' && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-900">
                <CheckCircle className="h-5 w-5" />
                <h4 className="font-medium">Order Delivered</h4>
              </div>
              <p className="text-green-800 text-sm mt-1">
                Your order has been successfully delivered. Thank you for using ChinaHub!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
};