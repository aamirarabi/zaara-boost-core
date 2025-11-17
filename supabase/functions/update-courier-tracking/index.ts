import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PostEx API tracking
async function trackPostExOrder(trackingNumber: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.postex.pk/services/integration/api/order/v1/track-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': apiKey,
        },
        body: JSON.stringify({
          trackingNumber: trackingNumber,
        }),
      }
    );

    if (!response.ok) {
      console.error(`PostEx API error for ${trackingNumber}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.statusCode === '200' && data.dist && data.dist.length > 0) {
      const tracking = data.dist[0].trackingResponse;
      
      // Map PostEx status codes
      const statusMap: Record<string, string> = {
        '0001': 'At Warehouse',
        '0002': 'Returned',
        '0003': 'At PostEx Warehouse',
        '0004': 'In Transit',
        '0005': 'Delivered',
        '0006': 'Returned',
        '0007': 'Returned',
        '0008': 'Delivery Under Review',
        '0013': 'Attempted Delivery',
      };

      return {
        deliveryDate: tracking.orderDeliveryDate || null,
        status: statusMap[tracking.transactionStatus] || tracking.transactionStatus,
        statusCode: tracking.transactionStatus,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error tracking PostEx order ${trackingNumber}:`, error);
    return null;
  }
}

// Leopards API tracking
async function trackLeopardsOrder(
  trackingNumber: string, 
  apiKey: string, 
  apiPassword: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_password: apiPassword,
          track_numbers: [trackingNumber],
        }),
      }
    );

    if (!response.ok) {
      console.error(`Leopards API error for ${trackingNumber}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.packet_list && data.packet_list.length > 0) {
      const packet = data.packet_list[0];
      
      return {
        deliveryDate: packet.delivery_date || null,
        status: packet.booked_packet_status || 'In Transit',
        statusCode: packet.booked_packet_status,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error tracking Leopards order ${trackingNumber}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const postexApiKey = Deno.env.get('POSTEX_API_KEY') ?? '';
    const leopardsApiKey = Deno.env.get('LEOPARDS_API_KEY') ?? '';
    const leopardsApiPassword = Deno.env.get('LEOPARDS_API_PASSWORD') ?? '';

    console.log('🚀 Starting courier tracking update...');

    // Get all orders with tracking numbers that haven't been delivered yet
    const { data: orders, error: fetchError } = await supabaseClient
      .from('shopify_orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .is('actual_delivery_date', null)
      .in('courier_name', ['PostEx', 'Leopards'])
      .limit(100);

    if (fetchError) {
      throw fetchError;
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No orders to track');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending orders to track',
          trackedCount: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📦 Found ${orders.length} orders to track`);

    let trackedCount = 0;
    let deliveredCount = 0;

    for (const order of orders) {
      try {
        let trackingResult = null;

        // Track based on courier
        if (order.courier_name === 'PostEx' && postexApiKey) {
          trackingResult = await trackPostExOrder(order.tracking_number, postexApiKey);
        } else if (order.courier_name === 'Leopards' && leopardsApiKey && leopardsApiPassword) {
          trackingResult = await trackLeopardsOrder(
            order.tracking_number, 
            leopardsApiKey, 
            leopardsApiPassword
          );
        }

        if (trackingResult) {
          trackedCount++;

          // Prepare update data
          const updateData: any = {
            delivery_status: trackingResult.status,
            courier_api_status: trackingResult.statusCode,
            courier_last_updated: new Date().toISOString(),
          };

          // If delivered, set delivery date
          if (
            trackingResult.statusCode === '0005' || // PostEx delivered
            trackingResult.status?.toLowerCase().includes('delivered')
          ) {
            updateData.actual_delivery_date = trackingResult.deliveryDate || new Date().toISOString();
            deliveredCount++;
            console.log(`✅ Order ${order.order_number} delivered`);
          }

          // Update order in database
          const { error: updateError } = await supabaseClient
            .from('shopify_orders')
            .update(updateData)
            .eq('order_id', order.order_id);

          if (updateError) {
            console.error(`❌ Error updating order ${order.order_number}:`, updateError);
          } else {
            console.log(`✅ Updated tracking for order ${order.order_number}: ${trackingResult.status}`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (orderError) {
        console.error(`❌ Error processing order ${order.order_number}:`, orderError);
      }
    }

    console.log(`🎉 Tracking complete: ${trackedCount} tracked, ${deliveredCount} delivered`);

    return new Response(
      JSON.stringify({
        success: true,
        trackedCount,
        deliveredCount,
        totalOrders: orders.length,
        message: `Tracked ${trackedCount} orders, ${deliveredCount} delivered`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Tracking error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
