-- Add api_password column to courier_settings table (needed for Leopards)
ALTER TABLE courier_settings 
ADD COLUMN IF NOT EXISTS api_password TEXT;