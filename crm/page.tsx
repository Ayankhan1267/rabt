'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STAGES = [
  { id: 'new', label: 'New Lead', color: 'var(--blue)', bg: 'var(--blL)' },
  { id: 'contacted', label: 'Contacted', color: 'var(--gold)', bg: 'var(--gL)' },
  { id: 'consultation_booked', label: 'Consultation', color: 'var(--orange)', bg: 'var(--orL)' },
  { id: 'converted', label: 'Converted', color: 'var(--green)', bg: 'var(--grL)' },
  { id: 'lost', label: 'Lost', color: 'var(--red)', bg: 'var(--rdL)' },
]

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [mongoCustomers, setMongoCustomers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [view, setView] = useState<'pipeline' | 'customers' | 'table'>('pipeline')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', concern: '', source: 'WhatsApp', assigned_to: '', notes: '' })
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: user }] = await Promise.all([supabase.auth.getUser()])
    const uid = user.user?.id

    const [leadsRes, profilesRes, myProfile] = await Promise.all([
      supabase.from('leads').select('*, assigned_to(id,name,role)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('profiles').select('*').eq('id', uid).single(),
    ])

    setProfiles(profilesRes.data || [])
    setProfile(myProfile.data)

    // Filter leads by role
    const allLeads = leadsRes.data || []
    const role = myProfile.data?.role
    if (role === 'founder' || role === 'manager') {
      setLeads(allLeads)
    } else {
      setLeads(allLeads.filter((l: any) => l.assigned_to?.id === uid || l.created_by === uid))
    }

    // Load MongoDB customers
    if (mongoUrl) {
      try {
        const res = await fetch(mongoUrl + '/api/users')
        if (res.ok) setMongoCustomers(await res.json())
      } catch {}
    }
    setLoading(false)
  }

  async function addLead() {
    if (!form.name) { toast.error('Enter customer name'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leads').insert({
      name: form.name, phone: form.phone, email: form.email,
      concern: form.concern, source: form.source, stage: 'new',
      assigned_to: form.assigned_to || null,
      created_by: user?.id, notes: form.notes,
    })
    toast.success('Lead added!')
    setShowAddModal(false)
    setForm({ name: '', phone: '', email: '', concern: '', source: 'WhatsApp', assigned_to: '', notes: '' })
    loadAll()
  }

  async function advanceLead(id: string, currentStage: string) {
    const order = ['new', 'contacted', 'consultation_booked', 'converted']
    const idx = order.indexOf(currentStage)
    if (idx < order.length - 1) {
      await supabase.from('leads').update({ stage: order[idx + 1], updated_at: new Date().toISOString() }).eq('id', id)
      toast.success('Lead advanced!')
      loadAll()
    }
  }

  async function updateLeadStage(id: string, stage: string) {
    await supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id)
    toast.success('Stage updated!')
    loadAll()
  }

  async function convertCustomerToLead(customer: any) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leads').insert({
      name: customer.name, phone: customer.phone, email: customer.email,
      concern: 'Website Customer', source: 'Website', stage: 'new',
      mongo_user_id: customer._id, created_by: user?.id,
    })
    toast.success(customer.name + ' added to CRM!')
    loadAll()
    setView('pipeline')
  }

  function openWhatsApp(phone: string, name: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const msg = `Hi ${name}! 👋 I'm from Rabt Naturals 🌿 We'd love to help you with your skincare journey. Can I know more about your skin concerns?`
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const inputStyle: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10
  }

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.id] = leads.filter(l => l.stage === s.id).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>CRM / <span style={{ color: 'var(--gold)' }}>Leads</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {leads.length} CRM leads · {mongoCustomers.length} website customers
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
          + Add Lead
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {STAGES.map(s => (
          <div key={s.id} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{stageCounts[s.id] || 0}</div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'pipeline', label: '🎯 Pipeline' },
          { id: 'customers', label: '👥 Website Customers' },
          { id: 'table', label: '📋 All Leads Table' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id as any)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
            background: view === tab.id ? 'var(--gL)' : 'rgba(255,255,255,0.05)',
            color: view === tab.id ? 'var(--gold)' : 'var(--mu2)',
            border: `1px solid ${view === tab.id ? 'rgba(212,168,83,0.3)' : 'var(--b1)'}`,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* PIPELINE VIEW */}
      {view === 'pipeline' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.id)
            return (
              <div key={stage.id} style={{ minWidth: 220, flexShrink: 0 }}>
                <div style={{
                  padding: '8px 12px', borderRadius: '8px 8px 0 0',
                  background: stage.bg, color: stage.color, display: 'flex', alignItems: 'center', gap: 7,
                  border: '1px solid ' + stage.color + '33', borderBottom: 'none',
                  fontSize: 11.5, fontWeight: 700
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: stage.color }} />
                  {stage.label}
                  <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono', fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '1px 7px', borderRadius: 20 }}>{stageLeads.length}</span>
                </div>
                <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderTop: 'none', borderRadius: '0 0 8px 8px', minHeight: 100, padding: 8 }}>
                  {stageLeads.map(lead => (
                    <div key={lead.id} onClick={() => setSelectedLead(lead)} style={{
                      background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 8, padding: '11px 12px',
                      marginBottom: 7, cursor: 'pointer', transition: 'border-color 0.13s'
                    }}
                      onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
                      onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 3 }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 6 }}>{lead.concern || lead.source || ''}</div>
                      {lead.phone && (
                        <div style={{ fontSize: 10.5, color: 'var(--mu2)', fontFamily: 'DM Mono', marginBottom: 6 }}>📞 {lead.phone}</div>
                      )}
                      {lead.assigned_to?.name && (
                        <div style={{ fontSize: 10, color: 'var(--green)' }}>→ {lead.assigned_to.name}</div>
                      )}
                      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                        {lead.phone && (
                          <button onClick={e => { e.stopPropagation(); openWhatsApp(lead.phone, lead.name) }} style={{
                            flex: 1, padding: '4px', background: 'var(--grL)', border: 'none', borderRadius: 6,
                            color: 'var(--green)', fontSize: 10, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600
                          }}>💬 WA</button>
                        )}
                        {stage.id !== 'converted' && stage.id !== 'lost' && (
                          <button onClick={e => { e.stopPropagation(); advanceLead(lead.id, lead.stage) }} style={{
                            flex: 1, padding: '4px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none',
                            borderRadius: 6, color: '#08090C', fontSize: 10, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700
                          }}>→</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--mu)', fontSize: 12 }}>Empty</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CUSTOMERS VIEW */}
      {view === 'customers' && (
        <div>
          {!mongoUrl || mongoCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🍃</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Connect MongoDB to see website customers</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 20 }}>232 registered customers from rabtnaturals.com</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{mongoCustomers.length} registered customers</span>
                <span style={{ fontSize: 10.5, color: 'var(--green)', fontWeight: 700 }}>🍃 Live from MongoDB</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Name', 'Phone', 'Email', 'Verified', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mongoCustomers.map((c, i) => (
                    <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '11px 12px', fontWeight: 500, fontSize: 12.5 }}>{c.name}</td>
                      <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>{c.phone || '—'}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--mu2)' }}>{c.email || '—'}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: c.isPhoneVerified ? 'var(--grL)' : 'rgba(255,255,255,0.06)', color: c.isPhoneVerified ? 'var(--green)' : 'var(--mu2)' }}>
                          {c.isPhoneVerified ? '✓ Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 11, color: 'var(--mu)' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {c.phone && (
                            <button onClick={() => openWhatsApp(c.phone, c.name)} style={{ padding: '4px 10px', background: 'var(--grL)', border: 'none', borderRadius: 6, color: 'var(--green)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                              💬 WhatsApp
                            </button>
                          )}
                          <button onClick={() => convertCustomerToLead(c)} style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
                            + CRM
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === 'table' && (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Phone', 'Concern', 'Source', 'Stage', 'Assigned To', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => {
                const stage = STAGES.find(s => s.id === l.stage) || STAGES[0]
                return (
                  <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '11px 12px', fontWeight: 500, fontSize: 12.5 }}>{l.name}</td>
                    <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>{l.phone || '—'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--mu2)' }}>{l.concern || '—'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 11.5, color: 'var(--mu)' }}>{l.source}</td>
                    <td style={{ padding: '11px 12px' }}>
                      <select value={l.stage} onChange={e => updateLeadStage(l.id, e.target.value)} style={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 6, padding: '3px 8px', color: stage.color, fontSize: 11, cursor: 'pointer', outline: 'none', fontFamily: 'Outfit' }}>
                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--mu2)' }}>{l.assigned_to?.name || '—'}</td>
                    <td style={{ padding: '11px 12px', fontSize: 11, color: 'var(--mu)', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {l.phone && (
                          <button onClick={() => openWhatsApp(l.phone, l.name)} style={{ padding: '4px 10px', background: 'var(--grL)', border: 'none', borderRadius: 6, color: 'var(--green)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>💬</button>
                        )}
                        <button onClick={() => setSelectedLead(l)} style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit' }}>View</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {leads.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
                  No leads yet. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setShowAddModal(true)}>Add first lead →</span>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedLead(null)}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800 }}>{selectedLead.name}</div>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Phone', value: selectedLead.phone || '—' },
                { label: 'Email', value: selectedLead.email || '—' },
                { label: 'Source', value: selectedLead.source },
                { label: 'Stage', value: selectedLead.stage },
                { label: 'Concern', value: selectedLead.concern || '—' },
                { label: 'Assigned', value: selectedLead.assigned_to?.name || 'Unassigned' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>
            {selectedLead.notes && (
              <div style={{ background: 'var(--s2)', borderRadius: 8, padding: '12px', marginBottom: 14, fontSize: 12.5, color: 'var(--mu2)', lineHeight: 1.5 }}>
                📝 {selectedLead.notes}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedLead.phone && (
                <button onClick={() => openWhatsApp(selectedLead.phone, selectedLead.name)} style={{ flex: 1, padding: 10, background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, color: 'var(--green)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  💬 WhatsApp
                </button>
              )}
              {selectedLead.stage !== 'converted' && selectedLead.stage !== 'lost' && (
                <button onClick={() => { advanceLead(selectedLead.id, selectedLead.stage); setSelectedLead(null) }} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Advance Stage →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>👥 Add Lead</div>
            {[
              { key: 'name', label: 'Name*', placeholder: 'Priya Sharma' },
              { key: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
              { key: 'email', label: 'Email', placeholder: 'priya@gmail.com' },
              { key: 'concern', label: 'Skin Concern', placeholder: 'Acne, Pigmentation...' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Source</label>
                <select value={form.source} onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))} style={inputStyle}>
                  {['WhatsApp', 'Instagram DM', 'Meta Ad', 'Google Ad', 'Website', 'Manual', 'Referral'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Assign To</label>
                <select value={form.assigned_to} onChange={e => setForm(prev => ({ ...prev, assigned_to: e.target.value }))} style={inputStyle}>
                  <option value="">— Unassigned —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={addLead} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Add Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
