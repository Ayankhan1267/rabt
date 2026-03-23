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

const FLAGGED_PRODUCTS = [
  { id: 1, name: 'XYZ Miracle Cream', vendor: 'FakeVendorCo', issue: 'No ingredient list', severity: 'High' },
  { id: 2, name: 'Ultra Whitening Serum', vendor: 'GlowMart', issue: 'Contains restricted ingredient (Mercury)', severity: 'Critical' },
  { id: 3, name: 'Anti-aging Oil', vendor: 'NaturalCo', issue: 'Misleading claims ("removes wrinkles in 24hr")', severity: 'Medium' },
]

const VENDOR_SCORES = [
  { name: 'Minimalist', products: 12, orders: 450, returns: '2%', complaints: 1, score: 96, status: 'Excellent' },
  { name: 'GlowMart', products: 8, orders: 120, returns: '8%', complaints: 5, score: 61, status: 'Warning' },
  { name: 'FakeVendorCo', products: 3, orders: 12, returns: '45%', complaints: 8, score: 22, status: 'Suspended' },
  { name: 'NaturalCo', products: 6, orders: 89, returns: '4%', complaints: 2, score: 78, status: 'Good' },
  { name: 'DermIQ Own', products: 15, orders: 890, returns: '1%', complaints: 0, score: 99, status: 'Excellent' },
]

const FLAGGED_REVIEWS = [
  { id: 1, text: '"Amazing product!!"', stars: 5, note: 'Posted 50 times', reason: 'Suspected bot' },
  { id: 2, text: '"Worst product ever"', stars: 1, note: 'New account, 0 other reviews', reason: 'Suspected fake negative' },
  { id: 3, text: '"Buy from www.fakeshop.com"', stars: 1, note: 'Contains external link', reason: 'Spam' },
  { id: 4, text: '"Great ✓ ✓ ✓"', stars: 5, note: 'Duplicate content', reason: 'Duplicate' },
]

const COMPLAINTS = [
  { id: 'CPL-001', customer: 'Priya S.', category: 'Product quality', vendor: 'GlowMart', status: 'Open', assignedTo: 'Riya' },
  { id: 'CPL-002', customer: 'Aman K.', category: 'Delivery issues', vendor: 'NaturalCo', status: 'In Review', assignedTo: 'Dev' },
  { id: 'CPL-003', customer: 'Neha R.', category: 'Wrong item', vendor: 'Minimalist', status: 'Resolved', assignedTo: 'Priya' },
  { id: 'CPL-004', customer: 'Rahul M.', category: 'Consultation issue', vendor: 'DermIQ Own', status: 'Escalated', assignedTo: 'Unassigned' },
  { id: 'CPL-005', customer: 'Zara T.', category: 'Other', vendor: 'FakeVendorCo', status: 'Open', assignedTo: 'Dev' },
]

const COMPLAINT_CATS = [
  { label: 'Product quality', pct: 34, color: C.red },
  { label: 'Delivery issues', pct: 28, color: C.orange },
  { label: 'Wrong item', pct: 18, color: C.gold },
  { label: 'Consultation issue', pct: 12, color: C.purple },
  { label: 'Other', pct: 8, color: C.mu },
]

const severityColor = (s: string) => s === 'Critical' ? C.red : s === 'High' ? C.orange : s === 'Medium' ? C.gold : C.mu
const scoreColor = (n: number) => n >= 80 ? C.green : n >= 50 ? C.gold : C.red
const statusEmoji = (s: string) => s === 'Excellent' || s === 'Good' ? '✅' : s === 'Warning' ? '⚠️' : '🚫'
const statusColor = (s: string) => s === 'Excellent' || s === 'Good' ? C.green : s === 'Warning' ? C.gold : C.red

const Btn = ({ children, color = C.teal, onClick }: any) => (
  <button onClick={onClick} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: color + '15', color, border: `1px solid ${color}30`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
    {children}
  </button>
)

export default function QualityPage() {
  const [tab, setTab] = useState(0)
  const [scanSettings, setScanSettings] = useState({ autoScan: true, restricted: true, misleading: true, imageAuth: false })
  const [restrictedList, setRestrictedList] = useState('Mercury\nHydroquinone >2%\nLead acetate\nFormaldehyde')
  const [suspendModal, setSuspendModal] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [flagged, setFlagged] = useState(FLAGGED_PRODUCTS.map(p => ({ ...p, dismissed: false })))
  const [reviews, setReviews] = useState(FLAGGED_REVIEWS.map(r => ({ ...r, removed: false })))

  const now = new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })

  const tabs = ['Product Quality', 'Vendor Quality', 'Review Quality', 'Complaint Center']

  function dismissProduct(id: number) {
    setFlagged(f => f.map(p => p.id === id ? { ...p, dismissed: true } : p))
    toast.success('Product flag cleared')
  }

  function removeReview(id: number) {
    setReviews(r => r.map(v => v.id === id ? { ...v, removed: true } : v))
    toast.success('Review removed')
  }

  function saveScanSettings() {
    toast.success('Scan settings saved')
  }

  function handleSuspend() {
    if (!suspendReason && !customReason) { toast.error('Please select a reason'); return }
    toast.success(`Vendor suspended: ${suspendModal}`)
    setSuspendModal(null)
    setSuspendReason('')
    setCustomReason('')
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛡️</div>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Quality Control</h1>
            <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Last scan: {now} · Auto-scan active</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '9px 18px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === i ? 700 : 500,
            color: tab === i ? C.teal : C.mu, background: 'none', border: 'none', borderBottom: tab === i ? `2px solid ${C.teal}` : '2px solid transparent',
            cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </div>

      {/* ── Tab 1: Product Quality ── */}
      {tab === 0 && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Auto-Scan Results</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: C.red + '15', color: C.red }}>{flagged.filter(p => !p.dismissed).length} Flagged</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Product', 'Vendor', 'Issue', 'Severity', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flagged.map(p => (
                    <tr key={p.id} style={{ borderTop: `1px solid ${C.border}`, opacity: p.dismissed ? 0.4 : 1 }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{p.vendor}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>{p.issue}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: severityColor(p.severity) + '15', color: severityColor(p.severity) }}>{p.severity}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {!p.dismissed && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {p.severity === 'Critical' ? (
                              <>
                                <Btn color={C.red} onClick={() => { dismissProduct(p.id); toast.success('Product removed') }}>Remove</Btn>
                                <Btn color={C.orange} onClick={() => toast.success('Vendor warned')}>Warn Vendor</Btn>
                                <Btn color={C.purple} onClick={() => toast.success('Reported to authority')}>Report</Btn>
                              </>
                            ) : p.severity === 'High' ? (
                              <>
                                <Btn color={C.red} onClick={() => { dismissProduct(p.id); toast.success('Vendor suspended') }}>Suspend</Btn>
                                <Btn color={C.blue} onClick={() => toast.success('Info requested')}>Request Info</Btn>
                                <Btn color={C.green} onClick={() => dismissProduct(p.id)}>Clear</Btn>
                              </>
                            ) : (
                              <>
                                <Btn color={C.blue} onClick={() => toast.success('Redirected to edit listing')}>Edit Listing</Btn>
                                <Btn color={C.orange} onClick={() => toast.success('Vendor warned')}>Warn</Btn>
                                <Btn color={C.green} onClick={() => dismissProduct(p.id)}>Clear</Btn>
                              </>
                            )}
                          </div>
                        )}
                        {p.dismissed && <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Resolved</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scan Settings */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Scan Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 }}>
              {([
                ['autoScan', 'Auto-scan new listings before approval'],
                ['restricted', 'Check restricted ingredients list'],
                ['misleading', 'Detect misleading claims'],
                ['imageAuth', 'Verify image authenticity'],
              ] as [keyof typeof scanSettings, string][]).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg }}>
                  <span style={{ fontSize: 13 }}>{label}</span>
                  <div onClick={() => setScanSettings(s => ({ ...s, [key]: !s[key] }))} style={{
                    width: 40, height: 22, borderRadius: 20, cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    background: scanSettings[key] ? `linear-gradient(90deg,${C.teal},${C.teal2})` : '#E5E7EB',
                  }}>
                    <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, left: scanSettings[key] ? 21 : 3, transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Restricted Ingredients List</label>
              <textarea
                value={restrictedList}
                onChange={e => setRestrictedList(e.target.value)}
                rows={5}
                style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'vertical', background: C.bg }}
              />
            </div>
            <button onClick={saveScanSettings} style={{ padding: '10px 24px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Vendor Quality ── */}
      {tab === 1 && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Vendor Health Scores</div>
              <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>Based on returns, complaints, and order volume</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Vendor', 'Products', 'Orders', 'Returns', 'Complaints', 'Score', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VENDOR_SCORES.map((v, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '13px 14px', fontWeight: 700, fontSize: 13 }}>{v.name}</td>
                      <td style={{ padding: '13px 14px', fontSize: 13, color: C.mu }}>{v.products}</td>
                      <td style={{ padding: '13px 14px', fontSize: 13, color: C.mu }}>{v.orders}</td>
                      <td style={{ padding: '13px 14px', fontSize: 13, color: parseFloat(v.returns) > 10 ? C.red : C.mu }}>{v.returns}</td>
                      <td style={{ padding: '13px 14px', fontSize: 13, color: v.complaints > 3 ? C.red : C.mu }}>{v.complaints}</td>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 48, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                            <div style={{ width: `${v.score}%`, height: '100%', background: scoreColor(v.score), borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: scoreColor(v.score) }}>{v.score}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: statusColor(v.status) }}>{statusEmoji(v.status)} {v.status}</span>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <Btn color={C.blue} onClick={() => toast.success(`Viewing ${v.name} details`)}>View</Btn>
                          <Btn color={C.gold} onClick={() => toast.success(`Warning sent to ${v.name}`)}>Warn</Btn>
                          <Btn color={C.red} onClick={() => setSuspendModal(v.name)}>Suspend</Btn>
                          <Btn color={C.red} onClick={() => toast.success(`${v.name} removed`)}>Remove</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Review Quality ── */}
      {tab === 2 && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
            {[
              { label: 'Total Reviews', value: '4,832', color: C.teal },
              { label: 'Verified Purchases', value: '92%', color: C.green },
              { label: 'Flagged', value: '12', color: C.red },
              { label: 'Removed This Month', value: '3', color: C.orange },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Flagged Reviews</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {reviews.map((r, i) => (
                <div key={r.id} style={{ padding: '16px 20px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 16, opacity: r.removed ? 0.4 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontStyle: 'italic', marginBottom: 4 }}>{r.text}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                      <span style={{ fontSize: 11, color: C.mu }}>·</span>
                      <span style={{ fontSize: 11, color: C.mu }}>{r.note}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: C.orange + '15', color: C.orange, whiteSpace: 'nowrap' }}>{r.reason}</span>
                  {!r.removed ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.reason === 'Suspected bot' ? (
                        <>
                          <Btn color={C.red} onClick={() => removeReview(r.id)}>Remove All</Btn>
                          <Btn color={C.purple} onClick={() => toast.success('Investigation started')}>Investigate</Btn>
                        </>
                      ) : r.reason === 'Spam' ? (
                        <Btn color={C.red} onClick={() => removeReview(r.id)}>Remove</Btn>
                      ) : (
                        <>
                          <Btn color={C.red} onClick={() => removeReview(r.id)}>Remove</Btn>
                          <Btn color={C.green} onClick={() => toast.success('Review kept')}>Keep</Btn>
                        </>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Removed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Complaint Center ── */}
      {tab === 3 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, marginBottom: 22 }}>
            {/* Donut-style distribution */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Complaint Categories</div>
              {COMPLAINT_CATS.map((c, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12 }}>{c.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                    <div style={{ width: `${c.pct}%`, height: '100%', background: c.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Donut visual */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <svg viewBox="0 0 160 160" style={{ width: 160, height: 160, transform: 'rotate(-90deg)' }}>
                  {(() => {
                    let offset = 0
                    const r = 60, circ = 2 * Math.PI * r
                    return COMPLAINT_CATS.map((c, i) => {
                      const dash = (c.pct / 100) * circ
                      const el = (
                        <circle key={i} cx="80" cy="80" r={r}
                          fill="none" stroke={c.color} strokeWidth="22"
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeDashoffset={-offset * circ / 100}
                        />
                      )
                      offset += c.pct
                      return el
                    })
                  })()}
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: C.dark }}>156</div>
                  <div style={{ fontSize: 10, color: C.mu }}>Total</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {COMPLAINT_CATS.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12 }}>{c.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.color, marginLeft: 'auto', paddingLeft: 12 }}>{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Complaints Table */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Complaints Queue</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['ID', 'Customer', 'Category', 'Vendor', 'Status', 'Assigned To', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPLAINTS.map((c, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px 14px', fontSize: 12, fontFamily: 'monospace', color: C.mu }}>{c.id}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{c.customer}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: C.mu }}>{c.category}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: C.mu }}>{c.vendor}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: c.status === 'Resolved' ? C.green + '15' : c.status === 'Escalated' ? C.red + '15' : C.gold + '15', color: c.status === 'Resolved' ? C.green : c.status === 'Escalated' ? C.red : C.gold }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: C.mu }}>{c.assignedTo}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn color={C.green} onClick={() => toast.success('Complaint resolved')}>Resolve</Btn>
                          <Btn color={C.red} onClick={() => toast.success('Complaint escalated')}>Escalate</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.dark }}>Suspend Vendor</h2>
            <p style={{ fontSize: 13, color: C.mu, marginBottom: 20 }}>You are about to suspend <strong>{suspendModal}</strong>. This will hide all their listings.</p>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Reason</label>
            <select value={suspendReason} onChange={e => setSuspendReason(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, marginBottom: 14, fontFamily: 'DM Sans, sans-serif' }}>
              <option value="">Select reason...</option>
              <option value="policy">Policy violation</option>
              <option value="quality">Poor product quality</option>
              <option value="fraud">Suspected fraud</option>
              <option value="complaints">Excessive complaints</option>
              <option value="restricted">Restricted ingredients</option>
            </select>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Additional Notes</label>
            <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} rows={3} placeholder="Enter custom reason..." style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, marginBottom: 20, fontFamily: 'DM Sans, sans-serif', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSuspendModal(null)} style={{ padding: '10px 22px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={handleSuspend} style={{ padding: '10px 22px', background: C.red, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Confirm Suspension</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
