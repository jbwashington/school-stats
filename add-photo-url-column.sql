-- Add photo_url column to athletic_staff table
-- Run this manually in your Supabase SQL editor

ALTER TABLE athletic_staff 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'athletic_staff' 
AND column_name = 'photo_url';