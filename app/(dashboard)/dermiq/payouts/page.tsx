'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const PAYOUTS = [
  { id: 1, vendor: 'Dot & Key', amount: 13800, commission: 2070, net: 11730, status: 'processed', date: '2026-03-10' },
  { id: 2, vendor: 'Plum Goodness', amount: 17400, commission: 2610, net: 14790, status: 'processed', date: '2026-03-10' },
  { id: 3, vendor: 'The Minimalist', amount: 9200, commission: 1380, net: 7820, status: 'pending', date: '2026-03-20' },
  { id: 4, vendor: 'Pilgrim India', amount: 4600, commission: 690, net: 3910, status: 'pending', date: '2026-03-20' },
  { id: 5, vendor: 'Mamaearth', amount: 7600, commission: 1140, net: 6460, status: 'on-hold', date: '2026-03-15' },
]

const STATUS_COLORS: Record<string, string> = { processed: 'var(--green)', pending: '#F59E0B', 'on-hold': 'var(--red)' }
const STATUS_BG: Record<string, string> = { processed: 'rgba(34,197,94,0.12)', pending: 'rgba(245,158,11,0.12)', 'on-hold': 'rgba(239,68,68,0.12)' }

function fmt(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState(PAYOUTS)

  const thisMonth = payouts.reduce((s, p) => s + p.amount, 0)
  const processed = payouts.filter(p => p.status === 'processed').reduce((s, p) => s + p.amount, 0)
  const pending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const commission = payouts.reduce((s, p) => s + p.commission, 0)

  function processAll() {
    setPayouts(prev => prev.map(p => p.status === 'pending' ? { ...p, status: 'processed' } : p))
  }

  function processOne(id: number) {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'processed' } : p))
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>💸 Vendor Payouts</div>
          <div style={{ fontSize: 13, color: 'var(--mu)' }}>Track and process vendor payment cycles. Commission: 15%</div>
        </div>
        <button
          onClick={processAll}
          style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#fff' }}
        >
          ⚡ Process All Pending
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'This Month Total', value: fmt(thisMonth), icon: '📊', color: 'var(--teal)' },
          { label: 'Processed', value: fmt(processed), icon: '✅', color: 'var(--green)' },
          { label: 'Pending', value: fmt(pending), icon: '⏳', color: '#F59E0B' },
          { label: 'Commission (15%)', value: fmt(commission), icon: '💼', color: '#A855F7' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Payout Table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--s2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Payout Ledger</span>
          <button style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: '1px solid var(--s2)', background: 'transparent', color: 'var(--mu)' }}>
            ⬇️ Export CSV
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['Vendor', 'Gross Amount', 'Commission (15%)', 'Net Payout', 'Status', 'Date', 'Action'].map(h => (
                <th key={h} style={{ padding: '13px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < payouts.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.vendor}</div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: '#A855F7' }}>- ₹{p.commission.toLocaleString()}</td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>₹{p.net.toLocaleString()}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: STATUS_BG[p.status], color: STATUS_COLORS[p.status], textTransform: 'capitalize' }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--mu)' }}>{p.date}</td>
                <td style={{ padding: '16px 20px' }}>
                  {p.status === 'pending' ? (
                    <button
                      onClick={() => processOne(p.id)}
                      style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#fff' }}
                    >
                      ✅ Process
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--mu)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
