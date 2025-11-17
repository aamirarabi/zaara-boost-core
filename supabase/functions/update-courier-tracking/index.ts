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
    console.log('=== COURIER TRACKING UPDATE STARTED ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const postexToken = Deno.env.get('POSTEX_API_TOKEN')!;
    const leopardsApiKey = Deno.env.get('LEOPARDS_API_KEY')!;
    const leopardsApiPassword = Deno.env.get('LEOPARDS_API_PASSWORD')!;

    console.log('Environment variables loaded successfully');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all orders with tracking numbers
    console.log('Fetching orders with tracking numbers...');
    const { data: orders, error: fetchError } = await supabase
      .from('shopify_orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .not('courier_name', 'is', null)
      .limit(50); // Limit to 50 for testing

    if (fetchError) {
      console.error('Error fetching orders:', fetchError);
      throw new Error(`Error fetching orders: ${fetchError.message}`);
    }

    console.log(`✅ Found ${orders?.length || 0} orders with tracking info`);

    if (!orders || orders.length === 0) {
      console.log('No orders to track, exiting');
      return new Response(
        JSON.stringify({
          success: true,
          updatedCount: 0,
          totalOrders: 0,
          message: 'No orders found with tracking numbers',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedCount = 0;
    const postexOrders: any[] = [];
    const leopardsOrders: any[] = [];

    // Separate orders by courier
    for (const order of orders) {
      if (order.courier_name === 'PostEx') {
        postexOrders.push(order);
      } else if (order.courier_name === 'Leopards') {
        leopardsOrders.push(order);
      }
    }

    console.log(`📮 PostEx orders: ${postexOrders.length}`);
    console.log(`🐆 Leopards orders: ${leopardsOrders.length}`);

    // ===== POSTEX TRACKING (OFFICIAL API v4.1.9 SPEC) =====
    if (postexOrders.length > 0) {
      console.log(`\n📮 Starting PostEx tracking for ${postexOrders.length} orders...`);
      
      const trackingNumbers = postexOrders.map(o => o.tracking_number);
      console.log('PostEx tracking numbers:', trackingNumbers.slice(0, 5), '...');
      
      try {
        console.log('Calling PostEx API (GET method with JSON body per official docs)...');
        
        // OFFICIAL SPEC: GET method with JSON body containing trackingNumber array
        const postexResponse = await fetch(
          'https://api.postex.pk/services/integration/api/order/v1/track-bulk-order',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'token': postexToken,
            },
            body: JSON.stringify({
              trackingNumber: trackingNumbers,
            }),
          }
        );

        console.log('PostEx API response status:', postexResponse.status);

        if (postexResponse.ok) {
          const postexData = await postexResponse.json();
          console.log('PostEx API response:', JSON.stringify(postexData).substring(0, 500));
          
          if (postexData.statusCode === '200' && postexData.dist) {
            console.log(`Processing ${postexData.dist.length} PostEx results...`);
            
            for (const trackingResult of postexData.dist) {
              const trackingResponse = trackingResult.trackingResponse;
              const trackingNumber = trackingResult.trackingNumber;
              
              console.log(`\n--- Processing tracking: ${trackingNumber} ---`);
              
              // Find matching order
              const order = postexOrders.find(o => o.tracking_number === trackingNumber);
              if (!order) {
                console.log(`⚠️ No matching order found for tracking: ${trackingNumber}`);
                continue;
              }

              console.log(`✓ Found order: ${order.order_number} (ID: ${order.order_id})`);

              const updateData: any = {
                courier_last_updated: new Date().toISOString(),
              };

              // Get delivery date
              if (trackingResponse.orderDeliveryDate) {
                updateData.delivered_at = trackingResponse.orderDeliveryDate;
                console.log(`📅 Delivery date: ${trackingResponse.orderDeliveryDate}`);
              }

              // Get status
              if (trackingResponse.transactionStatus) {
                const statusText = POSTEX_STATUS_MAP[trackingResponse.transactionStatus] || trackingResponse.transactionStatus;
                updateData.courier_api_status = statusText;
                console.log(`📊 Status: ${statusText} (${trackingResponse.transactionStatus})`);
                
                // If delivered, ensure delivered_at is set
                if (trackingResponse.transactionStatus === '0005' && trackingResponse.orderDeliveryDate) {
                  updateData.delivered_at = trackingResponse.orderDeliveryDate;
                  console.log(`✅ Marked as DELIVERED`);
                }
              }

              console.log('Update data:', JSON.stringify(updateData));

              // Update order
              console.log(`Updating database for order_id: ${order.order_id}...`);
              const { data: updateResult, error: updateError } = await supabase
                .from('shopify_orders')
                .update(updateData)
                .eq('order_id', order.order_id)
                .select();

              if (updateError) {
                console.error(`❌ Error updating ${order.order_number}:`, updateError);
              } else {
                updatedCount++;
                console.log(`✅ Successfully updated ${order.order_number}`);
                console.log('Update result:', updateResult);
              }
            }
          } else {
            console.log('⚠️ PostEx API returned unsuccessful status or no data');
          }
        } else {
          const errorText = await postexResponse.text();
          console.error('PostEx API error response:', errorText);
        }
      } catch (postexError) {
        console.error('PostEx API exception:', postexError);
      }
    }

    // ===== LEOPARDS TRACKING =====
    if (leopardsOrders.length > 0) {
      console.log(`\n🐆 Starting Leopards tracking for ${leopardsOrders.length} orders...`);
      
      const trackingNumbers = leopardsOrders.map(o => o.tracking_number);
      console.log('Leopards tracking numbers:', trackingNumbers.slice(0, 5), '...');
      
      try {
        console.log('Calling Leopards API...');
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

        console.log('Leopards API response status:', leopardsResponse.status);

        if (leopardsResponse.ok) {
          const leopardsData = await leopardsResponse.json();
          console.log('Leopards API response:', JSON.stringify(leopardsData).substring(0, 500));
          
          if (leopardsData.status === 1 && leopardsData.packet_list) {
            console.log(`Processing ${leopardsData.packet_list.length} Leopards results...`);
            
            for (const packet of leopardsData.packet_list) {
              const trackingNumber = packet.tracking_number || packet.track_number;
              
              console.log(`\n--- Processing tracking: ${trackingNumber} ---`);
              
              // Find matching order
              const order = leopardsOrders.find(
                o => o.tracking_number === trackingNumber
              );
              if (!order) {
                console.log(`⚠️ No matching order found for tracking: ${trackingNumber}`);
                continue;
              }

              console.log(`✓ Found order: ${order.order_number} (ID: ${order.order_id})`);

              const updateData: any = {
                courier_last_updated: new Date().toISOString(),
              };

              // Get delivery date
              if (packet.delivery_date) {
                updateData.delivered_at = packet.delivery_date;
                console.log(`📅 Delivery date: ${packet.delivery_date}`);
              }

              // Get status
              if (packet.booked_packet_status) {
                updateData.courier_api_status = packet.booked_packet_status;
                console.log(`📊 Status: ${packet.booked_packet_status}`);
              }

              console.log('Update data:', JSON.stringify(updateData));

              // Update order
              console.log(`Updating database for order_id: ${order.order_id}...`);
              const { data: updateResult, error: updateError } = await supabase
                .from('shopify_orders')
                .update(updateData)
                .eq('order_id', order.order_id)
                .select();

              if (updateError) {
                console.error(`❌ Error updating ${order.order_number}:`, updateError);
              } else {
                updatedCount++;
                console.log(`✅ Successfully updated ${order.order_number}`);
                console.log('Update result:', updateResult);
              }
            }
          } else {
            console.log('⚠️ Leopards API returned unsuccessful status or no data');
          }
        } else {
          const errorText = await leopardsResponse.text();
          console.error('Leopards API error response:', errorText);
        }
      } catch (leopardsError) {
        console.error('Leopards API exception:', leopardsError);
      }
    }

    console.log(`\n=== TRACKING UPDATE COMPLETE ===`);
    console.log(`Total orders processed: ${orders.length}`);
    console.log(`Successfully updated: ${updatedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        updatedCount,
        totalOrders: orders.length,
        postexCount: postexOrders.length,
        leopardsCount: leopardsOrders.length,
        message: `Updated ${updatedCount} orders from courier APIs`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('=== TRACKING UPDATE ERROR ===');
    console.error(error);
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
