import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("🔄 Starting Judge.me reviews sync...");

    // Get Judge.me settings
    const { data: settings, error: settingsError } = await supabase
      .from("judgeme_settings")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !settings) {
      throw new Error("Judge.me settings not found");
    }

    console.log(`✅ Using shop: ${settings.shop_domain}`);

    // Get all products
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("shopify_id, handle, title");

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No products to sync" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📦 Found ${products.length} products`);

    let totalReviews = 0;
    let syncedReviews = 0;
    let errors = 0;

    // Sync reviews for each product
    for (const product of products) {
      try {
        console.log(`   Syncing: ${product.title}`);

        const reviewsUrl = `https://judge.me/api/v1/reviews`;
        const params = new URLSearchParams({
          api_token: settings.private_token,
          shop_domain: settings.shop_domain,
          external_product_id: product.shopify_id,
          per_page: "100",
        });

        const response = await fetch(`${reviewsUrl}?${params.toString()}`);
        
        if (!response.ok) {
          console.error(`   ❌ API error: ${response.status}`);
          errors++;
          continue;
        }

        const data = await response.json();
        const reviews = data.reviews || [];
        
        console.log(`   Found ${reviews.length} reviews`);
        totalReviews += reviews.length;

        for (const review of reviews) {
          try {
            const reviewRecord = {
              judgeme_id: review.id.toString(),
              product_handle: product.handle,
              shopify_product_id: product.shopify_id,
              rating: review.rating,
              title: review.title || null,
              body: review.body || null,
              reviewer_name: review.reviewer?.name || "Anonymous",
              reviewer_email: review.reviewer?.email || null,
              reviewer_location: review.reviewer?.location || null,
              verified_buyer: review.verified === "yes" || review.verified === true,
              pictures: review.pictures || [],
              created_at_judgeme: review.created_at,
              updated_at_judgeme: review.updated_at,
            };

            const { error: upsertError } = await supabase
              .from("product_reviews")
              .upsert(reviewRecord, {
                onConflict: "judgeme_id",
                ignoreDuplicates: false,
              });

            if (upsertError) {
              console.error(`   ❌ Upsert error: ${upsertError.message}`);
              errors++;
            } else {
              syncedReviews++;
            }
          } catch (err) {
            console.error(`   ❌ Review processing error:`, err);
            errors++;
          }
        }
      } catch (err) {
        console.error(`   ❌ Product sync error:`, err);
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from("judgeme_settings")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", settings.id);

    const summary = {
      success: true,
      totalReviews,
      syncedReviews,
      productsProcessed: products.length,
      errors,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Sync complete:", summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
