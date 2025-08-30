-- ============================================================================
-- Complete Remote Migration for School Stats Platform
-- Purpose: Apply all necessary schema changes to remote Supabase database
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ixyhhegjwdxtpmtmiqvd/sql
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies and tables if they exist (for clean migration)
DROP POLICY IF EXISTS "Enable read access for all users" ON athletic_staff;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON athletic_staff;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON athletic_staff;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON athletic_staff;

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS schools_comprehensive;
DROP VIEW IF EXISTS athletic_programs_comprehensive;

-- Drop dependent tables first
DROP TABLE IF EXISTS athletic_staff CASCADE;
DROP TABLE IF EXISTS scraping_runs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS athletic_program_metrics CASCADE;
DROP TABLE IF EXISTS school_contact_info CASCADE;
DROP TABLE IF EXISTS enrollment_analytics CASCADE;
DROP TABLE IF EXISTS sport_classifications CASCADE;
DROP TABLE IF EXISTS institutional_details CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS schools_ncaa_verified CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Create base schools table
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT,
    city TEXT,
    athletic_website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comprehensive NCAA verified schools table
CREATE TABLE schools_ncaa_verified (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT,
    city TEXT,
    athletic_website TEXT,
    conference TEXT,
    athletic_division TEXT,
    mascot TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    
    -- Enhanced fields from CSV data
    phone TEXT,
    website TEXT,
    address TEXT,
    zip_code TEXT,
    county TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
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
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create institutional details table
CREATE TABLE institutional_details (
    id SERIAL PRIMARY KEY,
    ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    founded_year INTEGER,
    carnegie_classification TEXT,
    religious_affiliation TEXT,
    campus_setting TEXT,
    campus_size_acres INTEGER,
    endowment_size DECIMAL(15, 2),
    library_volumes INTEGER,
    student_organizations INTEGER,
    greek_life_percentage DECIMAL(5, 4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact information table
CREATE TABLE school_contact_info (
    id SERIAL PRIMARY KEY,
    ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enrollment analytics table
CREATE TABLE enrollment_analytics (
    id SERIAL PRIMARY KEY,
    ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create athletic program metrics table
CREATE TABLE athletic_program_metrics (
    id SERIAL PRIMARY KEY,
    ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sport classifications table
CREATE TABLE sport_classifications (
    id SERIAL PRIMARY KEY,
    ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id) ON DELETE CASCADE,
    sport_name TEXT NOT NULL,
    sport_category TEXT, -- 'revenue', 'non-revenue', 'olympic'
    gender TEXT CHECK (gender IN ('men', 'women', 'coed')),
    scholarship_count INTEGER,
    roster_size INTEGER,
    coaching_staff_size INTEGER,
    season_start_month INTEGER CHECK (season_start_month BETWEEN 1 AND 12),
    season_end_month INTEGER CHECK (season_end_month BETWEEN 1 AND 12),
    is_revenue_sport BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ncaa_school_id, sport_name, gender)
);

-- Create athletic staff table with enhanced fields
CREATE TABLE athletic_staff (
    id SERIAL PRIMARY KEY,
    ncaa_school_id INTEGER REFERENCES schools_ncaa_verified(id),
    school_id INTEGER REFERENCES schools(id), -- nullable for backward compatibility
    name TEXT NOT NULL,
    title TEXT,
    sport TEXT DEFAULT 'General Athletics',
    email TEXT,
    phone TEXT,
    bio TEXT,
    scraping_method TEXT DEFAULT 'firecrawl' CHECK (scraping_method IN ('firecrawl', 'puppeteer', 'hybrid', 'manual')),
    confidence_score DECIMAL(3,2) DEFAULT 0.80 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    years_experience INTEGER,
    previous_positions TEXT[],
    education TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scraping runs table
CREATE TABLE scraping_runs (
    id SERIAL PRIMARY KEY,
    method TEXT NOT NULL CHECK (method IN ('firecrawl', 'puppeteer', 'hybrid')),
    schools_processed INTEGER DEFAULT 0,
    coaches_extracted INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    average_scraping_time INTEGER, -- milliseconds
    errors JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create API keys table
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    key_name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- Create comprehensive views
CREATE VIEW schools_comprehensive AS
SELECT 
    s.id,
    s.name,
    s.state,
    s.city,
    s.athletic_website,
    s.conference,
    s.athletic_division,
    s.mascot,
    s.primary_color,
    s.secondary_color,
    s.phone,
    s.website,
    s.address,
    s.zip_code,
    s.county,
    s.latitude,
    s.longitude,
    
    -- Enrollment data
    ea.total_enrollment,
    ea.undergraduate_enrollment,
    ea.graduate_enrollment,
    ea.student_faculty_ratio,
    ea.acceptance_rate,
    ea.graduation_rate,
    ea.retention_rate,
    
    -- Institutional data
    id.founded_year,
    id.carnegie_classification,
    id.religious_affiliation,
    id.campus_setting,
    id.campus_size_acres,
    id.endowment_size,
    
    -- Contact info
    sci.main_phone as contact_phone,
    sci.main_email as contact_email,
    sci.athletics_phone,
    sci.athletics_email,
    
    -- Athletic metrics summary
    apm.total_revenue as athletic_revenue,
    apm.total_expenses as athletic_expenses,
    apm.net_income as athletic_net_income,
    
    s.created_at,
    s.updated_at
FROM schools_ncaa_verified s
LEFT JOIN enrollment_analytics ea ON s.id = ea.ncaa_school_id
LEFT JOIN institutional_details id ON s.id = id.ncaa_school_id
LEFT JOIN school_contact_info sci ON s.id = sci.ncaa_school_id
LEFT JOIN athletic_program_metrics apm ON s.id = apm.ncaa_school_id;

CREATE VIEW athletic_programs_comprehensive AS
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
    
    -- Staff count
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id) as total_staff_count,
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id AND title ILIKE '%head coach%') as head_coach_count,
    
    -- Sport classifications
    (SELECT COUNT(DISTINCT sport_name) FROM sport_classifications WHERE ncaa_school_id = s.id) as total_sports_count,
    (SELECT COUNT(*) FROM sport_classifications WHERE ncaa_school_id = s.id AND is_revenue_sport = true) as revenue_sports_count,
    
    s.created_at
FROM schools_ncaa_verified s
LEFT JOIN athletic_program_metrics apm ON s.id = apm.ncaa_school_id;

-- Create indexes for performance
CREATE INDEX idx_schools_ncaa_verified_name ON schools_ncaa_verified(name);
CREATE INDEX idx_schools_ncaa_verified_state ON schools_ncaa_verified(state);
CREATE INDEX idx_schools_ncaa_verified_conference ON schools_ncaa_verified(conference);
CREATE INDEX idx_schools_ncaa_verified_division ON schools_ncaa_verified(athletic_division);

CREATE INDEX idx_athletic_staff_ncaa_school_id ON athletic_staff(ncaa_school_id);
CREATE INDEX idx_athletic_staff_sport ON athletic_staff(sport);
CREATE INDEX idx_athletic_staff_title ON athletic_staff(title);
CREATE INDEX idx_athletic_staff_email ON athletic_staff(email);

CREATE INDEX idx_athletic_program_metrics_school_id ON athletic_program_metrics(ncaa_school_id);
CREATE INDEX idx_athletic_program_metrics_year ON athletic_program_metrics(reporting_year);

CREATE INDEX idx_sport_classifications_school_id ON sport_classifications(ncaa_school_id);
CREATE INDEX idx_sport_classifications_sport ON sport_classifications(sport_name);

-- Enable Row Level Security
ALTER TABLE schools_ncaa_verified ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletic_program_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (API-based)
CREATE POLICY "Enable read access for all users" ON schools_ncaa_verified FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON athletic_staff FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON athletic_program_metrics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON school_contact_info FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON enrollment_analytics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON sport_classifications FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON institutional_details FOR SELECT USING (true);

-- Admin policies for service role
CREATE POLICY "Enable all operations for service role" ON schools_ncaa_verified FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON athletic_staff FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON scraping_runs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON athletic_program_metrics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON school_contact_info FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON enrollment_analytics FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON sport_classifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all operations for service role" ON institutional_details FOR ALL USING (auth.role() = 'service_role');

-- Insert authenticated user policies
CREATE POLICY "Enable insert for authenticated users" ON athletic_staff FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON athletic_staff FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON athletic_staff FOR DELETE USING (auth.role() = 'authenticated');

-- Update functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_ncaa_verified_updated_at BEFORE UPDATE ON schools_ncaa_verified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athletic_staff_updated_at BEFORE UPDATE ON athletic_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete!
-- 
-- Next Steps:
-- 1. Run the data import scripts to populate tables
-- 2. Verify all data is correctly imported
-- 3. Test API endpoints
-- ============================================================================