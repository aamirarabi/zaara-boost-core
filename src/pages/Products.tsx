import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, Loader2, Package, CheckCircle, XCircle, AlertTriangle, Video, Star, X, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatPKRCurrency } from "@/lib/utils";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
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
    setLoading(true);
    const { data } = await supabase.from("shopify_products").select("*").order("title");
    
    if (data) {
      // Fetch review stats for each product
      const productsWithStats = await Promise.all(
        data.map(async (product) => {
          // Get review count
          const { count: reviewCount } = await supabase
            .from('product_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('shopify_product_id', product.shopify_id);
          
          // Get all ratings for average
          const { data: ratings } = await supabase
            .from('product_reviews')
            .select('rating')
            .eq('shopify_product_id', product.shopify_id);
          
          // Calculate average
          let avgRating = null;
          if (ratings && ratings.length > 0) {
            const total = ratings.reduce((sum, r) => sum + r.rating, 0);
            avgRating = (total / ratings.length).toFixed(1);
          }
          
          return {
            ...product,
            review_count: reviewCount || 0,
            average_rating: avgRating
          };
        })
      );
      
      setProducts(productsWithStats);
    }
    setLoading(false);
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

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const METAFIELD_DISPLAY_NAMES: Record<string, string> = {
              'product_demo_video': 'Product Demo Video',
              'custom.product_demo_video': 'Product Demo Video',
              'Product Review Video': 'Product Review Video',
              'Assembly or Unboxing Video': 'Assembly or Unboxing Video',
              'Product DVC': 'Product DVC'
            };

            const images = JSON.parse(product.images || "[]");
            const metafields = product.metafields || {};
            const hasVideo = metafields.product_video ? true : false;
            const reviewCount = product.review_count || 0;
            const avgRating = product.average_rating || null;
            const isExpanded = expandedProduct === product.product_id;
            
            // Extract video metafields
            const videoMetafields = Object.entries(metafields).filter(([key]) => 
              key.toLowerCase().includes('video')
            );
            
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
                  
                  {/* Video and Reviews Info */}
                  <div className="flex justify-between items-center mb-2 text-sm">
                    {/* Video */}
                    <div className="flex items-center gap-1">
                      {hasVideo ? (
                        <>
                          <Video className="h-4 w-4 text-green-500" />
                          <a 
                            href={metafields.product_video} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </a>
                        </>
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Reviews */}
                    <div className="flex items-center gap-1">
                      {reviewCount > 0 ? (
                        <>
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-semibold">{avgRating}/5</span>
                          <span className="text-xs text-gray-500">({reviewCount})</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">No reviews</span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {product.product_type} • {product.vendor}
                  </p>

                  {/* Detailed Metadata Section */}
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedProduct(isExpanded ? null : product.product_id)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Database className="h-4 w-4 mr-2" />
                        {isExpanded ? "Hide" : "Show"} Shopify Data
                        {isExpanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-2 border-t pt-3">
                      {/* Basic Info */}
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shopify ID:</span>
                          <span className="font-mono">{product.shopify_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Product ID:</span>
                          <span className="font-mono">{product.product_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {product.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Synced:</span>
                          <span>{product.synced_at ? new Date(product.synced_at).toLocaleString() : 'Never'}</span>
                        </div>
                      </div>

                      {/* Video Metafields */}
                      <div className="border-t pt-2">
                        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          Video Metafields ({videoMetafields.length})
                        </h4>
                        {videoMetafields.length > 0 ? (
                          <div className="space-y-2">
                            {videoMetafields.map(([key, value]) => {
                              const displayName = METAFIELD_DISPLAY_NAMES[key] || key;
                              return (
                                <div key={key} className="bg-muted/50 rounded p-2 text-xs">
                                  <div className="font-semibold text-primary mb-1">📹 {displayName}</div>
                                  <div className="font-mono text-[10px] break-all">
                                    {typeof value === 'string' && value.startsWith('http') ? (
                                      <a 
                                        href={value} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline"
                                      >
                                        {value}
                                      </a>
                                    ) : (
                                      String(typeof value === 'object' ? JSON.stringify(value) : value)
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No video metafields found</p>
                        )}
                      </div>

                      {/* All Metafields */}
                      <div className="border-t pt-2">
                        <h4 className="text-xs font-semibold mb-2">
                          All Metafields ({Object.keys(metafields).length})
                        </h4>
                        {Object.keys(metafields).length > 0 ? (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {Object.entries(metafields).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs border-b pb-1">
                                <span className="font-semibold text-primary">{key}:</span>
                                <span className="font-mono text-[10px] text-right max-w-[60%] truncate" title={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No metafields found</p>
                        )}
                      </div>

                      {/* Variants */}
                      <div className="border-t pt-2">
                        <h4 className="text-xs font-semibold mb-2">
                          Variants ({JSON.parse(product.variants || '[]').length})
                        </h4>
                        <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                          {JSON.parse(product.variants || '[]').map((variant: any, idx: number) => (
                            <div key={idx} className="border-b pb-1">
                              <div className="font-mono">{variant.title || 'Default'}</div>
                              <div className="text-muted-foreground">SKU: {variant.sku || 'N/A'} • Stock: {variant.inventory_quantity || 0}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}
      </div>
    </Layout>
  );
};

export default Products;