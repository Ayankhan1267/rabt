'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Color tokens ──────────────────────────────────────────────────────────
const C = {
  teal: '#2D5F5A',
  dark: '#1A2E2B',
  border: '#E8E0D8',
  cream: '#F7F3EE',
  green: '#10B981',
  red: '#EF4444',
  gold: '#D4A853',
  mu: '#6B7280',
  purple: '#8B5CF6',
  orange: '#F97316',
  bg: '#F9F6F2',
  white: '#FFFFFF',
  amber: '#F59E0B',
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface VideoJob {
  id: string
  title: string
  category: string
  tone: string
  platform: string
  video_type: string
  stage: string
  progress: number
  error_message?: string
  script?: {
    hook?: string
    problem?: string
    solution?: string
    cta?: string
    full_voiceover?: string
    caption?: string
    hashtags?: string
    title?: string
  }
  voiceover_url?: string
  footage_urls?: string[]
  avatar_video_url?: string
  final_video_url?: string
  caption?: string
  hashtags?: string
  posted_platforms?: string[]
  post_ids?: Record<string, string>
  views?: number
  likes?: number
  comments?: number
  shares?: number
  created_at: string
  updated_at: string
}

interface FormState {
  category: string
  videoType: string
  platform: string
  tone: string
  language: string
  productFocus: string
  cta: string
  targetAudience: string
}

const PIPELINE_STAGES = [
  { key: 'scripting', label: 'Script', icon: '✍️' },
  { key: 'voiceover', label: 'Voiceover', icon: '🎙️' },
  { key: 'footage', label: 'Footage', icon: '🎬' },
  { key: 'avatar', label: 'AI Avatar', icon: '🤖' },
  { key: 'ready', label: 'Ready', icon: '✅' },
]

const STAGE_ORDER = ['queued', 'scripting', 'voiceover', 'footage', 'avatar', 'ready', 'posted']

function getStageStatus(stageKey: string, currentStage: string) {
  if (currentStage === 'failed') return 'failed'
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const stageIdx = STAGE_ORDER.indexOf(stageKey)
  if (stageIdx < currentIdx) return 'done'
  if (stageIdx === currentIdx) return 'active'
  return 'pending'
}

function stageBadgeStyle(stage: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    ready: { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
    posted: { background: '#CCFBF1', color: '#0F766E', border: '1px solid #99F6E4' },
    failed: { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
    scripting: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
    voiceover: { background: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' },
    footage: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
    avatar: { background: '#E0F2FE', color: '#075985', border: '1px solid #BAE6FD' },
    queued: { background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
  }
  return map[stage] || map.queued
}

function platformIcon(p: string) {
  const icons: Record<string, string> = {
    instagram: '📸',
    youtube: '▶️',
    linkedin: '💼',
    facebook: '👤',
  }
  return icons[p] || '📱'
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function VideoStudioPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'videos'>('create')
  const [form, setForm] = useState<FormState>({
    category: 'skincare',
    videoType: 'avatar',
    platform: 'instagram',
    tone: 'Gen-Z Casual',
    language: 'hinglish',
    productFocus: '',
    cta: 'Check link in bio for free skin analysis',
    targetAudience: 'Women 18-24',
  })
  const [generating, setGenerating] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<VideoJob | null>(null)
  const [postPlatforms, setPostPlatforms] = useState<string[]>(['instagram'])
  const [posting, setPosting] = useState(false)
  const [postResult, setPostResult] = useState<Record<string, string> | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [scheduleTime, setScheduleTime] = useState('')
  const [expandedScript, setExpandedScript] = useState(false)

  // My Videos tab
  const [videos, setVideos] = useState<VideoJob[]>([])
  const [videosPage, setVideosPage] = useState(1)
  const [totalVideos, setTotalVideos] = useState(0)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoJob | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Poll job status
  useEffect(() => {
    if (!activeJobId) return
    stopPolling()

    const poll = async () => {
      try {
        const res = await fetch(`/api/video/status/${activeJobId}`)
        if (!res.ok) return
        const data: VideoJob = await res.json()
        setActiveJob(data)
        if (data.stage === 'ready' || data.stage === 'posted' || data.stage === 'failed') {
          stopPolling()
          setGenerating(false)
        }
      } catch {
        // ignore poll errors
      }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => stopPolling()
  }, [activeJobId, stopPolling])

  // Load videos on tab switch
  useEffect(() => {
    if (activeTab === 'videos') loadVideos(videosPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, videosPage])

  async function loadVideos(page: number) {
    setLoadingVideos(true)
    const from = (page - 1) * 10
    const to = from + 9
    const { data, count } = await supabase
      .from('rabt_video_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    setVideos((data as VideoJob[]) || [])
    setTotalVideos(count || 0)
    setLoadingVideos(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    setActiveJob(null)
    setActiveJobId(null)
    setPostResult(null)
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.jobId) {
        setActiveJobId(data.jobId)
      } else {
        setGenerating(false)
        alert('Failed to start pipeline: ' + (data.error || 'Unknown error'))
      }
    } catch (e) {
      setGenerating(false)
      alert('Error: ' + String(e))
    }
  }

  async function handlePost() {
    if (!activeJob) return
    setPosting(true)
    try {
      const res = await fetch('/api/video/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: activeJob.id, platforms: postPlatforms }),
      })
      const data = await res.json()
      setPostResult(data.results || {})
      if (data.posted?.length > 0) {
        setActiveJob((prev) =>
          prev ? { ...prev, stage: 'posted', posted_platforms: data.posted } : prev
        )
      }
    } catch (e) {
      alert('Post failed: ' + String(e))
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this video job?')) return
    await supabase.from('rabt_video_jobs').delete().eq('id', id)
    loadVideos(videosPage)
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopyFeedback(label)
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  const totalPages = Math.ceil(totalVideos / 10)
  const stats = {
    total: totalVideos,
    posted: videos.filter((v) => v.stage === 'posted').length,
    pending: videos.filter((v) => !['ready', 'posted', 'failed'].includes(v.stage)).length,
    failed: videos.filter((v) => v.stage === 'failed').length,
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>
      {/* Page Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.dark} 0%, ${C.teal} 100%)`,
          padding: '24px 32px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: C.white, fontSize: 26, fontWeight: 700, margin: 0 }}>
              🎬 Video Studio
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: 14 }}>
              AI-powered video pipeline: Script → Voice → Avatar → Auto-Post
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: C.white,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Claude AI
            </span>
            <span
              style={{
                background: `${C.gold}33`,
                color: C.gold,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              HeyGen + ElevenLabs
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
          {(['create', 'videos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                background: activeTab === tab ? C.white : 'rgba(255,255,255,0.12)',
                color: activeTab === tab ? C.dark : 'rgba(255,255,255,0.8)',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'create' ? '🚀 Create Video' : '📂 My Videos'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 32px' }}>
        {activeTab === 'create' ? (
          <CreateTab
            form={form}
            setForm={setForm}
            generating={generating}
            activeJob={activeJob}
            onGenerate={handleGenerate}
            postPlatforms={postPlatforms}
            setPostPlatforms={setPostPlatforms}
            posting={posting}
            postResult={postResult}
            onPost={handlePost}
            copyText={copyText}
            copyFeedback={copyFeedback}
            scheduleTime={scheduleTime}
            setScheduleTime={setScheduleTime}
            expandedScript={expandedScript}
            setExpandedScript={setExpandedScript}
          />
        ) : (
          <VideosTab
            videos={videos}
            loading={loadingVideos}
            stats={stats}
            page={videosPage}
            totalPages={totalPages}
            onPageChange={setVideosPage}
            onDelete={handleDelete}
            onView={setSelectedVideo}
            onPost={(job) => {
              setActiveJob(job)
              setActiveTab('create')
              setActiveJobId(job.id)
            }}
            selectedVideo={selectedVideo}
            onCloseVideo={() => setSelectedVideo(null)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Create Tab ─────────────────────────────────────────────────────────────
interface CreateTabProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  generating: boolean
  activeJob: VideoJob | null
  onGenerate: () => void
  postPlatforms: string[]
  setPostPlatforms: React.Dispatch<React.SetStateAction<string[]>>
  posting: boolean
  postResult: Record<string, string> | null
  onPost: () => void
  copyText: (text: string, label: string) => void
  copyFeedback: string | null
  scheduleTime: string
  setScheduleTime: React.Dispatch<React.SetStateAction<string>>
  expandedScript: boolean
  setExpandedScript: React.Dispatch<React.SetStateAction<boolean>>
}

function CreateTab({
  form,
  setForm,
  generating,
  activeJob,
  onGenerate,
  postPlatforms,
  setPostPlatforms,
  posting,
  postResult,
  onPost,
  copyText,
  copyFeedback,
  scheduleTime,
  setScheduleTime,
  expandedScript,
  setExpandedScript,
}: CreateTabProps) {
  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function togglePostPlatform(p: string) {
    setPostPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.white,
    fontSize: 13,
    color: C.dark,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: C.mu,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: 20,
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* ── Left: Settings Panel ── */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          background: C.white,
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          padding: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: 0 }}>
            🎬 AI Video Generator
          </h2>
          <p style={{ fontSize: 12, color: C.mu, margin: '4px 0 0' }}>
            Script → Voice → Avatar → Auto-Post
          </p>
        </div>

        {/* Category */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Category</label>
          <select
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            style={inputStyle}
          >
            {['skincare', 'haircare', 'body care', 'supplements', 'baby care', 'color cosmetics'].map(
              (c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              )
            )}
          </select>
        </div>

        {/* Video Type */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Video Type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { value: 'avatar',   icon: '🤖', label: 'AI Avatar (HeyGen)',    desc: 'AI presenter reads your script — most engaging' },
              { value: 'faceless', icon: '🎬', label: 'Faceless Reel',          desc: 'Stock footage + voiceover — trending format' },
              { value: 'carousel', icon: '🎠', label: 'Carousel (10 Slides)',   desc: 'AI-generated images + educational content' },
              { value: 'story',    icon: '⭕', label: 'Story (IG + FB)',         desc: 'Vertical story with AI background image' },
              { value: 'text',     icon: '📱', label: 'Text Animation',          desc: 'Text-based viral format — fastest' },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `2px solid ${form.videoType === opt.value ? C.teal : C.border}`,
                  background: form.videoType === opt.value ? `${C.teal}0D` : C.white,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="videoType"
                  value={opt.value}
                  checked={form.videoType === opt.value}
                  onChange={() => setField('videoType', opt.value)}
                  style={{ marginTop: 2, accentColor: C.teal }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                    {opt.icon} {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Platform</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { value: 'instagram', icon: '📸', label: 'Instagram Reel' },
              { value: 'instagram_story', icon: '⭕', label: 'Instagram Story' },
              { value: 'facebook_page', icon: '👍', label: 'Facebook Page' },
              { value: 'facebook_story', icon: '🔵', label: 'Facebook Story' },
              { value: 'youtube', icon: '▶️', label: 'YouTube' },
              { value: 'linkedin', icon: '💼', label: 'LinkedIn' },
              { value: 'twitter', icon: '𝕏', label: 'Twitter / X' },
              { value: 'threads', icon: '🧵', label: 'Threads' },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `2px solid ${form.platform === opt.value ? C.teal : C.border}`,
                  background: form.platform === opt.value ? `${C.teal}0D` : C.white,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.dark,
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="platform"
                  value={opt.value}
                  checked={form.platform === opt.value}
                  onChange={() => setField('platform', opt.value)}
                  style={{ accentColor: C.teal }}
                />
                {opt.icon} {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Tone</label>
          <select
            value={form.tone}
            onChange={(e) => setField('tone', e.target.value)}
            style={inputStyle}
          >
            {[
              'Gen-Z Casual',
              'Clinical Expert',
              'Luxury Brand',
              'Motivational',
              'Relatable & Funny',
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Language</label>
          <select
            value={form.language}
            onChange={(e) => setField('language', e.target.value)}
            style={inputStyle}
          >
            <option value="hinglish">Hinglish</option>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
          </select>
        </div>

        {/* Product Focus */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Product Focus (optional)</label>
          <input
            type="text"
            placeholder="e.g. Vitamin C Serum, Hair Oil..."
            value={form.productFocus}
            onChange={(e) => setField('productFocus', e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* CTA */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Call to Action</label>
          <select
            value={form.cta}
            onChange={(e) => setField('cta', e.target.value)}
            style={inputStyle}
          >
            <option value="Check link in bio for free skin analysis">
              Free skin analysis
            </option>
            <option value="Shop now at rabtnaturals.com">Shop now</option>
            <option value="Check link in bio">Check link in bio</option>
            <option value="Book a free consultation today">Book consultation</option>
          </select>
        </div>

        {/* Target Audience */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Target Audience</label>
          <select
            value={form.targetAudience}
            onChange={(e) => setField('targetAudience', e.target.value)}
            style={inputStyle}
          >
            <option value="Women 18-24">Women 18-24</option>
            <option value="Women 25-35">Women 25-35</option>
            <option value="Men 25-40">Men 25-40</option>
            <option value="All genders 18-35">All genders</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={generating}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            border: 'none',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 15,
            background: generating
              ? C.mu
              : `linear-gradient(135deg, ${C.teal} 0%, #1D4A45 100%)`,
            color: C.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: generating ? 'none' : `0 4px 16px ${C.teal}55`,
            transition: 'all 0.2s',
          }}
        >
          {generating ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                ⟳
              </span>{' '}
              Generating...
            </>
          ) : (
            '🚀 Generate Video'
          )}
        </button>
      </div>

      {/* ── Right: Pipeline Tracker + Output ── */}
      <div style={{ flex: 1 }}>
        {!activeJob && !generating ? (
          <EmptyState />
        ) : (
          <>
            {/* Pipeline Tracker */}
            <PipelineTracker job={activeJob} generating={generating} />

            {/* Result Panel */}
            {activeJob && (activeJob.stage === 'ready' || activeJob.stage === 'posted') && (
              <ResultPanel
                job={activeJob}
                postPlatforms={postPlatforms}
                togglePostPlatform={togglePostPlatform}
                posting={posting}
                postResult={postResult}
                onPost={onPost}
                copyText={copyText}
                copyFeedback={copyFeedback}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                expandedScript={expandedScript}
                setExpandedScript={setExpandedScript}
              />
            )}

            {/* Failed state */}
            {activeJob && activeJob.stage === 'failed' && (
              <div
                style={{
                  marginTop: 16,
                  background: '#FEF2F2',
                  border: `1px solid #FECACA`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: C.red, marginBottom: 8 }}>
                  ❌ Pipeline Failed
                </div>
                <div style={{ fontSize: 13, color: '#7F1D1D', fontFamily: 'monospace' }}>
                  {activeJob.error_message || 'Unknown error'}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 60,
        textAlign: 'center',
        animation: 'slideIn 0.4s ease',
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎬</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: C.dark, margin: '0 0 8px' }}>
        Your Video Pipeline
      </h3>
      <p style={{ fontSize: 14, color: C.mu, maxWidth: 320, margin: '0 auto 24px' }}>
        Fill in the settings on the left and click Generate Video to start the AI pipeline.
        Script → Voice → Avatar → Auto-Post.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        {['✍️ Claude AI Script', '🎙️ ElevenLabs Voice', '🎬 Pexels Footage', '🤖 HeyGen Avatar'].map(
          (step) => (
            <span
              key={step}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: `${C.teal}12`,
                color: C.teal,
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${C.teal}30`,
              }}
            >
              {step}
            </span>
          )
        )}
      </div>
    </div>
  )
}

// ─── Pipeline Tracker ────────────────────────────────────────────────────────
function PipelineTracker({
  job,
  generating,
}: {
  job: VideoJob | null
  generating: boolean
}) {
  const currentStage = job?.stage || (generating ? 'scripting' : 'queued')
  const progress = job?.progress || (generating ? 10 : 0)

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
        animation: 'slideIn 0.3s ease',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: 0 }}>
            Pipeline Progress
          </h3>
          {job?.title && (
            <p style={{ fontSize: 12, color: C.mu, margin: '2px 0 0' }}>{job.title}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>{progress}%</span>
          {job && (
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                ...stageBadgeStyle(currentStage),
              }}
            >
              {currentStage}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: 6,
          background: '#E5E7EB',
          borderRadius: 6,
          marginBottom: 24,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: currentStage === 'failed'
              ? C.red
              : `linear-gradient(90deg, ${C.teal}, ${C.green})`,
            borderRadius: 6,
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      {/* Stage Cards */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {PIPELINE_STAGES.map((stage, idx) => {
          const status = getStageStatus(stage.key, currentStage)
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  borderRadius: 10,
                  border: `2px solid ${
                    status === 'active'
                      ? C.teal
                      : status === 'done'
                      ? C.green
                      : status === 'failed'
                      ? C.red
                      : C.border
                  }`,
                  background:
                    status === 'active'
                      ? `${C.teal}0D`
                      : status === 'done'
                      ? `${C.green}0D`
                      : status === 'failed'
                      ? `${C.red}0D`
                      : C.cream,
                  textAlign: 'center',
                  transition: 'all 0.3s',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    marginBottom: 4,
                    animation: status === 'active' ? 'pulse 1.5s ease infinite' : 'none',
                  }}
                >
                  {status === 'done' ? '✅' : status === 'failed' ? '❌' : stage.icon}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      status === 'active'
                        ? C.teal
                        : status === 'done'
                        ? C.green
                        : status === 'failed'
                        ? C.red
                        : C.mu,
                  }}
                >
                  {stage.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: C.mu,
                    marginTop: 2,
                    textTransform: 'capitalize',
                  }}
                >
                  {status === 'active' ? '⟳ Processing' : status}
                </div>
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div
                  style={{
                    width: 16,
                    height: 2,
                    background: status === 'done' ? C.green : C.border,
                    flexShrink: 0,
                    margin: '0 2px',
                    transition: 'background 0.3s',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Result Panel ────────────────────────────────────────────────────────────
interface ResultPanelProps {
  job: VideoJob
  postPlatforms: string[]
  togglePostPlatform: (p: string) => void
  posting: boolean
  postResult: Record<string, string> | null
  onPost: () => void
  copyText: (text: string, label: string) => void
  copyFeedback: string | null
  scheduleTime: string
  setScheduleTime: React.Dispatch<React.SetStateAction<string>>
  expandedScript: boolean
  setExpandedScript: React.Dispatch<React.SetStateAction<boolean>>
}

function ResultPanel({
  job,
  postPlatforms,
  togglePostPlatform,
  posting,
  postResult,
  onPost,
  copyText,
  copyFeedback,
  scheduleTime,
  setScheduleTime,
  expandedScript,
  setExpandedScript,
}: ResultPanelProps) {
  const script = job.script || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideIn 0.4s ease' }}>
      {/* Video Preview */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>🎥</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.dark, margin: 0 }}>
            Video Preview
          </h3>
          {job.stage === 'posted' && (
            <span
              style={{
                marginLeft: 'auto',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: '#CCFBF1',
                color: '#0F766E',
                border: '1px solid #99F6E4',
              }}
            >
              ✓ Posted
            </span>
          )}
        </div>

        {job.avatar_video_url || job.final_video_url ? (
          <div style={{ position: 'relative' }}>
            <video
              src={job.avatar_video_url || job.final_video_url || undefined}
              controls
              style={{
                width: '100%',
                maxHeight: 360,
                borderRadius: 12,
                background: '#000',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(0,0,0,0.6)',
                color: C.white,
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {job.video_type === 'avatar' ? '🤖 AI Avatar' : '🎬 Faceless'}
            </div>
          </div>
        ) : (
          <div
            style={{
              height: 200,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${C.dark}, ${C.teal})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 40 }}>🎬</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {job.voiceover_url ? 'Video rendering complete' : 'Processing video...'}
            </div>
            {job.voiceover_url && (
              <audio src={job.voiceover_url} controls style={{ marginTop: 8 }} />
            )}
          </div>
        )}

        {/* Download */}
        {(job.avatar_video_url || job.final_video_url) && (
          <a
            href={job.avatar_video_url || job.final_video_url || '#'}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              padding: '8px 16px',
              borderRadius: 8,
              background: C.cream,
              color: C.teal,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              border: `1px solid ${C.border}`,
            }}
          >
            ⬇️ Download Video
          </a>
        )}
      </div>

      {/* Script Accordion */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={() => setExpandedScript(!expandedScript)}
          style={{
            width: '100%',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            color: C.dark,
          }}
        >
          <span>✍️ Generated Script</span>
          <span style={{ fontSize: 18, color: C.mu }}>{expandedScript ? '▲' : '▼'}</span>
        </button>
        {expandedScript && (
          <div style={{ padding: '0 24px 20px', borderTop: `1px solid ${C.border}` }}>
            {[
              { key: 'hook', label: '🎣 Hook (0-3s)', color: C.orange },
              { key: 'problem', label: '😰 Problem (3-8s)', color: C.red },
              { key: 'solution', label: '✨ Solution (8-20s)', color: C.green },
              { key: 'cta', label: '📢 CTA (20-30s)', color: C.teal },
            ].map(({ key, label, color }) => (
              <div
                key={key}
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 10,
                  background: `${color}0D`,
                  border: `1px solid ${color}33`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 6,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.5 }}>
                  {script[key as keyof typeof script] || '—'}
                </div>
              </div>
            ))}
            {script.full_voiceover && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.purple,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 6,
                  }}
                >
                  🎙️ Full Voiceover Text
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.dark,
                    lineHeight: 1.6,
                    background: `${C.purple}0D`,
                    border: `1px solid ${C.purple}33`,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  {script.full_voiceover}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption + Hashtags */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: '0 0 14px' }}>
          📝 Caption & Hashtags
        </h3>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: C.mu, textTransform: 'uppercase' }}>
              Caption
            </span>
            <button
              onClick={() => copyText(job.caption || '', 'caption')}
              style={{
                padding: '3px 10px',
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: copyFeedback === 'caption' ? C.green : C.cream,
                color: copyFeedback === 'caption' ? C.white : C.teal,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copyFeedback === 'caption' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <textarea
            value={job.caption || ''}
            readOnly
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.cream,
              fontSize: 13,
              color: C.dark,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: C.mu, textTransform: 'uppercase' }}>
              Hashtags
            </span>
            <button
              onClick={() => copyText(job.hashtags || '', 'hashtags')}
              style={{
                padding: '3px 10px',
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: copyFeedback === 'hashtags' ? C.green : C.cream,
                color: copyFeedback === 'hashtags' ? C.white : C.teal,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copyFeedback === 'hashtags' ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.cream,
              fontSize: 12,
              color: C.teal,
              lineHeight: 1.7,
              wordBreak: 'break-word',
            }}
          >
            {job.hashtags || '—'}
          </div>
        </div>
      </div>

      {/* Post to Platforms */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: '0 0 14px' }}>
          🚀 Post to Platforms
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { value: 'instagram', icon: '📸', label: 'Instagram' },
            { value: 'youtube', icon: '▶️', label: 'YouTube' },
            { value: 'linkedin', icon: '💼', label: 'LinkedIn' },
            { value: 'facebook', icon: '👤', label: 'Facebook' },
          ].map((p) => (
            <label
              key={p.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 10,
                border: `2px solid ${postPlatforms.includes(p.value) ? C.teal : C.border}`,
                background: postPlatforms.includes(p.value) ? `${C.teal}0D` : C.cream,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: C.dark,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={postPlatforms.includes(p.value)}
                onChange={() => togglePostPlatform(p.value)}
                style={{ accentColor: C.teal }}
              />
              {p.icon} {p.label}
            </label>
          ))}
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.mu,
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Schedule (optional)
          </label>
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.cream,
              fontSize: 13,
              color: C.dark,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onPost}
            disabled={posting || postPlatforms.length === 0}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              cursor: posting || postPlatforms.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 14,
              background:
                posting || postPlatforms.length === 0
                  ? C.mu
                  : `linear-gradient(135deg, ${C.teal}, #1D4A45)`,
              color: C.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {posting ? '⟳ Posting...' : '🚀 Post Now'}
          </button>
        </div>

        {/* Post Results */}
        {postResult && (
          <div style={{ marginTop: 14 }}>
            {Object.entries(postResult).map(([platform, result]) => (
              <div
                key={platform}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background:
                    result === 'not_connected'
                      ? '#FEF3C7'
                      : result.startsWith('failed') || result.startsWith('error')
                      ? '#FEF2F2'
                      : '#D1FAE5',
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span>{platformIcon(platform)}</span>
                <span style={{ fontWeight: 600, color: C.dark, textTransform: 'capitalize' }}>
                  {platform}:
                </span>
                <span
                  style={{
                    color:
                      result === 'not_connected'
                        ? '#92400E'
                        : result.startsWith('failed') || result.startsWith('error')
                        ? C.red
                        : C.green,
                    fontSize: 12,
                  }}
                >
                  {result === 'not_connected'
                    ? '⚠️ Not connected — add token in settings'
                    : result.startsWith('failed') || result.startsWith('error')
                    ? `❌ ${result}`
                    : `✓ Posted (ID: ${result.slice(0, 20)}...)`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Videos Tab ──────────────────────────────────────────────────────────────
interface VideosTabProps {
  videos: VideoJob[]
  loading: boolean
  stats: { total: number; posted: number; pending: number; failed: number }
  page: number
  totalPages: number
  onPageChange: (p: number) => void
  onDelete: (id: string) => void
  onView: (job: VideoJob) => void
  onPost: (job: VideoJob) => void
  selectedVideo: VideoJob | null
  onCloseVideo: () => void
}

function VideosTab({
  videos,
  loading,
  stats,
  page,
  totalPages,
  onPageChange,
  onDelete,
  onView,
  onPost,
  selectedVideo,
  onCloseVideo,
}: VideosTabProps) {
  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Videos', value: stats.total, icon: '🎬', color: C.teal },
          { label: 'Posted', value: stats.posted, icon: '✅', color: C.green },
          { label: 'Pending', value: stats.pending, icon: '⏳', color: C.amber },
          { label: 'Failed', value: stats.failed, icon: '❌', color: C.red },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '16px 20px',
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontSize: 32,
              animation: 'spin 1s linear infinite',
              display: 'inline-block',
            }}
          >
            ⟳
          </div>
          <div style={{ color: C.mu, marginTop: 8 }}>Loading videos...</div>
        </div>
      ) : videos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.dark }}>No videos yet</div>
          <div style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>
            Create your first video in the Generate tab
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {videos.map((job) => (
              <VideoCard
                key={job.id}
                job={job}
                onView={() => onView(job)}
                onPost={() => onPost(job)}
                onDelete={() => onDelete(job.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                marginTop: 24,
              }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${p === page ? C.teal : C.border}`,
                    background: p === page ? C.teal : C.white,
                    color: p === page ? C.white : C.dark,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <VideoModal job={selectedVideo} onClose={onCloseVideo} />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Video Card ──────────────────────────────────────────────────────────────
function VideoCard({
  job,
  onView,
  onPost,
  onDelete,
}: {
  job: VideoJob
  onView: () => void
  onPost: () => void
  onDelete: () => void
}) {
  const isPosted = job.stage === 'posted'
  const isReady = job.stage === 'ready'
  const isFailed = job.stage === 'failed'
  const isProcessing = !['ready', 'posted', 'failed'].includes(job.stage)

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* Thumbnail / Preview */}
      <div
        style={{
          height: 140,
          background: `linear-gradient(135deg, ${C.dark} 0%, ${C.teal} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {job.avatar_video_url || job.final_video_url ? (
          <video
            src={job.avatar_video_url || job.final_video_url || undefined}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            muted
          />
        ) : (
          <div style={{ fontSize: 40 }}>{isFailed ? '❌' : isProcessing ? '⟳' : '🎬'}</div>
        )}
        {/* Platform badge */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.6)',
            color: C.white,
            padding: '2px 8px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {platformIcon(job.platform)} {job.platform}
        </div>
        {/* Stage badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '2px 8px',
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            ...stageBadgeStyle(job.stage),
          }}
        >
          {job.stage}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4, lineHeight: 1.3 }}>
          {job.title || `${job.category} video`}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 10,
          }}
        >
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 20,
              background: `${C.teal}12`,
              color: C.teal,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {job.category}
          </span>
          {job.tone && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 20,
                background: `${C.purple}12`,
                color: C.purple,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {job.tone}
            </span>
          )}
        </div>

        {/* Stats (if posted) */}
        {isPosted && (job.views || job.likes) ? (
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 10,
              fontSize: 12,
              color: C.mu,
            }}
          >
            <span>👁️ {job.views || 0}</span>
            <span>❤️ {job.likes || 0}</span>
            <span>💬 {job.comments || 0}</span>
            <span>🔄 {job.shares || 0}</span>
          </div>
        ) : null}

        {/* Posted platforms */}
        {job.posted_platforms && job.posted_platforms.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {job.posted_platforms.map((p) => (
              <span key={p} style={{ fontSize: 16 }} title={p}>
                {platformIcon(p)}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: C.mu, marginBottom: 12 }}>
          {new Date(job.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onView}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.cream,
              color: C.dark,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            👁️ View
          </button>
          {isReady && (
            <button
              onClick={onPost}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 8,
                border: 'none',
                background: C.teal,
                color: C.white,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🚀 Post
            </button>
          )}
          <button
            onClick={onDelete}
            style={{
              width: 34,
              padding: '7px 0',
              borderRadius: 8,
              border: `1px solid #FECACA`,
              background: '#FEF2F2',
              color: C.red,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Video Modal ──────────────────────────────────────────────────────────────
function VideoModal({ job, onClose }: { job: VideoJob; onClose: () => void }) {
  const script = job.script || {}
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 20,
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: 28,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: C.cream,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: C.mu,
          }}
        >
          ✕ Close
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: '0 0 4px', paddingRight: 60 }}>
          {job.title || `${job.category} video`}
        </h2>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              ...stageBadgeStyle(job.stage),
            }}
          >
            {job.stage}
          </span>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: `${C.teal}12`,
              color: C.teal,
            }}
          >
            {platformIcon(job.platform)} {job.platform}
          </span>
        </div>

        {/* Video */}
        {(job.avatar_video_url || job.final_video_url) && (
          <video
            src={job.avatar_video_url || job.final_video_url || undefined}
            controls
            style={{
              width: '100%',
              borderRadius: 12,
              marginBottom: 16,
              background: '#000',
            }}
          />
        )}

        {/* Script */}
        {script.hook && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 8 }}>
              ✍️ Script
            </div>
            {[
              { key: 'hook', label: 'Hook' },
              { key: 'problem', label: 'Problem' },
              { key: 'solution', label: 'Solution' },
              { key: 'cta', label: 'CTA' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase' }}>
                  {label}:{' '}
                </span>
                <span style={{ fontSize: 13, color: C.dark }}>{script[key as keyof typeof script] || '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Caption */}
        {job.caption && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', marginBottom: 4 }}>
              Caption
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: C.cream,
                border: `1px solid ${C.border}`,
                fontSize: 13,
                color: C.dark,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {job.caption}
            </div>
          </div>
        )}

        {/* Hashtags */}
        {job.hashtags && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', marginBottom: 4 }}>
              Hashtags
            </div>
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: C.cream,
                border: `1px solid ${C.border}`,
                fontSize: 12,
                color: C.teal,
                lineHeight: 1.7,
                wordBreak: 'break-word',
              }}
            >
              {job.hashtags}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
