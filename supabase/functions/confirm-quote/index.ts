import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ConfirmQuoteRequest {
  inquiry_id: string;
  currency: 'NGN' | 'USD';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inquiry_id, currency }: ConfirmQuoteRequest = await req.json();

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Confirming quote for inquiry:', inquiry_id, 'by user:', user.id);

    // Get inquiry details with processing fees
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', inquiry_id)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single();

    if (inquiryError || !inquiry) {
      throw new Error('Inquiry not found or not approved');
    }

    // Check if already confirmed
    if (inquiry.quote_payment_processed) {
      throw new Error('Quote already confirmed and paid');
    }

    // Get processing fee based on currency
    const processingFee = currency === 'NGN' 
      ? inquiry.processing_fee_naira 
      : inquiry.processing_fee_dollar;

    if (!processingFee) {
      throw new Error('No processing fee set for this currency');
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found');
    }

    // Check sufficient balance
    const currentBalance = currency === 'NGN' ? wallet.naira_balance : wallet.dollar_balance;
    if (currentBalance < processingFee) {
      throw new Error('Insufficient wallet balance');
    }

    console.log('Processing payment:', {
      processingFee,
      currentBalance,
      currency
    });

    // Start transaction - deduct from wallet
    const walletUpdate = currency === 'NGN' 
      ? { naira_balance: wallet.naira_balance - processingFee }
      : { dollar_balance: wallet.dollar_balance - processingFee };

    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update(walletUpdate)
      .eq('user_id', user.id);

    if (walletUpdateError) {
      throw new Error('Failed to deduct from wallet');
    }

    // Update inquiry status
    const { error: inquiryUpdateError } = await supabase
      .from('inquiries')
      .update({
        quote_confirmed_at: new Date().toISOString(),
        quote_payment_processed: true,
        payment_status: 'paid'
      })
      .eq('id', inquiry_id);

    if (inquiryUpdateError) {
      throw new Error('Failed to update inquiry status');
    }

    // Create order record
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        inquiry_id: inquiry_id,
        amount: processingFee,
        currency: currency,
        status: 'completed',
        payment_method: 'wallet'
      });

    if (orderError) {
      console.error('Failed to create order record:', orderError);
      // Don't fail the transaction for this
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        inquiry_id: inquiry_id,
        transaction_type: 'payment',
        amount: processingFee,
        currency: currency,
        status: 'completed',
        reference: `QUOTE-${inquiry_id.substring(0, 8)}`
      });

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError);
      // Don't fail the transaction for this
    }

    // Create notification for admin
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
          title: 'Quote Confirmed & Payment Processed',
          message: `User has confirmed the quote for "${inquiry.item_name}" and payment has been processed. You can now proceed with procurement.`,
          type: 'success',
          inquiry_id: inquiry_id
        });
    }

    // Create notification for user
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Quote Confirmed Successfully',
        message: `Your quote for "${inquiry.item_name}" has been confirmed and payment processed. Our team will now proceed with sourcing your product.`,
        type: 'success',
        inquiry_id: inquiry_id
      });

    console.log('Quote confirmation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Quote confirmed and payment processed successfully' 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in confirm-quote function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);