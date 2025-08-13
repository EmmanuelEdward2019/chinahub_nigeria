import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'topup' | 'deduction';
  userId: string;
  amount: number;
  currency: string;
  reference: string;
  balance: {
    naira_balance: number;
    dollar_balance: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { type, userId, amount, currency, reference, balance }: EmailRequest = await req.json();

    // Get user details
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const { data: user } = await supabase.auth.admin.getUserById(userId);
    
    if (!user?.user?.email) {
      throw new Error('User email not found');
    }

    const userEmail = user.user.email;
    const userName = profile?.full_name || 'User';
    const currencySymbol = currency === 'NGN' ? '₦' : '$';
    const formattedAmount = `${currencySymbol}${amount.toLocaleString()}`;
    const currentBalance = currency === 'NGN' ? balance.naira_balance : balance.dollar_balance;
    const formattedBalance = `${currencySymbol}${currentBalance.toLocaleString()}`;

    // Email content for user
    const userSubject = type === 'topup' 
      ? `ChinaHub - Wallet Top-up Receipt #${reference}`
      : `ChinaHub - Transaction Receipt #${reference}`;

    const userMessage = type === 'topup'
      ? `Dear ${userName},

Your wallet has been successfully credited with ${formattedAmount}.

Transaction Details:
- Amount: ${formattedAmount}
- Reference: ${reference}
- Current Balance: ${formattedBalance}
- Date: ${new Date().toLocaleDateString()}

Thank you for using ChinaHub!

Best regards,
ChinaHub Team`
      : `Dear ${userName},

Your inquiry fee of ${formattedAmount} has been processed.

Transaction Details:
- Amount Deducted: ${formattedAmount}
- Reference: ${reference}
- Current Balance: ${formattedBalance}
- Date: ${new Date().toLocaleDateString()}

Your inquiry is now being processed by our team.

Best regards,
ChinaHub Team`;

    // Check if we have Resend configured for direct email sending
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      // Use Resend directly
      const { Resend } = await import('npm:resend@4.0.0');
      const resend = new Resend(resendApiKey);
      
      const { error: userEmailError } = await resend.emails.send({
        from: 'ChinaHub <onboarding@resend.dev>',
        to: [userEmail],
        subject: userSubject,
        text: userMessage,
      });

      if (userEmailError) {
        console.error('Failed to send user email:', userEmailError);
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email');
    }


    // Get admin email and send notification
    const { data: adminUser } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminUser) {
      const { data: adminAuth } = await supabase.auth.admin.getUserById(adminUser.user_id);
      
      if (adminAuth?.user?.email) {
        const adminSubject = type === 'topup'
          ? `ChinaHub - Wallet Top-up Alert: ${formattedAmount}`
          : `ChinaHub - Inquiry Fee Alert: ${formattedAmount}`;

        const adminMessage = type === 'topup'
          ? `Admin Alert: Wallet Top-up

User: ${userName} (${userEmail})
Amount: ${formattedAmount}
Reference: ${reference}
New Balance: ${formattedBalance}
Date: ${new Date().toLocaleDateString()}

This is an automated notification from ChinaHub.`
          : `Admin Alert: Inquiry Fee Processed

User: ${userName} (${userEmail})
Fee Deducted: ${formattedAmount}
Reference: ${reference}
New Balance: ${formattedBalance}
Date: ${new Date().toLocaleDateString()}

This is an automated notification from ChinaHub.`;

        if (resendApiKey) {
          const { Resend } = await import('npm:resend@4.0.0');
          const resend = new Resend(resendApiKey);
          
          const { error: adminEmailError } = await resend.emails.send({
            from: 'ChinaHub <onboarding@resend.dev>',
            to: [adminAuth.user.email],
            subject: adminSubject,
            text: adminMessage,
          });

          if (adminEmailError) {
            console.error('Failed to send admin email:', adminEmailError);
          }
        }

      }
    }

    console.log(`Transaction emails sent successfully for ${type}: ${reference}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Email sending failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});