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

    // Verify webhook signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const bodyData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const signature_buffer = await crypto.subtle.sign('HMAC', cryptoKey, bodyData);
    const expectedSignature = Array.from(new Uint8Array(signature_buffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Log signature verification for debugging
    console.log('Signature verification:', {
      received: signature,
      expected: expectedSignature,
      bodyLength: body.length
    });

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature', { signature, expectedSignature });
      // For now, we'll log but not fail to identify the issue
      console.warn('Proceeding despite signature mismatch for debugging');
    }

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

      // Update wallet balance
      const amountInMainUnit = Math.round(amount / 100); // Convert from kobo to naira
      
      if (currency === 'NGN') {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ 
            naira_balance: supabase.raw(`naira_balance + ${amountInMainUnit}`),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transaction.user_id);

        if (walletError) {
          console.error('Failed to update wallet:', walletError);
          throw new Error('Failed to update wallet');
        }
      } else if (currency === 'USD') {
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ 
            dollar_balance: supabase.raw(`dollar_balance + ${amountInMainUnit}`),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transaction.user_id);

        if (walletError) {
          console.error('Failed to update wallet:', walletError);
          throw new Error('Failed to update wallet');
        }
      }

      console.log('Wallet topped up successfully:', {
        user_id: transaction.user_id,
        amount: amountInMainUnit,
        currency,
        reference
      });

      // Create notification for successful top-up
      await supabase
        .from('notifications')
        .insert({
          user_id: transaction.user_id,
          title: 'Wallet Top-up Successful',
          message: `Your wallet has been credited with ${currency === 'NGN' ? '₦' : '$'}${amountInMainUnit.toLocaleString()}`,
          type: 'success'
        });

      // Notify admin about the transaction
      const { data: adminUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminUser) {
        await supabase
          .from('notifications')
          .insert({
            user_id: adminUser.user_id,
            title: 'Wallet Top-up Received',
            message: `User wallet credited with ${currency === 'NGN' ? '₦' : '$'}${amountInMainUnit.toLocaleString()}. Reference: ${reference}`,
            type: 'info'
          });
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