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
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Judge.me credentials
    const JUDGE_ME_API_TOKEN = Deno.env.get('JUDGE_ME_API_TOKEN');
    const JUDGE_ME_SHOP_DOMAIN = 'boost-lifestyle.myshopify.com';

    if (!JUDGE_ME_API_TOKEN) {
      throw new Error('Judge.me API token not configured. Please add JUDGE_ME_API_TOKEN to Supabase secrets.');
    }

    console.log('🔄 Starting Judge.me reviews sync...');

    // Fetch reviews from Judge.me API
    const reviewsResponse = await fetch(
      `https://judge.me/api/v1/reviews?shop_domain=${JUDGE_ME_SHOP_DOMAIN}&api_token=${JUDGE_ME_API_TOKEN}&per_page=250`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!reviewsResponse.ok) {
      const errorText = await reviewsResponse.text();
      throw new Error(`Judge.me API error: ${reviewsResponse.status} - ${errorText}. Check your API token and shop domain.`);
    }

    const reviewsData = await reviewsResponse.json();
    console.log(`📊 Found ${reviewsData.reviews?.length || 0} reviews from Judge.me`);

    if (!reviewsData.reviews || reviewsData.reviews.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No reviews found in Judge.me. If you have reviews, check your API token permissions.',
          synced_reviews: 0,
          products_updated: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let syncedCount = 0;
    const reviewsByProduct: { [key: string]: any[] } = {};

    // Process each review
    for (const review of reviewsData.reviews) {
      const productId = review.product_external_id;
      
      if (!productId) {
        console.log('⚠️ Review missing product_external_id:', review.id);
        continue;
      }
      
      const reviewData = {
        judge_me_id: review.id.toString(),
        product_id: productId,
        product_title: review.product_title,
        customer_name: review.reviewer?.name || 'Anonymous',
        customer_email: review.reviewer?.email || null,
        rating: review.rating,
        review_title: review.title || '',
        review_text: review.body || '',
        review_date: review.created_at,
        verified_purchase: review.verified === 'yes',
        helpful_count: review.curated?.votes_up || 0,
        pictures: review.pictures || [],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('product_reviews')
        .upsert(reviewData, {
          onConflict: 'judge_me_id'
        });

      if (error) {
        console.error(`❌ Error syncing review ${review.id}:`, error);
      } else {
        syncedCount++;
        if (!reviewsByProduct[productId]) {
          reviewsByProduct[productId] = [];
        }
        reviewsByProduct[productId].push(reviewData);
      }
    }

    console.log(`✅ Synced ${syncedCount} reviews`);

    // Update analytics for each product
    for (const [productId, reviews] of Object.entries(reviewsByProduct)) {
      const totalReviews = reviews.length;
      const ratings = reviews.map(r => r.rating);
      const averageRating = (ratings.reduce((a, b) => a + b, 0) / totalReviews).toFixed(2);

      const ratingCounts = {
        five_star_count: ratings.filter(r => r === 5).length,
        four_star_count: ratings.filter(r => r === 4).length,
        three_star_count: ratings.filter(r => r === 3).length,
        two_star_count: ratings.filter(r => r === 2).length,
        one_star_count: ratings.filter(r => r === 1).length,
      };

      const positiveReviews = reviews.filter(r => r.rating >= 4);
      const negativeReviews = reviews.filter(r => r.rating <= 3);
      
      const commonCompliments = extractCommonPhrases(
        positiveReviews.map(r => r.review_text).filter(Boolean)
      );
      
      const commonComplaints = extractCommonPhrases(
        negativeReviews.map(r => r.review_text).filter(Boolean)
      );

      await supabase.from('review_analytics').upsert({
        product_id: productId,
        product_title: reviews[0].product_title,
        total_reviews: totalReviews,
        average_rating: parseFloat(averageRating),
        ...ratingCounts,
        common_compliments: commonCompliments,
        common_complaints: commonComplaints,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id'
      });
    }

    console.log('✅ Judge.me sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        synced_reviews: syncedCount,
        products_updated: Object.keys(reviewsByProduct).length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error('❌ Judge.me sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to extract common phrases
function extractCommonPhrases(reviews: string[]): string[] {
  if (reviews.length === 0) return [];

  const positiveKeywords = [
    'comfortable', 'quality', 'excellent', 'great', 'amazing', 'perfect',
    'love', 'best', 'good', 'worth', 'recommend', 'sturdy', 'durable',
    'easy', 'fast delivery', 'battery life', 'sound quality', 'value for money'
  ];

  const negativeKeywords = [
    'uncomfortable', 'poor quality', 'delay', 'slow', 'broken', 'defect',
    'not worth', 'disappointed', 'issue', 'problem', 'hard to assemble', 
    'bad', 'waste', 'expensive'
  ];

  const keywords = reviews[0]?.includes('love') || reviews[0]?.includes('great') 
    ? positiveKeywords 
    : negativeKeywords;
  
  const counts: { [key: string]: number } = {};
  
  reviews.forEach(review => {
    const lowerReview = review.toLowerCase();
    keywords.forEach(keyword => {
      if (lowerReview.includes(keyword.toLowerCase())) {
        counts[keyword] = (counts[keyword] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([keyword]) => keyword);
}
