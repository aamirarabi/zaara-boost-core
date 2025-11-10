-- Create courier_performance table
CREATE TABLE IF NOT EXISTS public.courier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  courier_name TEXT NOT NULL,
  tracking_number TEXT,
  shipped_date TIMESTAMPTZ,
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  delivery_status TEXT,
  delay_days INTEGER DEFAULT 0,
  customer_city TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courier_name ON public.courier_performance(courier_name);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON public.courier_performance(delivery_status);
CREATE INDEX IF NOT EXISTS idx_shipped_date ON public.courier_performance(shipped_date);

-- Create faq_gaps table
CREATE TABLE IF NOT EXISTS public.faq_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  customer_phones TEXT[],
  first_asked TIMESTAMPTZ NOT NULL,
  last_asked TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  suggested_answer TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_frequency ON public.faq_gaps(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_faq_status ON public.faq_gaps(status);

-- Create dashboard_preferences table
CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  visible_sections JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  api_name TEXT NOT NULL,
  api_type TEXT,
  tokens_used INTEGER,
  cost_pkr NUMERIC(10,2),
  conversation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_timestamp ON public.api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_name ON public.api_usage_logs(api_name);

-- Create agent_performance table
CREATE TABLE IF NOT EXISTS public.agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  message_id UUID,
  response_time_seconds INTEGER,
  customer_rating INTEGER,
  first_contact_resolution BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_name ON public.agent_performance(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_created ON public.agent_performance(created_at);

-- Enable RLS on all new tables
ALTER TABLE public.courier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for authenticated users)
CREATE POLICY "Allow authenticated access to courier_performance"
  ON public.courier_performance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to faq_gaps"
  ON public.faq_gaps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to dashboard_preferences"
  ON public.dashboard_preferences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to api_usage_logs"
  ON public.api_usage_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to agent_performance"
  ON public.agent_performance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);