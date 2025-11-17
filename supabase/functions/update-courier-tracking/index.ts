import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PostEx Status Codes
const POSTEX_STATUS_MAP: Record<string, string> = {
  '0001': 'At Merchant\'s Warehouse',
  '0002': 'Returned',
  '0003': 'At PostEx Warehouse',
  '0004': 'Package on Route',
  '0005': 'Delivered',
  '0006': 'Returned',
  '0007': 'Returned',
  '0008': 'Delivery Under Review',
  '0013': 'Attempt Made',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const postexToken = Deno.env.get('POSTEX_API_TOKEN')!;
    const leopardsApiKey = Deno.env.get('LEOPARDS_API_KEY')!;
    const leopardsApiPassword = Deno.env.get('LEOPARDS_API_PASSWORD')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting courier tracking update...');

    // Get all orders with tracking numbers
    const { data: orders, error: fetchError } = await supabase
      .from('shopify_orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .not('courier_name', 'is', null);

    if (fetchError) {
      throw new Error(`Error fetching orders: ${fetchError.message}`);
    }

    console.log(`Found ${orders?.length || 0} orders to track`);

    let updatedCount = 0;
    const postexOrders: any[] = [];
    const leopardsOrders: any[] = [];

    // Separate orders by courier
    for (const order of orders || []) {
      if (order.courier_name === 'PostEx') {
        postexOrders.push(order);
      } else if (order.courier_name === 'Leopards') {
        leopardsOrders.push(order);
      }
    }

    // ===== POSTEX TRACKING =====
    if (postexOrders.length > 0) {
      console.log(`Tracking ${postexOrders.length} PostEx orders...`);
      
      const trackingNumbers = postexOrders.map(o => o.tracking_number);
      
      try {
        const postexResponse = await fetch(
          'https://api.postex.pk/services/integration/api/order/v1/track-bulk-order',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'token': postexToken,
            },
            body: JSON.stringify({
              trackingNumber: trackingNumbers,
            }),
          }
        );

        if (postexResponse.ok) {
          const postexData = await postexResponse.json();
          
          if (postexData.statusCode === '200' && postexData.dist) {
            for (const trackingResult of postexData.dist) {
              const trackingResponse = trackingResult.trackingResponse;
              const trackingNumber = trackingResult.trackingNumber;
              
              // Find matching order
              const order = postexOrders.find(o => o.tracking_number === trackingNumber);
              if (!order) continue;

              const updateData: any = {
                courier_last_updated: new Date().toISOString(),
              };

              // Get delivery date
              if (trackingResponse.orderDeliveryDate) {
                updateData.delivered_at = trackingResponse.orderDeliveryDate;
              }

              // Get status
              if (trackingResponse.transactionStatus) {
                const statusText = POSTEX_STATUS_MAP[trackingResponse.transactionStatus] || trackingResponse.transactionStatus;
                updateData.courier_api_status = statusText;
                
                // If delivered, ensure delivered_at is set
                if (trackingResponse.transactionStatus === '0005' && trackingResponse.orderDeliveryDate) {
                  updateData.delivered_at = trackingResponse.orderDeliveryDate;
                }
              }

              // Update order
              const { error: updateError } = await supabase
                .from('shopify_orders')
                .update(updateData)
                .eq('order_id', order.order_id);

              if (!updateError) {
                updatedCount++;
                console.log(`Updated PostEx order: ${order.order_number}`);
              } else {
                console.error(`Error updating ${order.order_number}:`, updateError);
              }
            }
          }
        }
      } catch (postexError) {
        console.error('PostEx API error:', postexError);
      }
    }

    // ===== LEOPARDS TRACKING =====
    if (leopardsOrders.length > 0) {
      console.log(`Tracking ${leopardsOrders.length} Leopards orders...`);
      
      const trackingNumbers = leopardsOrders.map(o => o.tracking_number);
      
      try {
        const leopardsResponse = await fetch(
          'https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: leopardsApiKey,
              api_password: leopardsApiPassword,
              track_numbers: trackingNumbers,
            }),
          }
        );

        if (leopardsResponse.ok) {
          const leopardsData = await leopardsResponse.json();
          
          if (leopardsData.status === 1 && leopardsData.packet_list) {
            for (const packet of leopardsData.packet_list) {
              const trackingNumber = packet.tracking_number || packet.track_number;
              
              // Find matching order
              const order = leopardsOrders.find(
                o => o.tracking_number === trackingNumber
              );
              if (!order) continue;

              const updateData: any = {
                courier_last_updated: new Date().toISOString(),
              };

              // Get delivery date
              if (packet.delivery_date) {
                updateData.delivered_at = packet.delivery_date;
              }

              // Get status
              if (packet.booked_packet_status) {
                updateData.courier_api_status = packet.booked_packet_status;
              }

              // Update order
              const { error: updateError } = await supabase
                .from('shopify_orders')
                .update(updateData)
                .eq('order_id', order.order_id);

              if (!updateError) {
                updatedCount++;
                console.log(`Updated Leopards order: ${order.order_number}`);
              } else {
                console.error(`Error updating ${order.order_number}:`, updateError);
              }
            }
          }
        }
      } catch (leopardsError) {
        console.error('Leopards API error:', leopardsError);
      }
    }

    console.log(`Successfully updated ${updatedCount} orders`);

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount,
        totalOrders: orders?.length || 0,
        postexCount: postexOrders.length,
        leopardsCount: leopardsOrders.length,
        message: `Updated ${updatedCount} orders from courier APIs`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Tracking update error:', error);
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
