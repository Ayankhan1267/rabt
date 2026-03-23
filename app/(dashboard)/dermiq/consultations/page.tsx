'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6', pending: C.gold, active: C.green, completed: '#6B7280', cancelled: C.red,
}

const SEED_CONSULTATIONS = [
  { id: 1, patient_name: 'Aisha Patel', specialist_name: 'Dr. Priya Mehta', concern: 'Acne & Breakouts', mode: 'Video', status: 'active', amount: 499, created_at: new Date().toISOString(), notes: 'Patient concerned about recurring cystic acne. Prescribed Niacinamide + Benzoyl Peroxide routine.' },
  { id: 2, patient_name: 'Rahul Sharma', specialist_name: 'Dr. Kavya Iyer', concern: 'Pigmentation & Dark Spots', mode: 'Chat', status: 'completed', amount: 299, created_at: new Date(Date.now() - 86400000).toISOString(), notes: 'Post-inflammatory hyperpigmentation. Recommended Vitamin C serum + SPF 50.' },
  { id: 3, patient_name: 'Neha Gupta', specialist_name: 'Dr. Arjun Kapoor', concern: 'Dryness & Dehydration', mode: 'Audio', status: 'new', amount: 349, created_at: new Date(Date.now() - 172800000).toISOString(), notes: '' },
  { id: 4, patient_name: 'Zara Khan', specialist_name: 'Dr. Priya Mehta', concern: 'Aging & Fine Lines', mode: 'Video', status: 'pending', amount: 699, created_at: new Date(Date.now() - 259200000).toISOString(), notes: '' },
]

export default function DermIQConsultations() {
  const [consultations, setConsultations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'new' | 'active' | 'completed'>('all')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadConsultations() }, [])

  async function loadConsultations() {
    const { data, error } = await supabase.from('dermiq_consultations').select('*').order('created_at', { ascending: false })
    if (!error && data && data.length > 0) setConsultations(data)
    else setConsultations(SEED_CONSULTATIONS)
    setLoading(false)
  }

  const filtered = tab === 'all' ? consultations : consultations.filter(c => c.status === tab)
  const counts = { all: consultations.length, new: consultations.filter(c => c.status === 'new').length, active: consultations.filter(c => c.status === 'active').length, completed: consultations.filter(c => c.status === 'completed').length }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Consultations</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Skin consultations booked through DermIQ platform — separate from Rabt consultations</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['all', 'new', 'active', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${tab === t ? C.teal : C.border}`, background: tab === t ? C.teal : '#fff', color: tab === t ? '#fff' : C.mu, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
              {['Patient', 'Specialist', 'Concern', 'Mode', 'Amount', 'Status', 'Date', ''].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: C.mu, fontSize: 13 }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: C.mu, fontSize: 13 }}>No consultations found</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }} onClick={() => setSelected(c)}>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>{c.patient_name}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: C.mu }}>{c.specialist_name}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: C.dark }}>{c.concern}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8, background: C.teal + '15', color: C.teal }}>{c.mode}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.dark }}>₹{c.amount}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: (STATUS_COLORS[c.status] || C.mu) + '18', color: STATUS_COLORS[c.status] || C.mu }}>{c.status}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 11, color: C.mu }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ padding: '12px 14px' }}>
                  <button onClick={(e) => { e.stopPropagation(); setSelected(c) }} style={{ fontSize: 11, padding: '4px 10px', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', color: C.dark }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, margin: '0 0 4px' }}>{selected.patient_name}</h2>
                <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>with {selected.specialist_name}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {[['Concern', selected.concern], ['Mode', selected.mode], ['Amount', `₹${selected.amount}`], ['Status', selected.status], ['Date', new Date(selected.created_at).toLocaleDateString('en-IN')]].map(([k, v]) => (
                <div key={k} style={{ background: C.cream, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v}</div>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 16px', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>SPECIALIST NOTES</div>
                <p style={{ fontSize: 13, color: C.dark, margin: 0, lineHeight: 1.6 }}>{selected.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
