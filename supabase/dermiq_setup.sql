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

-- 5. DermIQ AI Config (AI Control Center stores weights, rules, thresholds)
CREATE TABLE IF NOT EXISTS dermiq_ai_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE dermiq_ai_config DISABLE ROW LEVEL SECURITY;

-- 6. DermIQ Content (CMS — banners, announcements, featured products)
CREATE TABLE IF NOT EXISTS dermiq_content (
  id text PRIMARY KEY,
  data jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE dermiq_content DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- VERIFY: Check your tables exist
-- =====================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name LIKE 'dermiq_%';

-- =====================================================================
-- DermIQ Influencer & Promoting Partner System
-- =====================================================================

-- Influencers / Promoting Partners table
CREATE TABLE IF NOT EXISTS dermiq_influencers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  instagram text,
  youtube text,
  category text DEFAULT 'skincare', -- skincare | haircare | supplements | bodycare | general
  tier text DEFAULT 'nano', -- nano (<10k) | micro (10k-100k) | macro (100k-1M) | mega (1M+)
  referral_slug text UNIQUE NOT NULL, -- e.g. "priya-sharma" → dermiq.com/ref/priya-sharma
  coupon_code text UNIQUE NOT NULL, -- e.g. "PRIYA15" → 15% off
  coupon_discount integer DEFAULT 15, -- percent
  commission_per_lead numeric DEFAULT 5, -- ₹5 per skin analysis completed
  commission_per_consultation numeric DEFAULT 20, -- ₹20 per consultation booked
  commission_percent numeric DEFAULT 8, -- % of each product sale
  status text DEFAULT 'pending', -- pending | active | paused | rejected
  custom_headline text, -- "Get your FREE skin analysis — Recommended by Priya"
  custom_message text, -- personal message shown on landing page
  profile_image text, -- influencer photo URL
  total_clicks integer DEFAULT 0,
  total_signups integer DEFAULT 0,
  total_analyses integer DEFAULT 0,
  total_consultations integer DEFAULT 0,
  total_sales integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  pending_payout numeric DEFAULT 0,
  paid_out numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE dermiq_influencers DISABLE ROW LEVEL SECURITY;

-- Referral events (every tracked action)
CREATE TABLE IF NOT EXISTS dermiq_referral_events (
  id bigserial PRIMARY KEY,
  influencer_id bigint REFERENCES dermiq_influencers(id),
  influencer_slug text,
  event_type text NOT NULL, -- click | signup | analysis | consultation | purchase
  user_email text,
  user_name text,
  product_name text,
  order_amount numeric DEFAULT 0,
  commission_earned numeric DEFAULT 0,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dermiq_referral_events DISABLE ROW LEVEL SECURITY;

-- Payout requests
CREATE TABLE IF NOT EXISTS dermiq_influencer_payouts (
  id bigserial PRIMARY KEY,
  influencer_id bigint REFERENCES dermiq_influencers(id),
  amount numeric NOT NULL,
  upi_id text,
  status text DEFAULT 'pending', -- pending | processing | paid | rejected
  notes text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE dermiq_influencer_payouts DISABLE ROW LEVEL SECURITY;
