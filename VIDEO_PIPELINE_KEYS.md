# Video Pipeline — Required Environment Variables

Add these to your `.env.local` file:

```
ANTHROPIC_API_KEY=          # Already exists — for script generation (Claude AI)
ELEVENLABS_API_KEY=         # elevenlabs.io — for voiceover TTS
HEYGEN_API_KEY=             # heygen.com — for AI avatar videos
PEXELS_API_KEY=             # pexels.com/api — free — for stock footage
SUPABASE_SERVICE_ROLE_KEY=  # Supabase dashboard → Settings → API → service_role key
```

## Where to get each key

### ANTHROPIC_API_KEY
- Already configured. Used by Claude to generate scripts.

### ELEVENLABS_API_KEY
1. Sign up at https://elevenlabs.io
2. Go to Profile → API Key
3. Free tier: 10,000 chars/month

### HEYGEN_API_KEY
1. Sign up at https://heygen.com
2. Go to Settings → API
3. Used for AI avatar video generation (1080x1920 vertical format for Reels)

### PEXELS_API_KEY
1. Sign up at https://www.pexels.com/api/
2. Free API — 200 requests/hour
3. Used to fetch stock B-roll footage by category keyword

### SUPABASE_SERVICE_ROLE_KEY
1. Supabase Dashboard → Your Project → Settings → API
2. Copy the `service_role` key (not the anon key)
3. Required for server-side writes without RLS

## Supabase Setup

Run the SQL file in your Supabase SQL Editor:
```
supabase/video_pipeline.sql
```

This creates:
- `rabt_video_jobs` — stores pipeline jobs and results
- `rabt_platform_tokens` — stores social media platform tokens for auto-posting

## Social Media Platform Tokens (for Auto-Post)

Insert tokens into `rabt_platform_tokens`:

```sql
INSERT INTO rabt_platform_tokens (platform, access_token, account_id, account_name, status)
VALUES
  ('instagram', 'YOUR_IG_TOKEN', 'YOUR_IG_ACCOUNT_ID', 'rabtnaturals', 'connected'),
  ('facebook',  'YOUR_FB_TOKEN', 'YOUR_FB_PAGE_ID',    'Rabt Naturals', 'connected');
```

For Instagram/Facebook tokens:
- Use Meta Business Suite → Settings → Instagram Account
- Generate a long-lived page token via Graph API Explorer

## Pipeline Flow

```
POST /api/video/generate
  └─ Creates job in DB
  └─ Starts background pipeline:
       1. Claude AI → script JSON (hook, problem, solution, CTA, caption, hashtags)
       2. ElevenLabs → voiceover MP3 → stored in Supabase Storage (video-assets bucket)
       3. Pexels API → 3 stock footage URLs by category
       4. HeyGen → AI avatar video (polls until complete, up to 5 min)
       5. Updates job stage to 'ready'

GET /api/video/status/[jobId]
  └─ Returns full job row (polled every 3s by UI)

POST /api/video/post
  └─ Posts to selected platforms via their APIs
  └─ Updates job stage to 'posted'
```
