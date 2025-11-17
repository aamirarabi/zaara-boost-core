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

    // ===== POSTEX TRACKING (INDEPENDENT WITH FALLBACK) =====
    if (postexOrders.length > 0) {
      console.log(`\n📮 Starting PostEx tracking for ${postexOrders.length} orders...`);
      
      const trackingNumbers = postexOrders.map(o => o.tracking_number);
      console.log('PostEx tracking numbers:', trackingNumbers.slice(0, 5), '...');
      
      try {
        console.log('Calling PostEx API (POST method)...');
        
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

        console.log(`PostEx API response: ${postexResponse.status}`);

        // Try alternate endpoint if 405 Method Not Allowed
        if (postexResponse.status === 405) {
          console.log('⚠️ 405 error, trying alternate endpoint...');
          const altResponse = await fetch(
            'https://api.postex.pk/services/integration/api/order/v2/track-bulk-order',
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
          
          if (altResponse.ok) {
            const altData = await altResponse.json();
            console.log('✅ Alternate endpoint success!');
            // Process altData same as below
          }
        }

        if (postexResponse.ok) {
          const postexData = await postexResponse.json();
          console.log('✅ PostEx API success!');
          
          if (postexData.statusCode === '200' && postexData.dist) {
            console.log(`Processing ${postexData.dist.length} PostEx results...`);
            
            for (const trackingResult of postexData.dist) {
              try {
                const trackingResponse = trackingResult.trackingResponse;
                const trackingNumber = trackingResult.trackingNumber;
                
                const order = postexOrders.find(o => o.tracking_number === trackingNumber);
                if (!order) continue;

                const updateData: any = {
                  courier_last_updated: new Date().toISOString(),
                };

                if (trackingResponse.orderDeliveryDate) {
                  updateData.delivered_at = trackingResponse.orderDeliveryDate;
                }

                if (trackingResponse.transactionStatus) {
                  const statusCode = trackingResponse.transactionStatus;
                  updateData.courier_api_status = POSTEX_STATUS_MAP[statusCode] || statusCode;
                  
                  if (statusCode === '0005' && trackingResponse.orderDeliveryDate) {
                    updateData.delivered_at = trackingResponse.orderDeliveryDate;
                  }
                }

                const { error } = await supabase
                  .from('shopify_orders')
                  .update(updateData)
                  .eq('order_id', order.order_id);

                if (!error) {
                  updatedCount++;
                  console.log(`✅ PostEx: ${order.order_number}`);
                }
              } catch (orderError) {
                console.error(`⚠️ Error processing PostEx order:`, orderError);
              }
            }
          }
        } else {
          const errorText = await postexResponse.text();
          console.error(`❌ PostEx API error ${postexResponse.status}:`, errorText);
        }
      } catch (postexError) {
        console.error('❌ PostEx tracking failed completely:', postexError);
        console.log('⚠️ Continuing with Leopards tracking...');
      }
    }

    // ===== LEOPARDS TRACKING (INDEPENDENT WITH PER-ORDER PROCESSING) =====
    if (leopardsOrders.length > 0) {
      console.log(`\n🐆 Starting Leopards tracking for ${leopardsOrders.length} orders...`);
      
      try {
        // Process Leopards orders individually for better reliability
        for (const order of leopardsOrders) {
          try {
            console.log(`\n🐆 Tracking: ${order.tracking_number} (${order.order_number})`);
            
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
                  track_numbers: [order.tracking_number],
                }),
              }
            );

            if (leopardsResponse.ok) {
              const leopardsData = await leopardsResponse.json();
              
              if (leopardsData.status === 1 && leopardsData.packet_list && leopardsData.packet_list.length > 0) {
                const packet = leopardsData.packet_list[0];
                
                const updateData: any = {
                  courier_last_updated: new Date().toISOString(),
                };

                if (packet.delivery_date) {
                  updateData.delivered_at = packet.delivery_date;
                  console.log(`📅 Delivered: ${packet.delivery_date}`);
                }

                if (packet.booked_packet_status) {
                  updateData.courier_api_status = packet.booked_packet_status;
                  console.log(`📊 Status: ${packet.booked_packet_status}`);
                }

                const { error } = await supabase
                  .from('shopify_orders')
                  .update(updateData)
                  .eq('order_id', order.order_id);

                if (!error) {
                  updatedCount++;
                  console.log(`✅ Leopards: ${order.order_number}`);
                } else {
                  console.error(`⚠️ DB update error for ${order.order_number}:`, error);
                }
              } else {
                console.log(`⚠️ No data for ${order.tracking_number}`);
              }
            } else {
              const errorText = await leopardsResponse.text();
              console.error(`⚠️ API error ${leopardsResponse.status}:`, errorText.substring(0, 200));
            }
            
            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (orderError) {
            console.error(`⚠️ Error processing Leopards order ${order.order_number}:`, orderError);
            // Continue with next order even if this one fails
          }
        }
        
        console.log(`🐆 Leopards tracking complete: processed ${leopardsOrders.length} orders`);
        
      } catch (leopardsError) {
        console.error('❌ Leopards tracking failed completely:', leopardsError);
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
