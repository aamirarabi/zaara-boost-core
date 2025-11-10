-- Add missing columns to existing tables

-- Add columns to shopify_orders if not exists
ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS actual_delivery_date timestamp with time zone;

-- Add columns to conversation_context if not exists
ALTER TABLE conversation_context 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS human_replied_at timestamp with time zone;

-- Add columns to chat_history if not exists
ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS sender text DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS sentiment_score decimal,
ADD COLUMN IF NOT EXISTS response_time_seconds integer;

-- Add columns to customers if not exists
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS vip boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vip_since timestamp with time zone;

-- Update RLS policies for new columns
-- Ensure all tables have proper authenticated access (already exist based on context)