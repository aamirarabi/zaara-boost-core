-- Add video columns to shopify_products
ALTER TABLE shopify_products
ADD COLUMN IF NOT EXISTS demo_video_url TEXT,
ADD COLUMN IF NOT EXISTS review_video_url TEXT,
ADD COLUMN IF NOT EXISTS additional_videos JSONB;