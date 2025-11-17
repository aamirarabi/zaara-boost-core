-- Migration: Add order_source and SLA columns for courier performance tracking
-- Purpose: Track ad campaign sources and flexible SLA settings

-- 1. Add order_source column to track ad campaigns
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'Organic';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_source 
ON shopify_orders(order_source);

-- 2. Standardize existing courier names ("Other" → "PostEx")
UPDATE shopify_orders
SET courier_name = 'PostEx'
WHERE courier_name IN ('Other', 'other', 'OTHER');

-- 3. Add SLA columns to courier_settings
ALTER TABLE courier_settings
ADD COLUMN IF NOT EXISTS sla_days_karachi INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS sla_days_other INTEGER DEFAULT 5;

-- 4. Initialize SLA values for existing couriers (STANDARD: 2/5 days)
INSERT INTO courier_settings (courier_name, display_name, sla_days_karachi, sla_days_other)
VALUES 
  ('PostEx', 'PostEx', 2, 5),
  ('Leopards', 'Leopards Courier', 2, 5)
ON CONFLICT (courier_name) 
DO UPDATE SET 
  sla_days_karachi = EXCLUDED.sla_days_karachi,
  sla_days_other = EXCLUDED.sla_days_other;

-- Add helpful comments
COMMENT ON COLUMN shopify_orders.order_source IS 'Order source: Organic, Facebook Ads, Google Ads, Instagram, TikTok, etc.';
COMMENT ON COLUMN courier_settings.sla_days_karachi IS 'Expected delivery days for Karachi';
COMMENT ON COLUMN courier_settings.sla_days_other IS 'Expected delivery days for other cities';