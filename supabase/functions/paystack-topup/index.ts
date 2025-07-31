import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency, user_id, redirect_url } = await req.json();

    if (!amount || !user_id) {
      throw new Error('Amount and user_id are required');
    }

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id);
    
    if (userError || !user?.email) {
      throw new Error('User email not found');
    }

    // Convert amount to kobo (Paystack uses kobo for NGN)
    const amountInKobo = Math.round(amount * 100);
    
    console.log('Processing payment request:', {
      amount,
      amountInKobo,
      currency,
      user_id,
      email: user.email
    });

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        amount: amountInKobo,
        currency,
        transaction_type: 'wallet_topup',
        status: 'pending',
        reference: `topup_${user_id}_${Date.now()}`
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      throw new Error('Failed to create transaction record');
    }

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: 'NGN',
        reference: transaction.reference,
        callback_url: `${redirect_url}?transaction_id=${transaction.id}`,
        metadata: {
          user_id,
          transaction_id: transaction.id,
          transaction_type: 'wallet_topup'
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization error:', paystackData);
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    console.log('Paystack payment initialized:', {
      reference: transaction.reference,
      amount: amountInKobo,
      user_id
    });

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: transaction.reference
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in paystack-topup function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Payment initialization failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});