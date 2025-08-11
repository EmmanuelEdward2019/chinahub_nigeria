import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getInquiryDetails(supabase: any, inquiryId: string, userId: string) {
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Inquiry query error:', error);
    throw new Error('Database error');
  }

  if (!inquiry) {
    throw new Error('Inquiry not found');
  }

  if (inquiry.payment_status === 'paid') {
    throw new Error('Quote already confirmed');
  }

  if (inquiry.status !== 'approved') {
    throw new Error('Inquiry not approved yet');
  }

  return inquiry;
}

async function deductProcessingFee(supabase: any, userId: string, amount: number, currency: string, inquiryId: string) {
  console.log('Deducting processing fee using database function...');
  
  const { data: result, error } = await supabase
    .rpc('deduct_inquiry_fee', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency,
      p_inquiry_id: inquiryId
    });

  if (error) {
    console.error('Processing fee deduction error:', error);
    throw error;
  }

  if (!result?.success) {
    throw new Error(result?.error || 'Processing fee deduction failed');
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing quote confirmation...');
    
    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request
    const { inquiry_id, currency } = await req.json();
    
    if (!inquiry_id || !currency) {
      throw new Error('Missing required parameters');
    }

    // Get auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Get inquiry details
    const inquiry = await getInquiryDetails(supabase, inquiry_id, user.id);
    
    // Get processing fee
    const processingFee = currency === 'NGN' ? inquiry.processing_fee_naira : inquiry.processing_fee_dollar;
    
    if (!processingFee) {
      throw new Error('Processing fee not set for this inquiry');
    }

    // Deduct processing fee using database function
    const feeResult = await deductProcessingFee(supabase, user.id, processingFee, currency, inquiry_id);
    
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
      console.error('Inquiry update error:', inquiryUpdateError);
      throw new Error('Failed to update inquiry status');
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        inquiry_id: inquiry_id,
        amount: processingFee,
        currency: currency,
        status: 'pending',
        payment_method: 'wallet'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
    }

    // Create notifications
    const { error: userNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Quote Confirmed Successfully',
        message: `Your quote for "${inquiry.item_name}" has been confirmed and payment processed. Our team will now proceed with sourcing your product.`,
        type: 'success',
        inquiry_id: inquiry_id
      });

    if (userNotifError) {
      console.error('User notification error:', userNotifError);
    }

    // Admin notification
    const { data: adminUser } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (adminUser) {
      await supabase
        .from('notifications')
        .insert({
          user_id: adminUser.user_id,
          title: 'Quote Confirmed & Payment Processed',
          message: `User has confirmed the quote for "${inquiry.item_name}" and payment of ${currency === 'NGN' ? '₦' : '$'}${processingFee.toLocaleString()} has been processed.`,
          type: 'success',
          inquiry_id: inquiry_id
        });
    }

    console.log('Quote confirmation completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Quote confirmed and payment processed successfully',
      order_id: order?.id,
      processing_fee: processingFee,
      new_balance: feeResult.new_balance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Quote confirmation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Quote confirmation failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});