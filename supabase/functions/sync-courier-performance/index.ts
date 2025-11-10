import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting courier performance sync...');

    // Fetch all shopify orders with delivery information
    const { data: orders, error: ordersError } = await supabaseClient
      .from('shopify_orders')
      .select('*')
      .not('courier_name', 'is', null);

    if (ordersError) {
      throw new Error(`Error fetching orders: ${ordersError.message}`);
    }

    console.log(`📦 Found ${orders?.length || 0} orders with courier data`);

    // Clear existing courier performance data
    const { error: deleteError } = await supabaseClient
      .from('courier_performance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('⚠️ Error clearing old data:', deleteError.message);
    }

    // Process each order and create courier performance records
    const performanceRecords = [];

    for (const order of orders || []) {
      // Skip if no courier name
      if (!order.courier_name) continue;

      // Calculate delivery metrics
      const scheduledDate = order.scheduled_delivery_date 
        ? new Date(order.scheduled_delivery_date) 
        : null;
      const actualDate = order.actual_delivered_at 
        ? new Date(order.actual_delivered_at) 
        : null;
      const estimatedDate = order.estimated_delivery_date 
        ? new Date(order.estimated_delivery_date) 
        : null;

      // Determine delivery status and delay
      let deliveryStatus = order.delivery_status || 'pending';
      let delayDays = 0;

      if (actualDate && estimatedDate) {
        // Calculate delay in days
        const diffTime = actualDate.getTime() - estimatedDate.getTime();
        delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Set status based on delay
        if (delayDays <= 0) {
          deliveryStatus = 'on_time';
        } else if (delayDays <= 2) {
          deliveryStatus = 'delayed';
        } else {
          deliveryStatus = 'very_delayed';
        }
      } else if (order.fulfillment_status === 'fulfilled' && !actualDate) {
        // Fulfilled but no actual delivery date - assume on time
        deliveryStatus = 'on_time';
        delayDays = 0;
      }

      // Extract city from shipping address
      let customerCity = '';
      if (order.shipping_address && typeof order.shipping_address === 'object') {
        const address = order.shipping_address as any;
        customerCity = address.city || '';
      }

      const record = {
        order_id: order.order_id || order.order_number,
        courier_name: order.courier_name,
        tracking_number: order.tracking_number,
        shipped_date: order.created_at, // Use order creation as shipped date
        expected_delivery_date: estimatedDate?.toISOString() || null,
        actual_delivery_date: actualDate?.toISOString() || null,
        delivery_status: deliveryStatus,
        delay_days: delayDays,
        customer_city: customerCity,
      };

      performanceRecords.push(record);
    }

    console.log(`📊 Processed ${performanceRecords.length} courier performance records`);

    // Insert new records in batches
    if (performanceRecords.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('courier_performance')
        .insert(performanceRecords);

      if (insertError) {
        throw new Error(`Error inserting records: ${insertError.message}`);
      }

      console.log('✅ Courier performance data synced successfully!');
    }

    // Calculate summary statistics
    const courierStats: Record<string, any> = {};
    
    for (const record of performanceRecords) {
      if (!courierStats[record.courier_name]) {
        courierStats[record.courier_name] = {
          total: 0,
          onTime: 0,
          delayed: 0,
          veryDelayed: 0,
          totalDelay: 0,
        };
      }

      const stats = courierStats[record.courier_name];
      stats.total++;
      stats.totalDelay += record.delay_days || 0;

      if (record.delivery_status === 'on_time') stats.onTime++;
      else if (record.delivery_status === 'delayed') stats.delayed++;
      else if (record.delivery_status === 'very_delayed') stats.veryDelayed++;
    }

    // Calculate percentages
    const summary = Object.entries(courierStats).map(([name, stats]: [string, any]) => ({
      courier: name,
      total_deliveries: stats.total,
      on_time: stats.onTime,
      on_time_percentage: Math.round((stats.onTime / stats.total) * 100),
      delayed: stats.delayed,
      very_delayed: stats.veryDelayed,
      avg_delay_days: (stats.totalDelay / stats.total).toFixed(1),
    }));

    console.log('📈 Summary:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        records_synced: performanceRecords.length,
        summary: summary,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in courier performance sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
