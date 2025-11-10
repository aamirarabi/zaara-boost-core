-- Add audit columns to faq_vectors table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faq_vectors' AND column_name = 'created_by') THEN
    ALTER TABLE faq_vectors ADD COLUMN created_by TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faq_vectors' AND column_name = 'updated_by') THEN
    ALTER TABLE faq_vectors ADD COLUMN updated_by TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faq_vectors' AND column_name = 'edited_at') THEN
    ALTER TABLE faq_vectors ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faq_updated_at_trigger ON faq_vectors;
CREATE TRIGGER faq_updated_at_trigger
    BEFORE UPDATE ON faq_vectors
    FOR EACH ROW
    EXECUTE FUNCTION update_faq_updated_at();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_faq_created_by ON faq_vectors(created_by);
CREATE INDEX IF NOT EXISTS idx_faq_updated_at ON faq_vectors(updated_at);