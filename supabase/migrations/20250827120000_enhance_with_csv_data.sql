-- ============================================================================
-- Enhancement Migration: Incorporate CSV dataset improvements
-- Purpose: Add NAIA support, athletic metrics, enhanced location data
-- Created: 2025-08-27
-- ============================================================================

-- =====================================================================
-- PART 1: ENHANCE SCHOOLS TABLE FOR NAIA AND ADDITIONAL DATA
-- =====================================================================

-- Add NAIA division support to existing schools table
ALTER TABLE schools_ncaa_verified 
ADD COLUMN IF NOT EXISTS institution_type TEXT CHECK (institution_type IN ('public', 'private', 'unknown')) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS enrollment_total INTEGER,
ADD COLUMN IF NOT EXISTS enrollment_male INTEGER,
ADD COLUMN IF NOT EXISTS enrollment_female INTEGER,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS county_fips TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS unitid TEXT; -- Federal education ID for matching

-- Update the division constraint to include NAIA
ALTER TABLE schools_ncaa_verified DROP CONSTRAINT IF EXISTS schools_ncaa_verified_athletic_division_valid;
ALTER TABLE schools_ncaa_verified ADD CONSTRAINT schools_ncaa_verified_athletic_division_enhanced 
  CHECK (athletic_division IN ('NCAA DI', 'NCAA DII', 'NCAA DIII', 'NAIA', 'NJCAA'));

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_county ON schools_ncaa_verified(county);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_zip ON schools_ncaa_verified(zip_code);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_unitid ON schools_ncaa_verified(unitid);

-- =====================================================================
-- PART 2: CREATE ATHLETIC PROGRAM METRICS TABLES
-- =====================================================================

-- Annual athletic program financial and participation data
CREATE TABLE IF NOT EXISTS athletic_program_metrics (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Time and sport context
  academic_year INTEGER NOT NULL,
  sport TEXT NOT NULL,
  sport_code INTEGER,
  
  -- Participation data
  participants_male INTEGER DEFAULT 0,
  participants_female INTEGER DEFAULT 0,
  participants_coed_male INTEGER DEFAULT 0,
  participants_coed_female INTEGER DEFAULT 0,
  total_participants_male INTEGER DEFAULT 0,
  total_participants_female INTEGER DEFAULT 0,
  
  -- Financial data (in USD)
  revenue_male DECIMAL(15,2) DEFAULT 0,
  revenue_female DECIMAL(15,2) DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  expenses_male DECIMAL(15,2) DEFAULT 0,
  expenses_female DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  
  -- Data quality
  data_source TEXT DEFAULT 'IPEDS_athletics',
  confidence_score DECIMAL(3,2) DEFAULT 0.95,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT athletic_program_metrics_unique 
    UNIQUE(school_id, academic_year, sport)
);

-- Create indexes for athletic program metrics
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_school ON athletic_program_metrics(school_id);
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_year ON athletic_program_metrics(academic_year);
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_sport ON athletic_program_metrics(sport);
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_revenue ON athletic_program_metrics(total_revenue);

-- =====================================================================
-- PART 3: CREATE SCHOOL LOCATION ENHANCEMENT TABLE
-- =====================================================================

-- Enhanced location data with coordinates and demographics
CREATE TABLE IF NOT EXISTS school_location_enhanced (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Precise coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Administrative boundaries
  county TEXT,
  county_fips TEXT,
  state_fips TEXT,
  
  -- Postal information
  zip_code TEXT,
  zip4 TEXT,
  
  -- Demographics context
  population INTEGER,
  locale_type TEXT, -- Urban, suburban, rural classification
  
  -- Geographic identifiers
  naics_code TEXT,
  naics_description TEXT,
  
  -- Data sources
  data_source TEXT DEFAULT 'NCES_college_navigator',
  source_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT school_location_enhanced_school_unique UNIQUE(school_id)
);

-- Create indexes for location data
CREATE INDEX IF NOT EXISTS idx_school_location_enhanced_coordinates 
  ON school_location_enhanced(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_school_location_enhanced_county 
  ON school_location_enhanced(county);
CREATE INDEX IF NOT EXISTS idx_school_location_enhanced_zip 
  ON school_location_enhanced(zip_code);

-- =====================================================================
-- PART 4: CREATE SCHOOL WEBSITE TRACKING TABLE
-- =====================================================================

-- Track different types of school websites for scraping optimization
CREATE TABLE IF NOT EXISTS school_websites (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference  
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Website information
  website_url TEXT NOT NULL,
  website_type TEXT CHECK (website_type IN ('academic', 'athletic', 'admissions', 'athletics_staff', 'coaches')) NOT NULL,
  
  -- Website status
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  http_status_code INTEGER,
  
  -- Scraping metadata
  scraping_priority INTEGER DEFAULT 2, -- 1=primary, 2=secondary, 3=backup
  scraping_difficulty TEXT CHECK (scraping_difficulty IN ('easy', 'moderate', 'hard', 'blocked')) DEFAULT 'moderate',
  anti_bot_protection TEXT, -- cloudflare, recaptcha, etc.
  
  -- Performance tracking
  last_successful_scrape_at TIMESTAMPTZ,
  scraping_success_rate DECIMAL(4,2), -- Percentage success over last 30 days
  avg_response_time_ms INTEGER,
  
  -- Data sources
  source TEXT DEFAULT 'manual_entry',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT school_websites_school_type_unique UNIQUE(school_id, website_type, website_url)
);

-- Create indexes for website tracking
CREATE INDEX IF NOT EXISTS idx_school_websites_school ON school_websites(school_id);
CREATE INDEX IF NOT EXISTS idx_school_websites_type ON school_websites(website_type);
CREATE INDEX IF NOT EXISTS idx_school_websites_priority ON school_websites(scraping_priority);
CREATE INDEX IF NOT EXISTS idx_school_websites_active ON school_websites(is_active);

-- =====================================================================
-- PART 5: CREATE ENHANCED VIEWS
-- =====================================================================

-- Enhanced schools view with all related data
CREATE OR REPLACE VIEW schools_enhanced AS
SELECT 
  s.*,
  
  -- Location enhancements
  le.latitude as precise_latitude,
  le.longitude as precise_longitude,
  le.county as enhanced_county,
  le.county_fips as enhanced_county_fips,
  le.population,
  le.locale_type,
  
  -- Website information
  w_athletic.website_url as athletic_website_url,
  w_academic.website_url as academic_website_url,
  w_athletic.scraping_difficulty as athletic_scraping_difficulty,
  w_athletic.last_successful_scrape_at as last_athletic_scrape,
  
  -- Athletic program statistics (latest year)
  apm_summary.total_sports,
  apm_summary.total_athletes,
  apm_summary.total_revenue as athletic_revenue,
  apm_summary.total_expenses as athletic_expenses,
  apm_summary.latest_data_year,
  
  -- Staff counts
  staff_summary.total_staff_count,
  staff_summary.head_coaches_count,
  staff_summary.recruiting_coordinators_count

FROM schools_ncaa_verified s

-- Location data
LEFT JOIN school_location_enhanced le ON s.id = le.school_id

-- Website data  
LEFT JOIN school_websites w_athletic ON s.id = w_athletic.school_id 
  AND w_athletic.website_type = 'athletic' AND w_athletic.is_active = true
LEFT JOIN school_websites w_academic ON s.id = w_academic.school_id 
  AND w_academic.website_type = 'academic' AND w_academic.is_active = true

-- Athletic program summary (latest year)
LEFT JOIN (
  SELECT 
    school_id,
    MAX(academic_year) as latest_data_year,
    COUNT(DISTINCT sport) as total_sports,
    SUM(total_participants_male + total_participants_female) as total_athletes,
    SUM(total_revenue) as total_revenue,
    SUM(total_expenses) as total_expenses
  FROM athletic_program_metrics
  GROUP BY school_id
) apm_summary ON s.id = apm_summary.school_id

-- Staff summary
LEFT JOIN (
  SELECT 
    ncaa_school_id as school_id,
    COUNT(*) as total_staff_count,
    COUNT(*) FILTER (WHERE contact_priority = 1) as head_coaches_count,
    COUNT(*) FILTER (WHERE recruiting_coordinator = true) as recruiting_coordinators_count
  FROM athletic_staff 
  WHERE ncaa_school_id IS NOT NULL
  GROUP BY ncaa_school_id
) staff_summary ON s.id = staff_summary.school_id;

-- Athletic program metrics with school context
CREATE OR REPLACE VIEW athletic_metrics_with_context AS
SELECT 
  apm.*,
  s.name as school_name,
  s.athletic_division,
  s.conference,
  s.state,
  
  -- Calculate per-athlete metrics
  CASE 
    WHEN (apm.total_participants_male + apm.total_participants_female) > 0 
    THEN apm.total_revenue / (apm.total_participants_male + apm.total_participants_female)
    ELSE NULL
  END as revenue_per_athlete,
  
  CASE 
    WHEN (apm.total_participants_male + apm.total_participants_female) > 0 
    THEN apm.total_expenses / (apm.total_participants_male + apm.total_participants_female)
    ELSE NULL
  END as expense_per_athlete,
  
  (apm.total_revenue - apm.total_expenses) as net_athletic_result

FROM athletic_program_metrics apm
JOIN schools_ncaa_verified s ON apm.school_id = s.id;

-- =====================================================================
-- PART 6: CREATE DATA IMPORT STAGING TABLES
-- =====================================================================

-- Staging table for CSV data import
CREATE TABLE IF NOT EXISTS csv_import_staging (
  id BIGSERIAL PRIMARY KEY,
  
  -- Import metadata
  import_batch_id TEXT NOT NULL,
  source_file TEXT NOT NULL,
  row_number INTEGER,
  
  -- Raw CSV data (JSONB for flexibility)
  raw_data JSONB NOT NULL,
  
  -- Processing status
  processing_status TEXT CHECK (processing_status IN ('pending', 'processed', 'error', 'duplicate')) DEFAULT 'pending',
  error_message TEXT,
  
  -- Matching results
  matched_school_id BIGINT REFERENCES schools_ncaa_verified(id),
  match_confidence DECIMAL(3,2),
  match_method TEXT,
  
  -- Metadata
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for staging table
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_batch ON csv_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_status ON csv_import_staging(processing_status);
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_file ON csv_import_staging(source_file);

-- =====================================================================
-- PART 7: UPDATE EXISTING TRIGGERS AND FUNCTIONS
-- =====================================================================

-- Ensure update triggers work on new tables
CREATE TRIGGER update_athletic_program_metrics_updated_at 
  BEFORE UPDATE ON athletic_program_metrics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_location_enhanced_updated_at 
  BEFORE UPDATE ON school_location_enhanced 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_websites_updated_at 
  BEFORE UPDATE ON school_websites 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- PART 8: ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE athletic_program_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_location_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_staging ENABLE ROW LEVEL SECURITY;

-- Public read access for athletic metrics (needed for public API)
CREATE POLICY "Athletic metrics viewable by everyone" 
  ON athletic_program_metrics FOR SELECT USING (true);

-- Public read access for enhanced location data
CREATE POLICY "School location viewable by everyone" 
  ON school_location_enhanced FOR SELECT USING (true);

-- Public read access for active school websites
CREATE POLICY "School websites viewable by everyone" 
  ON school_websites FOR SELECT USING (is_active = true);

-- Admin-only access for staging data
CREATE POLICY "CSV staging admin only" 
  ON csv_import_staging FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Admin write access for athletic metrics
CREATE POLICY "Athletic metrics admin write" 
  ON athletic_program_metrics FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin') 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admin write access for location data
CREATE POLICY "School location admin write" 
  ON school_location_enhanced FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin') 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admin write access for website data
CREATE POLICY "School websites admin write" 
  ON school_websites FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin') 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- =====================================================================
-- PART 9: ADD HELPFUL COMMENTS
-- =====================================================================

COMMENT ON TABLE athletic_program_metrics IS 'Annual athletic program financial and participation data from IPEDS';
COMMENT ON COLUMN athletic_program_metrics.sport_code IS 'Federal sport classification code for standardization';
COMMENT ON COLUMN athletic_program_metrics.total_revenue IS 'Total athletic program revenue in USD for the sport/year';

COMMENT ON TABLE school_location_enhanced IS 'Enhanced location data with coordinates and demographic context';
COMMENT ON COLUMN school_location_enhanced.latitude IS 'Precise latitude coordinates for mapping and radius calculations';
COMMENT ON COLUMN school_location_enhanced.locale_type IS 'Urban/suburban/rural classification for recruiting analysis';

COMMENT ON TABLE school_websites IS 'Comprehensive website tracking for scraping optimization';
COMMENT ON COLUMN school_websites.scraping_difficulty IS 'Assessment of anti-bot protection level';
COMMENT ON COLUMN school_websites.scraping_priority IS '1=primary target, 2=secondary, 3=backup for scraping';

COMMENT ON TABLE csv_import_staging IS 'Staging area for processing CSV data imports with error handling';

COMMENT ON VIEW schools_enhanced IS 'Complete school information with location, websites, and athletic program data';
COMMENT ON VIEW athletic_metrics_with_context IS 'Athletic program metrics enriched with school context and calculated ratios';

-- ============================================================================
-- END OF ENHANCEMENT MIGRATION
-- ============================================================================