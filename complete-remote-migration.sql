-- ============================================================================
-- Base Migration: Core tables and structure
-- Purpose: Set up basic tables that other migrations depend on
-- Author: System Setup
-- ============================================================================

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT,
  email TEXT
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view and update their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create basic athletic_staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS athletic_staff (
  id SERIAL PRIMARY KEY,
  school_id INTEGER,
  name TEXT NOT NULL,
  title TEXT,
  sport TEXT DEFAULT 'General Athletics',
  email TEXT,
  phone TEXT,
  bio TEXT,
  scraping_method TEXT DEFAULT 'firecrawl',
  confidence_score DECIMAL(3,2) DEFAULT 0.80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on athletic_staff
ALTER TABLE athletic_staff ENABLE ROW LEVEL SECURITY;

-- Allow public read access to athletic staff data
CREATE POLICY "Athletic staff is viewable by everyone" 
  ON athletic_staff FOR SELECT 
  USING (true);

COMMENT ON TABLE profiles IS 'User profile data linked to auth.users';
COMMENT ON TABLE athletic_staff IS 'Athletic staff and coaches data from various schools';-- ============================================================================
-- Migration: Email Messaging Schema for Athletic Faculty
-- Purpose:   Enable sending, tracking, and threading of emails to athletic
--            faculty, including Resend API integration, event tracking,
--            conversation grouping, and user notifications.
-- Affected:  email_conversations, email_messages, email_events, unsubscribes
-- Author:    AI Generated (2025-05-07)
-- ============================================================================

-- 1. email_conversations: Groups threaded messages between users/faculty
create table email_conversations (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    subject text not null,
    user_id uuid not null references profiles(id),
    athletic_staff_id int not null references athletic_staff(id)
);
comment on table public.email_conversations is
  'Groups threaded email messages between users and athletic faculty.';
-- 2. email_messages: Individual messages in a conversation
create table email_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.email_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id),
  recipient_id int references public.athletic_staff(id),
  resend_email_id text, -- ID from Resend API
  subject text not null,
  body text not null,
  status text not null default 'pending', -- sent, delivered, opened, clicked, bounced, etc.
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_messages_subject_check check (char_length(subject) > 0)
);
comment on table public.email_messages is
  'Stores each email sent, including Resend API ID, status, and links to conversation.';
-- 3. email_events: Tracks all webhook events from Resend for each email
create table email_events (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamp with time zone default now(),
    email_message_id uuid not null references public.email_messages(id) on delete cascade,
    event_type text not null, -- sent, delivered, opened, clicked, bounced, unsubscribed, etc.
    event_data jsonb,         -- Raw event payload for extensibility
    constraint email_events_event_type_check check (event_type in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'))
);
comment on table public.email_events is
  'Tracks all webhook events from Resend for each email.';
-- 4. unsubscribes: Tracks user opt-outs from email notifications
create table unsubscribes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id),
    staff_id int references public.athletic_staff(id),
    unsubscribed_at timestamp with time zone default now(),
    email text not null,
    reason text
);
comment on table public.unsubscribes is
  'Tracks user opt-outs from email notifications.';
-- 5. Indexes for performance
create index if not exists idx_email_messages_conversation_id on public.email_messages(conversation_id);
create index if not exists idx_email_events_email_message_id on public.email_events(email_message_id);
create index if not exists idx_unsubscribes_user_id on public.unsubscribes(user_id);
create index if not exists idx_email_conversations_user_id on public.email_conversations(user_id);
create index if not exists idx_email_conversations_athletic_staff_id on public.email_conversations(athletic_staff_id);
-- 6. Enable Row Level Security (RLS) on all tables
alter table public.email_conversations enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_events enable row level security;
alter table public.unsubscribes enable row level security;
-- 7. RLS Policies (example: allow only sender/recipient to view their messages)
-- You should further customize these policies for your app's needs.

-- ---------------------------------------------------------------------------
-- RLS for unsubscribes: Only allow backend (service_role) access
-- No client (authenticated/anon) access is permitted to unsubscribes.
-- All inserts/updates/deletes/selects must be performed by the backend using the service_role.
-- ---------------------------------------------------------------------------
create policy "Allow insert for service role"
  on public.unsubscribes
  for insert
  to service_role
  with check (true);
create policy "Allow select for service role"
  on public.unsubscribes
  for select
  to service_role
  using (true);
create policy "Allow update for service role"
  on public.unsubscribes
  for update
  to service_role
  using (true)
  with check (true);
create policy "Allow delete for service role"
  on public.unsubscribes
  for delete
  to service_role
  using (true);
-- Allow authenticated users to select their own conversations
create policy "Allow select for participants"
  on public.email_conversations
  for select
  to authenticated
  using (
    user_id = (select id from profiles where id = auth.uid())
  );
-- Allow authenticated users to insert their own conversations
create policy "Allow insert for users"
  on public.email_conversations
  for insert
  to authenticated  
  with check (
    user_id = (select id from profiles where id = auth.uid())
  );
-- Allow authenticated users to select their own messages
create policy "Allow select for sender"
  on public.email_messages
  for select
  to authenticated
  using (
    sender_id = auth.uid()
  );
-- Allow inserting messages if sender is the user
create policy "Allow insert for sender"
  on public.email_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
  );
-- Allow select on events for related messages
create policy "Allow select for related message participants"
  on public.email_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.email_messages
      where id = email_message_id
        and sender_id = auth.uid()
    )
  );
-- Allow update for sender
create policy "Allow update for sender"
  on public.email_messages
  for update
  to authenticated
  using (
    sender_id = auth.uid()
  )
  with check (
    sender_id = auth.uid()
  );
-- Allow delete for sender (optional)
create policy "Allow delete for sender"
  on public.email_messages
  for delete
  to authenticated
  using (
    sender_id = auth.uid()
  );
-- 8. Additional Notes
-- - The webhook handler should insert into email_events for each event received.
-- - The frontend can listen for new events (e.g., via Supabase Realtime) to show badges/toasts.

-- 9. Example: How to use these tables in your webhook
-- When a webhook event is received:
--   1. Find the email_message by resend_email_id.
--   2. Insert a row into email_events with event_type and event_data.
--   3. Update email_messages.status if appropriate (e.g., opened, clicked, bounced).
--   4. For unsubscribes, insert into unsubscribes.

-- End of migration;
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

-- Migration completed successfully-- Make school_id nullable in athletic_staff table
-- This allows new NCAA verified schools to use ncaa_school_id without requiring legacy school_id

BEGIN;

-- Remove NOT NULL constraint from school_id column
ALTER TABLE athletic_staff ALTER COLUMN school_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN athletic_staff.school_id IS 'Legacy school reference (nullable for NCAA verified schools that use ncaa_school_id)';
COMMENT ON COLUMN athletic_staff.ncaa_school_id IS 'NCAA verified school reference (preferred for new records)';

COMMIT;-- Create scraping_runs table for monitoring scraping job performance
create table if not exists public.scraping_runs (
  id bigint primary key generated always as identity,
  method text not null check (method in ('firecrawl', 'puppeteer', 'hybrid')),
  schools_processed int default 0,
  coaches_extracted int default 0,
  success_rate decimal(5,2),
  average_scraping_time int, -- milliseconds
  errors jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Add RLS policy
alter table public.scraping_runs enable row level security;

create policy "Allow read access to scraping runs"
on public.scraping_runs for select 
using (true);

-- Add indexes
create index if not exists idx_scraping_runs_method on public.scraping_runs(method);
create index if not exists idx_scraping_runs_started_at on public.scraping_runs(started_at desc);
create index if not exists idx_scraping_runs_completed_at on public.scraping_runs(completed_at desc);-- Create api_keys table for API authentication and rate limiting
create table if not exists public.api_keys (
  id bigint primary key generated always as identity,
  key_name text not null,
  key_hash text not null unique,
  permissions jsonb default '{"read": true, "write": false, "admin": false}'::jsonb,
  rate_limit_per_hour int default 1000,
  created_at timestamptz default now(),
  last_used_at timestamptz,
  is_active boolean default true
);

-- Add RLS policy (restrict access to service role only)
alter table public.api_keys enable row level security;

create policy "Service role only access to api_keys"
on public.api_keys for all
using (auth.role() = 'service_role');

-- Add indexes
create index if not exists idx_api_keys_hash on public.api_keys(key_hash);
create index if not exists idx_api_keys_active on public.api_keys(is_active) where is_active = true;
create index if not exists idx_api_keys_last_used on public.api_keys(last_used_at desc);

-- Insert a sample API key for testing (key: school_stats_test_key_12345678901234567890)
insert into public.api_keys (key_name, key_hash, permissions, rate_limit_per_hour)
values (
  'Test API Key',
  encode(sha256('school_stats_test_key_12345678901234567890'::bytea), 'base64'),
  '{"read": true, "write": false, "admin": false}'::jsonb,
  1000
) on conflict (key_hash) do nothing;

-- Insert admin API key (key: school_stats_admin_key_98765432109876543210)
insert into public.api_keys (key_name, key_hash, permissions, rate_limit_per_hour)
values (
  'Admin API Key',
  encode(sha256('school_stats_admin_key_98765432109876543210'::bytea), 'base64'),
  '{"read": true, "write": true, "admin": true}'::jsonb,
  5000
) on conflict (key_hash) do nothing;-- ============================================================================
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
-- ============================================================================-- ============================================================================
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