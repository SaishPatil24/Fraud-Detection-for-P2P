
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Transaction {
  id?: string
  sender_id: string
  recipient_id: string
  amount: number
  date?: string
  status?: string
  fraud_score?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Parse the request body
    const { transaction } = await req.json()
    
    // Ensure the transaction is for the authenticated user
    if (transaction.sender_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized transaction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Enrich transaction with real-time features
    // In a real system, these would be derived from historical data
    // For now, we'll simulate them
    const enrichedTransaction = {
      ...transaction,
      hour_of_day: new Date().getHours(),
      time_since_last_tx: Math.random() * 48, // Random hours since last transaction
      recipient_frequency: Math.random(), // How often this recipient is paid (0-1)
      distance_to_recipient_km: Math.random() * 50, // Random distance in km
    }
    
    // Call our Go microservice to process the payment
    // In a real deployment, this would be the URL to your Go service
    // For testing, we'll simulate the response
    
    // Simulate fraud detection (in a real system, call the Go service)
    const fraudScore = Math.random() * 100
    const isFlaggedForFraud = fraudScore > 80
    
    const processedTransaction = {
      id: transaction.id || `TX${Math.floor(Math.random() * 900000) + 100000}`,
      date: transaction.date || new Date().toISOString(),
      sender_id: transaction.sender_id,
      recipient_id: transaction.recipient_id,
      amount: transaction.amount,
      status: isFlaggedForFraud ? 'flagged' : 'completed',
      fraud_score: Math.floor(fraudScore),
    }
    
    // Store the transaction in Supabase
    const { data, error } = await supabaseClient
      .from('transactions')
      .insert(processedTransaction)
      .select()
    
    if (error) {
      console.error('Error storing transaction:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to store transaction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Return the processed transaction
    return new Response(
      JSON.stringify({ 
        transaction: processedTransaction,
        message: isFlaggedForFraud ? 
          'Transaction was flagged for review due to suspicious activity.' : 
          'Transaction was processed successfully.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
