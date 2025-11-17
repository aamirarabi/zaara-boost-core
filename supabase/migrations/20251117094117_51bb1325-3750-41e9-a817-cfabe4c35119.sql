-- Create quick_replies table for database-driven quick replies
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quick_replies_active ON quick_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_replies_sort ON quick_replies(sort_order);

-- Enable RLS
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated access
CREATE POLICY "auth_all_quick_replies" ON quick_replies 
FOR ALL USING (true) WITH CHECK (true);

-- Insert default templates
INSERT INTO quick_replies (label, text, sort_order) VALUES
('Greeting', 'السلام علیکم! Thank you for contacting Boost Lifestyle. How can I help you today?', 1),
('Order Status', 'Let me check your order status for you. Please give me a moment.', 2),
('Delivery Time', 'Standard delivery takes 2-3 business days for Karachi and 3-5 days for other cities.', 3),
('Product Info', 'I''d be happy to provide more details about this product. What would you like to know?', 4),
('Return Policy', 'We offer 7-day returns for unused items in original packaging. Warranty varies by product.', 5),
('Payment Methods', 'We accept Cash on Delivery (COD), Bank Transfer, and Online Payment.', 6),
('Thank You', 'Thank you for your patience! Is there anything else I can help you with?', 7),
('Escalate', 'Let me connect you with our senior support team for better assistance.', 8)
ON CONFLICT DO NOTHING;