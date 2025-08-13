import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("Auto-fix pending transactions function starting...");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Running auto-fix for pending transactions");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call the database function to fix stuck pending transactions
    const { data: result, error } = await supabase
      .rpc('fix_stuck_pending_transactions');

    if (error) {
      console.error('Failed to fix pending transactions:', error);
      throw error;
    }

    console.log('Auto-fix result:', result);

    // If transactions were fixed, send notifications
    if (result.transactions_fixed > 0) {
      console.log(`Fixed ${result.transactions_fixed} stuck transactions`);
      
      // Get all recently completed transactions to send notifications
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_type', 'wallet_topup')
        .eq('status', 'completed')
        .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      // Send emails for recently fixed transactions
      if (recentTransactions && recentTransactions.length > 0) {
        for (const transaction of recentTransactions) {
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
                amount: Math.round(transaction.amount / 100), // Convert from kobo to main unit
                currency: transaction.currency,
                reference: transaction.reference,
                balance: wallet || { naira_balance: 0, dollar_balance: 0 }
              }
            });
          } catch (emailError) {
            console.error('Failed to send email for transaction:', transaction.reference, emailError);
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-fix function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Auto-fix failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});