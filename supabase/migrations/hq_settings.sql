-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS hq_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hq_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with founder/admin role can read/write
-- Service role bypasses RLS automatically (used by API routes)

-- Seed default settings
INSERT INTO hq_settings (key, value) VALUES
  ('general', '{"company_name":"Rabt Naturals","tagline":"Skin Science. Real Results.","email":"hello@rabtnaturals.com","phone":"+91 9876543210","website":"https://rabtnaturals.com","address":"Mumbai, Maharashtra, India","gst":"","currency":"INR","timezone":"Asia/Kolkata","logo_url":""}'),
  ('notifications', '{"wa_new_order":true,"wa_new_lead":true,"wa_consultation":true,"wa_payment":true,"push_new_order":true,"push_new_lead":false,"email_daily_summary":false,"email_weekly_report":true}'),
  ('crm_config', '{"auto_assign":false,"default_stage":"new","auto_advance_on_consult":true,"auto_advance_on_purchase":true,"follow_up_days":"3"}'),
  ('security', '{"otp_expiry_minutes":"10","session_days":"30","require_phone_for_all":true}')
ON CONFLICT (key) DO NOTHING;
