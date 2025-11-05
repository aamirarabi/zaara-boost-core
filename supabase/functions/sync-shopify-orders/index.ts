import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standardize Pakistani phone numbers to format: 923218241590
function standardizePhone(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 92 (Pakistan)
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1);
  }
  
  // If doesn't start with country code, add 92
  if (!cleaned.startsWith('92') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }
  
  // Validate Pakistan mobile (should be 12 digits: 92 + 10 digits)
  if (cleaned.length === 12 && cleaned.startsWith('92')) {
    return cleaned;
  }
  
  return null; // Invalid format
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Shopify credentials and last sync time
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('*');

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch system settings');
    }

    const storeUrl = settings?.find((s) => s.setting_key === 'shopify_store_url')?.setting_value;
    const token = settings?.find((s) => s.setting_key === 'shopify_access_token')?.setting_value;
    const lastSync = settings?.find((s) => s.setting_key === 'last_order_sync')?.setting_value;

    if (!storeUrl || !token) {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Shopify order sync...');
    if (lastSync) {
      console.log('Incremental sync from:', lastSync);
    }

    let allOrders: any[] = [];
    let url = `https://${storeUrl}/admin/api/2024-10/orders.json?limit=250&status=any`;
    
    // Add updated_at_min for incremental sync
    if (lastSync) {
      url += `&updated_at_min=${encodeURIComponent(lastSync)}`;
    }

    // Fetch all orders with pagination
    while (url) {
      console.log('Fetching orders from:', url);
      
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': token },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Shopify API error:', errorText);
        throw new Error(`Shopify API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (data.orders) {
        allOrders.push(...data.orders);
        console.log(`Fetched ${data.orders.length} orders (Total: ${allOrders.length})`);
      }

      // Check for next page in Link header
      const linkHeader = res.headers.get('Link');
      const nextUrl = linkHeader?.includes('rel="next"') 
        ? linkHeader.match(/<(.+?)>; rel="next"/)?.[1]
        : null;
      url = nextUrl || '';
    }

    console.log(`Total orders fetched: ${allOrders.length}`);

    // Transform orders for database
    const ordersToUpsert = allOrders.map((o) => {
      const customerPhone = standardizePhone(o.customer?.phone || o.shipping_address?.phone);
      const fulfillments = o.fulfillments || [];
      const tracking = fulfillments[0]?.tracking_number 
        ? {
            number: fulfillments[0].tracking_number,
            url: fulfillments[0].tracking_url,
            company: fulfillments[0].tracking_company,
          }
        : null;

      return {
        order_id: o.id.toString(),
        shopify_id: o.id.toString(),
        order_number: o.name || o.order_number?.toString(),
        customer_id: customerPhone,
        customer_phone: customerPhone,
        customer_name: o.customer?.first_name && o.customer?.last_name 
          ? `${o.customer.first_name} ${o.customer.last_name}`
          : o.shipping_address?.name || null,
        customer_email: o.customer?.email || o.contact_email,
        currency: o.currency || 'PKR',
        financial_status: o.financial_status,
        fulfillment_status: o.fulfillment_status,
        subtotal: parseFloat(o.subtotal_price || '0'),
        total_price: parseFloat(o.total_price || '0'),
        total_tax: parseFloat(o.total_tax || '0'),
        line_items: o.line_items || [],
        shipping_address: o.shipping_address || {},
        billing_address: o.billing_address || {},
        tracking_number: tracking?.number || null,
        tracking_url: tracking?.url || null,
        courier_name: tracking?.company || null,
        note: o.note,
        tags: o.tags?.split(',').map((t: string) => t.trim()) || [],
        created_at: o.created_at,
        updated_at: o.updated_at,
        synced_at: new Date().toISOString(),
      };
    });

    console.log(`Orders to sync: ${ordersToUpsert.length}`);

    // Batch upsert orders to database (250 at a time to avoid CPU timeout)
    if (ordersToUpsert.length > 0) {
      const batchSize = 250;
      let syncedCount = 0;
      
      for (let i = 0; i < ordersToUpsert.length; i += batchSize) {
        const batch = ordersToUpsert.slice(i, i + batchSize);
        console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} orders (${i + batch.length}/${ordersToUpsert.length})`);
        
        const { error: upsertError } = await supabaseClient
          .from('shopify_orders')
          .upsert(batch, { onConflict: 'order_id' });

        if (upsertError) {
          console.error('Database upsert error:', upsertError);
          throw new Error(`Failed to sync orders at batch ${Math.floor(i / batchSize) + 1}: ${upsertError.message}`);
        }
        
        syncedCount += batch.length;
        console.log(`✅ Synced ${syncedCount}/${ordersToUpsert.length} orders`);
      }

      // Update last sync timestamp
      await supabaseClient
        .from('system_settings')
        .upsert({
          setting_key: 'last_order_sync',
          setting_value: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Successfully synced ${ordersToUpsert.length} orders in ${duration}s`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: ordersToUpsert.length,
        duration: `${duration}s`,
        message: `Successfully synced ${ordersToUpsert.length} orders`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-shopify-orders:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
