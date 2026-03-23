'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', dark: '#1A2E2B', border: '#E5E7EB', bg: '#FAFAF8',
  green: '#10B981', red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6',
  blue: '#3B82F6', orange: '#F59E0B', pink: '#EC4899',
}

type Tab = 'campaigns' | 'audiences' | 'adcopy' | 'analytics'

interface Campaign {
  id: string; name: string; status: 'active' | 'planned' | 'completed' | 'paused'
  budget: number; spent: number; leads: number; conversions: number
  channel: string; startDate: string; endDate?: string
}

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Monsoon Skin Rescue — Meta', status: 'active', budget: 15000, spent: 8240, leads: 134, conversions: 28, channel: 'Instagram+Facebook', startDate: '2026-03-15' },
  { id: '2', name: 'Glow Serum WhatsApp Blast', status: 'active', budget: 3000, spent: 1200, leads: 89, conversions: 17, channel: 'WhatsApp', startDate: '2026-03-20' },
  { id: '3', name: 'Hairfall Special — Google', status: 'planned', budget: 20000, spent: 0, leads: 0, conversions: 0, channel: 'Google Ads', startDate: '2026-04-01' },
  { id: '4', name: 'Spring Skincare Launch', status: 'completed', budget: 12000, spent: 11890, leads: 203, conversions: 54, channel: 'Multi-channel', startDate: '2026-02-01', endDate: '2026-03-01' },
]

const STATUS_COLOR: Record<Campaign['status'], string> = {
  active: C.green, planned: C.blue, completed: '#9CA3AF', paused: C.orange,
}

const AUDIENCES = [
  { name: 'Acne-Prone 18-25', size: '2.4L', platform: 'Instagram', desc: 'Indian women 18-25, oily/combo skin, beauty interest' },
  { name: 'Anti-Aging 30-45', size: '1.8L', platform: 'Facebook', desc: 'Working women 30-45, premium skincare buyers' },
  { name: 'Hair Care Seekers', size: '3.1L', platform: 'Meta', desc: 'Both genders, hairfall/dandruff concern, 20-40' },
  { name: 'Skin Consultation Intent', size: '85K', platform: 'Google', desc: 'Searched "skin consultation", "skin problem" India' },
  { name: 'WhatsApp Existing Customers', size: '4,200', platform: 'WhatsApp', desc: 'Previous buyers — retargeting and upsell' },
  { name: 'Influencer Followers', size: '1.2L', platform: 'Instagram', desc: 'Lookalike of top 5 beauty influencer followers' },
]

export default function MarketingAIPage() {
  const [tab, setTab] = useState<Tab>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [campaignBrief, setCampaignBrief] = useState('')
  const [campaignPlan, setCampaignPlan] = useState('')
  const [adCopyTopic, setAdCopyTopic] = useState('')
  const [adCopyChannel, setAdCopyChannel] = useState('instagram')
  const [adCopyGoal, setAdCopyGoal] = useState('awareness')
  const [generatingAd, setGeneratingAd] = useState(false)
  const [adVariants, setAdVariants] = useState<{ headline: string; body: string; cta: string }[]>([])

  async function generateCampaignPlan() {
    if (!campaignBrief) return toast.error('Campaign brief daalo')
    setGeneratingPlan(true)
    try {
      const res = await fetch('/api/marketing/campaign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: campaignBrief }),
      })
      if (res.ok) {
        const d = await res.json()
        setCampaignPlan(d.plan)
        toast.success('Campaign plan ready!')
      }
    } catch { toast.error('Plan generation failed') }
    setGeneratingPlan(false)
  }

  async function generateAdCopy() {
    if (!adCopyTopic) return toast.error('Topic daalo')
    setGeneratingAd(true)
    try {
      const res = await fetch('/api/marketing/ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: adCopyTopic, channel: adCopyChannel, goal: adCopyGoal }),
      })
      if (res.ok) {
        const d = await res.json()
        setAdVariants(d.variants || [])
        toast.success('3 ad variants generated!')
      }
    } catch { toast.error('Ad copy failed') }
    setGeneratingAd(false)
  }

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const avgCPL = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'campaigns', label: 'Campaigns', icon: '📢' },
    { id: 'audiences', label: 'Audiences', icon: '🎯' },
    { id: 'adcopy', label: 'Ad Copy AI', icon: '✍️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📢</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.dark }}>Marketing AI Agent</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>AI-powered campaign planner, audience builder, ad copy generator aur performance tracker</p>
          </div>
          <span style={{ background: C.purple, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>AI</span>
        </div>
        <button onClick={() => setShowNewCampaign(true)} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          + New Campaign
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Budget', value: `₹${totalBudget.toLocaleString()}`, icon: '💰', color: C.teal },
          { label: 'Spent', value: `₹${totalSpent.toLocaleString()}`, icon: '💸', color: C.orange },
          { label: 'Total Leads', value: totalLeads, icon: '👥', color: C.blue },
          { label: 'Conversions', value: totalConversions, icon: '✅', color: C.green },
          { label: 'Avg CPL', value: `₹${avgCPL}`, icon: '📊', color: C.purple },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.id ? C.purple : 'transparent', color: tab === t.id ? '#fff' : '#6B7280' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* CAMPAIGNS */}
      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20 }}>
          {/* Campaign List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {campaigns.map(c => {
              const roi = c.conversions > 0 ? Math.round((c.conversions * 899 - c.spent) / c.spent * 100) : 0
              return (
                <div key={c.id} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderLeft: `4px solid ${STATUS_COLOR[c.status]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{c.channel} · {c.startDate}{c.endDate ? ` → ${c.endDate}` : ''}</div>
                    </div>
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: STATUS_COLOR[c.status] + '20', color: STATUS_COLOR[c.status], fontWeight: 700 }}>{c.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Budget', value: `₹${c.budget.toLocaleString()}` },
                      { label: 'Spent', value: `₹${c.spent.toLocaleString()}` },
                      { label: 'Leads', value: c.leads },
                      { label: 'Converted', value: c.conversions },
                      { label: 'ROI', value: c.conversions > 0 ? `+${roi}%` : '—', color: roi > 0 ? C.green : '#9CA3AF' },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: s.color || C.dark }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {c.status === 'active' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                        <span>Budget used</span><span>{Math.round((c.spent / c.budget) * 100)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(c.spent / c.budget) * 100}%`, background: c.spent / c.budget > 0.8 ? C.orange : C.green, borderRadius: 3 }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* AI Campaign Planner */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: C.dark }}>🧠 AI Campaign Planner</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>Brief do — AI full campaign strategy banayega: channels, budget split, content plan, timeline</p>
            <textarea value={campaignBrief} onChange={e => setCampaignBrief(e.target.value)} rows={4} placeholder="E.g., Monsoon ke liye acne-prone skin ke liye campaign. Budget ₹20,000. Target: 18-30 women. Goal: 50 conversions." style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', marginBottom: 12 }} />
            <button onClick={generateCampaignPlan} disabled={generatingPlan} style={{ width: '100%', background: generatingPlan ? '#9CA3AF' : C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
              {generatingPlan ? '🧠 Planning...' : '🧠 Generate Campaign Plan'}
            </button>
            {campaignPlan && (
              <div style={{ background: '#F5F3FF', borderRadius: 8, padding: 14, fontSize: 13, color: C.dark, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
                {campaignPlan}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIENCES */}
      {tab === 'audiences' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {AUDIENCES.map((aud, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{aud.name}</div>
                <span style={{ fontSize: 11, background: '#F3F4F6', padding: '2px 8px', borderRadius: 10, color: '#6B7280' }}>{aud.platform}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.purple, marginBottom: 4 }}>{aud.size}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{aud.desc}</div>
              <button onClick={() => toast.success(`Targeting ${aud.name} — ${aud.size} reach`)} style={{ width: '100%', background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                🎯 Use This Audience
              </button>
            </div>
          ))}
          <div style={{ background: '#F5F3FF', border: `2px dashed ${C.purple}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 180 }} onClick={() => toast.success('AI building custom audience...')}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.purple }}>AI Build Custom Audience</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>Describe your ideal customer — AI creates targeting segments</div>
          </div>
        </div>
      )}

      {/* AD COPY AI */}
      {tab === 'adcopy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
          {/* Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>✍️ Ad Copy Generator</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Product / Offer</label>
                  <input value={adCopyTopic} onChange={e => setAdCopyTopic(e.target.value)} placeholder="Glow Serum — anti-dark spot" style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Channel</label>
                  <select value={adCopyChannel} onChange={e => setAdCopyChannel(e.target.value)} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
                    <option value="instagram">Instagram Feed / Reel</option>
                    <option value="facebook">Facebook Ad</option>
                    <option value="google">Google Search Ad</option>
                    <option value="whatsapp">WhatsApp Broadcast</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Campaign Goal</label>
                  <select value={adCopyGoal} onChange={e => setAdCopyGoal(e.target.value)} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
                    <option value="awareness">Brand Awareness</option>
                    <option value="leads">Lead Generation</option>
                    <option value="sales">Direct Sales</option>
                    <option value="consultation">Free Consultation</option>
                  </select>
                </div>
                <button onClick={generateAdCopy} disabled={generatingAd} style={{ background: generatingAd ? '#9CA3AF' : C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {generatingAd ? '🧠 Writing...' : '🧠 Generate 3 Variants'}
                </button>
              </div>
            </div>
          </div>

          {/* Ad Variants */}
          <div>
            {adVariants.length === 0 ? (
              <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 60, textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
                <div style={{ fontSize: 16 }}>3 ad variants generate honge — A/B test ke liye</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {adVariants.map((v, i) => (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `3px solid ${[C.purple, C.blue, C.pink][i]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: [C.purple, C.blue, C.pink][i] }}>Variant {String.fromCharCode(65 + i)}</span>
                      <button onClick={() => { navigator.clipboard.writeText(`${v.headline}\n\n${v.body}\n\n${v.cta}`); toast.success('Copied!') }} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: '#6B7280', cursor: 'pointer' }}>Copy</button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 8 }}>{v.headline}</div>
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 10 }}>{v.body}</div>
                    <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: [C.purple, C.blue, C.pink][i] }}>
                      CTA: {v.cta}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>📊 Channel Performance</h3>
            {[
              { channel: 'Instagram', spend: 18400, leads: 167, cpl: 110, roas: '3.2x', color: '#E1306C' },
              { channel: 'WhatsApp', spend: 4200, leads: 89, cpl: 47, roas: '5.1x', color: '#25D366' },
              { channel: 'Facebook', spend: 9800, leads: 76, cpl: 129, roas: '2.4x', color: '#1877F2' },
              { channel: 'Google Ads', spend: 14500, leads: 45, cpl: 322, roas: '1.8x', color: C.orange },
              { channel: 'Organic SEO', spend: 0, leads: 234, cpl: 0, roas: '∞', color: C.green },
            ].map((ch, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? `1px solid #F3F4F6` : 'none' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: C.dark }}>{ch.channel}</div>
                <div style={{ textAlign: 'right', fontSize: 13 }}>
                  <div style={{ color: C.dark }}>₹{ch.spend.toLocaleString()} · {ch.leads} leads</div>
                  <div style={{ color: '#9CA3AF', fontSize: 12 }}>CPL ₹{ch.cpl} · ROAS {ch.roas}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>🏆 Top Performing Content</h3>
            {[
              { content: 'Before-after transformation reel', type: 'Reel', reach: '45K', ctr: '8.2%' },
              { content: '"Monsoon skin tips" carousel', type: 'Post', reach: '28K', ctr: '6.7%' },
              { content: 'Free consultation WhatsApp blast', type: 'WA Broadcast', reach: '4.2K', ctr: '24%' },
              { content: 'Glow Serum testimonial story', type: 'Story', reach: '18K', ctr: '5.3%' },
              { content: '"Acne ke 5 solutions" blog', type: 'Blog', reach: '12K', ctr: '3.8%' },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? `1px solid #F3F4F6` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{c.content}</div>
                  <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', padding: '1px 6px', borderRadius: 8 }}>{c.type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.purple }}>{c.ctr} CTR</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{c.reach} reach</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>New Campaign</h3>
              <button onClick={() => setShowNewCampaign(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Campaign Name', placeholder: 'Monsoon Skin Rescue' },
                { label: 'Channel', placeholder: 'Instagram, WhatsApp, Google...' },
                { label: 'Budget (₹)', placeholder: '15000' },
                { label: 'Start Date', placeholder: '2026-04-01' },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input placeholder={f.placeholder} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNewCampaign(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: '#6B7280' }}>Cancel</button>
                <button onClick={() => { toast.success('Campaign created!'); setShowNewCampaign(false) }} style={{ flex: 2, padding: '12px 0', borderRadius: 8, border: 'none', background: C.purple, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Create Campaign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
