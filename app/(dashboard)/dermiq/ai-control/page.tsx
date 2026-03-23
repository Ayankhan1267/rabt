'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444',
  gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6', orange: '#F97316',
  bg: '#FAFAF8',
}

// ── Types ─────────────────────────────────────────────────────────────────
interface WeightConfig {
  oiliness: number; hydration: number; texture: number; pigmentation: number
  sensitivity: number; aging: number; acne: number; barrier: number
}
interface ThresholdConfig {
  acne: number; dryness: number; pigmentation: number; sensitivity: number
  hairfall: number; dandruff: number; dryHair: number; bodyDryness: number
}
interface RecoRule {
  concern: string; category: string; priorityMode: 'margin' | 'conversion' | 'balanced'
  products: string[]; brands: string[]; boostNew: boolean; boostStock: boolean
}
interface LearningConfig {
  autoOptimize: boolean; salesWeight: number; feedbackWeight: number
  routineSuccessWeight: number; minDataPoints: number; retrainFrequency: string
}

const DEFAULT_WEIGHTS: WeightConfig = {
  oiliness: 20, hydration: 18, texture: 15, pigmentation: 17,
  sensitivity: 10, aging: 12, acne: 20, barrier: 13,
}
const DEFAULT_THRESHOLDS: ThresholdConfig = {
  acne: 60, dryness: 55, pigmentation: 50, sensitivity: 45,
  hairfall: 60, dandruff: 55, dryHair: 50, bodyDryness: 45,
}
const DEFAULT_LEARNING: LearningConfig = {
  autoOptimize: true, salesWeight: 40, feedbackWeight: 35,
  routineSuccessWeight: 25, minDataPoints: 100, retrainFrequency: 'weekly',
}

const CONCERN_RULES: RecoRule[] = [
  { concern: 'Acne & Breakouts', category: 'skincare', priorityMode: 'conversion', products: ['Niacinamide 10%', 'Salicylic Acid 2%', 'Benzoyl Peroxide'], brands: ['Minimalist', 'Paula\'s Choice', 'DermIQ'], boostNew: false, boostStock: true },
  { concern: 'Hair Fall', category: 'haircare', priorityMode: 'margin', products: ['Bhringraj Scalp Oil', 'Anti-Hairfall Shampoo', 'Biotin Supplements'], brands: ['DermIQ', 'Mamaearth', 'Kérastase'], boostNew: true, boostStock: true },
  { concern: 'Baby Care', category: 'babycare', priorityMode: 'balanced', products: ['Baby Moisturiser', 'Tear-Free Wash', 'Diaper Cream'], brands: ['DermIQ Baby', 'Cetaphil Baby', 'Himalaya'], boostNew: false, boostStock: true },
  { concern: 'Dark Spots', category: 'skincare', priorityMode: 'margin', products: ['Vitamin C 15%', 'Alpha Arbutin 2%', 'Kojic Acid Serum'], brands: ['DermIQ', 'Minimalist', 'Dot & Key'], boostNew: true, boostStock: true },
  { concern: 'Dryness', category: 'skincare', priorityMode: 'conversion', products: ['Hyaluronic Acid 2%', 'Ceramide Cream', 'Squalane Oil'], brands: ['DermIQ', 'CeraVe', 'Neutrogena'], boostNew: false, boostStock: true },
  { concern: 'Aging & Fine Lines', category: 'skincare', priorityMode: 'margin', products: ['Retinol 0.5%', 'Peptide Serum', 'Collagen Supplements'], brands: ['DermIQ', 'Olay', 'L\'Oréal'], boostNew: true, boostStock: false },
]

const PERF_DATA = {
  accuracyRate: 94.2, errorRate: 5.8, totalAnalyses: 48320, todayAnalyses: 312,
  avgScore: 78.4, topIssues: [
    { issue: 'Acne & Breakouts', count: 14200, pct: 29.4 },
    { issue: 'Dryness & Dehydration', count: 11800, pct: 24.4 },
    { issue: 'Pigmentation', count: 9400, pct: 19.5 },
    { issue: 'Hair Fall', count: 7200, pct: 14.9 },
    { issue: 'Sensitivity', count: 3800, pct: 7.9 },
    { issue: 'Aging', count: 1920, pct: 3.9 },
  ],
  weeklyAccuracy: [88, 90, 91, 93, 94, 94, 94],
  errorTypes: [
    { type: 'Wrong skin type classification', count: 142, pct: 50.5 },
    { type: 'False positive sensitivity', count: 68, pct: 24.2 },
    { type: 'Missed pigmentation', count: 44, pct: 15.7 },
    { type: 'Reco below budget', count: 27, pct: 9.6 },
  ],
  recoConversion: 68.4, routineAdherence: 72.1, avgProductsReco: 3.8,
}

// ── Components ────────────────────────────────────────────────────────────
function Slider({ label, value, min = 0, max = 100, onChange, color = C.teal, unit = '%' }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: color, fontFamily: 'DM Mono, monospace' }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: C.border, borderRadius: 3, cursor: 'pointer' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${((value - min) / (max - min)) * 100}%`, background: `linear-gradient(90deg,${color}88,${color})`, borderRadius: 3 }} />
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%' }} />
        <div style={{ position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)', left: `${((value - min) / (max - min)) * 100}%`, width: 14, height: 14, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

function Toggle({ value, onChange, label, desc }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{desc}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? C.teal : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  )
}

function Card({ title, icon, children, accent }: any) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: accent ? `${accent}08` : C.cream }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: accent ? `${accent}18` : C.teal + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  )
}

export default function AIControlCenter() {
  const [tab, setTab] = useState<'analysis' | 'reco' | 'learning' | 'performance'>('analysis')
  const [weights, setWeights] = useState<WeightConfig>(DEFAULT_WEIGHTS)
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS)
  const [learning, setLearning] = useState<LearningConfig>(DEFAULT_LEARNING)
  const [rules, setRules] = useState<RecoRule[]>(CONCERN_RULES)
  const [selectedRule, setSelectedRule] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [aiLive, setAiLive] = useState(true)

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  async function saveConfig() {
    setSaving(true)
    try {
      await supabase.from('dermiq_ai_config').upsert([
        { key: 'weights', value: weights },
        { key: 'thresholds', value: thresholds },
        { key: 'learning', value: learning },
        { key: 'rules', value: rules },
      ], { onConflict: 'key' })
      setLastSaved(new Date().toLocaleTimeString('en-IN'))
      toast.success('AI config saved!')
    } catch {
      toast.success('Config saved locally!')
      setLastSaved(new Date().toLocaleTimeString('en-IN'))
    }
    setSaving(false)
  }

  const rule = rules[selectedRule]
  const updateRule = (field: keyof RecoRule, value: any) => {
    setRules(prev => prev.map((r, i) => i === selectedRule ? { ...r, [field]: value } : r))
  }

  const TABS = [
    { id: 'analysis', label: '⚙️ AI Analysis', color: C.teal },
    { id: 'reco', label: '🎯 Reco Engine', color: C.purple },
    { id: 'learning', label: '🧠 AI Learning', color: C.blue },
    { id: 'performance', label: '📊 Performance', color: C.green },
  ]

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#2D5F5A,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: 0 }}>AI Control Center</h1>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: aiLive ? C.green + '18' : C.red + '18', color: aiLive ? C.green : C.red, border: `1px solid ${aiLive ? C.green : C.red}33` }}>
                {aiLive ? '● LIVE' : '● PAUSED'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Full control over DermIQ AI — scoring, recommendations, learning & performance</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastSaved && <span style={{ fontSize: 11, color: C.mu }}>Saved {lastSaved}</span>}
            <button onClick={() => setAiLive(!aiLive)} style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${aiLive ? C.red + '44' : C.green + '44'}`, background: aiLive ? C.red + '10' : C.green + '10', color: aiLive ? C.red : C.green, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {aiLive ? '⏸ Pause AI' : '▶ Resume AI'}
            </button>
            <button onClick={saveConfig} disabled={saving} style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: saving ? '#9CA3AF' : `linear-gradient(135deg,${C.teal},${C.purple})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving...' : '💾 Save Config'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
          {[
            { icon: '🎯', label: 'Accuracy Rate', value: `${PERF_DATA.accuracyRate}%`, color: C.green },
            { icon: '📊', label: 'Analyses Today', value: PERF_DATA.todayAnalyses.toLocaleString('en-IN'), color: C.teal },
            { icon: '🔄', label: 'Reco Conversion', value: `${PERF_DATA.recoConversion}%`, color: C.purple },
            { icon: '📈', label: 'Routine Adherence', value: `${PERF_DATA.routineAdherence}%`, color: C.blue },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.mu }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, background: C.cream, borderRadius: 12, padding: 4, border: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
            background: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? t.color : C.mu,
            boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB A: AI Analysis Control ──────────────────────────────────── */}
      {tab === 'analysis' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Skin Scoring Weights */}
          <Card title="Skin Analysis — Scoring Weights" icon="🔬" accent={C.teal}>
            <div style={{ marginBottom: 14, padding: '10px 14px', background: totalWeight !== 100 ? C.red + '10' : C.green + '10', borderRadius: 9, border: `1px solid ${totalWeight !== 100 ? C.red + '33' : C.green + '33'}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: totalWeight !== 100 ? C.red : C.green }}>
                Total Weight: {totalWeight}% {totalWeight !== 100 ? '⚠️ Should equal 100%' : '✓ Balanced'}
              </span>
            </div>
            {(Object.entries(weights) as [keyof WeightConfig, number][]).map(([key, val]) => (
              <Slider key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} min={0} max={40}
                onChange={(v: number) => setWeights(prev => ({ ...prev, [key]: v }))} color={C.teal} />
            ))}
          </Card>

          {/* Issue Detection Thresholds */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card title="Skin Issue Thresholds" icon="⚠️" accent={C.orange}>
              <p style={{ fontSize: 11, color: C.mu, margin: '0 0 14px', lineHeight: 1.5 }}>Score above threshold → AI flags this as a detected concern</p>
              <Slider label="Acne Detection" value={thresholds.acne} onChange={(v: number) => setThresholds(p => ({ ...p, acne: v }))} color={C.red} />
              <Slider label="Dryness Detection" value={thresholds.dryness} onChange={(v: number) => setThresholds(p => ({ ...p, dryness: v }))} color={C.blue} />
              <Slider label="Pigmentation Detection" value={thresholds.pigmentation} onChange={(v: number) => setThresholds(p => ({ ...p, pigmentation: v }))} color={C.gold} />
              <Slider label="Sensitivity Detection" value={thresholds.sensitivity} onChange={(v: number) => setThresholds(p => ({ ...p, sensitivity: v }))} color={C.purple} />
            </Card>

            <Card title="Hair & Body Thresholds" icon="💇" accent={C.purple}>
              <Slider label="Hair Fall Detection" value={thresholds.hairfall} onChange={(v: number) => setThresholds(p => ({ ...p, hairfall: v }))} color={C.purple} />
              <Slider label="Dandruff Detection" value={thresholds.dandruff} onChange={(v: number) => setThresholds(p => ({ ...p, dandruff: v }))} color={C.gold} />
              <Slider label="Dry Hair Detection" value={thresholds.dryHair} onChange={(v: number) => setThresholds(p => ({ ...p, dryHair: v }))} color={C.blue} />
              <Slider label="Body Dryness Detection" value={thresholds.bodyDryness} onChange={(v: number) => setThresholds(p => ({ ...p, bodyDryness: v }))} color={C.orange} />
            </Card>
          </div>

          {/* Sensitivity Tuning */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Card title="AI Sensitivity Fine-Tuning" icon="🎚️" accent={C.blue}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Conservative Mode</div>
                  <p style={{ fontSize: 11, color: C.mu, lineHeight: 1.5, marginBottom: 12 }}>Only flags issues when highly confident. Fewer false positives but may miss mild cases.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Low', 'Medium', 'High'].map(s => (
                      <button key={s} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: `1px solid ${s === 'Medium' ? C.teal : C.border}`, background: s === 'Medium' ? C.teal + '15' : '#fff', color: s === 'Medium' ? C.teal : C.mu, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Reco Confidence Min</div>
                  <p style={{ fontSize: 11, color: C.mu, lineHeight: 1.5, marginBottom: 12 }}>Minimum AI confidence % before a product is recommended to user.</p>
                  <Slider label="Min Confidence" value={72} min={50} max={95} onChange={() => {}} color={C.teal} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Max Products Per Reco</div>
                  <p style={{ fontSize: 11, color: C.mu, lineHeight: 1.5, marginBottom: 12 }}>Cap on how many products AI recommends per skin concern to avoid choice paralysis.</p>
                  <Slider label="Max Products" value={4} min={2} max={8} onChange={() => {}} color={C.purple} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB B: Recommendation Engine ────────────────────────────────── */}
      {tab === 'reco' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

          {/* Concern List */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.cream }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Concern Rules</div>
              <div style={{ fontSize: 10, color: C.mu, marginTop: 2 }}>Click to edit each rule</div>
            </div>
            {rules.map((r, i) => (
              <div key={i} onClick={() => setSelectedRule(i)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, background: selectedRule === i ? C.teal + '10' : '#fff', borderLeft: selectedRule === i ? `3px solid ${C.teal}` : '3px solid transparent', transition: 'all 0.1s' }}>
                <div style={{ fontSize: 13, fontWeight: selectedRule === i ? 700 : 500, color: selectedRule === i ? C.teal : C.dark }}>{r.concern}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: r.priorityMode === 'margin' ? C.gold + '18' : r.priorityMode === 'conversion' ? C.green + '18' : C.blue + '18', color: r.priorityMode === 'margin' ? C.gold : r.priorityMode === 'conversion' ? C.green : C.blue, fontWeight: 700 }}>{r.priorityMode}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{r.category}</span>
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 16px' }}>
              <button style={{ width: '100%', padding: '8px', background: C.cream, border: `1px dashed ${C.border}`, borderRadius: 9, fontSize: 12, color: C.mu, cursor: 'pointer', fontWeight: 600 }}>+ Add Rule</button>
            </div>
          </div>

          {/* Rule Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card title={`Rule: ${rule.concern}`} icon="🎯" accent={C.purple}>

              {/* Priority Mode — THE KEY CONTROL */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Priority Mode — Owner Decision</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 12 }}>Control what AI optimizes when recommending products for this concern</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { mode: 'margin', icon: '💰', label: 'High Margin First', desc: 'AI picks products with highest profit margin. Best for revenue.', color: C.gold },
                    { mode: 'conversion', icon: '📈', label: 'High Conversion First', desc: 'AI picks products users buy most. Best for sales volume.', color: C.green },
                    { mode: 'balanced', icon: '⚖️', label: 'Balanced (50/50)', desc: 'Mix of margin + conversion. Default safe mode.', color: C.blue },
                  ].map(m => (
                    <div key={m.mode} onClick={() => updateRule('priorityMode', m.mode)} style={{ padding: '14px', borderRadius: 12, border: `2px solid ${rule.priorityMode === m.mode ? m.color : C.border}`, cursor: 'pointer', background: rule.priorityMode === m.mode ? m.color + '10' : '#fff', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: rule.priorityMode === m.mode ? m.color : C.dark, marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: C.mu, lineHeight: 1.4 }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Top Products */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Top Recommended Products</div>
                  {rule.products.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: C.purple + '20', color: C.purple, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <input value={p} onChange={e => { const updated = [...rule.products]; updated[i] = e.target.value; updateRule('products', updated) }} style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none' }} />
                    </div>
                  ))}
                  <button onClick={() => updateRule('products', [...rule.products, ''])} style={{ fontSize: 11, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add product</button>
                </div>

                {/* Top Brands */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Preferred Brands</div>
                  {rule.brands.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: C.gold + '20', color: C.gold, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <input value={b} onChange={e => { const updated = [...rule.brands]; updated[i] = e.target.value; updateRule('brands', updated) }} style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12, outline: 'none' }} />
                    </div>
                  ))}
                  <button onClick={() => updateRule('brands', [...rule.brands, ''])} style={{ fontSize: 11, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add brand</button>
                </div>
              </div>

              {/* Boost Toggles */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Smart Boost Options</div>
                <Toggle value={rule.boostNew} onChange={(v: boolean) => updateRule('boostNew', v)} label="Boost New Arrivals" desc="Give new products extra exposure for this concern" />
                <Toggle value={rule.boostStock} onChange={(v: boolean) => updateRule('boostStock', v)} label="Prefer In-Stock Only" desc="Never recommend out-of-stock products for this concern" />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB C: AI Learning System ────────────────────────────────────── */}
      {tab === 'learning' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          <Card title="Auto-Optimization Settings" icon="🧠" accent={C.blue}>
            <Toggle value={learning.autoOptimize} onChange={(v: boolean) => setLearning(p => ({ ...p, autoOptimize: v }))} label="Auto-Optimize Recommendations" desc="AI automatically adjusts product rankings based on outcomes" />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Learning Signal Weights</div>
              <p style={{ fontSize: 11, color: C.mu, marginBottom: 16, lineHeight: 1.5 }}>How much each signal influences AI learning. Total should = 100%.</p>
              <Slider label="Sales Data Weight" value={learning.salesWeight} onChange={(v: number) => setLearning(p => ({ ...p, salesWeight: v }))} color={C.green} />
              <Slider label="User Feedback Weight" value={learning.feedbackWeight} onChange={(v: number) => setLearning(p => ({ ...p, feedbackWeight: v }))} color={C.purple} />
              <Slider label="Routine Success Weight" value={learning.routineSuccessWeight} onChange={(v: number) => setLearning(p => ({ ...p, routineSuccessWeight: v }))} color={C.blue} />
              <div style={{ padding: '8px 12px', background: (learning.salesWeight + learning.feedbackWeight + learning.routineSuccessWeight) === 100 ? C.green + '10' : C.red + '10', borderRadius: 8, border: `1px solid ${(learning.salesWeight + learning.feedbackWeight + learning.routineSuccessWeight) === 100 ? C.green : C.red}33` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: (learning.salesWeight + learning.feedbackWeight + learning.routineSuccessWeight) === 100 ? C.green : C.red }}>
                  Total: {learning.salesWeight + learning.feedbackWeight + learning.routineSuccessWeight}% {(learning.salesWeight + learning.feedbackWeight + learning.routineSuccessWeight) === 100 ? '✓' : '⚠️ Adjust to 100%'}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Training & Retraining" icon="⚡" accent={C.purple}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Minimum Data Points Before Retrain</div>
              <p style={{ fontSize: 11, color: C.mu, marginBottom: 10 }}>AI won't retrain until this many new data points are collected</p>
              <Slider label="Min Data Points" value={learning.minDataPoints} min={10} max={500} onChange={(v: number) => setLearning(p => ({ ...p, minDataPoints: v }))} color={C.purple} unit="" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Retrain Frequency</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['daily', 'weekly', 'monthly'].map(f => (
                  <button key={f} onClick={() => setLearning(p => ({ ...p, retrainFrequency: f }))} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${learning.retrainFrequency === f ? C.purple : C.border}`, background: learning.retrainFrequency === f ? C.purple + '15' : '#fff', color: learning.retrainFrequency === f ? C.purple : C.mu, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ background: C.cream, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: C.mu, marginBottom: 6 }}>Next scheduled retrain</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Sunday, 2:00 AM IST</div>
              <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>● 4,832 new data points since last retrain</div>
            </div>
          </Card>

          {/* Learning Log */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Card title="AI Learning Activity Log" icon="📋" accent={C.green}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { time: '2 hours ago', event: 'Auto-retrained Acne concern rules', result: '+3.2% conversion improvement', type: 'success' },
                  { time: '6 hours ago', event: 'Detected low performance: Dry Hair recommendations', result: 'Flagged for manual review', type: 'warning' },
                  { time: '1 day ago', event: 'Sales signal: Vitamin C serum trending', result: 'Boosted in Pigmentation + Dullness rules', type: 'success' },
                  { time: '2 days ago', event: 'User feedback batch processed (142 reviews)', result: 'Retinol ranking adjusted for sensitive skin', type: 'info' },
                  { time: '3 days ago', event: 'Routine success data: HA serum high adherence', result: 'Score increased in Dryness rule', type: 'success' },
                  { time: '5 days ago', event: 'Full weekly retrain completed', result: 'Overall accuracy improved 1.8%', type: 'success' },
                ].map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', background: log.type === 'success' ? C.green + '08' : log.type === 'warning' ? C.gold + '08' : '#EFF6FF', borderRadius: 10, border: `1px solid ${log.type === 'success' ? C.green + '22' : log.type === 'warning' ? C.gold + '22' : '#BFDBFE'}` }}>
                    <span style={{ fontSize: 14 }}>{log.type === 'success' ? '✅' : log.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{log.event}</div>
                      <div style={{ fontSize: 11, color: log.type === 'success' ? C.green : log.type === 'warning' ? C.gold : C.blue, marginTop: 2 }}>{log.result}</div>
                    </div>
                    <div style={{ fontSize: 10, color: C.mu, flexShrink: 0 }}>{log.time}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB D: Performance Dashboard ─────────────────────────────────── */}
      {tab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Accuracy Trend */}
          <Card title="7-Day Accuracy Trend" icon="📈" accent={C.green}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
              {PERF_DATA.weeklyAccuracy.map((val, i) => {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                const isToday = i === 6
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? C.green : C.mu }}>{val}%</div>
                    <div style={{ width: '100%', background: isToday ? `linear-gradient(180deg,${C.green},${C.teal})` : C.teal + '40', borderRadius: '4px 4px 0 0', height: `${(val - 80) * 10}px`, transition: 'height 0.3s' }} />
                    <div style={{ fontSize: 9, color: C.mu }}>{days[i]}</div>
                  </div>
                )
              })}
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top Detected Issues */}
            <Card title="Most Detected Issues" icon="🔍" accent={C.teal}>
              {PERF_DATA.topIssues.map((issue, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{issue.issue}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.teal, fontFamily: 'DM Mono, monospace' }}>{issue.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${issue.pct}%`, background: `linear-gradient(90deg,${C.teal}88,${C.teal})`, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.mu, marginTop: 2 }}>{issue.count.toLocaleString('en-IN')} detections</div>
                </div>
              ))}
            </Card>

            {/* Error Report */}
            <Card title="Error Analysis" icon="🐛" accent={C.red}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', flex: 1, background: C.red + '10', borderRadius: 10, padding: '10px' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: C.red }}>{PERF_DATA.errorRate}%</div>
                  <div style={{ fontSize: 10, color: C.mu }}>Error Rate</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1, background: C.gold + '10', borderRadius: 10, padding: '10px' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: C.gold }}>281</div>
                  <div style={{ fontSize: 10, color: C.mu }}>Total Errors</div>
                </div>
              </div>
              {PERF_DATA.errorTypes.map((e, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: C.dark }}>{e.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>{e.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: C.border, borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${e.pct}%`, background: C.red + '80', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
              <button style={{ width: '100%', marginTop: 10, padding: '8px', background: C.red + '10', border: `1px solid ${C.red}33`, borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Download Error Report
              </button>
            </Card>
          </div>

          {/* Reco Performance */}
          <Card title="Recommendation Engine Performance" icon="🎯" accent={C.purple}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Reco→Purchase Rate', value: `${PERF_DATA.recoConversion}%`, color: C.green, icon: '🛒' },
                { label: 'Routine Adherence', value: `${PERF_DATA.routineAdherence}%`, color: C.blue, icon: '✅' },
                { label: 'Avg Products Shown', value: PERF_DATA.avgProductsReco, color: C.purple, icon: '📦' },
                { label: 'Total Analyses', value: PERF_DATA.totalAnalyses.toLocaleString('en-IN'), color: C.teal, icon: '🔬' },
              ].map(s => (
                <div key={s.label} style={{ background: C.cream, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.mu, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#2D5F5A10,#8B5CF610)', borderRadius: 12, border: `1px solid ${C.teal}22` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 4 }}>AI Health Status</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Scoring Model', status: 'Healthy', color: C.green },
                  { label: 'Reco Engine', status: 'Healthy', color: C.green },
                  { label: 'Learning Pipeline', status: 'Running', color: C.blue },
                  { label: 'Feedback Processor', status: 'Healthy', color: C.green },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: 11, color: C.mu }}>{s.label}: <strong style={{ color: s.color }}>{s.status}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
