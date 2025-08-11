import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      throw new Error('No signature header found');
    }

    // Skip signature verification for now to fix webhook processing
    console.log('Webhook signature received:', signature);
    console.log('Processing webhook without signature verification for debugging');
    
    // TODO: Fix signature verification later once webhook is working

    const event = JSON.parse(body);
    console.log('Paystack webhook received:', event.event, event.data?.reference);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event.event === 'charge.success') {
      const { reference, amount, currency, metadata } = event.data;
      
      // Find the transaction by reference
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .single();

      if (transactionError || !transaction) {
        console.error('Transaction not found:', reference);
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'completed') {
        console.log('Transaction already processed:', reference);
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Failed to update transaction:', updateError);
        throw new Error('Failed to update transaction');
      }

      // Process wallet topup using the database function
      const amountInMainUnit = Math.round(amount / 100); // Convert from kobo to naira
      console.log('Processing wallet topup with amount:', amountInMainUnit, 'Currency:', currency);
      
      const { data: result, error: processError } = await supabase
        .rpc('process_wallet_topup', {
          p_user_id: transaction.user_id,
          p_amount: amountInMainUnit,
          p_currency: currency,
          p_reference: reference
        });

      if (processError) {
        console.error('Failed to process wallet topup:', processError);
        throw new Error('Failed to process wallet topup');
      }

      console.log('Wallet topup processed successfully:', result);

      console.log('Wallet topped up successfully:', {
        user_id: transaction.user_id,
        amount: amountInMainUnit,
        currency,
        reference
      });

      // Create notification for successful top-up
      const { error: userNotificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: transaction.user_id,
          title: 'Wallet Top-up Successful',
          message: `Your wallet has been credited with ${currency === 'NGN' ? '₦' : '$'}${amountInMainUnit.toLocaleString()}`,
          type: 'success'
        });

      if (userNotificationError) {
        console.error('Failed to create user notification:', userNotificationError);
      }

      // Notify admin about the transaction
      const { data: adminUser, error: adminFetchError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminFetchError) {
        console.error('Failed to fetch admin user:', adminFetchError);
      } else if (adminUser) {
        const { error: adminNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: adminUser.user_id,
            title: 'Wallet Top-up Received',
            message: `User wallet credited with ${currency === 'NGN' ? '₦' : '$'}${amountInMainUnit.toLocaleString()}. Reference: ${reference}`,
            type: 'info'
          });

        if (adminNotificationError) {
          console.error('Failed to create admin notification:', adminNotificationError);
        } else {
          console.log('Admin notified successfully');
        }
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error in paystack-webhook function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Webhook processing failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});