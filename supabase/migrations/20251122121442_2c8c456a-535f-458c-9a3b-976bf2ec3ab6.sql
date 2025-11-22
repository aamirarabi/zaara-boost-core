-- Table: product_analytics
-- Purpose: Track product performance metrics for CSR and admin insights

CREATE TABLE IF NOT EXISTS product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES shopify_products(product_id) ON DELETE CASCADE,
  
  -- View metrics
  total_views INTEGER DEFAULT 0,
  views_last_7_days INTEGER DEFAULT 0,
  views_last_30_days INTEGER DEFAULT 0,
  
  -- Conversion metrics
  total_add_to_cart INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  cart_conversion_rate DECIMAL(5,2),
  
  -- Revenue metrics
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_order_value DECIMAL(10,2),
  
  -- Inventory insights
  current_stock INTEGER DEFAULT 0,
  days_of_inventory INTEGER,
  low_stock_alert BOOLEAN DEFAULT FALSE,
  
  -- Trend indicators
  trending_score INTEGER DEFAULT 0,
  sales_velocity DECIMAL(8,2),
  
  -- Timestamps
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(product_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_trending ON product_analytics(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_conversion ON product_analytics(conversion_rate DESC);

-- Add analytics columns to shopify_products table
ALTER TABLE shopify_products
ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analytics_sync TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read analytics"
ON product_analytics FOR SELECT
USING (true);

CREATE POLICY "Admin can manage product_analytics"
ON product_analytics FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));