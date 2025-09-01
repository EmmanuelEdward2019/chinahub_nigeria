import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyPaystackSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    
    const computedSignature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedHex = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === computedHex;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

async function verifyTransactionWithPaystack(reference: string, paystackSecret: string): Promise<any> {
  try {
    console.log(`Verifying transaction ${reference} with Paystack...`);
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Paystack API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Paystack verification result:', result);
    
    if (!result.status || result.data.status !== 'success') {
      throw new Error('Transaction not successful on Paystack');
    }

    return result.data;
  } catch (error) {
    console.error('Paystack verification failed:', error);
    throw error;
  }
}

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
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    if (!supabaseUrl || !supabaseKey || !paystackSecret) {
      throw new Error('Missing required configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse webhook data
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    
    // CRITICAL: Verify webhook signature for security
    if (!signature) {
      console.error('Missing Paystack signature');
      throw new Error('Unauthorized: Missing signature');
    }
    
    const isValidSignature = await verifyPaystackSignature(body, signature, paystackSecret);
    if (!isValidSignature) {
      console.error('Invalid Paystack signature');
      throw new Error('Unauthorized: Invalid signature');
    }
    
    console.log('Webhook signature verified successfully');
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
    
    // CRITICAL: Verify transaction directly with Paystack before processing
    const paystackData = await verifyTransactionWithPaystack(reference, paystackSecret);
    
    // Validate amounts match between webhook and Paystack API
    const paystackAmount = Math.round(paystackData.amount / 100);
    if (paystackAmount !== amountInMainUnit) {
      console.error(`Amount mismatch: Webhook=${amountInMainUnit}, Paystack=${paystackAmount}`);
      throw new Error('Amount verification failed');
    }
    
    // Validate currency matches
    if (paystackData.currency !== currency) {
      console.error(`Currency mismatch: Webhook=${currency}, Paystack=${paystackData.currency}`);
      throw new Error('Currency verification failed');
    }
    
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
    
    // CRITICAL FIX: Convert amounts consistently - DB stores in kobo, Paystack returns in kobo
    const transactionAmountInKobo = transaction.amount;
    const paystackAmountInKobo = paystackData.amount;
    
    if (transactionAmountInKobo !== paystackAmountInKobo) {
      console.error(`Transaction amount mismatch: DB=${transactionAmountInKobo} kobo, Paystack=${paystackAmountInKobo} kobo`);
      throw new Error('Transaction amount verification failed');
    }

    // Route based on transaction type
    if (transaction.transaction_type === 'wallet_topup') {
      // Process topup - use kobo amount from transaction
      await processWalletTopup(supabase, transaction, transactionAmountInKobo, currency, reference);
      
      // Create notifications - display amount converted from kobo
      const displayAmount = Math.round(transactionAmountInKobo / 100);
      await createNotifications(supabase, transaction.user_id, displayAmount, currency, reference);

      // Send transaction emails
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('naira_balance, dollar_balance')
          .eq('user_id', transaction.user_id)
          .single();

        await supabase.functions.invoke('send-transaction-email', {
          body: {
            type: 'topup',
            userId: transaction.user_id,
            amount: displayAmount,
            currency: currency,
            reference: reference,
            balance: wallet || { naira_balance: 0, dollar_balance: 0 }
          }
        });
      } catch (emailError) {
        console.error('Failed to send transaction emails:', emailError);
      }
    } else if (transaction.transaction_type === 'inquiry_fee') {
      // Complete inquiry fee without crediting wallet
      console.log('Processing inquiry fee payment...');

      const { error: updateTxnError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);
      if (updateTxnError) {
        console.error('Failed to update transaction status:', updateTxnError);
        throw updateTxnError;
      }

      if (!transaction.inquiry_id) {
        throw new Error('Missing inquiry_id for inquiry_fee transaction');
      }

      const { error: updateInquiryError } = await supabase
        .from('inquiries')
        .update({ payment_status: 'paid' })
        .eq('id', transaction.inquiry_id);
      if (updateInquiryError) {
        console.error('Failed to update inquiry payment_status:', updateInquiryError);
        throw updateInquiryError;
      }

      // Notify user and admin
      try {
        const displayAmount = Math.round(transactionAmountInKobo / 100);
        // User notification
        await supabase.from('notifications').insert({
          user_id: transaction.user_id,
          title: 'Inquiry Submitted - Payment Successful',
          message: `Your inquiry fee payment of ₦${displayAmount.toLocaleString()} was successful. We will start processing your inquiry immediately.`,
          type: 'success',
          inquiry_id: transaction.inquiry_id
        });

        // Admin notification (first admin)
        const { data: adminUser } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();
        if (adminUser) {
          await supabase.from('notifications').insert({
            user_id: adminUser.user_id,
            title: 'New Inquiry Payment Received',
            message: `A user paid the inquiry fee. Please review the inquiry and proceed. Reference: ${reference}`,
            type: 'info',
            inquiry_id: transaction.inquiry_id
          });
        }

        // Optional: send transaction email
        try {
          await supabase.functions.invoke('send-transaction-email', {
            body: {
              type: 'inquiry_fee',
              userId: transaction.user_id,
              amount: displayAmount,
              currency: currency,
              reference: reference
            }
          });
        } catch (emailErr) {
          console.error('Failed to send inquiry fee email:', emailErr);
        }
      } catch (notifErr) {
        console.error('Notification error:', notifErr);
      }
    } else {
      console.log('Unknown transaction type, skipping processing');
    }

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