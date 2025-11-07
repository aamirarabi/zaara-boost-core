import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, TrendingDown, RefreshCw, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReviewAnalytics {
  product_id: string;
  product_title: string;
  total_reviews: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  common_compliments: string[];
  common_complaints: string[];
  last_synced_at: string;
}

interface ProductReview {
  id: string;
  product_title: string;
  customer_name: string;
  rating: number;
  review_title: string;
  review_text: string;
  review_date: string;
  verified_purchase: boolean;
  helpful_count: number;
}

const Reviews = () => {
  const [analytics, setAnalytics] = useState<ReviewAnalytics[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const { data: analyticsData } = await supabase
      .from("review_analytics")
      .select("*")
      .order("total_reviews", { ascending: false });
    
    if (analyticsData) {
      setAnalytics(analyticsData);
    }
    
    const { data: reviewsData } = await supabase
      .from("product_reviews")
      .select("*")
      .order("review_date", { ascending: false })
      .limit(50);
    
    if (reviewsData) {
      setReviews(reviewsData);
    }
    
    setLoading(false);
  };

  const syncReviews = async () => {
    setSyncing(true);
    toast("Syncing Reviews", {
      description: "Fetching latest reviews from Judge.me...",
    });

    const { data, error } = await supabase.functions.invoke("sync-judge-me-reviews");

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
        description: `Synced ${data.synced_reviews} reviews for ${data.products_updated} products`,
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

  const filteredAnalytics = analytics.filter((item) =>
    item.product_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Customer Reviews</h1>
            <p className="text-muted-foreground">Manage and analyze product reviews from Judge.me</p>
          </div>
          <Button onClick={syncReviews} disabled={syncing}>
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
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">By Product</TabsTrigger>
              <TabsTrigger value="recent">Recent Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.length}</div>
                    <p className="text-xs text-muted-foreground">with reviews</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.reduce((sum, item) => sum + item.total_reviews, 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.length > 0
                        ? (analytics.reduce((sum, item) => sum + item.average_rating * item.total_reviews, 0) /
                            analytics.reduce((sum, item) => sum + item.total_reviews, 0)).toFixed(2)
                        : '0.00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Last Synced</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {analytics[0]?.last_synced_at 
                        ? new Date(analytics[0].last_synced_at).toLocaleString()
                        : 'Never'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              {filteredAnalytics.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No reviews found. Click "Sync from Judge.me" to import reviews.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredAnalytics.map((item) => (
                  <Card key={item.product_id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{item.product_title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {renderStars(Math.round(item.average_rating))}
                        <span className="text-sm font-medium">{item.average_rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({item.total_reviews} reviews)
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const countKey = `${['one', 'two', 'three', 'four', 'five'][stars - 1]}_star_count` as keyof ReviewAnalytics;
                            const count = item[countKey] as number;
                            const percentage = (count / item.total_reviews) * 100;
                            return (
                              <div key={stars} className="flex items-center gap-2">
                                <span className="text-sm w-8">{stars}★</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground w-12 text-right">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {item.common_compliments && item.common_compliments.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp size={16} className="text-green-600" />
                              <span className="text-sm font-medium">Most Mentioned (Positive)</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {item.common_compliments.map((compliment) => (
                                <Badge key={compliment} variant="secondary" className="bg-green-100 text-green-800">
                                  {compliment}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.common_complaints && item.common_complaints.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingDown size={16} className="text-red-600" />
                              <span className="text-sm font-medium">Common Issues</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {item.common_complaints.map((complaint) => (
                                <Badge key={complaint} variant="secondary" className="bg-red-100 text-red-800">
                                  {complaint}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No reviews found. Click "Sync from Judge.me" to import reviews.</p>
                  </CardContent>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{review.product_title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            {review.verified_purchase && (
                              <Badge variant="secondary" className="text-xs">✓ Verified</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(review.review_date).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {review.review_title && (
                        <p className="font-medium mb-2">{review.review_title}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-2">{review.review_text}</p>
                      <p className="text-sm font-medium">- {review.customer_name}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default Reviews;
