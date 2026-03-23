'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const VENDORS = [
  { id: 1, name: 'The Minimalist', brand: 'The Minimalist', email: 'ops@theminimalist.in', status: 'active', products: 18, gmv: 92000 },
  { id: 2, name: 'Dot & Key', brand: 'Dot & Key', email: 'vendor@dotandkey.com', status: 'active', products: 24, gmv: 138000 },
  { id: 3, name: 'Plum Goodness', brand: 'Plum', email: 'b2b@plumgoodness.com', status: 'active', products: 31, gmv: 174000 },
  { id: 4, name: 'Pilgrim India', brand: 'Pilgrim', email: 'trade@pilgrimindia.com', status: 'pending', products: 9, gmv: 0 },
  { id: 5, name: 'Mamaearth', brand: 'Mamaearth', email: 'vendor@mamaearth.in', status: 'suspended', products: 41, gmv: 76000 },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--green)',
  pending: '#F59E0B',
  suspended: 'var(--red)',
}

const STATUS_BG: Record<string, string> = {
  active: 'rgba(34,197,94,0.12)',
  pending: 'rgba(245,158,11,0.12)',
  suspended: 'rgba(239,68,68,0.12)',
}

function fmt(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}

export default function VendorsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')
  const [vendors, setVendors] = useState(VENDORS)

  const filtered = filter === 'all' ? vendors : vendors.filter(v => v.status === filter)
  const totalGMV = vendors.reduce((s, v) => s + v.gmv, 0)

  function handleSuspend(id: number) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status: v.status === 'suspended' ? 'active' : 'suspended' } : v))
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--tx)', marginBottom: 4 }}>🏪 Vendor Manager</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>Manage all DermIQ marketplace vendors, KYC status, and performance</div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Vendors', value: '12', icon: '🏪', color: 'var(--teal)' },
          { label: 'Active', value: '10', icon: '✅', color: 'var(--green)' },
          { label: 'Pending KYC', value: '3', icon: '⏳', color: '#F59E0B' },
          { label: 'Total GMV', value: fmt(totalGMV), icon: '💰', color: '#A855F7' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'active', 'pending', 'suspended'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid',
              borderColor: filter === tab ? 'var(--teal)' : 'var(--s2)',
              background: filter === tab ? 'rgba(20,184,166,0.15)' : 'var(--s1)',
              color: filter === tab ? 'var(--teal)' : 'var(--mu)',
              textTransform: 'capitalize',
            }}
          >{tab}</button>
        ))}
        <button style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--teal)', color: '#fff' }}>
          + Invite Vendor
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['Vendor', 'Brand', 'Email', 'Status', 'Products', 'GMV', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏷️</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--mu)' }}>{v.brand}</td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--mu)' }}>{v.email}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: STATUS_BG[v.status], color: STATUS_COLORS[v.status], textTransform: 'capitalize' }}>
                    {v.status}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600 }}>{v.products}</td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>{fmt(v.gmv)}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--tx)' }}>
                      👁 View
                    </button>
                    <button
                      onClick={() => handleSuspend(v.id)}
                      style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: v.status === 'suspended' ? 'var(--green)' : 'var(--red)', background: 'transparent', color: v.status === 'suspended' ? 'var(--green)' : 'var(--red)' }}
                    >
                      {v.status === 'suspended' ? '✅ Restore' : '🚫 Suspend'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--mu)' }}>Showing {filtered.length} of {vendors.length} vendors</div>
    </div>
  )
}
