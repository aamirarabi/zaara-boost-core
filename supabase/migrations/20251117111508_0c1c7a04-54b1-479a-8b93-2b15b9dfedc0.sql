-- Add order_source column for tracking ad campaigns
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'Organic';

-- Add delivery_city column if not exists
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS delivery_city TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_source ON shopify_orders(order_source);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_delivery_city ON shopify_orders(delivery_city);

-- Update courier_name to standardize "Other" → "PostEx" for existing data
UPDATE shopify_orders
SET courier_name = 'PostEx'
WHERE courier_name IN ('Other', 'other', 'OTHER');

COMMENT ON COLUMN shopify_orders.order_source IS 'Order source: Organic, Facebook Ads, Google Ads, Instagram, TikTok, etc.';
COMMENT ON COLUMN shopify_orders.delivery_city IS 'Destination city for delivery';

-- Add SLA (Service Level Agreement) columns to courier_settings for flexible delivery time management
ALTER TABLE courier_settings
ADD COLUMN IF NOT EXISTS sla_days_karachi INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS sla_days_other INTEGER DEFAULT 5;

COMMENT ON COLUMN courier_settings.sla_days_karachi IS 'Expected delivery days for Karachi - you can update this anytime';
COMMENT ON COLUMN courier_settings.sla_days_other IS 'Expected delivery days for other cities - you can update this anytime';

-- Set default SLA values for existing couriers (STANDARD: 2 days Karachi, 5 days Other)
UPDATE courier_settings SET sla_days_karachi = 2, sla_days_other = 5 WHERE courier_name = 'PostEx';
UPDATE courier_settings SET sla_days_karachi = 2, sla_days_other = 5 WHERE courier_name = 'Leopards';

-- Insert settings for PostEx if not exists
INSERT INTO courier_settings (courier_name, display_name, sla_days_karachi, sla_days_other, api_endpoint, is_active)
VALUES ('PostEx', 'PostEx', 2, 5, 'https://api.postex.pk/services/integration/api/order/v1/track-order', true)
ON CONFLICT (courier_name) DO UPDATE 
SET sla_days_karachi = 2, sla_days_other = 5, api_endpoint = EXCLUDED.api_endpoint;

-- Insert settings for Leopards if not exists
INSERT INTO courier_settings (courier_name, display_name, sla_days_karachi, sla_days_other, api_endpoint, is_active)
VALUES ('Leopards', 'Leopards Courier', 2, 5, 'https://merchantapi.leopardscourier.com/api/trackBookedPacket/format/json/', true)
ON CONFLICT (courier_name) DO UPDATE 
SET sla_days_karachi = 2, sla_days_other = 5, api_endpoint = EXCLUDED.api_endpoint;