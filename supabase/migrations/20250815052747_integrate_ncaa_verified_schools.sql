-- Migration: Integrate NCAA Official API Dataset
-- Description: Replace uncertain school data with verified NCAA schools including athletic websites
-- Created: 2025-08-15

-- =====================================================================
-- PART 1: CREATE NEW VERIFIED SCHOOLS TABLE
-- =====================================================================

-- Create enhanced schools table with NCAA official data structure
CREATE TABLE IF NOT EXISTS schools_ncaa_verified (
  id BIGSERIAL PRIMARY KEY,
  
  -- Core Identity (from NCAA API)
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  ncaa_id TEXT UNIQUE NOT NULL, -- orgId from NCAA API
  
  -- Athletic Classification (Enhanced)
  athletic_division TEXT CHECK (athletic_division IN ('NCAA DI', 'NCAA DII', 'NCAA DIII')) NOT NULL,
  conference TEXT NOT NULL,
  subdivision_level TEXT, -- FBS/FCS for Division I schools
  
  -- Institution Details
  school_type TEXT CHECK (school_type IN ('public', 'private', 'unknown')) DEFAULT 'unknown',
  school_level TEXT DEFAULT 'four-year',
  
  -- Location Information
  city TEXT,
  state TEXT NOT NULL,
  full_location TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  
  -- Web Presence (KEY ENHANCEMENT: Both Academic and Athletic Websites)
  academic_website TEXT, -- Primary university website
  athletic_website TEXT, -- Athletic department website (KEY for Firecrawl)
  
  -- Visual Identity & Branding
  colors JSONB DEFAULT '{}', -- School colors for UI enhancement
  logo_url TEXT,
  mascot TEXT,
  
  -- Data Quality & Provenance
  data_sources TEXT[] DEFAULT ARRAY['NCAA Official API'],
  verification_status TEXT DEFAULT 'verified',
  data_quality_score INTEGER DEFAULT 100,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  CONSTRAINT schools_ncaa_verified_name_key UNIQUE(name),
  CONSTRAINT schools_ncaa_verified_athletic_division_valid 
    CHECK (athletic_division IN ('NCAA DI', 'NCAA DII', 'NCAA DIII'))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_division ON schools_ncaa_verified(athletic_division);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_state ON schools_ncaa_verified(state);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_conference ON schools_ncaa_verified(conference);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_updated ON schools_ncaa_verified(updated_at);

-- =====================================================================
-- PART 2: ENHANCE EXISTING ATHLETIC STAFF TABLE
-- =====================================================================

-- Add columns to support Firecrawl integration and NCAA school linking
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id);
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS sport_category TEXT; -- Basketball, Football, Baseball, etc.
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS contact_priority INTEGER DEFAULT 2; -- 1=head coach, 2=assistant, 3=support
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS recruiting_coordinator BOOLEAN DEFAULT FALSE;
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS firecrawl_confidence DECIMAL; -- AI extraction confidence
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS scraping_source TEXT; -- 'athletic_website' or 'academic_website'
ALTER TABLE athletic_staff ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_athletic_staff_ncaa_school ON athletic_staff(ncaa_school_id);
CREATE INDEX IF NOT EXISTS idx_athletic_staff_sport_category ON athletic_staff(sport_category);
CREATE INDEX IF NOT EXISTS idx_athletic_staff_priority ON athletic_staff(contact_priority);

-- =====================================================================
-- PART 3: CREATE MIGRATION TRACKING TABLE
-- =====================================================================

-- Track migration from old uncertain data to verified NCAA data
CREATE TABLE IF NOT EXISTS school_data_migration (
  id BIGSERIAL PRIMARY KEY,
  
  -- Old school reference
  old_school_id BIGINT, -- Reference to existing schools table
  old_school_name TEXT,
  
  -- New verified school reference
  new_school_id BIGINT REFERENCES schools_ncaa_verified(id),
  
  -- Migration metadata
  migration_type TEXT CHECK (migration_type IN ('exact_match', 'fuzzy_match', 'manual_review', 'new_school', 'deprecated')),
  confidence_score DECIMAL,
  migration_notes TEXT,
  
  -- Athletic staff migration
  staff_migrated_count INTEGER DEFAULT 0,
  staff_verified_count INTEGER DEFAULT 0,
  
  -- Timestamps
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT school_data_migration_type_valid 
    CHECK (migration_type IN ('exact_match', 'fuzzy_match', 'manual_review', 'new_school', 'deprecated'))
);

-- =====================================================================
-- PART 4: CREATE FIRECRAWL SCRAPING TRACKING
-- =====================================================================

-- Track Firecrawl scraping attempts and results
CREATE TABLE IF NOT EXISTS firecrawl_scraping_log (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Scraping details
  target_url TEXT NOT NULL, -- athletic_website or academic_website
  scraping_method TEXT CHECK (scraping_method IN ('athletic_website', 'academic_website', 'fallback')) NOT NULL,
  
  -- Results
  success BOOLEAN NOT NULL,
  staff_found_count INTEGER DEFAULT 0,
  coaches_identified_count INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Performance metrics
  processing_time_ms INTEGER,
  firecrawl_confidence DECIMAL,
  
  -- Timestamps
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT firecrawl_scraping_log_method_valid 
    CHECK (scraping_method IN ('athletic_website', 'academic_website', 'fallback'))
);

-- Create indexes for scraping log
CREATE INDEX IF NOT EXISTS idx_firecrawl_log_school ON firecrawl_scraping_log(school_id);
CREATE INDEX IF NOT EXISTS idx_firecrawl_log_success ON firecrawl_scraping_log(success);
CREATE INDEX IF NOT EXISTS idx_firecrawl_log_attempted ON firecrawl_scraping_log(attempted_at);

-- =====================================================================
-- PART 5: CREATE SCHOOL COLORS ENHANCEMENT TABLE
-- =====================================================================

-- Store school colors and branding information
CREATE TABLE IF NOT EXISTS school_visual_identity (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Color information
  primary_color TEXT,
  secondary_color TEXT,
  primary_hex TEXT,
  secondary_hex TEXT,
  additional_colors JSONB DEFAULT '[]',
  
  -- Branding assets
  logo_url TEXT,
  logo_svg TEXT, -- SVG content for scalable logos
  mascot_name TEXT,
  mascot_image_url TEXT,
  
  -- Data sources
  color_source TEXT CHECK (color_source IN ('ncaa_bigquery', 'website_scraping', 'manual_entry', 'official_brand_guide')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT school_visual_identity_school_unique UNIQUE(school_id),
  CONSTRAINT school_visual_identity_source_valid 
    CHECK (color_source IN ('ncaa_bigquery', 'website_scraping', 'manual_entry', 'official_brand_guide'))
);

-- =====================================================================
-- PART 6: CREATE VIEWS FOR EASY DATA ACCESS
-- =====================================================================

-- Complete school information view
CREATE OR REPLACE VIEW schools_complete AS
SELECT 
  s.*,
  
  -- Visual identity
  v.primary_color,
  v.secondary_color,
  v.primary_hex,
  v.secondary_hex,
  v.logo_url as visual_logo_url,
  v.mascot_name,
  
  -- Athletic staff counts
  COUNT(ast.id) as total_staff_count,
  COUNT(ast.id) FILTER (WHERE ast.contact_priority = 1) as head_coaches_count,
  COUNT(ast.id) FILTER (WHERE ast.contact_priority = 2) as assistant_coaches_count,
  COUNT(ast.id) FILTER (WHERE ast.recruiting_coordinator = true) as recruiting_coordinators_count,
  
  -- Scraping status
  MAX(fsl.attempted_at) as last_firecrawl_scraped_at,
  BOOL_OR(fsl.success) as has_successful_scrape,
  AVG(fsl.firecrawl_confidence) as avg_scraping_confidence
  
FROM schools_ncaa_verified s
LEFT JOIN school_visual_identity v ON s.id = v.school_id
LEFT JOIN athletic_staff ast ON s.id = ast.ncaa_school_id
LEFT JOIN firecrawl_scraping_log fsl ON s.id = fsl.school_id
GROUP BY s.id, v.primary_color, v.secondary_color, v.primary_hex, v.secondary_hex, v.logo_url, v.mascot_name;

-- Athletic staff with school information view
CREATE OR REPLACE VIEW athletic_staff_complete AS
SELECT 
  ast.*,
  
  -- School information
  s.name as school_name,
  s.athletic_division,
  s.conference,
  s.state as school_state,
  s.athletic_website,
  
  -- Visual identity
  v.primary_color as school_primary_color,
  v.primary_hex as school_primary_hex,
  v.logo_url as school_logo_url
  
FROM athletic_staff ast
LEFT JOIN schools_ncaa_verified s ON ast.ncaa_school_id = s.id
LEFT JOIN school_visual_identity v ON s.id = v.school_id;

-- Scraping statistics view
CREATE OR REPLACE VIEW scraping_statistics AS
SELECT 
  s.athletic_division,
  s.state,
  COUNT(s.id) as total_schools,
  COUNT(fsl.id) as attempted_scrapes,
  COUNT(fsl.id) FILTER (WHERE fsl.success = true) as successful_scrapes,
  ROUND(
    COUNT(fsl.id) FILTER (WHERE fsl.success = true)::decimal / 
    NULLIF(COUNT(fsl.id), 0) * 100, 2
  ) as success_rate_pct,
  AVG(fsl.staff_found_count) as avg_staff_per_school,
  AVG(fsl.coaches_identified_count) as avg_coaches_per_school
FROM schools_ncaa_verified s
LEFT JOIN firecrawl_scraping_log fsl ON s.id = fsl.school_id
GROUP BY s.athletic_division, s.state
ORDER BY s.athletic_division, s.state;

-- =====================================================================
-- PART 7: CREATE UPDATE TRIGGERS
-- =====================================================================

-- Update timestamp trigger for schools
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_ncaa_verified_updated_at 
  BEFORE UPDATE ON schools_ncaa_verified 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_visual_identity_updated_at 
  BEFORE UPDATE ON school_visual_identity 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- PART 8: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE schools_ncaa_verified ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_data_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE firecrawl_scraping_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_visual_identity ENABLE ROW LEVEL SECURITY;

-- Public read access for schools (users need to search/view schools)
CREATE POLICY "Schools are viewable by everyone" ON schools_ncaa_verified
  FOR SELECT USING (true);

-- Admin-only access for migration and scraping logs
CREATE POLICY "Migration data admin only" ON school_data_migration
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Scraping logs admin only" ON firecrawl_scraping_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Public read access for visual identity (needed for UI)
CREATE POLICY "School visual identity viewable by everyone" ON school_visual_identity
  FOR SELECT USING (true);

-- Admin write access for visual identity
CREATE POLICY "School visual identity admin write" ON school_visual_identity
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin') WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- =====================================================================
-- PART 9: COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE schools_ncaa_verified IS 'Verified NCAA schools from official API with both academic and athletic websites';
COMMENT ON COLUMN schools_ncaa_verified.ncaa_id IS 'Official NCAA organization ID from API';
COMMENT ON COLUMN schools_ncaa_verified.athletic_website IS 'Athletic department website - primary target for Firecrawl scraping';
COMMENT ON COLUMN schools_ncaa_verified.academic_website IS 'Main university website - fallback for Firecrawl scraping';
COMMENT ON COLUMN schools_ncaa_verified.data_quality_score IS 'Data completeness score (0-100) based on available information';

COMMENT ON TABLE school_data_migration IS 'Tracks migration from uncertain legacy data to verified NCAA schools';
COMMENT ON TABLE firecrawl_scraping_log IS 'Logs all Firecrawl scraping attempts and results for monitoring success rates';
COMMENT ON TABLE school_visual_identity IS 'School colors and branding for enhanced UI presentation';

COMMENT ON VIEW schools_complete IS 'Complete school information including staff counts and scraping status';
COMMENT ON VIEW athletic_staff_complete IS 'Athletic staff with associated school information and branding';
COMMENT ON VIEW scraping_statistics IS 'Firecrawl scraping success rates and performance metrics';

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================

-- Migration completed successfully