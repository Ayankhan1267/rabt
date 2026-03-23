'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const FUNNEL_STEPS = [
  { step: 1, name: 'Website Visitors', count: 18600, pct: 100, drop: null, widthPct: 100, health: 'good' },
  { step: 2, name: 'WhatsApp Click', count: 5580, pct: 30, drop: 70, widthPct: 82, health: 'warn' },
  { step: 3, name: 'Consultation Started', count: 3906, pct: 21, drop: 30, widthPct: 68, health: 'good' },
  { step: 4, name: 'Skin Profile Created', count: 2930, pct: 15.8, drop: 25, widthPct: 56, health: 'good' },
  { step: 5, name: 'Product Recommended', count: 2344, pct: 12.6, drop: 20, widthPct: 48, health: 'good' },
  { step: 6, name: 'Added to Cart', count: 1406, pct: 7.6, drop: 40, widthPct: 38, health: 'warn' },
  { step: 7, name: 'Checkout Started', count: 937, pct: 5, drop: 33, widthPct: 28, health: 'warn' },
  { step: 8, name: 'Purchase Completed', count: 656, pct: 3.5, drop: 30, widthPct: 18, health: 'bad' },
]

const DROPOFFS = [
  {
    from: 'Website', to: 'WhatsApp', drop: 70, fix: 'Add floating WhatsApp button + free consultation popup after 30s on site',
    impact: '+4.2% conversion', link: '/website', urgency: 'high',
  },
  {
    from: 'Cart', to: 'Checkout', drop: 40, fix: 'Send WhatsApp reminder 2hrs after cart abandonment with discount nudge',
    impact: '+2.1% conversion', link: '/crm', urgency: 'high',
  },
  {
    from: 'Checkout', to: 'Purchase', drop: 30, fix: 'Add UPI deeplink + COD option + trust badges at checkout',
    impact: '+1.5% conversion', link: '/finance', urgency: 'medium',
  },
]

const CHANNELS = [
  { channel: 'Organic Search', visitors: 6200, conversions: 248, revenue: 347200, cost: 0 },
  { channel: 'WhatsApp Campaigns', visitors: 4100, conversions: 205, revenue: 287000, cost: 6200 },
  { channel: 'Instagram', visitors: 3800, conversions: 114, revenue: 159600, cost: 22000 },
  { channel: 'Partner Network', visitors: 2600, conversions: 52, revenue: 72800, cost: 8000 },
  { channel: 'Direct / Referral', visitors: 1900, conversions: 37, revenue: 51800, cost: 0 },
]

const AB_TESTS_INITIAL = [
  { test: 'WhatsApp CTA Button', varA: '"Chat with Expert"', varB: '"Free Skin Analysis"', split: '50/50', winner: 'Variant B (+18% CTR)', status: 'complete' },
  { test: 'Homepage Hero Banner', varA: 'Product focus', varB: 'Skin transformation story', split: '50/50', winner: 'Running (Day 6/14)', status: 'running' },
  { test: 'Consultation CTA', varA: '₹299 consultation', varB: 'Free first consultation', split: '50/50', winner: 'Variant B (+22% bookings)', status: 'complete' },
]

function fmt(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}

function roi(revenue: number, cost: number) {
  if (cost === 0) return '∞'
  return ((revenue - cost) / cost * 100).toFixed(0) + '%'
}

function convRate(conv: number, vis: number) {
  return (conv / vis * 100).toFixed(1) + '%'
}

const healthColor = (h: string) => h === 'good' ? C.green : h === 'warn' ? C.gold : C.red

export default function FunnelsPage() {
  const [abTests, setAbTests] = useState(AB_TESTS_INITIAL)
  const [showNewTest, setShowNewTest] = useState(false)
  const [newTest, setNewTest] = useState({ name: '', varA: '', varB: '' })

  function createTest() {
    if (!newTest.name || !newTest.varA || !newTest.varB) { toast.error('Please fill all fields'); return }
    setAbTests(t => [...t, { test: newTest.name, varA: newTest.varA, varB: newTest.varB, split: '50/50', winner: 'Running (Day 0)', status: 'running' }])
    setNewTest({ name: '', varA: '', varB: '' })
    setShowNewTest(false)
    toast.success('A/B test created')
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎯</div>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Funnel Tracker</h1>
            <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Rabt Naturals · Website → WhatsApp → Consultation → Purchase journey</p>
          </div>
        </div>
      </div>

      {/* ── Section 1: Main Funnel ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Conversion Funnel</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {FUNNEL_STEPS.map((s, i) => (
            <div key={i} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {i > 0 && s.drop !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 1, height: 12, background: s.health === 'bad' ? C.red : C.border }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.health === 'bad' ? C.red : s.health === 'warn' ? C.orange : C.mu }}>
                    ▼ {s.drop}% drop-off
                  </span>
                </div>
              )}
              <div style={{ width: `${s.widthPct}%`, minWidth: '40%', background: healthColor(s.health) + '12', border: `1.5px solid ${healthColor(s.health)}30`, borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'width 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: C.mu, minWidth: 18 }}>{s.step}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: C.dark }}>{s.count.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: healthColor(s.health) + '15', color: healthColor(s.health) }}>{s.pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 24 }}>
          {[
            { label: 'Overall Conversion', value: '3.5%', color: C.teal },
            { label: 'WhatsApp Click Rate', value: '30%', color: C.orange },
            { label: 'Revenue per Visitor', value: '₹49', color: C.green },
          ].map((k, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '14px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: C.mu, marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Drop-off Analysis ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Drop-off Analysis</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {DROPOFFS.map((d, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${d.urgency === 'high' ? C.red : C.orange}30`, borderRadius: 14, padding: 20, borderLeft: `4px solid ${d.urgency === 'high' ? C.red : C.orange}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: d.urgency === 'high' ? C.red : C.orange }}>{d.drop}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{d.from} → {d.to} drop-off</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: d.urgency === 'high' ? C.red + '15' : C.orange + '15', color: d.urgency === 'high' ? C.red : C.orange, textTransform: 'uppercase' }}>{d.urgency}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.mu, marginBottom: 8 }}>
                    <strong style={{ color: C.dark }}>Fix:</strong> {d.fix}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Estimated impact: {d.impact}</div>
                </div>
                <button onClick={() => toast.success(`Opening fix for ${d.from} → ${d.to}`)} style={{ padding: '10px 18px', background: d.urgency === 'high' ? C.red : C.orange, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}>
                  Fix This →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Channel Attribution ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Channel Attribution</div>
          <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>Where your sales and traffic come from</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Channel', 'Visitors', 'Conversions', 'Conv. Rate', 'Revenue', 'Cost', 'ROI'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((ch, i) => {
                const roiVal = roi(ch.revenue, ch.cost)
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: [C.green, C.teal, C.purple, C.gold, C.blue][i] }} />
                        {ch.channel}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{ch.visitors.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{ch.conversions}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{convRate(ch.conversions, ch.visitors)}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: C.dark }}>{fmt(ch.revenue)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: ch.cost === 0 ? C.green : C.mu }}>{ch.cost === 0 ? 'Free' : fmt(ch.cost)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: roiVal === '∞' || parseInt(roiVal) > 100 ? C.green : C.orange }}>{roiVal === '∞' ? '∞ (organic)' : roiVal}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 4: A/B Tests ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>A/B Tests</div>
            <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>{abTests.filter(t => t.status === 'running').length} running · {abTests.filter(t => t.status === 'complete').length} complete</div>
          </div>
          <button onClick={() => setShowNewTest(true)} style={{ padding: '9px 18px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Create New Test
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Test Name', 'Variant A', 'Variant B', 'Traffic Split', 'Result / Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {abTests.map((t, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700 }}>{t.test}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.mu }}>{t.varA}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.mu }}>{t.varB}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', width: 80, height: 18 }}>
                      <div style={{ flex: 1, background: C.teal + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.teal }}>50%</span>
                      </div>
                      <div style={{ flex: 1, background: C.gold + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.gold }}>50%</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.status === 'complete' ? C.green : C.blue }}>
                      {t.status === 'complete' ? '✅ ' : '🔵 '}{t.winner}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Test Modal */}
      {showNewTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 460, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 20, color: C.dark }}>Create New A/B Test</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Test Name</label>
              <input value={newTest.name} onChange={e => setNewTest(n => ({ ...n, name: e.target.value }))} placeholder="e.g. WhatsApp CTA Text" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Variant A (Control)</label>
              <input value={newTest.varA} onChange={e => setNewTest(n => ({ ...n, varA: e.target.value }))} placeholder="e.g. Original design" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Variant B (Test)</label>
              <input value={newTest.varB} onChange={e => setNewTest(n => ({ ...n, varB: e.target.value }))} placeholder="e.g. New design with hero image" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewTest(false)} style={{ padding: '10px 22px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={createTest} style={{ padding: '10px 22px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Create Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
