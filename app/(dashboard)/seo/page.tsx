'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const SITE = 'rabtnaturals.com'

const TABS = ['Dashboard', 'Keywords', 'Pages', 'AI Content', 'Technical']

// ── Mock GSC data (replaced by real API when connected) ──────────────────
const GSC_TRENDS = [
  { week: 'W1 Feb', clicks: 312, impressions: 8420, ctr: 3.7 },
  { week: 'W2 Feb', clicks: 398, impressions: 9180, ctr: 4.3 },
  { week: 'W3 Feb', clicks: 441, impressions: 9860, ctr: 4.5 },
  { week: 'W4 Feb', clicks: 387, impressions: 9320, ctr: 4.2 },
  { week: 'W1 Mar', clicks: 512, impressions: 11240, ctr: 4.6 },
  { week: 'W2 Mar', clicks: 618, impressions: 12800, ctr: 4.8 },
]

const TOP_KEYWORDS = [
  { keyword: 'best face serum for oily skin india', position: 4.2, clicks: 184, impressions: 2840, ctr: 6.5, intent: 'commercial', trend: 'up' },
  { keyword: 'rabt naturals review', position: 1.1, clicks: 142, impressions: 1620, ctr: 8.8, intent: 'brand', trend: 'stable' },
  { keyword: 'natural haircare products india', position: 8.4, clicks: 98, impressions: 3210, ctr: 3.1, intent: 'commercial', trend: 'up' },
  { keyword: 'vitamin c serum for dark spots', position: 11.2, clicks: 76, impressions: 4820, ctr: 1.6, intent: 'commercial', trend: 'up' },
  { keyword: 'hairfall solution natural', position: 6.8, clicks: 64, impressions: 2180, ctr: 2.9, intent: 'informational', trend: 'stable' },
  { keyword: 'skin analysis online free india', position: 14.3, clicks: 48, impressions: 5640, ctr: 0.9, intent: 'informational', trend: 'down' },
  { keyword: 'ayurvedic face cream for pigmentation', position: 9.1, clicks: 43, impressions: 1980, ctr: 2.2, intent: 'commercial', trend: 'up' },
  { keyword: 'best shampoo for hair growth india 2024', position: 18.6, clicks: 31, impressions: 6820, ctr: 0.5, intent: 'commercial', trend: 'up' },
]

const KEYWORD_OPPORTUNITIES = [
  { keyword: 'free skin consultation online india', volume: 8400, difficulty: 28, currentPos: null, opportunity: 'high' },
  { keyword: 'skincare routine for beginners india', volume: 12200, difficulty: 35, currentPos: null, opportunity: 'high' },
  { keyword: 'natural ingredients for glowing skin', volume: 9800, difficulty: 30, currentPos: 24, opportunity: 'high' },
  { keyword: 'best serum for combination skin india', volume: 6200, difficulty: 42, currentPos: null, opportunity: 'medium' },
  { keyword: 'haircare routine for indian hair', volume: 14800, difficulty: 38, currentPos: null, opportunity: 'high' },
  { keyword: 'rabt naturals glow serum', volume: 2100, difficulty: 12, currentPos: 3, opportunity: 'quick_win' },
  { keyword: 'collagen supplements india', volume: 18600, difficulty: 55, currentPos: null, opportunity: 'medium' },
  { keyword: 'clean beauty brand india', volume: 7400, difficulty: 32, currentPos: null, opportunity: 'high' },
]

const PAGES = [
  { url: '/', title: 'Rabt Naturals — Natural Skincare & Haircare', metaDesc: true, h1: true, wordCount: 620, score: 78, issue: 'Meta description too short (88 chars). Target 150-160.', clicks: 241 },
  { url: '/products/glow-serum', title: 'Glow Serum 30ml', metaDesc: false, h1: true, wordCount: 280, score: 52, issue: 'Missing meta description. Word count too low (<300). Add reviews section.', clicks: 184 },
  { url: '/blog/skincare-routine-india', title: 'Best Skincare Routine for Indian Skin', metaDesc: true, h1: true, wordCount: 1840, score: 91, issue: null, clicks: 118 },
  { url: '/products/keratin-hair-mask', title: 'Keratin Hair Mask', metaDesc: false, h1: false, wordCount: 190, score: 38, issue: 'Missing meta desc, missing H1 tag, very low word count. Needs full product page.', clicks: 76 },
  { url: '/skin-analysis', title: 'Free Skin Analysis — Rabt Naturals', metaDesc: true, h1: true, wordCount: 420, score: 68, issue: 'Add FAQ schema markup. Include "free skin consultation" keyword.', clicks: 64 },
  { url: '/about', title: 'About Us', metaDesc: false, h1: true, wordCount: 310, score: 55, issue: 'Missing meta description. Title too generic — include brand + keywords.', clicks: 43 },
]

const TECH_CHECKS = [
  { check: 'HTTPS / SSL Certificate', status: 'pass', detail: 'Valid SSL, auto-renewing' },
  { check: 'Mobile Responsiveness', status: 'pass', detail: 'Google mobile-friendly test passed' },
  { check: 'Page Speed (Mobile)', status: 'warn', detail: 'Score: 68/100 — compress images, reduce JS bundle' },
  { check: 'Page Speed (Desktop)', status: 'pass', detail: 'Score: 84/100 — good' },
  { check: 'XML Sitemap', status: 'warn', detail: 'Found at /sitemap.xml but not submitted to Google Search Console' },
  { check: 'Robots.txt', status: 'pass', detail: '/robots.txt present and correctly configured' },
  { check: 'Canonical Tags', status: 'fail', detail: 'Several product pages missing canonical tags — causes duplicate content' },
  { check: 'Structured Data (JSON-LD)', status: 'fail', detail: 'No product schema, review schema, or FAQ schema found' },
  { check: 'Core Web Vitals — LCP', status: 'warn', detail: '3.2s — target <2.5s. Optimize hero images.' },
  { check: 'Core Web Vitals — CLS', status: 'pass', detail: '0.04 — within good range (<0.1)' },
  { check: 'Open Graph / Social Meta', status: 'warn', detail: 'OG tags missing on product pages — bad social sharing preview' },
  { check: 'Internal Linking', status: 'warn', detail: 'Product pages have <3 internal links each — add contextual links from blog' },
]

const scoreColor = (s: number) => s >= 80 ? C.green : s >= 55 ? C.gold : C.red
const posColor = (p: number) => p <= 3 ? C.green : p <= 10 ? C.teal : p <= 20 ? C.gold : C.mu
const statusColor: Record<string, string> = { pass: C.green, warn: C.gold, fail: C.red }
const statusIcon: Record<string, string> = { pass: '✅', warn: '⚠️', fail: '❌' }

export default function SEOPage() {
  const [tab, setTab] = useState('Dashboard')
  const [gscConnected, setGscConnected] = useState(false)
  const [connectingGsc, setConnectingGsc] = useState(false)
  const [auditUrl, setAuditUrl] = useState('')
  const [auditResult, setAuditResult] = useState<string | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [contentTopic, setContentTopic] = useState('')
  const [contentType, setContentType] = useState<'blog' | 'product' | 'faq' | 'meta'>('blog')
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [kw, setKw] = useState('')
  const [kwResults, setKwResults] = useState<string | null>(null)
  const [searchingKw, setSearchingKw] = useState(false)

  const totalClicks = GSC_TRENDS.reduce((s, w) => s + w.clicks, 0)
  const totalImpressions = GSC_TRENDS.reduce((s, w) => s + w.impressions, 0)
  const avgCtr = (totalClicks / totalImpressions * 100).toFixed(1)
  const avgPos = (TOP_KEYWORDS.reduce((s, k) => s + k.position, 0) / TOP_KEYWORDS.length).toFixed(1)
  const maxClicks = Math.max(...GSC_TRENDS.map(w => w.clicks))

  async function connectGSC() {
    setConnectingGsc(true)
    // In production: redirect to /api/seo/gsc-auth which starts OAuth flow
    await new Promise(r => setTimeout(r, 1500))
    toast.success('Google Search Console connected! (Demo mode)')
    setGscConnected(true)
    setConnectingGsc(false)
  }

  async function auditPage() {
    if (!auditUrl) { toast.error('URL daalo'); return }
    setAuditing(true)
    setAuditResult(null)
    try {
      const res = await fetch('/api/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: auditUrl, site: SITE }),
      })
      const data = await res.json()
      setAuditResult(data.audit || data.error)
    } catch {
      toast.error('Audit failed')
    } finally {
      setAuditing(false)
    }
  }

  async function generateContent() {
    if (!contentTopic) { toast.error('Topic daalo'); return }
    setGenerating(true)
    setGeneratedContent(null)
    try {
      const res = await fetch('/api/seo/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: contentTopic, type: contentType, site: SITE }),
      })
      const data = await res.json()
      setGeneratedContent(data.content || data.error)
    } catch {
      toast.error('Content generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function researchKeyword() {
    if (!kw) { toast.error('Keyword daalo'); return }
    setSearchingKw(true)
    setKwResults(null)
    try {
      const res = await fetch('/api/seo/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw, site: SITE }),
      })
      const data = await res.json()
      setKwResults(data.analysis || data.error)
    } catch {
      toast.error('Keyword research failed')
    } finally {
      setSearchingKw(false)
    }
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔍</div>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>SEO Manager</h1>
              <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>{SITE} · Organic traffic growth · Keyword rankings · AI content</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, background: gscConnected ? C.green + '15' : C.border, color: gscConnected ? C.green : C.mu, fontWeight: 700, border: `1px solid ${gscConnected ? C.green + '40' : C.border}` }}>
              {gscConnected ? '🟢 GSC Connected' : '⚪ GSC Not Connected'}
            </div>
            {!gscConnected && (
              <button onClick={connectGSC} disabled={connectingGsc} style={{ padding: '8px 18px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {connectingGsc ? 'Connecting...' : 'Connect Google Search Console'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Organic Clicks (6 wks)', value: totalClicks.toLocaleString('en-IN'), sub: '+18% vs prev period', subC: C.green, icon: '👆' },
          { label: 'Total Impressions', value: (totalImpressions / 1000).toFixed(1) + 'K', sub: '+24% vs prev period', subC: C.green, icon: '👁️' },
          { label: 'Avg CTR', value: avgCtr + '%', sub: 'Industry avg: 3.2%', subC: parseFloat(avgCtr) > 3.2 ? C.green : C.gold, icon: '📊' },
          { label: 'Avg Position', value: '#' + avgPos, sub: `${TOP_KEYWORDS.filter(k => k.position <= 10).length} keywords in top 10`, subC: C.teal, icon: '🏆' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{k.icon}</span>
              <span style={{ fontSize: 11, color: C.mu, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: k.subC }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 6, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === t ? 700 : 500, background: tab === t ? `linear-gradient(135deg,${C.teal},${C.teal2})` : 'transparent', color: tab === t ? '#fff' : C.mu }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'Dashboard' && (
        <div>
          {/* Clicks chart */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Organic Traffic — Last 6 Weeks</div>
                <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>Google Search Console data · {SITE}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 160 }}>
              {GSC_TRENDS.map((w, i) => {
                const barH = Math.round((w.clicks / maxClicks) * 130)
                const isLast = i === GSC_TRENDS.length - 1
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? C.teal : C.mu }}>{w.clicks}</div>
                    <div style={{ width: '80%', height: barH, background: isLast ? `linear-gradient(180deg,${C.teal2},${C.teal})` : C.teal + '30', borderRadius: '6px 6px 0 0', transition: 'height 0.4s' }} />
                    <div style={{ fontSize: 10, color: isLast ? C.teal : C.mu, fontWeight: isLast ? 700 : 400 }}>{w.week}</div>
                    <div style={{ fontSize: 9, color: C.mu }}>{w.ctr}% CTR</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Top keywords */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>Top Performing Keywords</div>
              </div>
              {TOP_KEYWORDS.slice(0, 6).map((k, i) => (
                <div key={i} style={{ padding: '12px 20px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: posColor(k.position) + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, color: posColor(k.position), flexShrink: 0 }}>
                    #{Math.round(k.position)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.keyword}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>{k.clicks} clicks · {k.impressions.toLocaleString('en-IN')} impr</div>
                  </div>
                  <span style={{ fontSize: 12 }}>{k.trend === 'up' ? '📈' : k.trend === 'down' ? '📉' : '➡️'}</span>
                </div>
              ))}
            </div>

            {/* Quick wins */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>⚡ Quick Wins (High Impact)</div>
              </div>
              {[
                { page: '/products/glow-serum', action: 'Meta description add karo — missing', impact: '+35% CTR expected', urgency: 'high' },
                { page: '/products/keratin-hair-mask', action: 'H1 tag aur 500+ words add karo', impact: 'Page 2 → Page 1 possible', urgency: 'high' },
                { page: '/', action: 'Schema markup (Organization + Product) add karo', impact: 'Rich snippets in Google', urgency: 'medium' },
                { page: '/skin-analysis', action: '"free skin consultation india" keyword target karo', impact: '8,400 monthly searches', urgency: 'medium' },
                { page: '/blog', action: 'Haircare routine blog post likhao (14.8K searches)', impact: 'New organic channel', urgency: 'medium' },
              ].map((w, i) => (
                <div key={i} style={{ padding: '12px 20px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', borderLeft: `3px solid ${w.urgency === 'high' ? C.red : C.gold}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, marginBottom: 2 }}>{w.page}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 3 }}>{w.action}</div>
                      <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{w.impact}</div>
                    </div>
                    <button onClick={() => { setTab('Pages'); toast.success('Pages tab mein check karo') }} style={{ fontSize: 10, padding: '4px 10px', background: w.urgency === 'high' ? C.red + '15' : C.gold + '15', color: w.urgency === 'high' ? C.red : C.gold, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}>Fix</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KEYWORDS ── */}
      {tab === 'Keywords' && (
        <div>
          {/* AI keyword research */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🤖 AI Keyword Research</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={kw} onChange={e => setKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && researchKeyword()} placeholder="e.g. vitamin c serum for dark spots india" style={{ flex: 1, padding: '11px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
              <button onClick={researchKeyword} disabled={searchingKw} style={{ padding: '11px 22px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: searchingKw ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                {searchingKw ? '⏳ Researching...' : '🔍 Research'}
              </button>
            </div>
            {kwResults && (
              <div style={{ marginTop: 16, padding: '16px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: C.dark }}>
                {kwResults}
              </div>
            )}
          </div>

          {/* Current rankings */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>Current Keyword Rankings</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Keyword', 'Position', 'Clicks', 'Impressions', 'CTR', 'Intent', 'Trend'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOP_KEYWORDS.map((k, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, maxWidth: 280 }}>{k.keyword}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: posColor(k.position) }}>#{k.position.toFixed(1)}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>{k.clicks}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{k.impressions.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: k.ctr > 3 ? C.green : C.gold }}>{k.ctr}%</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: k.intent === 'commercial' ? C.teal + '15' : k.intent === 'brand' ? C.purple + '15' : C.gold + '15', color: k.intent === 'commercial' ? C.teal : k.intent === 'brand' ? C.purple : C.gold }}>
                          {k.intent}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14 }}>{k.trend === 'up' ? '📈' : k.trend === 'down' ? '📉' : '➡️'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Opportunities */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>🎯 Keyword Opportunities</div>
              <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>High-volume, low-difficulty keywords you can rank for</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Keyword', 'Monthly Searches', 'Difficulty', 'Current Position', 'Opportunity', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KEYWORD_OPPORTUNITIES.map((k, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{k.keyword}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: C.dark }}>{k.volume.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: C.border, borderRadius: 4 }}>
                            <div style={{ height: '100%', width: `${k.difficulty}%`, background: k.difficulty < 35 ? C.green : k.difficulty < 55 ? C.gold : C.red, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: k.difficulty < 35 ? C.green : k.difficulty < 55 ? C.gold : C.red }}>{k.difficulty}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: k.currentPos ? posColor(k.currentPos) : C.mu, fontWeight: k.currentPos ? 700 : 400 }}>
                        {k.currentPos ? `#${k.currentPos}` : 'Not ranking'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: k.opportunity === 'quick_win' ? C.green + '15' : k.opportunity === 'high' ? C.teal + '15' : C.gold + '15', color: k.opportunity === 'quick_win' ? C.green : k.opportunity === 'high' ? C.teal : C.gold }}>
                          {k.opportunity === 'quick_win' ? '⚡ Quick Win' : k.opportunity === 'high' ? '🎯 High' : '📊 Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => { setContentTopic(k.keyword); setTab('AI Content'); toast.success('AI Content tab mein content generate karo') }} style={{ fontSize: 11, padding: '5px 12px', background: C.teal + '15', color: C.teal, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                          Write Content →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGES ── */}
      {tab === 'Pages' && (
        <div>
          {/* Manual audit */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🤖 AI Page Audit</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={auditUrl} onChange={e => setAuditUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && auditPage()} placeholder={`https://${SITE}/products/glow-serum`} style={{ flex: 1, padding: '11px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }} />
              <button onClick={auditPage} disabled={auditing} style={{ padding: '11px 22px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: auditing ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {auditing ? '⏳ Auditing...' : '🔍 Audit Page'}
              </button>
            </div>
            {auditResult && (
              <div style={{ marginTop: 16, padding: '16px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: C.dark }}>
                {auditResult}
              </div>
            )}
          </div>

          {/* Page list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PAGES.map((p, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, borderLeft: `4px solid ${scoreColor(p.score)}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: scoreColor(p.score) }}>{p.score}</span>
                      <span style={{ fontSize: 11, color: C.mu }}>/ 100</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.mu }}>{p.url}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{p.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: p.metaDesc ? C.green + '15' : C.red + '15', color: p.metaDesc ? C.green : C.red, fontWeight: 700 }}>{p.metaDesc ? '✅ Meta Desc' : '❌ Meta Desc'}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: p.h1 ? C.green + '15' : C.red + '15', color: p.h1 ? C.green : C.red, fontWeight: 700 }}>{p.h1 ? '✅ H1' : '❌ H1'}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: p.wordCount >= 500 ? C.green + '15' : p.wordCount >= 300 ? C.gold + '15' : C.red + '15', color: p.wordCount >= 500 ? C.green : p.wordCount >= 300 ? C.gold : C.red, fontWeight: 700 }}>{p.wordCount} words</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.teal + '15', color: C.teal, fontWeight: 700 }}>{p.clicks} clicks/mo</span>
                    </div>
                  </div>
                  <button onClick={() => { setAuditUrl(`https://${SITE}${p.url}`); setTab('Pages'); setTimeout(() => auditPage(), 100) }} style={{ padding: '8px 16px', background: C.teal, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>
                    AI Audit →
                  </button>
                </div>
                {p.issue && (
                  <div style={{ fontSize: 12, color: C.dark, background: scoreColor(p.score) + '08', padding: '10px 14px', borderRadius: 10, border: `1px solid ${scoreColor(p.score)}20` }}>
                    <strong>Fix:</strong> {p.issue}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI CONTENT ── */}
      {tab === 'AI Content' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
            {/* Form */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, height: 'fit-content', position: 'sticky', top: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>🤖 AI SEO Content Generator</div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Content Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { v: 'blog', l: '📝 Blog Post', d: 'Long-form SEO article' },
                    { v: 'product', l: '🛍️ Product Page', d: 'Product description' },
                    { v: 'faq', l: '❓ FAQ Section', d: 'FAQ for rich snippets' },
                    { v: 'meta', l: '🏷️ Meta Tags', d: 'Title + description' },
                  ] as const).map(({ v, l, d }) => (
                    <div key={v} onClick={() => setContentType(v)} style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${contentType === v ? C.teal : C.border}`, background: contentType === v ? C.teal + '10' : '#fff', cursor: 'pointer' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: contentType === v ? C.teal : C.dark }}>{l}</div>
                      <div style={{ fontSize: 10, color: C.mu }}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                  {contentType === 'blog' ? 'Blog Topic / Target Keyword' : contentType === 'product' ? 'Product Name' : contentType === 'faq' ? 'Topic for FAQs' : 'Page URL / Topic'}
                </label>
                <textarea value={contentTopic} onChange={e => setContentTopic(e.target.value)} rows={3} placeholder={
                  contentType === 'blog' ? 'e.g. best skincare routine for oily skin india summer 2024'
                  : contentType === 'product' ? 'e.g. Glow Serum 30ml — vitamin C, niacinamide, dark spots'
                  : contentType === 'faq' ? 'e.g. natural haircare products, ingredients, usage'
                  : 'e.g. /products/glow-serum — vitamin C face serum india'
                } style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <button onClick={generateContent} disabled={generating} style={{ width: '100%', padding: '13px', background: generating ? C.mu : `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {generating ? '⏳ Generating...' : '✨ Generate Content'}
              </button>

              {/* Suggested topics */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Suggested Topics (High Traffic)</div>
                {[
                  'Best skincare routine for Indian skin type',
                  'Haircare routine for oily scalp india',
                  'Vitamin C serum benefits for dark spots',
                  'Natural ingredients for glowing skin',
                  'How to treat hairfall naturally india',
                ].map((t, i) => (
                  <div key={i} onClick={() => { setContentTopic(t); setContentType('blog') }} style={{ padding: '8px 12px', background: C.bg, borderRadius: 8, marginBottom: 6, cursor: 'pointer', fontSize: 12, color: C.dark, border: `1px solid ${C.border}` }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Output */}
            <div>
              {generatedContent ? (
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>Generated Content</div>
                    <button onClick={() => { navigator.clipboard.writeText(generatedContent); toast.success('Copied!') }} style={{ padding: '7px 16px', background: C.teal + '15', color: C.teal, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Copy
                    </button>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: C.dark }}>
                    {generatedContent}
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fff', border: `2px dashed ${C.border}`, borderRadius: 16, padding: 60, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>AI Content Generate Karo</div>
                  <div style={{ fontSize: 13, color: C.mu, lineHeight: 1.6 }}>
                    Topic select karo, type choose karo<br />
                    aur SEO-optimized content seconds mein milega
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TECHNICAL ── */}
      {tab === 'Technical' && (
        <div>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Passed', value: TECH_CHECKS.filter(c => c.status === 'pass').length.toString(), color: C.green, icon: '✅' },
              { label: 'Warnings', value: TECH_CHECKS.filter(c => c.status === 'warn').length.toString(), color: C.gold, icon: '⚠️' },
              { label: 'Failed', value: TECH_CHECKS.filter(c => c.status === 'fail').length.toString(), color: C.red, icon: '❌' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 28 }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 12, color: C.mu }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TECH_CHECKS.map((c, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: `4px solid ${statusColor[c.status]}` }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{statusIcon[c.status]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{c.check}</div>
                  <div style={{ fontSize: 12, color: C.mu }}>{c.detail}</div>
                </div>
                {c.status !== 'pass' && (
                  <button onClick={() => toast.success(`AI se fix suggestion le rahe hain...`)} style={{ padding: '6px 14px', background: statusColor[c.status] + '15', color: statusColor[c.status], border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}>
                    How to Fix →
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Schema generator */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginTop: 20 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>🏗️ Schema Markup Generator</div>
            <div style={{ fontSize: 12, color: C.mu, marginBottom: 16 }}>Product, Organization, FAQ aur Review schema automatically generate karo</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Organization Schema', 'Product Schema', 'FAQ Schema', 'Review Schema', 'BreadcrumbList'].map(s => (
                <button key={s} onClick={() => { setContentTopic(`Generate ${s} JSON-LD for ${SITE} — Indian skincare brand`); setContentType('meta'); setTab('AI Content'); toast.success('AI Content tab mein schema generate hoga') }} style={{ padding: '9px 18px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: C.dark, fontFamily: 'DM Sans, sans-serif' }}>
                  {s} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
