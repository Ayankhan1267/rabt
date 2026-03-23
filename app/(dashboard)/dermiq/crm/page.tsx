'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

const LEADS = [
  { id: 1, name: 'Pooja Sharma', email: 'pooja@example.com', source: 'AI Skin Test', concern: 'Acne', stage: 'Interested', created: '2025-03-20', notes: 'Completed AI test, viewed Niacinamide serum' },
  { id: 2, name: 'Kabir Ahmed', email: 'kabir@example.com', source: 'Specialist Page', concern: 'Pigmentation', stage: 'Consultation Booked', created: '2025-03-19', notes: 'Booked video consultation with Dr. Priya' },
  { id: 3, name: 'Ishaan Roy', email: 'ishaan@example.com', source: 'Vendor Referral', concern: 'Dullness', stage: 'Cart Abandoned', created: '2025-03-18', notes: 'Added AHA/BHA to cart, did not checkout' },
  { id: 4, name: 'Mira Kapoor', email: 'mira@example.com', source: 'Blog', concern: 'Aging', stage: 'Converted', created: '2025-03-17', notes: 'Purchased SPF50 + Retinol serum bundle' },
]

const STAGE_COLOR: Record<string, string> = {
  'Interested': '#3B82F6', 'Consultation Booked': C.gold, 'Cart Abandoned': C.red, 'Converted': C.green,
}

export default function DermIQCRM() {
  const [selected, setSelected] = useState<any>(null)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ CRM / Leads</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Track and nurture leads from DermIQ marketplace — separate from Rabt CRM</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {[['Interested', LEADS.filter(l => l.stage === 'Interested').length, '#3B82F6'], ['Consultation Booked', LEADS.filter(l => l.stage === 'Consultation Booked').length, C.gold], ['Cart Abandoned', LEADS.filter(l => l.stage === 'Cart Abandoned').length, C.red], ['Converted', LEADS.filter(l => l.stage === 'Converted').length, C.green]].map(([label, value, color]) => (
          <div key={label as string} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: color as string }}>{value}</div>
            <div style={{ fontSize: 11, color: C.mu }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LEADS.map((l) => (
          <div key={l.id} onClick={() => setSelected(l)} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.teal + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.teal, fontSize: 16 }}>{l.name.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{l.name}</div>
              <div style={{ fontSize: 11, color: C.mu }}>{l.email} · Source: {l.source}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: (STAGE_COLOR[l.stage] || C.mu) + '18', color: STAGE_COLOR[l.stage] || C.mu }}>{l.stage}</span>
              <div style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{l.created}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            {[['Email', selected.email], ['Source', selected.source], ['Concern', selected.concern], ['Stage', selected.stage], ['Date', selected.created]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.mu }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, background: C.cream, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: C.mu, textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
              <p style={{ fontSize: 12, color: C.dark, margin: 0 }}>{selected.notes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
