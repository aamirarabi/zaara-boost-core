-- Create product waitlist table
CREATE TABLE IF NOT EXISTS public.product_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_waitlist_phone ON public.product_waitlist(customer_phone);
CREATE INDEX IF NOT EXISTS idx_product_waitlist_product ON public.product_waitlist(product_id);
CREATE INDEX IF NOT EXISTS idx_product_waitlist_notified ON public.product_waitlist(notified) WHERE notified = FALSE;

-- Enable RLS
ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view all waitlist entries
CREATE POLICY "Allow authenticated users to view waitlist"
  ON public.product_waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to manage waitlist
CREATE POLICY "Allow authenticated users to manage waitlist"
  ON public.product_waitlist
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create courier settings table
CREATE TABLE IF NOT EXISTS public.courier_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  api_key TEXT,
  api_endpoint TEXT,
  karachi_delivery_days INTEGER DEFAULT 2,
  outside_karachi_delivery_days INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.courier_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage courier settings"
  ON public.courier_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default courier configurations
INSERT INTO public.courier_settings (courier_name, display_name, api_key, api_endpoint, karachi_delivery_days, outside_karachi_delivery_days)
VALUES 
  ('Leopards', 'Leopards Courier', '487F7B22F68312D2C1BBC93B1AEA445B1755080352', 'https://leopardscourier.pk/api/tracking', 2, 5),
  ('PostEx', 'PostEx', 'N2FkOTMyYzJmNzUyNDVkNjkyNWFiNmVlYTAzNTMyMWQ6OTBiY2VkNTBmOGRiNDExNWEwNDg2YjcxZjczMjAxOGE=', 'https://api.postex.pk/services/integration/api/order/v1/track-order', 2, 5),
  ('Other', 'PostEx', 'N2FkOTMyYzJmNzUyNDVkNjkyNWFiNmVlYTAzNTMyMWQ6OTBiY2VkNTBmOGRiNDExNWEwNDg2YjcxZjczMjAxOGE=', 'https://api.postex.pk/services/integration/api/order/v1/track-order', 2, 5)
ON CONFLICT (courier_name) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_courier_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courier_settings_updated_at
  BEFORE UPDATE ON public.courier_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_courier_settings_updated_at();