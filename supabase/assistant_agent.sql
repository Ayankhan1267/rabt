-- =============================================
-- Rabt HQ — Assistant Agent Tables
-- Run this in Supabase SQL Editor
-- =============================================

-- Tasks table
CREATE TABLE IF NOT EXISTS rabt_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_role TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
  area TEXT DEFAULT 'Operations',
  due_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assistant settings table
CREATE TABLE IF NOT EXISTS rabt_assistant_settings (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  report_time TEXT DEFAULT '09:00',
  phone_numbers TEXT[] DEFAULT '{}',
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reports log
CREATE TABLE IF NOT EXISTS rabt_daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE DEFAULT CURRENT_DATE,
  report_data JSONB NOT NULL,
  sent_to TEXT[],
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rabt_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rabt_assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rabt_daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read tasks"
  ON rabt_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON rabt_tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON rabt_tasks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete tasks"
  ON rabt_tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read settings"
  ON rabt_assistant_settings FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read reports"
  ON rabt_daily_reports FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rabt_tasks_status ON rabt_tasks(status);
CREATE INDEX IF NOT EXISTS idx_rabt_tasks_priority ON rabt_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_rabt_tasks_assigned_to ON rabt_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_rabt_tasks_area ON rabt_tasks(area);
CREATE INDEX IF NOT EXISTS idx_rabt_tasks_due_date ON rabt_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_rabt_daily_reports_date ON rabt_daily_reports(report_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rabt_tasks_updated_at
  BEFORE UPDATE ON rabt_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
