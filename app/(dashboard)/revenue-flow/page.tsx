'use client'
import { useState, useEffect } from 'react'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316', pink: '#EC4899',
}

const STREAM_COLORS = [C.teal, C.green, C.gold, C.purple, C.pink, C.blue, C.orange]
const CAT_COLORS: Record<string, string> = {
  Skincare: C.teal, Haircare: C.green, Supplements: C.gold, Bundles: C.purple,
}

// Demo fallbacks
const MONTHLY_DEMO = [
  { month: 'Oct', revenue: 312000, orders: 218, returns: 12400 },
  { month: 'Nov', revenue: 389000, orders: 272, returns: 15600 },
  { month: 'Dec', revenue: 524000, orders: 367, returns: 20960 },
  { month: 'Jan', revenue: 418000, orders: 293, returns: 16720 },
  { month: 'Feb', revenue: 476000, orders: 333, returns: 19040 },
  { month: 'Mar', revenue: 618000, orders: 433, returns: 24720 },
]
const STREAMS_DEMO = [
  { name: 'D2C Website', revenue: 247200, pct: 40, orders: 173 },
  { name: 'WhatsApp Orders', revenue: 185400, pct: 30, orders: 130 },
  { name: 'Partner Network', revenue: 92700, pct: 15, orders: 65 },
  { name: 'Wholesale / B2B', revenue: 61800, pct: 10, orders: 43 },
  { name: 'Influencer Sales', revenue: 30900, pct: 5, orders: 22 },
]
const PRODUCTS_DEMO = [
  { name: 'Glow Serum 30ml', category: 'Skincare', units: 142, revenue: 128000, cogs: 51200, margin: 60 },
  { name: 'Keratin Hair Mask', category: 'Haircare', units: 118, revenue: 106200, cogs: 42480, margin: 60 },
  { name: 'Vitamin C + E Capsules', category: 'Supplements', units: 96, revenue: 86400, cogs: 38880, margin: 55 },
  { name: 'Skin Repair Cream', category: 'Skincare', units: 87, revenue: 78300, cogs: 31320, margin: 60 },
  { name: 'Complete Care Bundle', category: 'Bundles', units: 64, revenue: 115200, cogs: 69120, margin: 40 },
]

function fmt(n: number) {
  const abs = Math.abs(n)
  if (abs >= 100000) return (n < 0 ? '-' : '') + '₹' + (abs / 100000).toFixed(2) + 'L'
  if (abs >= 1000) return (n < 0 ? '-' : '') + '₹' + (abs / 1000).toFixed(1) + 'K'
  return (n < 0 ? '-' : '') + '₹' + abs
}

function pctChange(curr: number, prev: number) {
  if (prev === 0) return { val: '0', up: true }
  const d = ((curr - prev) / prev) * 100
  return { val: Math.abs(d).toFixed(1), up: d >= 0 }
}

const TABS = ['Overview', 'Revenue Streams', 'Products', 'Profit Waterfall', 'HQ Operations']

export default function RevenueFlowPage() {
  const [tab, setTab] = useState('Overview')
  const [catFilter, setCatFilter] = useState('All')

  const [monthly, setMonthly] = useState(MONTHLY_DEMO)
  const [streams, setStreams] = useState<any[]>(STREAMS_DEMO)
  const [products, setProducts] = useState(PRODUCTS_DEMO)
  const [hqData, setHqData] = useState<any>(null)
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/revenue/data')
      .then(r => r.json())
      .then(data => {
        if (data.monthly?.length > 0) {
          setMonthly(data.monthly)
          setDataSource('live')
        }
        if (data.streams?.length > 0) setStreams(data.streams)
        if (data.products?.length > 0) setProducts(data.products)
        if (data.hqData) setHqData(data.hqData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const curr = monthly[monthly.length - 1] || { revenue: 0, orders: 0, returns: 0 }
  const prev = monthly[monthly.length - 2] || { revenue: 0, orders: 0, returns: 0 }
  const revChange = pctChange(curr.revenue, prev.revenue)
  const ordChange = pctChange(curr.orders, prev.orders)
  const maxRev = Math.max(...monthly.map(m => m.revenue), 1)

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]
  const filteredProducts = catFilter === 'All' ? products : products.filter(p => p.category === catFilter)

  const totalStreamRevenue = streams.reduce((s, r) => s + r.revenue, 0)

  // Build waterfall from real this-month data
  const netRev = curr.revenue - curr.returns
  const WATERFALL = [
    { label: 'Gross Revenue', value: curr.revenue, type: 'positive' },
    { label: 'Returns & Refunds', value: -curr.returns, type: 'negative' },
    { label: 'Net Revenue', value: netRev, type: 'subtotal' },
    { label: 'COGS (Products)', value: -Math.round(netRev * 0.38), type: 'negative' },
    { label: 'Gross Profit', value: Math.round(netRev * 0.62), type: 'subtotal' },
    { label: 'Marketing Spend', value: -Math.round(netRev * 0.12), type: 'negative' },
    { label: 'Shipping Costs', value: -Math.round(netRev * 0.07), type: 'negative' },
    { label: 'Operating Expenses', value: -Math.round(netRev * 0.08), type: 'negative' },
    { label: 'Net Profit', value: Math.round(netRev * 0.35), type: 'profit' },
  ]

  const netProfit = Math.round(netRev * 0.35)
  const grossProfit = Math.round(netRev * 0.62)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💸</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>Revenue Flow</h1>
              {!loading && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: dataSource === 'live' ? C.green + '15' : C.gold + '15', color: dataSource === 'live' ? C.green : C.gold }}>
                  {dataSource === 'live' ? '🟢 Live Data' : '🟡 Demo Data'}
                </span>
              )}
              {loading && <span style={{ fontSize: 11, color: C.mu }}>Loading...</span>}
            </div>
            <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>rabtnaturals.com + HQ Operations · Revenue streams · Product performance · Profit breakdown</p>
          </div>
          <button
            onClick={() => { setLoading(true); fetch('/api/revenue/data').then(r => r.json()).then(data => { if (data.monthly?.length > 0) { setMonthly(data.monthly); setDataSource('live') } if (data.streams?.length > 0) setStreams(data.streams); if (data.products?.length > 0) setProducts(data.products); if (data.hqData) setHqData(data.hqData) }).catch(() => {}).finally(() => setLoading(false)) }}
            style={{ padding: '8px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: C.teal }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'This Month Revenue', value: fmt(curr.revenue), sub: `${revChange.up ? '↑' : '↓'} ${revChange.val}% vs last month`, subColor: revChange.up ? C.green : C.red },
          { label: 'Net Profit (est.)', value: fmt(netProfit), sub: `${curr.revenue > 0 ? ((netProfit / curr.revenue) * 100).toFixed(1) : 0}% margin`, subColor: C.green },
          { label: 'Gross Profit (est.)', value: fmt(grossProfit), sub: `${curr.revenue > 0 ? ((grossProfit / curr.revenue) * 100).toFixed(1) : 0}% gross margin`, subColor: C.teal },
          { label: 'Orders This Month', value: curr.orders.toString(), sub: `${ordChange.up ? '↑' : '↓'} ${ordChange.val}% vs last month`, subColor: ordChange.up ? C.green : C.red },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: C.mu, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === t ? 700 : 500, background: tab === t ? `linear-gradient(135deg,${C.teal},${C.teal2})` : 'transparent', color: tab === t ? '#fff' : C.mu, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            {t}{t === 'HQ Operations' && hqData ? ' ●' : ''}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'Overview' && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700 }}>Monthly Revenue Trend</div>
              <span style={{ fontSize: 11, color: C.mu }}>rabtnaturals.com · Last 6 months</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 180 }}>
              {monthly.map((m, i) => {
                const barH = Math.round((m.revenue / maxRev) * 150)
                const netH = Math.round(((m.revenue - m.returns) / maxRev) * 150)
                const isLast = i === monthly.length - 1
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? C.teal : C.mu }}>{fmt(m.revenue)}</div>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 150, gap: 2 }}>
                      <div style={{ position: 'relative', width: '80%' }}>
                        <div style={{ height: barH, background: isLast ? `linear-gradient(180deg,${C.teal2},${C.teal})` : C.border, borderRadius: '6px 6px 0 0', width: '100%', transition: 'height 0.4s' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: netH, background: isLast ? C.green + '30' : 'transparent', borderRadius: '6px 6px 0 0' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: isLast ? 700 : 500, color: isLast ? C.teal : C.mu }}>{m.month}</div>
                    <div style={{ fontSize: 10, color: C.mu }}>{m.orders} orders</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.mu }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: C.teal }} /> Gross Revenue
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.mu }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: C.green + '60' }} /> After Returns
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Revenue by Stream</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {streams.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>{fmt(s.revenue)}</span>
                    </div>
                    <div style={{ height: 6, background: C.border, borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${s.pct}%`, background: STREAM_COLORS[i % STREAM_COLORS.length], borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{s.pct}% · {s.orders} orders</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Revenue by Category</div>
              {(() => {
                const cats = Array.from(new Set(products.map(p => p.category)))
                const catRevs = cats.map(c => ({ name: c, rev: products.filter(p => p.category === c).reduce((s, p) => s + p.revenue, 0) }))
                const total = catRevs.reduce((s, c) => s + c.rev, 0) || 1
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {catRevs.sort((a, b) => b.rev - a.rev).map((c, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[c.name] || C.mu }} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                          </div>
                          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>{fmt(c.rev)}</span>
                        </div>
                        <div style={{ height: 6, background: C.border, borderRadius: 4 }}>
                          <div style={{ height: '100%', width: `${(c.rev / total * 100).toFixed(0)}%`, background: CAT_COLORS[c.name] || C.mu, borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{(c.rev / total * 100).toFixed(1)}% of total</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── REVENUE STREAMS TAB ── */}
      {tab === 'Revenue Streams' && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Revenue Stream Breakdown</div>
            <div style={{ fontSize: 12, color: C.mu, marginBottom: 24 }}>This month · {fmt(totalStreamRevenue)} total · rabtnaturals.com</div>

            <div style={{ display: 'flex', height: 28, borderRadius: 12, overflow: 'hidden', marginBottom: 20, gap: 2 }}>
              {streams.map((s, i) => (
                <div key={i} style={{ flex: s.pct, background: STREAM_COLORS[i % STREAM_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'flex 0.4s' }}>
                  {s.pct >= 10 && <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{s.pct}%</span>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {streams.map((s, i) => {
                const color = STREAM_COLORS[i % STREAM_COLORS.length]
                const avgOrder = s.orders > 0 ? Math.round(s.revenue / s.orders) : 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: C.bg, borderRadius: 14, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: C.mu }}>{s.orders} orders · avg {fmt(avgOrder)} per order</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: C.dark }}>{fmt(s.revenue)}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: color + '15', color: color, display: 'inline-block', marginTop: 4 }}>{s.pct}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Avg Order Value by Stream</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {streams.map((s, i) => {
                const color = STREAM_COLORS[i % STREAM_COLORS.length]
                return (
                  <div key={i} style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '16px 10px', background: color + '10', borderRadius: 12, border: `1px solid ${color}25` }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color }}>{s.orders > 0 ? fmt(Math.round(s.revenue / s.orders)) : '—'}</div>
                    <div style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{s.name.split(' ')[0]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === 'Products' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${catFilter === c ? C.teal : C.border}`, background: catFilter === c ? C.teal : '#fff', color: catFilter === c ? '#fff' : C.mu, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {c}
              </button>
            ))}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Product', 'Category', 'Units Sold', 'Revenue', 'COGS', 'Gross Margin', 'Profit'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.sort((a, b) => b.revenue - a.revenue).map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: (CAT_COLORS[p.category] || C.mu) + '15', color: CAT_COLORS[p.category] || C.mu }}>{p.category}</span>
                    </td>
                    <td style={{ padding: '13px 16px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: C.dark }}>{p.units}</td>
                    <td style={{ padding: '13px 16px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: C.dark }}>{fmt(p.revenue)}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: C.red }}>{fmt(p.cogs)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 4, minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${p.margin}%`, background: p.margin >= 55 ? C.green : C.gold, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: p.margin >= 55 ? C.green : C.gold, minWidth: 32 }}>{p.margin}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: C.green }}>{fmt(p.revenue - p.cogs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 16 }}>
            {[
              { label: 'Total Product Revenue', value: fmt(filteredProducts.reduce((s, p) => s + p.revenue, 0)), color: C.teal },
              { label: 'Total COGS', value: fmt(filteredProducts.reduce((s, p) => s + p.cogs, 0)), color: C.red },
              { label: 'Total Gross Profit', value: fmt(filteredProducts.reduce((s, p) => s + (p.revenue - p.cogs), 0)), color: C.green },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROFIT WATERFALL TAB ── */}
      {tab === 'Profit Waterfall' && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Profit Waterfall — {curr.month || 'This Month'}</div>
            <div style={{ fontSize: 12, color: C.mu, marginBottom: 28 }}>How gross revenue flows down to net profit · rabtnaturals.com</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {WATERFALL.map((w, i) => {
                const isNeg = w.type === 'negative'
                const isSubtotal = w.type === 'subtotal'
                const isProfit = w.type === 'profit'
                const barColor = isProfit ? C.green : isSubtotal ? C.teal : isNeg ? C.red : C.teal2
                const maxVal = WATERFALL[0].value || 1
                const barW = Math.abs(w.value) / maxVal * 70

                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 180, fontSize: 13, fontWeight: isSubtotal || isProfit ? 700 : 500, color: isSubtotal || isProfit ? C.dark : C.mu, flexShrink: 0 }}>{w.label}</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isNeg && <div style={{ height: 1, flex: 1, borderTop: `1px dashed ${C.border}` }} />}
                      <div style={{ height: isSubtotal || isProfit ? 28 : 20, width: `${barW}%`, background: barColor, borderRadius: 6, transition: 'width 0.5s', opacity: isNeg ? 0.8 : 1 }} />
                      {!isNeg && <div style={{ height: 1, flex: 1, borderTop: `1px dashed ${C.border}` }} />}
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontFamily: 'Syne, sans-serif', fontSize: isSubtotal || isProfit ? 16 : 14, fontWeight: isSubtotal || isProfit ? 800 : 600, color: isProfit ? C.green : isNeg ? C.red : isSubtotal ? C.teal : C.dark, flexShrink: 0 }}>
                      {w.value < 0 ? '− ' : ''}{fmt(Math.abs(w.value))}
                    </div>
                    <div style={{ width: 50, textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.mu, flexShrink: 0 }}>
                      {w.type !== 'positive' && curr.revenue > 0 ? `${((Math.abs(w.value) / curr.revenue) * 100).toFixed(1)}%` : ''}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
              {[
                { label: 'Gross Margin', value: '62%', color: C.teal },
                { label: 'Marketing %', value: '12%', color: C.orange },
                { label: 'Net Margin', value: '35%', color: C.green },
                { label: 'Return Rate', value: curr.revenue > 0 ? `${((curr.returns / curr.revenue) * 100).toFixed(1)}%` : '0%', color: C.red },
              ].map((k, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '14px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: C.mu, marginTop: 3 }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Monthly Profit Estimates</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Month', 'Gross Revenue', 'Returns', 'Net Revenue', 'Est. Gross Profit (62%)', 'Est. Net Profit (35%)'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.mu, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m, i) => {
                    const net = m.revenue - m.returns
                    const gp = Math.round(net * 0.62)
                    const np = Math.round(net * 0.35)
                    const isLast = i === monthly.length - 1
                    return (
                      <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: isLast ? C.teal + '06' : 'transparent' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: isLast ? 700 : 500, color: isLast ? C.teal : C.dark }}>{m.month}{isLast ? ' ●' : ''}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>{fmt(m.revenue)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: C.red }}>−{fmt(m.returns)}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>{fmt(net)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: C.teal, fontWeight: 700 }}>{fmt(gp)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: C.green }}>{fmt(np)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── HQ OPERATIONS TAB ── */}
      {tab === 'HQ Operations' && (
        <div>
          {/* Source badges */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.teal + '10', border: `1px solid ${C.teal}25`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.teal }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>rabtnaturals.com</span>
              <span style={{ fontSize: 11, color: C.mu }}>MongoDB · Store Revenue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.purple + '10', border: `1px solid ${C.purple}25`, borderRadius: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.purple }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>HQ Admin Panel</span>
              <span style={{ fontSize: 11, color: C.mu }}>Supabase · Operations</span>
            </div>
          </div>

          {!hqData ? (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Supabase Not Connected</div>
              <div style={{ fontSize: 14, color: C.mu, marginBottom: 20 }}>Connect Supabase in Settings to see HQ Operations data — call logs, task completion, team activity.</div>
              <a href="/settings" style={{ display: 'inline-block', padding: '10px 24px', background: C.purple, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Go to Settings →</a>
            </div>
          ) : (
            <div>
              {/* HQ KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'AI Calls (This Month)', value: hqData.totalCalls.toString(), sub: `${hqData.connectedCalls} connected`, color: C.purple },
                  { label: 'Call Connection Rate', value: hqData.callConnectionRate + '%', sub: `avg ${hqData.avgCallDuration}s duration`, color: hqData.callConnectionRate >= 50 ? C.green : C.gold },
                  { label: 'Tasks Completed', value: hqData.completedTasks.toString(), sub: `of ${hqData.totalTasks} total`, color: C.teal },
                  { label: 'Task Completion Rate', value: hqData.taskCompletionRate + '%', sub: 'This month', color: hqData.taskCompletionRate >= 70 ? C.green : C.gold },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, color: C.mu, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
                    <div style={{ fontSize: 12, color: C.mu }}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Tasks by Area */}
              {hqData.tasksByArea?.length > 0 && (
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Tasks by Area — This Month</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {hqData.tasksByArea.map((t: any, i: number) => {
                      const maxCount = hqData.tasksByArea[0].count || 1
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.area}</span>
                            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: C.purple }}>{t.count} tasks</span>
                          </div>
                          <div style={{ height: 6, background: C.border, borderRadius: 4 }}>
                            <div style={{ height: '100%', width: `${(t.count / maxCount) * 100}%`, background: C.purple, borderRadius: 4, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Combined insight */}
              <div style={{ background: `linear-gradient(135deg,${C.teal}08,${C.purple}08)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Combined Data Insight</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${C.teal}20` }}>
                    <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>rabtnaturals.com (MongoDB)</div>
                    <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6 }}>
                      <strong>{fmt(curr.revenue)}</strong> gross revenue · <strong>{curr.orders}</strong> orders this month
                      {streams[0] && <><br />Top stream: <strong>{streams[0].name}</strong> ({streams[0].pct}%)</>}
                    </div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${C.purple}20` }}>
                    <div style={{ fontSize: 11, color: C.purple, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>HQ Operations (Supabase)</div>
                    <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6 }}>
                      <strong>{hqData.totalCalls}</strong> AI calls made · <strong>{hqData.callConnectionRate}%</strong> connected
                      <br /><strong>{hqData.completedTasks}</strong> tasks done · <strong>{hqData.taskCompletionRate}%</strong> completion rate
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
