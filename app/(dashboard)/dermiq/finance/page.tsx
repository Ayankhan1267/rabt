'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

export default function DermIQFinance() {
  const [stats, setStats] = useState({ gmv: 0, commission: 0, payouts: 0, pending: 0 })
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: orders } = await supabase.from('dermiq_orders').select('amount, status, vendor_email, created_at, product_name')
    const allOrders = orders || []
    const gmv = allOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
    const commission = gmv * 0.15
    setStats({ gmv, commission, payouts: commission * 0.7, pending: commission * 0.3 })
    setTransactions(allOrders.slice(0, 20).map((o: any, i: number) => ({
      id: i + 1, type: 'Order', description: o.product_name, vendor: o.vendor_email, amount: o.amount,
      commission: Math.round((o.amount || 0) * 0.15), status: o.status, date: o.created_at,
    })))
    setLoading(false)
  }

  const StatCard = ({ icon, label, value, sub, color }: any) => (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 20, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: color || C.dark }}>
        {loading ? '—' : `₹${(value / 1000).toFixed(1)}K`}
      </div>
      <div style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Finance</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Platform revenue, commissions, and vendor payout tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon="🛍️" label="Gross Merchandise Value" value={stats.gmv} color={C.teal} />
        <StatCard icon="💹" label="Platform Commission (15%)" value={stats.commission} color="#8B5CF6" />
        <StatCard icon="✅" label="Disbursed Payouts" value={stats.payouts} color={C.green} />
        <StatCard icon="⏳" label="Pending Payouts" value={stats.pending} color={C.gold} />
      </div>

      {/* Commission Breakdown */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: C.dark, margin: '0 0 14px' }}>Commission Structure</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Serum & Treatment', rate: '15%' },
            { label: 'Moisturiser & SPF', rate: '12%' },
            { label: 'Cleanser & Toner', rate: '10%' },
            { label: 'Premium / Luxury', rate: '18%' },
            { label: 'Consultations', rate: '20%' },
          ].map(c => (
            <div key={c.label} style={{ background: C.cream, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: C.dark }}>{c.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.teal }}>{c.rate}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: C.dark, margin: 0 }}>Recent Transactions</h3>
          <a href="/dermiq/payouts" style={{ fontSize: 12, color: C.teal, fontWeight: 600, textDecoration: 'none' }}>Manage Payouts →</a>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
              {['Description', 'Vendor', 'Order Amount', 'Commission', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: C.mu }}>Loading...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: C.mu }}>No transactions yet</td></tr>
            ) : transactions.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, color: C.dark, fontWeight: 500 }}>{t.description}</td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: C.mu }}>{t.vendor?.split('@')[0]}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: C.dark }}>₹{t.amount}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>₹{t.commission}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: t.status === 'delivered' ? C.green + '18' : C.gold + '18', color: t.status === 'delivered' ? C.green : C.gold }}>{t.status}</span>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: C.mu }}>{t.date ? new Date(t.date).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
