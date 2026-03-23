'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ── Color constants ──────────────────────────────────────────────────────────
const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', border: '#E8E0D8',
  cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853',
  mu: '#6B7280', purple: '#8B5CF6', orange: '#F97316', white: '#fff',
  bg: '#F0EDE8',
}

// ── Platform meta ────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C', followers: '12.4K', posts: '3 posts today' },
  { id: 'facebook', label: 'Facebook', icon: '👍', color: '#1877F2', followers: '8.2K likes', posts: '2 posts today' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', color: '#FF0000', followers: '4.1K subs', posts: '1 short today' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2', followers: '2.8K followers', posts: '1 post today' },
  { id: 'threads', label: 'Threads', icon: '🧵', color: '#000', followers: '—', posts: 'Not connected' },
]

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', youtube: '#FF0000',
  linkedin: '#0A66C2', threads: '#555',
}

const PLATFORM_DOTS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', youtube: '#FF0000',
  linkedin: '#0A66C2', threads: '#555',
}

// ── Content generation templates ─────────────────────────────────────────────
const REEL_SCRIPTS = [
  {
    hook: '🚨 "I tried every moisturiser for 3 months — here's the ONE that actually worked."',
    problem: 'Dry skin in winter? You're probably layering wrong. Most people put serum OVER moisturiser — that's blocking 60% of absorption.',
    solution: 'Rabt\'s Hydra-Lock Serum goes on first — hyaluronic acid draws water INTO skin. Then seal with our Ceramide Barrier Cream. Morning + night, 14 days = completely different skin.',
    cta: '🔗 Link in bio → Free skin type quiz → Personalised routine in 2 mins.',
  },
  {
    hook: '⚡ "Dermatologist told me I\'d have acne forever. A skincare brand proved them wrong."',
    problem: 'Acne isn\'t just hormones — it\'s your barrier. When your skin barrier is broken, bacteria gets in EASILY. Most acne products make this worse.',
    solution: 'Rabt Niacinamide + Zinc formula reduces sebum by 47% in 28 days — clinically tested on Indian skin types. No dryness, no peeling, just clear skin.',
    cta: '👇 Comment "CLEAR" and I\'ll DM you the full routine that worked for me.',
  },
  {
    hook: '💥 "Why your sunscreen is AGING your skin faster (most people don\'t know this)"',
    problem: 'Chemical sunscreens with oxybenzone generate free radicals when hit by UV light. So you\'re protecting from burn but causing oxidative stress.',
    solution: 'Switch to Rabt\'s Mineral SPF 50 — zinc oxide physically blocks UV, adds antioxidants, and feels like nothing on skin. Brown skin friendly — no white cast.',
    cta: '✅ Drop "SPF" in comments for our full sun protection guide — free!',
  },
]

const CAROUSEL_TEMPLATES = [
  {
    slides: [
      { title: 'Slide 1 — Hook', content: '5 ingredients your skin NEEDS this winter ❄️ (save this before you shop)' },
      { title: 'Slide 2 — #1 Hyaluronic Acid', content: 'Draws 1000x its weight in moisture. Apply on damp skin for 10x better absorption. Found in: Rabt Hydra-Lock Serum' },
      { title: 'Slide 3 — #2 Niacinamide', content: 'Shrinks pores, fades dark spots, reduces redness. Works for ALL skin types. 10% concentration = visible results in 2 weeks.' },
      { title: 'Slide 4 — #3 Ceramides', content: 'Your skin\'s natural glue. Rebuilds the moisture barrier so water doesn\'t escape. Especially important if you use retinol.' },
      { title: 'Slide 5 — CTA', content: 'Don\'t know your skin type? Take Rabt\'s free 2-minute quiz → personalised routine delivered to your inbox. Link in bio! 🌿' },
    ],
  },
  {
    slides: [
      { title: 'Slide 1 — Hook', content: 'Your skincare routine is costing you ₹3,000 more than it should 🔴' },
      { title: 'Slide 2 — The Problem', content: 'You\'re buying 6 different products when 3 targeted ones would do more. Layers on layers = product pilling + zero results.' },
      { title: 'Slide 3 — The Fix', content: 'Cleanse → Treat → Moisturise → Protect. That\'s it. Morning. Night. Consistent.' },
      { title: 'Slide 4 — Our Edit', content: 'Rabt\'s Starter Kit: Gentle Cleanser + Vitamin C Serum + SPF 50. 3 products. Complete routine. ₹849.' },
      { title: 'Slide 5 — CTA', content: 'Tag someone who overcomplicates skincare 😂 Shop the kit → link in bio. Free skin consultation with every order!' },
    ],
  },
]

const CAPTIONS = [
  {
    text: `Your skin is literally talking to you — are you listening? 🌿\n\nBreaking out along your jawline? Hormones. Forehead? Stress or diet. Cheeks? Environment or product sensitivity.\n\nRabt's AI skin quiz reads your skin's language in 2 minutes. Upload a selfie, answer 6 questions, get a personalised 3-step routine built exactly for your skin type, lifestyle, and goals.\n\n✨ 50,000+ Indian women have taken it. 94% said their skin improved in 21 days.\n\n🔗 Link in bio → Take the quiz FREE\n\n—\n\n#RabtNaturals #SkincareRoutine #IndianSkincare #NaturalSkincare #SkincareIndia #GlowySkin #SkinType #PersonalisedSkincare #CleanBeauty #AyurvedicSkincare #SkincareGoals #GlassSkin #HydrationSkincare #SerumSkincare #NiacinamideSkincare #VitaminCSerum #SPFEveryday #BarrierRepair #HyaluronicAcid #CeramidesKing #SkincareJunkie #BeautyTips #SkincareObsessed #NaturalGlow #SustainableBeauty #SkincareFirst #MorningRoutine #NightRoutine #GlowUp #SkincareCommunity`,
    hashtags: '#RabtNaturals #SkincareRoutine #IndianSkincare #NaturalSkincare',
  },
  {
    text: `POV: You finally found a haircare routine that doesn't break you out 🙌\n\nSulfate-free shampoo + rice water conditioner + scalp oil = the holy trinity no one told you about.\n\nRabt's Haircare System is formulated without parabens, sulfates, or silicones — just pure botanicals that actually work on Indian hair texture.\n\nThick, frizzy, colour-treated, or thinning — we have a targeted range for every hair concern.\n\n💇‍♀️ 8 weeks to noticeably thicker, healthier hair — or your money back.\n\n🛒 Shop now → link in bio!\n\n#RabtHaircare #HairCareIndia #SulfateFree #NaturalHaircare #HairGrowth #ScalpCare #IndianHair #HairTransformation #AyurvedicHair #RiceWater #HairOiling #HairGoals #HealthyHair #FrizzFree #HairCareRoutine #ThickHair #HairLoss #ScalpHealth #ParabenFree #CleanHaircare #NaturalIngredients #HairTips #BoldHair #HairCareObsessed #GrowthSerum #HairMask #ShinyHair #StrongHair #HairFirst #BestHaircare`,
    hashtags: '#RabtHaircare #HairCareIndia #SulfateFree',
  },
]

function generateContent(category: string, type: string, tone: string, product: string, cta: string, language: string) {
  const productMention = product ? ` featuring ${product}` : ''
  if (type === 'ugc_reel') {
    const script = REEL_SCRIPTS[Math.floor(Math.random() * REEL_SCRIPTS.length)]
    return { type: 'reel', script, category, tone, language, productMention }
  }
  if (type === 'carousel') {
    const carousel = CAROUSEL_TEMPLATES[Math.floor(Math.random() * CAROUSEL_TEMPLATES.length)]
    return { type: 'carousel', slides: carousel.slides, category, tone, language, productMention }
  }
  if (type === 'caption') {
    const cap = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)]
    return { type: 'caption', text: cap.text, hashtags: cap.hashtags, category, tone, language, productMention }
  }
  if (type === 'linkedin') {
    return {
      type: 'linkedin',
      text: `The skincare industry in India is projected to reach $5B by 2026 — and it's being driven by one thing: trust.\n\nAt Rabt Naturals, we've built our brand on 3 principles:\n🌿 Ingredient transparency (every formulation peer-reviewed)\n📊 Evidence-based marketing (no false claims)\n💬 Community-first growth (50K+ organic followers, zero paid bots)\n\nThe result? 312% YoY revenue growth with a 4.8/5 customer satisfaction score.\n\nIf you're building a D2C brand in 2024, the playbook isn't ads. It's education + trust + consistency.\n\nWhat's your brand's unfair advantage? Drop it below 👇\n\n${product ? `#${product.replace(/\s/g, '')}` : ''} #D2CBrand #SkincareIndia #FounderStory #BrandBuilding #StartupIndia`,
    }
  }
  if (type === 'thread') {
    return {
      type: 'thread',
      posts: [
        `🧵 Thread: Everything wrong with your skincare routine (and how to fix it)`,
        `1/ You're washing your face with hot water. This strips your natural oils and inflames skin. Use lukewarm. Always.`,
        `2/ You're not applying sunscreen every. single. day. UV damage is the #1 cause of premature aging. No exceptions, even indoors.`,
        `3/ You're skipping moisturiser because "oily skin doesn't need it." Wrong. Oily skin is often dehydrated — which causes MORE oil production.`,
        `4/ You're using 7+ products but none of them are working because they're cancelling each other out. Less is more.`,
        `5/ The fix: Cleanser → 1 treatment serum → Moisturiser → SPF. That's it. Consistent > complex. 🌿\n\n[Rabt's free skin quiz builds your custom 3-step routine → link in bio]`,
      ],
    }
  }
  // Default / YouTube short
  return {
    type: 'youtube_short',
    text: `📹 YOUTUBE SHORT SCRIPT${productMention}\n\n[HOOK 0-3s]\n"Wait — you've been applying skincare in the WRONG order your whole life."\n\n[PROBLEM 3-8s]\nMost people put moisturiser before serum. This blocks the active ingredients from reaching your skin cells — wasting your ₹500 serum completely.\n\n[SOLUTION 8-20s]\nCorrect order: Cleanser → Toner → Serum → Eye Cream → Moisturiser → SPF.\nThinnest to thickest. Always. Rabt's Vitamin C Serum absorbed 3x better using this method in our 30-day trial.\n\n[CTA 20-30s]\nLike if you didn't know this! Subscribe for daily skincare secrets. Link in bio for your FREE personalised routine. 🌿`,
  }
}

// ── Mock queue data ───────────────────────────────────────────────────────────
const MOCK_QUEUE = [
  { id: 1, platform: 'instagram', content_type: 'Reel Script', category: 'Skincare', caption: 'Your skin barrier is everything. Here\'s why most moisturisers fail...', scheduled_at: 'Today, 6:00 PM', status: 'queued' },
  { id: 2, platform: 'facebook', content_type: 'Carousel', category: 'Haircare', caption: '5 ingredients your hair NEEDS this monsoon season — save this!', scheduled_at: 'Today, 7:30 PM', status: 'queued' },
  { id: 3, platform: 'youtube', content_type: 'Short', category: 'Skincare', caption: 'Wrong skincare order is destroying your results — watch this!', scheduled_at: 'Today, 8:00 PM', status: 'queued' },
  { id: 4, platform: 'linkedin', content_type: 'Post', category: 'Brand', caption: 'The skincare industry in India is projected to hit ₹20,000 Cr by 2026...', scheduled_at: 'Tomorrow, 9:00 AM', status: 'scheduled' },
  { id: 5, platform: 'instagram', content_type: 'Caption', category: 'Body Care', caption: 'POV: You finally found a body lotion that doesn\'t feel greasy...', scheduled_at: 'Yesterday, 6:00 PM', status: 'posted' },
  { id: 6, platform: 'threads', content_type: 'Thread', category: 'Skincare', caption: '🧵 Everything wrong with your skincare routine (thread)...', scheduled_at: 'Yesterday, 7:00 PM', status: 'failed' },
]

const MOCK_DRAFTS = [
  { id: 1, type: 'UGC Reel Script', category: 'Skincare', tone: 'Gen-Z Casual', saved_at: '2 hours ago' },
  { id: 2, type: 'Carousel', category: 'Haircare', tone: 'Clinical Expert', saved_at: '5 hours ago' },
  { id: 3, type: 'Instagram Caption', category: 'Body Care', tone: 'Luxury Brand', saved_at: 'Yesterday' },
  { id: 4, type: 'LinkedIn Post', category: 'Brand', tone: 'Motivational', saved_at: 'Yesterday' },
  { id: 5, type: 'YouTube Short', category: 'Supplements', tone: 'Relatable & Funny', saved_at: '2 days ago' },
]

// ── Calendar helpers ──────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Mock calendar post data
const MOCK_CAL_POSTS: Record<string, { platform: string; count: number }[]> = {
  '2026-3-1': [{ platform: 'instagram', count: 2 }, { platform: 'facebook', count: 1 }],
  '2026-3-3': [{ platform: 'youtube', count: 1 }, { platform: 'instagram', count: 1 }],
  '2026-3-5': [{ platform: 'linkedin', count: 1 }],
  '2026-3-7': [{ platform: 'instagram', count: 3 }, { platform: 'threads', count: 1 }],
  '2026-3-10': [{ platform: 'facebook', count: 2 }, { platform: 'instagram', count: 1 }],
  '2026-3-12': [{ platform: 'youtube', count: 1 }, { platform: 'linkedin', count: 1 }],
  '2026-3-14': [{ platform: 'instagram', count: 2 }],
  '2026-3-17': [{ platform: 'facebook', count: 1 }, { platform: 'instagram', count: 2 }, { platform: 'threads', count: 1 }],
  '2026-3-19': [{ platform: 'linkedin', count: 1 }, { platform: 'youtube', count: 1 }],
  '2026-3-21': [{ platform: 'instagram', count: 3 }],
  '2026-3-23': [{ platform: 'instagram', count: 2 }, { platform: 'facebook', count: 1 }, { platform: 'youtube', count: 1 }],
  '2026-3-25': [{ platform: 'linkedin', count: 2 }],
  '2026-3-28': [{ platform: 'instagram', count: 1 }, { platform: 'threads', count: 2 }],
}

// ── Analytics mock ────────────────────────────────────────────────────────────
const ANALYTICS_DATA = {
  platforms: [
    { name: 'Instagram', icon: '📸', impressions: '184K', reach: '142K', engagement: '5.8%', clicks: '3,240', conversions: '186', revenue: '₹52,400' },
    { name: 'Facebook', icon: '👍', impressions: '98K', reach: '72K', engagement: '3.1%', clicks: '1,820', conversions: '94', revenue: '₹22,800' },
    { name: 'YouTube', icon: '▶️', impressions: '64K', reach: '51K', engagement: '4.4%', clicks: '2,100', conversions: '68', revenue: '₹14,200' },
    { name: 'LinkedIn', icon: '💼', impressions: '28K', reach: '22K', engagement: '6.2%', clicks: '940', conversions: '42', revenue: '₹9,800' },
    { name: 'Threads', icon: '🧵', impressions: '12K', reach: '9K', engagement: '2.8%', clicks: '320', conversions: '18', revenue: '₹3,200' },
  ],
  contentTypes: [
    { type: 'Reels', pct: 68, color: C.teal },
    { type: 'Carousels', pct: 45, color: C.purple },
    { type: 'Stories', pct: 52, color: C.orange },
    { type: 'Static Posts', pct: 28, color: C.gold },
    { type: 'Threads', pct: 35, color: C.mu },
  ],
  topCategories: [
    { name: 'Skincare', reach: '164K', conversion: '3.2%', color: C.teal },
    { name: 'Haircare', reach: '82K', conversion: '2.1%', color: C.purple },
    { name: 'Body Care', reach: '38K', conversion: '1.8%', color: C.orange },
  ],
  abTests: [
    {
      name: 'Reel Hook — Problem vs Question',
      variantA: { label: 'Problem Hook', text: '"I ruined my skin barrier for 6 months..."', impressions: '24.2K', engagement: '4.1%' },
      variantB: { label: 'Question Hook', text: '"Is YOUR skin barrier broken? Here\'s how to tell"', impressions: '31.8K', engagement: '6.7%' },
      winner: 'B',
    },
    {
      name: 'CTA Style — Link Bio vs Comment Trigger',
      variantA: { label: 'Link in Bio', text: '"🔗 Full routine → link in bio"', impressions: '18.4K', engagement: '3.2%' },
      variantB: { label: 'Comment Trigger', text: '"Comment GLOW and I\'ll DM you the routine"', impressions: '18.1K', engagement: '7.4%' },
      winner: 'B',
    },
  ],
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SocialAutomationPage() {
  const [tab, setTab] = useState<'dashboard'|'generator'|'calendar'|'queue'|'analytics'>('dashboard')
  const [automationOn, setAutomationOn] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [countdown, setCountdown] = useState('2h 14m')

  // Content generator state
  const [genCategory, setGenCategory] = useState('Skincare')
  const [genType, setGenType] = useState('ugc_reel')
  const [genTone, setGenTone] = useState('Gen-Z Casual')
  const [genTarget, setGenTarget] = useState('Engagement')
  const [genProduct, setGenProduct] = useState('')
  const [genCTA, setGenCTA] = useState('Try Rabt')
  const [genLang, setGenLang] = useState('English')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<any>(null)
  const [drafts, setDrafts] = useState(MOCK_DRAFTS)

  // Queue state
  const [queueFilter, setQueueFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [queuePosts, setQueuePosts] = useState(MOCK_QUEUE)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ platforms: [] as string[], caption: '', schedule_date: '', schedule_time: '', hashtags: '', content_type: 'Reel Script', category: 'Skincare' })

  // Calendar state
  const now = new Date()
  const [calYear, setCalYear] = useState(2026)
  const [calMonth, setCalMonth] = useState(2) // 0-indexed, 2 = March
  const [selectedDay, setSelectedDay] = useState<number|null>(23)

  // Analytics state
  const [analyticsRange, setAnalyticsRange] = useState('30')

  useEffect(() => { setMounted(true) }, [])

  // Countdown ticker
  useEffect(() => {
    if (!automationOn) return
    const times = ['2h 14m', '2h 13m', '2h 12m', '2h 11m']
    let i = 0
    const t = setInterval(() => { i = (i + 1) % times.length; setCountdown(times[i]) }, 5000)
    return () => clearInterval(t)
  }, [automationOn])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenerated(null)
    await new Promise(r => setTimeout(r, 2000))
    const result = generateContent(genCategory, genType, genTone, genProduct, genCTA, genLang)
    setGenerated(result)
    setGenerating(false)
  }, [genCategory, genType, genTone, genProduct, genCTA, genLang])

  const handleSaveToQueue = () => {
    toast.success('Content saved to queue!')
    setDrafts(prev => [{ id: Date.now(), type: genType === 'ugc_reel' ? 'UGC Reel Script' : genType, category: genCategory, tone: genTone, saved_at: 'Just now' }, ...prev.slice(0, 4)])
  }

  const handleCopy = () => {
    toast.success('Copied to clipboard!')
  }

  const handleDeletePost = (id: number) => {
    setQueuePosts(prev => prev.filter(p => p.id !== id))
    toast.success('Post removed from queue')
  }

  const handlePostNow = (id: number) => {
    setQueuePosts(prev => prev.map(p => p.id === id ? { ...p, status: 'posting' } : p))
    setTimeout(() => {
      setQueuePosts(prev => prev.map(p => p.id === id ? { ...p, status: 'posted' } : p))
      toast.success('Post published successfully!')
    }, 2000)
  }

  const handleAddToQueue = () => {
    if (!addForm.caption || addForm.platforms.length === 0) { toast.error('Add caption and select at least one platform'); return }
    const newPosts = addForm.platforms.map((plt, i) => ({
      id: Date.now() + i, platform: plt, content_type: addForm.content_type,
      category: addForm.category, caption: addForm.caption,
      scheduled_at: addForm.schedule_date ? `${addForm.schedule_date} ${addForm.schedule_time}` : 'Unscheduled',
      status: addForm.schedule_date ? 'scheduled' : 'queued',
    }))
    setQueuePosts(prev => [...newPosts, ...prev])
    setShowAddModal(false)
    setAddForm({ platforms: [], caption: '', schedule_date: '', schedule_time: '', hashtags: '', content_type: 'Reel Script', category: 'Skincare' })
    toast.success(`Added ${newPosts.length} post(s) to queue!`)
  }

  if (!mounted) return null

  const filteredQueue = queuePosts.filter(p => {
    const statusMatch = queueFilter === 'all' || p.status === queueFilter
    const platformMatch = platformFilter === 'all' || p.platform === platformFilter
    return statusMatch && platformMatch
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.dark, margin: 0 }}>📲 Social Automation</h1>
          <p style={{ color: C.mu, margin: '4px 0 0', fontSize: 14 }}>AI-powered social media management for Rabt Naturals</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ background: automationOn ? C.green : C.mu, color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>
            {automationOn ? '🟢 Automation Active' : '⚫ Automation Off'}
          </span>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            + Add Post
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 12, padding: 6, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1px solid ${C.border}` }}>
        {(['dashboard','generator','calendar','queue','analytics'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 6px', border: 'none', borderRadius: 8, cursor: 'pointer',
            background: tab === t ? C.teal : 'transparent', color: tab === t ? '#fff' : C.mu,
            fontWeight: tab === t ? 700 : 500, fontSize: 13, textTransform: 'capitalize', transition: 'all 0.2s',
          }}>
            {t === 'dashboard' ? '📊 Dashboard' : t === 'generator' ? '✨ Generator' : t === 'calendar' ? '📅 Calendar' : t === 'queue' ? '📋 Queue' : '📈 Analytics'}
          </button>
        ))}
      </div>

      {/* ── TAB: DASHBOARD ───────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Posts This Month', value: '124', icon: '📝', color: C.teal },
              { label: 'Total Reach', value: '284K', icon: '👁️', color: C.purple },
              { label: 'Engagement Rate', value: '4.2%', icon: '💬', color: C.green },
              { label: 'Leads Generated', value: '312', icon: '🎯', color: C.orange },
              { label: 'Sales Attributed', value: '₹84,200', icon: '💰', color: C.gold },
              { label: 'AI Content Saved', value: '18 hrs', icon: '🤖', color: C.teal2 },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 14px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: '6px 0 2px' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.mu, lineHeight: 1.3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Platform Status */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>Platform Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PLATFORMS.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.cream, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: C.mu }}>{p.followers}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {p.id !== 'threads' ? (
                        <>
                          <span style={{ background: '#D1FAE5', color: C.green, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Connected</span>
                          <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{p.posts}</div>
                        </>
                      ) : (
                        <button style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Setup</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation Toggle */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>Daily Automation</h3>
              <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
                <div style={{ fontSize: 14, color: C.mu, marginBottom: 16 }}>Master Automation Switch</div>
                <button
                  onClick={() => { setAutomationOn(v => !v); toast.success(automationOn ? 'Automation paused' : 'Automation activated!') }}
                  style={{
                    width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: automationOn ? `linear-gradient(135deg, ${C.green}, #059669)` : `linear-gradient(135deg, ${C.mu}, #4B5563)`,
                    color: '#fff', fontSize: 28, boxShadow: automationOn ? `0 0 30px ${C.green}55` : '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'all 0.3s',
                  }}
                >
                  {automationOn ? '⏸' : '▶'}
                </button>
                <div style={{ marginTop: 14, fontWeight: 700, fontSize: 16, color: automationOn ? C.green : C.mu }}>
                  {automationOn ? 'ACTIVE' : 'PAUSED'}
                </div>
                {automationOn && (
                  <div style={{ marginTop: 8, background: C.cream, borderRadius: 8, padding: '8px 16px', display: 'inline-block' }}>
                    <span style={{ color: C.mu, fontSize: 13 }}>Next post in: </span>
                    <span style={{ fontWeight: 700, color: C.teal, fontSize: 15 }}>{countdown}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 12 }}>Automation Settings</div>
                {[
                  { label: 'Auto-post reels', checked: true },
                  { label: 'Auto-hashtags', checked: true },
                  { label: 'Optimal timing AI', checked: true },
                  { label: 'Cross-posting', checked: false },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: C.dark }}>{s.label}</span>
                    <div style={{ width: 36, height: 20, background: s.checked ? C.green : '#D1D5DB', borderRadius: 10, position: 'relative', cursor: 'pointer' }}>
                      <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: s.checked ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Today's Queue Preview */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.dark }}>Today's Queue Preview</h3>
              <button onClick={() => setTab('queue')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: C.teal, fontWeight: 600 }}>View All →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {MOCK_QUEUE.slice(0, 4).map(post => (
                <div key={post.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, background: C.cream }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{PLATFORMS.find(p => p.id === post.platform)?.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: PLATFORM_COLORS[post.platform], borderRadius: 5, padding: '2px 7px' }}>{post.content_type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.mu, marginBottom: 6 }}>{post.category}</div>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 500, lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.caption}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: C.mu }}>🕐 {post.scheduled_at}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: post.status === 'queued' ? '#FEF3C7' : post.status === 'posting' ? '#DBEAFE' : '#D1FAE5', color: post.status === 'queued' ? '#92400E' : post.status === 'posting' ? '#1E40AF' : C.green }}>
                      {post.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CONTENT GENERATOR ───────────────────────────────────────────── */}
      {tab === 'generator' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 20, marginBottom: 24 }}>
            {/* Left: Settings */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: C.dark }}>✨ Content Settings</h3>

              {[
                { label: 'Category', value: genCategory, setter: setGenCategory, options: ['Skincare','Haircare','Body Care','Supplements','Baby Care','Color Cosmetics'] },
                { label: 'Content Type', value: genType, setter: setGenType, options: [
                  ['ugc_reel','UGC Reel Script'],['carousel','Carousel (10 slides)'],['caption','Instagram Caption'],
                  ['youtube_short','YouTube Short Script'],['linkedin','LinkedIn Post'],['thread','Threads Post'],
                ] },
                { label: 'Tone', value: genTone, setter: setGenTone, options: ['Gen-Z Casual','Clinical Expert','Luxury Brand','Motivational','Relatable & Funny'] },
                { label: 'Target', value: genTarget, setter: setGenTarget, options: ['Awareness','Engagement','Sales','Lead Generation'] },
                { label: 'Language', value: genLang, setter: setGenLang, options: ['English','Hinglish','Hindi'] },
                { label: 'CTA Type', value: genCTA, setter: setGenCTA, options: ['Try Rabt','Check skin type','Shop now','Book free consultation','Watch full video'] },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>{field.label}</label>
                  <select
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.dark, background: C.cream, outline: 'none' }}
                  >
                    {(field.options as any[]).map((opt: any) => (
                      Array.isArray(opt)
                        ? <option key={opt[0]} value={opt[0]}>{opt[1]}</option>
                        : <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Product Highlight (optional)</label>
                <input
                  value={genProduct}
                  onChange={e => setGenProduct(e.target.value)}
                  placeholder="e.g. Vitamin C serum"
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.dark, background: C.cream, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{ width: '100%', padding: '12px', background: generating ? C.mu : `linear-gradient(135deg, ${C.teal}, ${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                {generating ? '⏳ Generating...' : '✨ Generate Content'}
              </button>
            </div>

            {/* Right: Output */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', minHeight: 500 }}>
              <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: C.dark }}>📄 Generated Content</h3>

              {!generated && !generating && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 360, color: C.mu, textAlign: 'center' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>✨</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Ready to Generate</div>
                  <div style={{ fontSize: 13, maxWidth: 260, lineHeight: 1.6 }}>Configure your settings and click "Generate Content" to create AI-powered social media content.</div>
                </div>
              )}

              {generating && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 360 }}>
                  <div style={{ width: 52, height: 52, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.teal}`, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                  <div style={{ color: C.teal, fontWeight: 600, fontSize: 15 }}>AI is crafting your content...</div>
                  <div style={{ color: C.mu, fontSize: 13, marginTop: 6 }}>Analysing tone, audience, and best-performing formats</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
              )}

              {generated && !generating && (
                <div>
                  {/* Reel Script */}
                  {generated.type === 'reel' && (
                    <div>
                      <div style={{ background: `linear-gradient(135deg, ${C.teal}15, ${C.teal2}10)`, border: `1px solid ${C.teal}30`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>UGC Reel Script</div>
                        {[
                          { label: '🎬 HOOK (0–3s)', text: generated.script.hook, bg: '#FFF7ED', border: '#FED7AA' },
                          { label: '😤 PROBLEM (3–8s)', text: generated.script.problem, bg: '#FEF2F2', border: '#FECACA' },
                          { label: '💡 SOLUTION (8–20s)', text: generated.script.solution, bg: '#F0FDF4', border: '#BBF7D0' },
                          { label: '🚀 CTA (20–30s)', text: generated.script.cta, bg: '#EFF6FF', border: '#BFDBFE' },
                        ].map(section => (
                          <div key={section.label} style={{ background: section.bg, border: `1px solid ${section.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{section.label}</div>
                            <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6 }}>{section.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Carousel */}
                  {generated.type === 'carousel' && (
                    <div style={{ background: C.cream, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Carousel — 5 Slides</div>
                      {generated.slides.map((slide: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, background: C.purple, borderRadius: '50%', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', flex: 1, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, marginBottom: 3 }}>{slide.title}</div>
                            <div style={{ fontSize: 13, color: C.mu, lineHeight: 1.5 }}>{slide.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Caption */}
                  {generated.type === 'caption' && (
                    <div style={{ background: C.cream, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Instagram Caption</div>
                      <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.8, whiteSpace: 'pre-line', background: '#fff', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 260, overflowY: 'auto' }}>{generated.text}</div>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {generated.type === 'linkedin' && (
                    <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0A66C2', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>LinkedIn Post</div>
                      <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.8, whiteSpace: 'pre-line', background: '#fff', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 260, overflowY: 'auto' }}>{generated.text}</div>
                    </div>
                  )}

                  {/* Thread */}
                  {generated.type === 'thread' && (
                    <div style={{ background: C.cream, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Threads Post Series</div>
                      {generated.posts.map((post: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: 28, height: 28, background: C.dark, borderRadius: '50%', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                            {i < generated.posts.length - 1 && <div style={{ width: 2, height: 20, background: C.border, margin: '4px 0' }} />}
                          </div>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', flex: 1, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, lineHeight: 1.6 }}>{post}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* YouTube Short */}
                  {generated.type === 'youtube_short' && (
                    <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#FF0000', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>YouTube Short Script</div>
                      <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.8, whiteSpace: 'pre-line', background: '#fff', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.border}`, maxHeight: 260, overflowY: 'auto' }}>{generated.text}</div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleCopy} style={{ flex: 1, padding: '9px', border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.dark }}>📋 Copy</button>
                    <button onClick={handleSaveToQueue} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 8, background: C.green, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>💾 Save to Queue</button>
                    <button onClick={handleGenerate} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 8, background: C.teal, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔄 Regenerate</button>
                    <button onClick={() => toast.success('A/B variant created!')} style={{ flex: 1, padding: '9px', border: `1px solid ${C.purple}`, borderRadius: 8, background: '#F5F3FF', color: C.purple, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⚡ A/B Test</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved Drafts */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.dark }}>💾 Saved Drafts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
              {drafts.map(d => (
                <div key={d.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.cream, cursor: 'pointer' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4, textTransform: 'uppercase' }}>{d.type}</div>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 600, marginBottom: 4 }}>{d.category}</div>
                  <div style={{ fontSize: 11, color: C.mu, marginBottom: 8 }}>{d.tone}</div>
                  <div style={{ fontSize: 10, color: C.mu }}>Saved {d.saved_at}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CALENDAR ────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Calendar */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              {/* Month Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <button
                  onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                  style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, color: C.dark }}
                >‹</button>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>{MONTH_NAMES[calMonth]} {calYear}</h3>
                <button
                  onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                  style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 16, color: C.dark }}
                >›</button>
              </div>

              {/* Day Names */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.mu, padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              {/* Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                  const day = i + 1
                  const key = `${calYear}-${calMonth + 1}-${day}`
                  const posts = MOCK_CAL_POSTS[key] || []
                  const isToday = calYear === 2026 && calMonth === 2 && day === 23
                  const isSelected = selectedDay === day
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      style={{
                        minHeight: 52, padding: '4px 5px', borderRadius: 8, cursor: 'pointer',
                        background: isSelected ? C.teal : isToday ? `${C.teal}15` : '#fff',
                        border: `1px solid ${isSelected ? C.teal : isToday ? C.teal : C.border}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: isToday || isSelected ? 700 : 500, color: isSelected ? '#fff' : isToday ? C.teal : C.dark, marginBottom: 3 }}>{day}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {posts.map((p, pi) => (
                          Array.from({ length: Math.min(p.count, 3) }).map((__, ci) => (
                            <div key={`${pi}-${ci}`} style={{ width: 7, height: 7, borderRadius: '50%', background: PLATFORM_DOTS[p.platform] }} />
                          ))
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                {Object.entries(PLATFORM_DOTS).map(([plt, color]) => (
                  <div key={plt} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.mu }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
                    <span style={{ textTransform: 'capitalize' }}>{plt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Detail Panel */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: C.dark }}>
                {selectedDay ? `${MONTH_NAMES[calMonth]} ${selectedDay}` : 'Select a day'}
              </h3>
              {selectedDay ? (() => {
                const key = `${calYear}-${calMonth + 1}-${selectedDay}`
                const dayPosts = MOCK_QUEUE.filter((_, i) => i < 3)
                return (
                  <div>
                    {dayPosts.map(post => (
                      <div key={post.id} style={{ padding: '10px 12px', background: C.cream, borderRadius: 10, marginBottom: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 16 }}>{PLATFORMS.find(p => p.id === post.platform)?.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: PLATFORM_COLORS[post.platform] }}>{post.platform}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: C.mu }}>{post.scheduled_at.includes('Today') ? post.scheduled_at.replace('Today, ','') : post.scheduled_at}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.caption}</div>
                        <div style={{ marginTop: 6 }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', background: post.status === 'queued' ? '#FEF3C7' : '#D1FAE5', color: post.status === 'queued' ? '#92400E' : C.green, borderRadius: 4, fontWeight: 600 }}>{post.status}</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setShowAddModal(true) }}
                      style={{ width: '100%', padding: '8px', marginTop: 4, border: `1px dashed ${C.teal}`, borderRadius: 8, background: 'none', color: C.teal, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      + Add Post for this day
                    </button>
                  </div>
                )
              })() : (
                <div style={{ color: C.mu, fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Click any day to see scheduled posts</div>
              )}
            </div>
          </div>

          {/* Bulk Schedule */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>⚡ Bulk Schedule</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Week Start</label>
                <input type="date" defaultValue="2026-03-23" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Week End</label>
                <input type="date" defaultValue="2026-03-29" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Posts Per Day (Instagram)</label>
                <input type="number" defaultValue="2" min="1" max="5" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Posts Per Day (Facebook)</label>
                <input type="number" defaultValue="1" min="1" max="3" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 8 }}>Auto-fill Categories</label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {['Skincare','Haircare','Body Care','Supplements','Baby Care','Color Cosmetics'].map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: C.dark }}>
                    <input type="checkbox" defaultChecked={['Skincare','Haircare'].includes(cat)} style={{ accentColor: C.teal }} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={() => toast.success('Bulk schedule created for the week!')}
              style={{ marginTop: 18, padding: '10px 24px', background: `linear-gradient(135deg, ${C.teal}, ${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
            >
              ⚡ Auto-Schedule Week
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: QUEUE ───────────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: '#fff', borderRadius: 12, padding: '12px 16px', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all','queued','scheduled','posted','failed'].map(f => (
                <button key={f} onClick={() => setQueueFilter(f)} style={{
                  padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                  background: queueFilter === f ? C.teal : C.cream, color: queueFilter === f ? '#fff' : C.mu,
                }}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
                style={{ padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, background: C.cream, color: C.dark }}
              >
                <option value="all">All Platforms</option>
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                style={{ padding: '7px 16px', background: C.teal, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                + Add to Queue
              </button>
            </div>
          </div>

          {/* Table */}
          {filteredQueue.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: 60, textAlign: 'center', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 6 }}>No posts in queue</div>
              <div style={{ fontSize: 13, color: C.mu, marginBottom: 16 }}>Add your first post to get started with automation</div>
              <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 24px', background: C.teal, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+ Add Post</button>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                    {['Platform','Content Type','Category','Caption','Scheduled','Status','Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.dark }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.map((post, i) => (
                    <tr key={post.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.cream }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 18 }}>{PLATFORMS.find(p => p.id === post.platform)?.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: PLATFORM_COLORS[post.platform], textTransform: 'capitalize' }}>{post.platform}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: C.dark, fontWeight: 500 }}>{post.content_type}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '3px 8px', background: `${C.teal}18`, color: C.teal, borderRadius: 5, fontWeight: 600 }}>{post.category}</span>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: 220 }}>
                        <div style={{ fontSize: 12, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.caption}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: C.mu, whiteSpace: 'nowrap' }}>🕐 {post.scheduled_at}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                          background: post.status === 'queued' ? '#FEF3C7' : post.status === 'scheduled' ? '#DBEAFE' : post.status === 'posted' ? '#D1FAE5' : post.status === 'posting' ? '#EDE9FE' : '#FEE2E2',
                          color: post.status === 'queued' ? '#92400E' : post.status === 'scheduled' ? '#1E40AF' : post.status === 'posted' ? C.green : post.status === 'posting' ? C.purple : C.red,
                        }}>
                          {post.status === 'posting' ? '⏳ Posting...' : post.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => toast.success('Edit mode coming soon!')} style={{ padding: '4px 9px', fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 5, background: '#fff', cursor: 'pointer', color: C.dark }}>Edit</button>
                          {post.status !== 'posted' && (
                            <button onClick={() => handlePostNow(post.id)} style={{ padding: '4px 9px', fontSize: 11, border: 'none', borderRadius: 5, background: C.teal, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Post Now</button>
                          )}
                          <button onClick={() => handleDeletePost(post.id)} style={{ padding: '4px 9px', fontSize: 11, border: 'none', borderRadius: 5, background: '#FEE2E2', color: C.red, cursor: 'pointer', fontWeight: 600 }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ANALYTICS ───────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div>
          {/* Range filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[['7','7 Days'],['30','30 Days'],['90','90 Days']].map(([v, l]) => (
              <button key={v} onClick={() => setAnalyticsRange(v)} style={{
                padding: '7px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: analyticsRange === v ? C.teal : '#fff', color: analyticsRange === v ? '#fff' : C.mu,
                border: analyticsRange !== v ? `1px solid ${C.border}` : 'none',
              }}>{l}</button>
            ))}
          </div>

          {/* Platform Performance Table */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>Platform Performance</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                  {['Platform','Impressions','Reach','Engagement','Clicks','Conversions','Revenue'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.dark }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ANALYTICS_DATA.platforms.map((row, i) => (
                  <tr key={row.name} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : C.cream }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{row.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>{row.impressions}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: C.dark }}>{row.reach}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{row.engagement}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: C.dark }}>{row.clicks}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: C.teal, fontWeight: 600 }}>{row.conversions}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.gold }}>{row.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Content Type Performance */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>Content Type Performance</h3>
              {ANALYTICS_DATA.contentTypes.map(ct => (
                <div key={ct.type} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{ct.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ct.color }}>{ct.pct}%</span>
                  </div>
                  <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${ct.pct}%`, height: '100%', background: ct.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Top Categories */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>Best Performing Categories</h3>
              {ANALYTICS_DATA.topCategories.map((cat, i) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.cream, borderRadius: 10, marginBottom: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: cat.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>#{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: C.mu }}>Reach: {cat.reach}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{cat.conversion}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>Conversion</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.teal2})`, borderRadius: 14, padding: 22, marginBottom: 20, boxShadow: '0 4px 16px rgba(45,95,90,0.25)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#fff' }}>🤖 AI Self-Learning Insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { icon: '📅', insight: 'Reels posted on Tuesday 7–9 PM get 3.2x more reach than average. Shift 40% of reel schedule to this window.' },
                { icon: '🌿', insight: 'Skincare content converts 2.1x better than haircare for your audience. Consider increasing skincare reels by 40%.' },
                { icon: '💬', insight: 'Comment-trigger CTAs outperform "link in bio" by 131% engagement. Use "Comment GLOW" format in next 10 posts.' },
              ].map((ins, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '14px 16px', backdropFilter: 'blur(4px)' }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{ins.icon}</div>
                  <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.6 }}>{ins.insight}</div>
                </div>
              ))}
            </div>
          </div>

          {/* A/B Tests */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${C.border}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>⚡ A/B Test Results</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {ANALYTICS_DATA.abTests.map((test, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 14 }}>{test.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { variant: 'A', data: test.variantA, isWinner: test.winner === 'A' },
                      { variant: 'B', data: test.variantB, isWinner: test.winner === 'B' },
                    ].map(({ variant, data, isWinner }) => (
                      <div key={variant} style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${isWinner ? C.green : C.border}`, background: isWinner ? '#F0FDF4' : C.cream, position: 'relative' }}>
                        {isWinner && (
                          <div style={{ position: 'absolute', top: -10, right: 8, background: C.green, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8 }}>🏆 WINNER</div>
                        )}
                        <div style={{ fontSize: 11, fontWeight: 700, color: isWinner ? C.green : C.mu, marginBottom: 4 }}>Variant {variant} — {data.label}</div>
                        <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5, marginBottom: 8 }}>"{data.text}"</div>
                        <div style={{ fontSize: 11, color: C.mu }}>Impressions: <strong style={{ color: C.dark }}>{data.impressions}</strong></div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isWinner ? C.green : C.dark, marginTop: 4 }}>Engagement: {data.engagement}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add to Queue Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.dark }}>Add Post to Queue</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 8 }}>Platforms</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PLATFORMS.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: addForm.platforms.includes(p.id) ? `${C.teal}18` : C.cream, border: `1px solid ${addForm.platforms.includes(p.id) ? C.teal : C.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={addForm.platforms.includes(p.id)}
                      onChange={e => setAddForm(f => ({ ...f, platforms: e.target.checked ? [...f.platforms, p.id] : f.platforms.filter(x => x !== p.id) }))}
                      style={{ accentColor: C.teal }}
                    />
                    {p.icon} {p.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Content Type</label>
                <select value={addForm.content_type} onChange={e => setAddForm(f => ({ ...f, content_type: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream }}>
                  {['Reel Script','Carousel','Caption','Short Script','LinkedIn Post','Thread'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Category</label>
                <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream }}>
                  {['Skincare','Haircare','Body Care','Supplements','Baby Care','Color Cosmetics'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>Caption</label>
                <button onClick={() => setAddForm(f => ({ ...f, caption: CAPTIONS[0].text.slice(0, 200) + '...' }))} style={{ fontSize: 11, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>⚡ Auto-generate</button>
              </div>
              <textarea
                value={addForm.caption}
                onChange={e => setAddForm(f => ({ ...f, caption: e.target.value }))}
                placeholder="Write your caption or click Auto-generate..."
                rows={4}
                style={{ width: '100%', padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.dark, background: C.cream, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Schedule Date</label>
                <input type="date" value={addForm.schedule_date} onChange={e => setAddForm(f => ({ ...f, schedule_date: e.target.value }))} style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Time</label>
                <input type="time" value={addForm.schedule_time} onChange={e => setAddForm(f => ({ ...f, schedule_time: e.target.value }))} defaultValue="18:00" style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 5 }}>Hashtags</label>
              <input
                value={addForm.hashtags}
                onChange={e => setAddForm(f => ({ ...f, hashtags: e.target.value }))}
                placeholder="#RabtNaturals #Skincare #IndianSkincare..."
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.cream, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '11px', border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: C.dark }}>Cancel</button>
              <button onClick={handleAddToQueue} style={{ flex: 2, padding: '11px', background: `linear-gradient(135deg, ${C.teal}, ${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Add to Queue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
