-- Add missing fields to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;

-- Add customer_id foreign key to shopify_orders (text type to match phone_number)
ALTER TABLE public.shopify_orders 
ADD COLUMN IF NOT EXISTS customer_id text REFERENCES public.customers(phone_number);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_shopify_id ON public.customers(shopify_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON public.shopify_orders(shopify_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.shopify_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.shopify_orders(order_number);

-- Add last sync timestamps to system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('last_customer_sync', NULL, 'Last customer sync timestamp'),
  ('last_order_sync', NULL, 'Last order sync timestamp')
ON CONFLICT (setting_key) DO NOTHING;