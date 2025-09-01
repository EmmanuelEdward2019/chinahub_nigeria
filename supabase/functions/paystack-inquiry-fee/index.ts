import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inquiry_id, currency } = await req.json();

    if (!inquiry_id) {
      throw new Error("inquiry_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey || !paystackSecret) {
      throw new Error("Missing required environment configuration");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch inquiry to get user and validate existence
    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id, user_id")
      .eq("id", inquiry_id)
      .single();

    if (inquiryError || !inquiry) {
      throw new Error("Inquiry not found");
    }

    // Get user email
    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(inquiry.user_id);
    if (userError || !userResult?.user?.email) {
      throw new Error("User email not found");
    }

    // Determine fee from settings (stored in kobo/cents)
    const { data: settings } = await supabase
      .from("inquiry_settings")
      .select("default_fee_naira, default_fee_dollar")
      .maybeSingle();

    const isNGN = (currency || "NGN") === "NGN";
    const amountInKobo = isNGN
      ? (settings?.default_fee_naira ?? 100000) // default ₦1000 in kobo
      : (settings?.default_fee_dollar ?? 200) * 100; // default $2 in cents

    // Create a transaction record for this inquiry fee
    const reference = `inqfee_${inquiry_id}_${Date.now()}`;
    const { data: transaction, error: txnError } = await supabase
      .from("transactions")
      .insert({
        user_id: inquiry.user_id,
        inquiry_id: inquiry_id,
        amount: amountInKobo,
        currency: isNGN ? "NGN" : "USD",
        transaction_type: "inquiry_fee",
        status: "pending",
        reference,
      })
      .select()
      .single();

    if (txnError) {
      throw new Error("Failed to create transaction record");
    }

    // Initialize Paystack
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userResult.user.email,
        amount: amountInKobo, // already in kobo
        currency: "NGN",
        reference,
        callback_url: `${req.headers.get("origin")}/inquiry-success`,
        metadata: {
          user_id: inquiry.user_id,
          inquiry_id,
          transaction_id: transaction.id,
          transaction_type: "inquiry_fee",
        },
      }),
    });

    const initData = await initRes.json();
    if (!initData.status) {
      throw new Error(initData.message || "Failed to initialize Paystack payment");
    }

    return new Response(
      JSON.stringify({
        authorization_url: initData.data.authorization_url,
        access_code: initData.data.access_code,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in paystack-inquiry-fee:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Payment initialization failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
