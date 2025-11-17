import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standardize Pakistani phone numbers to format: 923218241590
function standardizePhone(phone: string): string | null {
  if (!phone) return null;
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1);
  }
  
  if (!cleaned.startsWith('92') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('92')) {
    return cleaned;
  }
  
  return null;
}

// Normalize courier name (Pakistan-specific)
function normalizeCourierName(courierName: string | null): string | null {
  if (!courierName) return null;
  
  const courier = courierName.toLowerCase().trim();
  
  // Map "Other" to PostEx (common in Pakistan)
  if (courier === 'other') return 'PostEx';
  if (courier === 'postex' || courier === 'post ex') return 'PostEx';
  if (courier === 'leopards' || courier === 'leopard') return 'Leopards';
  if (courier === 'tcs') return 'TCS';
  if (courier === 'blueex' || courier === 'blue ex') return 'BlueEx';
  
  // Return original if no mapping found
  return courierName;
}

// Extract order source from Shopify data (Facebook Ads, Google Ads, etc.)
function extractOrderSource(order: any): string {
  // Check referring site first
  if (order.referring_site) {
    const referring = order.referring_site.toLowerCase();
    if (referring.includes('facebook') || referring.includes('fb.com')) return 'Facebook Ads';
    if (referring.includes('instagram') || referring.includes('ig.me')) return 'Instagram';
    if (referring.includes('google')) return 'Google Ads';
    if (referring.includes('tiktok')) return 'TikTok';
    if (referring.includes('youtube')) return 'YouTube';
  }

  // Check landing site for UTM parameters
  if (order.landing_site) {
    const landing = order.landing_site.toLowerCase();
    if (landing.includes('utm_source=facebook') || landing.includes('fbclid=')) return 'Facebook Ads';
    if (landing.includes('utm_source=instagram')) return 'Instagram';
    if (landing.includes('utm_source=google') || landing.includes('gclid=')) return 'Google Ads';
    if (landing.includes('utm_source=tiktok')) return 'TikTok';
    if (landing.includes('utm_source=youtube')) return 'YouTube';
    if (landing.includes('utm_medium=social')) return 'Social Media';
    if (landing.includes('utm_medium=cpc') || landing.includes('utm_medium=ppc')) return 'Paid Ads';
  }

  // Check source_name as fallback
  if (order.source_name) {
    const source = order.source_name.toLowerCase();
    if (source.includes('facebook')) return 'Facebook Ads';
    if (source.includes('instagram')) return 'Instagram';
    if (source.includes('google')) return 'Google Ads';
    if (source !== 'web') return order.source_name;
  }

  return 'Organic';
}

// Helper to transform and insert orders
async function processBatch(supabaseClient: any, orders: any[]) {
  // First, ensure all customers exist - DEDUPLICATE by phone_number
  const customerMap = new Map();
  
  orders.forEach((o) => {
    const customerPhone = standardizePhone(o.customer?.phone || o.shipping_address?.phone);
    if (!customerPhone) return;
    
    // Only keep the first occurrence of each phone number
    if (!customerMap.has(customerPhone)) {
      customerMap.set(customerPhone, {
        phone_number: customerPhone,
        customer_name: o.customer?.first_name && o.customer?.last_name 
          ? `${o.customer.first_name} ${o.customer.last_name}`
          : o.shipping_address?.name || null,
        first_name: o.customer?.first_name || null,
        last_name: o.customer?.last_name || null,
        email: o.customer?.email || o.contact_email,
      });
    }
  });

  const customersToUpsert = Array.from(customerMap.values());

  // Upsert customers first
  if (customersToUpsert.length > 0) {
    const { error: customerError } = await supabaseClient
      .from('customers')
      .upsert(customersToUpsert, { onConflict: 'phone_number' });
    
    if (customerError) {
      console.error('❌ Customer upsert error:', customerError);
      throw customerError;
    }
    console.log(`✅ Upserted ${customersToUpsert.length} unique customers`);
  }

  // Deduplicate orders by order_id
  const orderMap = new Map();
  
  orders.forEach((o) => {
    const orderId = o.id.toString();
    
    // Only keep the first occurrence of each order_id
    if (!orderMap.has(orderId)) {
      const customerPhone = standardizePhone(o.customer?.phone || o.shipping_address?.phone);
      const fulfillments = o.fulfillments || [];
      const tracking = fulfillments[0]?.tracking_number 
        ? {
            number: fulfillments[0].tracking_number,
            url: fulfillments[0].tracking_url,
            company: fulfillments[0].tracking_company,
          }
        : null;

      // Get fulfillment dates
      let fulfilledAt = null;
      let dispatchedAt = null;
      
      if (fulfillments.length > 0) {
        const fulfillment = fulfillments[0];
        if (fulfillment.created_at) {
          fulfilledAt = fulfillment.created_at;
          dispatchedAt = fulfillment.created_at;
        }
      }

      // Get shipping lines for courier info
      let courierName = tracking?.company || null;
      if (!courierName && o.shipping_lines && o.shipping_lines.length > 0) {
        courierName = o.shipping_lines[0].title || null;
      }
      
      // Normalize courier name (Other → PostEx)
      courierName = normalizeCourierName(courierName);

      // Determine delivery city
      let deliveryCity = null;
      if (o.shipping_address && o.shipping_address.city) {
        deliveryCity = o.shipping_address.city;
      }
      
      // Extract order source
      const orderSource = extractOrderSource(o);

      orderMap.set(orderId, {
        order_id: orderId,
        shopify_id: orderId,
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
        courier_name: courierName,
        delivery_city: deliveryCity,
        fulfilled_at: fulfilledAt,
        dispatched_at: dispatchedAt,
        order_source: orderSource,
        note: o.note,
        tags: o.tags?.split(',').map((t: string) => t.trim()) || [],
        created_at: o.created_at,
        updated_at: o.updated_at,
        synced_at: new Date().toISOString(),
      });
    }
  });

  const ordersToUpsert = Array.from(orderMap.values());

  const { error } = await supabaseClient
    .from('shopify_orders')
    .upsert(ordersToUpsert, { onConflict: 'order_id' });

  if (error) {
    console.error('❌ Order upsert error:', error);
    throw error;
  }
  console.log(`✅ Upserted ${ordersToUpsert.length} unique orders`);
}

// Background sync function
async function syncOrdersInBackground(
  supabaseClient: any,
  storeUrl: string,
  token: string,
  lastSync: string | null
) {
  const startTime = Date.now();
  let totalSynced = 0;
  
  try {
    console.log('🚀 Starting background order sync...');
    if (lastSync) {
      console.log('📅 Incremental sync from:', lastSync);
    }

    let allOrders: any[] = [];
    let url = `https://${storeUrl}/admin/api/2024-10/orders.json?limit=250&status=any`;
    
    console.log('🔗 Shopify API URL:', url);
    console.log('🔑 Using store:', storeUrl);
    console.log('🔐 Token configured:', token ? 'Yes (length: ' + token.length + ')' : 'No');
    
    if (lastSync) {
      url += `&updated_at_min=${encodeURIComponent(lastSync)}`;
      console.log('📅 Incremental sync from:', lastSync);
    } else {
      console.log('📅 Full sync (no previous sync timestamp found)');
    }

    // Fetch orders with pagination - with batching to avoid CPU limits
    let pageCount = 0;
    const MAX_PAGES = 20; // Limit to 5000 orders per sync (20 pages * 250)
    
    while (url && pageCount < MAX_PAGES) {
      pageCount++;
      console.log(`📦 Fetching page ${pageCount}/${MAX_PAGES}...`);
      
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': token },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Shopify API error:', errorText);
        throw new Error(`Shopify API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (data.orders) {
        allOrders.push(...data.orders);
        console.log(`✅ Page ${pageCount}: Fetched ${data.orders.length} orders (Total: ${allOrders.length})`);
        
        // Batch insert every 10 pages to avoid memory issues
        if (pageCount % 10 === 0 && allOrders.length > 0) {
          console.log(`💾 Mid-sync batch insert: ${allOrders.length} orders...`);
          await processBatch(supabaseClient, allOrders);
          totalSynced += allOrders.length;
          allOrders = []; // Clear after inserting
        }
      }

      const linkHeader = res.headers.get('Link');
      const nextUrl = linkHeader?.includes('rel="next"') 
        ? linkHeader.match(/<(.+?)>; rel="next"/)?.[1]
        : null;
      url = nextUrl || '';
    }
    
    if (pageCount === MAX_PAGES && url) {
      console.log(`⚠️ Reached page limit (${MAX_PAGES}). Use incremental sync for remaining orders.`);
    }

    console.log(`📊 Final batch: ${allOrders.length} orders`);

    // Insert remaining orders
    if (allOrders.length > 0) {
      await processBatch(supabaseClient, allOrders);
      totalSynced += allOrders.length;
    }

    // Update last sync timestamp
    await supabaseClient
      .from('system_settings')
      .upsert({
        setting_key: 'last_order_sync',
        setting_value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Background sync completed: ${totalSynced} orders in ${duration}s`);
    
  } catch (error) {
    console.error('❌ Background sync failed:', error);
    throw error;
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

    // Get Shopify credentials
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

    console.log('🚀 Starting order sync in background...');
    
    // Start background sync and return immediately
    EdgeRuntime.waitUntil(
      syncOrdersInBackground(supabaseClient, storeUrl, token, lastSync)
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Syncing orders in background - check edge function logs for progress'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error starting sync:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
