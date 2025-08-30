-- ============================================================================
-- Safe Remote Migration for School Stats Platform
-- Purpose: Apply schema changes safely to a clean remote Supabase database
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ixyhhegjwdxtpmtmiqvd/sql
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create base schools table
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT,
    city TEXT,
    athletic_website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comprehensive NCAA verified schools table
CREATE TABLE IF NOT EXISTS schools_ncaa_verified (
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
CREATE TABLE IF NOT EXISTS institutional_details (
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
CREATE TABLE IF NOT EXISTS school_contact_info (
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
CREATE TABLE IF NOT EXISTS enrollment_analytics (
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
CREATE TABLE IF NOT EXISTS athletic_program_metrics (
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
CREATE TABLE IF NOT EXISTS sport_classifications (
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
CREATE TABLE IF NOT EXISTS athletic_staff (
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
CREATE TABLE IF NOT EXISTS scraping_runs (
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
CREATE TABLE IF NOT EXISTS api_keys (
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
CREATE OR REPLACE VIEW schools_comprehensive AS
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
    
    -- Staff count
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id) as total_staff_count,
    (SELECT COUNT(*) FROM athletic_staff WHERE ncaa_school_id = s.id AND title ILIKE '%head coach%') as head_coach_count,
    
    -- Sport classifications
    (SELECT COUNT(DISTINCT sport_name) FROM sport_classifications WHERE ncaa_school_id = s.id) as total_sports_count,
    (SELECT COUNT(*) FROM sport_classifications WHERE ncaa_school_id = s.id AND is_revenue_sport = true) as revenue_sports_count,
    
    s.created_at
FROM schools_ncaa_verified s
LEFT JOIN athletic_program_metrics apm ON s.id = apm.ncaa_school_id;

-- Create indexes for performance (only if they don't exist)
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

    -- Athletic staff indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_ncaa_school_id') THEN
        CREATE INDEX idx_athletic_staff_ncaa_school_id ON athletic_staff(ncaa_school_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_sport') THEN
        CREATE INDEX idx_athletic_staff_sport ON athletic_staff(sport);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_title') THEN
        CREATE INDEX idx_athletic_staff_title ON athletic_staff(title);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_athletic_staff_email') THEN
        CREATE INDEX idx_athletic_staff_email ON athletic_staff(email);
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
DO $$
BEGIN
    -- Schools policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'schools_ncaa_verified') THEN
        CREATE POLICY "Enable read access for all users" ON schools_ncaa_verified FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'schools_ncaa_verified') THEN
        CREATE POLICY "Enable all operations for service role" ON schools_ncaa_verified FOR ALL USING (auth.role() = 'service_role');
    END IF;

    -- Athletic staff policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable read access for all users" ON athletic_staff FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable all operations for service role" ON athletic_staff FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable insert for authenticated users" ON athletic_staff FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update for authenticated users' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable update for authenticated users" ON athletic_staff FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable delete for authenticated users' AND tablename = 'athletic_staff') THEN
        CREATE POLICY "Enable delete for authenticated users" ON athletic_staff FOR DELETE USING (auth.role() = 'authenticated');
    END IF;

    -- Other table policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'athletic_program_metrics') THEN
        CREATE POLICY "Enable read access for all users" ON athletic_program_metrics FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'athletic_program_metrics') THEN
        CREATE POLICY "Enable all operations for service role" ON athletic_program_metrics FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'school_contact_info') THEN
        CREATE POLICY "Enable read access for all users" ON school_contact_info FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'school_contact_info') THEN
        CREATE POLICY "Enable all operations for service role" ON school_contact_info FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'enrollment_analytics') THEN
        CREATE POLICY "Enable read access for all users" ON enrollment_analytics FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'enrollment_analytics') THEN
        CREATE POLICY "Enable all operations for service role" ON enrollment_analytics FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'sport_classifications') THEN
        CREATE POLICY "Enable read access for all users" ON sport_classifications FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'sport_classifications') THEN
        CREATE POLICY "Enable all operations for service role" ON sport_classifications FOR ALL USING (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'institutional_details') THEN
        CREATE POLICY "Enable read access for all users" ON institutional_details FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'institutional_details') THEN
        CREATE POLICY "Enable all operations for service role" ON institutional_details FOR ALL USING (auth.role() = 'service_role');
    END IF;

    -- Service tables policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'scraping_runs') THEN
        CREATE POLICY "Enable all operations for service role" ON scraping_runs FOR ALL USING (auth.role() = 'service_role');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all operations for service role' AND tablename = 'api_keys') THEN
        CREATE POLICY "Enable all operations for service role" ON api_keys FOR ALL USING (auth.role() = 'service_role');
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

-- Create triggers (drop first if they exist)
DROP TRIGGER IF EXISTS update_schools_ncaa_verified_updated_at ON schools_ncaa_verified;
CREATE TRIGGER update_schools_ncaa_verified_updated_at BEFORE UPDATE ON schools_ncaa_verified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_athletic_staff_updated_at ON athletic_staff;
CREATE TRIGGER update_athletic_staff_updated_at BEFORE UPDATE ON athletic_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete!
-- 
-- Next Steps:
-- 1. Run: bun import:csv-data
-- 2. Run: bun enhance:schools  
-- 3. Verify all data is correctly imported
-- ============================================================================