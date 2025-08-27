-- Make school_id nullable in athletic_staff table
-- This allows new NCAA verified schools to use ncaa_school_id without requiring legacy school_id

BEGIN;

-- Remove NOT NULL constraint from school_id column
ALTER TABLE athletic_staff ALTER COLUMN school_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN athletic_staff.school_id IS 'Legacy school reference (nullable for NCAA verified schools that use ncaa_school_id)';
COMMENT ON COLUMN athletic_staff.ncaa_school_id IS 'NCAA verified school reference (preferred for new records)';

COMMIT;