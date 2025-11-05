import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, Loader2, Package, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { formatPKRCurrency } from "@/lib/utils";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  useEffect(() => {
    loadProducts();
    loadStats();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("shopify_products").select("*").order("title");
    if (data) setProducts(data);
  };

  const loadStats = async () => {
    // Get total products
    const { count: total } = await supabase
      .from("shopify_products")
      .select("*", { count: "exact", head: true });

    // Get in-stock products (inventory > 0)
    const { count: inStock } = await supabase
      .from("shopify_products")
      .select("*", { count: "exact", head: true })
      .gt("inventory", 0);

    // Get out-of-stock products (inventory = 0 or NULL)
    const { count: outOfStock } = await supabase
      .from("shopify_products")
      .select("*", { count: "exact", head: true })
      .or("inventory.eq.0,inventory.is.null");

    // Get low-stock products (inventory > 0 AND inventory < 10)
    const { count: lowStock } = await supabase
      .from("shopify_products")
      .select("*", { count: "exact", head: true })
      .gt("inventory", 0)
      .lt("inventory", 10);

    setStats({
      total: total || 0,
      inStock: inStock || 0,
      outOfStock: outOfStock || 0,
      lowStock: lowStock || 0,
    });
  };

  const syncProducts = async () => {
    setSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-products');

      if (error) {
        toast.error(error.message || "Failed to sync products");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`✅ Synced ${data.count} products!`);
        loadProducts();
        loadStats();
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inStock}</div>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outOfStock}</div>
              <p className="text-xs text-muted-foreground">Unavailable</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">&lt; 10 items</p>
            </CardContent>
          </Card>
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
                    <span className="text-lg font-bold text-primary">{formatPKRCurrency(product.price)}</span>
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