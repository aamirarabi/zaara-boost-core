import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Shopify credentials from system_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('*');

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch system settings');
    }

    const storeUrl = settings?.find((s) => s.setting_key === 'shopify_store_url')?.setting_value;
    const token = settings?.find((s) => s.setting_key === 'shopify_access_token')?.setting_value;

    if (!storeUrl || !token) {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Shopify product sync...');

    let allProducts: any[] = [];
    let url = `https://${storeUrl}/admin/api/2024-10/products.json?limit=250&fields=id,title,body_html,vendor,product_type,handle,status,tags,images,variants`;

    // Fetch all products with pagination
    while (url) {
      console.log('Fetching products from:', url);
      
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': token },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Shopify API error:', errorText);
        throw new Error(`Shopify API error: ${res.status} - ${errorText}`);
      }

      const data = await res.json();

      if (data.products) {
        allProducts.push(...data.products);
        console.log(`Fetched ${data.products.length} products (Total: ${allProducts.length})`);
      }

      // Check for next page in Link header
      const linkHeader = res.headers.get('Link');
      const nextUrl = linkHeader?.includes('rel="next"') 
        ? linkHeader.match(/<(.+?)>; rel="next"/)?.[1]
        : null;
      url = nextUrl || '';
    }

    console.log(`Total products fetched: ${allProducts.length}`);

    // Fetch ALL metafields for each product (Judge.me AND custom like videos)
    console.log('Fetching all metafields for products...');
    let productsWithReviews = 0;
    let productsWithVideos = 0;
    
    for (const product of allProducts) {
      try {
        // Fetch ALL metafields without namespace filter
        const allMetafieldsUrl = `https://${storeUrl}/admin/api/2024-10/products/${product.id}/metafields.json`;
        const allRes = await fetch(allMetafieldsUrl, {
          headers: { 'X-Shopify-Access-Token': token },
        });
        
        product.all_metafields = [];
        
        if (allRes.ok) {
          const allData = await allRes.json();
          product.all_metafields = allData.metafields || [];
          
          // Count Judge.me metafields
          const judgemeFields = product.all_metafields.filter((m: any) => m.namespace === 'judgeme');
          if (judgemeFields.length > 0) {
            productsWithReviews++;
            console.log(`✅ Product "${product.title}" has Judge.me data`);
          }
          
          // Count video metafields
          const videoFields = product.all_metafields.filter((m: any) => 
            m.key === 'product_video' || m.key.includes('video')
          );
          if (videoFields.length > 0) {
            productsWithVideos++;
            console.log(`🎬 Product "${product.title}" has ${videoFields.length} video metafield(s)`);
          }
        }
      } catch (error) {
        console.error(`Error fetching metafields for product ${product.id}:`, error);
      }
    }
    
    console.log(`📊 Summary: ${productsWithReviews} products with Judge.me data, ${productsWithVideos} products with videos`);

    // Transform products for database
    const productsToUpsert = allProducts.map((p) => {
      // Extract Judge.me rating from metafields
      let reviewRating = null;
      let reviewCount = 0;
      
      if (p.all_metafields && p.all_metafields.length > 0) {
        const judgemeFields = p.all_metafields.filter((m: any) => m.namespace === 'judgeme');
        const ratingMeta = judgemeFields.find((m: any) => m.key === 'rating');
        const countMeta = judgemeFields.find((m: any) => m.key === 'rating_count');
        
        if (ratingMeta?.value) {
          reviewRating = parseFloat(ratingMeta.value);
        }
        if (countMeta?.value) {
          reviewCount = parseInt(countMeta.value) || 0;
        }
      }
      
      // Extract ALL metafields
      const metafieldsObj: any = {};
      if (p.all_metafields && p.all_metafields.length > 0) {
        p.all_metafields.forEach((mf: any) => {
          // Store both with and without namespace
          metafieldsObj[mf.key] = mf.value;
          if (mf.namespace) {
            metafieldsObj[`${mf.namespace}.${mf.key}`] = mf.value;
          }
        });
      }
      
      // Get all images
      const allImages = p.images?.map((img: any) => img.src) || [];
      
      return {
        product_id: p.id.toString(),
        shopify_id: p.id.toString(),
        title: p.title,
        description: p.body_html,
        vendor: p.vendor,
        product_type: p.product_type,
        handle: p.handle,
        status: p.status,
        tags: p.tags?.split(',').map((t: string) => t.trim()) || [],
        images: JSON.stringify(p.images?.map((img: any) => img.src) || []),
        variants: JSON.stringify(p.variants || []),
        price: parseFloat(p.variants[0]?.price || '0'),
        inventory: p.variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0),
        metafields: metafieldsObj,
        all_images: allImages,
        review_rating: reviewRating,
        review_count: reviewCount,
        synced_at: new Date().toISOString(),
      };
    });

    // Upsert products to database
    const { error: upsertError } = await supabaseClient
      .from('shopify_products')
      .upsert(productsToUpsert);

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      throw new Error(`Failed to sync products: ${upsertError.message}`);
    }

    console.log(`Successfully synced ${productsToUpsert.length} products`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: productsToUpsert.length,
        message: `Successfully synced ${productsToUpsert.length} products`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync-shopify-products:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
