'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6', orange: '#F97316'
}

const PRESET_COLORS = [
  { name: 'Teal', value: '#2D5F5A' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Coral', value: '#F97316' },
  { name: 'Gold', value: '#D4A853' },
  { name: 'Navy', value: '#1E3A5F' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CHECKLIST_ITEMS = [
  { label: 'Platform settings configured', done: true },
  { label: 'AI analysis enabled', done: true },
  { label: 'At least 1 specialist added', done: true },
  { label: 'Commission rate set', done: true },
  { label: 'First vendor approved', done: false },
  { label: 'First product live', done: false },
  { label: 'Payment gateway connected (Razorpay)', done: false },
  { label: 'Domain connected', done: false },
  { label: 'WhatsApp business connected', done: false },
  { label: 'Email SMTP configured', done: false },
  { label: 'First test consultation done', done: false },
  { label: 'First test order placed', done: false },
]

export default function DermIQSetup() {
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  // Step 1 state
  const [brand, setBrand] = useState({ name: 'DermIQ', tagline: '', logo: '', color: '#2D5F5A', domain: '', email: '', whatsapp: '' })

  // Step 2 state
  const [ai, setAi] = useState({
    skinAnalysis: true, hairAnalysis: true, bodyAnalysis: false,
    scoringMode: 'Balanced', minConfidence: 72,
    skincare: true, bodycare: true, haircare: true, supplements: true, baby: true, lips: true, colorCosmetics: true
  })

  // Step 3 state
  const [specialists, setSpecialists] = useState<any[]>([])
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', specialty: '', fee: '', availability: '' })
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false })
  const [pricing, setPricing] = useState({ instant: 499, scheduled: 399, followup: 249 })
  const [maxConcurrent, setMaxConcurrent] = useState(3)

  // Step 4 state
  const [vendor, setVendor] = useState({
    autoApprove: false, requireGST: true, requirePAN: true, requireBank: true, requireTrademark: false,
    commission: 15, minPayout: 500, payoutFreq: 'Weekly', maxProducts: 100
  })

  // Step 5 state
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.map(i => ({ ...i })))

  useEffect(() => {
    loadSpecialists()
    loadSettings()
  }, [])

  async function loadSpecialists() {
    const { data } = await supabase.from('profiles').select('id, full_name, email, specialty, fee').eq('role', 'specialist')
    if (data) setSpecialists(data)
  }

  async function loadSettings() {
    const { data } = await supabase.from('dermiq_settings').select('*').single()
    if (data) {
      if (data.brand_name) setBrand(prev => ({ ...prev, name: data.brand_name || prev.name, tagline: data.tagline || '', logo: data.logo_url || '', color: data.primary_color || prev.color, domain: data.domain || '', email: data.support_email || '', whatsapp: data.whatsapp || '' }))
    }
  }

  async function saveStep1() {
    setSaving(true)
    const { error } = await supabase.from('dermiq_settings').upsert({
      id: 1, brand_name: brand.name, tagline: brand.tagline, logo_url: brand.logo,
      primary_color: brand.color, domain: brand.domain, support_email: brand.email, whatsapp: brand.whatsapp,
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to save settings'); return }
    toast.success('Platform settings saved!')
    advanceStep(1)
  }

  async function saveStep2() {
    setSaving(true)
    const { error } = await supabase.from('dermiq_settings').upsert({
      id: 1, ai_skin: ai.skinAnalysis, ai_hair: ai.hairAnalysis, ai_body: ai.bodyAnalysis,
      scoring_mode: ai.scoringMode, min_confidence: ai.minConfidence,
      categories: { skincare: ai.skincare, bodycare: ai.bodycare, haircare: ai.haircare, supplements: ai.supplements, baby: ai.baby, lips: ai.lips, colorCosmetics: ai.colorCosmetics },
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to save AI settings'); return }
    toast.success('AI settings saved!')
    advanceStep(2)
  }

  async function saveStep3() {
    setSaving(true)
    const { error } = await supabase.from('dermiq_settings').upsert({
      id: 1, working_days: workingDays, pricing_instant: pricing.instant,
      pricing_scheduled: pricing.scheduled, pricing_followup: pricing.followup,
      max_concurrent: maxConcurrent, updated_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to save specialist settings'); return }
    toast.success('Specialist settings saved!')
    advanceStep(3)
  }

  async function saveStep4() {
    setSaving(true)
    const { error } = await supabase.from('dermiq_settings').upsert({
      id: 1, auto_approve_vendor: vendor.autoApprove, require_gst: vendor.requireGST,
      require_pan: vendor.requirePAN, require_bank: vendor.requireBank, require_trademark: vendor.requireTrademark,
      commission_rate: vendor.commission, min_payout: vendor.minPayout,
      payout_freq: vendor.payoutFreq, max_products: vendor.maxProducts,
      updated_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to save vendor rules'); return }
    toast.success('Vendor rules saved!')
    advanceStep(4)
  }

  async function inviteSpecialist() {
    if (!inviteForm.name || !inviteForm.email) { toast.error('Name and email required'); return }
    setSaving(true)
    const { error } = await supabase.from('profiles').insert({
      full_name: inviteForm.name, email: inviteForm.email, role: 'specialist',
      specialty: inviteForm.specialty, fee: Number(inviteForm.fee) || 0,
      availability: inviteForm.availability, created_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to invite specialist'); return }
    toast.success('Specialist invited!')
    setInviteForm({ name: '', email: '', specialty: '', fee: '', availability: '' })
    loadSpecialists()
  }

  function advanceStep(n: number) {
    setCompleted(prev => prev.includes(n) ? prev : [...prev, n])
    setStep(n + 1)
  }

  const doneCount = checklist.filter(i => i.done).length
  const completionPct = Math.round((doneCount / checklist.length) * 100)
  const canGoLive = completionPct >= 80

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.dark, background: '#fff',
    outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6, display: 'block' }
  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 44, height: 24, borderRadius: 12, background: on ? C.teal : C.border, position: 'relative',
    cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
  })
  const toggleKnob = (on: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: '50%', background: '#fff',
    position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
  })

  const STEPS = [
    { n: 1, label: 'Platform Setup' },
    { n: 2, label: 'AI Setup' },
    { n: 3, label: 'Specialists' },
    { n: 4, label: 'Vendor Rules' },
    { n: 5, label: 'Go Live' },
  ]

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: C.bg, minHeight: '100vh', padding: '32px 24px' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontWeight: 700, color: C.dark, margin: 0 }}>DermIQ Setup Wizard</h1>
        <p style={{ color: C.mu, fontSize: 14, marginTop: 6 }}>Complete the 5-step setup to launch your DermIQ platform</p>
      </div>

      {/* Progress Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, background: '#fff', borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {STEPS.map((s, i) => {
          const isDone = completed.includes(s.n)
          const isActive = step === s.n
          return (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: isDone ? 'pointer' : 'default' }}
                onClick={() => isDone && setStep(s.n)}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                  background: isDone ? C.green : isActive ? C.teal : C.border,
                  color: isDone || isActive ? '#fff' : C.mu,
                  boxShadow: isActive ? `0 0 0 4px rgba(45,95,90,0.15)` : 'none'
                }}>
                  {isDone ? '✓' : s.n}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: isDone ? C.green : isActive ? C.teal : C.mu, marginTop: 6, whiteSpace: 'nowrap' }}>
                  {s.label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: completed.includes(s.n) ? C.green : C.border, margin: '0 8px', marginBottom: 20 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Cards */}
      <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* ===== STEP 1 ===== */}
        {step === 1 && (
          <div style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.teal}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏢</div>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Platform Setup</h2>
                <p style={{ color: C.mu, fontSize: 13, margin: 0 }}>Configure your brand identity and contact details</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={labelStyle}>Brand Name</label>
                <input style={inputStyle} value={brand.name} onChange={e => setBrand({ ...brand, name: e.target.value })} placeholder="DermIQ" />
              </div>
              <div>
                <label style={labelStyle}>Tagline</label>
                <input style={inputStyle} value={brand.tagline} onChange={e => setBrand({ ...brand, tagline: e.target.value })} placeholder="Skin Intelligence, Redefined" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Logo URL</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={brand.logo} onChange={e => setBrand({ ...brand, logo: e.target.value })} placeholder="https://yourdomain.com/logo.png" />
                  {brand.logo && (
                    <img src={brand.logo} alt="logo preview" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', border: `1px solid ${C.border}` }} onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Primary Color</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(pc => (
                    <button key={pc.value} onClick={() => setBrand({ ...brand, color: pc.value })} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                      border: `2px solid ${brand.color === pc.value ? pc.value : C.border}`,
                      background: brand.color === pc.value ? `${pc.value}15` : '#fff',
                      cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: C.dark,
                      transition: 'all 0.15s'
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: pc.value }} />
                      {pc.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Domain</label>
                <input style={inputStyle} value={brand.domain} onChange={e => setBrand({ ...brand, domain: e.target.value })} placeholder="dermiq.in" />
              </div>
              <div>
                <label style={labelStyle}>Support Email</label>
                <input style={inputStyle} type="email" value={brand.email} onChange={e => setBrand({ ...brand, email: e.target.value })} placeholder="support@dermiq.in" />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp Business Number</label>
                <input style={inputStyle} value={brand.whatsapp} onChange={e => setBrand({ ...brand, whatsapp: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={saveStep1} disabled={saving} style={{
                background: C.teal, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif',
                opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8
              }}>
                {saving ? 'Saving...' : 'Save & Next Step →'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2 ===== */}
        {step === 2 && (
          <div style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.purple}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧠</div>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>AI Setup</h2>
                <p style={{ color: C.mu, fontSize: 13, margin: 0 }}>Configure AI analysis modules and scoring</p>
              </div>
            </div>

            {/* Info box */}
            <div style={{ background: `${C.blue}10`, border: `1px solid ${C.blue}30`, borderRadius: 12, padding: '14px 18px', marginBottom: 28, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>ℹ️</span>
              <p style={{ margin: 0, fontSize: 13, color: C.dark, lineHeight: 1.6 }}>
                <strong>AI analyzes 32 data points</strong> — skin type, tone, concerns, lifestyle, diet, age, location, and more to generate hyper-personalized product recommendations.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Analysis Modules</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { key: 'skinAnalysis', label: '32-Point Skin Analysis', desc: 'Deep skin profiling with 32 data points' },
                    { key: 'hairAnalysis', label: 'Hair Analysis', desc: 'Hair type, texture, scalp condition' },
                    { key: 'bodyAnalysis', label: 'Body Analysis', desc: 'Body skin type and care needs' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{item.desc}</div>
                      </div>
                      <div style={toggleStyle((ai as any)[item.key])} onClick={() => setAi({ ...ai, [item.key]: !(ai as any)[item.key] })}>
                        <div style={toggleKnob((ai as any)[item.key])} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Default Scoring Mode</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={ai.scoringMode} onChange={e => setAi({ ...ai, scoringMode: e.target.value })}>
                  <option>Conservative</option>
                  <option>Balanced</option>
                  <option>Aggressive</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Min Confidence for Recommendation: <strong style={{ color: C.teal }}>{ai.minConfidence}%</strong></label>
                <input type="range" min={50} max={95} value={ai.minConfidence} onChange={e => setAi({ ...ai, minConfidence: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: C.teal, marginTop: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.mu, marginTop: 4 }}>
                  <span>50%</span><span>95%</span>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Category Mapping</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { key: 'skincare', label: 'Skincare' },
                    { key: 'bodycare', label: 'Bodycare' },
                    { key: 'haircare', label: 'Haircare' },
                    { key: 'supplements', label: 'Supplements' },
                    { key: 'baby', label: 'Baby Care' },
                    { key: 'lips', label: 'Lips Care' },
                    { key: 'colorCosmetics', label: 'Color Cosmetics' },
                  ].map(cat => (
                    <label key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, border: `1px solid ${(ai as any)[cat.key] ? C.teal : C.border}`, background: (ai as any)[cat.key] ? `${C.teal}10` : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: (ai as any)[cat.key] ? C.teal : C.mu, transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={(ai as any)[cat.key]} onChange={() => setAi({ ...ai, [cat.key]: !(ai as any)[cat.key] })} style={{ accentColor: C.teal, width: 15, height: 15 }} />
                      {cat.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>← Back</button>
              <button onClick={saveStep2} disabled={saving} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save & Next Step →'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3 ===== */}
        {step === 3 && (
          <div style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👨‍⚕️</div>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Specialist Setup</h2>
                <p style={{ color: C.mu, fontSize: 13, margin: 0 }}>Manage specialists, working hours, and consultation pricing</p>
              </div>
            </div>

            {/* Existing specialists */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Existing Specialists ({specialists.length})</h3>
              {specialists.length === 0 ? (
                <div style={{ padding: '20px', background: C.bg, borderRadius: 12, textAlign: 'center', color: C.mu, fontSize: 13, border: `1px dashed ${C.border}` }}>No specialists added yet</div>
              ) : (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        {['Name', 'Email', 'Specialty', 'Fee'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {specialists.map((s, i) => (
                        <tr key={s.id} style={{ background: i % 2 === 0 ? '#fff' : C.bg }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.dark, fontWeight: 600 }}>{s.full_name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{s.email}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.mu }}>{s.specialty || '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.teal, fontWeight: 600 }}>₹{s.fee || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Invite form */}
            <div style={{ background: C.bg, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Invite New Specialist</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={labelStyle}>Name</label><input style={inputStyle} value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Dr. Priya Sharma" /></div>
                <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="dr.priya@dermiq.in" /></div>
                <div><label style={labelStyle}>Specialty</label><input style={inputStyle} value={inviteForm.specialty} onChange={e => setInviteForm({ ...inviteForm, specialty: e.target.value })} placeholder="Dermatologist" /></div>
                <div><label style={labelStyle}>Consultation Fee (₹)</label><input style={inputStyle} type="number" value={inviteForm.fee} onChange={e => setInviteForm({ ...inviteForm, fee: e.target.value })} placeholder="499" /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Availability Note</label><input style={inputStyle} value={inviteForm.availability} onChange={e => setInviteForm({ ...inviteForm, availability: e.target.value })} placeholder="Mon-Sat, 10AM-6PM" /></div>
              </div>
              <button onClick={inviteSpecialist} disabled={saving} style={{ marginTop: 14, background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                + Invite Specialist
              </button>
            </div>

            {/* Working hours */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Working Hours (10AM – 7PM)</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {DAYS.map(d => (
                  <button key={d} onClick={() => setWorkingDays({ ...workingDays, [d]: !workingDays[d] })} style={{
                    padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                    background: workingDays[d] ? C.teal : '#fff',
                    color: workingDays[d] ? '#fff' : C.mu,
                    border: `1px solid ${workingDays[d] ? C.teal : C.border}`
                  }}>{d}</button>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Consultation Pricing</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  { key: 'instant', label: 'Instant Consultation', icon: '⚡' },
                  { key: 'scheduled', label: 'Scheduled Consultation', icon: '📅' },
                  { key: 'followup', label: 'Follow-up', icon: '🔄' },
                ].map(item => (
                  <div key={item.key} style={{ background: C.bg, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</div>
                    <div style={{ fontSize: 12, color: C.mu, fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 14, color: C.dark, fontWeight: 700 }}>₹</span>
                      <input type="number" value={(pricing as any)[item.key]} onChange={e => setPricing({ ...pricing, [item.key]: Number(e.target.value) })}
                        style={{ ...inputStyle, padding: '8px 10px', fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: C.teal }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Max concurrent */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Max Concurrent Consultations: <strong style={{ color: C.teal }}>{maxConcurrent}</strong></label>
              <input type="range" min={1} max={10} value={maxConcurrent} onChange={e => setMaxConcurrent(Number(e.target.value))} style={{ width: '100%', accentColor: C.teal }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.mu, marginTop: 4 }}>
                <span>1</span><span>10</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>← Back</button>
              <button onClick={saveStep3} disabled={saving} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save & Next Step →'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 4 ===== */}
        {step === 4 && (
          <div style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.orange}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏪</div>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Vendor Onboarding Rules</h2>
                <p style={{ color: C.mu, fontSize: 13, margin: 0 }}>Set approval requirements and commission structure</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Toggles */}
              <div style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Approval Requirements</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { key: 'autoApprove', label: 'Auto-approve vendors', desc: 'Skip manual review for new vendors', warn: true },
                    { key: 'requireGST', label: 'Require GST for approval', desc: 'Vendors must submit GST certificate' },
                    { key: 'requirePAN', label: 'Require PAN for approval', desc: 'Vendors must submit PAN card' },
                    { key: 'requireBank', label: 'Require Bank Account for approval', desc: 'Vendors must add bank details for payouts' },
                    { key: 'requireTrademark', label: 'Require Trademark for premium badge', desc: 'Only trademark-registered brands get premium badge' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: C.bg, borderRadius: 12, border: `1px solid ${(vendor as any)[item.key] && item.warn ? C.red + '40' : C.border}` }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{item.desc}</div>
                      </div>
                      <div style={toggleStyle((vendor as any)[item.key])} onClick={() => setVendor({ ...vendor, [item.key]: !(vendor as any)[item.key] })}>
                        <div style={toggleKnob((vendor as any)[item.key])} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Commission Rate: <strong style={{ color: C.teal }}>{vendor.commission}%</strong></label>
                <input type="range" min={5} max={30} value={vendor.commission} onChange={e => setVendor({ ...vendor, commission: Number(e.target.value) })} style={{ width: '100%', accentColor: C.teal }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.mu, marginTop: 4 }}><span>5%</span><span>30%</span></div>
              </div>

              <div>
                <label style={labelStyle}>Min Payout Threshold (₹)</label>
                <input style={inputStyle} type="number" value={vendor.minPayout} onChange={e => setVendor({ ...vendor, minPayout: Number(e.target.value) })} />
              </div>

              <div>
                <label style={labelStyle}>Payout Frequency</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={vendor.payoutFreq} onChange={e => setVendor({ ...vendor, payoutFreq: e.target.value })}>
                  <option>Weekly</option>
                  <option>Bi-weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Max Products per Vendor</label>
                <input style={inputStyle} type="number" value={vendor.maxProducts} onChange={e => setVendor({ ...vendor, maxProducts: Number(e.target.value) })} />
              </div>
            </div>

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(3)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>← Back</button>
              <button onClick={saveStep4} disabled={saving} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save & Next Step →'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 5 ===== */}
        {step === 5 && (
          <div style={{ padding: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${C.green}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🚀</div>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: C.dark, margin: 0 }}>Launch Checklist</h2>
                <p style={{ color: C.mu, fontSize: 13, margin: 0 }}>Complete these items to go live</p>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 28, background: C.bg, borderRadius: 14, padding: '20px 24px', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Setup Progress</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: completionPct >= 80 ? C.green : C.gold }}>{completionPct}%</span>
              </div>
              <div style={{ height: 10, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completionPct}%`, background: completionPct >= 80 ? C.green : C.gold, borderRadius: 10, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 12, color: C.mu, marginTop: 8 }}>{doneCount} of {checklist.length} items complete — {canGoLive ? 'Ready to go live!' : `Need ${Math.ceil(checklist.length * 0.8) - doneCount} more to go live`}</div>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {checklist.map((item, i) => (
                <div key={i} onClick={() => {
                  const updated = [...checklist]
                  updated[i] = { ...updated[i], done: !updated[i].done }
                  setChecklist(updated)
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  background: item.done ? `${C.green}08` : '#fff', borderRadius: 12,
                  border: `1px solid ${item.done ? C.green + '40' : C.border}`, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: item.done ? C.green : '#fff', border: `2px solid ${item.done ? C.green : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#fff', transition: 'all 0.15s'
                  }}>
                    {item.done ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: item.done ? 600 : 400, color: item.done ? C.dark : C.mu, textDecoration: item.done ? 'none' : 'none' }}>
                    {item.label}
                  </span>
                  {item.done && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.green, fontWeight: 700 }}>DONE</span>}
                </div>
              ))}
            </div>

            {/* Go Live button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setStep(4)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>← Back</button>
              <button disabled={!canGoLive} onClick={() => { toast.success('DermIQ is now live! 🚀') }} style={{
                background: canGoLive ? C.green : C.border, color: canGoLive ? '#fff' : C.mu,
                border: 'none', borderRadius: 12, padding: '14px 36px',
                fontSize: 16, fontWeight: 800, cursor: canGoLive ? 'pointer' : 'not-allowed',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                boxShadow: canGoLive ? '0 4px 20px rgba(16,185,129,0.35)' : 'none'
              }}>
                🚀 Go Live
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
