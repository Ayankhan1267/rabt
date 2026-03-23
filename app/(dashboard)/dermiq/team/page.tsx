'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

const DERMIQ_ROLES = [
  { value: 'dermiq_admin', label: 'DermIQ Admin', desc: 'Full access to all DermIQ features', color: '#8B5CF6' },
  { value: 'dermiq_manager', label: 'DermIQ Manager', desc: 'Manage marketplace, vendors, analytics', color: C.teal },
  { value: 'dermiq_finance', label: 'DermIQ Finance', desc: 'Payouts, KYC, financial reports', color: C.gold },
  { value: 'dermiq_marketing', label: 'DermIQ Marketing', desc: 'Coupons, campaigns, analytics', color: '#EC4899' },
  { value: 'dermiq_support', label: 'DermIQ Support', desc: 'Customer support, CRM, orders', color: '#3B82F6' },
  { value: 'dermiq_ops', label: 'DermIQ Ops', desc: 'Orders, inventory management', color: C.green },
  { value: 'dermiq_specialist_manager', label: 'Specialist Manager', desc: 'Manage DermIQ specialists and consultations', color: '#F97316' },
]

export default function DermIQTeam() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showGrant, setShowGrant] = useState(false)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantRole, setGrantRole] = useState('dermiq_manager')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTeam() }, [])

  async function loadTeam() {
    const { data } = await supabase.from('profiles').select('id, name, email, role, dermiq_role').not('dermiq_role', 'is', null)
    // Also include founder/admin who auto-have access
    const { data: admins } = await supabase.from('profiles').select('id, name, email, role, dermiq_role').in('role', ['founder', 'admin'])
    const all = [...(admins || []), ...(data || [])].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    setMembers(all)
    setLoading(false)
  }

  async function grantAccess() {
    if (!grantEmail.trim()) return
    setSaving(true)
    // Find user by email
    const { data: profile } = await supabase.from('profiles').select('id, name, email').eq('email', grantEmail.trim()).maybeSingle()
    if (!profile) {
      alert('No user found with this email. They must log in to the HQ first.')
      setSaving(false)
      return
    }
    const { error } = await supabase.from('profiles').update({ dermiq_role: grantRole }).eq('id', profile.id)
    if (!error) {
      setShowGrant(false)
      setGrantEmail('')
      loadTeam()
    } else {
      alert('Error: ' + error.message)
    }
    setSaving(false)
  }

  async function revokeAccess(userId: string) {
    if (!confirm('Remove this user\'s DermIQ access?')) return
    await supabase.from('profiles').update({ dermiq_role: null }).eq('id', userId)
    loadTeam()
  }

  async function changeRole(userId: string, newRole: string) {
    await supabase.from('profiles').update({ dermiq_role: newRole }).eq('id', userId)
    loadTeam()
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Team & Access</h1>
          <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Grant or revoke DermIQ platform access — independent of Rabt team roles</p>
        </div>
        <button onClick={() => setShowGrant(true)} style={{ padding: '9px 20px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Grant Access
        </button>
      </div>

      {/* Role Legend */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: `1px solid ${C.border}`, marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: C.mu, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>DermIQ Roles</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
          {DERMIQ_ROLES.map(r => (
            <div key={r.value} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, marginTop: 4, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{r.label}</div>
                <div style={{ fontSize: 11, color: C.mu }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
              {['Member', 'Rabt Role', 'DermIQ Role', 'Action'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: C.mu }}>Loading...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: C.mu }}>No DermIQ team members yet</td></tr>
            ) : members.map((m, i) => {
              const isFounder = ['founder', 'admin'].includes(m.role)
              const roleInfo = DERMIQ_ROLES.find(r => r.value === m.dermiq_role)
              return (
                <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{m.name?.charAt(0) || '?'}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{m.name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: C.mu }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{m.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isFounder ? (
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: '#8B5CF618', color: '#8B5CF6', fontWeight: 600 }}>Full Access (Auto)</span>
                    ) : m.dermiq_role ? (
                      <select value={m.dermiq_role} onChange={e => changeRole(m.id, e.target.value)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 7, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: roleInfo?.color || C.dark, fontWeight: 600 }}>
                        {DERMIQ_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 11, color: C.mu }}>No Access</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {!isFounder && m.dermiq_role && (
                      <button onClick={() => revokeAccess(m.id)} style={{ fontSize: 11, padding: '4px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', color: C.red, fontWeight: 600 }}>Revoke</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* SQL Hint */}
      <div style={{ marginTop: 18, padding: '14px 18px', background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE' }}>
        <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0 }}>
          📋 <strong>SQL needed:</strong> Run <code>ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dermiq_role text;</code> in Supabase SQL Editor to enable DermIQ access control.
        </p>
      </div>

      {/* Grant Access Modal */}
      {showGrant && (
        <div onClick={() => setShowGrant(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, margin: '0 0 20px' }}>Grant DermIQ Access</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: C.mu, fontWeight: 600, display: 'block', marginBottom: 5 }}>User Email</label>
              <input value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="user@example.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.mu, fontWeight: 600, display: 'block', marginBottom: 5 }}>DermIQ Role</label>
              <select value={grantRole} onChange={e => setGrantRole(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                {DERMIQ_ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowGrant(false)} style={{ flex: 1, padding: 12, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.dark }}>Cancel</button>
              <button onClick={grantAccess} disabled={saving} style={{ flex: 1, padding: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                {saving ? 'Granting...' : 'Grant Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
