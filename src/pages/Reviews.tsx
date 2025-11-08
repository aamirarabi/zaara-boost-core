import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, RefreshCw, Search, Loader2, TrendingUp, TrendingDown, AlertCircle, Smile } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ProductReview {
  rating: number;
  title: string | null;
  body: string | null;
  verified_buyer: boolean;
  created_at_judgeme: string;
}

interface ProductWithReviews {
  product_id: string;
  title: string;
  review_rating: number | null;
  review_count: number | null;
  images: any;
  handle: string;
  reviews: ProductReview[];
  ratingDistribution: { [key: number]: number };
  commonComplaints: string[];
  commonCompliments: string[];
  verifiedBuyerPercentage: number;
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
    
    const { data: reviewsData } = await supabase
      .from("product_reviews")
      .select("shopify_product_id, rating, title, body, verified_buyer, created_at_judgeme");
    
    if (!reviewsData || reviewsData.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    
    const productIds = [...new Set(reviewsData.map(r => r.shopify_product_id))];
    
    const { data: productsData } = await supabase
      .from("shopify_products")
      .select("shopify_id, product_id, title, images, handle")
      .in("shopify_id", productIds);
    
    if (productsData) {
      const enrichedProducts = productsData.map(product => {
        const productReviews = reviewsData.filter(r => r.shopify_product_id === product.shopify_id);
        const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
        
        // Rating distribution
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        productReviews.forEach(r => {
          ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
        });
        
        // Verified buyer percentage
        const verifiedCount = productReviews.filter(r => r.verified_buyer).length;
        const verifiedBuyerPercentage = productReviews.length > 0 
          ? (verifiedCount / productReviews.length) * 100 
          : 0;
        
        // Sentiment analysis (simple keyword-based)
        const complaints = analyzeComplaints(productReviews);
        const compliments = analyzeCompliments(productReviews);
        
        return {
          product_id: product.product_id,
          title: product.title,
          images: product.images,
          handle: product.handle,
          review_rating: avgRating,
          review_count: productReviews.length,
          reviews: productReviews as ProductReview[],
          ratingDistribution,
          commonComplaints: complaints,
          commonCompliments: compliments,
          verifiedBuyerPercentage
        };
      }).sort((a, b) => b.review_count - a.review_count);
      
      setProducts(enrichedProducts);
    }
    
    setLoading(false);
  };

  const analyzeComplaints = (reviews: any[]): string[] => {
    const complaintKeywords = {
      'quality': ['poor quality', 'bad quality', 'low quality', 'cheap', 'broke', 'broken', 'damaged', 'defective'],
      'delivery': ['late delivery', 'delayed', 'never arrived', 'shipping', 'delivery time'],
      'comfort': ['uncomfortable', 'not comfortable', 'hurts', 'pain', 'hard'],
      'durability': ['fell apart', 'not durable', 'weak', 'flimsy', 'tear', 'ripped'],
      'size': ['too small', 'too big', 'wrong size', 'sizing'],
      'color': ['wrong color', 'color faded', 'different color'],
      'price': ['overpriced', 'expensive', 'not worth', 'waste of money']
    };
    
    const complaints: { [key: string]: number } = {};
    
    reviews.forEach(review => {
      const text = `${review.title || ''} ${review.body || ''}`.toLowerCase();
      
      Object.entries(complaintKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          complaints[category] = (complaints[category] || 0) + 1;
        }
      });
    });
    
    return Object.entries(complaints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => `${category} (${count})`);
  };

  const analyzeCompliments = (reviews: any[]): string[] => {
    const complimentKeywords = {
      'quality': ['great quality', 'good quality', 'high quality', 'excellent quality', 'premium'],
      'comfort': ['comfortable', 'cozy', 'soft', 'ergonomic'],
      'value': ['worth it', 'great value', 'good price', 'affordable', 'worth the money'],
      'delivery': ['fast delivery', 'quick shipping', 'arrived quickly'],
      'design': ['beautiful', 'gorgeous', 'stylish', 'looks great', 'aesthetic'],
      'durability': ['durable', 'sturdy', 'strong', 'well-made', 'solid'],
      'recommendation': ['highly recommend', 'recommend', 'love it', 'perfect', 'amazing']
    };
    
    const compliments: { [key: string]: number } = {};
    
    reviews.forEach(review => {
      const text = `${review.title || ''} ${review.body || ''}`.toLowerCase();
      
      Object.entries(complimentKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          compliments[category] = (compliments[category] || 0) + 1;
        }
      });
    });
    
    return Object.entries(compliments)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => `${category} (${count})`);
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
        description: `Synced ${data.summary?.reviewsSynced || 0} reviews from ${data.summary?.productsWithReviews || 0} products`,
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
            className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}
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
            <p className="text-muted-foreground">Product reviews synced from Judge.me with insights</p>
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
                Sync from Judge.me
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
                  <p className="text-muted-foreground">No products with reviews found. Click "Sync from Judge.me" to import products.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const images = JSON.parse(product.images || "[]");
                  const imageUrl = images[0] || "/placeholder.svg";
                  
                  return (
                    <Card key={product.product_id} className="overflow-hidden">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                        {/* Product Info */}
                        <div className="flex gap-4">
                          <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                            <img
                              src={imageUrl}
                              alt={product.title}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg line-clamp-2">{product.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              {renderStars(Math.round(product.review_rating || 0))}
                              <span className="text-sm font-medium">{(product.review_rating || 0).toFixed(1)}</span>
                              <span className="text-sm text-muted-foreground">
                                ({product.review_count} reviews)
                              </span>
                            </div>
                            <div className="mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {product.verifiedBuyerPercentage.toFixed(0)}% Verified Buyers
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Rating Distribution */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm mb-3">Rating Distribution</h4>
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = product.ratingDistribution[rating] || 0;
                            const percentage = product.review_count ? (count / product.review_count) * 100 : 0;
                            
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <span className="text-xs w-8">{rating} ★</span>
                                <Progress value={percentage} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Insights */}
                        <div className="space-y-4">
                          {/* Compliments */}
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <Smile className="h-4 w-4 text-green-600" />
                              Top Compliments
                            </h4>
                            {product.commonCompliments.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {product.commonCompliments.map((compliment, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                                    {compliment}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No patterns found</p>
                            )}
                          </div>

                          {/* Complaints */}
                          <div>
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              Top Complaints
                            </h4>
                            {product.commonComplaints.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {product.commonComplaints.map((complaint, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                                    <TrendingDown className="h-3 w-3 mr-1 text-orange-600" />
                                    {complaint}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No complaints found</p>
                            )}
                          </div>
                        </div>
                      </div>
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
