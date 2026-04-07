-- Run this once in the Supabase SQL Editor
-- Adds the app_settings table for storing the active test year

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: anyone can read, only authenticated users can update
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_select_policy ON app_settings
  FOR SELECT USING (true);

CREATE POLICY app_settings_update_policy ON app_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed the current year
INSERT INTO app_settings (key, value)
VALUES ('current_year', '2026')
ON CONFLICT (key) DO NOTHING;
