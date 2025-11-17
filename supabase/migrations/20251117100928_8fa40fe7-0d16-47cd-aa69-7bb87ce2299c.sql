-- Add new columns to shopify_orders table for enhanced tracking
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS courier_estimated_delivery TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS courier_api_status TEXT,
ADD COLUMN IF NOT EXISTS courier_last_updated TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_dispatched ON shopify_orders(dispatched_at);
CREATE INDEX IF NOT EXISTS idx_orders_courier_eta ON shopify_orders(courier_estimated_delivery);

-- Update dispatched_at for existing fulfilled orders (use fulfillment date)
UPDATE shopify_orders 
SET dispatched_at = created_at 
WHERE fulfillment_status = 'fulfilled' 
AND dispatched_at IS NULL;