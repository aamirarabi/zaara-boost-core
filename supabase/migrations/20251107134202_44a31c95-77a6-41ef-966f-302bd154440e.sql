-- Add review columns to shopify_products table
ALTER TABLE shopify_products
ADD COLUMN IF NOT EXISTS review_rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;