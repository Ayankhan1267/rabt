'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

export default function DermIQDashboard() {
  const [stats, setStats] = useState({ vendors: 0, products: 0, orders: 0, revenue: 0, consultations: 0, customers: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    try {
      const [v, p, o, cons, cust] = await Promise.all([
        supabase.from('dermiq_vendors').select('id', { count: 'exact', head: true }),
        supabase.from('dermiq_products').select('id', { count: 'exact', head: true }),
        supabase.from('dermiq_orders').select('id, amount'),
        supabase.from('dermiq_consultations').select('id', { count: 'exact', head: true }),
        supabase.from('dermiq_customers').select('id', { count: 'exact', head: true }),
      ])
      const rev = (o.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0)
      setStats({ vendors: v.count || 0, products: p.count || 0, orders: (o.data || []).length, revenue: rev, consultations: cons.count || 0, customers: cust.count || 0 })

      const { data: ord } = await supabase.from('dermiq_orders').select('*').order('created_at', { ascending: false }).limit(5)
      setRecentOrders(ord || [])

      const { data: prods } = await supabase.from('dermiq_products').select('*').eq('active', true).order('rating', { ascending: false }).limit(5)
      setTopProducts(prods || [])
    } catch {}
    setLoading(false)
  }

  const KPI = ({ icon, label, value, sub, color }: any) => (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}>{icon}</div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color || C.green }} />
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: C.dark }}>{loading ? '—' : value}</div>
      <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color || C.green, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚗️</div>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>DermIQ Dashboard</h1>
            <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Multivendor Skincare Marketplace — Live Overview</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[{ label: 'Marketplace Live', color: C.green }, { label: 'AI Matching Active', color: C.teal }, { label: 'Payments Connected', color: C.gold }].map(b => (
            <span key={b.label} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: b.color + '18', color: b.color, border: `1px solid ${b.color}33` }}>{b.label}</span>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KPI icon="🏪" label="Active Vendors" value={stats.vendors} color={C.teal} />
        <KPI icon="📦" label="Total Products" value={stats.products} color={C.teal2} />
        <KPI icon="📋" label="Total Orders" value={stats.orders} color={C.gold} />
        <KPI icon="💰" label="Revenue" value={`₹${(stats.revenue / 1000).toFixed(1)}K`} color={C.green} />
        <KPI icon="🧴" label="Consultations" value={stats.consultations} color="#8B5CF6" />
        <KPI icon="👥" label="Customers" value={stats.customers} color={C.red} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Recent Orders */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: C.dark, margin: 0 }}>Recent Orders</h3>
            <a href="/dermiq/orders" style={{ fontSize: 11, color: C.teal, fontWeight: 600, textDecoration: 'none' }}>View All →</a>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.mu, fontSize: 13 }}>No orders yet</div>
          ) : recentOrders.map((o, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentOrders.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{o.product_name}</div>
                <div style={{ fontSize: 11, color: C.mu }}>{o.customer_name || 'Customer'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>₹{o.amount}</div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: o.status === 'delivered' ? C.green + '18' : o.status === 'new' ? '#3B82F618' : C.gold + '18', color: o.status === 'delivered' ? C.green : o.status === 'new' ? '#3B82F6' : C.gold }}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Top Products */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: C.dark, margin: 0 }}>Top Products</h3>
            <a href="/dermiq/listings" style={{ fontSize: 11, color: C.teal, fontWeight: 600, textDecoration: 'none' }}>View All →</a>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.mu, fontSize: 13 }}>No products yet</div>
          ) : topProducts.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < topProducts.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{p.emoji || '✨'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.mu }}>{p.category} · ₹{p.price}</div>
              </div>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>★ {p.rating}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginTop: 20, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, margin: '0 0 14px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Add Vendor', href: '/dermiq/vendors', icon: '🏪' },
            { label: 'View Orders', href: '/dermiq/orders', icon: '📦' },
            { label: 'Consultations', href: '/dermiq/consultations', icon: '🧴' },
            { label: 'Payouts', href: '/dermiq/payouts', icon: '💸' },
            { label: 'Analytics', href: '/dermiq/analytics', icon: '📊' },
            { label: 'Team Access', href: '/dermiq/team', icon: '🤝' },
          ].map(a => (
            <a key={a.label} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.15)', borderRadius: 10, textDecoration: 'none', color: '#fff', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)' }}>
              <span>{a.icon}</span><span>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
