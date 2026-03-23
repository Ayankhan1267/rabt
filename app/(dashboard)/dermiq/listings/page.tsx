'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const PRODUCTS = [
  { id: 1, name: '10% Niacinamide Face Serum', brand: 'The Minimalist', category: 'Serums', price: 599, stock: 142, status: 'active', concerns: 4 },
  { id: 2, name: 'Watermelon Hydration Toner', brand: 'Dot & Key', category: 'Toners', price: 445, stock: 87, status: 'active', concerns: 3 },
  { id: 3, name: 'Glycolic Acid 08% Toning Solution', brand: 'Plum', category: 'Exfoliants', price: 749, stock: 54, status: 'pending', concerns: 5 },
  { id: 4, name: 'Sea Buckthorn Face Oil', brand: 'Pilgrim', category: 'Face Oils', price: 895, stock: 0, status: 'flagged', concerns: 2 },
  { id: 5, name: 'Onion Hair Oil', brand: 'Mamaearth', category: 'Hair Care', price: 349, stock: 213, status: 'active', concerns: 1 },
]

const STATUS_COLORS: Record<string, string> = { active: 'var(--green)', pending: '#F59E0B', flagged: 'var(--red)', inactive: 'var(--mu)' }
const STATUS_BG: Record<string, string> = { active: 'rgba(34,197,94,0.12)', pending: 'rgba(245,158,11,0.12)', flagged: 'rgba(239,68,68,0.12)', inactive: 'rgba(120,120,140,0.12)' }

const BRANDS = ['All Brands', 'The Minimalist', 'Dot & Key', 'Plum', 'Pilgrim', 'Mamaearth']

export default function ListingsPage() {
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('All Brands')
  const [products] = useState(PRODUCTS)

  const filtered = products.filter(p =>
    (brand === 'All Brands' || p.brand === brand) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--tx)', marginBottom: 4 }}>📦 Product Listings</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>All products across DermIQ marketplace with AI concern mapping</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Products', value: '84', icon: '📦', color: 'var(--teal)' },
          { label: 'Active', value: '76', icon: '✅', color: 'var(--green)' },
          { label: 'Pending Review', value: '8', icon: '⏳', color: '#F59E0B' },
          { label: 'Flagged', value: '2', icon: '🚩', color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mu)', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            style={{ width: '100%', padding: '9px 14px 9px 36px', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 9, color: 'var(--tx)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={brand}
          onChange={e => setBrand(e.target.value)}
          style={{ padding: '9px 14px', background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 9, color: 'var(--tx)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
        >
          {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button style={{ padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--teal)', color: '#fff', whiteSpace: 'nowrap' }}>
          + Add Product
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['Product', 'Brand', 'Category', 'Price', 'Stock', 'Status', 'AI Mapping', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--mu)' }}>{p.brand}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'rgba(20,184,166,0.1)', color: 'var(--teal)', fontWeight: 500 }}>{p.category}</span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600 }}>₹{p.price}</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: p.stock === 0 ? 'var(--red)' : p.stock < 20 ? '#F59E0B' : 'var(--tx)' }}>
                    {p.stock === 0 ? '⚠️ Out' : p.stock}
                  </span>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: STATUS_BG[p.status], color: STATUS_COLORS[p.status], textTransform: 'capitalize' }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>🧠</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>{p.concerns} concerns</span>
                  </div>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--tx)' }}>✏️ Edit</button>
                    <button style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)' }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--mu)' }}>Showing {filtered.length} of {products.length} products</div>
    </div>
  )
}
