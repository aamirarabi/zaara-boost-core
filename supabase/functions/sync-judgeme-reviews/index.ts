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

    console.log(`\n🔄 Starting sync for ${products.length} products...\n`);

    let totalReviews = 0;
    let syncedReviews = 0;
    let errors = 0;
    let productsWithReviews = 0;
    const syncResults: Array<{ product: string; status: string; reviews: number }> = [];

    // Process EACH product individually, never stop early
    for (const product of products) {
      try {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📦 [${products.indexOf(product) + 1}/${products.length}] Processing: ${product.title}`);
        console.log(`   Shopify ID: ${product.shopify_id}`);
        console.log(`   Handle: ${product.handle}`);

        let page = 1;
        let hasMoreReviews = true;
        let productReviewCount = 0;

        // Paginate through all reviews for this product
        while (hasMoreReviews) {
          const reviewsUrl = `https://judge.me/api/v1/reviews`;
          const params = new URLSearchParams({
            api_token: settings.private_token,
            shop_domain: settings.shop_domain,
            external_product_id: product.shopify_id,
            per_page: "100",
            page: page.toString(),
          });

          console.log(`   🔗 API Call (page ${page}): Using shopify_id = ${product.shopify_id}`);
          const response = await fetch(`${reviewsUrl}?${params.toString()}`);
          
          console.log(`   📡 Response Status: ${response.status}`);
          
          if (!response.ok) {
            console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
            errors++;
            syncResults.push({
              product: product.title,
              status: 'error',
              reviews: 0
            });
            break;
          }

          const data = await response.json();
          const reviews = data.reviews || [];
          
          console.log(`   ✅ Found ${reviews.length} reviews on page ${page}`);
          
          if (reviews.length === 0) {
            if (page === 1) {
              console.log(`   ℹ️  No reviews for this product (this is OK)`);
              syncResults.push({
                product: product.title,
                status: 'no_reviews',
                reviews: 0
              });
            }
            hasMoreReviews = false;
            break;
          }
          
          if (page === 1) {
            productsWithReviews++;
          }
          
          totalReviews += reviews.length;
          productReviewCount += reviews.length;

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

          // If we got less than 100 reviews, we've reached the end
          if (reviews.length < 100) {
            hasMoreReviews = false;
          } else {
            page++;
          }
        }
        
        if (productReviewCount > 0) {
          console.log(`   ✅ SUCCESS: Synced ${productReviewCount} reviews`);
          syncResults.push({
            product: product.title,
            status: 'success',
            reviews: productReviewCount
          });
        }
      } catch (err) {
        console.error(`   ❌ PRODUCT ERROR:`, err);
        errors++;
        syncResults.push({
          product: product.title,
          status: 'error',
          reviews: 0
        });
        // Continue to next product, don't stop entire sync
      }
    }

    // Update last sync time
    await supabase
      .from("judgeme_settings")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", settings.id);

    // Print comprehensive summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📊 SYNC COMPLETE SUMMARY:\n`);
    console.log(`   Total Products Processed: ${products.length}`);
    console.log(`   Products with Reviews: ${productsWithReviews}`);
    console.log(`   Total Reviews Found: ${totalReviews}`);
    console.log(`   Reviews Synced: ${syncedReviews}`);
    console.log(`   Errors: ${errors}`);

    // Show per-product breakdown
    console.log(`\n📋 PER-PRODUCT BREAKDOWN:\n`);
    for (const result of syncResults) {
      if (result.reviews > 0) {
        console.log(`   ✅ ${result.product}: ${result.reviews} reviews`);
      } else if (result.status === 'error') {
        console.log(`   ❌ ${result.product}: ERROR`);
      } else {
        console.log(`   ○  ${result.product}: No reviews`);
      }
    }

    const summary = {
      success: true,
      message: `Synced ${syncedReviews} reviews from ${productsWithReviews} products`,
      summary: {
        totalProducts: products.length,
        productsWithReviews: productsWithReviews,
        totalReviewsFound: totalReviews,
        reviewsSynced: syncedReviews,
        errors: errors
      },
      results: syncResults,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Sync complete");

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
