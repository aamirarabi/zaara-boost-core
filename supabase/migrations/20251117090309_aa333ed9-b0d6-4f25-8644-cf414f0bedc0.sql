-- Part 7.1: Add missing columns to conversation_context
ALTER TABLE conversation_context 
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assigned_agent TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_response_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avg_response_time INTERVAL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_context_priority ON conversation_context(is_priority);
CREATE INDEX IF NOT EXISTS idx_conversation_context_assigned ON conversation_context(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_conversation_context_tags ON conversation_context USING gin(tags);

-- Part 7.2: Create customer_notes table (if it doesn't exist, update structure if it does)
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_phone ON customer_notes(phone_number);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created ON customer_notes(created_at DESC);

-- Part 7.3: Add status column to chat_history
ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- Status can be: sent, delivered, read, failed
CREATE INDEX IF NOT EXISTS idx_chat_history_status ON chat_history(status);