'use client'
import { useState } from 'react'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

const TICKETS = [
  { id: 'DQ-001', customer: 'Aisha Patel', subject: 'Product not delivered', category: 'Delivery', status: 'open', priority: 'high', created: '2025-03-20', vendor: 'Minimalist' },
  { id: 'DQ-002', customer: 'Rahul Sharma', subject: 'Wrong product received', category: 'Order', status: 'in_progress', priority: 'high', created: '2025-03-19', vendor: 'The Ordinary' },
  { id: 'DQ-003', customer: 'Neha Gupta', subject: 'Refund request for SPF cream', category: 'Refund', status: 'open', priority: 'medium', created: '2025-03-18', vendor: 'Dot & Key' },
  { id: 'DQ-004', customer: 'Zara Khan', subject: 'Consultation not booked correctly', category: 'Consultation', status: 'resolved', priority: 'low', created: '2025-03-16', vendor: 'N/A' },
  { id: 'DQ-005', customer: 'Aryan Mehta', subject: 'AI recommendation seems off', category: 'AI', status: 'open', priority: 'medium', created: '2025-03-15', vendor: 'N/A' },
]

const PRIORITY_COLOR: Record<string, string> = { high: C.red, medium: C.gold, low: C.green }
const STATUS_COLOR: Record<string, string> = { open: '#3B82F6', in_progress: C.gold, resolved: C.green }

export default function DermIQSupport() {
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')
  const [selected, setSelected] = useState<any>(null)

  const filtered = filter === 'all' ? TICKETS : TICKETS.filter(t => t.status === filter)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Support</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Customer support tickets raised on DermIQ platform</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Open', value: TICKETS.filter(t => t.status === 'open').length, color: '#3B82F6' },
          { label: 'In Progress', value: TICKETS.filter(t => t.status === 'in_progress').length, color: C.gold },
          { label: 'Resolved', value: TICKETS.filter(t => t.status === 'resolved').length, color: C.green },
          { label: 'Avg Response', value: '2.4h', color: C.teal },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${filter === f ? C.teal : C.border}`, background: filter === f ? C.teal : '#fff', color: filter === f ? '#fff' : C.mu, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((t, i) => (
          <div key={t.id} onClick={() => setSelected(t)} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: (PRIORITY_COLOR[t.priority] || C.mu) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {t.category === 'Delivery' ? '🚚' : t.category === 'Refund' ? '↩️' : t.category === 'Consultation' ? '🧴' : t.category === 'AI' ? '🤖' : '📦'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: C.mu, fontFamily: 'DM Mono, monospace' }}>{t.id}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: (PRIORITY_COLOR[t.priority] || C.mu) + '18', color: PRIORITY_COLOR[t.priority] || C.mu }}>{t.priority}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
              <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{t.customer} · Vendor: {t.vendor}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: (STATUS_COLOR[t.status] || C.mu) + '18', color: STATUS_COLOR[t.status] || C.mu, display: 'block', marginBottom: 4 }}>
                {t.status.replace('_', ' ')}
              </span>
              <div style={{ fontSize: 11, color: C.mu }}>{t.created}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>{selected.id}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.dark, margin: '0 0 16px' }}>{selected.subject}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[['Customer', selected.customer], ['Category', selected.category], ['Priority', selected.priority], ['Status', selected.status], ['Vendor', selected.vendor], ['Created', selected.created]].map(([k, v]) => (
                <div key={k} style={{ background: C.cream, borderRadius: 9, padding: '9px 12px' }}>
                  <div style={{ fontSize: 10, color: C.mu, textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: 10, background: C.teal, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reply</button>
              <button style={{ flex: 1, padding: 10, background: C.green + '18', color: C.green, border: `1px solid ${C.green}33`, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Mark Resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
