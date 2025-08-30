-- Run this SQL in your Supabase Dashboard > SQL Editor
-- This will add the photo_url column and then allow the migration to proceed

-- Add photo_url column to athletic_staff table
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to document the column purpose  
COMMENT ON COLUMN athletic_staff.photo_url IS 'URL to staff member photo, typically stored in faculty-photos bucket';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'athletic_staff' 
AND column_name = 'photo_url';