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

    console.log("📊 Starting product analytics sync...");

    // Get all active products
    const { data: products, error: productsError } = await supabase
      .from("shopify_products")
      .select("product_id, shopify_id, title, inventory, price")
      .eq("status", "active");

    if (productsError) throw productsError;

    console.log(`📦 Found ${products.length} active products`);

    // Get orders from last 30 days for velocity calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentOrders } = await supabase
      .from("shopify_orders")
      .select("line_items, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Process each product
    for (const product of products) {
      try {
        // Calculate sales metrics
        const { count: totalSales } = await supabase
          .from("shopify_orders")
          .select("*", { count: "exact", head: true })
          .contains("line_items", [{ product_id: product.product_id }]);

        // Calculate revenue
        const { data: orderItems } = await supabase
          .from("shopify_orders")
          .select("line_items, total_price")
          .contains("line_items", [{ product_id: product.product_id }]);

        let totalRevenue = 0;
        if (orderItems) {
          orderItems.forEach(order => {
            const items = order.line_items || [];
            items.forEach((item: any) => {
              if (item.product_id === product.product_id) {
                totalRevenue += parseFloat(item.price || 0) * (item.quantity || 1);
              }
            });
          });
        }

        // Calculate sales velocity (last 30 days)
        let salesLast30Days = 0;
        if (recentOrders) {
          recentOrders.forEach(order => {
            const items = order.line_items || [];
            items.forEach((item: any) => {
              if (item.product_id === product.product_id) {
                salesLast30Days += (item.quantity || 1);
              }
            });
          });
        }

        const salesVelocity = salesLast30Days / 30; // Sales per day
        const daysOfInventory = salesVelocity > 0 ? Math.floor(product.inventory / salesVelocity) : 999;

        // Low stock alert if less than 14 days of inventory
        const lowStockAlert = daysOfInventory < 14 && product.inventory > 0;

        // Calculate trending score (more recent sales = higher score)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        let salesLast7Days = 0;
        if (recentOrders) {
          recentOrders.forEach(order => {
            if (new Date(order.created_at) >= sevenDaysAgo) {
              const items = order.line_items || [];
              items.forEach((item: any) => {
                if (item.product_id === product.product_id) {
                  salesLast7Days += (item.quantity || 1);
                }
              });
            }
          });
        }

        // Trending score: weight recent sales more
        const trendingScore = (salesLast7Days * 3) + salesLast30Days;

        // Average order value
        const avgOrderValue = (totalSales || 0) > 0 ? totalRevenue / (totalSales || 1) : 0;

        // Upsert analytics
        await supabase.from("product_analytics").upsert({
          product_id: product.product_id,
          total_purchases: totalSales || 0,
          total_revenue: totalRevenue,
          average_order_value: avgOrderValue,
          current_stock: product.inventory,
          days_of_inventory: daysOfInventory,
          low_stock_alert: lowStockAlert,
          trending_score: trendingScore,
          sales_velocity: salesVelocity,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'product_id' });

        // Update shopify_products table
        await supabase
          .from("shopify_products")
          .update({
            total_sales: totalSales || 0,
            last_analytics_sync: new Date().toISOString()
          })
          .eq("product_id", product.product_id);

        console.log(`✅ ${product.title}: ${totalSales} sales, ${daysOfInventory} days inventory`);

      } catch (error) {
        console.error(`❌ Error processing ${product.title}:`, error);
      }
    }

    console.log("✅ Product analytics sync completed");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced analytics for ${products.length} products` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Analytics sync error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
