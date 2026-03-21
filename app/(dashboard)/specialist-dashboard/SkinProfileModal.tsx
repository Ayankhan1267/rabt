'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const SKIN_TYPES = ['oily', 'dry', 'combination', 'sensitive', 'normal', 'acne-prone', 'mature']
const SKIN_CONCERNS = ['aging', 'acne', 'dryness', 'pigmentation', 'dullness', 'sensitivity', 'pores', 'wrinkles']
const STRESS_LEVELS = ['low', 'moderate', 'high']
const INTAKE_LEVELS = ['low', 'moderate', 'high', 'very_high']
const ROUTINE_TIMES = ['morning', 'evening', 'night'] as const

type RoutineTime = typeof ROUTINE_TIMES[number]

interface RoutineStep {
  step: number
  productType: string
  description: string
  recommendedProduct: string
}

interface SkinProfileModalProps {
  skinProfile: any
  products: any[]
  mongoSpec: any
  onClose: () => void
  onSaved: () => void
}

function getProductImg(p: any) {
  return p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url || p.image || ''
}

function getProductPrice(p: any) {
  const v = p.variants?.[0]
  if (v) {
    const vp = v.price
    if (typeof vp === 'object') return vp?.discounted || vp?.original || 0
    return typeof vp === 'number' ? vp : 0
  }
  const pp = p.price
  if (typeof pp === 'object') return pp?.discounted || pp?.original || 0
  return typeof pp === 'number' ? pp : 0
}

export default function SkinProfileModal({ skinProfile, products, mongoSpec, onClose, onSaved }: SkinProfileModalProps) {
  const existing = skinProfile?.specialistUpdatedData || skinProfile?.aiExtractedData || {}
  const existingRoutine = skinProfile?.skinRoutine || {}

  const [activeTab, setActiveTab] = useState<'skin-data' | 'routine'>('skin-data')
  const [saving, setSaving] = useState(false)

  // Skin data form
  const [skinType, setSkinType] = useState(existing.skinType || '')
  const [skinConcerns, setSkinConcerns] = useState<string[]>(existing.skinConcerns || [])
  const [skinGoals, setSkinGoals] = useState(existing.skinGoals || '')
  const [currentSkincare, setCurrentSkincare] = useState(existing.currentSkincare || '')
  const [allergies, setAllergies] = useState(existing.allergies || '')
  const [diet, setDiet] = useState(existing.diet || '')
  const [waterIntake, setWaterIntake] = useState(existing.waterIntake || '')
  const [stressLevel, setStressLevel] = useState(existing.stressLevel || '')
  const [junkIntake, setJunkIntake] = useState(existing.junkIntake || '')
  const [sugarIntake, setSugarIntake] = useState(existing.sugarIntake || '')
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>(existing.customFields || [])

  // Routine form
  const [routine, setRoutine] = useState<Record<RoutineTime, RoutineStep[]>>({
    morning: existingRoutine.morning || [],
    evening: existingRoutine.evening || [],
    night: existingRoutine.night || [],
  })
  const [activeRoutineTab, setActiveRoutineTab] = useState<RoutineTime>('morning')
  const [productSearch, setProductSearch] = useState('')

  const inp: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)',
    borderRadius: 8, padding: '8px 10px', color: 'var(--tx)',
    fontSize: 12.5, fontFamily: 'Outfit', outline: 'none'
  }

  function toggleConcern(c: string) {
    setSkinConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  function addCustomField() {
    setCustomFields(prev => [...prev, { key: '', value: '' }])
  }

  function updateCustomField(i: number, field: 'key' | 'value', val: string) {
    setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }

  function removeCustomField(i: number) {
    setCustomFields(prev => prev.filter((_, idx) => idx !== i))
  }

  // Routine functions
  function addRoutineStep(time: RoutineTime) {
    setRoutine(prev => ({
      ...prev,
      [time]: [...prev[time], {
        step: prev[time].length + 1,
        productType: '',
        description: '',
        recommendedProduct: ''
      }]
    }))
  }

  function updateRoutineStep(time: RoutineTime, i: number, field: keyof RoutineStep, val: string) {
    setRoutine(prev => ({
      ...prev,
      [time]: prev[time].map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    }))
  }

  function removeRoutineStep(time: RoutineTime, i: number) {
    setRoutine(prev => ({
      ...prev,
      [time]: prev[time].filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step: idx + 1 }))
    }))
  }

  async function saveSkinData() {
    setSaving(true)
    try {
      const specialistUserId = mongoSpec?.user?.toString()
      if (!specialistUserId) { toast.error('Specialist user ID missing'); setSaving(false); return }

      const body = {
        skinType: skinType || undefined,
        skinConcerns: skinConcerns.length > 0 ? skinConcerns : undefined,
        skinGoals: skinGoals || undefined,
        currentSkincare: currentSkincare || undefined,
        allergies: allergies || undefined,
        diet: diet || undefined,
        waterIntake: waterIntake || undefined,
        stressLevel: stressLevel || undefined,
        junkIntake: junkIntake || undefined,
        sugarIntake: sugarIntake || undefined,
        customFields: customFields.filter(f => f.key && f.value),
      }

      const res = await fetch('/api/rabt-session?type=skin-data&skinProfileId=' + skinProfile._id + '&specialistUserId=' + specialistUserId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Skin data saved! ✅')
        onSaved()
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch { toast.error('Error saving') }
    setSaving(false)
  }

  async function saveRoutine() {
    setSaving(true)
    try {
      const specialistUserId = mongoSpec?.user?.toString()
      if (!specialistUserId) { toast.error('Specialist user ID missing'); setSaving(false); return }

      const routineBody = {
        morning: routine.morning.filter(s => s.productType).map(s => ({
          step: s.step,
          productType: s.productType,
          description: s.description || undefined,
          recommendedProduct: s.recommendedProduct || undefined,
        })),
        evening: routine.evening.filter(s => s.productType).map(s => ({
          step: s.step,
          productType: s.productType,
          description: s.description || undefined,
          recommendedProduct: s.recommendedProduct || undefined,
        })),
        night: routine.night.filter(s => s.productType).map(s => ({
          step: s.step,
          productType: s.productType,
          description: s.description || undefined,
          recommendedProduct: s.recommendedProduct || undefined,
        })),
      }

      const res = await fetch('/api/rabt-session?type=routine&skinProfileId=' + skinProfile._id + '&specialistUserId=' + specialistUserId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routineBody)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Routine saved! ✅ Customer ke saved routines mein dikhe ga')
        onSaved()
      } else {
        toast.error(data.error || 'Failed to save routine')
      }
    } catch { toast.error('Error saving routine') }
    setSaving(false)
  }

  const filteredProducts = products.filter(p =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, width: '96vw', maxWidth: 900, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800 }}>
              Skin Profile — {skinProfile?.name || skinProfile?.user?.firstName || 'Patient'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 3 }}>
              Update skin data aur routine — customer ke rabtnaturals.com pe reflect hoga
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
          {[
            { id: 'skin-data', label: '🧬 Skin Data' },
            { id: 'routine', label: '🌿 Routines' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--gold)' : '2px solid transparent', color: activeTab === t.id ? 'var(--gold)' : 'var(--mu)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

          {/* SKIN DATA TAB */}
          {activeTab === 'skin-data' && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>

              {/* Skin Type */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>Skin Type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SKIN_TYPES.map(t => (
                    <button key={t} onClick={() => setSkinType(t === skinType ? '' : t)}
                      style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', border: '1px solid ' + (skinType === t ? 'var(--gold)' : 'var(--b2)'), background: skinType === t ? 'var(--gL)' : 'var(--s2)', color: skinType === t ? 'var(--gold)' : 'var(--mu2)', textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Concerns */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>Skin Concerns</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SKIN_CONCERNS.map(c => (
                    <button key={c} onClick={() => toggleConcern(c)}
                      style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', border: '1px solid ' + (skinConcerns.includes(c) ? 'var(--orange)' : 'var(--b2)'), background: skinConcerns.includes(c) ? 'var(--orL)' : 'var(--s2)', color: skinConcerns.includes(c) ? 'var(--orange)' : 'var(--mu2)', textTransform: 'capitalize' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Skin Goals', val: skinGoals, set: setSkinGoals, placeholder: 'e.g. Clear skin, Glow' },
                  { label: 'Current Skincare', val: currentSkincare, set: setCurrentSkincare, placeholder: 'Current products use kar rahe hain' },
                  { label: 'Allergies', val: allergies, set: setAllergies, placeholder: 'Any known allergies' },
                  { label: 'Diet', val: diet, set: setDiet, placeholder: 'Diet pattern' },
                  { label: 'Water Intake', val: waterIntake, set: setWaterIntake, placeholder: 'e.g. 2 liters/day' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inp} />
                  </div>
                ))}
              </div>

              {/* Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Stress Level</label>
                  <select value={stressLevel} onChange={e => setStressLevel(e.target.value)} style={inp}>
                    <option value="">Select...</option>
                    {STRESS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Junk Intake</label>
                  <select value={junkIntake} onChange={e => setJunkIntake(e.target.value)} style={inp}>
                    <option value="">Select...</option>
                    {INTAKE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Sugar Intake</label>
                  <select value={sugarIntake} onChange={e => setSugarIntake(e.target.value)} style={inp}>
                    <option value="">Select...</option>
                    {INTAKE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Custom Fields */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Specialist Notes (Custom Fields)</label>
                  <button onClick={addCustomField} style={{ padding: '4px 12px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 6, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>+ Add</button>
                </div>
                {customFields.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input value={f.key} onChange={e => updateCustomField(i, 'key', e.target.value)} placeholder="Field name (e.g. Primary Concern)" style={{ ...inp, flex: 1 }} />
                    <input value={f.value} onChange={e => updateCustomField(i, 'value', e.target.value)} placeholder="Value" style={{ ...inp, flex: 2 }} />
                    <button onClick={() => removeCustomField(i)} style={{ padding: '0 10px', background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                ))}
                {customFields.length === 0 && <div style={{ fontSize: 12, color: 'var(--mu)', padding: '8px 0' }}>Koi custom field nahi — "+ Add" se add karo</div>}
              </div>

              <button onClick={saveSkinData} disabled={saving}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Syne', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save Skin Data ✓'}
              </button>
            </div>
          )}

          {/* ROUTINE TAB */}
          {activeTab === 'routine' && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16, background: 'var(--blL)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
                Routine save hone ke baad customer ke rabtnaturals.com pe "Saved Routines" page mein dikhe ga aur Add to Cart kar sakta hai
              </div>

              {/* Routine time tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {ROUTINE_TIMES.map(t => (
                  <button key={t} onClick={() => setActiveRoutineTab(t)}
                    style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', background: activeRoutineTab === t ? (t === 'morning' ? 'rgba(251,191,36,0.15)' : t === 'evening' ? 'rgba(139,92,246,0.15)' : 'rgba(30,41,59,0.5)') : 'var(--s2)', color: activeRoutineTab === t ? (t === 'morning' ? '#F59E0B' : t === 'evening' ? '#8B5CF6' : '#94A3B8') : 'var(--mu)', border: '1px solid ' + (activeRoutineTab === t ? (t === 'morning' ? 'rgba(245,158,11,0.4)' : t === 'evening' ? 'rgba(139,92,246,0.4)' : 'rgba(148,163,184,0.3)') : 'var(--b1)'), textTransform: 'capitalize' }}>
                    {t === 'morning' ? '☀️' : t === 'evening' ? '🌅' : '🌙'} {t.charAt(0).toUpperCase() + t.slice(1)} ({routine[t].length})
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
                {/* Steps */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, textTransform: 'capitalize' }}>{activeRoutineTab} Routine</div>
                    <button onClick={() => addRoutineStep(activeRoutineTab)}
                      style={{ padding: '6px 14px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 7, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                      + Add Step
                    </button>
                  </div>

                  {routine[activeRoutineTab].length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, background: 'var(--s2)', borderRadius: 12, border: '1px dashed var(--b2)' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🌿</div>
                      <div style={{ fontSize: 13, color: 'var(--mu)' }}>Koi step nahi — "+ Add Step" se shuru karo</div>
                    </div>
                  ) : (
                    routine[activeRoutineTab].map((step, i) => (
                      <div key={i} style={{ background: 'var(--s2)', borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: '1px solid var(--b1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--gold)' }}>{step.step}</div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)' }}>Step {step.step}</span>
                          </div>
                          <button onClick={() => removeRoutineStep(activeRoutineTab, i)} style={{ background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>Remove</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Product Type*</label>
                            <input value={step.productType} onChange={e => updateRoutineStep(activeRoutineTab, i, 'productType', e.target.value)}
                              placeholder="e.g. Cleanser, Moisturizer, Serum" style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Rabt Product</label>
                            <select value={step.recommendedProduct} onChange={e => updateRoutineStep(activeRoutineTab, i, 'recommendedProduct', e.target.value)} style={inp}>
                              <option value="">No product selected</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>How to Use</label>
                          <input value={step.description} onChange={e => updateRoutineStep(activeRoutineTab, i, 'description', e.target.value)}
                            placeholder="e.g. Gently massage for 30 seconds, then rinse" style={inp} />
                        </div>
                        {/* Show selected product preview */}
                        {step.recommendedProduct && (() => {
                          const prod = products.find(p => p._id === step.recommendedProduct)
                          if (!prod) return null
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', background: 'var(--s1)', borderRadius: 8, border: '1px solid var(--b1)' }}>
                              {getProductImg(prod) && <img src={getProductImg(prod)} alt={prod.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />}
                              <div>
                                <div style={{ fontSize: 11.5, fontWeight: 600 }}>{prod.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>Rs.{getProductPrice(prod)}</div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    ))
                  )}
                </div>

                {/* Product search sidebar */}
                <div>
                  <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Products ({products.length})</div>
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search product..." style={{ ...inp, marginBottom: 10 }} />
                  <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredProducts.slice(0, 20).map(p => {
                      const img = getProductImg(p)
                      const price = getProductPrice(p)
                      const isInRoutine = routine[activeRoutineTab].some(s => s.recommendedProduct === p._id)
                      return (
                        <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: isInRoutine ? 'var(--gL)' : 'var(--s2)', borderRadius: 8, border: '1px solid ' + (isInRoutine ? 'rgba(212,168,83,0.3)' : 'var(--b1)'), cursor: 'pointer' }}
                          onClick={() => {
                            const emptyStep = routine[activeRoutineTab].findIndex(s => !s.recommendedProduct)
                            if (emptyStep >= 0) {
                              updateRoutineStep(activeRoutineTab, emptyStep, 'recommendedProduct', p._id)
                            } else {
                              addRoutineStep(activeRoutineTab)
                              setTimeout(() => {
                                const newIdx = routine[activeRoutineTab].length
                                updateRoutineStep(activeRoutineTab, newIdx, 'recommendedProduct', p._id)
                              }, 50)
                            }
                          }}>
                          {img ? <img src={img} alt={p.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--b1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌿</div>}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 10.5, color: isInRoutine ? 'var(--gold)' : 'var(--mu)', fontWeight: 600 }}>{isInRoutine ? 'Added ✓' : 'Rs.' + price}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <button onClick={saveRoutine} disabled={saving}
                  style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 800, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Syne', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Routine — Customer ke Saved Routines mein jayega ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
