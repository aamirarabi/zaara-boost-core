import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string;
  body: string;
  product_handle: string;
  verified_buyer: boolean;
  created_at_judgeme: string;
}

export const LatestReviewsWidget = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avgRating: 0, verifiedCount: 0 });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at_judgeme', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data && data.length > 0) {
        setReviews(data as Review[]);
        const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        const verifiedCount = data.filter(r => r.verified_buyer).length;
        setStats({ avgRating: Math.round(avgRating * 10) / 10, verifiedCount });
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < rating ? 'fill-boost-yellow text-boost-yellow' : 'text-gray-300'}`}
      />
    ));
  };

  if (reviews.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-lg border border-gray-100 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-boost-amber" />
            Latest Customer Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-muted-foreground">No reviews yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-lg border border-gray-100 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-boost-amber" />
          Latest Customer Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.map((review, index) => (
          <div
            key={review.id}
            className={`p-3 rounded-lg border transition-all duration-300 hover:shadow-md ${
              index === 0
                ? 'bg-gradient-to-br from-boost-yellow/10 to-boost-amber/5 border-boost-yellow/20'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {review.reviewer_name || 'Anonymous'}
                  </span>
                  {review.verified_buyer && (
                    <Badge variant="secondary" className="text-xs px-2 py-0 bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(review.rating)}</div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at_judgeme), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            {review.title && (
              <div className="font-semibold text-sm mb-1">{review.title}</div>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {review.body}
            </p>
            <Badge variant="outline" className="text-xs">
              {review.product_handle}
            </Badge>
          </div>
        ))}

        {/* Stats Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-boost-yellow text-boost-yellow" />
            <span className="text-sm font-semibold">{stats.avgRating}</span>
            <span className="text-xs text-muted-foreground">Avg Rating</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />
            {stats.verifiedCount} Verified
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
