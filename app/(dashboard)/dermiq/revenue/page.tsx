'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const REVENUE_DAYS = [
  { day: 'Mon', val: 18000, pct: 51 },
  { day: 'Tue', val: 22000, pct: 63 },
  { day: 'Wed', val: 19000, pct: 54 },
  { day: 'Thu', val: 31000, pct: 89 },
  { day: 'Fri', val: 28000, pct: 80 },
  { day: 'Sat', val: 24000, pct: 69 },
  { day: 'Sun', val: 35000, pct: 100 },
]

const PAYMENT_METHODS = [
  { label: 'UPI', pct: 48, color: C.purple },
  { label: 'Card', pct: 28, color: C.blue },
  { label: 'Net Banking', pct: 14, color: C.teal },
  { label: 'COD', pct: 10, color: C.gold },
]

const INITIAL_COMMISSIONS = [
  { category: 'Skincare', default: 15, override: '' },
  { category: 'Haircare', default: 15, override: '' },
  { category: 'Supplements', default: 18, override: '' },
  { category: 'Baby Care', default: 10, override: '' },
  { category: 'Color Cosmetics', default: 20, override: '' },
  { category: 'Consultations', default: 25, override: '' },
]

const PAYOUTS = [
  { vendor: 'Minimalist', amount: 18400, period: 'Mar 1–15', bank: 'HDFC ••••4521', status: 'Pending' },
  { vendor: 'GlowMart', amount: 4200, period: 'Mar 1–15', bank: 'ICICI ••••8832', status: 'On Hold' },
  { vendor: 'DermIQ Own', amount: 42000, period: 'Mar 1–15', bank: 'SBI ••••1234', status: 'Auto' },
]

function fmt(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}

const KpiCard = ({ label, value, sub, color = C.teal }: any) => (
  <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{sub}</div>}
  </div>
)

export default function RevenuePage() {
  const [commissions, setCommissions] = useState(INITIAL_COMMISSIONS)
  const [payouts, setPayouts] = useState(PAYOUTS)
  const [confirmModal, setConfirmModal] = useState(false)

  function updateOverride(idx: number, val: string) {
    setCommissions(c => c.map((r, i) => i === idx ? { ...r, override: val } : r))
  }

  function applyCommissions() {
    toast.success('Commission rates updated successfully')
  }

  function approvePayout(vendor: string) {
    setPayouts(p => p.map(r => r.vendor === vendor ? { ...r, status: 'Approved' } : r))
    toast.success(`Payout approved for ${vendor}`)
  }

  function holdPayout(vendor: string) {
    setPayouts(p => p.map(r => r.vendor === vendor ? { ...r, status: 'On Hold' } : r))
    toast.success(`Payout held for ${vendor}`)
  }

  function processAll() {
    setConfirmModal(false)
    setPayouts(p => p.map(r => r.status === 'Approved' ? { ...r, status: 'Processed' } : r))
    toast.success('All approved payouts processed')
  }

  const statusColor = (s: string) => s === 'Processed' || s === 'Approved' ? C.green : s === 'Pending' ? C.gold : s === 'On Hold' ? C.red : C.teal

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Revenue Control Center</h1>
            <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Live money flow · Commission management · Vendor payouts</p>
          </div>
        </div>
      </div>

      {/* ── Money Flow Visualization ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Live Money Flow</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {/* User Payment */}
          <FlowNode label="User Payment" value="₹8,24,500" color={C.blue} icon="👤" />
          <Arrow />
          {/* Platform */}
          <FlowNode label="Platform (DermIQ)" value="Processing" color={C.teal} icon="⚗️" />
          <Arrow />
          {/* Split */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FlowNode label="Commission" value="15%" color={C.gold} icon="📊" small />
            <FlowNode label="Vendor Share" value="85%" color={C.teal2} icon="🏪" small />
          </div>
          <Arrow />
          {/* Outputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FlowNode label="Platform Revenue" value="₹1,23,675" color={C.green} icon="💹" small />
            <FlowNode label="Vendor Payouts" value="₹7,00,825" color={C.purple} icon="💸" small />
          </div>
        </div>
      </div>

      {/* ── Section 1: Revenue KPIs ── */}
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Revenue Overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 14, marginBottom: 28 }}>
        <KpiCard label="Gross Revenue (GMV)" value="₹8,24,500" color={C.dark} />
        <KpiCard label="Platform Commission" value="₹1,23,675" sub="15% of GMV" color={C.gold} />
        <KpiCard label="Net Vendor Payouts" value="₹7,00,825" sub="85% of GMV" color={C.teal} />
        <KpiCard label="Pending Payouts" value="₹48,200" sub="Awaiting approval" color={C.orange} />
        <KpiCard label="Avg Order Value" value="₹649" sub="Up 4% vs last month" color={C.blue} />
        <KpiCard label="Refunds" value="₹12,400" sub="1.5% of revenue" color={C.red} />
      </div>

      {/* ── Section 2: Commission Management ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Commission Management</div>
            <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>Set per-category commission rates</div>
          </div>
          <button onClick={applyCommissions} style={{ padding: '9px 20px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Apply Changes</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Category', 'Default Rate', 'Override (%)', 'Effective Rate'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.map((r, i) => {
                const effective = r.override ? parseInt(r.override) : r.default
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>{r.category}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: C.mu }}>{r.default}%</td>
                    <td style={{ padding: '12px 20px' }}>
                      <input type="number" value={r.override} onChange={e => updateOverride(i, e.target.value)} placeholder={`${r.default}`} min={0} max={100}
                        style={{ width: 80, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif', background: C.bg, textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: r.override ? C.orange : C.green }}>{effective}%{r.override ? ' (overridden)' : ''}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Payout Queue ── */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Payout Queue</div>
            <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>Pending vendor payouts for Mar 1–15</div>
          </div>
          <button onClick={() => setConfirmModal(true)} style={{ padding: '9px 18px', background: C.green + '15', color: C.green, border: `1px solid ${C.green}30`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Process All Approved
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Vendor', 'Amount', 'Period', 'Bank', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700 }}>{p.vendor}</td>
                  <td style={{ padding: '13px 18px', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: C.dark }}>₹{p.amount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: C.mu }}>{p.period}</td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: C.mu, fontFamily: 'monospace' }}>{p.bank}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusColor(p.status) + '15', color: statusColor(p.status) }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.status === 'Pending' && (
                        <>
                          <Btn color={C.green} onClick={() => approvePayout(p.vendor)}>Approve</Btn>
                          <Btn color={C.red} onClick={() => holdPayout(p.vendor)}>Hold</Btn>
                        </>
                      )}
                      {p.status === 'On Hold' && (
                        <>
                          <Btn color={C.blue} onClick={() => toast.success('Opening review')}>Review</Btn>
                          <Btn color={C.green} onClick={() => approvePayout(p.vendor)}>Release</Btn>
                        </>
                      )}
                      {(p.status === 'Auto' || p.status === 'Approved' || p.status === 'Processed') && (
                        <Btn color={C.teal} onClick={() => toast.success('Viewing payout details')}>View</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 4: Revenue Trend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Bar chart */}
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>7-Day Revenue Trend</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>Total: ₹1.77L this week</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
            {REVENUE_DAYS.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.teal }}>{fmt(d.val)}</div>
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: `linear-gradient(180deg,${C.teal},${C.teal2}88)`, height: `${d.pct}%`, minHeight: 6 }} />
                <div style={{ fontSize: 11, color: C.mu }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 22 }}>Payment Methods</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PAYMENT_METHODS.map((m, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13 }}>{m.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ width: `${m.pct}%`, height: '100%', background: m.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Process Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>💸</div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>Process All Approved Payouts</h2>
            <p style={{ fontSize: 13, color: C.mu, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              This will initiate bank transfers for all approved payouts. Total amount: <strong style={{ color: C.dark }}>₹{payouts.filter(p => p.status === 'Approved' || p.status === 'Pending').reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}</strong>. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmModal(false)} style={{ padding: '10px 24px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={processAll} style={{ padding: '10px 24px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Confirm & Process</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FlowNode({ label, value, color, icon, small = false }: any) {
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}30`, borderRadius: 14, padding: small ? '10px 14px' : '14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: small ? 120 : 140, boxShadow: `0 2px 10px ${color}15` }}>
      <div style={{ fontSize: small ? 18 : 22 }}>{icon}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: small ? 14 : 16, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
      <div style={{ height: 2, width: 30, background: '#E5E7EB' }} />
      <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid #E5E7EB` }} />
    </div>
  )
}

function Btn({ children, color = '#2D5F5A', onClick }: any) {
  return (
    <button onClick={onClick} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: color + '15', color, border: `1px solid ${color}30`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}
