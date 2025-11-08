-- Drop existing incorrect tables
DROP TABLE IF EXISTS public.product_reviews CASCADE;
DROP TABLE IF EXISTS public.review_analytics CASCADE;

-- Create product_reviews table with CORRECT column names matching sync function
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judgeme_id TEXT UNIQUE NOT NULL,
  product_handle TEXT NOT NULL,
  shopify_product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  reviewer_name TEXT NOT NULL DEFAULT 'Anonymous',
  reviewer_email TEXT,
  reviewer_location TEXT,
  verified_buyer BOOLEAN DEFAULT false,
  pictures JSONB DEFAULT '[]'::jsonb,
  created_at_judgeme TIMESTAMPTZ,
  updated_at_judgeme TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_reviews_product ON public.product_reviews(shopify_product_id);
CREATE INDEX idx_reviews_rating ON public.product_reviews(rating DESC);
CREATE INDEX idx_reviews_judgeme ON public.product_reviews(judgeme_id);
CREATE INDEX idx_reviews_handle ON public.product_reviews(product_handle);
CREATE INDEX idx_reviews_created ON public.product_reviews(created_at_judgeme DESC);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create policy allowing all operations
CREATE POLICY "auth_all_product_reviews" ON public.product_reviews
FOR ALL USING (true) WITH CHECK (true);

-- Add api_password column to courier_settings if not exists
ALTER TABLE public.courier_settings 
ADD COLUMN IF NOT EXISTS api_password TEXT;