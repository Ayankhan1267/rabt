'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function PatientsPage() {
  const [mongoSpec, setMongoSpec] = useState<any>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [skinProfiles, setSkinProfiles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'online'|'offline'>('all')

  useEffect(() => { setMounted(true); loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
      if (!url) { setLoading(false); return }
      const [specRes, consRes, ordRes, skinRes, userRes] = await Promise.all([
        fetch(url + '/api/specialists').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/consultations').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/orders').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/skinprofiles').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/users').then(r => r.ok ? r.json() : []),
      ])
      const allSpecs = Array.isArray(specRes) ? specRes : []
      const mySpec = allSpecs.find((s: any) => s.email?.toLowerCase() === prof?.email?.toLowerCase())
      setMongoSpec(mySpec)
      if (mySpec) {
        const allCons = Array.isArray(consRes) ? consRes : []
        const allOrders = Array.isArray(ordRes) ? ordRes : []
        const allSkins = Array.isArray(skinRes) ? skinRes : []
        const allUsers = Array.isArray(userRes) ? userRes : []
        // FIX: use c.user (ObjectId) not c.userId
        const myCons = allCons.filter((c: any) => c.assignedSpecialist?.toString() === mySpec._id?.toString())
        setConsultations(myCons)
        const myPatientUserIds = new Set(myCons.map((c: any) => c.user?.toString() || c.userId?.toString()).filter(Boolean))
        setOrders(allOrders.filter((o: any) => {
          const uid = o.userId?.toString() || o.user?.toString()
          const src = (o.source || '').toLowerCase()
          return (uid && myPatientUserIds.has(uid)) || 
                 (src === 'specialist_offline' && (o.specialistId?.toString() === mySpec._id?.toString() || !o.specialistId))
        }))
        const myConsIds = new Set(myCons.map((c: any) => c._id?.toString()))
        setSkinProfiles(allSkins.filter((p: any) =>
          p.specialistId?.toString() === mySpec._id?.toString() ||
          (p.consultationId && myConsIds.has(p.consultationId?.toString()))
        ))
        setUsers(allUsers)
      }
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  // Build patient map using phone as key (more reliable than name)
  const patientMap = new Map<string, any>()

  // 1. Online patients from consultations
  consultations.forEach(c => {
    // FIX: use c.user not c.userId
    const uid = c.user?.toString() || c.userId?.toString()
    const mongoUser = users.find((u: any) => u._id?.toString() === uid)
    // FIX: use c.fullName not c.name
    const name = c.fullName || c.name || (mongoUser ? ((mongoUser.firstName || '') + ' ' + (mongoUser.lastName || '')).trim() : '') || 'Unknown'
    const phone = c.phone || mongoUser?.phoneNumber || mongoUser?.phone || ''
    const email = c.email || mongoUser?.email || ''
    const key = phone || uid || name.toLowerCase()
    
    const skinProfile = skinProfiles.find((sp: any) => 
      (sp.phone && sp.phone === phone) ||
      (sp.consultationId && sp.consultationId === c._id?.toString())
    )

    const patientOrders = orders.filter((o: any) => {
      const oUid = o.userId?.toString() || o.user?.toString()
      const oPhone = o.customerPhone || o.customer_phone || ''
      return (uid && oUid === uid) || (phone && oPhone === phone)
    })

    const spent = patientOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0)

    if (!patientMap.has(key)) {
      patientMap.set(key, {
        key, name, phone, email,
        age: c.age || mongoUser?.age || '',
        source: 'online',
        consultations: [c],
        orders: patientOrders,
        skinProfiles: skinProfile ? [skinProfile] : [],
        spent,
        userId: uid,
      })
    } else {
      const existing = patientMap.get(key)!
      // FIX: properly push consultation
      if (!existing.consultations.find((ec: any) => ec._id === c._id)) {
        existing.consultations.push(c)
      }
      existing.spent = patientOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
      existing.orders = patientOrders
      if (skinProfile && !existing.skinProfiles.find((sp: any) => sp._id === skinProfile._id)) {
        existing.skinProfiles.push(skinProfile)
      }
      if (phone && !existing.phone) existing.phone = phone
      if (email && !existing.email) existing.email = email
    }
  })

  // 2. Offline patients from specialist offline orders
  orders.filter((o: any) => (o.source || '').toLowerCase() === 'specialist_offline').forEach((o: any) => {
    const phone = o.customerPhone || o.customer_phone || ''
    const name = o.customerName || o.customer_name || 'Unknown'
    const email = o.customerEmail || o.customer_email || ''
    const key = phone || name.toLowerCase()

    const skinProfile = skinProfiles.find((sp: any) => sp.phone && sp.phone === phone)
    const patientOrders = orders.filter((po: any) => {
      const poPhone = po.customerPhone || po.customer_phone || ''
      return phone && poPhone === phone
    })
    const spent = patientOrders.reduce((s: number, po: any) => s + (po.amount || 0), 0)

    if (!patientMap.has(key)) {
      patientMap.set(key, {
        key, name, phone, email,
        age: '',
        source: 'offline',
        consultations: [],
        orders: patientOrders,
        skinProfiles: skinProfile ? [skinProfile] : [],
        spent,
        userId: null,
      })
    } else {
      const existing = patientMap.get(key)!
      existing.source = 'offline'
      patientOrders.forEach((po: any) => {
        if (!existing.orders.find((eo: any) => eo._id === po._id)) existing.orders.push(po)
      })
      existing.spent = existing.orders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
      if (skinProfile && !existing.skinProfiles.find((sp: any) => sp._id === skinProfile._id)) {
        existing.skinProfiles.push(skinProfile)
      }
    }
  })

  const allPatients = Array.from(patientMap.values())
  const filtered = allPatients.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search)
    const matchFilter = filter === 'all' || p.source === filter
    return matchSearch && matchFilter
  })

  const inp: any = { background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none' }

  if (!mounted) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>My <span style={{ color: 'var(--gold)' }}>Patients</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>{filtered.length} patients &middot; Online + Offline</p>
        </div>
        <button onClick={loadAll} style={{ padding: '8px 16px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: 'var(--blue)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Refresh</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Patients', value: allPatients.length, color: 'var(--blue)' },
          { label: 'Online', value: allPatients.filter(p => p.source === 'online').length, color: 'var(--teal)' },
          { label: 'Offline', value: allPatients.filter(p => p.source === 'offline').length, color: 'var(--orange)' },
          { label: 'Total Revenue', value: 'Rs.' + allPatients.reduce((s: number, p: any) => s + p.spent, 0).toLocaleString('en-IN'), color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ ...inp, flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, background: 'var(--s2)', borderRadius: 8, padding: 4 }}>
          {(['all','online','offline'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', background: filter === f ? 'var(--s1)' : 'transparent', border: 'none', borderRadius: 6, color: filter === f ? 'var(--gold)' : 'var(--mu)', fontWeight: filter === f ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit', textTransform: 'capitalize' }}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 16, alignItems: 'start' }}>
          {/* List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.8fr 0.8fr 1fr 120px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--s2)' }}>
              {['Patient', 'Skin Type / Concerns', 'Consults', 'Orders', 'Spent', 'Source', 'Actions'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>\uD83C\uDF3F</div>
                <div>No patients found</div>
              </div>
            ) : filtered.map((p: any, i: number) => {
              const sp = p.skinProfiles?.[0]
              const isSelected = selected?.key === p.key
              return (
                <div key={i} onClick={() => setSelected(isSelected ? null : p)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.8fr 0.8fr 1fr 120px', gap: 0, padding: '12px 16px', borderBottom: '1px solid var(--b1)', cursor: 'pointer', background: isSelected ? 'var(--gL)' : 'transparent', transition: 'background 0.15s' }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                  {/* Patient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: p.source === 'offline' ? 'linear-gradient(135deg,#D4A853,#B87C30)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {(p.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{p.phone || p.email || '-'}</div>
                    </div>
                  </div>

                  {/* Skin */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                    {sp?.skinType ? (
                      <>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gold)', marginBottom: 3, textTransform: 'capitalize' }}>{sp.skinType}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(sp.skinConcerns || []).slice(0, 2).map((c: string, ci: number) => (
                            <span key={ci} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 20, background: 'var(--orL)', color: 'var(--orange)', fontWeight: 600 }}>{c}</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>
                        {p.consultations?.[0]?.description?.slice(0, 40) || '\u2014'}
                      </div>
                    )}
                  </div>

                  {/* Consults */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: p.consultations.length > 0 ? 'var(--teal)' : 'var(--mu)' }}>{p.consultations.length}</span>
                  </div>

                  {/* Orders */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: p.orders.length > 0 ? 'var(--blue)' : 'var(--mu)' }}>{p.orders.length}</span>
                  </div>

                  {/* Spent */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, color: p.spent > 0 ? 'var(--gold)' : 'var(--mu)' }}>Rs.{p.spent.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Source */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: p.source === 'offline' ? 'var(--orL)' : 'var(--blL)', color: p.source === 'offline' ? 'var(--orange)' : 'var(--blue)' }}>
                      {p.source === 'offline' ? 'Offline' : 'Online'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    {p.phone ? (
                      <>
                        <a href={'https://wa.me/' + p.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + p.name + '! \uD83C\uDF3F Rabt Naturals ki taraf se. Koi bhi skincare sawaal ho toh hum yahan hain!')}
                          target="_blank" rel="noopener noreferrer" title="WhatsApp"
                          style={{ width: 30, height: 30, background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}>
                          WA
                        </a>
                        <a href={'tel:' + p.phone.replace(/[^0-9+]/g, '')} title="Call"
                          style={{ width: 30, height: 30, background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}>
                          Call
                        </a>
                      </>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--mu)' }}>-</span>
                    )}
                    <button onClick={() => setSelected(isSelected ? null : p)}
                      style={{ width: 30, height: 30, background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                      &#x25B6;
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>
                    {selected.phone || '-'}{selected.email ? ' \u00B7 ' + selected.email : ''}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 18 }}>&#x2715;</button>
              </div>

              {selected.phone && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <a href={'https://wa.me/' + selected.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + selected.name + '! \uD83C\uDF3F Rabt Naturals ki taraf se. Aapki skin ke baare mein baat karein?')}
                    target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                    WA
                  </a>
                  <a href={'tel:' + selected.phone.replace(/[^0-9+]/g, '')}
                    style={{ flex: 1, padding: '10px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 9, color: 'var(--blue)', fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                    Call
                  </a>
                </div>
              )}

              {/* Skin Profile */}
              {selected.skinProfiles?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 8 }}>Skin Profile</div>
                  {selected.skinProfiles.map((sp: any, i: number) => (
                    <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div><div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 3 }}>Skin Type</div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textTransform: 'capitalize' }}>{sp.skinType || 'N/A'}</div></div>
                        <div><div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 3 }}>Age</div><div style={{ fontSize: 13, fontWeight: 700 }}>{sp.age || 'N/A'}</div></div>
                      </div>
                      {(sp.skinConcerns || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                          {sp.skinConcerns.map((c: string, ci: number) => (
                            <span key={ci} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--orL)', color: 'var(--orange)', fontWeight: 600 }}>{c}</span>
                          ))}
                        </div>
                      )}
                      {sp.notes && <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>{sp.notes}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Consultations */}
              {selected.consultations?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 8 }}>Consultations ({selected.consultations.length})</div>
                  {selected.consultations.map((c: any, i: number) => (
                    <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description?.slice(0, 50) || c.concern?.slice(0, 50) || 'General'}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>{c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : '\u2014'} {c.scheduledTime}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0, background: c.status === 'completed' ? 'var(--grL)' : c.status === 'accepted' ? 'rgba(20,184,166,0.15)' : 'var(--orL)', color: c.status === 'completed' ? 'var(--green)' : c.status === 'accepted' ? 'var(--teal)' : 'var(--orange)' }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Orders */}
              {selected.orders?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 8 }}>Orders ({selected.orders.length})</div>
                  {selected.orders.map((o: any, i: number) => (
                    <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 3 }}>Rs.{o.amount}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.products || o.product || '\u2014'}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0, background: (o.status || '').toLowerCase() === 'delivered' ? 'var(--grL)' : 'var(--gL)', color: (o.status || '').toLowerCase() === 'delivered' ? 'var(--green)' : 'var(--gold)', textTransform: 'capitalize' }}>{o.status || 'new'}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.consultations?.length === 0 && selected.orders?.length === 0 && selected.skinProfiles?.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--mu)', fontSize: 12 }}>No details available</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


