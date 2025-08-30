-- ============================================================================
-- Add Photo URL Column for NCRA Compatibility (Simplified)
-- Purpose: Add photo_url column to athletic_staff table
-- ============================================================================

-- Add photo_url column to athletic_staff table for NCRA compatibility
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN athletic_staff.photo_url IS 'URL to the staff member''s profile photo stored in faculty-photos bucket';

-- Add index for photo queries
CREATE INDEX IF NOT EXISTS idx_athletic_staff_photo_url ON athletic_staff(photo_url) 
WHERE photo_url IS NOT NULL;

-- Function to generate photo URLs for storage
CREATE OR REPLACE FUNCTION generate_faculty_photo_url(staff_id BIGINT, file_extension TEXT DEFAULT 'jpg')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'faculty-photos/staff_' || staff_id::text || '.' || file_extension;
END;
$$;

-- Comment on the function
COMMENT ON FUNCTION generate_faculty_photo_url(BIGINT, TEXT) IS 'Generates a standardized photo URL path for faculty photos in the storage bucket';

-- ============================================================================
-- Photo URL Column Added Successfully!
-- 
-- Added:
-- 1. photo_url column to athletic_staff table
-- 2. Performance index for photo queries
-- 3. Utility function for generating photo URLs
--
-- Note: Storage bucket policies will be handled separately
-- ============================================================================