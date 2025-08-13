import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log("Paystack topup function starting...")

serve(async (req) => {
  console.log(`Request method: ${req.method}`)
  
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight")
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Processing paystack topup request")
    
    const { amount, currency, user_id, redirect_url } = await req.json()
    console.log("Request data:", { amount, currency, user_id, redirect_url })

    // Validate minimum amounts
    const minAmountNGN = 1000; // ₦1,000
    const minAmountUSD = 5; // $5

    if (!amount || !user_id) {
      throw new Error('Amount and user_id are required')
    }

    if (currency === 'NGN' && amount < minAmountNGN) {
      throw new Error(`Minimum amount for NGN is ₦${minAmountNGN}`)
    }

    if (currency === 'USD' && amount < minAmountUSD) {
      throw new Error(`Minimum amount for USD is $${minAmountUSD}`)
    }

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(user_id)
    
    if (userError || !user?.email) {
      console.error("User error:", userError)
      throw new Error('User email not found')
    }

    console.log("User found:", user.email)

    // Convert amount to kobo for Paystack
    const amountInKobo = Math.round(amount * 100)
    
    // Create transaction record
    const transactionRef = `topup_${user_id}_${Date.now()}`
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        amount: amountInKobo, // Store in kobo for consistency
        currency,
        transaction_type: 'wallet_topup',
        status: 'pending',
        reference: transactionRef
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      throw new Error('Failed to create transaction record')
    }

    console.log("Transaction created:", transaction.id)

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: 'NGN',
        reference: transactionRef,
        callback_url: `${redirect_url}?transaction_id=${transaction.id}`,
        metadata: {
          user_id,
          transaction_id: transaction.id,
          transaction_type: 'wallet_topup'
        }
      }),
    })

    const paystackData = await paystackResponse.json()
    console.log("Paystack response:", paystackData)

    if (!paystackData.status) {
      console.error('Paystack initialization error:', paystackData)
      throw new Error(paystackData.message || 'Failed to initialize payment')
    }

    return new Response(JSON.stringify({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: transactionRef
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in paystack-topup function:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Payment initialization failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})