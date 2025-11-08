import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, RefreshCw, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductWithReviews {
  product_id: string;
  title: string;
  review_rating: number | null;
  review_count: number | null;
  images: any;
  handle: string;
}

const Reviews = () => {
  const [products, setProducts] = useState<ProductWithReviews[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Get all reviews (using correct column name: shopify_product_id)
    const { data: reviewsData } = await supabase
      .from("product_reviews")
      .select("shopify_product_id, rating");
    
    if (!reviewsData || reviewsData.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    
    // Get unique product IDs
    const productIds = [...new Set(reviewsData.map(r => r.shopify_product_id))];
    
    // Get products (joining by shopify_id column)
    const { data: productsData } = await supabase
      .from("shopify_products")
      .select("shopify_id, product_id, title, images, handle")
      .in("shopify_id", productIds);
    
    if (productsData) {
      // Calculate ratings for each product
      const enrichedProducts = productsData.map(product => {
        const productReviews = reviewsData.filter(r => r.shopify_product_id === product.shopify_id);
        const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
        
        return {
          product_id: product.product_id,
          title: product.title,
          images: product.images,
          handle: product.handle,
          review_rating: avgRating,
          review_count: productReviews.length
        };
      }).sort((a, b) => b.review_count - a.review_count);
      
      setProducts(enrichedProducts);
    }
    
    setLoading(false);
  };

  const syncProducts = async () => {
    setSyncing(true);
    toast("Syncing Reviews", {
      description: "Fetching reviews from Judge.me...",
    });

    const { data, error } = await supabase.functions.invoke("sync-judgeme-reviews");

    if (error) {
      toast("Sync Failed", {
        description: error.message,
      });
    } else if (data.error) {
      toast("Sync Failed", {
        description: data.error,
      });
    } else {
      toast("Sync Complete", {
        description: `Synced ${data.syncedReviews} reviews from ${data.productsProcessed} products`,
      });
      loadData();
    }

    setSyncing(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  const filteredProducts = products.filter((item) =>
    item.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Customer Reviews</h1>
            <p className="text-muted-foreground">Product reviews synced from Shopify (Judge.me integration)</p>
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
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                  <p className="text-xs text-muted-foreground">with reviews</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {products.reduce((sum, item) => sum + (item.review_count || 0), 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {products.length > 0
                      ? (products.reduce((sum, item) => sum + (item.review_rating || 0) * (item.review_count || 0), 0) /
                          products.reduce((sum, item) => sum + (item.review_count || 0), 0)).toFixed(2)
                      : '0.00'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No products with reviews found. Click "Sync from Shopify" to import products.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const images = JSON.parse(product.images || "[]");
                  const imageUrl = images[0] || "/placeholder.svg";
                  
                  return (
                    <Card key={product.product_id} className="overflow-hidden">
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-2">{product.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          {renderStars(Math.round(product.review_rating || 0))}
                          <span className="text-sm font-medium">{(product.review_rating || 0).toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">
                            ({product.review_count} reviews)
                          </span>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reviews;
