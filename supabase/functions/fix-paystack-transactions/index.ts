import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  console.log("Fix Paystack transactions function starting...");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !paystackSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all pending wallet_topup transactions
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_type', 'wallet_topup')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch transactions: ${fetchError.message}`);
    }

    console.log(`Found ${pendingTransactions?.length || 0} pending transactions`);

    const results = [];

    for (const transaction of pendingTransactions || []) {
      try {
        console.log(`Verifying transaction ${transaction.reference} with Paystack...`);
        
        // Verify transaction with Paystack
        const paystackResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${transaction.reference}`,
          {
            headers: {
              'Authorization': `Bearer ${paystackSecret}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const paystackData = await paystackResponse.json();
        console.log(`Paystack response for ${transaction.reference}:`, paystackData);

        if (paystackData.status && paystackData.data?.status === 'success') {
          // Transaction was successful, process it
          console.log(`Processing successful transaction: ${transaction.reference}`);
          
          // Update wallet balance
          const result = await supabase.rpc('process_wallet_topup', {
            p_user_id: transaction.user_id,
            p_amount: transaction.amount,
            p_currency: transaction.currency,
            p_reference: transaction.reference
          });

          if (result.error) {
            console.error(`Failed to process wallet topup for ${transaction.reference}:`, result.error);
            results.push({
              reference: transaction.reference,
              status: 'error',
              message: `Failed to process: ${result.error.message}`
            });
          } else {
            console.log(`Successfully processed transaction: ${transaction.reference}`);
            
            // Create notification for user
            await supabase.from('notifications').insert({
              user_id: transaction.user_id,
              title: 'Wallet Top-up Successful',
              message: `Your wallet has been credited with ${transaction.currency} ${(transaction.amount / 100).toLocaleString()}.`,
              type: 'success'
            });

            // Create notification for admin
            const { data: adminUsers } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin')
              .limit(1);

            if (adminUsers && adminUsers.length > 0) {
              await supabase.from('notifications').insert({
                user_id: adminUsers[0].user_id,
                title: 'Wallet Top-up Processed',
                message: `A wallet top-up of ${transaction.currency} ${(transaction.amount / 100).toLocaleString()} has been processed for user ${transaction.user_id}.`,
                type: 'info'
              });
            }

            // Send transaction email
            try {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', transaction.user_id)
                .single();

              const { data: walletData } = await supabase
                .from('wallets')
                .select('naira_balance, dollar_balance')
                .eq('user_id', transaction.user_id)
                .single();

              if (userProfile && walletData) {
                await supabase.functions.invoke('send-transaction-email', {
                  body: {
                    user_id: transaction.user_id,
                    transaction_type: 'wallet_topup',
                    amount: transaction.amount,
                    currency: transaction.currency,
                    reference: transaction.reference,
                    user_email: userProfile.full_name,
                    balance_after: transaction.currency === 'NGN' ? walletData.naira_balance : walletData.dollar_balance
                  }
                });
              }
            } catch (emailError) {
              console.error('Failed to send email:', emailError);
            }

            results.push({
              reference: transaction.reference,
              status: 'processed',
              message: 'Transaction successfully processed and wallet updated'
            });
          }
        } else {
          // Transaction was not successful or failed
          console.log(`Transaction ${transaction.reference} was not successful, marking as failed`);
          
          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id);

          results.push({
            reference: transaction.reference,
            status: 'failed',
            message: `Transaction failed in Paystack: ${paystackData.data?.gateway_response || 'Unknown error'}`
          });
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction.reference}:`, error);
        results.push({
          reference: transaction.reference,
          status: 'error',
          message: `Error verifying with Paystack: ${error.message}`
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} transactions`,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in fix-paystack-transactions function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});