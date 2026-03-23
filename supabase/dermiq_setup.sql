-- =====================================================================
-- DermIQ HQ — Database Setup
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- =====================================================================

-- 1. Add dermiq_role column to profiles (enables DermIQ access control)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dermiq_role text;

-- 2. DermIQ Consultations (SEPARATE from Rabt consultations table)
CREATE TABLE IF NOT EXISTS dermiq_consultations (
  id bigserial PRIMARY KEY,
  patient_name text,
  patient_email text,
  specialist_id uuid REFERENCES profiles(id),
  specialist_name text,
  concern text,
  mode text DEFAULT 'video', -- video | audio | chat
  status text DEFAULT 'new', -- new | pending | active | completed | cancelled
  amount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. DermIQ Customers (buyers on DermIQ marketplace)
CREATE TABLE IF NOT EXISTS dermiq_customers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  skin_type text,
  concerns text[] DEFAULT '{}',
  joined date DEFAULT CURRENT_DATE,
  last_order date,
  created_at timestamptz DEFAULT now()
);

-- 4. Disable RLS for testing (enable and configure in production)
ALTER TABLE dermiq_consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE dermiq_customers DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- ROLE GRANTS (optional — for production RLS)
-- =====================================================================
-- Example: only dermiq_admin and dermiq_manager can read consultations
-- CREATE POLICY "dermiq_consult_read" ON dermiq_consultations
--   FOR SELECT USING (
--     auth.uid() IN (
--       SELECT id FROM profiles
--       WHERE role IN ('founder','admin')
--          OR dermiq_role IN ('dermiq_admin','dermiq_manager','dermiq_specialist_manager')
--     )
--   );

-- =====================================================================
-- VERIFY: Check your tables exist
-- =====================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name LIKE 'dermiq_%';
