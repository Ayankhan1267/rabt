'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const CONCERNS = ['Acne', 'Pigmentation', 'Anti-Aging', 'Dryness', 'Oily Skin', 'Sensitive Skin', 'Eczema', 'Rosacea', 'Dark Circles', 'Uneven Tone']

type ProductStatus = 'pending' | 'approved' | 'rejected'
type AIResult = { icon: string; text: string; ok: boolean } []

interface Product {
  id: number
  name: string
  brand: string
  category: string
  price: number
  mrp: number
  vendor: string
  vendorScore: number
  submittedDaysAgo: number
  emoji: string
  ingredients: string[]
  claims: string[]
  status: ProductStatus
  checklist: boolean[]
  aiResult: AIResult | null
  aiLoading: boolean
  rejectionReason: string
  changesList: string
  aiConcerns: string[]
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1, name: 'Rose Hip Brightening Serum', brand: 'GlowMart', category: 'Serum', price: 599, mrp: 799, vendor: 'GlowMart Pvt Ltd', vendorScore: 92, submittedDaysAgo: 2, emoji: '🌹',
    ingredients: ['Rosehip Oil 5%', 'Vitamin C 10%', 'Niacinamide 4%', 'Hyaluronic Acid', 'Glycerin', 'Ferulic Acid', 'Zinc PCA', 'Allantoin'],
    claims: ['Brightens skin tone', 'Reduces dark spots', 'Boosts collagen', 'Hydrates deeply'],
    status: 'pending', checklist: [false, false, false, false, false], aiResult: null, aiLoading: false, rejectionReason: '', changesList: '', aiConcerns: [],
  },
  {
    id: 2, name: 'Peptide Anti-Aging Cream', brand: 'NaturalCo', category: 'Moisturizer', price: 1299, mrp: 1599, vendor: 'NaturalCo Wellness', vendorScore: 88, submittedDaysAgo: 3, emoji: '🧴',
    ingredients: ['Palmitoyl Tripeptide-1', 'Palmitoyl Tetrapeptide-7', 'Retinol 0.025%', 'Ceramide NP', 'Shea Butter', 'Squalane', 'Panthenol'],
    claims: ['Reduces fine lines', 'Firms skin', 'Anti-aging', 'Dermatologist tested'],
    status: 'pending', checklist: [false, false, false, false, false], aiResult: null, aiLoading: false, rejectionReason: '', changesList: '', aiConcerns: [],
  },
  {
    id: 3, name: 'Charcoal Deep Cleanse Wash', brand: 'PureKlenz', category: 'Cleanser', price: 349, mrp: 449, vendor: 'PureKlenz Industries', vendorScore: 75, submittedDaysAgo: 1, emoji: '🪨',
    ingredients: ['Activated Charcoal 2%', 'Salicylic Acid 0.5%', 'Tea Tree Oil', 'Aloe Vera Extract', 'Coconut-derived Surfactants', 'Glycerin'],
    claims: ['Deep pore cleansing', 'Controls excess oil', 'Removes toxins', 'Antibacterial'],
    status: 'pending', checklist: [false, false, false, false, false], aiResult: null, aiLoading: false, rejectionReason: '', changesList: '', aiConcerns: [],
  },
  {
    id: 4, name: 'Hair Growth Bhringraj Oil', brand: 'HerbalRoots', category: 'Hair Oil', price: 449, mrp: 599, vendor: 'HerbalRoots Organics', vendorScore: 81, submittedDaysAgo: 5, emoji: '🌿',
    ingredients: ['Bhringraj Extract', 'Amla Oil', 'Brahmi', 'Coconut Oil', 'Castor Oil', 'Rosemary Essential Oil', 'Fenugreek Extract'],
    claims: ['Stimulates hair growth', 'Reduces hair fall', 'Strengthens roots', '100% natural', 'Ayurvedic formula'],
    status: 'pending', checklist: [false, false, false, false, false], aiResult: null, aiLoading: false, rejectionReason: '', changesList: '', aiConcerns: [],
  },
]

const APPROVED_SEED = [
  { id: 10, name: 'Niacinamide 10% + Zinc 1%', brand: 'The Ordinary', category: 'Serum', price: 399, emoji: '✨', vendor: 'DECIEM India', approvedDate: 'Mar 15' },
  { id: 11, name: 'Vitamin C Brightening Serum', brand: 'Minimalist', category: 'Serum', price: 599, emoji: '🍊', vendor: 'Minimalist India', approvedDate: 'Mar 12' },
  { id: 12, name: 'SPF 60 Sunscreen', brand: 'Dot & Key', category: 'Sunscreen', price: 649, emoji: '☀️', vendor: 'Dot & Key Wellness', approvedDate: 'Mar 10' },
]

const REJECTED_SEED = [
  { id: 20, name: 'Herbal Whitening Cream', brand: 'FairGlow', category: 'Cream', price: 299, emoji: '❌', vendor: 'FairGlow Beauty', reason: 'Contains mercury derivative' },
  { id: 21, name: 'Quick Fix Peel', brand: 'SkinQuick', category: 'Peel', price: 799, emoji: '❌', vendor: 'SkinQuick Labs', reason: 'Misleading claims about results' },
]

const AI_RESULTS: Record<number, AIResult> = {
  1: [
    { icon: '✅', text: 'No restricted ingredients found', ok: true },
    { icon: '✅', text: 'Claims appear accurate for ingredient profile', ok: true },
    { icon: '⚠️', text: 'Missing dermatologist approval certificate', ok: false },
  ],
  2: [
    { icon: '✅', text: 'No restricted ingredients found', ok: true },
    { icon: '✅', text: 'Retinol concentration within safe limits (0.025%)', ok: true },
    { icon: '⚠️', text: '"Dermatologist tested" claim needs documentation', ok: false },
    { icon: '✅', text: 'Peptide combination is clinically supported', ok: true },
  ],
  3: [
    { icon: '✅', text: 'No restricted ingredients found', ok: true },
    { icon: '✅', text: 'Salicylic acid within permissible limit (0.5%)', ok: true },
    { icon: '⚠️', text: '"Removes toxins" claim is unscientific — flag for review', ok: false },
    { icon: '✅', text: 'Surfactants are skin-safe and biodegradable', ok: true },
  ],
  4: [
    { icon: '✅', text: 'All herbal ingredients are FSSAI approved', ok: true },
    { icon: '✅', text: 'No synthetic additives or parabens detected', ok: true },
    { icon: '⚠️', text: 'Missing clinical evidence for hair growth claims', ok: false },
    { icon: '⚠️', text: 'Allergen disclosure incomplete', ok: false },
  ],
}

const REJECTION_REASONS = [
  'Contains restricted/banned ingredient',
  'Misleading or unsubstantiated claims',
  'Images appear to be stock/non-original',
  'Price significantly above market rate',
  'Incomplete ingredient disclosure',
  'Missing required certifications',
  'Product already exists in catalog',
]

export default function ProductApproval() {
  const [tab, setTab] = useState<ProductStatus>('pending')
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [rejectModal, setRejectModal] = useState<number | null>(null)
  const [changesModal, setChangesModal] = useState<number | null>(null)
  const [aiMapModal, setAiMapModal] = useState<number | null>(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [customMsg, setCustomMsg] = useState('')

  function toggleCheck(productId: number, idx: number) {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p
      const c = [...p.checklist]
      c[idx] = !c[idx]
      return { ...p, checklist: c }
    }))
  }

  function runAI(productId: number) {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, aiLoading: true, aiResult: null } : p))
    setTimeout(() => {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, aiLoading: false, aiResult: AI_RESULTS[productId] || [] } : p))
    }, 1500)
  }

  async function approveProduct(productId: number) {
    const p = products.find(pr => pr.id === productId)
    if (!p) return
    try {
      await supabase.from('dermiq_products').upsert({ id: productId, name: p.name, brand: p.brand, category: p.category, price: p.price, active: true, emoji: p.emoji })
    } catch {}
    setProducts(prev => prev.map(pr => pr.id === productId ? { ...pr, status: 'approved' } : pr))
  }

  function rejectProduct(productId: number) {
    setProducts(prev => prev.map(pr => pr.id === productId ? { ...pr, status: 'rejected', rejectionReason: selectedReason || customMsg } : pr))
    setRejectModal(null)
    setSelectedReason('')
    setCustomMsg('')
  }

  function saveChanges(productId: number, changesList: string) {
    setProducts(prev => prev.map(pr => pr.id === productId ? { ...pr, changesList } : pr))
    setChangesModal(null)
  }

  function toggleAIConcern(productId: number, concern: string) {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p
      const existing = p.aiConcerns.includes(concern)
      return { ...p, aiConcerns: existing ? p.aiConcerns.filter(c => c !== concern) : [...p.aiConcerns, concern] }
    }))
  }

  const pendingProducts = products.filter(p => p.status === 'pending')

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: 0 }}>Product Approval</h1>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: C.gold + '20', color: C.gold }}>{pendingProducts.length} Pending</span>
          </div>
          <p style={{ fontSize: 13, color: C.mu, margin: '4px 0 0' }}>Review and approve vendor-submitted products for the DermIQ marketplace</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
        {([['pending', `Pending (${pendingProducts.length})`], ['approved', `Approved`], ['rejected', `Rejected`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 18px', borderRadius: 9, border: `1px solid ${tab === key ? C.teal : C.border}`, background: tab === key ? C.teal : '#fff', color: tab === key ? '#fff' : C.mu, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Pending Tab */}
      {tab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {pendingProducts.map(prod => (
            <div key={prod.id} style={{ background: '#fff', borderRadius: 18, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 260px', gap: 0 }}>
                {/* Emoji / Image */}
                <div style={{ background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, borderRight: `1px solid ${C.border}` }}>
                  {prod.emoji}
                </div>

                {/* Main info */}
                <div style={{ padding: '18px 20px', borderRight: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <div>
                      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, color: C.dark, margin: '0 0 4px' }}>{prod.name}</h3>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: C.mu }}>{prod.brand}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{prod.category}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: C.dark }}>₹{prod.price}</div>
                      <div style={{ fontSize: 11, color: C.mu, textDecoration: 'line-through' }}>₹{prod.mrp}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: C.mu }}>🏪 {prod.vendor}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: prod.vendorScore >= 90 ? C.green + '20' : prod.vendorScore >= 75 ? C.gold + '20' : C.red + '20', color: prod.vendorScore >= 90 ? C.green : prod.vendorScore >= 75 ? C.gold : C.red }}>Score: {prod.vendorScore}</span>
                    <span style={{ fontSize: 11, color: C.mu }}>Submitted {prod.submittedDaysAgo} days ago</span>
                  </div>

                  {/* Ingredients */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Ingredients</div>
                    <div style={{ maxHeight: 60, overflowY: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {prod.ingredients.map(ing => (
                        <span key={ing} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: '#F3F4F6', color: C.mu, border: `1px solid ${C.border}` }}>{ing}</span>
                      ))}
                    </div>
                  </div>

                  {/* Claims */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.dark, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Vendor Claims</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {prod.claims.map(cl => (
                        <span key={cl} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.blue + '15', color: C.blue, fontWeight: 600, border: `1px solid ${C.blue}30` }}>{cl}</span>
                      ))}
                    </div>
                  </div>

                  {/* AI Result */}
                  {prod.aiLoading && (
                    <div style={{ background: '#F0F9FF', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, border: `2px solid ${C.blue}`, borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 12, color: C.blue }}>Running AI analysis...</span>
                    </div>
                  )}
                  {prod.aiResult && (
                    <div style={{ background: '#F8FAFF', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.blue}20` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤖 AI Analysis Results</div>
                      {prod.aiResult.map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: r.ok ? C.green : C.gold, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{r.icon}</span><span>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => approveProduct(prod.id)} style={{ padding: '7px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✅ Approve</button>
                    <button onClick={() => setRejectModal(prod.id)} style={{ padding: '7px 14px', background: C.red + '15', color: C.red, border: `1px solid ${C.red}40`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>❌ Reject</button>
                    <button onClick={() => setChangesModal(prod.id)} style={{ padding: '7px 14px', background: C.gold + '15', color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📝 Request Changes</button>
                    <button onClick={() => setAiMapModal(prod.id)} style={{ padding: '7px 14px', background: C.purple + '15', color: C.purple, border: `1px solid ${C.purple}40`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⚗️ Map to AI</button>
                    {!prod.aiResult && !prod.aiLoading && (
                      <button onClick={() => runAI(prod.id)} style={{ padding: '7px 14px', background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🤖 Run AI Check</button>
                    )}
                  </div>
                </div>

                {/* Checklist sidebar */}
                <div style={{ padding: '18px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Review Checklist</div>
                  {[
                    'Ingredients list complete',
                    'No restricted ingredients',
                    'Claims are accurate',
                    'Images are original',
                    'Price is reasonable',
                  ].map((item, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                      <div
                        onClick={() => toggleCheck(prod.id, idx)}
                        style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${prod.checklist[idx] ? C.green : C.border}`, background: prod.checklist[idx] ? C.green : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                      >
                        {prod.checklist[idx] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: prod.checklist[idx] ? C.dark : C.mu, lineHeight: 1.4 }}>{item}</span>
                    </label>
                  ))}
                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: C.cream, fontSize: 11, color: C.mu }}>
                    {prod.checklist.filter(Boolean).length}/5 checks completed
                  </div>
                  {prod.aiConcerns.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 6 }}>AI Mapped Concerns:</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {prod.aiConcerns.map(c => (
                          <span key={c} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: C.teal + '15', color: C.teal }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {pendingProducts.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 18, padding: '48px', textAlign: 'center', border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 6 }}>All products reviewed!</div>
              <div style={{ fontSize: 13, color: C.mu }}>No pending products in the queue.</div>
            </div>
          )}
        </div>
      )}

      {/* Approved Tab */}
      {tab === 'approved' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 14 }}>
            {[...APPROVED_SEED, ...products.filter(p => p.status === 'approved').map(p => ({ id: p.id, name: p.name, brand: p.brand, category: p.category, price: p.price, emoji: p.emoji, vendor: p.vendor, approvedDate: 'Mar 23' }))].map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 18, border: `1px solid ${C.green}40`, boxShadow: '0 2px 8px rgba(16,185,129,0.06)' }}>
                <div style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>{p.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 8 }}>{p.brand} · {p.category}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: C.dark }}>₹{p.price}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.green + '20', color: C.green }}>✅ Approved {p.approvedDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Tab */}
      {tab === 'rejected' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
            {[...REJECTED_SEED, ...products.filter(p => p.status === 'rejected').map(p => ({ id: p.id, name: p.name, brand: p.brand, category: p.category, price: p.price, emoji: p.emoji, vendor: p.vendor, reason: p.rejectionReason || 'Under review' }))].map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 18, border: `1px solid ${C.red}30` }}>
                <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>{p.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.mu, marginBottom: 8 }}>{p.brand}</div>
                <div style={{ background: '#FEF2F2', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: 'uppercase', marginBottom: 3 }}>Rejection Reason</div>
                  <div style={{ fontSize: 11, color: C.dark }}>{p.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal !== null && (
        <div onClick={() => setRejectModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>Reject Product</h2>
              <button onClick={() => setRejectModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 8 }}>Select Rejection Reason</label>
              {REJECTION_REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                  <input type="radio" name="reason" value={r} checked={selectedReason === r} onChange={e => setSelectedReason(e.target.value)} style={{ accentColor: C.red }} />
                  <span style={{ fontSize: 13, color: C.dark }}>{r}</span>
                </label>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Custom Message to Vendor</label>
              <textarea
                value={customMsg} onChange={e => setCustomMsg(e.target.value)}
                placeholder="Provide details to help the vendor understand why the product was rejected..."
                style={{ width: '100%', height: 90, padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => rejectProduct(rejectModal)} style={{ width: '100%', padding: '11px', background: C.red, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ❌ Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {changesModal !== null && (() => {
        const p = products.find(pr => pr.id === changesModal)
        if (!p) return null
        let localChanges = p.changesList
        return (
          <div onClick={() => setChangesModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>Request Changes</h2>
                <button onClick={() => setChangesModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: C.mu, marginBottom: 14 }}>Specify what needs to be fixed for <strong style={{ color: C.dark }}>{p.name}</strong>:</p>
              <textarea
                defaultValue={localChanges}
                onChange={e => { localChanges = e.target.value }}
                placeholder="1. Update ingredient list to include percentages&#10;2. Remove unsupported health claims&#10;3. Upload original product images&#10;4. Add FSSAI registration number"
                style={{ width: '100%', height: 130, padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setChangesModal(null)} style={{ flex: 1, padding: 10, background: '#fff', color: C.mu, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => saveChanges(changesModal, localChanges)} style={{ flex: 2, padding: 10, background: C.gold, color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📤 Send to Vendor</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* AI Concern Mapping Modal */}
      {aiMapModal !== null && (() => {
        const p = products.find(pr => pr.id === aiMapModal)
        if (!p) return null
        return (
          <div onClick={() => setAiMapModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>Map to AI Concerns</h2>
                <button onClick={() => setAiMapModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
              </div>
              <p style={{ fontSize: 12, color: C.mu, marginBottom: 16 }}>Select skin concerns this product should be recommended for:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {CONCERNS.map(concern => {
                  const active = p.aiConcerns.includes(concern)
                  return (
                    <label key={concern} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, border: `1px solid ${active ? C.teal : C.border}`, background: active ? C.teal + '10' : '#fff', cursor: 'pointer' }}>
                      <div
                        onClick={() => toggleAIConcern(aiMapModal, concern)}
                        style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${active ? C.teal : C.border}`, background: active ? C.teal : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        {active && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 12, color: active ? C.teal : C.dark, fontWeight: active ? 600 : 400 }}>{concern}</span>
                    </label>
                  )
                })}
              </div>
              <div style={{ background: C.cream, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: C.mu }}>{p.aiConcerns.length} concerns selected</span>
              </div>
              <button onClick={() => setAiMapModal(null)} style={{ width: '100%', padding: 10, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ⚗️ Save AI Mapping
              </button>
            </div>
          </div>
        )
      })()}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
