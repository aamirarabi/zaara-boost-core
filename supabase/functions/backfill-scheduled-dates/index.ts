import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Starting backfill of scheduled_delivery_date...')

    // Get all fulfilled orders without scheduled_delivery_date
    const { data: orders, error } = await supabaseClient
      .from('shopify_orders')
      .select('order_id, fulfilled_at, shipping_address')
      .not('fulfilled_at', 'is', null)
      .is('scheduled_delivery_date', null)

    if (error) {
      console.error('Error fetching orders:', error)
      throw error
    }

    console.log(`📊 Found ${orders.length} orders to backfill`)

    let updated = 0
    let failed = 0

    for (const order of orders) {
      try {
        const shippingAddress = order.shipping_address || {}
        const city = shippingAddress.city || ''
        const cityLower = city.toLowerCase()
        const isKarachi = cityLower.includes('karachi')
        const slaDays = isKarachi ? 2 : 5

        const dispatch = new Date(order.fulfilled_at)
        dispatch.setDate(dispatch.getDate() + slaDays)
        
        const { error: updateError } = await supabaseClient
          .from('shopify_orders')
          .update({ scheduled_delivery_date: dispatch.toISOString() })
          .eq('order_id', order.order_id)

        if (!updateError) {
          updated++
          if (updated % 50 === 0) {
            console.log(`✅ Progress: ${updated}/${orders.length}`)
          }
        } else {
          failed++
          console.error(`❌ Error updating ${order.order_id}:`, updateError)
        }
      } catch (e) {
        failed++
        console.error(`❌ Exception for ${order.order_id}:`, e)
      }
    }

    const result = {
      success: true,
      message: `Backfilled ${updated} orders successfully`,
      total: orders.length,
      updated: updated,
      failed: failed
    }

    console.log('🎉 Backfill complete:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('💥 Backfill failed:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
