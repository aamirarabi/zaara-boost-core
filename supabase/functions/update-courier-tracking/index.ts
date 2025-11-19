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

    // ===== FETCH ORDERS SEPARATELY BY COURIER (OLDER ORDERS) =====
    console.log('Fetching orders with tracking numbers (15-60 days old)...');
    
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    console.log('Fetching PostEx orders...');
    const { data: postexOrders, error: postexError } = await supabase
      .from('shopify_orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .eq('courier_name', 'PostEx')
      .eq('fulfillment_status', 'fulfilled')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lte('created_at', fifteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (postexError) {
      console.error('Error fetching PostEx orders:', postexError);
    }

    console.log('Fetching Leopards orders...');
    const { data: leopardsOrders, error: leopardsError } = await supabase
      .from('shopify_orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .eq('courier_name', 'Leopards')
      .eq('fulfillment_status', 'fulfilled')
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lte('created_at', fifteenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (leopardsError) {
      console.error('Error fetching Leopards orders:', leopardsError);
    }

    const orders = [
      ...(postexOrders || []),
      ...(leopardsOrders || [])
    ];

    console.log(`✅ Found ${orders.length} total orders (${postexOrders?.length || 0} PostEx, ${leopardsOrders?.length || 0} Leopards)`);

    if (orders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          updatedCount: 0,
          totalOrders: 0,
          message: 'No orders found in 15-60 day range',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedCount = 0;

    console.log(`📮 PostEx: ${postexOrders?.length || 0}`);
    console.log(`🐆 Leopards: ${leopardsOrders?.length || 0}`);

    // ===== POSTEX TRACKING (INDEPENDENT WITH FALLBACK) =====
    if (postexOrders && postexOrders.length > 0) {
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

    // ===== LEOPARDS TRACKING (GET METHOD) =====
    if (leopardsOrders && leopardsOrders.length > 0) {
      console.log(`\n🐆 Starting Leopards tracking...`);
      
      try {
        for (const order of leopardsOrders) {
          try {
            const leopardsUrl = `https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/?api_key=${encodeURIComponent(leopardsApiKey)}&api_password=${encodeURIComponent(leopardsApiPassword)}&track_numbers=${encodeURIComponent(order.tracking_number)}`;
            
            const leopardsResponse = await fetch(leopardsUrl, { method: 'GET' });

            if (leopardsResponse.ok) {
              const leopardsData = await leopardsResponse.json();
              
              if (leopardsData.status === 1 && leopardsData.packet_list?.[0]) {
                const packet = leopardsData.packet_list[0];
                
                const updateData: any = {
                  courier_last_updated: new Date().toISOString(),
                };

                // Parse delivery date from Tracking Detail array
                const trackingDetail = packet.packet_history || packet['Tracking Detail'] || packet.tracking_detail || [];
                if (Array.isArray(trackingDetail)) {
                  const deliveredEvent = trackingDetail.find(
                    (event: any) => event.Status === "Delivered"
                  );
                  
                  if (deliveredEvent && deliveredEvent.Activity_datetime) {
                    // Convert "2025-11-10 20:52:00" to ISO timestamp
                    updateData.delivered_at = new Date(deliveredEvent.Activity_datetime).toISOString();
                    console.log(`📅 ${order.order_number}: ${deliveredEvent.Activity_datetime}`);
                    
                    // Save who received it
                    if (deliveredEvent.Reciever_Name) {
                      updateData.delivered_to_name = deliveredEvent.Reciever_Name.trim();
                    }
                  }
                }

                if (packet.booked_packet_status) {
                  updateData.courier_api_status = packet.booked_packet_status;
                }

                const { error } = await supabase
                  .from('shopify_orders')
                  .update(updateData)
                  .eq('order_id', order.order_id);

                if (!error) {
                  updatedCount++;
                  console.log(`✅ ${order.order_number}`);
                }
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (err) {
            console.error(`⚠️ ${order.order_number}:`, err);
          }
        }
      } catch (error) {
        console.error('❌ Leopards error:', error);
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
        postexCount: postexOrders?.length || 0,
        leopardsCount: leopardsOrders?.length || 0,
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
