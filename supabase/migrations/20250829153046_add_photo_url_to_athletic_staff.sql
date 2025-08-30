-- Add photo_url column to athletic_staff table for storing coach/staff photos
-- This enables storing photo URLs from the NCRA faculty-photos bucket

ALTER TABLE athletic_staff 
ADD COLUMN photo_url TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN athletic_staff.photo_url IS 'URL to staff member photo, typically stored in faculty-photos bucket';