'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<any[]>([])
  const [hqUsers, setHqUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'specialist')
    setHqUsers(profiles || [])
    if (mongoUrl) {
      try {
        const res = await fetch(mongoUrl + '/api/specialists').then(r => r.ok ? r.json() : [])
        setSpecialists(Array.isArray(res) ? res : [])
      } catch { toast.error('Failed to load') }
    }
    setLoading(false)
  }

  function hasHQAccess(sp: any) {
    return hqUsers.some(u => u.email === sp.email || u.specialist_id === sp._id?.toString())
  }

  function getHQUser(sp: any) {
    return hqUsers.find(u => u.email === sp.email || u.specialist_id === sp._id?.toString())
  }

  async function createHQAccess(sp: any) {
    if (!sp.email) { toast.error('Specialist ka email nahi hai!'); return }
    setCreating(sp._id)
    try {
      const { data: existing } = await supabase.from('profiles').select('*').eq('email', sp.email).single()
      if (existing) { toast.error('Is specialist ka access pehle se hai!'); setCreating(null); return }

      const { error } = await supabase.from('profiles').insert({
        email: sp.email, name: sp.name, role: 'specialist',
        phone: sp.phoneNumber || sp.phone || '',
        specialist_id: sp._id?.toString(),
        is_active: sp.isActive !== false,
      })
      if (error) throw error

      const firstName = (sp.name || 'Specialist').split(' ')[0]
      const password = firstName + '@1234'
      toast.success(sp.name + ' ka HQ access ready!', { duration: 6000 })
      setSelected({ ...sp, _showCredentials: true, _password: password })
      loadAll()
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Try again'))
    }
    setCreating(null)
  }

  async function revokeAccess(sp: any) {
    if (!confirm(sp.name + ' ka HQ access remove karna chahte ho?')) return
    const user = getHQUser(sp)
    if (user) { await supabase.from('profiles').delete().eq('id', user.id); toast.success('Access removed!'); loadAll() }
  }

  async function resetPassword(sp: any) {
    const firstName = (sp.name || 'Specialist').split(' ')[0]
    const password = firstName + '@1234'
    setSelected({ ...sp, _showCredentials: true, _password: password })
    toast.success('Password reset!')
  }

  const activeCount = specialists.filter(sp => sp.isActive).length
  const hqAccessCount = specialists.filter(sp => hasHQAccess(sp)).length
  const totalSessions = specialists.reduce((s, sp) => s + (sp.completedSessions || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Skin <span style={{ color: 'var(--gold)' }}>Specialists</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {specialists.length} specialists · {activeCount} active · {hqAccessCount} HQ access diya
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Specialists', value: specialists.length, color: 'var(--blue)' },
          { label: 'Active', value: activeCount, color: 'var(--green)' },
          { label: 'HQ Access Diya', value: hqAccessCount, color: 'var(--gold)' },
          { label: 'Total Sessions', value: totalSessions, color: 'var(--purple)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 12.5, color: 'var(--blue)' }}>
        💡 <strong>Rahima</strong> — "Create HQ Access" dabao taaki specialist apna Rabt HQ login kar sake. Credentials automatically generate honge.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>Loading specialists...</div>
      ) : !mongoUrl ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)', background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b1)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🌿</div>
          <div>Connect MongoDB to see specialists</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : 'repeat(3, 1fr)', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            {specialists.map((sp, i) => {
              const access = hasHQAccess(sp)
              const isCreating = creating === sp._id
              return (
                <div key={i} style={{
                  background: 'var(--s1)', border: `1px solid ${selected?._id === sp._id ? 'var(--gold)' : 'var(--b1)'}`,
                  borderRadius: 14, padding: '18px', transition: 'all 0.15s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg,#880E4F,#C2185B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                      {(sp.name || 'S').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 13.5, fontWeight: 800 }}>{sp.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.email || 'No email'}</div>
                    </div>
                    <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0, background: sp.isActive ? 'var(--grL)' : 'var(--rdL)', color: sp.isActive ? 'var(--green)' : 'var(--red)' }}>
                      {sp.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                    {[
                      { label: 'Patients', value: sp.totalPatients || 0 },
                      { label: 'Sessions', value: sp.completedSessions || 0 },
                      { label: 'Earnings', value: '₹' + ((sp.totalEarnings || 0) / 1000).toFixed(1) + 'k' },
                    ].map((stat, si) => (
                      <div key={si} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, color: 'var(--gold)' }}>{stat.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginTop: 2 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    {access ? (
                      <div style={{ background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--green)' }}>✅ HQ Access Active</div>
                        <div style={{ fontSize: 10.5, color: 'var(--mu)', marginTop: 2 }}>{sp.email}</div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>❌ No HQ Access yet</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 7 }}>
                    {!access ? (
                      <button onClick={() => createHQAccess(sp)} disabled={isCreating || !sp.email} style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                        cursor: sp.email ? 'pointer' : 'not-allowed',
                        background: sp.email ? 'linear-gradient(135deg,#D4A853,#B87C30)' : 'rgba(255,255,255,0.05)',
                        color: sp.email ? '#08090C' : 'var(--mu)',
                        fontSize: 11.5, fontWeight: 700, fontFamily: 'Outfit', opacity: isCreating ? 0.7 : 1
                      }}>
                        {isCreating ? '⏳ Creating...' : sp.email ? '🔑 Create HQ Access' : 'No Email'}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => resetPassword(sp)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--blL)', color: 'var(--blue)', fontSize: 11.5, fontWeight: 600, fontFamily: 'Outfit' }}>
                          🔄 Reset Password
                        </button>
                        <button onClick={() => revokeAccess(sp)} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--rdL)', color: 'var(--red)', fontSize: 11.5, fontFamily: 'Outfit' }}>✕</button>
                      </>
                    )}
                    <button onClick={() => setSelected(selected?._id === sp._id ? null : sp)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--mu2)', fontSize: 11.5, fontFamily: 'Outfit' }}>👁</button>
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <div>
              {selected._showCredentials ? (
                <div style={{ background: 'var(--s1)', border: '2px solid var(--gold)', borderRadius: 14, padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: 'var(--gold)' }}>🔑 Login Credentials</div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ background: 'var(--s2)', borderRadius: 12, padding: '16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 12 }}>Yeh credentials specialist ko share karo:</div>
                    {[
                      { label: 'Website', value: 'localhost:3000 (ya deployed URL)' },
                      { label: 'Email', value: selected.email },
                      { label: 'Password', value: selected._password },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--b1)' : 'none' }}>
                        <span style={{ fontSize: 12, color: 'var(--mu)' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 700 }}>{item.value}</span>
                          <button onClick={() => { navigator.clipboard.writeText(item.value); toast.success('Copied!') }} style={{ padding: '2px 8px', background: 'var(--gL)', border: 'none', borderRadius: 5, color: 'var(--gold)', fontSize: 10, cursor: 'pointer', fontFamily: 'Outfit' }}>Copy</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selected.phoneNumber && (
                    <a href={'https://wa.me/' + (selected.phoneNumber || '').replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + selected.name + '! 🌿\n\nAapka Rabt HQ login ready hai!\n\n📧 Email: ' + selected.email + '\n🔑 Password: ' + selected._password + '\n\nLogin karke apne consultations aur earnings dekh sakte hain!\n\n~Rabt Naturals Team')}
                      target="_blank"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, color: 'var(--green)', fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 10 }}
                    >
                      💬 WhatsApp pe credentials bhejo
                    </a>
                  )}
                  <button onClick={() => { navigator.clipboard.writeText('Email: ' + selected.email + '\nPassword: ' + selected._password); toast.success('Credentials copied!') }} style={{ width: '100%', padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                    📋 Copy All Credentials
                  </button>
                  <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--orL)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--orange)' }}>
                    ⚠️ Specialist ko pehli baar login karke password change karne ko bolna!
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800 }}>Specialist Profile</div>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                  <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 16 }}>{selected.email} · {selected.phoneNumber}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Status', value: selected.isActive ? '● Active' : '○ Inactive', color: selected.isActive ? 'var(--green)' : 'var(--red)' },
                      { label: 'Commission', value: (selected.commissionPercentage || 12) + '%', color: 'var(--gold)' },
                      { label: 'Total Patients', value: selected.totalPatients || 0, color: 'var(--blue)' },
                      { label: 'Sessions Done', value: selected.completedSessions || 0, color: 'var(--purple)' },
                      { label: 'Total Earnings', value: '₹' + (selected.totalEarnings || 0).toLocaleString('en-IN'), color: 'var(--green)' },
                      { label: 'Withdrawn', value: '₹' + (selected.withdrawnAmount || 0).toLocaleString('en-IN'), color: 'var(--teal)' },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selected.phoneNumber && (
                      <a href={'https://wa.me/' + (selected.phoneNumber || '').replace(/[^0-9]/g, '')} target="_blank" style={{ flex: 1, padding: 10, background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, color: 'var(--green)', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                        💬 WhatsApp
                      </a>
                    )}
                    {!hasHQAccess(selected) && (
                      <button onClick={() => createHQAccess(selected)} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        🔑 Create HQ Access
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}