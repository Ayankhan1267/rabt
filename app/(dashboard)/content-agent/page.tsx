'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', dark: '#1A2E2B', border: '#E5E7EB', bg: '#FAFAF8',
  green: '#10B981', red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6',
  blue: '#3B82F6', pink: '#EC4899', orange: '#F59E0B',
}

type Tab = 'generate' | 'calendar' | 'library'
type Platform = 'instagram' | 'whatsapp' | 'facebook' | 'blog' | 'youtube'
type ContentType = 'post' | 'reel' | 'story' | 'caption' | 'broadcast' | 'blog' | 'hashtags'

const PLATFORM_CONFIG: Record<Platform, { icon: string; color: string; types: ContentType[] }> = {
  instagram: { icon: '📸', color: '#E1306C', types: ['post', 'reel', 'story', 'caption', 'hashtags'] },
  whatsapp: { icon: '💬', color: '#25D366', types: ['broadcast', 'story'] },
  facebook: { icon: '👥', color: '#1877F2', types: ['post', 'story'] },
  blog: { icon: '📝', color: C.teal, types: ['blog'] },
  youtube: { icon: '▶️', color: '#FF0000', types: ['reel'] },
}

const TOPICS = [
  'Monsoon skin care tips', 'Acne ke liye best routine', 'Vitamin C benefits for Indian skin',
  'Summer sun protection', 'Hairfall rokne ke tips', 'Before-After transformation',
  'Ingredient spotlight: Niacinamide', 'Dry skin ke liye tips', '5-step morning routine',
  'Customer success story',
]

interface GeneratedContent {
  platform: Platform; type: ContentType; topic: string
  content: string; hashtags?: string; cta?: string; timestamp: string
}

export default function ContentAgentPage() {
  const [tab, setTab] = useState<Tab>('generate')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [contentType, setContentType] = useState<ContentType>('post')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<'friendly' | 'educational' | 'promotional' | 'inspirational'>('friendly')
  const [language, setLanguage] = useState<'hinglish' | 'hindi' | 'english'>('hinglish')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GeneratedContent | null>(null)
  const [library, setLibrary] = useState<GeneratedContent[]>([])
  const [bulkTopics, setBulkTopics] = useState<string[]>([])
  const [bulkGenerating, setBulkGenerating] = useState(false)

  async function generateContent() {
    if (!topic) return toast.error('Topic daalo')
    setGenerating(true)
    try {
      const res = await fetch('/api/content-agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, contentType, topic, tone, language }),
      })
      if (res.ok) {
        const d = await res.json()
        const generated: GeneratedContent = { platform, type: contentType, topic, content: d.content, hashtags: d.hashtags, cta: d.cta, timestamp: new Date().toISOString() }
        setResult(generated)
        toast.success('Content generated!')
      } else toast.error('Generation failed')
    } catch { toast.error('Generation failed') }
    setGenerating(false)
  }

  function saveToLibrary() {
    if (!result) return
    setLibrary(prev => [result, ...prev])
    toast.success('Saved to library!')
  }

  async function bulkGenerate() {
    if (bulkTopics.length === 0) return toast.error('Topics select karo')
    setBulkGenerating(true)
    for (const t of bulkTopics.slice(0, 3)) {
      try {
        const res = await fetch('/api/content-agent/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, contentType, topic: t, tone, language }),
        })
        if (res.ok) {
          const d = await res.json()
          setLibrary(prev => [{ platform, type: contentType, topic: t, content: d.content, hashtags: d.hashtags, cta: d.cta, timestamp: new Date().toISOString() }, ...prev])
        }
      } catch { /* skip */ }
    }
    toast.success(`${bulkTopics.length} content pieces generated!`)
    setBulkGenerating(false)
    setBulkTopics([])
  }

  const CALENDAR_WEEKS = [
    { day: 'Mon', content: 'Skin tip: Vitamin C benefits', platform: 'instagram', done: true },
    { day: 'Tue', content: 'WhatsApp broadcast: Monsoon routine', platform: 'whatsapp', done: true },
    { day: 'Wed', content: 'Reel: Before-After transformation', platform: 'instagram', done: false },
    { day: 'Thu', content: 'Blog: Acne ke liye best products', platform: 'blog', done: false },
    { day: 'Fri', content: 'Story: Customer testimonial', platform: 'instagram', done: false },
    { day: 'Sat', content: 'Post: Weekend glow routine', platform: 'facebook', done: false },
    { day: 'Sun', content: 'Engagement: Poll — skin type?', platform: 'instagram', done: false },
  ]

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'generate', label: 'Generate', icon: '🧠' },
    { id: 'calendar', label: 'Content Calendar', icon: '📅' },
    { id: 'library', label: 'Library', icon: '📚' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎨</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.dark }}>Content Agent</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>AI se Instagram, WhatsApp, Blog content generate karo — brand voice mein, Indian context ke saath</p>
        </div>
        <span style={{ background: C.pink, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>AI</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.id ? C.pink : 'transparent', color: tab === t.id ? '#fff' : '#6B7280' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* GENERATE */}
      {tab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
          {/* Left: Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Platform */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 12 }}>Platform</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([p, cfg]) => (
                  <button key={p} onClick={() => { setPlatform(p); setContentType(cfg.types[0]) }} style={{ padding: '8px 14px', borderRadius: 8, border: `2px solid ${platform === p ? cfg.color : C.border}`, background: platform === p ? cfg.color + '18' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: platform === p ? cfg.color : '#6B7280' }}>
                    {cfg.icon} {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 12 }}>Content Type</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PLATFORM_CONFIG[platform].types.map(t => (
                  <button key={t} onClick={() => setContentType(t)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${contentType === t ? PLATFORM_CONFIG[platform].color : C.border}`, background: contentType === t ? PLATFORM_CONFIG[platform].color : '#fff', cursor: 'pointer', fontSize: 13, color: contentType === t ? '#fff' : '#6B7280', fontWeight: 600 }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 10 }}>Topic</div>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Content ka topic..." style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>Quick topics:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TOPICS.slice(0, 5).map(t => (
                  <button key={t} onClick={() => setTopic(t)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${C.border}`, background: topic === t ? C.teal : '#fff', color: topic === t ? '#fff' : '#6B7280', cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            </div>

            {/* Tone + Language */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Tone</label>
                  <select value={tone} onChange={e => setTone(e.target.value as typeof tone)} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                    <option value="friendly">Friendly 😊</option>
                    <option value="educational">Educational 📚</option>
                    <option value="promotional">Promotional 🔥</option>
                    <option value="inspirational">Inspirational ✨</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value as typeof language)} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                    <option value="hinglish">Hinglish 🇮🇳</option>
                    <option value="hindi">Hindi</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={generateContent} disabled={generating} style={{ background: generating ? '#9CA3AF' : C.pink, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? '🧠 Generating...' : '🧠 Generate Content'}
            </button>

            {/* Bulk Generate */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 10 }}>📦 Bulk Generate (up to 3)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {TOPICS.map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                    <input type="checkbox" checked={bulkTopics.includes(t)} onChange={() => setBulkTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : prev.length < 3 ? [...prev, t] : prev)} />
                    {t}
                  </label>
                ))}
              </div>
              <button onClick={bulkGenerate} disabled={bulkGenerating || bulkTopics.length === 0} style={{ width: '100%', background: bulkGenerating ? '#9CA3AF' : C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {bulkGenerating ? 'Generating...' : `Generate ${bulkTopics.length} pieces`}
              </button>
            </div>
          </div>

          {/* Right: Result */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            {!result ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF' }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎨</div>
                <div style={{ fontSize: 16 }}>Configure settings and generate content</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>AI will create {platform} {contentType} for you</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: PLATFORM_CONFIG[result.platform].color + '20', color: PLATFORM_CONFIG[result.platform].color, fontWeight: 700 }}>
                      {PLATFORM_CONFIG[result.platform].icon} {result.platform}
                    </span>
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: '#F3F4F6', color: '#6B7280', fontWeight: 600 }}>{result.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveToLibrary} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', fontWeight: 600 }}>💾 Save</button>
                    <button onClick={() => { navigator.clipboard.writeText(result.content); toast.success('Copied!') }} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: '#6B7280', cursor: 'pointer' }}>📋 Copy</button>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Topic: {result.topic}</div>

                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 20, marginBottom: 16, fontSize: 14, color: C.dark, lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200 }}>
                  {result.content}
                </div>

                {result.hashtags && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>Hashtags</div>
                    <div style={{ fontSize: 13, color: C.blue, lineHeight: 1.6 }}>{result.hashtags}</div>
                  </div>
                )}

                {result.cta && (
                  <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.blue }}>
                    <span style={{ fontWeight: 700 }}>CTA: </span>{result.cta}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALENDAR */}
      {tab === 'calendar' && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: C.dark }}>📅 This Week's Content Plan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
              {CALENDAR_WEEKS.map((day, i) => (
                <div key={i} style={{ background: day.done ? '#F0FDF4' : '#FAFAF8', border: `1px solid ${day.done ? '#D1FAE5' : C.border}`, borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 8 }}>{day.day}</div>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{PLATFORM_CONFIG[day.platform as Platform]?.icon || '📝'}</div>
                  <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.4, marginBottom: 8 }}>{day.content}</div>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: day.done ? '#D1FAE5' : '#FEF3C7', color: day.done ? C.green : C.gold, fontWeight: 700 }}>
                    {day.done ? 'Posted' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={() => toast.success('AI generating full week plan...')} style={{ background: C.pink, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                🧠 AI Generate Full Week Plan
              </button>
              <button onClick={() => toast.success('Calendar exported!')} style={{ background: '#fff', color: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
                📤 Export Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIBRARY */}
      {tab === 'library' && (
        <div>
          {library.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 16 }}>Library empty hai — content generate karo aur save karo</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {library.map((item, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: PLATFORM_CONFIG[item.platform].color + '20', color: PLATFORM_CONFIG[item.platform].color, fontWeight: 700 }}>
                        {PLATFORM_CONFIG[item.platform].icon} {item.platform}
                      </span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', color: '#6B7280' }}>{item.type}</span>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(item.content); toast.success('Copied!') }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: '#6B7280', cursor: 'pointer' }}>Copy</button>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{item.topic}</div>
                  <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, maxHeight: 100, overflow: 'hidden' }}>{item.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
