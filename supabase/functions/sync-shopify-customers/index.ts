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
    const lastSync = settings?.find((s) => s.setting_key === 'last_customer_sync')?.setting_value;

    if (!storeUrl || !token) {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Shopify customer sync...');
    if (lastSync) {
      console.log('Incremental sync from:', lastSync);
    }

    let allCustomers: any[] = [];
    let url = `https://${storeUrl}/admin/api/2024-10/customers.json?limit=250`;
    
    // Add updated_at_min for incremental sync
    if (lastSync) {
      url += `&updated_at_min=${encodeURIComponent(lastSync)}`;
    }

    // Fetch all customers with pagination
    while (url) {
      console.log('Fetching customers from:', url);
      
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': token },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Shopify API error:', errorText);
        throw new Error(`Shopify API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (data.customers) {
        allCustomers.push(...data.customers);
        console.log(`Fetched ${data.customers.length} customers (Total: ${allCustomers.length})`);
      }

      // Check for next page in Link header
      const linkHeader = res.headers.get('Link');
      const nextUrl = linkHeader?.includes('rel="next"') 
        ? linkHeader.match(/<(.+?)>; rel="next"/)?.[1]
        : null;
      url = nextUrl || '';
    }

    console.log(`Total customers fetched: ${allCustomers.length}`);

    // Transform customers for database
    const customersToUpsert = allCustomers
      .map((c) => {
        const phone = standardizePhone(c.phone || c.default_address?.phone);
        
        if (!phone) {
          console.warn(`Skipping customer ${c.id} - invalid phone number`);
          return null;
        }

        return {
          phone_number: phone,
          shopify_customer_id: c.id.toString(),
          email: c.email,
          customer_name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          first_name: c.first_name,
          last_name: c.last_name,
          total_orders: c.orders_count || 0,
          order_count: c.orders_count || 0,
          total_spend: parseFloat(c.total_spent || '0'),
          tags: c.tags?.split(',').map((t: string) => t.trim()) || [],
          customer_type: 'D2C',
          created_at: c.created_at,
          updated_at: c.updated_at,
          last_interaction_at: new Date().toISOString(),
        };
      })
      .filter(Boolean); // Remove null entries

    console.log(`Valid customers to sync: ${customersToUpsert.length}`);

    // Batch upsert customers to database (500 at a time to avoid CPU timeout)
    if (customersToUpsert.length > 0) {
      const batchSize = 500;
      let syncedCount = 0;
      
      for (let i = 0; i < customersToUpsert.length; i += batchSize) {
        const batch = customersToUpsert.slice(i, i + batchSize);
        console.log(`Upserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} customers (${i + batch.length}/${customersToUpsert.length})`);
        
        const { error: upsertError } = await supabaseClient
          .from('customers')
          .upsert(batch, { onConflict: 'phone_number' });

        if (upsertError) {
          console.error('Database upsert error:', upsertError);
          throw new Error(`Failed to sync customers at batch ${Math.floor(i / batchSize) + 1}: ${upsertError.message}`);
        }
        
        syncedCount += batch.length;
        console.log(`✅ Synced ${syncedCount}/${customersToUpsert.length} customers`);
      }

      // Update last sync timestamp
      await supabaseClient
        .from('system_settings')
        .upsert({
          setting_key: 'last_customer_sync',
          setting_value: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Successfully synced ${customersToUpsert.length} customers in ${duration}s`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: customersToUpsert.length,
        duration: `${duration}s`,
        message: `Successfully synced ${customersToUpsert.length} customers`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-shopify-customers:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
