import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inquiryId, totalAmount, quantity, unitPrice, processingFee } = await req.json();

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

    // Create Paystack payment
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: totalAmount * 100, // Convert to kobo
        currency: "NGN",
        reference: `ORDER-${inquiryId}-${Date.now()}`,
        callback_url: `${req.headers.get("origin")}/order-payment-success`,
        metadata: {
          inquiry_id: inquiryId,
          user_id: user.id,
          quantity: quantity,
          unit_price: unitPrice,
          processing_fee: processingFee,
          payment_type: 'order_payment'
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(paystackData.message || "Payment initialization failed");
    }

    // Create pending transaction record
    await supabaseClient
      .from("transactions")
      .insert({
        user_id: user.id,
        inquiry_id: inquiryId,
        transaction_type: 'order_payment',
        amount: totalAmount * 100, // store in kobo to match Paystack
        currency: 'NGN',
        status: 'pending',
        reference: paystackData.data.reference,
        payment_method: 'paystack'
      });

    return new Response(JSON.stringify({ 
      success: true, 
      paymentUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in process-order-payment function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});