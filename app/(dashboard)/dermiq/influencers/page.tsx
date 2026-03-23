'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', dark: '#1A2E2B', border: '#E8E0D8',
  cream: '#F7F3EE', green: '#10B981', red: '#EF4444',
  gold: '#D4A853', mu: '#6B7280', bg: '#FAFAF8', white: '#FFFFFF',
}

interface Influencer {
  id: number; name: string; email: string; phone?: string;
  instagram?: string; youtube?: string; category: string; tier: string;
  referral_slug: string; coupon_code: string; coupon_discount: number;
  commission_per_lead: number; commission_per_consultation: number; commission_percent: number;
  status: string; custom_headline?: string; custom_message?: string; profile_image?: string;
  total_clicks: number; total_signups: number; total_analyses: number;
  total_consultations: number; total_sales: number; total_revenue: number;
  total_earnings: number; pending_payout: number; paid_out: number; created_at: string;
}

interface Payout {
  id: number; influencer_id: number; amount: number; upi_id?: string;
  status: string; notes?: string; requested_at: string; processed_at?: string;
  dermiq_influencers?: { name: string }
}

interface ReferralEvent {
  id: number; event_type: string; user_email?: string; user_name?: string;
  product_name?: string; order_amount: number; commission_earned: number; created_at: string;
}

const CATEGORIES = ['skincare', 'haircare', 'supplements', 'bodycare', 'general']
const TIERS = ['nano', 'micro', 'macro', 'mega']

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
function couponize(name: string, discount: number) {
  return name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '') + discount
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = { nano: C.mu, micro: C.teal, macro: C.gold, mega: '#8B5CF6' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: (colors[tier] || C.mu) + '20', color: colors[tier] || C.mu, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {tier}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: C.green + '20', color: C.green },
    pending: { bg: C.gold + '20', color: C.gold },
    paused: { bg: C.mu + '20', color: C.mu },
    rejected: { bg: C.red + '20', color: C.red },
    processing: { bg: '#3B82F6' + '20', color: '#3B82F6' },
    paid: { bg: C.green + '20', color: C.green },
  }
  const s = map[status] || { bg: C.mu + '20', color: C.mu }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: C.mu, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.dark }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.mu, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function InfluencersPage() {
  const [tab, setTab] = useState<'overview' | 'influencers' | 'payouts'>('overview')
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<ReferralEvent[]>([])
  const [form, setForm] = useState({
    name: '', email: '', phone: '', instagram: '', youtube: '',
    category: 'skincare', tier: 'nano', referral_slug: '', coupon_code: '',
    coupon_discount: 15, commission_per_lead: 5, commission_per_consultation: 20,
    commission_percent: 8, custom_headline: '', custom_message: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: infs }, { data: pays }] = await Promise.all([
      supabase.from('dermiq_influencers').select('*').order('created_at', { ascending: false }),
      supabase.from('dermiq_influencer_payouts').select('*, dermiq_influencers(name)').order('requested_at', { ascending: false }),
    ])
    setInfluencers(infs || [])
    setPayouts(pays || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const loadEvents = async (infId: number) => {
    const { data } = await supabase.from('dermiq_referral_events')
      .select('*').eq('influencer_id', infId).order('created_at', { ascending: false }).limit(10)
    setExpandedEvents(data || [])
  }

  const toggleExpand = (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    loadEvents(id)
  }

  const updateForm = (k: string, v: string | number) => {
    setForm(f => {
      const updated = { ...f, [k]: v }
      if (k === 'name') {
        updated.referral_slug = slugify(String(v))
        updated.coupon_code = couponize(String(v), updated.coupon_discount)
      }
      if (k === 'coupon_discount') {
        updated.coupon_code = couponize(updated.name, Number(v))
      }
      return updated
    })
  }

  const submitInfluencer = async () => {
    if (!form.name || !form.email || !form.referral_slug || !form.coupon_code) {
      toast.error('Name, email, slug and coupon are required')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('dermiq_influencers').insert({
      name: form.name, email: form.email, phone: form.phone || null,
      instagram: form.instagram || null, youtube: form.youtube || null,
      category: form.category, tier: form.tier,
      referral_slug: form.referral_slug, coupon_code: form.coupon_code,
      coupon_discount: form.coupon_discount, commission_per_lead: form.commission_per_lead,
      commission_per_consultation: form.commission_per_consultation,
      commission_percent: form.commission_percent,
      custom_headline: form.custom_headline || null, custom_message: form.custom_message || null,
    })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Influencer added!')
    setShowModal(false)
    setForm({ name: '', email: '', phone: '', instagram: '', youtube: '', category: 'skincare', tier: 'nano', referral_slug: '', coupon_code: '', coupon_discount: 15, commission_per_lead: 5, commission_per_consultation: 20, commission_percent: 8, custom_headline: '', custom_message: '' })
    loadData()
  }

  const toggleStatus = async (inf: Influencer) => {
    const newStatus = inf.status === 'active' ? 'paused' : 'active'
    const { error } = await supabase.from('dermiq_influencers').update({ status: newStatus }).eq('id', inf.id)
    if (error) { toast.error(error.message); return }
    toast.success(`${inf.name} ${newStatus}`)
    loadData()
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://dermiq.com/ref/${slug}`)
    toast.success('Referral link copied!')
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Coupon code copied!')
  }

  const updatePayoutStatus = async (id: number, status: string) => {
    const { error } = await supabase.from('dermiq_influencer_payouts').update({ status, processed_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(`Payout marked as ${status}`)
    loadData()
  }

  const active = influencers.filter(i => i.status === 'active')
  const totalClicks = influencers.reduce((s, i) => s + i.total_clicks, 0)
  const totalSignups = influencers.reduce((s, i) => s + i.total_signups, 0)
  const totalAnalyses = influencers.reduce((s, i) => s + i.total_analyses, 0)
  const totalConsults = influencers.reduce((s, i) => s + i.total_consultations, 0)
  const totalRevenue = influencers.reduce((s, i) => s + Number(i.total_revenue), 0)
  const top5 = [...influencers].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5)
  const totalPending = influencers.reduce((s, i) => s + Number(i.pending_payout), 0)
  const thisMonth = payouts.filter(p => p.status === 'paid' && new Date(p.requested_at).getMonth() === new Date().getMonth())
  const paidThisMonth = thisMonth.reduce((s, p) => s + Number(p.amount), 0)

  const filtered = influencers.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !q || i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q) || i.coupon_code.toLowerCase().includes(q)
    const matchCat = !filterCat || i.category === filterCat
    const matchTier = !filterTier || i.tier === filterTier
    const matchStatus = !filterStatus || i.status === filterStatus
    return matchSearch && matchCat && matchTier && matchStatus
  })

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const selectStyle: React.CSSProperties = { ...inputStyle, background: C.white }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: C.mu, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }

  const funnelSteps = [
    { label: 'Clicks', value: totalClicks },
    { label: 'Signups', value: totalSignups },
    { label: 'Analyses', value: totalAnalyses },
    { label: 'Consultations', value: totalConsults },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, margin: 0 }}>Influencers & Partners</h1>
        <p style={{ fontSize: 14, color: C.mu, marginTop: 4 }}>Manage your referral partners, track performance, and process payouts.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.cream, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['overview', 'influencers', 'payouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, background: tab === t ? C.white : 'transparent', color: tab === t ? C.dark : C.mu, boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', textTransform: 'capitalize', transition: 'all 0.2s' }}>
            {t}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', color: C.mu, padding: 40 }}>Loading...</div>}

      {/* ── OVERVIEW TAB ── */}
      {!loading && tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard label="Active Influencers" value={active.length} />
            <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} />
            <StatCard label="Total Signups" value={totalSignups.toLocaleString()} />
            <StatCard label="Total Analyses" value={totalAnalyses.toLocaleString()} />
            <StatCard label="Consultations" value={totalConsults.toLocaleString()} />
            <StatCard label="Revenue Generated" value={`₹${totalRevenue.toLocaleString()}`} />
          </div>

          {/* Top Performers */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>Top Performers</h2>
            </div>
            {top5.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: C.mu }}>No influencer data yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.cream }}>
                      {['Name', 'Category', 'Tier', 'Clicks', 'Conversions', 'Revenue', 'Earnings', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((inf, i) => (
                      <tr key={inf.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : C.cream + '60' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: C.dark, fontSize: 14 }}>{inf.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu, textTransform: 'capitalize' }}>{inf.category}</td>
                        <td style={{ padding: '12px 16px' }}><TierBadge tier={inf.tier} /></td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: C.dark }}>{inf.total_clicks.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: C.dark }}>{(inf.total_analyses + inf.total_consultations).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: C.teal }}>₹{Number(inf.total_revenue).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: C.gold }}>₹{Number(inf.total_earnings).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={inf.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Funnel */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.dark }}>Conversion Funnel</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnelSteps.map((step, i) => {
                const prev = funnelSteps[i - 1]
                const pct = prev && prev.value > 0 ? Math.round((step.value / prev.value) * 100) : 100
                const barW = totalClicks > 0 ? Math.round((step.value / totalClicks) * 100) : 0
                return (
                  <div key={step.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{step.label}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>{step.value.toLocaleString()}</span>
                        {i > 0 && <span style={{ fontSize: 12, color: pct >= 50 ? C.green : C.red, fontWeight: 600 }}>{pct}% of prev</span>}
                      </div>
                    </div>
                    <div style={{ height: 10, background: C.cream, borderRadius: 5 }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.teal}99)`, borderRadius: 5, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── INFLUENCERS TAB ── */}
      {!loading && tab === 'influencers' && (
        <div>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, coupon..." style={{ ...inputStyle, width: 240 }} />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...selectStyle, width: 150 }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </select>
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)} style={{ ...selectStyle, width: 130 }}>
              <option value="">All Tiers</option>
              {TIERS.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: 140 }}>
              <option value="">All Statuses</option>
              {['pending', 'active', 'paused', 'rejected'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
            </select>
            <button onClick={() => setShowModal(true)} style={{ marginLeft: 'auto', padding: '10px 20px', background: C.teal, color: C.white, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Add Influencer
            </button>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: C.mu, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>
              No influencers found. Add your first partner!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(inf => (
              <div key={inf.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Card row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 16, flexWrap: 'wrap' }}>
                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${C.teal}, ${C.teal}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 800, fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                    {inf.profile_image ? <img src={inf.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inf.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{inf.name}</span>
                      <TierBadge tier={inf.tier} />
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: C.teal + '15', color: C.teal, textTransform: 'capitalize' }}>{inf.category}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{inf.email} · @{inf.referral_slug}</div>
                  </div>
                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Clicks', value: inf.total_clicks },
                      { label: 'Signups', value: inf.total_signups },
                      { label: 'Analyses', value: inf.total_analyses },
                      { label: 'Consults', value: inf.total_consultations },
                      { label: 'Earnings', value: `₹${Number(inf.total_earnings).toLocaleString()}` },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: C.mu }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <button onClick={() => toggleStatus(inf)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${inf.status === 'active' ? C.green : C.mu}`, background: 'transparent', color: inf.status === 'active' ? C.green : C.mu, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {inf.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button onClick={() => copyLink(inf.referral_slug)} title="Copy referral link" style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 14 }}>
                      🔗
                    </button>
                    <button onClick={() => toggleExpand(inf.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: expandedId === inf.id ? C.teal : C.cream, color: expandedId === inf.id ? C.white : C.dark, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {expandedId === inf.id ? 'Close' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === inf.id && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: 20, background: C.cream + '60' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
                      {/* Links & codes */}
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Referral Details</h3>
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, color: C.mu, marginBottom: 4 }}>Referral Link</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <code style={{ fontSize: 13, background: C.white, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, flex: 1 }}>
                              https://dermiq.com/ref/{inf.referral_slug}
                            </code>
                            <button onClick={() => copyLink(inf.referral_slug)} style={{ padding: '6px 12px', background: C.teal, color: C.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Copy</button>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: C.mu, marginBottom: 4 }}>Coupon Code</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <code style={{ fontSize: 15, fontWeight: 700, background: C.gold + '20', padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.gold}40`, color: C.gold, letterSpacing: 1 }}>
                              {inf.coupon_code}
                            </code>
                            <span style={{ fontSize: 12, color: C.mu }}>{inf.coupon_discount}% off</span>
                            <button onClick={() => copyCode(inf.coupon_code)} style={{ padding: '6px 12px', background: C.gold, color: C.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Copy</button>
                          </div>
                        </div>
                      </div>

                      {/* Earnings breakdown */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Earnings Breakdown</h3>
                        {[
                          { label: 'From Leads', value: `₹${(inf.total_analyses * inf.commission_per_lead).toLocaleString()}` },
                          { label: 'From Consultations', value: `₹${(inf.total_consultations * inf.commission_per_consultation).toLocaleString()}` },
                          { label: 'From Sales (est.)', value: `₹${(inf.total_revenue * inf.commission_percent / 100).toLocaleString()}` },
                          { label: 'Total Earned', value: `₹${Number(inf.total_earnings).toLocaleString()}`, bold: true },
                          { label: 'Pending Payout', value: `₹${Number(inf.pending_payout).toLocaleString()}`, color: C.red },
                          { label: 'Paid Out', value: `₹${Number(inf.paid_out).toLocaleString()}`, color: C.green },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ fontSize: 13, color: C.mu }}>{r.label}</span>
                            <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 600, color: r.color || C.dark }}>{r.value}</span>
                          </div>
                        ))}
                        {Number(inf.pending_payout) > 0 && (
                          <button onClick={async () => {
                            const { error } = await supabase.from('dermiq_influencer_payouts').insert({ influencer_id: inf.id, amount: inf.pending_payout, status: 'pending' })
                            if (!error) { toast.success('Payout approved & queued!'); loadData() }
                            else toast.error(error.message)
                          }} style={{ marginTop: 12, width: '100%', padding: '8px 0', background: C.green, color: C.white, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                            Approve Payout (₹{Number(inf.pending_payout).toLocaleString()})
                          </button>
                        )}
                      </div>

                      {/* Commission rates (editable) */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Commission Rates</h3>
                        <EditCommission inf={inf} onSave={loadData} />
                      </div>
                    </div>

                    {/* Recent events */}
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Recent Events</h3>
                    {expandedEvents.length === 0 ? (
                      <div style={{ color: C.mu, fontSize: 13 }}>No events recorded yet.</div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['Event', 'User', 'Product', 'Order Amt', 'Commission', 'Date'].map(h => (
                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', background: C.white, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {expandedEvents.map(ev => (
                              <tr key={ev.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '8px 12px' }}><StatusBadge status={ev.event_type} /></td>
                                <td style={{ padding: '8px 12px', fontSize: 13, color: C.dark }}>{ev.user_name || ev.user_email || '—'}</td>
                                <td style={{ padding: '8px 12px', fontSize: 13, color: C.mu }}>{ev.product_name || '—'}</td>
                                <td style={{ padding: '8px 12px', fontSize: 13 }}>{ev.order_amount > 0 ? `₹${ev.order_amount}` : '—'}</td>
                                <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 700, color: C.green }}>{ev.commission_earned > 0 ? `₹${ev.commission_earned}` : '—'}</td>
                                <td style={{ padding: '8px 12px', fontSize: 12, color: C.mu }}>{new Date(ev.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAYOUTS TAB ── */}
      {!loading && tab === 'payouts' && (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard label="Total Pending" value={`₹${totalPending.toLocaleString()}`} />
            <StatCard label="Paid This Month" value={`₹${paidThisMonth.toLocaleString()}`} />
            <StatCard label="Avg Payout" value={payouts.length > 0 ? `₹${Math.round(payouts.reduce((s, p) => s + Number(p.amount), 0) / payouts.length).toLocaleString()}` : '—'} />
          </div>

          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {payouts.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: C.mu }}>No payout requests yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.cream }}>
                      {['Influencer', 'Amount', 'UPI ID', 'Requested', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map(p => (
                      <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: C.dark }}>{p.dermiq_influencers?.name || `ID ${p.influencer_id}`}</td>
                        <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: C.teal }}>₹{Number(p.amount).toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{p.upi_id || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: C.mu }}>{new Date(p.requested_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => updatePayoutStatus(p.id, 'paid')} style={{ padding: '5px 12px', background: C.green, color: C.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Mark Paid</button>
                              <button onClick={() => updatePayoutStatus(p.id, 'rejected')} style={{ padding: '5px 12px', background: C.red, color: C.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Reject</button>
                            </div>
                          )}
                          {p.status !== 'pending' && <span style={{ fontSize: 12, color: C.mu }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD INFLUENCER MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.dark }}>Add Influencer / Partner</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'name', label: 'Full Name *' },
                { key: 'email', label: 'Email *' },
                { key: 'phone', label: 'Phone' },
                { key: 'instagram', label: 'Instagram Handle' },
                { key: 'youtube', label: 'YouTube Channel' },
              ].map(f => (
                <div key={f.key} style={f.key === 'name' || f.key === 'email' ? {} : {}}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={(form as Record<string, string | number>)[f.key] as string} onChange={e => updateForm(f.key, e.target.value)} style={inputStyle} />
                </div>
              ))}

              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={e => updateForm('category', e.target.value)} style={selectStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tier</label>
                <select value={form.tier} onChange={e => updateForm('tier', e.target.value)} style={selectStyle}>
                  {TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} {t === 'nano' ? '(<10k)' : t === 'micro' ? '(10k-100k)' : t === 'macro' ? '(100k-1M)' : '(1M+)'}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Referral Slug *</label>
                <input value={form.referral_slug} onChange={e => updateForm('referral_slug', e.target.value)} style={inputStyle} placeholder="e.g. priya-sharma" />
              </div>

              <div>
                <label style={labelStyle}>Coupon Code *</label>
                <input value={form.coupon_code} onChange={e => updateForm('coupon_code', e.target.value)} style={inputStyle} placeholder="e.g. PRIYA15" />
              </div>

              <div>
                <label style={labelStyle}>Discount %</label>
                <input type="number" value={form.coupon_discount} onChange={e => updateForm('coupon_discount', Number(e.target.value))} style={inputStyle} min={1} max={50} />
              </div>

              <div>
                <label style={labelStyle}>Commission per Lead (₹)</label>
                <input type="number" value={form.commission_per_lead} onChange={e => updateForm('commission_per_lead', Number(e.target.value))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Commission per Consultation (₹)</label>
                <input type="number" value={form.commission_per_consultation} onChange={e => updateForm('commission_per_consultation', Number(e.target.value))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Commission % per Sale</label>
                <input type="number" value={form.commission_percent} onChange={e => updateForm('commission_percent', Number(e.target.value))} style={inputStyle} min={0} max={50} />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Custom Headline</label>
              <input value={form.custom_headline} onChange={e => updateForm('custom_headline', e.target.value)} style={inputStyle} placeholder="Get your FREE skin analysis — Recommended by..." />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>Custom Message</label>
              <textarea value={form.custom_message} onChange={e => updateForm('custom_message', e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Personal message to show on their landing page..." />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: C.dark }}>Cancel</button>
              <button onClick={submitInfluencer} disabled={submitting} style={{ flex: 2, padding: '12px', background: C.teal, color: C.white, border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, fontSize: 15 }}>
                {submitting ? 'Adding...' : 'Add Influencer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditCommission({ inf, onSave }: { inf: Influencer; onSave: () => void }) {
  const [vals, setVals] = useState({ lead: inf.commission_per_lead, consult: inf.commission_per_consultation, pct: inf.commission_percent })
  const [saving, setSaving] = useState(false)
  const inputS: React.CSSProperties = { width: '100%', padding: '7px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const labelS: React.CSSProperties = { fontSize: 11, color: C.mu, fontWeight: 600, marginBottom: 3, display: 'block', textTransform: 'uppercase' }

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('dermiq_influencers').update({ commission_per_lead: vals.lead, commission_per_consultation: vals.consult, commission_percent: vals.pct }).eq('id', inf.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Commission rates updated')
    onSave()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={labelS}>Per Lead (₹)</label>
        <input type="number" value={vals.lead} onChange={e => setVals(v => ({ ...v, lead: Number(e.target.value) }))} style={inputS} />
      </div>
      <div>
        <label style={labelS}>Per Consultation (₹)</label>
        <input type="number" value={vals.consult} onChange={e => setVals(v => ({ ...v, consult: Number(e.target.value) }))} style={inputS} />
      </div>
      <div>
        <label style={labelS}>% per Sale</label>
        <input type="number" value={vals.pct} onChange={e => setVals(v => ({ ...v, pct: Number(e.target.value) }))} style={inputS} />
      </div>
      <button onClick={save} disabled={saving} style={{ padding: '8px', background: C.teal, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : 'Save Rates'}
      </button>
    </div>
  )
}
