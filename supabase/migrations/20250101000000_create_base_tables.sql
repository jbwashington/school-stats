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
COMMENT ON TABLE athletic_staff IS 'Athletic staff and coaches data from various schools';