'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B',
  border: '#E5E7EB', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6',
  blue: '#3B82F6',
}

type Tab = 'analyze' | 'history' | 'embed'

interface AnalysisResult {
  skinType: string; concerns: string[]; hydrationLevel: string
  oiliness: string; sensitivity: string; score: number
  recommendations: { product: string; reason: string; price: number }[]
  routine: { step: string; product: string; when: string }[]
  tips: string[]
}

const QUIZ_QUESTIONS = [
  { id: 'type', label: 'Skin kaisi feel hoti hai subah uthne ke baad?', options: ['Tight aur dry', 'Normal — comfortable', 'Oily — T-zone shine', 'Dry + acne dono hain', 'Bahut sensitive, burns easily'] },
  { id: 'concern', label: 'Aapki main skin concern kya hai?', options: ['Dark spots / Pigmentation', 'Acne / Pimples', 'Dryness / Dull skin', 'Fine lines / Aging', 'Oiliness / Large pores', 'Redness / Irritation', 'Hairfall / Dandruff'] },
  { id: 'age', label: 'Age group?', options: ['Under 20', '20-25', '25-30', '30-40', '40+'] },
  { id: 'location', label: 'City/Climate?', options: ['Humid (Mumbai, Chennai)', 'Dry (Delhi, Rajasthan)', 'Moderate (Pune, Bangalore)', 'Very Hot (Nagpur, Hyderabad)'] },
  { id: 'routine', label: 'Current skincare routine?', options: ['Sirf sabun se dhota hoon', 'Basic — face wash + moisturizer', 'Proper routine follow karta hoon', 'Specialist routine hai'] },
]

export default function SkinAnalysisPage() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [mode, setMode] = useState<'quiz' | 'photo' | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [photoFile, setPhotoFile] = useState<string | null>(null)

  const DEMO_HISTORY = [
    { name: 'Priya Sharma', date: '24 Mar 2026', skinType: 'Combination', concerns: ['Acne', 'Oiliness'], products: ['Niacinamide Toner', 'Clay Mask'], converted: true },
    { name: 'Rohit Kumar', date: '23 Mar 2026', skinType: 'Dry', concerns: ['Dryness', 'Fine Lines'], products: ['Hyaluronic Acid Serum', 'Hydrating Cream'], converted: false },
    { name: 'Anjali Verma', date: '22 Mar 2026', skinType: 'Oily', concerns: ['Acne', 'Dark Spots'], products: ['Salicylic Acid Serum', 'Vitamin C'], converted: true },
    { name: 'Meena Patel', date: '21 Mar 2026', skinType: 'Sensitive', concerns: ['Redness', 'Irritation'], products: ['Calming Serum', 'Gentle Cleanser'], converted: true },
  ]

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/skin-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, customerName, customerPhone, mode }),
      })
      if (res.ok) {
        const d = await res.json()
        setResult(d.analysis)
      } else {
        toast.error('Analysis failed')
      }
    } catch { toast.error('Analysis failed') }
    setAnalyzing(false)
  }

  function resetAnalysis() {
    setResult(null); setMode(null); setStep(0); setAnswers({})
    setCustomerName(''); setCustomerPhone(''); setPhotoFile(null)
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'analyze', label: 'New Analysis', icon: '🔍' },
    { id: 'history', label: 'Analysis History', icon: '📋' },
    { id: 'embed', label: 'Website Widget', icon: '🌐' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.dark }}>Skin Analysis Agent</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>AI skin quiz → instant analysis → personalized product routine</p>
        </div>
        <span style={{ background: C.teal, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>AI</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Analyses Done', value: '2,847', icon: '🔍', color: C.teal },
          { label: 'Conversion Rate', value: '38%', icon: '✅', color: C.green },
          { label: 'Avg Products/Analysis', value: '3.2', icon: '🛍️', color: C.gold },
          { label: 'Revenue Generated', value: '₹8.4L', icon: '💰', color: C.purple },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t.id ? C.teal : 'transparent', color: tab === t.id ? '#fff' : '#6B7280' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* NEW ANALYSIS */}
      {tab === 'analyze' && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {!mode && !result && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Skin Analysis Start Karein</h2>
              <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32 }}>Customer ka naam aur number dale, phir quiz mode choose karein</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, textAlign: 'left' }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Customer Name</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Priya Sharma" style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>WhatsApp Number</label>
                  <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 14 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { mode: 'quiz', icon: '📝', title: 'Skin Quiz', desc: '5 quick questions — AI analyzes answers', color: C.teal },
                  { mode: 'photo', icon: '📸', title: 'Photo Analysis', desc: 'Upload skin photo — Claude Vision analyzes', color: C.purple },
                ].map(opt => (
                  <button key={opt.mode} onClick={() => setMode(opt.mode as 'quiz' | 'photo')} style={{ border: `2px solid ${opt.color}`, borderRadius: 12, padding: '20px 16px', cursor: 'pointer', background: '#fff', textAlign: 'center', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{opt.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: opt.color, marginBottom: 4 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'quiz' && !result && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>
                  <span>Question {step + 1} of {QUIZ_QUESTIONS.length}</span>
                  <span>{Math.round(((step) / QUIZ_QUESTIONS.length) * 100)}% done</span>
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(step / QUIZ_QUESTIONS.length) * 100}%`, background: C.teal, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 20 }}>{QUIZ_QUESTIONS[step].label}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {QUIZ_QUESTIONS[step].options.map(opt => (
                  <button key={opt} onClick={() => {
                    setAnswers(prev => ({ ...prev, [QUIZ_QUESTIONS[step].id]: opt }))
                    if (step < QUIZ_QUESTIONS.length - 1) setStep(s => s + 1)
                    else runAnalysis()
                  }} style={{ padding: '12px 16px', borderRadius: 10, border: `2px solid ${answers[QUIZ_QUESTIONS[step].id] === opt ? C.teal : C.border}`, background: answers[QUIZ_QUESTIONS[step].id] === opt ? '#F0FDF4' : '#fff', cursor: 'pointer', fontSize: 14, textAlign: 'left', color: C.dark, fontWeight: answers[QUIZ_QUESTIONS[step].id] === opt ? 700 : 400, transition: 'all 0.1s' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'photo' && !result && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 8 }}>📸 Skin Photo Upload</h3>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Claude Vision skin ko analyze karke type, concerns aur products recommend karega</p>

              <label style={{ display: 'block', border: `2px dashed ${C.teal}`, borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#F0FDF4' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{photoFile ? '✅' : '📷'}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{photoFile ? 'Photo uploaded!' : 'Click to upload selfie / skin photo'}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>JPG, PNG — clear face photo in good light</div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  if (e.target.files?.[0]) {
                    setPhotoFile(URL.createObjectURL(e.target.files[0]))
                    toast.success('Photo uploaded!')
                  }
                }} />
              </label>

              {photoFile && (
                <div style={{ marginTop: 16 }}>
                  <img src={photoFile} alt="uploaded" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                </div>
              )}

              <button onClick={runAnalysis} disabled={!photoFile || analyzing} style={{ width: '100%', marginTop: 20, background: analyzing ? '#9CA3AF' : C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer' }}>
                {analyzing ? '🧠 Analyzing skin...' : '🧠 Analyze with AI'}
              </button>
            </div>
          )}

          {analyzing && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.dark }}>AI analyzing skin profile...</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>Recommending personalized products for {customerName}</div>
            </div>
          )}

          {result && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.dark }}>✅ Analysis for {customerName}</h3>
                <button onClick={resetAnalysis} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>New Analysis</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Skin Type', value: result.skinType, icon: '🌿' },
                  { label: 'Hydration', value: result.hydrationLevel, icon: '💧' },
                  { label: 'Sensitivity', value: result.sensitivity, icon: '🌸' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginTop: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 8 }}>Main Concerns</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {result.concerns.map((c, i) => (
                    <span key={i} style={{ background: '#FEF3C7', color: C.gold, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 10 }}>Recommended Products</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{r.product}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{r.reason}</div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.teal }}>₹{r.price}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { toast.success(`Results sent to ${customerPhone}!`) }} style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  📱 Send Results on WhatsApp
                </button>
                <button onClick={() => toast.success('Saved to skin profiles!')} style={{ flex: 1, background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  💾 Save to Skin Profiles
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DEMO_HISTORY.map((h, i) => (
            <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{h.name}</div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>{h.date} · {h.skinType} Skin</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {h.concerns.map((c, j) => <span key={j} style={{ fontSize: 11, background: '#FEF3C7', color: C.gold, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{c}</span>)}
                  {h.products.map((p, j) => <span key={j} style={{ fontSize: 11, background: '#EFF6FF', color: C.blue, padding: '2px 8px', borderRadius: 10 }}>{p}</span>)}
                </div>
              </div>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: h.converted ? '#D1FAE5' : '#F3F4F6', color: h.converted ? C.green : '#9CA3AF', fontWeight: 700 }}>
                {h.converted ? '✅ Converted' : 'No Purchase'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* EMBED */}
      {tab === 'embed' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: C.dark }}>🌐 Website Widget</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>Yeh widget rabtnaturals.com pe add karo — customers seedha website se skin analysis le sakein</p>
            <div style={{ background: '#1E293B', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <pre style={{ color: '#34D399', fontSize: 12, margin: 0, overflowX: 'auto' }}>{`<!-- Rabt Naturals Skin Analysis Widget -->
<script>
  window.RabtSkinWidget = {
    siteKey: 'rabt_naturals_prod',
    theme: 'teal',
    position: 'bottom-right',
    ctaText: 'Free Skin Analysis →'
  }
</script>
<script src="https://rabt-hq.onrender.com/widget/skin-analysis.js"></script>`}</pre>
            </div>
            <button onClick={() => { navigator.clipboard.writeText('<!-- Rabt widget code -->'); toast.success('Code copied!') }} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📋 Copy Embed Code
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
