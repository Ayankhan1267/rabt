'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const ORDERS = [
  { id: 'DQ-2891', customer: 'Priya Sharma', vendor: 'Plum Goodness', product: 'Glycolic Acid 08%', amount: 749, status: 'delivered', date: '2026-03-22' },
  { id: 'DQ-2890', customer: 'Aryan Mehta', vendor: 'The Minimalist', product: '10% Niacinamide Serum', amount: 599, status: 'shipped', date: '2026-03-22' },
  { id: 'DQ-2889', customer: 'Sneha Iyer', vendor: 'Dot & Key', product: 'Watermelon Toner', amount: 445, status: 'pending', date: '2026-03-23' },
  { id: 'DQ-2888', customer: 'Kavya Reddy', vendor: 'Pilgrim India', product: 'Sea Buckthorn Face Oil', amount: 895, status: 'pending', date: '2026-03-23' },
  { id: 'DQ-2887', customer: 'Rohan Das', vendor: 'The Minimalist', product: 'Alpha Arbutin 2%', amount: 699, status: 'shipped', date: '2026-03-21' },
  { id: 'DQ-2886', customer: 'Meera Nair', vendor: 'Dot & Key', product: 'SPF 50 Sunscreen', amount: 549, status: 'delivered', date: '2026-03-20' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', shipped: 'var(--teal)', delivered: 'var(--green)', cancelled: 'var(--red)', returned: '#A855F7',
}
const STATUS_BG: Record<string, string> = {
  pending: 'rgba(245,158,11,0.12)', shipped: 'rgba(20,184,166,0.12)', delivered: 'rgba(34,197,94,0.12)', cancelled: 'rgba(239,68,68,0.12)', returned: 'rgba(168,85,247,0.12)',
}

const VENDORS_FILTER = ['All Vendors', 'The Minimalist', 'Dot & Key', 'Plum Goodness', 'Pilgrim India', 'Mamaearth']
const STATUSES_FILTER = ['all', 'pending', 'shipped', 'delivered', 'cancelled', 'returned']

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('All Vendors')

  const filtered = ORDERS.filter(o =>
    (statusFilter === 'all' || o.status === statusFilter) &&
    (vendorFilter === 'All Vendors' || o.vendor === vendorFilter)
  )

  const today = ORDERS.filter(o => o.date === '2026-03-23').length
  const pending = ORDERS.filter(o => o.status === 'pending').length
  const shipped = ORDERS.filter(o => o.status === 'shipped').length
  const delivered = ORDERS.filter(o => o.status === 'delivered').length

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>📦 All Orders</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>Orders across all DermIQ marketplace vendors</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: "Today's Orders", value: today, icon: '📅', color: 'var(--teal)' },
          { label: 'Pending', value: pending, icon: '⏳', color: '#F59E0B' },
          { label: 'Shipped', value: shipped, icon: '🚚', color: '#A855F7' },
          { label: 'Delivered', value: '287', icon: '✅', color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUSES_FILTER.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                borderColor: statusFilter === s ? 'var(--teal)' : 'var(--s2)',
                background: statusFilter === s ? 'rgba(20,184,166,0.15)' : 'var(--s1)',
                color: statusFilter === s ? 'var(--teal)' : 'var(--mu)',
                textTransform: 'capitalize',
              }}
            >{s}</button>
          ))}
        </div>
        <select
          value={vendorFilter}
          onChange={e => setVendorFilter(e.target.value)}
          style={{ marginLeft: 'auto', padding: '7px 14px', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 8, color: 'var(--tx)', fontSize: 12, outline: 'none', cursor: 'pointer' }}
        >
          {VENDORS_FILTER.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['Order ID', 'Customer', 'Vendor', 'Product', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>{o.id}</span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 500 }}>{o.customer}</td>
                <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--mu)' }}>{o.vendor}</td>
                <td style={{ padding: '14px 18px', fontSize: 12 }}>{o.product}</td>
                <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 700 }}>₹{o.amount}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: STATUS_BG[o.status], color: STATUS_COLORS[o.status], textTransform: 'capitalize' }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--mu)' }}>{o.date}</td>
                <td style={{ padding: '14px 18px' }}>
                  <button style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--tx)' }}>
                    👁 View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--mu)', fontSize: 13 }}>No orders match current filters</div>
        )}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--mu)' }}>Showing {filtered.length} orders</div>
    </div>
  )
}
