-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS phone_otps (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone      text NOT NULL,
  otp        text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_lookup ON phone_otps(phone, otp, used, expires_at);

-- Only service role can read/write (no RLS needed for server-side routes)
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically
-- No client-side access needed
