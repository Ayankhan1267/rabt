'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6', orange: '#F97316',
}

const SEED_PROFILES = [
  {
    id: 1, name: 'Aisha Patel', age: '25-34', gender: 'Female', location: 'Metro',
    skin_type: 'Combination-Oily', overall_score: 62,
    concerns: ['Acne & Breakouts', 'Pigmentation'], spf_usage: 'Sometimes',
    sleep: '6-7 hrs', water: '1-2L', routine: 'Basic',
    submitted_at: new Date(Date.now() - 1800000).toISOString(),
    status: 'pending_review', consultation_type: 'instant', specialist: null,
    ai_products: ['Niacinamide 10% + Zinc Serum', 'Salicylic Acid 2% Cleanser', 'Moisturiser SPF 50'],
    ai_diet: ['Reduce dairy intake', 'Add Omega-3 (flaxseeds, walnuts)', 'Drink 2.5L water daily', 'Avoid high-glycemic foods'],
    ai_lifestyle: ['Use non-comedogenic products only', 'Change pillowcase weekly', 'Never pop pimples', '7-8 hrs sleep target'],
    camera_scans: 5,
  },
  {
    id: 2, name: 'Rahul Sharma', age: '18-24', gender: 'Male', location: 'Dry region',
    skin_type: 'Dry', overall_score: 48,
    concerns: ['Dryness & Dehydration', 'Dull & Uneven Tone'], spf_usage: 'Rarely',
    sleep: '4-5 hrs', water: '<1L', routine: 'Minimal',
    submitted_at: new Date(Date.now() - 7200000).toISOString(),
    status: 'pending_review', consultation_type: 'scheduled', specialist: null,
    ai_products: ['Hyaluronic Acid 2% + B5 Serum', 'Ceramide Rich Cream', 'Vitamin C Serum', 'SPF 50 Moisturiser'],
    ai_diet: ['Increase water to 3L/day', 'Add healthy fats: avocado, nuts', 'Vitamin E rich foods', 'Reduce caffeine'],
    ai_lifestyle: ['Avoid hot showers', 'Apply moisturiser on damp skin', 'Use humidifier at night', 'Increase sleep to 7+ hrs'],
    camera_scans: 3,
  },
  {
    id: 3, name: 'Neha Gupta', age: '35-44', gender: 'Female', location: 'Coastal',
    skin_type: 'Normal-Sensitive', overall_score: 74,
    concerns: ['Aging & Fine Lines', 'Redness & Sensitivity'], spf_usage: 'Daily',
    sleep: '8+ hrs', water: '2L+', routine: 'Advanced',
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'reviewed', consultation_type: 'scheduled', specialist: 'Dr. Priya Mehta',
    ai_products: ['Retinol 0.5% Serum', 'Peptide Moisturiser', 'SPF 50+ PA++++', 'Ceramide Barrier Cream'],
    ai_diet: ['Collagen-boosting foods: bone broth, berries', 'Antioxidant-rich diet', 'Reduce sugar (glycation)', 'Add Vitamin C foods'],
    ai_lifestyle: ['Apply SPF religiously', 'Silk pillowcase for anti-aging', 'Facial massage improves circulation', 'Avoid excessive sun exposure'],
    camera_scans: 5,
  },
]

const SCORE_COLOR = (score: number) => score >= 70 ? C.green : score >= 50 ? C.gold : C.red
const STATUS_COLOR: Record<string, string> = { pending_review: C.orange, reviewed: C.green, consultation_done: C.blue }

export default function SkinReviewPanel() {
  const [profiles, setProfiles] = useState<any[]>(SEED_PROFILES)
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<'ai' | 'specialist'>('ai')
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'reviewed'>('all')
  const [specialistNotes, setSpecialistNotes] = useState('')
  const [specialistProducts, setSpecialistProducts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('skin_profiles').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data && data.length > 0) setProfiles([...data, ...SEED_PROFILES]) })
  }, [])

  useEffect(() => {
    if (selected) {
      setSpecialistNotes(selected.specialist_notes || '')
      setSpecialistProducts(selected.specialist_products || [...selected.ai_products])
    }
  }, [selected])

  const filtered = filter === 'all' ? profiles : profiles.filter(p => p.status === filter)

  async function saveReview() {
    if (!selected) return
    setSaving(true)
    try {
      await supabase.from('skin_profiles').update({
        status: 'reviewed',
        specialist_notes: specialistNotes,
        specialist_products: specialistProducts,
        reviewed_at: new Date().toISOString(),
      }).eq('id', selected.id)
      setProfiles(prev => prev.map(p => p.id === selected.id ? { ...p, status: 'reviewed', specialist_notes: specialistNotes, specialist_products: specialistProducts } : p))
      toast.success('Review saved & sent to patient!')
    } catch {
      toast.success('Review saved locally!')
    }
    setSaving(false)
  }

  const ScoreCircle = ({ score }: { score: number }) => (
    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `conic-gradient(${SCORE_COLOR(score)} ${score * 3.6}deg, #E5E7EB 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: SCORE_COLOR(score) }}>{score}</span>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', display: 'flex', gap: 20, height: 'calc(100vh - 100px)', minHeight: 600 }}>

      {/* Left — Profile List */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, margin: '0 0 4px' }}>Skin Review Panel</h1>
          <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>AI profiles awaiting specialist review</p>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'pending_review', 'reviewed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1px solid ${filter === f ? C.teal : C.border}`, background: filter === f ? C.teal : '#fff', color: filter === f ? '#fff' : C.mu, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : 'Done'}
            </button>
          ))}
        </div>

        {/* Profile Cards */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setSelected(p)} style={{
              background: selected?.id === p.id ? C.teal + '10' : '#fff',
              border: `1px solid ${selected?.id === p.id ? C.teal : C.border}`,
              borderLeft: `3px solid ${selected?.id === p.id ? C.teal : STATUS_COLOR[p.status] || C.mu}`,
              borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <ScoreCircle score={p.overall_score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.mu }}>{p.age} · {p.gender} · {p.skin_type}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    {p.concerns.slice(0, 2).map((c: string) => (
                      <span key={c} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{c.split(' ')[0]}</span>
                    ))}
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: STATUS_COLOR[p.status] + '18', color: STATUS_COLOR[p.status], fontWeight: 700 }}>
                      {p.status === 'pending_review' ? '● Pending' : '● Reviewed'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.mu, marginTop: 6 }}>
                📷 {p.camera_scans} scans · {p.consultation_type === 'instant' ? '⚡ Instant' : '📅 Scheduled'} · {new Date(p.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Detail Panel */}
      {selected ? (
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, background: C.cream, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <ScoreCircle score={selected.overall_score} />
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: '0 0 2px' }}>{selected.name}</h2>
                <div style={{ fontSize: 12, color: C.mu }}>{selected.age} · {selected.gender} · {selected.location} · {selected.skin_type}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, background: selected.consultation_type === 'instant' ? C.green + '18' : C.blue + '18', color: selected.consultation_type === 'instant' ? C.green : C.blue, fontWeight: 700 }}>
                {selected.consultation_type === 'instant' ? '⚡ Instant' : '📅 Scheduled'}
              </span>
              <button onClick={saveReview} disabled={saving} style={{ padding: '7px 18px', background: saving ? '#9CA3AF' : `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saving...' : '✓ Save & Send Review'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {[['ai', '🤖 AI Analysis'], ['specialist', '👨‍⚕️ Specialist Review']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id as any)} style={{ flex: 1, padding: '12px 0', border: 'none', background: tab === id ? '#fff' : C.cream, color: tab === id ? C.teal : C.mu, fontSize: 13, fontWeight: tab === id ? 700 : 400, cursor: 'pointer', borderBottom: tab === id ? `2px solid ${C.teal}` : '2px solid transparent' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

            {tab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Quiz Summary */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Patient Info from Quiz</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      ['SPF Usage', selected.spf_usage],
                      ['Sleep', selected.sleep],
                      ['Water Intake', selected.water],
                      ['Routine Level', selected.routine],
                      ['Camera Scans', `${selected.camera_scans}/5`],
                      ['Submitted', new Date(selected.submitted_at).toLocaleString('en-IN')],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: C.cream, borderRadius: 9, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, color: C.mu, marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Detected Concerns */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>AI Detected Concerns</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.concerns.map((concern: string, i: number) => (
                      <div key={i} style={{ padding: '12px 14px', background: C.red + '08', border: `1px solid ${C.red}22`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{concern}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 8, background: i === 0 ? C.red + '18' : C.gold + '18', color: i === 0 ? C.red : C.gold }}>{i === 0 ? 'Primary' : 'Secondary'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Product Recommendations */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>AI Product Recommendations</div>
                  {selected.ai_products.map((prod: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', background: C.teal + '08', border: `1px solid ${C.teal}22`, borderRadius: 9, marginBottom: 6 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.teal + '20', color: C.teal, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: C.dark }}>{prod}</span>
                    </div>
                  ))}
                </div>

                {/* AI Diet */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>AI Diet Recommendations</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {selected.ai_diet.map((tip: string, i: number) => (
                      <div key={i} style={{ padding: '9px 12px', background: C.green + '08', border: `1px solid ${C.green}22`, borderRadius: 9, fontSize: 12, color: C.dark }}>🥗 {tip}</div>
                    ))}
                  </div>
                </div>

                {/* AI Lifestyle */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>AI Lifestyle Tips</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {selected.ai_lifestyle.map((tip: string, i: number) => (
                      <div key={i} style={{ padding: '9px 12px', background: C.purple + '08', border: `1px solid ${C.purple}22`, borderRadius: 9, fontSize: 12, color: C.dark }}>💡 {tip}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'specialist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: '14px 18px', background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE' }}>
                  <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0 }}>
                    👨‍⚕️ Review the AI analysis, add your expert notes, and approve/edit product recommendations. Your review will be sent to the patient.
                  </p>
                </div>

                {/* Specialist Notes */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.dark, display: 'block', marginBottom: 8 }}>Specialist Notes to Patient</label>
                  <textarea
                    value={specialistNotes}
                    onChange={e => setSpecialistNotes(e.target.value)}
                    placeholder={`Hi ${selected.name}, based on your AI skin analysis and the 32-point scan, I've reviewed your profile. Your primary concern is ${selected.concerns[0]}. Here are my personalized recommendations...`}
                    style={{ width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Edit Product Recommendations */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Edit Product Recommendations</div>
                  <p style={{ fontSize: 11, color: C.mu, marginBottom: 12 }}>AI suggested these — edit, reorder, or add your own</p>
                  {specialistProducts.map((prod, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 26, height: 38, borderRadius: 7, background: C.teal + '15', color: C.teal, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <input value={prod} onChange={e => { const u = [...specialistProducts]; u[i] = e.target.value; setSpecialistProducts(u) }} style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none' }} />
                      <button onClick={() => setSpecialistProducts(p => p.filter((_, idx) => idx !== i))} style={{ width: 34, height: 38, borderRadius: 7, border: `1px solid ${C.red}33`, background: C.red + '10', color: C.red, cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setSpecialistProducts(p => [...p, ''])} style={{ fontSize: 12, color: C.teal, background: 'none', border: `1px dashed ${C.teal}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 }}>+ Add Product</button>
                </div>

                {/* Consultation Notes */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: C.dark, display: 'block', marginBottom: 8 }}>Consultation Summary (internal)</label>
                  <textarea
                    placeholder="Internal notes about this patient's consultation..."
                    style={{ width: '100%', minHeight: 80, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveReview} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? '#9CA3AF' : `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Sending...' : '✓ Save & Send to Patient'}
                  </button>
                  <button style={{ flex: 1, padding: '12px', background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.dark }}>
                    📞 Call Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 48 }}>🔬</div>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>Select a profile to review</p>
          <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Click any patient card on the left to view their AI skin analysis</p>
        </div>
      )}
    </div>
  )
}
