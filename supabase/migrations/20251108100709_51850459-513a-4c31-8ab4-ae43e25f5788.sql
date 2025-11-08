-- Create Judge.me settings table
CREATE TABLE IF NOT EXISTS judgeme_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT NOT NULL,
  public_token TEXT NOT NULL,
  private_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE judgeme_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "auth_all_judgeme_settings" ON judgeme_settings FOR ALL USING (true) WITH CHECK (true);