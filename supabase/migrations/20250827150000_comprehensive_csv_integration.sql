-- ============================================================================
-- Comprehensive CSV Integration Migration
-- Purpose: Include ALL valuable columns from all CSV datasets
-- Created: 2025-08-27
-- ============================================================================

-- =====================================================================
-- PART 1: EXPAND SCHOOLS TABLE WITH ALL COMPREHENSIVE DATA
-- =====================================================================

-- Add all missing columns from comprehensive college dataset
ALTER TABLE schools_ncaa_verified 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS status TEXT, -- A=Active, C=Closed
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS naics_code TEXT,
ADD COLUMN IF NOT EXISTS naics_description TEXT,
ADD COLUMN IF NOT EXISTS data_source TEXT,
ADD COLUMN IF NOT EXISTS source_date DATE,
ADD COLUMN IF NOT EXISTS validation_method TEXT,
ADD COLUMN IF NOT EXISTS validation_date DATE,
ADD COLUMN IF NOT EXISTS state_fips TEXT,
ADD COLUMN IF NOT EXISTS county_fips TEXT,
ADD COLUMN IF NOT EXISTS sector_code INTEGER,
ADD COLUMN IF NOT EXISTS level_code INTEGER,
ADD COLUMN IF NOT EXISTS highest_offering INTEGER,
ADD COLUMN IF NOT EXISTS degree_granting INTEGER,
ADD COLUMN IF NOT EXISTS locale_code INTEGER,
ADD COLUMN IF NOT EXISTS close_date DATE,
ADD COLUMN IF NOT EXISTS merge_id TEXT,
ADD COLUMN IF NOT EXISTS alias_names TEXT[],
ADD COLUMN IF NOT EXISTS size_category INTEGER,
ADD COLUMN IF NOT EXISTS institution_size INTEGER,
ADD COLUMN IF NOT EXISTS part_time_enrollment INTEGER,
ADD COLUMN IF NOT EXISTS full_time_enrollment INTEGER,
ADD COLUMN IF NOT EXISTS total_enrollment INTEGER,
ADD COLUMN IF NOT EXISTS has_housing BOOLEAN,
ADD COLUMN IF NOT EXISTS dormitory_capacity INTEGER,
ADD COLUMN IF NOT EXISTS total_employees INTEGER,
ADD COLUMN IF NOT EXISTS geo_point_json JSONB,
ADD COLUMN IF NOT EXISTS geo_shape_json JSONB,
ADD COLUMN IF NOT EXISTS shelter_id TEXT;

-- Add comprehensive indexes for new columns
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_phone ON schools_ncaa_verified(phone);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_naics ON schools_ncaa_verified(naics_code);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_enrollment ON schools_ncaa_verified(total_enrollment);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_employees ON schools_ncaa_verified(total_employees);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_status ON schools_ncaa_verified(status);
CREATE INDEX IF NOT EXISTS idx_schools_ncaa_verified_size ON schools_ncaa_verified(institution_size);

-- =====================================================================
-- PART 2: EXPAND ATHLETIC PROGRAM METRICS WITH ALL SPORTS DATA
-- =====================================================================

-- Add all missing columns from sports financial dataset
ALTER TABLE athletic_program_metrics 
ADD COLUMN IF NOT EXISTS classification_code INTEGER,
ADD COLUMN IF NOT EXISTS classification_name TEXT,
ADD COLUMN IF NOT EXISTS classification_other TEXT,
ADD COLUMN IF NOT EXISTS enrollment_male INTEGER,
ADD COLUMN IF NOT EXISTS enrollment_female INTEGER,
ADD COLUMN IF NOT EXISTS enrollment_total INTEGER,
ADD COLUMN IF NOT EXISTS sector_code INTEGER,
ADD COLUMN IF NOT EXISTS sector_name TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Create indexes for expanded athletic metrics
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_classification ON athletic_program_metrics(classification_code);
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_enrollment ON athletic_program_metrics(enrollment_total);
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_city ON athletic_program_metrics(city);
CREATE INDEX IF NOT EXISTS idx_athletic_program_metrics_state ON athletic_program_metrics(state);

-- =====================================================================
-- PART 3: CREATE COMPREHENSIVE INSTITUTIONAL DETAILS TABLE
-- =====================================================================

-- Detailed institutional characteristics and demographics
CREATE TABLE IF NOT EXISTS institutional_details (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Federal identification
  ipeds_id TEXT, -- Federal IPEDS identifier
  object_id INTEGER, -- GIS object ID
  
  -- Institutional classification (Carnegie, etc.)
  carnegie_basic INTEGER,
  carnegie_undergraduate INTEGER, 
  carnegie_graduate INTEGER,
  carnegie_size INTEGER,
  carnegie_setting INTEGER,
  
  -- Academic characteristics
  highest_degree_offered INTEGER, -- 0=non-degree, 1=certificate, 2=associate, 3=bachelor, 4=master, 5=doctoral
  degree_granting_status INTEGER, -- 1=degree granting, 0=non-degree
  accreditation_status TEXT,
  
  -- Student body characteristics
  student_faculty_ratio DECIMAL(5,2),
  admission_rate DECIMAL(4,3), -- Acceptance rate
  graduation_rate DECIMAL(4,3), -- 6-year graduation rate
  retention_rate DECIMAL(4,3), -- First-year retention rate
  
  -- Financial characteristics
  in_state_tuition DECIMAL(10,2),
  out_state_tuition DECIMAL(10,2),
  room_board_cost DECIMAL(10,2),
  books_supplies_cost DECIMAL(10,2),
  
  -- Demographics
  percent_male DECIMAL(4,2),
  percent_female DECIMAL(4,2),
  percent_white DECIMAL(4,2),
  percent_black DECIMAL(4,2),
  percent_hispanic DECIMAL(4,2),
  percent_asian DECIMAL(4,2),
  percent_other_race DECIMAL(4,2),
  
  -- Geographic context
  urban_rural_classification TEXT, -- Urban, suburban, town, rural
  locale_description TEXT,
  congressional_district INTEGER,
  
  -- Data provenance
  data_collection_year INTEGER,
  last_updated_date DATE,
  data_quality_flags TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT institutional_details_school_unique UNIQUE(school_id)
);

-- Create indexes for institutional details
CREATE INDEX IF NOT EXISTS idx_institutional_details_ipeds ON institutional_details(ipeds_id);
CREATE INDEX IF NOT EXISTS idx_institutional_details_carnegie ON institutional_details(carnegie_basic);
CREATE INDEX IF NOT EXISTS idx_institutional_details_degree ON institutional_details(highest_degree_offered);
CREATE INDEX IF NOT EXISTS idx_institutional_details_size ON institutional_details(carnegie_size);
CREATE INDEX IF NOT EXISTS idx_institutional_details_admission ON institutional_details(admission_rate);

-- =====================================================================
-- PART 4: CREATE CONTACT INFORMATION TABLE
-- =====================================================================

-- Comprehensive contact and communication data
CREATE TABLE IF NOT EXISTS school_contact_info (
  id BIGSERIAL PRIMARY KEY,
  
  -- School reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  
  -- Contact information
  main_phone TEXT,
  admissions_phone TEXT,
  athletics_phone TEXT,
  financial_aid_phone TEXT,
  
  -- Email addresses
  main_email TEXT,
  admissions_email TEXT,
  athletics_email TEXT,
  info_email TEXT,
  
  -- Physical address components
  street_address TEXT,
  address_line_2 TEXT,
  po_box TEXT,
  
  -- Mailing vs physical address
  mailing_address TEXT,
  physical_address TEXT,
  
  -- Additional contact methods
  fax_number TEXT,
  toll_free_phone TEXT,
  
  -- Social media presence
  facebook_url TEXT,
  twitter_handle TEXT,
  instagram_handle TEXT,
  linkedin_url TEXT,
  youtube_channel TEXT,
  
  -- Communication preferences
  preferred_contact_method TEXT,
  business_hours TEXT,
  
  -- Data sources and validation
  contact_verified_date DATE,
  contact_source TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT school_contact_info_school_unique UNIQUE(school_id)
);

-- Create indexes for contact information
CREATE INDEX IF NOT EXISTS idx_school_contact_info_phone ON school_contact_info(main_phone);
CREATE INDEX IF NOT EXISTS idx_school_contact_info_email ON school_contact_info(main_email);
CREATE INDEX IF NOT EXISTS idx_school_contact_info_verified ON school_contact_info(contact_verified_date);

-- =====================================================================
-- PART 5: CREATE ENROLLMENT ANALYTICS TABLE
-- =====================================================================

-- Time-series enrollment and demographic data
CREATE TABLE IF NOT EXISTS enrollment_analytics (
  id BIGSERIAL PRIMARY KEY,
  
  -- School and time reference
  school_id BIGINT REFERENCES schools_ncaa_verified(id) NOT NULL,
  academic_year INTEGER NOT NULL,
  term TEXT, -- Fall, Spring, Summer
  
  -- Total enrollment breakdowns
  total_enrollment INTEGER,
  undergraduate_enrollment INTEGER,
  graduate_enrollment INTEGER,
  
  -- Enrollment by time status
  full_time_enrollment INTEGER,
  part_time_enrollment INTEGER,
  
  -- Enrollment by gender
  male_enrollment INTEGER,
  female_enrollment INTEGER,
  
  -- Enrollment by level
  freshman_enrollment INTEGER,
  sophomore_enrollment INTEGER,
  junior_enrollment INTEGER,
  senior_enrollment INTEGER,
  
  -- Graduate enrollments
  masters_enrollment INTEGER,
  doctoral_enrollment INTEGER,
  professional_enrollment INTEGER,
  
  -- Online vs on-campus
  on_campus_enrollment INTEGER,
  online_enrollment INTEGER,
  hybrid_enrollment INTEGER,
  
  -- International students
  international_enrollment INTEGER,
  
  -- First-generation college students
  first_generation_enrollment INTEGER,
  
  -- Financial aid recipients
  financial_aid_recipients INTEGER,
  pell_grant_recipients INTEGER,
  
  -- Transfer students
  transfer_in_enrollment INTEGER,
  transfer_out_enrollment INTEGER,
  
  -- Retention metrics
  first_year_retention INTEGER,
  second_year_retention INTEGER,
  
  -- Data quality
  enrollment_source TEXT DEFAULT 'IPEDS',
  data_quality_score DECIMAL(3,2) DEFAULT 0.95,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT enrollment_analytics_unique 
    UNIQUE(school_id, academic_year, term)
);

-- Create indexes for enrollment analytics
CREATE INDEX IF NOT EXISTS idx_enrollment_analytics_school_year ON enrollment_analytics(school_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_enrollment_analytics_total ON enrollment_analytics(total_enrollment);
CREATE INDEX IF NOT EXISTS idx_enrollment_analytics_year ON enrollment_analytics(academic_year);

-- =====================================================================
-- PART 6: ENHANCE ATHLETIC PROGRAM METRICS WITH SPORT CLASSIFICATIONS
-- =====================================================================

-- Create sport classification lookup table
CREATE TABLE IF NOT EXISTS sport_classifications (
  id SERIAL PRIMARY KEY,
  sport_code INTEGER UNIQUE NOT NULL,
  sport_name TEXT NOT NULL,
  sport_category TEXT, -- Team, Individual, Combat, Water, etc.
  gender TEXT CHECK (gender IN ('men', 'women', 'coed')),
  season TEXT CHECK (season IN ('fall', 'winter', 'spring', 'year-round')),
  scholarship_sport BOOLEAN DEFAULT false,
  revenue_sport BOOLEAN DEFAULT false,
  olympic_sport BOOLEAN DEFAULT false,
  professional_league_exists BOOLEAN DEFAULT false,
  
  -- Equipment and facility requirements
  requires_special_facility BOOLEAN DEFAULT false,
  equipment_cost_category TEXT CHECK (equipment_cost_category IN ('low', 'medium', 'high', 'very_high')),
  
  -- Participation characteristics
  typical_roster_size INTEGER,
  typical_scholarship_count DECIMAL(4,1),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common sport classifications
INSERT INTO sport_classifications (sport_code, sport_name, sport_category, gender, season, scholarship_sport, revenue_sport) VALUES
(1, 'Baseball', 'team', 'men', 'spring', true, true),
(2, 'Basketball', 'team', 'men', 'winter', true, true),
(3, 'All Track Combined', 'individual', 'coed', 'spring', true, false),
(7, 'Football', 'team', 'men', 'fall', true, true),
(8, 'Golf', 'individual', 'men', 'spring', true, false),
(9, 'Gymnastics', 'individual', 'men', 'winter', true, false),
(12, 'Soccer', 'team', 'men', 'fall', true, false),
(13, 'Swimming and Diving', 'individual', 'men', 'winter', true, false),
(14, 'Tennis', 'individual', 'men', 'spring', true, false),
(15, 'Wrestling', 'combat', 'men', 'winter', true, false),
(16, 'Other Sports', 'other', 'coed', 'year-round', false, false)
ON CONFLICT (sport_code) DO NOTHING;

-- =====================================================================
-- PART 7: CREATE COMPREHENSIVE DATA VIEWS
-- =====================================================================

-- Ultimate schools view with ALL data
CREATE OR REPLACE VIEW schools_comprehensive AS
SELECT 
  s.*,
  
  -- Contact information
  c.main_phone,
  c.admissions_phone,
  c.main_email,
  c.admissions_email,
  c.street_address,
  c.mailing_address,
  
  -- Location details
  le.latitude as precise_latitude,
  le.longitude as precise_longitude,
  le.county as enhanced_county,
  le.county_fips as enhanced_county_fips,
  le.population,
  le.locale_type,
  
  -- Institutional details
  id.ipeds_id,
  id.carnegie_basic,
  id.highest_degree_offered,
  id.student_faculty_ratio,
  id.admission_rate,
  id.graduation_rate,
  id.in_state_tuition,
  id.out_state_tuition,
  id.percent_male,
  id.percent_female,
  id.urban_rural_classification,
  
  -- Latest enrollment data
  ea_latest.total_enrollment as current_enrollment,
  ea_latest.undergraduate_enrollment,
  ea_latest.graduate_enrollment,
  ea_latest.male_enrollment,
  ea_latest.female_enrollment,
  ea_latest.international_enrollment,
  
  -- Website information
  w_athletic.website_url as athletic_website_url,
  w_academic.website_url as academic_website_url,
  w_athletic.scraping_difficulty as athletic_scraping_difficulty,
  
  -- Athletic program summary (latest year)
  apm_summary.total_sports,
  apm_summary.total_athletes,
  apm_summary.total_athletic_revenue,
  apm_summary.total_athletic_expenses,
  apm_summary.net_athletic_result,
  apm_summary.latest_data_year,
  
  -- Staff counts
  staff_summary.total_staff_count,
  staff_summary.head_coaches_count,
  staff_summary.recruiting_coordinators_count

FROM schools_ncaa_verified s

-- Contact information
LEFT JOIN school_contact_info c ON s.id = c.school_id

-- Location data
LEFT JOIN school_location_enhanced le ON s.id = le.school_id

-- Institutional details
LEFT JOIN institutional_details id ON s.id = id.school_id

-- Latest enrollment data
LEFT JOIN (
  SELECT DISTINCT ON (school_id) 
    school_id, total_enrollment, undergraduate_enrollment, graduate_enrollment,
    male_enrollment, female_enrollment, international_enrollment
  FROM enrollment_analytics 
  ORDER BY school_id, academic_year DESC
) ea_latest ON s.id = ea_latest.school_id

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
    SUM(total_revenue) as total_athletic_revenue,
    SUM(total_expenses) as total_athletic_expenses,
    SUM(total_revenue - total_expenses) as net_athletic_result
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

-- Athletic program metrics with enhanced context
CREATE OR REPLACE VIEW athletic_programs_comprehensive AS
SELECT 
  apm.*,
  s.name as school_name,
  s.athletic_division,
  s.conference,
  s.state as school_state,
  s.institution_type,
  s.total_enrollment,
  
  -- Sport classification
  sc.sport_name,
  sc.sport_category,
  sc.season,
  sc.scholarship_sport,
  sc.revenue_sport,
  sc.typical_roster_size,
  
  -- Financial calculations per athlete
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
  
  (apm.total_revenue - apm.total_expenses) as net_athletic_result,
  
  -- Revenue efficiency metrics
  CASE 
    WHEN s.total_enrollment > 0 
    THEN apm.total_revenue / s.total_enrollment
    ELSE NULL
  END as revenue_per_student

FROM athletic_program_metrics apm
JOIN schools_ncaa_verified s ON apm.school_id = s.id
LEFT JOIN sport_classifications sc ON apm.sport_code = sc.sport_code;

-- =====================================================================
-- PART 8: CREATE DATA IMPORT STAGING FOR COMPREHENSIVE DATA
-- =====================================================================

-- Expanded staging table for all CSV imports
DROP TABLE IF EXISTS csv_import_staging;
CREATE TABLE csv_import_staging (
  id BIGSERIAL PRIMARY KEY,
  
  -- Import metadata
  import_batch_id TEXT NOT NULL,
  source_file TEXT NOT NULL,
  file_type TEXT, -- 'sports', 'colleges', 'schools_directory'
  row_number INTEGER,
  
  -- Raw CSV data (JSONB for maximum flexibility)
  raw_data JSONB NOT NULL,
  
  -- Processing status
  processing_status TEXT CHECK (processing_status IN ('pending', 'processed', 'error', 'duplicate', 'skipped')) DEFAULT 'pending',
  error_message TEXT,
  processing_notes TEXT,
  
  -- Matching results
  matched_school_id BIGINT REFERENCES schools_ncaa_verified(id),
  match_confidence DECIMAL(3,2),
  match_method TEXT, -- 'exact', 'fuzzy', 'manual', 'ipeds_id'
  
  -- Data quality assessment
  data_quality_issues TEXT[],
  completeness_score DECIMAL(3,2),
  
  -- Metadata
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for staging table
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_batch_id ON csv_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_status ON csv_import_staging(processing_status);
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_source_file ON csv_import_staging(source_file);
CREATE INDEX IF NOT EXISTS idx_csv_import_staging_matched_school ON csv_import_staging(matched_school_id);

-- =====================================================================
-- PART 9: UPDATE TRIGGERS AND FUNCTIONS
-- =====================================================================

-- Update triggers for new tables
CREATE TRIGGER update_institutional_details_updated_at 
  BEFORE UPDATE ON institutional_details 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_contact_info_updated_at 
  BEFORE UPDATE ON school_contact_info 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollment_analytics_updated_at 
  BEFORE UPDATE ON enrollment_analytics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- PART 10: ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE institutional_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_classifications ENABLE ROW LEVEL SECURITY;

-- Public read access for institutional details
CREATE POLICY "Institutional details viewable by everyone" 
  ON institutional_details FOR SELECT USING (true);

-- Public read access for contact info (for recruitment purposes)
CREATE POLICY "School contact info viewable by everyone" 
  ON school_contact_info FOR SELECT USING (true);

-- Public read access for enrollment analytics
CREATE POLICY "Enrollment analytics viewable by everyone" 
  ON enrollment_analytics FOR SELECT USING (true);

-- Public read access for sport classifications
CREATE POLICY "Sport classifications viewable by everyone" 
  ON sport_classifications FOR SELECT USING (true);

-- Admin write access for all new tables
CREATE POLICY "Institutional details admin write" 
  ON institutional_details FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin') 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "School contact info admin write" 
  ON school_contact_info FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin') 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Enrollment analytics admin write" 
  ON enrollment_analytics FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin') 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- =====================================================================
-- PART 11: HELPFUL COMMENTS AND DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE institutional_details IS 'Comprehensive institutional characteristics from IPEDS and other sources';
COMMENT ON COLUMN institutional_details.carnegie_basic IS 'Basic Carnegie Classification for institutional type';
COMMENT ON COLUMN institutional_details.admission_rate IS 'Admission acceptance rate (0.0 to 1.0)';
COMMENT ON COLUMN institutional_details.student_faculty_ratio IS 'Student to faculty ratio for academic quality assessment';

COMMENT ON TABLE school_contact_info IS 'Comprehensive contact information for outreach and recruiting';
COMMENT ON COLUMN school_contact_info.main_phone IS 'Primary institutional phone number';

COMMENT ON TABLE enrollment_analytics IS 'Time-series enrollment data for trend analysis and sizing';
COMMENT ON COLUMN enrollment_analytics.academic_year IS 'Academic year in YYYY format (e.g., 2015 for 2015-2016)';

COMMENT ON TABLE sport_classifications IS 'Master reference for sport codes and characteristics';
COMMENT ON COLUMN sport_classifications.revenue_sport IS 'Whether this sport typically generates significant revenue';

COMMENT ON VIEW schools_comprehensive IS 'Ultimate view combining all school data for complete institutional profiles';
COMMENT ON VIEW athletic_programs_comprehensive IS 'Complete athletic program data with financial and participation metrics';

-- ============================================================================
-- END OF COMPREHENSIVE CSV INTEGRATION
-- ============================================================================