import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, Loader2 } from "lucide-react";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("shopify_products").select("*").order("title");
    if (data) setProducts(data);
  };

  const syncProducts = async () => {
    setSyncing(true);
    const { data: settings } = await supabase.from("system_settings").select("*");
    
    const storeUrl = settings?.find((s) => s.setting_key === "shopify_store_url")?.setting_value;
    const token = settings?.find((s) => s.setting_key === "shopify_access_token")?.setting_value;

    if (!storeUrl || !token) {
      toast.error("Please configure Shopify credentials in Settings");
      setSyncing(false);
      return;
    }

    try {
      let allProducts: any[] = [];
      let url = `https://${storeUrl}/admin/api/2024-10/products.json?limit=250`;

      while (url) {
        const res = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
        const data = await res.json();
        
        if (data.products) {
          allProducts.push(...data.products);
        }

        const linkHeader = res.headers.get("Link");
        url = linkHeader?.includes('rel="next"') ? linkHeader.match(/<(.+?)>; rel="next"/)?.[1] || null : null;
      }

      const productsToUpsert = allProducts.map((p) => ({
        product_id: p.id.toString(),
        shopify_id: p.id.toString(),
        title: p.title,
        description: p.body_html,
        vendor: p.vendor,
        product_type: p.product_type,
        handle: p.handle,
        status: p.status,
        tags: p.tags?.split(",").map((t: string) => t.trim()) || [],
        images: JSON.stringify(p.images?.map((img: any) => img.src) || []),
        variants: JSON.stringify(p.variants || []),
        price: parseFloat(p.variants[0]?.price || "0"),
        inventory: p.variants.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0),
        synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("shopify_products").upsert(productsToUpsert);

      if (error) {
        toast.error("Failed to sync products");
      } else {
        toast.success(`✅ Synced ${productsToUpsert.length} products!`);
        loadProducts();
      }
    } catch (error) {
      toast.error("Error syncing products");
    }
    setSyncing(false);
  };

  const filteredProducts = products.filter((product) =>
    product.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Button onClick={syncProducts} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync from Shopify
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const images = JSON.parse(product.images || "[]");
            return (
              <Card key={product.product_id}>
                <CardContent className="p-4">
                  {images[0] && (
                    <img
                      src={images[0]}
                      alt={product.title}
                      className="w-full h-48 object-cover rounded-md mb-4"
                    />
                  )}
                  <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-primary">PKR {product.price?.toLocaleString()}</span>
                    <Badge variant={product.inventory > 0 ? "default" : "destructive"}>
                      {product.inventory > 0 ? `Stock: ${product.inventory}` : "Out of Stock"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.product_type} • {product.vendor}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Products;