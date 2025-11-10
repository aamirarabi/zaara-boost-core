-- Add audit fields to faq_vectors table
ALTER TABLE public.faq_vectors 
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_by TEXT,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the audit fields
COMMENT ON COLUMN public.faq_vectors.created_by IS 'Email or identifier of user who created the FAQ';
COMMENT ON COLUMN public.faq_vectors.updated_by IS 'Email or identifier of user who last updated the FAQ';
COMMENT ON COLUMN public.faq_vectors.edited_at IS 'Timestamp of last edit';