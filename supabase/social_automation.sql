-- ============================================================
-- Rabt HQ — AI Social Media Automation Tables
-- Created: 2026-03-23
-- ============================================================

-- Social media connected accounts
CREATE TABLE IF NOT EXISTS rabt_social_accounts (
  id bigserial PRIMARY KEY,
  platform text NOT NULL, -- instagram | facebook | youtube | linkedin | threads
  account_name text,
  access_token text,
  page_id text,
  followers integer DEFAULT 0,
  status text DEFAULT 'disconnected', -- connected | disconnected | error
  last_post_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rabt_social_accounts DISABLE ROW LEVEL SECURITY;

-- Content drafts / queue
CREATE TABLE IF NOT EXISTS rabt_social_posts (
  id bigserial PRIMARY KEY,
  platform text NOT NULL,
  content_type text, -- reel | carousel | caption | short | post | thread
  category text,
  caption text,
  hashtags text,
  media_url text,
  script text,
  tone text,
  cta text,
  status text DEFAULT 'draft', -- draft | queued | scheduled | posting | posted | failed
  scheduled_at timestamptz,
  posted_at timestamptz,
  post_id_external text, -- returned by platform API
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rabt_social_posts DISABLE ROW LEVEL SECURITY;

-- Automation settings
CREATE TABLE IF NOT EXISTS rabt_social_automation (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE rabt_social_automation DISABLE ROW LEVEL SECURITY;

-- A/B Tests
CREATE TABLE IF NOT EXISTS rabt_social_ab_tests (
  id bigserial PRIMARY KEY,
  name text,
  variant_a_id bigint REFERENCES rabt_social_posts(id),
  variant_b_id bigint REFERENCES rabt_social_posts(id),
  winner_id bigint,
  status text DEFAULT 'running', -- running | completed
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rabt_social_ab_tests DISABLE ROW LEVEL SECURITY;

-- ── Default automation settings seed ────────────────────────────────────────
INSERT INTO rabt_social_automation (key, value) VALUES
  ('master_toggle', '{"enabled": true}'::jsonb),
  ('auto_post_reels', '{"enabled": true}'::jsonb),
  ('auto_hashtags', '{"enabled": true}'::jsonb),
  ('optimal_timing_ai', '{"enabled": true}'::jsonb),
  ('cross_posting', '{"enabled": false}'::jsonb),
  ('post_times', '{"instagram": ["18:00","19:00","20:00"], "facebook": ["17:00","19:30"], "youtube": ["18:00"], "linkedin": ["09:00","12:00"], "threads": ["19:00"]}'::jsonb),
  ('categories_auto', '{"list": ["Skincare","Haircare","Body Care"]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ── Default connected accounts seed ─────────────────────────────────────────
INSERT INTO rabt_social_accounts (platform, account_name, followers, status) VALUES
  ('instagram', '@rabtnaturals', 12400, 'connected'),
  ('facebook', 'Rabt Naturals', 8200, 'connected'),
  ('youtube', 'Rabt Naturals', 4100, 'connected'),
  ('linkedin', 'Rabt Naturals', 2800, 'connected'),
  ('threads', NULL, 0, 'disconnected')
ON CONFLICT DO NOTHING;
