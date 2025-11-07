-- Part 1: Add metafields and all_images to shopify_products
ALTER TABLE shopify_products 
ADD COLUMN IF NOT EXISTS metafields JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS all_images JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_shopify_products_metafields 
ON shopify_products USING gin(metafields);

-- Part 2: Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_me_id TEXT UNIQUE,
  product_id TEXT NOT NULL,
  product_title TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title TEXT,
  review_text TEXT,
  review_date TIMESTAMPTZ NOT NULL,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  pictures JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_date ON product_reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_judge_me_id ON product_reviews(judge_me_id);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_product_reviews" 
  ON product_reviews 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Part 3: Create review_analytics table
CREATE TABLE IF NOT EXISTS review_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE NOT NULL,
  product_title TEXT,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  common_compliments TEXT[] DEFAULT '{}',
  common_complaints TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_analytics_product_id ON review_analytics(product_id);

ALTER TABLE review_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_review_analytics" 
  ON review_analytics 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Part 4: Add order source and delivery tracking columns
ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'Organic',
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'On Schedule';

CREATE INDEX IF NOT EXISTS idx_shopify_orders_source ON shopify_orders(order_source);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_delivery_status ON shopify_orders(delivery_status);

-- Part 5: Update courier settings for PostEx (Other)
INSERT INTO courier_settings (
  courier_name,
  display_name,
  api_endpoint,
  karachi_delivery_days,
  outside_karachi_delivery_days,
  is_active
) VALUES (
  'Other',
  'PostEx',
  'https://api.postex.pk/services/integration/api/order/v1/track-order',
  2,
  5,
  true
)
ON CONFLICT (courier_name) 
DO UPDATE SET
  display_name = 'PostEx',
  api_endpoint = 'https://api.postex.pk/services/integration/api/order/v1/track-order';

INSERT INTO courier_settings (
  courier_name,
  display_name,
  api_endpoint,
  karachi_delivery_days,
  outside_karachi_delivery_days,
  is_active
) VALUES (
  'PostEx',
  'PostEx',
  'https://api.postex.pk/services/integration/api/order/v1/track-order',
  2,
  5,
  true
)
ON CONFLICT (courier_name) 
DO UPDATE SET
  api_endpoint = 'https://api.postex.pk/services/integration/api/order/v1/track-order';

UPDATE courier_settings 
SET api_endpoint = 'https://leopardscourier.com/api/track'
WHERE courier_name = 'Leopards';