'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<any[]>([])
  const [specialists, setSpecialists] = useState<any[]>([])
  const [skinProfiles, setSkinProfiles] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [view, setView] = useState<'queue' | 'stats'>('queue')
  const [loading, setLoading] = useState(true)
  const [earnings, setEarnings] = useState<any[]>([])
  const audioRef = useRef<any>(null)
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  useEffect(() => {
    loadAll()
    setupRealtimeConsultations()
  }, [])

  function setupRealtimeConsultations() {
    // Listen for new consultations — play sound for specialists
    supabase.channel('new-consultations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        if (payload.new?.type === 'consultation') {
          playSound()
          toast('🌿 New consultation request!', { icon: '🔔', duration: 5000 })
        }
      }).subscribe()
  }

  function playSound() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      ;[440, 550, 660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.3)
      })
    } catch {}
  }

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const myProfile = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    setProfile(myProfile.data)

    const [earnRes] = await Promise.all([
      supabase.from('specialist_earnings').select('*').eq('specialist_id', user?.id),
    ])
    setEarnings(earnRes.data || [])

    // Load MongoDB consultations
    if (mongoUrl) {
      try {
        const [consRes, specRes, skinRes] = await Promise.all([
          fetch(mongoUrl + '/api/consultations').then(r => r.ok ? r.json() : []),
          fetch(mongoUrl + '/api/specialists').then(r => r.ok ? r.json() : []),
          fetch(mongoUrl + '/api/skinprofiles').then(r => r.ok ? r.json() : []),
        ])
        setConsultations(Array.isArray(consRes) ? consRes : [])
        setSpecialists(Array.isArray(specRes) ? specRes : [])
        setSkinProfiles(Array.isArray(skinRes) ? skinRes : [])
      } catch {}
    }
    setLoading(false)
  }

  // Filter by role
  const myConsultations = profile?.role === 'founder' || profile?.role === 'specialist_manager'
    ? consultations
    : consultations.filter(c => c.assignedSpecialist === profile?.specialist_id)

  const pending = myConsultations.filter(c => ['pending', 'scheduled', 'accepted'].includes(c.status))
  const completed = myConsultations.filter(c => c.status === 'completed')
  const cancelled = myConsultations.filter(c => c.status === 'cancelled')

  const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0)
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0)

  const RECS: Record<string, string[]> = {
    acne: ['Moong Magic Cleanser', 'Moong Magic Serum', 'Moong Magic Moisturizer', 'Moong Magic Sunscreen'],
    pigmentation: ['Masoor Glow Cleanser', 'Masoor Glow Serum', 'Masoor Glow Moisturizer', 'Moong Magic Sunscreen'],
    dry: ['Oats Care Cleanser', 'Oats Care Serum', 'Oats Care Moisturizer', 'Eye Pulse Cream'],
    sensitive: ['Oats Care Cleanser', 'Oats Care Serum', 'Oats Care Moisturizer', 'Moong Magic Sunscreen'],
    default: ['Moong Magic Serum', 'Masoor Glow Toner', 'Oats Care Moisturizer', 'Moong Magic Sunscreen'],
  }

  function getRecommendations(concern: string) {
    const c = (concern || '').toLowerCase()
    if (c.includes('acne') || c.includes('oily')) return RECS.acne
    if (c.includes('pigment') || c.includes('dark')) return RECS.pigmentation
    if (c.includes('dry')) return RECS.dry
    if (c.includes('sensitive')) return RECS.sensitive
    return RECS.default
  }

  function getSkinProfile(consultationId: string) {
    return skinProfiles.find(sp => sp.consultationId === consultationId || sp._id === consultationId)
  }

  const statusColors: Record<string, string> = {
    pending: 'var(--orange)', scheduled: 'var(--blue)', accepted: 'var(--teal)',
    completed: 'var(--green)', cancelled: 'var(--red)'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Skin <span style={{ color: 'var(--gold)' }}>Specialist</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {myConsultations.length} total · {pending.length} pending · {completed.length} completed
            {!mongoUrl && ' · Connect MongoDB for live data'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['queue', 'stats'].map(v => (
            <button key={v} onClick={() => setView(v as any)} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
              background: view === v ? 'var(--gL)' : 'rgba(255,255,255,0.05)',
              color: view === v ? 'var(--gold)' : 'var(--mu2)',
              border: `1px solid ${view === v ? 'rgba(212,168,83,0.3)' : 'var(--b1)'}`,
            }}>{v === 'queue' ? '🌿 Queue' : '📊 Stats'}</button>
          ))}
        </div>
      </div>

      {/* Earnings Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Consultations', value: myConsultations.length, color: 'var(--blue)' },
          { label: 'Pending', value: pending.length, color: 'var(--orange)' },
          { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, color: 'var(--green)' },
          { label: 'Pending Payout', value: `₹${pendingEarnings.toLocaleString('en-IN')}`, color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Loading consultations...
        </div>
      ) : view === 'queue' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Queue */}
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>
              Consultation Queue
            </div>
            {myConsultations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)', background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b1)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
                <div>No consultations{!mongoUrl ? ' · Connect MongoDB' : ''}</div>
              </div>
            )}
            {myConsultations.map(c => (
              <div key={c._id} onClick={() => setSelected(c)} style={{
                background: 'var(--s1)', border: `1px solid ${selected?._id === c._id ? 'var(--gold)' : 'var(--b1)'}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 9, cursor: 'pointer', transition: 'all 0.13s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 2 }}>
                      Age {c.age} · {c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : 'Not scheduled'} {c.scheduledTime}
                    </div>
                  </div>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: (statusColors[c.status] || 'var(--mu)') + '22', color: statusColors[c.status] || 'var(--mu)' }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--mu2)', lineHeight: 1.4 }}>{c.concern || 'No concern specified'}</div>
                {c.consultationNumber && (
                  <div style={{ fontSize: 10, color: 'var(--mu)', fontFamily: 'DM Mono', marginTop: 6 }}>{c.consultationNumber}</div>
                )}
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Patient Details
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 12 }}>Age {selected.age}</div>

                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Skin Concern</div>
                <div style={{ fontSize: 13, color: 'var(--mu2)', marginBottom: 14, lineHeight: 1.5 }}>{selected.concern || 'Not specified'}</div>

                {/* Skin Profile from MongoDB */}
                {(() => {
                  const sp = getSkinProfile(selected._id)
                  if (!sp) return null
                  return (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>AI Analysis</div>
                      <div style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>Skin Type: {sp.skinType}</div>
                        {sp.skinConcerns?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {sp.skinConcerns.map((sc: string, i: number) => (
                              <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--rdL)', color: 'var(--red)', fontWeight: 600 }}>{sc}</span>
                            ))}
                          </div>
                        )}
                        {sp.skinGoals && <div style={{ fontSize: 12, color: 'var(--mu2)' }}>Goal: {sp.skinGoals}</div>}
                      </div>
                      {sp.morningRoutine?.length > 0 && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Morning Routine</div>
                          {sp.morningRoutine.map((step: any, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--mu2)', padding: '4px 0', borderBottom: '1px solid var(--b1)' }}>
                              {step.step}. {step.productType} — {step.description}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )
                })()}

                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, marginTop: 14 }}>Recommended Products</div>
                {getRecommendations(selected.concern).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--b1)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5 }}>{p}</span>
                  </div>
                ))}

                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 14, marginBottom: 8 }}>Consultation Notes</div>
                <textarea placeholder="Add consultation notes..." rows={3} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '9px 12px', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'Outfit', outline: 'none', resize: 'none', marginBottom: 10 }} />

                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Follow-up Reminder</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[7, 14, 30].map(d => (
                    <button key={d} onClick={() => toast.success(`${d}-day follow-up set!`)} style={{ flex: 1, padding: '7px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                      {d} Days
                    </button>
                  ))}
                </div>

                <button onClick={() => toast.success('Notes saved! Earning: ₹30')} style={{ width: '100%', padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  💾 Save Consultation (+₹30)
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Stats View */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Specialists Overview */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Specialists ({specialists.length})</div>
              {specialists.map((sp, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--b1)' }}>
                  {sp.profilePhoto && <img src={sp.profilePhoto} alt={sp.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{sp.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                      {sp.totalPatients} patients · {sp.completedSessions} sessions
                    </div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: sp.isActive ? 'var(--grL)' : 'var(--rdL)', color: sp.isActive ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    {sp.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {specialists.length === 0 && <p style={{ color: 'var(--mu)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Connect MongoDB for specialist data</p>}
            </div>

            {/* Consultation Status Breakdown */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Status Breakdown</div>
              {[
                { label: 'Pending', count: pending.length, color: 'var(--orange)' },
                { label: 'Completed', count: completed.length, color: 'var(--green)' },
                { label: 'Cancelled', count: cancelled.length, color: 'var(--red)' },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--mu2)' }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 700, color: s.color }}>{s.count}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${myConsultations.length > 0 ? (s.count / myConsultations.length) * 100 : 0}%`, height: '100%', background: s.color, borderRadius: 20 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Earnings Log */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>My Earnings</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Total Earned</div>
                <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>₹{totalEarnings.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mu2)', marginBottom: 12 }}>
                ₹30 per consultation · 12% commission on orders from your leads
              </div>
              {earnings.slice(0, 5).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--b1)', fontSize: 12 }}>
                  <span style={{ color: 'var(--mu2)' }}>{e.description || e.type}</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--green)' }}>+₹{e.amount}</span>
                </div>
              ))}
              {earnings.length === 0 && <p style={{ color: 'var(--mu)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No earnings yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
