'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

export default function DermIQInventory() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

  useEffect(() => {
    supabase.from('dermiq_products').select('*').order('stock', { ascending: true }).then(({ data }) => {
      setProducts(data || [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'low' ? products.filter(p => p.stock > 0 && p.stock <= 20)
                 : filter === 'out' ? products.filter(p => p.stock === 0)
                 : products

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Inventory</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Stock levels across all vendor products on DermIQ marketplace</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Total Products', value: products.length, color: C.teal },
          { label: 'Low Stock (≤20)', value: products.filter(p => p.stock > 0 && p.stock <= 20).length, color: C.gold },
          { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, color: C.red },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.mu }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['all', 'low', 'out'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${filter === f ? C.teal : C.border}`, background: filter === f ? C.teal : '#fff', color: filter === f ? '#fff' : C.mu, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
              {['Product', 'Vendor', 'Category', 'Stock', 'Price', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: C.mu }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: C.mu }}>No products in this filter</td></tr>
            ) : filtered.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{p.emoji || '✨'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: C.mu }}>{p.size}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: C.mu }}>{p.vendor_email?.split('@')[0]}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: C.teal + '12', color: C.teal }}>{p.category}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 50, height: 5, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: p.stock === 0 ? C.red : p.stock <= 20 ? C.gold : C.green, width: `${Math.min(100, (p.stock / 200) * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: p.stock === 0 ? C.red : p.stock <= 20 ? C.gold : C.dark }}>{p.stock}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: C.dark }}>₹{p.price}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: p.stock === 0 ? C.red + '18' : p.stock <= 20 ? C.gold + '18' : C.green + '18', color: p.stock === 0 ? C.red : p.stock <= 20 ? C.gold : C.green }}>
                    {p.stock === 0 ? 'Out of Stock' : p.stock <= 20 ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
