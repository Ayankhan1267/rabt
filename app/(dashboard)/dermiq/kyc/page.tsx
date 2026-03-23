'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type DocStatus = 'verified' | 'pending' | 'rejected' | 'missing'

interface VendorKYC {
  id: number
  name: string
  brand: string
  email: string
  submittedAt: string
  gst: DocStatus
  pan: DocStatus
  bank: DocStatus
  trademark: DocStatus
}

const KYC_DATA: VendorKYC[] = [
  { id: 1, name: 'Dot & Key', brand: 'Dot & Key', email: 'vendor@dotandkey.com', submittedAt: '2026-03-01', gst: 'verified', pan: 'verified', bank: 'verified', trademark: 'verified' },
  { id: 2, name: 'Plum Goodness', brand: 'Plum', email: 'b2b@plumgoodness.com', submittedAt: '2026-03-08', gst: 'verified', pan: 'verified', bank: 'pending', trademark: 'pending' },
  { id: 3, name: 'Pilgrim India', brand: 'Pilgrim', email: 'trade@pilgrimindia.com', submittedAt: '2026-03-15', gst: 'pending', pan: 'pending', bank: 'missing', trademark: 'missing' },
  { id: 4, name: 'Mamaearth', brand: 'Mamaearth', email: 'vendor@mamaearth.in', submittedAt: '2026-02-20', gst: 'verified', pan: 'verified', bank: 'rejected', trademark: 'verified' },
]

const DOC_CONFIG: Record<DocStatus, { color: string; bg: string; icon: string }> = {
  verified: { color: 'var(--green)', bg: 'rgba(34,197,94,0.12)', icon: '✅' },
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  rejected: { color: 'var(--red)', bg: 'rgba(239,68,68,0.12)', icon: '❌' },
  missing: { color: 'var(--mu)', bg: 'rgba(120,120,140,0.1)', icon: '➖' },
}

function overallStatus(v: VendorKYC): DocStatus {
  const docs = [v.gst, v.pan, v.bank, v.trademark]
  if (docs.some(d => d === 'rejected')) return 'rejected'
  if (docs.every(d => d === 'verified')) return 'verified'
  if (docs.some(d => d === 'pending' || d === 'missing')) return 'pending'
  return 'pending'
}

function DocBadge({ status }: { status: DocStatus }) {
  const c = DOC_CONFIG[status]
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.color, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {c.icon} {status}
    </span>
  )
}

export default function KYCPage() {
  const [vendors, setVendors] = useState(KYC_DATA)

  const verified = vendors.filter(v => overallStatus(v) === 'verified').length
  const pending = vendors.filter(v => overallStatus(v) === 'pending').length
  const rejected = vendors.filter(v => overallStatus(v) === 'rejected').length

  function updateDoc(vendorId: number, doc: keyof VendorKYC, status: DocStatus) {
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, [doc]: status } : v))
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>🔐 KYC & Verification</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>Review and approve vendor identity documents and compliance</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Fully Verified', value: verified, icon: '✅', color: 'var(--green)' },
          { label: 'Pending Review', value: pending, icon: '⏳', color: '#F59E0B' },
          { label: 'Rejected / Issues', value: rejected, icon: '❌', color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* KYC Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {vendors.map(v => {
          const overall = overallStatus(v)
          const cfg = DOC_CONFIG[overall]
          const docs: { label: string; key: keyof VendorKYC }[] = [
            { label: 'GST Certificate', key: 'gst' },
            { label: 'PAN Card', key: 'pan' },
            { label: 'Bank Account', key: 'bank' },
            { label: 'Trademark', key: 'trademark' },
          ]
          return (
            <div key={v.id} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
              {/* Card Header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏷️</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>{v.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: cfg.bg, color: cfg.color, textTransform: 'capitalize' }}>
                  {cfg.icon} {overall}
                </span>
              </div>

              {/* Doc Grid */}
              <div style={{ padding: '16px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {docs.map(doc => (
                    <div key={doc.key} style={{ background: 'var(--b1)', border: '1px solid var(--s2)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6, fontWeight: 500 }}>{doc.label}</div>
                      <DocBadge status={v[doc.key] as DocStatus} />
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 12 }}>Submitted: {v.submittedAt}</div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      ;(['gst', 'pan', 'bank', 'trademark'] as const).forEach(k => updateDoc(v.id, k, 'verified'))
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#fff' }}
                  >
                    ✅ Approve All
                  </button>
                  <button
                    onClick={() => {
                      ;(['gst', 'pan', 'bank', 'trademark'] as const).forEach(k => updateDoc(v.id, k, 'rejected'))
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)' }}
                  >
                    ❌ Reject
                  </button>
                  <button style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--tx)' }}>
                    📋 Docs
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
