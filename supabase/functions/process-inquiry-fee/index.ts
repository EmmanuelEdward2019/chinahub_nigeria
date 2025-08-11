import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getInquirySettings(supabase: any) {
  const { data: settings, error } = await supabase
    .from('inquiry_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Settings query error:', error);
    throw new Error('Failed to get inquiry settings');
  }

  // Return default values if no settings found
  return settings || {
    default_fee_naira: 100000,
    default_fee_dollar: 200
  };
}

async function deductInquiryFee(supabase: any, userId: string, amount: number, currency: string, inquiryId: string) {
  console.log('Deducting inquiry fee:', { userId, amount, currency, inquiryId });
  
  const { data: result, error } = await supabase
    .rpc('deduct_inquiry_fee', {
      p_user_id: userId,
      p_amount: amount,
      p_currency: currency,
      p_inquiry_id: inquiryId
    });

  if (error) {
    console.error('Fee deduction error:', error);
    throw error;
  }

  if (!result?.success) {
    throw new Error(result?.error || 'Fee deduction failed');
  }

  return result;
}

async function createNotifications(supabase: any, userId: string, amount: number, currency: string, inquiryId: string) {
  console.log('Creating fee notifications...');
  
  // User notification
  const { error: userNotifError } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: 'Inquiry Processing Fee Deducted',
      message: `${currency === 'NGN' ? '₦' : '$'}${amount.toLocaleString()} has been deducted for inquiry processing.`,
      type: 'info',
      inquiry_id: inquiryId
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
    const { error: adminNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: adminUser.user_id,
        title: 'Inquiry Fee Collected',
        message: `Processing fee of ${currency === 'NGN' ? '₦' : '$'}${amount.toLocaleString()} collected. Reference: INQ-${inquiryId}`,
        type: 'info',
        inquiry_id: inquiryId
      });

    if (adminNotifError) {
      console.error('Admin notification error:', adminNotifError);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing inquiry fee request...');
    
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

    // Get settings and fee amount
    const settings = await getInquirySettings(supabase);
    const feeAmount = currency === 'NGN' ? settings.default_fee_naira : settings.default_fee_dollar;

    // Process fee deduction
    const result = await deductInquiryFee(supabase, user.id, feeAmount, currency, inquiry_id);
    
    // Create notifications
    await createNotifications(supabase, user.id, feeAmount, currency, inquiry_id);

    console.log('Inquiry fee processing completed successfully');

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
    console.error('Process inquiry fee error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Fee processing failed' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});