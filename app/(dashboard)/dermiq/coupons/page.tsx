'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const COUPONS = [
  { id: 1, code: 'DERM20', vendor: 'Platform-wide', type: 'percent', value: 20, minOrder: 500, uses: 87, limit: 200, status: 'active' },
  { id: 2, code: 'PLUM100', vendor: 'Plum Goodness', type: 'flat', value: 100, minOrder: 799, uses: 34, limit: 100, status: 'active' },
  { id: 3, code: 'DOTKEY15', vendor: 'Dot & Key', type: 'percent', value: 15, minOrder: 400, uses: 56, limit: 150, status: 'active' },
  { id: 4, code: 'MINI10', vendor: 'The Minimalist', type: 'percent', value: 10, minOrder: 299, uses: 42, limit: 500, status: 'active' },
  { id: 5, code: 'WELCOME50', vendor: 'Platform-wide', type: 'flat', value: 50, minOrder: 399, uses: 15, limit: 50, status: 'expired' },
]

const STATUS_COLORS: Record<string, string> = { active: 'var(--green)', expired: 'var(--mu)', paused: '#F59E0B' }
const STATUS_BG: Record<string, string> = { active: 'rgba(34,197,94,0.12)', expired: 'rgba(120,120,140,0.1)', paused: 'rgba(245,158,11,0.12)' }

interface CouponForm {
  code: string
  vendor: string
  type: 'percent' | 'flat'
  value: string
  minOrder: string
  limit: string
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState(COUPONS)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CouponForm>({ code: '', vendor: 'Platform-wide', type: 'percent', value: '', minOrder: '', limit: '' })

  const totalUses = coupons.reduce((s, c) => s + c.uses, 0)
  const active = coupons.filter(c => c.status === 'active').length
  const revenueImpact = 12000

  function createCoupon() {
    if (!form.code || !form.value) return
    setCoupons(prev => [...prev, {
      id: prev.length + 1,
      code: form.code.toUpperCase(),
      vendor: form.vendor,
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder) || 0,
      uses: 0,
      limit: Number(form.limit) || 999,
      status: 'active',
    }])
    setShowModal(false)
    setForm({ code: '', vendor: 'Platform-wide', type: 'percent', value: '', minOrder: '', limit: '' })
  }

  function toggleStatus(id: number) {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c))
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>🏷️ Coupons & Offers</div>
          <div style={{ fontSize: 13, color: 'var(--mu)' }}>Manage platform-wide and vendor-specific discount coupons</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--teal)', color: '#fff' }}
        >
          + Platform Coupon
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Active Coupons', value: active, icon: '✅', color: 'var(--green)' },
          { label: 'Total Uses', value: totalUses, icon: '🎟️', color: 'var(--teal)' },
          { label: 'Revenue Impact', value: '₹12K', icon: '📉', color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['Code', 'Vendor', 'Type', 'Value', 'Min Order', 'Uses / Limit', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < coupons.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, color: 'var(--teal)', background: 'rgba(20,184,166,0.08)', padding: '3px 8px', borderRadius: 5 }}>{c.code}</span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: 12 }}>
                  {c.vendor === 'Platform-wide'
                    ? <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: 'rgba(168,85,247,0.12)', color: '#A855F7' }}>🌐 Platform</span>
                    : <span style={{ fontSize: 12, color: 'var(--mu)' }}>{c.vendor}</span>
                  }
                </td>
                <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--mu)', textTransform: 'capitalize' }}>{c.type}</td>
                <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>
                  {c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}
                </td>
                <td style={{ padding: '14px 18px', fontSize: 13 }}>₹{c.minOrder}</td>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.uses}</span>
                    <span style={{ fontSize: 11, color: 'var(--mu)' }}>/ {c.limit}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
                      <div style={{ height: '100%', width: `${Math.min((c.uses / c.limit) * 100, 100)}%`, background: 'var(--teal)', borderRadius: 3 }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: STATUS_BG[c.status], color: STATUS_COLORS[c.status], textTransform: 'capitalize' }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => toggleStatus(c.id)}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--tx)' }}
                    >
                      {c.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)' }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 18, padding: 32, width: 440, maxWidth: '90vw' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 6 }}>🏷️ Create Platform Coupon</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 24 }}>This coupon will apply across all vendors</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Coupon Code', field: 'code' as const, placeholder: 'e.g. DERM30' },
                { label: 'Discount Value', field: 'value' as const, placeholder: 'e.g. 20' },
                { label: 'Minimum Order (₹)', field: 'minOrder' as const, placeholder: 'e.g. 499' },
                { label: 'Usage Limit', field: 'limit' as const, placeholder: 'e.g. 100' },
              ].map(f => (
                <div key={f.field}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mu)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                  <input
                    value={form[f.field]}
                    onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--b1)', border: '1px solid var(--s2)', borderRadius: 9, color: 'var(--tx)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--mu)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discount Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['percent', 'flat'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(prev => ({ ...prev, type: t }))}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                        borderColor: form.type === t ? 'var(--teal)' : 'var(--s2)',
                        background: form.type === t ? 'rgba(20,184,166,0.15)' : 'transparent',
                        color: form.type === t ? 'var(--teal)' : 'var(--mu)',
                        textTransform: 'capitalize',
                      }}
                    >{t === 'percent' ? '% Percentage' : '₹ Flat'}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={createCoupon}
                style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--teal)', color: '#fff' }}
              >
                ✅ Create Coupon
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '11px 20px', borderRadius: 10, fontSize: 14, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--mu)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
