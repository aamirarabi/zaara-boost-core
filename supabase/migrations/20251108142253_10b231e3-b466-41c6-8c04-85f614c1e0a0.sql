-- Add delivery confirmation fields to shopify_orders
ALTER TABLE shopify_orders
ADD COLUMN IF NOT EXISTS actual_delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivered_to_name text,
ADD COLUMN IF NOT EXISTS delivered_to_relation text,
ADD COLUMN IF NOT EXISTS delivery_proof_url text,
ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Add comment for documentation
COMMENT ON COLUMN shopify_orders.actual_delivered_at IS 'Actual timestamp when package was delivered';
COMMENT ON COLUMN shopify_orders.delivered_to_name IS 'Name of person who received the package';
COMMENT ON COLUMN shopify_orders.delivered_to_relation IS 'Relation to customer (Self, Family Member, Neighbor, Security, etc.)';
COMMENT ON COLUMN shopify_orders.delivery_proof_url IS 'URL to delivery proof image/signature';
COMMENT ON COLUMN shopify_orders.delivery_notes IS 'Additional delivery notes from courier';