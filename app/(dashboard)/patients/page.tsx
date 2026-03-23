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
  const [partnerOrders, setPartnerOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'online'|'offline'|'partner'>('all')

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
        // Fetch ALL partner orders via service-role API (bypasses RLS)
        const pOrds = await fetch('/api/partner-orders').then(r => r.ok ? r.json() : [])
        setPartnerOrders(Array.isArray(pOrds) ? pOrds : [])
      }
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  // Build patient map
  const patientMap = new Map<string, any>()

  consultations.forEach(c => {
    const uid = c.user?.toString() || c.userId?.toString()
    const mongoUser = users.find((u: any) => u._id?.toString() === uid)
    const name = c.fullName || c.name || (mongoUser ? ((mongoUser.firstName || '') + ' ' + (mongoUser.lastName || '')).trim() : '') || 'Unknown'
    const phone = c.phone || mongoUser?.phoneNumber || mongoUser?.phone || ''
    const email = c.email || mongoUser?.email || ''
    const key = phone || uid || name.toLowerCase()
    const skinProfile = skinProfiles.find((sp: any) =>
      (sp.phone && sp.phone === phone) || (sp.consultationId && sp.consultationId === c._id?.toString())
    )
    const patientOrders = orders.filter((o: any) => {
      const oUid = o.userId?.toString() || o.user?.toString()
      const oPhone = o.customerPhone || o.customer_phone || ''
      return (uid && oUid === uid) || (phone && oPhone === phone)
    })
    const spent = patientOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
    if (!patientMap.has(key)) {
      patientMap.set(key, { key, name, phone, email, age: c.age || mongoUser?.age || '', source: 'online', consultations: [c], orders: patientOrders, skinProfiles: skinProfile ? [skinProfile] : [], spent, userId: uid })
    } else {
      const existing = patientMap.get(key)!
      if (!existing.consultations.find((ec: any) => ec._id === c._id)) existing.consultations.push(c)
      existing.spent = patientOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
      existing.orders = patientOrders
      if (skinProfile && !existing.skinProfiles.find((sp: any) => sp._id === skinProfile._id)) existing.skinProfiles.push(skinProfile)
      if (phone && !existing.phone) existing.phone = phone
      if (email && !existing.email) existing.email = email
    }
  })

  orders.filter((o: any) => (o.source || '').toLowerCase() === 'specialist_offline').forEach((o: any) => {
    const phone = o.customerPhone || o.customer_phone || ''
    const name = o.customerName || o.customer_name || 'Unknown'
    const email = o.customerEmail || o.customer_email || ''
    const key = phone || name.toLowerCase()
    const skinProfile = skinProfiles.find((sp: any) => sp.phone && sp.phone === phone)
    const patientOrders = orders.filter((po: any) => { const poPhone = po.customerPhone || po.customer_phone || ''; return phone && poPhone === phone })
    const spent = patientOrders.reduce((s: number, po: any) => s + (po.amount || 0), 0)
    if (!patientMap.has(key)) {
      patientMap.set(key, { key, name, phone, email, age: '', source: 'offline', consultations: [], orders: patientOrders, skinProfiles: skinProfile ? [skinProfile] : [], spent, userId: null })
    } else {
      const existing = patientMap.get(key)!
      existing.source = 'offline'
      patientOrders.forEach((po: any) => { if (!existing.orders.find((eo: any) => eo._id === po._id)) existing.orders.push(po) })
      existing.spent = existing.orders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
      if (skinProfile && !existing.skinProfiles.find((sp: any) => sp._id === skinProfile._id)) existing.skinProfiles.push(skinProfile)
    }
  })

  // 3. Partner customers — from Supabase partner_orders assigned to this specialist
  partnerOrders.forEach((po: any) => {
    const phone = po.customer_phone || ''
    const name = po.customer_name || 'Unknown'
    const email = po.customer_email || ''
    const key = phone || name.toLowerCase()
    let aiAnalysis: any = null
    try { if (po.skin_analysis) aiAnalysis = JSON.parse(po.skin_analysis) } catch {}
    const skinScore = po.skin_score || aiAnalysis?.skinScore
    const skinCategory = po.skin_category || aiAnalysis?.skinCategory
    const recommendedRange = po.recommended_range || aiAnalysis?.recommendedRange
    const skinType = po.skin_type || aiAnalysis?.skinType
    const skinProfile = aiAnalysis ? {
      ...aiAnalysis,
      skinScore, skinCategory, recommendedRange, skinType,
      phone, name, source: 'sales_partner',
      partnerName: po.partner_name || '',
      orderId: po.order_id,
    } : null
    if (!patientMap.has(key)) {
      patientMap.set(key, {
        key, name, phone, email,
        age: '',
        source: 'partner',
        partnerName: po.partner_name || '',
        consultations: [],
        orders: [po],
        skinProfiles: skinProfile ? [skinProfile] : [],
        spent: po.amount || 0,
        userId: null,
        skinScore, skinCategory, recommendedRange,
      })
    } else {
      const existing = patientMap.get(key)!
      if (existing.source !== 'online') existing.source = 'partner'
      if (!existing.orders.find((o: any) => o.id === po.id)) existing.orders.push(po)
      existing.spent = (existing.spent || 0) + (po.amount || 0)
      if (skinProfile && !existing.skinProfiles.find((e: any) => e.orderId === po.order_id)) existing.skinProfiles.push(skinProfile)
      if (!existing.skinScore) existing.skinScore = skinScore
      if (!existing.skinCategory) existing.skinCategory = skinCategory
      if (!existing.recommendedRange) existing.recommendedRange = recommendedRange
      if (!existing.partnerName) existing.partnerName = po.partner_name
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
      <style>{`
        @media (max-width: 767px) {
          .pts-stats { grid-template-columns: 1fr 1fr !important; }
          .pts-searchbar { flex-direction: column !important; }
          .pts-searchbar input { width: 100% !important; }
          .pts-filter-btns { display: flex !important; width: 100% !important; }
          .pts-table-view { display: none !important; }
          .pts-detail-side { display: none !important; }
          .pts-detail-sheet { display: flex !important; }
        }
        @media (min-width: 768px) {
          .pts-cards-view { display: none !important; }
          .pts-detail-sheet { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>My <span style={{ color: 'var(--teal)' }}>Patients</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>{filtered.length} patients &middot; Online + Offline</p>
        </div>
        <button onClick={loadAll} style={{ padding: '8px 16px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: 'var(--blue)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Refresh</button>
      </div>

      {/* Stats */}
      <div className="pts-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Patients', value: allPatients.length, color: 'var(--blue)' },
          { label: 'Online', value: allPatients.filter(p => p.source === 'online').length, color: 'var(--teal)' },
          { label: 'Offline', value: allPatients.filter(p => p.source === 'offline').length, color: 'var(--orange)' },
          { label: 'Via Partner', value: allPatients.filter(p => p.source === 'partner').length, color: 'var(--green)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="pts-searchbar" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ ...inp, flex: 1 }} />
        <div className="pts-filter-btns" style={{ display: 'flex', gap: 4, background: 'var(--s2)', borderRadius: 8, padding: 4 }}>
          {(['all','online','offline','partner'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '6px 10px', background: filter === f ? 'var(--s1)' : 'transparent', border: 'none', borderRadius: 6, color: filter === f ? 'var(--teal)' : 'var(--mu)', fontWeight: filter === f ? 700 : 500, fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
              {f === 'all' ? 'All' : f === 'partner' ? '🤝 Partner' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--teal)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {/* MOBILE CARDS */}
          <div className="pts-cards-view" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)', fontSize: 13 }}>No patients found</div>
            )}
            {filtered.map((p: any, i: number) => {
              const sp = p.skinProfiles?.[0]
              return (
                <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 12, padding: 14 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: p.source === 'offline' ? 'linear-gradient(135deg,#0197a6,#017a87)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {(p.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 1 }}>{p.phone || p.email || '—'}</div>
                    </div>
                    <span style={{ fontSize: 9, padding: '3px 7px', borderRadius: 20, fontWeight: 700, background: p.source === 'offline' ? 'var(--orL)' : p.source === 'partner' ? 'rgba(34,197,94,0.1)' : 'var(--blL)', color: p.source === 'offline' ? 'var(--orange)' : p.source === 'partner' ? 'var(--green)' : 'var(--blue)', flexShrink: 0 }}>
                      {p.source === 'partner' ? '🤝 Partner' : p.source}
                    </span>
                  </div>
                  {/* Skin & stats pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {sp?.skinType && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(1,151,166,0.1)', color: 'var(--teal)', fontWeight: 700, textTransform: 'capitalize' }}>🌿 {sp.skinType}</span>
                    )}
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--s2)', color: 'var(--mu)' }}>
                      💬 <span style={{ color: 'var(--teal)', fontWeight: 700 }}>{p.consultations.length}</span> consults
                    </span>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--s2)', color: 'var(--mu)' }}>
                      📦 <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.orders.length}</span> orders
                    </span>
                    {p.spent > 0 && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--grL)', color: 'var(--green)', fontWeight: 700 }}>Rs.{p.spent.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: p.phone ? '1fr 1fr 1fr' : '1fr', gap: 8 }}>
                    {p.phone && (
                      <a href={'https://wa.me/' + p.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + p.name + '! 🌿 Rabt Naturals ki taraf se. Koi bhi skincare sawaal ho toh hum yahan hain!')}
                        target="_blank" rel="noopener noreferrer"
                        style={{ padding: '9px 4px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, color: 'var(--green)', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        💬 WA
                      </a>
                    )}
                    {p.phone && (
                      <a href={'tel:' + p.phone.replace(/[^0-9+]/g, '')}
                        style={{ padding: '9px 4px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, color: 'var(--blue)', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📞 Call
                      </a>
                    )}
                    <button onClick={() => setSelected(selected?.key === p.key ? null : p)}
                      style={{ padding: '9px 4px', background: 'rgba(1,151,166,0.1)', border: '1px solid rgba(1,151,166,0.25)', borderRadius: 8, color: 'var(--teal)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP TABLE + DETAIL */}
          <div className="pts-table-view" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: 16, alignItems: 'start' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.8fr 0.8fr 1fr 120px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--s2)' }}>
                {['Patient', 'Skin Type / Concerns', 'Consults', 'Orders', 'Spent', 'Source', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
                  <div>No patients found</div>
                </div>
              ) : filtered.map((p: any, i: number) => {
                const sp = p.skinProfiles?.[0]
                const isSelected = selected?.key === p.key
                return (
                  <div key={i} onClick={() => setSelected(isSelected ? null : p)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 0.8fr 0.8fr 1fr 120px', gap: 0, padding: '12px 16px', borderBottom: '1px solid var(--b1)', cursor: 'pointer', background: isSelected ? 'rgba(1,151,166,0.06)' : 'transparent', transition: 'background 0.15s' }}
                    onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: p.source === 'offline' ? 'linear-gradient(135deg,#0197a6,#017a87)' : 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{p.phone || p.email || '-'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                      {sp?.skinType ? (
                        <>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--teal)', marginBottom: 3, textTransform: 'capitalize' }}>{sp.skinType}</div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(sp.skinConcerns || []).slice(0, 2).map((c: string, ci: number) => (
                              <span key={ci} style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 20, background: 'var(--orL)', color: 'var(--orange)', fontWeight: 600 }}>{c}</span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>{p.consultations?.[0]?.description?.slice(0, 40) || '—'}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: p.consultations.length > 0 ? 'var(--teal)' : 'var(--mu)' }}>{p.consultations.length}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: p.orders.length > 0 ? 'var(--blue)' : 'var(--mu)' }}>{p.orders.length}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, color: p.spent > 0 ? 'var(--gold)' : 'var(--mu)' }}>Rs.{p.spent.toLocaleString('en-IN')}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: p.source === 'offline' ? 'var(--orL)' : p.source === 'partner' ? 'rgba(34,197,94,0.1)' : 'var(--blL)', color: p.source === 'offline' ? 'var(--orange)' : p.source === 'partner' ? 'var(--green)' : 'var(--blue)' }}>
                        {p.source === 'partner' ? '🤝 Partner' : p.source === 'offline' ? 'Offline' : 'Online'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      {p.phone ? (
                        <>
                          <a href={'https://wa.me/' + p.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + p.name + '! 🌿 Rabt Naturals ki taraf se. Koi bhi skincare sawaal ho toh hum yahan hain!')}
                            target="_blank" rel="noopener noreferrer"
                            style={{ width: 30, height: 30, background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>WA</a>
                          <a href={'tel:' + p.phone.replace(/[^0-9+]/g, '')}
                            style={{ width: 30, height: 30, background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>Call</a>
                        </>
                      ) : <span style={{ fontSize: 10, color: 'var(--mu)' }}>-</span>}
                      <button onClick={() => setSelected(isSelected ? null : p)}
                        style={{ width: 30, height: 30, background: 'rgba(1,151,166,0.1)', border: '1px solid rgba(1,151,166,0.25)', borderRadius: 6, color: 'var(--teal)', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>▶</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detail Panel — desktop side */}
            {selected && (
              <div className="pts-detail-side" style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 14, padding: 20 }}>
                <DetailPanel p={selected} onClose={() => setSelected(null)} />
              </div>
            )}
          </div>

          {/* Detail Panel — mobile bottom sheet */}
          {selected && (
            <div className="pts-detail-sheet" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setSelected(null)}>
              <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '82vh', overflowY: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
                <DetailPanel p={selected} onClose={() => setSelected(null)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DetailPanel({ p, onClose }: { p: any; onClose: () => void }) {
  const sp = p.skinProfiles?.[0]
  const isPartner = p.source === 'partner'
  const scoreColor = sp?.skinScore >= 70 ? 'var(--green)' : sp?.skinScore >= 50 ? 'var(--orange)' : 'var(--red)'

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800 }}>{p.name}</div>
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: isPartner ? 'rgba(34,197,94,0.1)' : p.source === 'offline' ? 'var(--orL)' : 'var(--blL)', color: isPartner ? 'var(--green)' : p.source === 'offline' ? 'var(--orange)' : 'var(--blue)' }}>
              {isPartner ? '🤝 Partner' : p.source === 'offline' ? 'Offline' : 'Online'}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)', lineHeight: 1.5 }}>
            {p.phone || '-'}{p.email ? ' · ' + p.email : ''}{p.age ? ' · Age ' + p.age : ''}
            {isPartner && p.partnerName && <span style={{ color: 'var(--green)' }}> · via {p.partnerName}</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 18, flexShrink: 0, padding: '0 0 0 8px' }}>✕</button>
      </div>

      {/* Action buttons */}
      {p.phone && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <a href={'https://wa.me/' + p.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + p.name + '! 🌿 Rabt Naturals ki taraf se. Aapki skin ke baare mein baat karein?')}
            target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'block' }}>💬 WhatsApp</a>
          <a href={'tel:' + p.phone.replace(/[^0-9+]/g, '')}
            style={{ flex: 1, padding: '9px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 9, color: 'var(--blue)', fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'block' }}>📞 Call</a>
        </div>
      )}

      {/* Partner AI Skin Analysis — full card */}
      {isPartner && sp && (
        <div style={{ marginBottom: 14 }}>
          {/* Score banner */}
          <div style={{ background: 'linear-gradient(135deg,#003D40,#005F6A)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🔬 AI Skin Analysis</div>
                <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: '#fff' }}>{sp.skinCategory || sp.skinType || '—'}</div>
                {sp.recommendedRange && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Recommended: {sp.recommendedRange}</div>}
              </div>
              {sp.skinScore && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{sp.skinScore}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>/ 100</div>
                </div>
              )}
            </div>
            {sp.skinSummary && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px' }}>{sp.skinSummary}</div>}
          </div>

          {/* Concerns */}
          {(sp.skinConcerns || []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 6 }}>⚠ Concerns</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {sp.skinConcerns.map((c: string, ci: number) => (
                  <span key={ci} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: 'var(--red)', fontWeight: 600, border: '1px solid rgba(239,68,68,0.15)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* AM/PM routines */}
          {(sp.amRoutine?.length > 0 || sp.pmRoutine?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {[{label:'🌅 Morning', steps: sp.amRoutine, color:'#F59E0B'},{label:'🌙 Night', steps: sp.pmRoutine, color:'#818CF8'}].map(({label,steps,color},i) => steps?.length > 0 && (
                <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 8 }}>{label}</div>
                  {steps.map((s: any, j: number) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{j+1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.3 }}>{s.product}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--mu)', lineHeight: 1.4 }}>{s.instruction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Expected results */}
          {sp.expectedResults && (
            <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 8 }}>📈 Expected Results</div>
              {[['Week 4', sp.expectedResults.week4],['Week 8', sp.expectedResults.week8],['Week 12', sp.expectedResults.week12]].filter(([,v])=>v).map(([l,v],i)=>(
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--tx)', lineHeight: 1.4 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Diet */}
          {(sp.dietAdvice?.length > 0) && (
            <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 6 }}>🥗 Diet Advice</div>
              {sp.dietAdvice.slice(0,3).map((d: string, i: number) => (
                <div key={i} style={{ fontSize: 10.5, color: 'var(--tx)', marginBottom: 4, lineHeight: 1.4 }}>✓ {d}</div>
              ))}
            </div>
          )}

          {/* Specialist note */}
          {sp.specialistNote && (
            <div style={{ background: 'rgba(1,151,166,0.07)', border: '1px solid rgba(1,151,166,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 5 }}>🩺 Specialist Note</div>
              <div style={{ fontSize: 11, color: 'var(--tx)', lineHeight: 1.6 }}>{sp.specialistNote}</div>
            </div>
          )}

          {/* Product recommendations */}
          {(sp.productRecommendations?.length > 0) && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 8 }}>🛍️ Recommended Products</div>
              {sp.productRecommendations.map((pr: any, i: number) => (
                <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '8px 10px', marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: pr.priority === 'must have' ? 'rgba(1,151,166,0.15)' : 'var(--s2)', color: pr.priority === 'must have' ? 'var(--teal)' : 'var(--mu)', fontWeight: 700, flexShrink: 0, border: '1px solid var(--b1)', marginTop: 1 }}>{pr.priority || 'suggested'}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{pr.productId}</div>
                    <div style={{ fontSize: 10, color: 'var(--mu)', lineHeight: 1.4 }}>{pr.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Non-partner skin profiles */}
      {!isPartner && p.skinProfiles?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 8 }}>Skin Profile</div>
          {p.skinProfiles.map((sp: any, i: number) => (
            <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div><div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 3 }}>Skin Type</div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', textTransform: 'capitalize' }}>{sp.skinType || 'N/A'}</div></div>
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

      {p.consultations?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 8 }}>Consultations ({p.consultations.length})</div>
          {p.consultations.map((c: any, i: number) => (
            <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description?.slice(0, 50) || c.concern?.slice(0, 50) || 'General'}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>{c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : '—'} {c.scheduledTime}</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0, background: c.status === 'completed' ? 'var(--grL)' : c.status === 'accepted' ? 'rgba(20,184,166,0.15)' : 'var(--orL)', color: c.status === 'completed' ? 'var(--green)' : c.status === 'accepted' ? 'var(--teal)' : 'var(--orange)' }}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
      {p.orders?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 8 }}>Orders ({p.orders.length})</div>
          {p.orders.map((o: any, i: number) => (
            <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', marginBottom: 3 }}>Rs.{o.amount}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.products || o.product || '—'}</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, flexShrink: 0, background: (o.status || '').toLowerCase() === 'delivered' ? 'var(--grL)' : 'var(--gL)', color: (o.status || '').toLowerCase() === 'delivered' ? 'var(--green)' : 'var(--gold)', textTransform: 'capitalize' }}>{o.status || 'new'}</span>
            </div>
          ))}
        </div>
      )}
      {p.consultations?.length === 0 && p.orders?.length === 0 && p.skinProfiles?.length === 0 && (
        <div style={{ textAlign: 'center', padding: 30, color: 'var(--mu)', fontSize: 12 }}>No details available</div>
      )}
    </>
  )
}
