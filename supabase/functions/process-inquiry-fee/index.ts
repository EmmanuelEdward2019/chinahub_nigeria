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
    const { inquiry_id, currency } = await req.json();

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Processing inquiry fee for:', inquiry_id, 'by user:', user.id);

    // Get inquiry settings for default fees
    const { data: settings, error: settingsError } = await supabase
      .from('inquiry_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      throw new Error('Failed to get inquiry settings');
    }

    // Determine fee amount based on currency
    const feeAmount = currency === 'NGN' ? settings.default_fee_naira : settings.default_fee_dollar;

    console.log('Deducting fee:', feeAmount, currency);

    // Process the inquiry fee deduction
    const { data: result, error: processError } = await supabase
      .rpc('deduct_inquiry_fee', {
        p_user_id: user.id,
        p_amount: feeAmount,
        p_currency: currency,
        p_inquiry_id: inquiry_id
      });

    if (processError) {
      console.error('Failed to process inquiry fee:', processError);
      throw new Error('Failed to process inquiry fee');
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to deduct inquiry fee');
    }

    console.log('Inquiry fee processed successfully:', result);

    // Create notification for user about fee deduction
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Inquiry Processing Fee Deducted',
        message: `${currency === 'NGN' ? '₦' : '$'}${feeAmount.toLocaleString()} has been deducted from your wallet for inquiry processing.`,
        type: 'info',
        inquiry_id: inquiry_id
      });

    // Notify admin about the fee collection
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
          title: 'Inquiry Fee Collected',
          message: `Processing fee of ${currency === 'NGN' ? '₦' : '$'}${feeAmount.toLocaleString()} collected for new inquiry submission. Reference: INQ-${inquiry_id}`,
          type: 'info',
          inquiry_id: inquiry_id
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Inquiry fee processed successfully',
      fee_amount: feeAmount,
      currency: currency,
      new_balance: result.new_balance
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-inquiry-fee function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Fee processing failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});