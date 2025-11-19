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
    console.log('Fetching orders with tracking numbers (last year)...');
    
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    
    console.log('Fetching PostEx orders...');
    const allPostexOrders: any[] = [];
    let postexFrom = 0;
    const postexBatchSize = 1000;
    let hasMorePostex = true;

    while (hasMorePostex) {
      const { data: batch, error } = await supabase
        .from('shopify_orders')
        .select('order_id, order_number, tracking_number, courier_name')
        .eq('courier_name', 'PostEx')
        .not('tracking_number', 'is', null)
        .gte('created_at', oneYearAgo.toISOString())
        .range(postexFrom, postexFrom + postexBatchSize - 1);
      
      if (error) {
        console.error('Error fetching PostEx batch:', error);
        break;
      }
      
      if (!batch || batch.length === 0) {
        hasMorePostex = false;
        break;
      }
      
      allPostexOrders.push(...batch);
      console.log(`Fetched ${allPostexOrders.length} PostEx orders so far...`);
      
      if (batch.length < postexBatchSize) {
        hasMorePostex = false;
      }
      
      postexFrom += postexBatchSize;
    }

    const postexOrders = allPostexOrders;

    console.log('Fetching Leopards orders...');
    const allLeopardsOrders: any[] = [];
    let leopardsFrom = 0;
    const leopardsBatchSize = 1000;
    let hasMoreLeopards = true;

    while (hasMoreLeopards) {
      const { data: batch, error } = await supabase
        .from('shopify_orders')
        .select('order_id, order_number, tracking_number, courier_name')
        .eq('courier_name', 'Leopards')
        .not('tracking_number', 'is', null)
        .gte('created_at', oneYearAgo.toISOString())
        .range(leopardsFrom, leopardsFrom + leopardsBatchSize - 1);
      
      if (error) {
        console.error('Error fetching Leopards batch:', error);
        break;
      }
      
      if (!batch || batch.length === 0) {
        hasMoreLeopards = false;
        break;
      }
      
      allLeopardsOrders.push(...batch);
      console.log(`Fetched ${allLeopardsOrders.length} Leopards orders so far...`);
      
      if (batch.length < leopardsBatchSize) {
        hasMoreLeopards = false;
      }
      
      leopardsFrom += leopardsBatchSize;
    }

    const leopardsOrders = allLeopardsOrders;

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

    // ===== POSTEX TRACKING (GET METHOD) =====
    if (postexOrders && postexOrders.length > 0) {
      console.log(`\n📮 Starting PostEx tracking for ${postexOrders.length} orders...`);
      
      // Process in batches of 100 tracking numbers (API limit)
      const batchSize = 100;
      
      for (let i = 0; i < postexOrders.length; i += batchSize) {
        const batch = postexOrders.slice(i, i + batchSize);
        const trackingNumbers = batch.map(o => o.tracking_number);
        
        try {
          // Build GET request URL with comma-separated tracking numbers
          const trackingParams = trackingNumbers.join(',');
          const postexUrl = `https://api.postex.pk/services/integration/api/order/v1/track-bulk-order?trackingNumber=${encodeURIComponent(trackingParams)}`;
          
          console.log(`Calling PostEx API (GET) for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postexOrders.length / batchSize)}...`);
          
          const postexResponse = await fetch(postexUrl, {
            method: 'GET',
            headers: {
              'token': postexToken,
            }
          });

          console.log(`PostEx API response: ${postexResponse.status}`);

          if (postexResponse.ok) {
            const postexData = await postexResponse.json();
            console.log('✅ PostEx API success!');
            
            if (postexData.statusCode === '200' && postexData.dist) {
              console.log(`Processing ${postexData.dist.length} PostEx results...`);
              
              for (const trackingResult of postexData.dist) {
                try {
                  const trackingResponse = trackingResult.trackingResponse;
                  const trackingNumber = trackingResult.trackingNumber;
                  
                  const order = batch.find(o => o.tracking_number === trackingNumber);
                  if (!order) continue;

                  const updateData: any = {
                    courier_last_updated: new Date().toISOString(),
                  };

                  // Extract delivery date if available
                  if (trackingResponse.orderDeliveryDate) {
                    try {
                      updateData.delivered_at = new Date(trackingResponse.orderDeliveryDate).toISOString();
                      console.log(`📅 ${order.order_number}: ${trackingResponse.orderDeliveryDate}`);
                    } catch (e) {
                      console.error('Error parsing orderDeliveryDate:', e);
                    }
                  }

                  // Extract status
                  if (trackingResponse.transactionStatus) {
                    const statusCode = trackingResponse.transactionStatus;
                    updateData.courier_api_status = POSTEX_STATUS_MAP[statusCode] || statusCode;
                    
                    // Status code 0005 = Delivered
                    if (statusCode === '0005' && trackingResponse.orderDeliveryDate) {
                      updateData.delivered_at = new Date(trackingResponse.orderDeliveryDate).toISOString();
                    }
                  }

                  const { error } = await supabase
                    .from('shopify_orders')
                    .update(updateData)
                    .eq('order_id', order.order_id);

                  if (!error) {
                    updatedCount++;
                    if (updatedCount % 50 === 0) {
                      console.log(`✅ Progress: ${updatedCount} orders updated`);
                    }
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
          
          // Rate limiting: wait 500ms between batches
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (batchError) {
          console.error('❌ PostEx batch failed:', batchError);
          console.log('⚠️ Continuing with next batch...');
        }
      }
      
      console.log(`✅ PostEx tracking complete`);
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

                // Extract Leopards estimated delivery date
                if (packet.delivery_date) {
                  try {
                    updateData.courier_estimated_delivery = new Date(packet.delivery_date).toISOString();
                    console.log(`📅 Leopards ETA: ${packet.delivery_date}`);
                  } catch (e) {
                    console.error('Error parsing Leopards delivery_date:', e);
                  }
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
