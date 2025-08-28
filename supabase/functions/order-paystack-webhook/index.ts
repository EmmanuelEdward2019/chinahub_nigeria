import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature
    const expectedSignature = await crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(Deno.env.get("PAYSTACK_SECRET_KEY") + body)
    );
    
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignatureHex) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("Received webhook event:", event.event);

    // Handle successful payment
    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const { order_stage_id, user_id, inquiry_id } = metadata;

      // Use service role key to bypass RLS
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Update order stage
      const { error: updateError } = await supabase
        .from("order_stages")
        .update({
          payment_status: "paid",
          stage: "payment_completed"
        })
        .eq("id", order_stage_id);

      if (updateError) {
        console.error("Error updating order stage:", updateError);
        throw updateError;
      }

      // Create transaction record
      await supabase
        .from("transactions")
        .insert({
          user_id: user_id,
          inquiry_id: inquiry_id,
          transaction_type: "order_payment",
          amount: event.data.amount / 100, // Convert from kobo
          currency: "NGN",
          reference: reference,
          status: "completed"
        });

      console.log(`Payment confirmed for order ${order_stage_id}`);
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in order-paystack-webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});