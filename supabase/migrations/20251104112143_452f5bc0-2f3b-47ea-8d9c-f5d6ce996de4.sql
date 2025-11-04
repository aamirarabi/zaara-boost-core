-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_system_settings" ON system_settings
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, is_encrypted, description) VALUES
('whatsapp_phone_id', '', true, 'WhatsApp Phone ID'),
('whatsapp_access_token', '', true, 'WhatsApp Access Token'),
('whatsapp_business_account_id', '', true, 'WhatsApp Business Account ID'),
('whatsapp_phone_number', '923288981133', false, 'WhatsApp Phone Number'),
('openai_api_key', '', true, 'OpenAI API Key'),
('shopify_store_url', 'boost-lifestyle.myshopify.com', false, 'Shopify Store URL'),
('shopify_access_token', '', true, 'Shopify Access Token'),
('postex_api_key', '', true, 'PostEx API Key'),
('leopards_api_key', '', true, 'Leopards API Key')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  phone_number TEXT PRIMARY KEY,
  customer_name TEXT,
  email TEXT,
  customer_type TEXT CHECK (customer_type IN ('B2B', 'D2C')) DEFAULT 'D2C',
  total_spend NUMERIC DEFAULT 0,
  order_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  last_products_viewed TEXT[] DEFAULT '{}',
  shopify_customer_id TEXT,
  last_order_date TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_customers" ON customers
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_shopify_id ON customers(shopify_customer_id);

-- 3. FAQ Vectors Table
CREATE TABLE IF NOT EXISTS faq_vectors (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  keywords TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  related_products TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE faq_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_faq_vectors" ON faq_vectors
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_faq_question ON faq_vectors USING gin(to_tsvector('english', question));
CREATE INDEX IF NOT EXISTS idx_faq_answer ON faq_vectors USING gin(to_tsvector('english', answer));
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_vectors(category);

-- FAQ Search Function
CREATE OR REPLACE FUNCTION search_faqs(search_term TEXT, result_limit INT DEFAULT 5)
RETURNS TABLE (
  id TEXT,
  question TEXT,
  answer TEXT,
  category TEXT,
  video_urls TEXT[],
  image_urls TEXT[],
  related_products TEXT[],
  relevance_score INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.category,
    f.video_urls,
    f.image_urls,
    f.related_products,
    CASE 
      WHEN LOWER(f.question) = LOWER(search_term) THEN 100
      WHEN LOWER(f.question) LIKE LOWER(search_term) || '%' THEN 90
      WHEN LOWER(f.question) LIKE '%' || LOWER(search_term) || '%' THEN 70
      WHEN LOWER(f.answer) LIKE '%' || LOWER(search_term) || '%' THEN 50
      ELSE 0
    END as relevance_score
  FROM faq_vectors f
  WHERE f.is_active = true
    AND (
      LOWER(f.question) LIKE '%' || LOWER(search_term) || '%' 
      OR LOWER(f.answer) LIKE '%' || LOWER(search_term) || '%'
      OR search_term = ANY(f.keywords)
    )
  ORDER BY relevance_score DESC, f.usage_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Chat History Table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  content TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  sent_by TEXT,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  media_url TEXT,
  status TEXT DEFAULT 'sent',
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  conversation_id UUID,
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_chat_history" ON chat_history
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_phone ON chat_history(phone_number);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversation ON chat_history(conversation_id);

-- Enable realtime for chat_history
ALTER PUBLICATION supabase_realtime ADD TABLE chat_history;

-- 5. Shopify Products Table
CREATE TABLE IF NOT EXISTS shopify_products (
  product_id TEXT PRIMARY KEY,
  shopify_id TEXT UNIQUE,
  title TEXT,
  description TEXT,
  vendor TEXT,
  product_type TEXT,
  handle TEXT,
  status TEXT,
  tags TEXT[] DEFAULT '{}',
  images JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  options JSONB DEFAULT '[]',
  metafields JSONB DEFAULT '{}',
  price NUMERIC,
  compare_at_price NUMERIC,
  inventory INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_shopify_products" ON shopify_products
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON shopify_products(shopify_id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON shopify_products(handle);
CREATE INDEX IF NOT EXISTS idx_products_status ON shopify_products(status);

-- 6. Shopify Orders Table
CREATE TABLE IF NOT EXISTS shopify_orders (
  order_id TEXT PRIMARY KEY,
  shopify_id TEXT UNIQUE,
  order_number TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  customer_email TEXT,
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC,
  total_price NUMERIC,
  total_tax NUMERIC,
  currency TEXT DEFAULT 'PKR',
  financial_status TEXT,
  fulfillment_status TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  courier_name TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_shopify_orders" ON shopify_orders
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON shopify_orders(shopify_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON shopify_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON shopify_orders(tracking_number);

-- 7. Warranty Claims Table
CREATE TABLE IF NOT EXISTS warranty_claims (
  claim_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone TEXT,
  customer_name TEXT,
  order_number TEXT,
  product_name TEXT,
  issue_description TEXT,
  issue_type TEXT,
  image_urls TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  resolution_notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_warranty_claims" ON warranty_claims
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_warranty_customer ON warranty_claims(customer_phone);
CREATE INDEX IF NOT EXISTS idx_warranty_status ON warranty_claims(status);

-- 8. Product Waitlist Table
CREATE TABLE IF NOT EXISTS product_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  customer_email TEXT,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_product_waitlist" ON product_waitlist
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_waitlist_product ON product_waitlist(product_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_phone ON product_waitlist(customer_phone);

-- 9. Message Analytics Table
CREATE TABLE IF NOT EXISTS message_analytics (
  date DATE PRIMARY KEY,
  inbound_count INT DEFAULT 0,
  outbound_count INT DEFAULT 0,
  zaara_handled INT DEFAULT 0,
  human_handled INT DEFAULT 0,
  escalated_count INT DEFAULT 0,
  avg_response_time_seconds INT DEFAULT 0
);

ALTER TABLE message_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_message_analytics" ON message_analytics
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Analytics Increment Function
CREATE OR REPLACE FUNCTION increment_message_count(
  date_param DATE,
  direction TEXT,
  handler TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO message_analytics (
    date,
    inbound_count,
    outbound_count,
    zaara_handled,
    human_handled
  )
  VALUES (
    date_param,
    CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END,
    CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END,
    CASE WHEN handler = 'zaara' THEN 1 ELSE 0 END,
    CASE WHEN handler = 'human' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date) DO UPDATE SET 
    inbound_count = message_analytics.inbound_count + CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END,
    outbound_count = message_analytics.outbound_count + CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END,
    zaara_handled = message_analytics.zaara_handled + CASE WHEN handler = 'zaara' THEN 1 ELSE 0 END,
    human_handled = message_analytics.human_handled + CASE WHEN handler = 'human' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- 10. Conversation Context Table
CREATE TABLE IF NOT EXISTS conversation_context (
  phone_number TEXT PRIMARY KEY,
  last_intent TEXT,
  last_product_viewed TEXT,
  awaiting_response TEXT,
  context_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_conversation_context" ON conversation_context
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);