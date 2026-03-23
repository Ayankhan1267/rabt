-- Video generation jobs
CREATE TABLE IF NOT EXISTS rabt_video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  category text,
  tone text,
  platform text DEFAULT 'instagram',
  video_type text DEFAULT 'avatar', -- avatar | faceless | carousel
  target_audience text,
  product_focus text,
  cta text,
  language text DEFAULT 'hinglish',
  -- Pipeline stages
  stage text DEFAULT 'queued', -- queued | scripting | voiceover | footage | rendering | avatar | ready | posting | posted | failed
  progress integer DEFAULT 0, -- 0-100
  error_message text,
  -- Generated content
  script jsonb, -- {hook, problem, solution, cta, full_text}
  voiceover_url text,
  footage_urls jsonb DEFAULT '[]',
  avatar_video_url text,
  final_video_url text,
  thumbnail_url text,
  caption text,
  hashtags text,
  -- Post results
  posted_platforms jsonb DEFAULT '[]',
  post_ids jsonb DEFAULT '{}',
  -- Stats (filled after posting)
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  reach integer DEFAULT 0,
  -- Meta
  duration_seconds integer,
  file_size_mb numeric,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE rabt_video_jobs DISABLE ROW LEVEL SECURITY;

-- Platform posting accounts (tokens stored here)
CREATE TABLE IF NOT EXISTS rabt_platform_tokens (
  platform text PRIMARY KEY,
  access_token text,
  refresh_token text,
  account_id text,
  account_name text,
  extra jsonb DEFAULT '{}',
  status text DEFAULT 'disconnected',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE rabt_platform_tokens DISABLE ROW LEVEL SECURITY;
