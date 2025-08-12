import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function processWalletTopup(supabase: any, transaction: any, amount: number, currency: string, reference: string) {
  console.log('Starting wallet topup process...');
  
  console.log(`Processing wallet topup for user ${transaction.user_id}: ${amount} ${currency}`);
  
  const { data: result, error: processError } = await supabase
    .rpc('process_wallet_topup', {
      p_user_id: transaction.user_id,
      p_amount: amount,
      p_currency: currency,
      p_reference: reference
    });

  if (processError) {
    console.error('Wallet topup failed:', processError);
    throw processError;
  }

  console.log('Wallet topup completed successfully:', result);
  
  // Verify wallet balance was updated
  const { data: wallet } = await supabase
    .from('wallets')
    .select('naira_balance, dollar_balance')
    .eq('user_id', transaction.user_id)
    .single();
    
  console.log('Current wallet balance after topup:', wallet);
  return result;
}

async function createNotifications(supabase: any, userId: string, amount: number, currency: string, reference: string) {
  console.log('Creating notifications...');
  
  // User notification
  const { error: userNotifError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: 'Wallet Top-up Successful',
      message: `Your wallet has been credited with ${currency === 'NGN' ? '₦' : '$'}${amount.toLocaleString()}`,
      type: 'success'
    });

  if (userNotifError) {
    console.error('User notification failed:', userNotifError);
  }

  // Admin notification
  const { data: adminUser } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  if (adminUser) {
    const { error: adminNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: adminUser.user_id,
        title: 'Wallet Top-up Received',
        message: `User wallet credited with ${currency === 'NGN' ? '₦' : '$'}${amount.toLocaleString()}. Reference: ${reference}`,
        type: 'info'
      });

    if (adminNotifError) {
      console.error('Admin notification failed:', adminNotifError);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Paystack webhook received');
    
    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse webhook data
    const body = await req.text();
    const event = JSON.parse(body);
    
    console.log('Event type:', event.event);
    console.log('Reference:', event.data?.reference);

    if (event.event !== 'charge.success') {
      console.log('Ignoring non-success event');
      return new Response('OK', { headers: corsHeaders });
    }

    const { reference, amount, currency } = event.data;
    const amountInMainUnit = Math.round(amount / 100); // Convert from kobo to naira
    console.log(`Processing payment: ${amountInMainUnit} ${currency} for reference ${reference}`);
    
    // Validate amount is reasonable (between ₦10 and ₦10,000,000)
    if (amountInMainUnit < 10 || amountInMainUnit > 10000000) {
      console.error('Invalid payment amount:', amountInMainUnit);
      throw new Error('Invalid payment amount');
    }

    // Find transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (transactionError) {
      console.error('Transaction query error:', transactionError);
      throw new Error('Database error');
    }

    if (!transaction) {
      console.error('Transaction not found:', reference);
      throw new Error('Transaction not found');
    }

    if (transaction.status === 'completed') {
      console.log('Transaction already processed');
      return new Response('OK', { headers: corsHeaders });
    }

    // Process topup
    await processWalletTopup(supabase, transaction, amountInMainUnit, currency, reference);
    
    // Create notifications
    await createNotifications(supabase, transaction.user_id, amountInMainUnit, currency, reference);

    console.log('Webhook processing completed successfully');
    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Webhook processing failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});