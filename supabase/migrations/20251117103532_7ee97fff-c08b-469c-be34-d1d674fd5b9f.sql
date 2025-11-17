-- Add new tracking columns to shopify_orders table
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS courier_estimated_delivery TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS courier_api_status TEXT,
ADD COLUMN IF NOT EXISTS courier_last_updated TIMESTAMPTZ;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_fulfilled_at ON shopify_orders(fulfilled_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_dispatched_at ON shopify_orders(dispatched_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_delivered_at ON shopify_orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_courier_name ON shopify_orders(courier_name);

-- Update existing orders to set dispatched_at from created_at for fulfilled orders
UPDATE shopify_orders
SET dispatched_at = created_at
WHERE fulfillment_status = 'fulfilled' AND dispatched_at IS NULL;

COMMENT ON COLUMN shopify_orders.fulfilled_at IS 'Date when order was marked as fulfilled in Shopify';
COMMENT ON COLUMN shopify_orders.dispatched_at IS 'Date when order was dispatched from warehouse';
COMMENT ON COLUMN shopify_orders.delivered_at IS 'Date when order was delivered to customer';
COMMENT ON COLUMN shopify_orders.courier_estimated_delivery IS 'Estimated delivery date from courier API';
COMMENT ON COLUMN shopify_orders.courier_api_status IS 'Current status from courier tracking API';
COMMENT ON COLUMN shopify_orders.courier_last_updated IS 'Last time courier status was updated';