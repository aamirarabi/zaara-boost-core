-- Fix security warning: Set search_path for update_faq_updated_at function
DROP TRIGGER IF EXISTS faq_updated_at_trigger ON faq_vectors;
DROP FUNCTION IF EXISTS update_faq_updated_at();

CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER faq_updated_at_trigger
    BEFORE UPDATE ON faq_vectors
    FOR EACH ROW
    EXECUTE FUNCTION update_faq_updated_at();