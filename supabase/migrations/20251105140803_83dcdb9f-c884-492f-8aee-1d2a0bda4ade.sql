-- Add last_product_list column to conversation_context for number selection
ALTER TABLE conversation_context 
ADD COLUMN IF NOT EXISTS last_product_list jsonb DEFAULT '[]'::jsonb;