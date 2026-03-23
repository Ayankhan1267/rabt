'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981' }

export default function DermIQSkinProfiles() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('skin_profiles').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => {
      setProfiles(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>Skin Profiles</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>AI-generated skin profiles from DermIQ analysis — used for product matching</p>
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
              {['Name', 'Skin Type', 'Concerns', 'Fitzpatrick', 'Created'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: C.mu }}>Loading...</td></tr>
            ) : profiles.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: C.mu }}>No skin profiles yet</td></tr>
            ) : profiles.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < profiles.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>{p.name || 'Anonymous'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{p.skin_type || '—'}</span>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: C.mu }}>{Array.isArray(p.concerns) ? p.concerns.slice(0, 2).join(', ') : p.concerns || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: C.dark }}>{p.fitzpatrick || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: C.mu }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
