'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316', pink: '#EC4899',
}

type Stage = 'new_lead' | 'contacted' | 'interested' | 'offer_sent' | 'won' | 'lost'
type OutreachType = 'call' | 'whatsapp' | 'both'

interface Lead {
  id: string
  name: string
  phone: string
  skinType: string
  concerns: string[]
  profileComplete: boolean
  stage: Stage
  lastContact: string | null
  recommendedProducts: string[]
  aiPitch: string | null
  orderValue: number | null
  source: 'skin_profile' | 'direct' | 'crm' | 'referral'
  notes: string
}

const STAGE_META: Record<Stage, { label: string; color: string; icon: string }> = {
  new_lead:    { label: 'New Lead',     color: C.blue,   icon: '🆕' },
  contacted:   { label: 'Contacted',   color: C.gold,   icon: '📞' },
  interested:  { label: 'Interested',  color: C.orange, icon: '🔥' },
  offer_sent:  { label: 'Offer Sent',  color: C.purple, icon: '💌' },
  won:         { label: 'Closed Won',  color: C.green,  icon: '🏆' },
  lost:        { label: 'Lost',        color: C.red,    icon: '❌' },
}

const STAGES: Stage[] = ['new_lead', 'contacted', 'interested', 'offer_sent', 'won', 'lost']

const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Priya Sharma', phone: '+919876543210', skinType: 'Oily', concerns: ['Acne', 'Dark Spots'], profileComplete: true, stage: 'new_lead', lastContact: null, recommendedProducts: ['Glow Serum 30ml', 'Niacinamide Toner'], aiPitch: null, orderValue: null, source: 'skin_profile', notes: '' },
  { id: '2', name: 'Sneha Patel', phone: '+919765432109', skinType: 'Dry', concerns: ['Dullness', 'Fine Lines'], profileComplete: true, stage: 'interested', lastContact: new Date(Date.now() - 86400000).toISOString(), recommendedProducts: ['Vitamin C Serum', 'Hydrating Cream'], aiPitch: 'Sneha ji, aapki dry skin ke liye Vitamin C Serum perfect rahega — 30 din mein glow guaranteed!', orderValue: null, source: 'skin_profile', notes: 'Very interested, needs COD option' },
  { id: '3', name: 'Rahul Verma', phone: '+919654321098', skinType: 'Combination', concerns: ['Hairfall', 'Dandruff'], profileComplete: true, stage: 'offer_sent', lastContact: new Date(Date.now() - 3600000).toISOString(), recommendedProducts: ['Keratin Hair Mask', 'Scalp Serum'], aiPitch: null, orderValue: 1398, source: 'skin_profile', notes: '' },
  { id: '4', name: 'Anita Joshi', phone: '+919543210987', skinType: 'Normal', concerns: ['Pigmentation'], profileComplete: false, stage: 'new_lead', lastContact: null, recommendedProducts: [], aiPitch: null, orderValue: null, source: 'direct', notes: '' },
  { id: '5', name: 'Vikram Singh', phone: '+919432109876', skinType: 'Oily', concerns: ['Acne', 'Oily T-zone'], profileComplete: true, stage: 'won', lastContact: new Date(Date.now() - 172800000).toISOString(), recommendedProducts: ['Glow Serum 30ml', 'Clay Mask'], aiPitch: null, orderValue: 1598, source: 'skin_profile', notes: 'Happy customer, asked for referral code' },
  { id: '6', name: 'Meera Agarwal', phone: '+919321098765', skinType: 'Sensitive', concerns: ['Redness', 'Irritation'], profileComplete: true, stage: 'contacted', lastContact: new Date(Date.now() - 7200000).toISOString(), recommendedProducts: ['Calming Serum', 'Gentle Cleanser'], aiPitch: null, orderValue: null, source: 'crm', notes: '' },
]

const PRODUCTS_BY_CONCERN: Record<string, string[]> = {
  'Acne':        ['Salicylic Acid Serum', 'Niacinamide Toner', 'Clay Mask'],
  'Dark Spots':  ['Vitamin C Serum 30ml', 'Glow Serum', 'AHA Toner'],
  'Dullness':    ['Vitamin C Serum', 'Glow Serum 30ml', 'Exfoliating Scrub'],
  'Fine Lines':  ['Retinol Night Cream', 'Collagen Booster', 'Peptide Serum'],
  'Dryness':     ['Hydrating Cream', 'Hyaluronic Acid Serum', 'Night Mask'],
  'Hairfall':    ['Keratin Hair Mask', 'Scalp Serum 50ml', 'Hair Growth Oil'],
  'Dandruff':    ['Scalp Serum 50ml', 'Anti-dandruff Shampoo', 'Tea Tree Oil'],
  'Pigmentation':['Vitamin C Serum', 'Kojic Acid Cream', 'SPF 50 Sunscreen'],
  'Oily T-zone': ['Clay Mask', 'Niacinamide Toner', 'Oil-free Moisturiser'],
  'Redness':     ['Calming Serum', 'Centella Cream', 'Gentle Cleanser'],
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`
  return `${Math.round(diff / 86400000)}d ago`
}

const TABS = ['Pipeline', 'Skin Profile Leads', 'Direct Outreach', 'Scripts & Objections', 'Performance']

export default function SalesAgentPage() {
  const [tab, setTab] = useState('Pipeline')
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [calling, setCalling] = useState<string | null>(null)
  const [outreachType, setOutreachType] = useState<OutreachType>('call')
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', phone: '', skinType: 'Oily', concerns: '', source: 'direct' as Lead['source'] })
  const [skinProfileLeads, setSkinProfileLeads] = useState<any[]>([])
  const [loadingSP, setLoadingSP] = useState(false)
  const [autoSettings, setAutoSettings] = useState({
    autoOnProfileComplete: true,
    autoFollowupDays: '2',
    outreachChannel: 'call',
    maxAttempts: '3',
  })

  // Load skin profiles from MongoDB
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_MONGO_API_URL || (typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null)
    if (!url) return
    setLoadingSP(true)
    Promise.all([
      fetch(url + '/api/skinprofiles').then(r => r.ok ? r.json() : []),
      fetch(url + '/api/users').then(r => r.ok ? r.json() : []),
    ]).then(([profiles, users]) => {
      const completed = (Array.isArray(profiles) ? profiles : [])
        .filter((p: any) => p.step >= 5 || p.completed)
        .map((p: any) => {
          const user = (Array.isArray(users) ? users : []).find((u: any) => u._id === p.userId || u.id === p.userId)
          return { ...p, userName: user?.name || p.name || 'Unknown', userPhone: user?.phone || p.phone || '', userEmail: user?.email || p.email || '' }
        })
      setSkinProfileLeads(completed)
    }).catch(() => {}).finally(() => setLoadingSP(false))
  }, [])

  // Generate AI pitch for a lead
  const generatePitch = useCallback(async (lead: Lead) => {
    setGenerating(lead.id)
    try {
      const res = await fetch('/api/sales/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          skinType: lead.skinType,
          concerns: lead.concerns,
          source: lead.source,
        }),
      })
      const data = await res.json()
      if (data.pitch) {
        setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, aiPitch: data.pitch, recommendedProducts: data.products || l.recommendedProducts } : l))
        if (selectedLead?.id === lead.id) setSelectedLead(l => l ? { ...l, aiPitch: data.pitch, recommendedProducts: data.products || l.recommendedProducts } : l)
        toast.success('AI pitch ready!')
      }
    } catch { toast.error('Pitch generation failed') }
    finally { setGenerating(null) }
  }, [selectedLead])

  // Trigger sales call
  const startCall = useCallback(async (lead: Lead) => {
    if (!lead.phone) { toast.error('Phone number missing'); return }
    setCalling(lead.id)
    try {
      const res = await fetch('/api/sales/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name, phone: lead.phone,
          skinType: lead.skinType, concerns: lead.concerns,
          recommendedProducts: lead.recommendedProducts,
          aiPitch: lead.aiPitch,
          outreachType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${lead.name} ko call ho raha hai!`)
        setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, stage: 'contacted', lastContact: new Date().toISOString() } : l))
      } else {
        toast.error(data.error || 'Call failed')
      }
    } catch { toast.error('Server error') }
    finally { setCalling(null) }
  }, [outreachType])

  function moveStage(leadId: string, stage: Stage) {
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, stage } : l))
    if (selectedLead?.id === leadId) setSelectedLead(l => l ? { ...l, stage } : l)
    toast.success(`Stage updated → ${STAGE_META[stage].label}`)
  }

  function addLead() {
    if (!newLead.name || !newLead.phone) { toast.error('Name aur phone daalo'); return }
    const lead: Lead = {
      id: Date.now().toString(),
      name: newLead.name, phone: newLead.phone,
      skinType: newLead.skinType,
      concerns: newLead.concerns.split(',').map(c => c.trim()).filter(Boolean),
      profileComplete: false, stage: 'new_lead', lastContact: null,
      recommendedProducts: [], aiPitch: null, orderValue: null,
      source: newLead.source, notes: '',
    }
    setLeads(ls => [lead, ...ls])
    setNewLead({ name: '', phone: '', skinType: 'Oily', concerns: '', source: 'direct' })
    setShowAddLead(false)
    toast.success('Lead added!')
  }

  function addSkinProfileLead(sp: any) {
    const concerns = [sp.primaryConcern, sp.secondaryConcern, ...(sp.concerns || [])].filter(Boolean)
    const existing = leads.find(l => l.phone === sp.userPhone || l.name === sp.userName)
    if (existing) { toast.error('Lead already exists'); return }
    const lead: Lead = {
      id: 'sp_' + sp._id,
      name: sp.userName, phone: sp.userPhone || '',
      skinType: sp.skinType || 'Normal',
      concerns, profileComplete: true, stage: 'new_lead',
      lastContact: null, recommendedProducts: [], aiPitch: null,
      orderValue: null, source: 'skin_profile', notes: '',
    }
    setLeads(ls => [lead, ...ls])
    toast.success(`${sp.userName} pipeline mein add ho gaya`)
  }

  const wonLeads = leads.filter(l => l.stage === 'won')
  const totalRevenue = wonLeads.reduce((s, l) => s + (l.orderValue || 0), 0)
  const convRate = leads.length > 0 ? ((wonLeads.length / leads.length) * 100).toFixed(1) : '0'

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, margin: 0 }}>AI Sales Agent</h1>
              <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Skin profile → AI pitch → Call → Close sale · Auto follow-up</p>
            </div>
          </div>
          <button onClick={() => setShowAddLead(true)} style={{ padding: '9px 20px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            + Add Lead
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Leads', value: leads.length.toString(), color: C.blue, icon: '👥' },
          { label: 'In Pipeline', value: leads.filter(l => !['won','lost'].includes(l.stage)).length.toString(), color: C.orange, icon: '🔥' },
          { label: 'Closed Won', value: wonLeads.length.toString(), color: C.green, icon: '🏆' },
          { label: 'Conversion Rate', value: convRate + '%', color: C.teal, icon: '📈' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: k.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: C.mu }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 6, width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: tab === t ? 700 : 500, background: tab === t ? `linear-gradient(135deg,${C.teal},${C.teal2})` : 'transparent', color: tab === t ? '#fff' : C.mu }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── PIPELINE TAB ── */}
      {tab === 'Pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? '1fr 380px' : '1fr', gap: 20 }}>
          {/* Kanban */}
          <div>
            <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
              <div style={{ display: 'flex', gap: 14, minWidth: 900 }}>
                {STAGES.filter(s => s !== 'lost').map(stage => {
                  const stageMeta = STAGE_META[stage]
                  const stageLeads = leads.filter(l => l.stage === stage)
                  return (
                    <div key={stage} style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{stageMeta.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: stageMeta.color }}>{stageMeta.label}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: stageMeta.color + '15', color: stageMeta.color }}>{stageLeads.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {stageLeads.map(lead => (
                          <div key={lead.id} onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                            style={{ background: '#fff', border: `1.5px solid ${selectedLead?.id === lead.id ? C.teal : C.border}`, borderRadius: 14, padding: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{lead.name}</div>
                            <div style={{ fontSize: 11, color: C.mu, marginBottom: 6 }}>{lead.skinType} · {lead.concerns.slice(0, 2).join(', ')}</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                              {lead.profileComplete && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: C.green + '15', color: C.green, fontWeight: 700 }}>✅ Profile</span>}
                              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: C.blue + '15', color: C.blue, fontWeight: 700 }}>{lead.source.replace('_', ' ')}</span>
                            </div>
                            {lead.lastContact && <div style={{ fontSize: 10, color: C.mu }}>Last: {fmtTime(lead.lastContact)}</div>}
                            {lead.orderValue && <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>₹{lead.orderValue.toLocaleString('en-IN')}</div>}
                            {/* Quick actions */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                              <button onClick={e => { e.stopPropagation(); generatePitch(lead) }} disabled={generating === lead.id}
                                style={{ flex: 1, padding: '5px 0', background: C.purple + '15', color: C.purple, border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                                {generating === lead.id ? '...' : '✨ Pitch'}
                              </button>
                              <button onClick={e => { e.stopPropagation(); startCall(lead) }} disabled={calling === lead.id}
                                style={{ flex: 1, padding: '5px 0', background: C.green + '15', color: C.green, border: 'none', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                                {calling === lead.id ? '...' : '📞 Call'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lost leads mini */}
            {leads.filter(l => l.stage === 'lost').length > 0 && (
              <div style={{ marginTop: 20, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 10 }}>❌ Lost Leads ({leads.filter(l => l.stage === 'lost').length})</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {leads.filter(l => l.stage === 'lost').map(l => (
                    <div key={l.id} style={{ padding: '6px 12px', background: C.red + '08', border: `1px solid ${C.red}20`, borderRadius: 8, fontSize: 12 }}>
                      {l.name} · {l.skinType}
                      <button onClick={() => moveStage(l.id, 'new_lead')} style={{ marginLeft: 8, fontSize: 10, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Re-engage →</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lead Detail Panel */}
          {selectedLead && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, position: 'sticky', top: 20, height: 'fit-content', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700 }}>{selectedLead.name}</div>
                  <div style={{ fontSize: 12, color: C.mu }}>{selectedLead.phone}</div>
                </div>
                <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.mu }}>✕</button>
              </div>

              {/* Skin info */}
              <div style={{ background: C.bg, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Skin Profile</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.teal + '15', color: C.teal, fontWeight: 700 }}>{selectedLead.skinType} Skin</span>
                  {selectedLead.concerns.map(c => (
                    <span key={c} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.orange + '15', color: C.orange, fontWeight: 700 }}>{c}</span>
                  ))}
                </div>
              </div>

              {/* Stage changer */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Move Stage</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STAGES.map(s => (
                    <button key={s} onClick={() => moveStage(selectedLead.id, s)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${selectedLead.stage === s ? STAGE_META[s].color : C.border}`, background: selectedLead.stage === s ? STAGE_META[s].color + '15' : '#fff', color: selectedLead.stage === s ? STAGE_META[s].color : C.mu, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {STAGE_META[s].icon} {STAGE_META[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended products */}
              {selectedLead.recommendedProducts.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Recommended Products</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedLead.recommendedProducts.map((p, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: C.teal + '08', border: `1px solid ${C.teal}20`, borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{p}</span>
                        <span style={{ fontSize: 10, color: C.mu }}>#{i + 1} pick</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Pitch */}
              {selectedLead.aiPitch ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>✨ AI Sales Pitch</div>
                  <div style={{ padding: '12px 14px', background: C.purple + '08', border: `1px solid ${C.purple}20`, borderRadius: 12, fontSize: 12, lineHeight: 1.7, color: C.dark }}>
                    {selectedLead.aiPitch}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(selectedLead.aiPitch!); toast.success('Pitch copied!') }}
                    style={{ marginTop: 8, fontSize: 11, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                    Copy Pitch →
                  </button>
                </div>
              ) : (
                <button onClick={() => generatePitch(selectedLead)} disabled={generating === selectedLead.id}
                  style={{ width: '100%', padding: '11px', background: C.purple + '15', color: C.purple, border: `1px solid ${C.purple}30`, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: generating === selectedLead.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 12 }}>
                  {generating === selectedLead.id ? '⏳ Generating pitch...' : '✨ Generate AI Pitch'}
                </button>
              )}

              {/* Outreach channel */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Outreach Channel</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['call', 'whatsapp', 'both'] as OutreachType[]).map(t => (
                    <button key={t} onClick={() => setOutreachType(t)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${outreachType === t ? C.teal : C.border}`, background: outreachType === t ? C.teal + '10' : '#fff', color: outreachType === t ? C.teal : C.mu, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {t === 'call' ? '📞' : t === 'whatsapp' ? '💬' : '🔄'} {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call button */}
              <button onClick={() => startCall(selectedLead)} disabled={calling === selectedLead.id}
                style={{ width: '100%', padding: '13px', background: calling === selectedLead.id ? C.mu : `linear-gradient(135deg,${C.green},#059669)`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: calling === selectedLead.id ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: 8 }}>
                {calling === selectedLead.id ? '⏳ Connecting...' : `📞 Start ${outreachType === 'both' ? 'Call + WhatsApp' : outreachType === 'whatsapp' ? 'WhatsApp' : 'Sales Call'}`}
              </button>

              {/* Order value (for won) */}
              {selectedLead.stage === 'won' && (
                <div style={{ padding: '10px 14px', background: C.green + '10', border: `1px solid ${C.green}30`, borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>🏆 Closed Won</div>
                  {selectedLead.orderValue && <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: C.green }}>₹{selectedLead.orderValue.toLocaleString('en-IN')}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SKIN PROFILE LEADS ── */}
      {tab === 'Skin Profile Leads' && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.teal + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Skin Profile Completed Leads</div>
              <div style={{ fontSize: 12, color: C.mu }}>
                {loadingSP ? 'Loading...' : `${skinProfileLeads.length} customers ne skin profile complete kiya — inhe AI sales call karo`}
              </div>
            </div>
          </div>

          {skinProfileLeads.length === 0 && !loadingSP && (
            <div style={{ background: '#fff', border: `2px dashed ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center', color: C.mu }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌿</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Koi skin profile data nahi mila</div>
              <div style={{ fontSize: 12 }}>NEXT_PUBLIC_MONGO_API_URL set karo rabtnaturals.com backend ke liye</div>
            </div>
          )}

          {skinProfileLeads.map((sp, i) => {
            const concerns = [sp.primaryConcern, sp.secondaryConcern, ...(sp.concerns || [])].filter(Boolean)
            const alreadyAdded = leads.some(l => l.name === sp.userName || l.phone === sp.userPhone)
            const recs = concerns.flatMap(c => PRODUCTS_BY_CONCERN[c] || []).slice(0, 3)
            return (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800 }}>{sp.userName}</div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.green + '15', color: C.green, fontWeight: 700 }}>✅ Profile Complete</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.mu, marginBottom: 8 }}>
                      {sp.userPhone && <span>📞 {sp.userPhone} · </span>}
                      {sp.skinType && <span>Skin: {sp.skinType} · </span>}
                      Step: {sp.step || '?'}/6
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {concerns.map((c, ci) => (
                        <span key={ci} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.orange + '15', color: C.orange, fontWeight: 700 }}>{c}</span>
                      ))}
                    </div>
                    {recs.length > 0 && (
                      <div style={{ fontSize: 12, color: C.mu }}>
                        Recommended: <strong style={{ color: C.teal }}>{recs.join(', ')}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => {
                      const lead: Lead = {
                        id: 'sp_' + (sp._id || i),
                        name: sp.userName, phone: sp.userPhone || '',
                        skinType: sp.skinType || 'Normal',
                        concerns, profileComplete: true, stage: 'new_lead',
                        lastContact: null, recommendedProducts: recs,
                        aiPitch: null, orderValue: null,
                        source: 'skin_profile', notes: '',
                      }
                      if (!alreadyAdded) {
                        setLeads(ls => [lead, ...ls])
                        toast.success(`${sp.userName} pipeline mein add ho gaya!`)
                      }
                      setSelectedLead(lead)
                      setTab('Pipeline')
                    }} style={{ padding: '8px 16px', background: alreadyAdded ? C.border : `linear-gradient(135deg,${C.teal},${C.teal2})`, color: alreadyAdded ? C.mu : '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: alreadyAdded ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                      {alreadyAdded ? '✅ In Pipeline' : '+ Add to Pipeline'}
                    </button>
                    {sp.userPhone && (
                      <button onClick={() => {
                        const lead: Lead = { id: 'sp_' + (sp._id || i), name: sp.userName, phone: sp.userPhone, skinType: sp.skinType || 'Normal', concerns, profileComplete: true, stage: 'new_lead', lastContact: null, recommendedProducts: recs, aiPitch: null, orderValue: null, source: 'skin_profile', notes: '' }
                        startCall(lead)
                      }} style={{ padding: '8px 16px', background: C.green + '15', color: C.green, border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                        📞 Direct Call
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DIRECT OUTREACH ── */}
      {tab === 'Direct Outreach' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Auto settings */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>⚡ Auto-Outreach Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: C.bg, borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Skin profile complete → Auto call</div>
                  <div style={{ fontSize: 11, color: C.mu }}>Profile complete hote hi AI sales call trigger ho</div>
                </div>
                <div onClick={() => setAutoSettings(s => ({ ...s, autoOnProfileComplete: !s.autoOnProfileComplete }))}
                  style={{ width: 44, height: 24, borderRadius: 12, background: autoSettings.autoOnProfileComplete ? C.teal : C.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: autoSettings.autoOnProfileComplete ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Auto Follow-up After</label>
                <select value={autoSettings.autoFollowupDays} onChange={e => setAutoSettings(s => ({ ...s, autoFollowupDays: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  {['1', '2', '3', '5', '7'].map(d => <option key={d} value={d}>{d} din baad follow-up</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Primary Channel</label>
                <select value={autoSettings.outreachChannel} onChange={e => setAutoSettings(s => ({ ...s, outreachChannel: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  <option value="call">📞 AI Phone Call</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="both">🔄 Call + WhatsApp</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Max Attempts</label>
                <select value={autoSettings.maxAttempts} onChange={e => setAutoSettings(s => ({ ...s, maxAttempts: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  {['1', '2', '3', '5'].map(a => <option key={a} value={a}>{a} attempts</option>)}
                </select>
              </div>

              <button onClick={() => toast.success('Auto-outreach settings save ho gaye!')} style={{ padding: '12px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                💾 Save Settings
              </button>
            </div>
          </div>

          {/* Bulk outreach */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>📢 Bulk Outreach</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { title: 'All New Leads', desc: `${leads.filter(l => l.stage === 'new_lead').length} leads contacted nahi hue`, icon: '🆕', stage: 'new_lead' as Stage },
                { title: 'Follow-up Required', desc: `${leads.filter(l => l.stage === 'contacted').length} leads ne respond nahi kiya`, icon: '📞', stage: 'contacted' as Stage },
                { title: 'Interested — Needs Push', desc: `${leads.filter(l => l.stage === 'interested').length} leads interested hain`, icon: '🔥', stage: 'interested' as Stage },
              ].map((group, i) => (
                <div key={i} style={{ padding: 16, background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{group.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{group.title}</div>
                        <div style={{ fontSize: 11, color: C.mu }}>{group.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => {
                      const targets = leads.filter(l => l.stage === group.stage)
                      if (targets.length === 0) { toast.error('Koi lead nahi is stage mein'); return }
                      toast.success(`${targets.length} leads ko call queue mein add kiya!`)
                    }} style={{ padding: '8px 16px', background: C.teal, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Call All →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SCRIPTS & OBJECTIONS ── */}
      {tab === 'Scripts & Objections' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>📋 Sales Scripts</div>
            {[
              { title: 'Skin Profile Complete Script', tag: 'Post-Profile', script: 'Namaste [Name] ji! Main Rabt Naturals se Riya bol rahi hoon. Aapne abhi apna skin profile complete kiya — bahut achha! Aapki [skin type] skin aur [concern] problem ke liye humne kuch perfect products select kiye hain. [Product 1] specially formulated hai [concern] ke liye — 4 weeks mein results guaranteed. Kya main aapko 10 minute mein explain kar sakti hoon?' },
              { title: 'Direct Sales Script', tag: 'Cold Call', script: 'Namaste [Name] ji! Main Riya hoon Rabt Naturals se — India ka #1 personalized skincare brand. Hum free skin analysis offer karte hain jisme ek specialist personally aapki skin dekh ke products recommend karte hain. Kya aap 5 minute mein apna free analysis book kar sakte hain?' },
              { title: 'Follow-up Script', tag: 'Follow-up', script: 'Namaste [Name] ji! Main Riya — pichli baar humne baat ki thi [Product] ke baare mein. Kya aapne soch liya? Abhi order karne pe 15% discount chal raha hai — kal tak hi offer hai. Aapke liye cart save kiya hua hai, bas confirm karna hai.' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 16, padding: 16, background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{s.title}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: C.teal + '15', color: C.teal, fontWeight: 700 }}>{s.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: C.mu, lineHeight: 1.6 }}>{s.script}</div>
                <button onClick={() => { navigator.clipboard.writeText(s.script); toast.success('Copied!') }} style={{ marginTop: 8, fontSize: 11, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Copy →</button>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>🛡️ Objection Handling</div>
            {[
              { obj: '"Bahut mahanga hai"', ans: '"Samajh sakta/sakti hoon — lekin ek baar try karke dekho. Humari 30-day money back guarantee hai. Ek consultation mein hi feel ho jayega ki skin improve ho rahi hai. Aur abhi 15% off chal raha hai — aaj ka offer hai."' },
              { obj: '"Soch ke batata/batati hoon"', ans: '"Bilkul! Main kal tak offer hold karta/karti hoon. Lekin yeh bata doon — is week 47 orders aaye hain, stock limited hai. Aapka number save kar liya, kal reminder karoon?"' },
              { obj: '"Natural hai kya?"', ans: '"100% natural ingredients — no parabens, no sulfates, no artificial fragrance. Sab kuch lab-tested hai. Humari website pe full ingredient list available hai. Aur ek dermatologist-tested bhi hai."' },
              { obj: '"Online se kaise trust karoon?"', ans: '"Bilkul valid point hai! Isliye hum pehle free consultation dete hain — pehle specialist se baat karo, phir decide karo. Koi pressure nahi. Aur 30-day return policy bhi hai."' },
              { obj: '"Dusra brand try kar raha/rahi hoon"', ans: '"Koi baat nahi! Lekin ek kaam karo — humara free skin analysis le lo. Agar tumhara current product better hai, toh main khud suggest karoonga/karungi use use karte rehne ko. Fair hai na?"' },
            ].map((o, i) => (
              <div key={i} style={{ marginBottom: 14, padding: 14, background: C.red + '05', borderRadius: 12, border: `1px solid ${C.red}15`, borderLeft: `3px solid ${C.red}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 6 }}>{o.obj}</div>
                <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.6 }}>💬 {o.ans}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PERFORMANCE ── */}
      {tab === 'Performance' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total Revenue Generated', value: `₹${totalRevenue.toLocaleString('en-IN')}`, sub: `${wonLeads.length} deals closed`, color: C.green },
              { label: 'Avg Deal Size', value: wonLeads.length > 0 ? `₹${Math.round(totalRevenue / wonLeads.length).toLocaleString('en-IN')}` : '—', sub: 'Per closed deal', color: C.teal },
              { label: 'Conversion Rate', value: convRate + '%', sub: `${leads.length} total leads`, color: C.purple },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginTop: 4 }}>{k.label}</div>
                <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Stage funnel */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Sales Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              {STAGES.map((stage, i) => {
                const count = leads.filter(l => l.stage === stage).length
                const pct = leads.length > 0 ? (count / leads.length * 100) : 0
                const width = 100 - i * 12
                const meta = STAGE_META[stage]
                return (
                  <div key={stage} style={{ width: `${width}%`, minWidth: '40%', background: meta.color + '12', border: `1.5px solid ${meta.color}30`, borderRadius: 10, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{meta.icon} {meta.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: meta.color }}>{count}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: meta.color + '20', color: meta.color }}>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top concerns */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Top Skin Concerns in Pipeline</div>
            {(() => {
              const concernCounts: Record<string, number> = {}
              leads.forEach(l => l.concerns.forEach(c => { concernCounts[c] = (concernCounts[c] || 0) + 1 }))
              const sorted = Object.entries(concernCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
              const max = sorted[0]?.[1] || 1
              return sorted.map(([concern, count], i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{concern}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>{count} leads</span>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: C.teal, borderRadius: 4 }} />
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Add New Lead</h2>
            {[
              { label: 'Name', key: 'name', placeholder: 'Priya Sharma' },
              { label: 'Phone', key: 'phone', placeholder: '+919876543210' },
              { label: 'Skin Concerns (comma-separated)', key: 'concerns', placeholder: 'Acne, Dark Spots' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>{label}</label>
                <input value={newLead[key as keyof typeof newLead] as string} onChange={e => setNewLead(n => ({ ...n, [key]: e.target.value }))} placeholder={placeholder} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Skin Type</label>
              <select value={newLead.skinType} onChange={e => setNewLead(n => ({ ...n, skinType: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                {['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAddLead(false)} style={{ flex: 1, padding: '11px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={addLead} style={{ flex: 1, padding: '11px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Add Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
