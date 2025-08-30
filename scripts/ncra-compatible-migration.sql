-- ============================================================================
-- NCRA-Compatible Migration for School Stats Platform
-- Purpose: Make School Stats API fully compatible with NCRA schema expectations
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ixyhhegjwdxtpmtmiqvd/sql
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create NCRA dependency tables first
CREATE TABLE IF NOT EXISTS sports (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS genders (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'university',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create NCRA-compatible schools table (legacy format for backward compatibility)
CREATE TABLE IF NOT EXISTS schools (
    id BIGSERIAL PRIMARY KEY,
    rid TEXT,
    name TEXT NOT NULL,
    address TEXT,
    division TEXT,
    conference TEXT,
    academic_website TEXT,
    athletic_website TEXT,
    total_enrollment INTEGER,
    tuition_instate INTEGER,
    tuition_outofstate INTEGER,
    undergraduate_tuition_fees INTEGER,
    athletic_questionnaire_url TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    organization_id BIGINT REFERENCES organizations(id)
);

-- Create NCRA-compatible schools_ncaa_verified table
CREATE TABLE IF NOT EXISTS schools_ncaa_verified (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT,
    ncaa_id TEXT,
    athletic_division TEXT CHECK (athletic_division IN ('NCAA DI', 'NCAA DII', 'NCAA DIII', 'NAIA')),
    conference TEXT,
    subdivision_level TEXT,
    school_type TEXT DEFAULT 'unknown' CHECK (school_type IN ('public', 'private', 'unknown')),
    school_level TEXT DEFAULT 'four-year',
    city TEXT,
    state TEXT,
    full_location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    academic_website TEXT,
    athletic_website TEXT,
    colors JSONB DEFAULT '{}',
    logo_url TEXT,
    mascot TEXT,
    data_sources TEXT[] DEFAULT ARRAY['School Stats API'],
    verification_status TEXT DEFAULT 'verified',
    data_quality_score INTEGER DEFAULT 100,
    
    -- Enhanced fields from CSV data
    phone TEXT,
    website TEXT,
    address TEXT,
    zip_code TEXT,
    county TEXT,
    total_enrollment INTEGER,
    undergraduate_enrollment INTEGER,
    graduate_enrollment INTEGER,
    student_faculty_ratio DECIMAL(5, 2),
    acceptance_rate DECIMAL(5, 4),
    graduation_rate DECIMAL(5, 4),
    retention_rate DECIMAL(5, 4),
    in_state_tuition DECIMAL(10, 2),
    out_of_state_tuition DECIMAL(10, 2),
    room_and_board DECIMAL(10, 2),
    founded_year INTEGER,
    carnegie_classification TEXT,
    religious_affiliation TEXT,
    campus_setting TEXT,
    campus_size_acres INTEGER,
    endowment_size DECIMAL(15, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_scraped_at TIMESTAMPTZ
);

-- Create supporting tables for comprehensive data
CREATE TABLE IF NOT EXISTS institutional_details (
    id BIGSERIAL PRIMARY KEY,
    ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    founded_year INTEGER,
    carnegie_classification TEXT,
    religious_affiliation TEXT,
    campus_setting TEXT,
    campus_size_acres INTEGER,
    endowment_size DECIMAL(15, 2),
    library_volumes INTEGER,
    student_organizations INTEGER,
    greek_life_percentage DECIMAL(5, 4),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS school_contact_info (
    id BIGSERIAL PRIMARY KEY,
    ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    main_phone TEXT,
    admissions_phone TEXT,
    athletics_phone TEXT,
    main_email TEXT,
    admissions_email TEXT,
    athletics_email TEXT,
    mailing_address TEXT,
    physical_address TEXT,
    zip_code TEXT,
    fax TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollment_analytics (
    id BIGSERIAL PRIMARY KEY,
    ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    total_enrollment INTEGER,
    undergraduate_enrollment INTEGER,
    graduate_enrollment INTEGER,
    full_time_enrollment INTEGER,
    part_time_enrollment INTEGER,
    male_enrollment INTEGER,
    female_enrollment INTEGER,
    international_enrollment INTEGER,
    out_of_state_enrollment INTEGER,
    student_faculty_ratio DECIMAL(5, 2),
    acceptance_rate DECIMAL(5, 4),
    graduation_rate DECIMAL(5, 4),
    retention_rate DECIMAL(5, 4),
    enrollment_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS athletic_program_metrics (
    id BIGSERIAL PRIMARY KEY,
    ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    total_revenue DECIMAL(12, 2),
    total_expenses DECIMAL(12, 2),
    net_income DECIMAL(12, 2),
    student_aid DECIMAL(12, 2),
    coaching_salaries DECIMAL(12, 2),
    support_staff_salaries DECIMAL(12, 2),
    recruiting_expenses DECIMAL(10, 2),
    equipment_expenses DECIMAL(10, 2),
    facilities_expenses DECIMAL(10, 2),
    travel_expenses DECIMAL(10, 2),
    game_expenses DECIMAL(10, 2),
    fundraising_expenses DECIMAL(10, 2),
    marketing_expenses DECIMAL(10, 2),
    media_rights_revenue DECIMAL(10, 2),
    ticket_sales_revenue DECIMAL(10, 2),
    donations_revenue DECIMAL(10, 2),
    sponsorship_revenue DECIMAL(10, 2),
    conference_revenue DECIMAL(10, 2),
    ncaa_distributions DECIMAL(10, 2),
    reporting_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sport_classifications (
    id BIGSERIAL PRIMARY KEY,
    ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    sport_name TEXT NOT NULL,
    sport_category TEXT,
    gender TEXT CHECK (gender IN ('men', 'women', 'coed')),
    scholarship_count INTEGER,
    roster_size INTEGER,
    coaching_staff_size INTEGER,
    season_start_month INTEGER CHECK (season_start_month BETWEEN 1 AND 12),
    season_end_month INTEGER CHECK (season_end_month BETWEEN 1 AND 12),
    is_revenue_sport BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(ncaa_school_id, sport_name, gender)
);

-- Create NCRA-compatible athletic_staff table
CREATE TABLE IF NOT EXISTS athletic_staff (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    sport_id BIGINT REFERENCES sports(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    gender_id BIGINT REFERENCES genders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    email TEXT,
    phone TEXT,
    twitter TEXT,
    instagram TEXT,
    photo_url TEXT,
    bio TEXT,
    
    -- Enhanced columns for School Stats compatibility
    ncaa_school_id BIGINT REFERENCES schools_ncaa_verified(id),
    sport_category TEXT,
    contact_priority INTEGER DEFAULT 2,
    recruiting_coordinator BOOLEAN DEFAULT FALSE,
    firecrawl_confidence DECIMAL,
    scraping_source TEXT,
    last_verified_at TIMESTAMPTZ,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    
    -- Additional scraping metadata
    scraping_method TEXT DEFAULT 'firecrawl' CHECK (scraping_method IN ('firecrawl', 'puppeteer', 'hybrid', 'manual')),
    years_experience INTEGER,
    previous_positions TEXT[],
    education TEXT
);

-- Create other NCRA-compatible service tables
CREATE TABLE IF NOT EXISTS scraping_runs (
    id BIGSERIAL PRIMARY KEY,
    method TEXT NOT NULL CHECK (method IN ('firecrawl', 'puppeteer', 'hybrid')),
    schools_processed INTEGER DEFAULT 0,
    coaches_extracted INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    average_scraping_time INTEGER,
    errors JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_keys (
    id BIGSERIAL PRIMARY KEY,
    key_name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Seed reference data for NCRA compatibility
INSERT INTO genders (name) VALUES 
    ('Not Specified'),
    ('Male'), 
    ('Female'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO sports (name, category) VALUES 
    ('General Athletics', 'General'),
    ('Football', 'Major Sports'),
    ('Basketball', 'Major Sports'),
    ('Baseball', 'Major Sports'),
    ('Softball', 'Major Sports'),
    ('Soccer', 'Major Sports'),
    ('Track and Field', 'Track/Field'),
    ('Cross Country', 'Track/Field'),
    ('Swimming and Diving', 'Aquatic Sports'),
    ('Tennis', 'Individual Sports'),
    ('Golf', 'Individual Sports'),
    ('Wrestling', 'Individual Sports'),
    ('Volleyball', 'Team Sports'),
    ('Hockey', 'Team Sports'),
    ('Lacrosse', 'Team Sports'),
    ('Gymnastics', 'Individual Sports'),
    ('Rowing', 'Aquatic Sports'),
    ('Field Hockey', 'Team Sports'),
    ('Water Polo', 'Aquatic Sports'),
    ('Skiing', 'Individual Sports'),
    ('Fencing', 'Individual Sports'),
    ('Rifle', 'Individual Sports'),
    ('Bowling', 'Individual Sports'),
    ('Equestrian', 'Individual Sports'),
    ('Sailing', 'Aquatic Sports'),
    ('Squash', 'Individual Sports')
ON CONFLICT (name) DO NOTHING;

-- Create NCRA-compatible comprehensive views
CREATE OR REPLACE VIEW schools_complete AS
SELECT 
    s.id,
    s.name,
    s.normalized_name,
    s.ncaa_id,
    s.athletic_division,
    s.conference,
    s.subdivision_level,
    s.school_type,
    s.school_level,
    s.city,
    s.state,
    s.full_location,
    s.latitude,
    s.longitude,
    s.academic_website,
    s.athletic_website,
    s.colors,
    s.logo_url,
    s.mascot,
    s.data_sources,
    s.verification_status,
    s.data_quality_score,
    s.phone,
    s.website,
    s.address,
    s.zip_code,
    s.county,
    s.total_enrollment,
    s.undergraduate_enrollment,
    s.graduate_enrollment,
    s.student_faculty_ratio,
    s.acceptance_rate,
    s.graduation_rate,
    s.retention_rate,
    s.in_state_tuition,
    s.out_of_state_tuition,
    s.room_and_board,
    s.founded_year,
    s.carnegie_classification,
    s.religious_affiliation,
    s.campus_setting,
    s.campus_size_acres,
    s.endowment_size,
    
    -- Contact info
    sci.main_phone as contact_phone,
    sci.main_email as contact_email,
    sci.athletics_phone,
    sci.athletics_email,
    
    -- Athletic metrics
    apm.total_revenue as athletic_revenue,
    apm.total_expenses as athletic_expenses,
    apm.net_income as athletic_net_income,
    
    -- Staff counts
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id) as total_staff_count,
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id AND title ILIKE '%head coach%') as head_coach_count,
    
    s.created_at,
    s.updated_at,
    s.last_scraped_at
FROM schools_ncaa_verified s
LEFT JOIN school_contact_info sci ON s.id = sci.ncaa_school_id
LEFT JOIN athletic_program_metrics apm ON s.id = apm.ncaa_school_id;

CREATE OR REPLACE VIEW athletic_staff_complete AS
SELECT 
    ast.id,
    ast.school_id,
    ast.ncaa_school_id,
    ast.sport_id,
    ast.name,
    ast.title,
    ast.gender_id,
    ast.email,
    ast.phone,
    ast.twitter,
    ast.instagram,
    ast.photo_url,
    ast.bio,
    ast.sport_category,
    ast.contact_priority,
    ast.recruiting_coordinator,
    ast.firecrawl_confidence,
    ast.scraping_source,
    ast.last_verified_at,
    ast.uuid,
    ast.scraping_method,
    ast.years_experience,
    ast.previous_positions,
    ast.education,
    
    -- Joined data
    s.name as sport_name,
    s.category as sport_category_name,
    g.name as gender_name,
    sch.name as school_name,
    ncaa_sch.name as ncaa_school_name,
    ncaa_sch.conference,
    ncaa_sch.athletic_division,
    
    ast.created_at,
    ast.updated_at
FROM athletic_staff ast
LEFT JOIN sports s ON ast.sport_id = s.id
LEFT JOIN genders g ON ast.gender_id = g.id
LEFT JOIN schools sch ON ast.school_id = sch.id
LEFT JOIN schools_ncaa_verified ncaa_sch ON ast.ncaa_school_id = ncaa_sch.id;

CREATE OR REPLACE VIEW athletic_programs_comprehensive AS
SELECT 
    s.id as school_id,
    s.name as school_name,
    s.conference,
    s.athletic_division,
    s.state,
    
    -- Athletic metrics
    apm.total_revenue,
    apm.total_expenses,
    apm.net_income,
    apm.coaching_salaries,
    apm.recruiting_expenses,
    apm.ticket_sales_revenue,
    apm.donations_revenue,
    apm.media_rights_revenue,
    apm.reporting_year,
    
    -- Staff counts
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id) as total_staff_count,
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id AND title ILIKE '%head coach%') as head_coach_count,
    
    -- Sport counts
    (SELECT COUNT(DISTINCT sport_name) FROM sport_classifications WHERE ncaa_school_id = s.id) as total_sports_count,
    (SELECT COUNT(*) FROM sport_classifications WHERE ncaa_school_id = s.id AND is_revenue_sport = true) as revenue_sports_count,
    
    s.created_at
FROM schools_ncaa_verified s
LEFT JOIN athletic_program_metrics apm ON s.id = apm.ncaa_school_id;

-- Create indexes for performance
DO $$
BEGIN
    -- Schools indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schools_ncaa_verified_name') THEN
        CREATE INDEX idx_schools_ncaa_verified_name ON schools_ncaa_verified(name);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schools_ncaa_verified_state') THEN
        CREATE INDEX idx_schools_ncaa_verified_state ON schools_ncaa_verified(state);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schools_ncaa_verified_conference') THEN
        CREATE INDEX idx_schools_ncaa_verified_conference ON schools_ncaa_verified(conference);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schools_ncaa_verified_division') THEN
        CREATE INDEX idx_schools_ncaa_verified_division ON schools_ncaa_verified(athletic_division);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_schools_ncaa_verified_ncaa_id') THEN
        CREATE INDEX idx_schools_ncaa_verified_ncaa_id ON schools_ncaa_verified(ncaa_id);
    END IF;

    -- Athletic staff indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_school_id') THEN
        CREATE INDEX idx_athletic_staff_school_id ON athletic_staff(school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_ncaa_school_id') THEN
        CREATE INDEX idx_athletic_staff_ncaa_school_id ON athletic_staff(ncaa_school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_sport_id') THEN
        CREATE INDEX idx_athletic_staff_sport_id ON athletic_staff(sport_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_title') THEN
        CREATE INDEX idx_athletic_staff_title ON athletic_staff(title);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_email') THEN
        CREATE INDEX idx_athletic_staff_email ON athletic_staff(email);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_uuid') THEN
        CREATE INDEX idx_athletic_staff_uuid ON athletic_staff(uuid);
    END IF;

    -- Other indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_program_metrics_school_id') THEN
        CREATE INDEX idx_athletic_program_metrics_school_id ON athletic_program_metrics(ncaa_school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_program_metrics_year') THEN
        CREATE INDEX idx_athletic_program_metrics_year ON athletic_program_metrics(reporting_year);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sport_classifications_school_id') THEN
        CREATE INDEX idx_sport_classifications_school_id ON sport_classifications(ncaa_school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sport_classifications_sport') THEN
        CREATE INDEX idx_sport_classifications_sport ON sport_classifications(sport_name);
    END IF;
END $$;

-- Enable Row Level Security with NCRA-compatible policies
ALTER TABLE schools_ncaa_verified ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_program_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE genders ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create NCRA-compatible RLS policies
DO $$
BEGIN
    -- Public read access policies (for API consumption)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'schools_ncaa_verified') THEN
        CREATE POLICY "Enable read access for all users" ON schools_ncaa_verified FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'schools') THEN
        CREATE POLICY "Enable read access for all users" ON schools FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable read access for all users" ON athletic_staff FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'sports') THEN
        CREATE POLICY "Enable read access for all users" ON sports FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'genders') THEN
        CREATE POLICY "Enable read access for all users" ON genders FOR SELECT USING (true);
    END IF;

    -- Service role policies (for data management)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'schools_ncaa_verified') THEN
        CREATE POLICY "Enable all operations for service role" ON schools_ncaa_verified FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'schools') THEN
        CREATE POLICY "Enable all operations for service role" ON schools FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable all operations for service role" ON athletic_staff FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'athletic_program_metrics') THEN
        CREATE POLICY "Enable all operations for service role" ON athletic_program_metrics FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'school_contact_info') THEN
        CREATE POLICY "Enable all operations for service role" ON school_contact_info FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'enrollment_analytics') THEN
        CREATE POLICY "Enable all operations for service role" ON enrollment_analytics FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'sport_classifications') THEN
        CREATE POLICY "Enable all operations for service role" ON sport_classifications FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'institutional_details') THEN
        CREATE POLICY "Enable all operations for service role" ON institutional_details FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'scraping_runs') THEN
        CREATE POLICY "Enable all operations for service role" ON scraping_runs FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'api_keys') THEN
        CREATE POLICY "Enable all operations for service role" ON api_keys FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'sports') THEN
        CREATE POLICY "Enable all operations for service role" ON sports FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'genders') THEN
        CREATE POLICY "Enable all operations for service role" ON genders FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'organizations') THEN
        CREATE POLICY "Enable all operations for service role" ON organizations FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Update functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_schools_ncaa_verified_updated_at ON schools_ncaa_verified;
CREATE TRIGGER update_schools_ncaa_verified_updated_at BEFORE UPDATE ON schools_ncaa_verified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_athletic_staff_updated_at ON athletic_staff;
CREATE TRIGGER update_athletic_staff_updated_at BEFORE UPDATE ON athletic_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NCRA-Compatible Migration Complete!
-- 
-- This migration creates:
-- 1. Full NCRA-compatible table structures with BIGSERIAL IDs
-- 2. Required dependency tables (sports, genders, organizations)
-- 3. Enhanced schools_ncaa_verified with all CSV data columns
-- 4. athletic_staff table matching NCRA expectations exactly
-- 5. Comprehensive views (schools_complete, athletic_staff_complete)
-- 6. All supporting tables for complete data management
-- 7. RLS policies matching NCRA security model
-- 
-- Next Steps:
-- 1. Run: bun import:csv-data (with NCRA-compatible data mapping)
-- 2. Run: bun enhance:schools
-- 3. Test API endpoints with NCRA application
-- ============================================================================