'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

const SEED = [
  { id: 1, name: 'Aisha Patel', email: 'aisha@example.com', phone: '+91 9823456789', orders: 4, total_spent: 2196, skin_type: 'Oily', concerns: ['Acne', 'Pigmentation'], joined: '2024-11-15', last_order: '2025-03-10' },
  { id: 2, name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+91 9712345678', orders: 2, total_spent: 948, skin_type: 'Combination', concerns: ['Dullness', 'Pores'], joined: '2025-01-02', last_order: '2025-03-01' },
  { id: 3, name: 'Neha Gupta', email: 'neha@example.com', phone: '+91 9654321098', orders: 6, total_spent: 3294, skin_type: 'Dry', concerns: ['Dryness', 'Aging'], joined: '2024-09-20', last_order: '2025-03-18' },
  { id: 4, name: 'Zara Khan', email: 'zara@example.com', phone: '+91 9876543210', orders: 1, total_spent: 699, skin_type: 'Normal', concerns: ['Fine Lines'], joined: '2025-02-28', last_order: '2025-02-28' },
  { id: 5, name: 'Aryan Mehta', email: 'aryan@example.com', phone: '+91 9345678901', orders: 3, total_spent: 1497, skin_type: 'Sensitive', concerns: ['Redness', 'Acne'], joined: '2024-12-10', last_order: '2025-03-15' },
]

export default function DermIQCustomers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data, error } = await supabase.from('dermiq_customers').select('*').order('joined', { ascending: false })
    if (!error && data && data.length > 0) setCustomers(data)
    else setCustomers(SEED)
    setLoading(false)
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Customers</h1>
          <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Customers who purchased via DermIQ marketplace</p>
        </div>
        <div style={{ fontSize: 11, color: C.mu, background: C.cream, padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}` }}>
          Total: <strong style={{ color: C.dark }}>{customers.length}</strong>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 18 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers by name or email..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
        />
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total Customers', value: customers.length, icon: '👥' },
          { label: 'Avg Orders', value: customers.length ? (customers.reduce((s, c) => s + (c.orders || 0), 0) / customers.length).toFixed(1) : 0, icon: '📦' },
          { label: 'Total Revenue', value: `₹${(customers.reduce((s, c) => s + (c.total_spent || 0), 0) / 1000).toFixed(1)}K`, icon: '💰' },
          { label: 'Avg LTV', value: customers.length ? `₹${Math.round(customers.reduce((s, c) => s + (c.total_spent || 0), 0) / customers.length)}` : '₹0', icon: '📈' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: C.dark }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.mu }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
              {['Customer', 'Skin Type', 'Orders', 'Total Spent', 'Last Order', 'Action'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: C.mu }}>Loading...</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{c.name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.mu }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{c.skin_type}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>{c.orders}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.dark }}>₹{c.total_spent?.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 14px', fontSize: 11, color: C.mu }}>{c.last_order}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button onClick={() => setSelected(c)} style={{ fontSize: 11, padding: '4px 12px', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.dark, fontWeight: 600 }}>View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Profile Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>{selected.name?.charAt(0)}</div>
                <div>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>{selected.name}</h2>
                  <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>{selected.email} · {selected.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[['Skin Type', selected.skin_type], ['Orders', selected.orders], ['Total Spent', `₹${selected.total_spent?.toLocaleString('en-IN')}`], ['Member Since', selected.joined], ['Last Order', selected.last_order]].map(([k, v]) => (
                <div key={k} style={{ background: C.cream, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: C.mu, textTransform: 'uppercase', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v}</div>
                </div>
              ))}
            </div>
            {selected.concerns?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: C.mu, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Skin Concerns</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selected.concerns.map((con: string) => (
                    <span key={con} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{con}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
