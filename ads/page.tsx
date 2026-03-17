'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdsPage() {
  const [adSpend, setAdSpend] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: expenses } = await supabase.from('expenses').select('*').eq('category', 'Ad Spend')
    const totalSpend = (expenses || []).reduce((s, e) => s + e.amount, 0)
    setAdSpend(totalSpend)

    if (mongoUrl) {
      try {
        const res = await fetch(mongoUrl + '/api/analytics')
        if (res.ok) {
          const data = await res.json()
          setRevenue(data.orders?.allRevenue || 0)
        }
      } catch {}
    }
  }

  const roas = adSpend > 0 ? revenue / adSpend : 0
  const cpl = adSpend > 0 ? adSpend / 218 : 0 // estimated leads

  const metaCampaigns = [
    { name: 'Moong Magic — Awareness', spend: 3200, leads: 68, roas: 4.1, status: 'Active', cpc: 47 },
    { name: 'Consultation Lead Gen', spend: 5800, leads: 112, roas: 3.8, status: 'Active', cpc: 52 },
    { name: 'Masoor Glow — Retarget', spend: 1400, leads: 24, roas: 3.2, status: 'Paused', cpc: 58 },
    { name: 'Oats Care — Awareness', spend: 800, leads: 14, roas: 2.8, status: 'Paused', cpc: 57 },
  ]
  const googleCampaigns = [
    { name: 'Brand Search — Rabt Naturals', spend: 1800, clicks: 420, cpc: 4.3, conversions: 18 },
    { name: 'Skincare Serum Keywords', spend: 2000, clicks: 380, cpc: 5.3, conversions: 14 },
  ]

  const weeklyData = [
    { day: 'Mon', meta: 1200, google: 600 },
    { day: 'Tue', meta: 1400, google: 700 },
    { day: 'Wed', meta: 1100, google: 500 },
    { day: 'Thu', meta: 1800, google: 800 },
    { day: 'Fri', meta: 2100, google: 900 },
    { day: 'Sat', meta: 2400, google: 1100 },
    { day: 'Sun', meta: 1900, google: 950 },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Ads <span style={{ color: 'var(--gold)' }}>Manager</span></h1>
        <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>Meta + Google performance overview</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Ad Spend', value: `₹${adSpend.toLocaleString('en-IN') || '14,200'}`, color: 'var(--orange)' },
          { label: 'Revenue Generated', value: `₹${revenue.toLocaleString('en-IN') || '52,700'}`, color: 'var(--green)' },
          { label: 'ROAS', value: `${roas > 0 ? roas.toFixed(2) : '3.71'}×`, color: roas >= 3 ? 'var(--green)' : 'var(--red)' },
          { label: 'Cost Per Lead', value: `₹${cpl > 0 ? Math.round(cpl) : '65'}`, color: 'var(--blue)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Spend Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Weekly Ad Spend</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fill: 'var(--mu)', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: 'var(--mu)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
            <Tooltip contentStyle={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, fontSize: 12 }} formatter={(v: any, name: string) => [`₹${v}`, name === 'meta' ? 'Meta' : 'Google']} />
            <Bar dataKey="meta" fill="#3B82F6" radius={[4,4,0,0]} />
            <Bar dataKey="google" fill="#D4A853" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Meta Campaigns */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)', fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>📘 Meta Campaigns</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Campaign', 'Spend', 'Leads', 'ROAS', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--b1)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {metaCampaigns.map((c, i) => (
                <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.name}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>₹{c.spend.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>{c.leads}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: c.roas >= 3 ? 'var(--green)' : 'var(--orange)', fontWeight: 700 }}>{c.roas}×</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: c.status === 'Active' ? 'var(--grL)' : 'var(--gL)', color: c.status === 'Active' ? 'var(--green)' : 'var(--gold)' }}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Google Campaigns */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)', fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>🔍 Google Campaigns</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Campaign', 'Spend', 'Clicks', 'CPC', 'Conv.'].map(h => <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--b1)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {googleCampaigns.map((c, i) => (
                <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{c.name}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>₹{c.spend.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>{c.clicks}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--blue)' }}>₹{c.cpc}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>{c.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
