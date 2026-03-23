'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', dark: '#1A2E2B', border: '#E5E7EB', bg: '#FAFAF8',
  green: '#10B981', red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6',
  blue: '#3B82F6', orange: '#F59E0B',
}

type Tab = 'customers' | 'campaigns' | 'sequences' | 'analytics'
type RiskLevel = 'critical' | 'high' | 'medium'

interface AtRiskCustomer {
  id: string; name: string; phone: string; email?: string
  lastPurchase: string; daysSince: number; totalOrders: number
  totalSpent: number; riskLevel: RiskLevel; topProducts: string[]
  selected?: boolean
}

const DEMO_CUSTOMERS: AtRiskCustomer[] = [
  { id: '1', name: 'Divya Mehta', phone: '+91 98765 43210', lastPurchase: '2025-12-15', daysSince: 99, totalOrders: 5, totalSpent: 4250, riskLevel: 'critical', topProducts: ['Glow Serum', 'Vitamin C'] },
  { id: '2', name: 'Sunita Rao', phone: '+91 87654 32109', lastPurchase: '2026-01-20', daysSince: 63, totalOrders: 3, totalSpent: 2100, riskLevel: 'high', topProducts: ['Hydrating Cream'] },
  { id: '3', name: 'Kavita Joshi', phone: '+91 76543 21098', lastPurchase: '2026-02-01', daysSince: 51, totalOrders: 8, totalSpent: 6800, riskLevel: 'high', topProducts: ['Retinol Night Cream', 'Glow Serum'] },
  { id: '4', name: 'Pooja Singh', phone: '+91 65432 10987', lastPurchase: '2026-02-15', daysSince: 37, totalOrders: 2, totalSpent: 1400, riskLevel: 'medium', topProducts: ['Niacinamide Toner'] },
  { id: '5', name: 'Anita Sharma', phone: '+91 54321 09876', lastPurchase: '2025-11-30', daysSince: 114, totalOrders: 12, totalSpent: 9600, riskLevel: 'critical', topProducts: ['Collagen Booster', 'Retinol Night Cream'] },
  { id: '6', name: 'Rekha Verma', phone: '+91 43210 98765', lastPurchase: '2026-02-20', daysSince: 32, totalOrders: 1, totalSpent: 899, riskLevel: 'medium', topProducts: ['SPF 50 Sunscreen'] },
]

const RISK_COLOR: Record<RiskLevel, string> = { critical: C.red, high: C.orange, medium: C.gold }
const RISK_BG: Record<RiskLevel, string> = { critical: '#FEF2F2', high: '#FFF7ED', medium: '#FFFBEB' }

export default function RetentionAgentPage() {
  const [tab, setTab] = useState<Tab>('customers')
  const [customers, setCustomers] = useState<AtRiskCustomer[]>(DEMO_CUSTOMERS)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [dataSource, setDataSource] = useState<'demo' | 'live'>('demo')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generatingMsg, setGeneratingMsg] = useState<string | null>(null)
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, string>>({})
  const [sendingBulk, setSendingBulk] = useState(false)
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [autoRetention, setAutoRetention] = useState(false)

  useEffect(() => { loadRealCustomers() }, [])

  async function loadRealCustomers() {
    setLoadingCustomers(true)
    try {
      const res = await fetch('/api/retention/customers')
      if (res.ok) {
        const d = await res.json()
        if (d.customers && d.customers.length > 0) {
          setCustomers(d.customers)
          setDataSource('live')
          toast.success(`${d.customers.length} at-risk customers loaded from MongoDB`)
        }
        // If 0 results or error, keep demo data
      }
    } catch { /* keep demo data */ }
    setLoadingCustomers(false)
  }

  const filtered = customers.filter(c => filterRisk === 'all' || c.riskLevel === filterRisk)
  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))

  function toggleSelect(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  async function generateMessage(customer: AtRiskCustomer) {
    setGeneratingMsg(customer.id)
    try {
      const res = await fetch('/api/retention/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer }),
      })
      if (res.ok) {
        const d = await res.json()
        setGeneratedMessages(prev => ({ ...prev, [customer.id]: d.message }))
      }
    } catch { toast.error('Failed to generate message') }
    setGeneratingMsg(null)
  }

  async function sendBulkCampaign() {
    if (selected.size === 0) return toast.error('Select customers first')
    setSendingBulk(true)
    const selectedCustomers = customers.filter(c => selected.has(c.id))
    try {
      const res = await fetch('/api/retention/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: selectedCustomers, messages: generatedMessages }),
      })
      if (res.ok) {
        toast.success(`Win-back campaign sent to ${selected.size} customers!`)
        setSelected(new Set())
      }
    } catch { toast.error('Bulk send failed') }
    setSendingBulk(false)
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'customers', label: 'At-Risk Customers', icon: '⚠️' },
    { id: 'campaigns', label: 'Win-back Campaigns', icon: '📢' },
    { id: 'sequences', label: 'Auto Sequences', icon: '🔄' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ]

  const stats = {
    critical: customers.filter(c => c.riskLevel === 'critical').length,
    high: customers.filter(c => c.riskLevel === 'high').length,
    medium: customers.filter(c => c.riskLevel === 'medium').length,
    lostRevenue: customers.reduce((s, c) => s + c.totalSpent * 0.3, 0),
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔁</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.dark }}>Retention Agent</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>AI identifies churning customers aur personalized win-back campaigns bhejta hai</p>
          </div>
          <span style={{ background: C.orange, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>AI</span>
          <span style={{ background: dataSource === 'live' ? '#D1FAE5' : '#FEF3C7', color: dataSource === 'live' ? C.green : C.gold, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
            {loadingCustomers ? 'Loading...' : dataSource === 'live' ? '🟢 Live Data' : '🟡 Demo Data'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadRealCustomers} disabled={loadingCustomers} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', color: '#6B7280' }}>
            🔄 Refresh
          </button>
          {selected.size > 0 && (
            <button onClick={sendBulkCampaign} disabled={sendingBulk} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              {sendingBulk ? 'Sending...' : `📱 Send to ${selected.size} customers`}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Critical (90+ days)', value: stats.critical, icon: '🚨', color: C.red, sub: 'Immediate attention' },
          { label: 'High Risk (60+ days)', value: stats.high, icon: '⚠️', color: C.orange, sub: 'Win-back needed' },
          { label: 'Medium (30+ days)', value: stats.medium, icon: '💛', color: C.gold, sub: 'Re-engage soon' },
          { label: 'At-Risk Revenue', value: `₹${Math.round(stats.lostRevenue).toLocaleString()}`, icon: '💸', color: C.purple, sub: 'Recoverable' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.id ? C.orange : 'transparent', color: tab === t.id ? '#fff' : '#6B7280' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* AT-RISK CUSTOMERS */}
      {tab === 'customers' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {['all', 'critical', 'high', 'medium'].map(r => (
              <button key={r} onClick={() => setFilterRisk(r)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${filterRisk === r ? C.orange : C.border}`, background: filterRisk === r ? C.orange : '#fff', color: filterRisk === r ? '#fff' : '#6B7280', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                {r === 'all' ? 'All' : r}
              </button>
            ))}
            <button onClick={toggleAll} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', color: '#6B7280', cursor: 'pointer', fontSize: 13 }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(c => (
              <div key={c.id} style={{ background: '#fff', border: `1px solid ${selected.has(c.id) ? C.orange : C.border}`, borderRadius: 12, padding: 20, borderLeft: `4px solid ${RISK_COLOR[c.riskLevel]}`, transition: 'border 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ marginTop: 4, cursor: 'pointer', width: 16, height: 16 }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{c.name}</div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>{c.phone} · {c.totalOrders} orders · ₹{c.totalSpent.toLocaleString()} spent</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: RISK_BG[c.riskLevel], color: RISK_COLOR[c.riskLevel], fontWeight: 700 }}>{c.riskLevel.toUpperCase()}</span>
                        <span style={{ fontSize: 12, color: RISK_COLOR[c.riskLevel], fontWeight: 600 }}>{c.daysSince} days ago</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
                      Top products: {c.topProducts.join(', ')} · Last purchase: {c.lastPurchase}
                    </div>

                    {generatedMessages[c.id] ? (
                      <div style={{ background: '#F0FFF4', border: '1px solid #D1FAE5', borderRadius: 8, padding: 12, fontSize: 13, color: C.dark, marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', marginBottom: 6 }}>📱 WhatsApp Message Ready</div>
                        {generatedMessages[c.id]}
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => generateMessage(c)} disabled={generatingMsg === c.id} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.teal}`, background: 'transparent', color: C.teal, cursor: 'pointer', fontWeight: 600 }}>
                        {generatingMsg === c.id ? '🧠 Generating...' : '🧠 AI Generate Message'}
                      </button>
                      {generatedMessages[c.id] && (
                        <button onClick={async () => {
                          try {
                            await fetch('/api/send-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: c.phone, message: generatedMessages[c.id] }) })
                            toast.success(`Sent to ${c.name}!`)
                          } catch { toast.error('Send failed') }
                        }} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                          📱 Send WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WIN-BACK CAMPAIGNS */}
      {tab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { name: '30-Day Re-engage', icon: '💛', tag: 'Medium Risk', desc: 'Soft reminder with personalized product suggestion + 5% discount', stats: '34% open rate', color: C.gold },
            { name: '60-Day Win-back', icon: '🧡', tag: 'High Risk', desc: 'Strong value message + 10% off + free consultation offer', stats: '28% conversion', color: C.orange },
            { name: '90-Day Last Chance', icon: '❤️', tag: 'Critical', desc: 'Maximum value offer — 15% off + free product sample + call', stats: '18% win-back', color: C.red },
            { name: 'VIP Loyalty Reward', icon: '👑', tag: 'High Spenders', desc: '₹500+ spent — exclusive early access + loyalty points + gift', stats: '52% response', color: C.purple },
            { name: 'Birthday Special', icon: '🎂', tag: 'All Users', desc: 'Birthday month discount 20% + personalized skin report', stats: '61% open rate', color: C.teal },
            { name: 'Seasonal Comeback', icon: '🌸', tag: 'Seasonal', desc: 'Season-specific skin tips + matched product bundle', stats: '41% click rate', color: C.blue },
          ].map((camp, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `3px solid ${camp.color}` }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{camp.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.dark, marginBottom: 4 }}>{camp.name}</div>
              <span style={{ fontSize: 11, background: '#F3F4F6', padding: '2px 8px', borderRadius: 10, color: '#6B7280', fontWeight: 600 }}>{camp.tag}</span>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '10px 0' }}>{camp.desc}</p>
              <div style={{ fontSize: 12, fontWeight: 700, color: camp.color, marginBottom: 12 }}>📊 {camp.stats}</div>
              <button onClick={() => toast.success(`Campaign launched: ${camp.name}`)} style={{ width: '100%', background: camp.color, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Launch Campaign
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AUTO SEQUENCES */}
      {tab === 'sequences' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>🔄 Auto Retention Sequences</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>AI automatically identifies and re-engages at-risk customers</p>
              </div>
              <div onClick={() => setAutoRetention(!autoRetention)} style={{ width: 52, height: 28, borderRadius: 14, background: autoRetention ? C.green : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: autoRetention ? 26 : 2, transition: 'left 0.2s' }} />
              </div>
            </div>
            {[
              { day: 'Day 30', action: 'Soft check-in: "Skin kaisi hai? Routine chal raha hai?"', msg: 'Personalized + product reorder link', status: autoRetention },
              { day: 'Day 60', action: '10% Win-back discount + free consultation offer', msg: 'Strong value message + CTA button', status: autoRetention },
              { day: 'Day 90', action: 'Final attempt: 15% off + specialist call', msg: 'Maximum offer + urgency', status: autoRetention },
              { day: 'Day 120', action: 'Move to "Lost Customer" — stop messaging', msg: 'Archive + note for future reactivation', status: false },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: i < 3 ? `1px solid #F3F4F6` : 'none' }}>
                <div style={{ width: 60, fontWeight: 700, fontSize: 13, color: s.status ? C.orange : '#9CA3AF', flexShrink: 0 }}>{s.day}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 3 }}>{s.action}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.msg}</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: s.status ? '#D1FAE5' : '#F3F4F6', color: s.status ? C.green : '#9CA3AF', fontWeight: 600, height: 'fit-content' }}>
                  {s.status ? 'Active' : 'Off'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>📈 Win-back Performance</h3>
            {[
              { label: 'Customers Messaged', value: '142', color: C.blue },
              { label: 'Responded', value: '67 (47%)', color: C.teal },
              { label: 'Re-purchased', value: '28 (20%)', color: C.green },
              { label: 'Revenue Recovered', value: '₹42,600', color: C.gold },
              { label: 'Avg Recovery per Customer', value: '₹1,521', color: C.purple },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 4 ? `1px solid #F3F4F6` : 'none' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{s.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>🎯 Best Win-back Messages</h3>
            {[
              { type: 'Personalized product mention', rate: '58%' },
              { type: 'Free consultation offer', rate: '51%' },
              { type: '15% discount + urgency', rate: '47%' },
              { type: 'Specialist recommendation', rate: '43%' },
              { type: 'Season-specific skin tip', rate: '38%' },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.dark }}>{r.type}</span>
                  <span style={{ fontWeight: 700, color: C.green }}>{r.rate}</span>
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: r.rate, background: C.green, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
