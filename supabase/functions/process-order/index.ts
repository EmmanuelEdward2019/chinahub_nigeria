import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, orderStageId, inquiryId, quotedAmount, adminNotes, paymentReference, productImages, confirmedQuantity } = await req.json();

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      throw new Error("Invalid user");
    }
    // Handle different actions
    switch (action) {
      case "proceed_with_order":
        // User confirms they want to proceed with order
        const { data: orderStage, error: insertError } = await supabaseClient
          .from("order_stages")
          .insert({
            inquiry_id: inquiryId,
            user_id: user.id,
            stage: "awaiting_admin_quote",
            product_images: productImages || [],
            confirmed_quantity: confirmedQuantity
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update inquiry with order_stage_id
        await supabaseClient
          .from("inquiries")
          .update({ order_stage_id: orderStage.id })
          .eq("id", inquiryId);

        return new Response(JSON.stringify({ success: true, orderStage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "admin_quote":
        // Admin provides quote
        const { error: quoteError } = await supabaseClient
          .from("order_stages")
          .update({
            quoted_amount: quotedAmount,
            quoted_currency: "NGN",
            admin_notes: adminNotes,
            stage: "pending_payment"
          })
          .eq("id", orderStageId);

        if (quoteError) throw quoteError;

        // Notify user
        await supabaseClient
          .from("notifications")
          .insert({
            user_id: user.id,
            title: "Quote Ready",
            message: `Admin has provided a quote of ₦${quotedAmount.toLocaleString()}. Please review and proceed with payment.`,
            type: "info",
            inquiry_id: inquiryId
          });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "mark_delivered":
        // Admin marks order as delivered
        const { error: deliveredError } = await supabaseClient
          .from("order_stages")
          .update({
            stage: "order_delivered"
          })
          .eq("id", orderStageId);

        if (deliveredError) throw deliveredError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "create_payment":
        // Create Paystack payment
        const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
            amount: quotedAmount * 100, // Convert to kobo
            currency: "NGN",
            reference: `ORDER-${orderStageId}-${Date.now()}`,
            callback_url: `${req.headers.get("origin")}/order-payment-success`,
            metadata: {
              order_stage_id: orderStageId,
              user_id: user.id,
              inquiry_id: inquiryId
            }
          }),
        });

        const paystackData = await paystackResponse.json();

        if (!paystackData.status) {
          throw new Error(paystackData.message || "Payment initialization failed");
        }

        // Update order stage with payment reference
        await supabaseClient
          .from("order_stages")
          .update({
            payment_reference: paystackData.data.reference
          })
          .eq("id", orderStageId);

        return new Response(JSON.stringify({ 
          success: true, 
          paymentUrl: paystackData.data.authorization_url,
          reference: paystackData.data.reference
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error("Invalid action");
    }

  } catch (error) {
    console.error("Error in process-order function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});