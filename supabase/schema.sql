-- JRPAT (Firefighter Fitness Test) Tracking App Schema
-- Cedar Hill Fire Department

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  station TEXT,
  shift TEXT,
  rank TEXT,
  crew TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Historical (No Longer Active)')),
  birth_date DATE,
  start_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- JRPAT_TIMES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS jrpat_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  is_placeholder BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, year)
);

-- ============================================================================
-- PROFILES TABLE (Auth integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'trainer' CHECK (role IN ('admin', 'trainer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MEMBER_ROSTER VIEW
-- ============================================================================
-- This view pivots JRPAT times by year and includes personal best and t-shirt count
CREATE OR REPLACE VIEW member_roster AS
WITH member_times AS (
  SELECT
    m.id,
    m.name,
    m.station,
    m.shift,
    m.rank,
    m.crew,
    m.status,
    m.birth_date,
    m.start_date,
    MAX(CASE WHEN jt.year = 2020 THEN jt.time_seconds END) AS time_2020,
    MAX(CASE WHEN jt.year = 2021 THEN jt.time_seconds END) AS time_2021,
    MAX(CASE WHEN jt.year = 2022 THEN jt.time_seconds END) AS time_2022,
    MAX(CASE WHEN jt.year = 2023 THEN jt.time_seconds END) AS time_2023,
    MAX(CASE WHEN jt.year = 2024 THEN jt.time_seconds END) AS time_2024,
    MAX(CASE WHEN jt.year = 2025 THEN jt.time_seconds END) AS time_2025,
    MAX(CASE WHEN jt.year = 2026 THEN jt.time_seconds END) AS time_2026,
    MIN(CASE WHEN NOT jt.is_placeholder THEN jt.time_seconds ELSE NULL END) AS personal_best
  FROM members m
  LEFT JOIN jrpat_times jt ON m.id = jt.member_id
  GROUP BY m.id, m.name, m.station, m.shift, m.rank, m.crew, m.status, m.birth_date, m.start_date
)
SELECT
  id,
  name,
  station,
  shift,
  rank,
  crew,
  status,
  birth_date,
  start_date,
  time_2020,
  time_2021,
  time_2022,
  time_2023,
  time_2024,
  time_2025,
  time_2026,
  personal_best,
  -- T-shirt count: count of years with time_seconds <= 300 seconds (5:00)
  (
    SELECT COUNT(*)
    FROM jrpat_times jt
    WHERE jt.member_id = member_times.id
      AND jt.time_seconds <= 300
      AND NOT jt.is_placeholder
  ) AS tshirt_count
FROM member_times;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jrpat_times_member_id ON jrpat_times(member_id);
CREATE INDEX IF NOT EXISTS idx_jrpat_times_year ON jrpat_times(year);
CREATE INDEX IF NOT EXISTS idx_members_crew ON members(crew);
CREATE INDEX IF NOT EXISTS idx_members_station_shift ON members(station, shift);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jrpat_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- MEMBERS: SELECT for everyone, INSERT/UPDATE/DELETE for authenticated users only
CREATE POLICY members_select_policy ON members
  FOR SELECT
  USING (true);

CREATE POLICY members_insert_policy ON members
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY members_update_policy ON members
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY members_delete_policy ON members
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- JRPAT_TIMES: SELECT for everyone, INSERT/UPDATE/DELETE for authenticated users only
CREATE POLICY jrpat_times_select_policy ON jrpat_times
  FOR SELECT
  USING (true);

CREATE POLICY jrpat_times_insert_policy ON jrpat_times
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY jrpat_times_update_policy ON jrpat_times
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY jrpat_times_delete_policy ON jrpat_times
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- PROFILES: SELECT/UPDATE only for the user's own row
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TRIGGER: Automatically create profiles row on auth.users insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'trainer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATE TRIGGER: Update updated_at on members
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_members_updated_at_trigger ON members;
CREATE TRIGGER update_members_updated_at_trigger
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION public.update_members_updated_at();

-- ============================================================================
-- UPDATE TRIGGER: Update updated_at on jrpat_times
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_jrpat_times_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_jrpat_times_updated_at_trigger ON jrpat_times;
CREATE TRIGGER update_jrpat_times_updated_at_trigger
  BEFORE UPDATE ON jrpat_times
  FOR EACH ROW EXECUTE FUNCTION public.update_jrpat_times_updated_at();
