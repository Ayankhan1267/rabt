'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ── PRODUCTS LIST ──────────────────────────────────────
const RABT_PRODUCTS = [
  { id: 'mm-cleanser',  name: 'Moong Magic Cleanser',      range: 'Moong Magic', price: 299, concerns: ['acne','oily','combination'], type: 'cleanser' },
  { id: 'mm-toner',     name: 'Moong Magic Toner',         range: 'Moong Magic', price: 249, concerns: ['acne','oily','pigmentation'], type: 'toner' },
  { id: 'mm-serum',     name: 'Moong Magic Serum',         range: 'Moong Magic', price: 599, concerns: ['acne','oily','pigmentation','glow'], type: 'serum' },
  { id: 'mm-mois',      name: 'Moong Magic Moisturizer',   range: 'Moong Magic', price: 349, concerns: ['acne','oily','combination'], type: 'moisturizer' },
  { id: 'mm-spf',       name: 'Moong Magic Sunscreen SPF50',range: 'Moong Magic', price: 399, concerns: ['all'], type: 'sunscreen' },
  { id: 'ms-cleanser',  name: 'Masoor Glow Cleanser',      range: 'Masoor Glow', price: 299, concerns: ['pigmentation','dull','dry'], type: 'cleanser' },
  { id: 'ms-toner',     name: 'Masoor Glow Toner',         range: 'Masoor Glow', price: 249, concerns: ['pigmentation','dull'], type: 'toner' },
  { id: 'ms-serum',     name: 'Masoor Glow Serum',         range: 'Masoor Glow', price: 599, concerns: ['pigmentation','dull','glow'], type: 'serum' },
  { id: 'ms-mois',      name: 'Masoor Glow Moisturizer',   range: 'Masoor Glow', price: 349, concerns: ['pigmentation','dry','dull'], type: 'moisturizer' },
  { id: 'ms-spf',       name: 'Masoor Glow Sunscreen',     range: 'Masoor Glow', price: 399, concerns: ['all'], type: 'sunscreen' },
  { id: 'oc-cleanser',  name: 'Oats Care Cleanser',        range: 'Oats Care',   price: 299, concerns: ['sensitive','dry','normal'], type: 'cleanser' },
  { id: 'oc-toner',     name: 'Oats Care Toner',           range: 'Oats Care',   price: 249, concerns: ['sensitive','dry'], type: 'toner' },
  { id: 'oc-serum',     name: 'Oats Care Serum',           range: 'Oats Care',   price: 599, concerns: ['sensitive','dry','barrier'], type: 'serum' },
  { id: 'oc-mois',      name: 'Oats Care Moisturizer',     range: 'Oats Care',   price: 349, concerns: ['sensitive','dry','normal'], type: 'moisturizer' },
  { id: 'oc-spf',       name: 'Oats Care Sunscreen',       range: 'Oats Care',   price: 399, concerns: ['all'], type: 'sunscreen' },
  { id: 'eye-pulse',    name: 'Eye Pulse Under-Eye Cream', range: 'Standalone',  price: 449, concerns: ['dark circles','puffiness','aging'], type: 'eye cream' },
  { id: 'ratiol-fw',    name: 'Ratiol Facewash',           range: 'Standalone',  price: 349, concerns: ['acne','oily','combination'], type: 'cleanser' },
  { id: 'ratiol-serum', name: 'Ratiol Serum',              range: 'Standalone',  price: 649, concerns: ['acne','scars','oily'], type: 'serum' },
]

const SKIN_TYPES    = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive']
const SKIN_CONCERNS = ['Acne & Breakouts', 'Pigmentation & Dark Spots', 'Dryness & Dehydration', 'Oiliness & Shine', 'Sensitivity & Redness', 'Aging & Fine Lines', 'Dull Skin', 'Dark Circles', 'Large Pores', 'Uneven Skin Tone']
const STEP_LABELS   = ['Customer Details', 'Skin Analysis', 'AI Report & Products', 'Checkout', 'Confirmation']

interface CartItem { product: typeof RABT_PRODUCTS[0]; qty: number }

export default function PartnerPortalPage() {
  const [step, setStep]             = useState(0)
  const [mounted, setMounted]       = useState(false)
  const [partner, setPartner]       = useState<any>(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Customer form
  const [customer, setCustomer]     = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', age: '' })

  // Skin analysis
  const [skinType, setSkinType]     = useState('')
  const [concerns, setConcerns]     = useState<string[]>([])
  const [skinQ, setSkinQ]           = useState({
    waterIntake: '', sleep: '', diet: '', stress: '', currentProducts: '',
    outdoor: '', acneFrequency: '', patchHistory: '', skinGoal: '', allergies: ''
  })

  // AI results
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [cart, setCart]             = useState<CartItem[]>([])

  // Checkout
  const [payment, setPayment]       = useState<'cod'|'online'>('cod')
  const [orderResult, setOrderResult] = useState<any>(null)
  const [pdfReady, setPdfReady]     = useState(false)

  // specialists
  const [specialists, setSpecialists] = useState<any[]>([])

  useEffect(() => { setMounted(true); loadPartner(); loadSpecialists() }, [])

  async function loadPartner() {
    // Get current logged-in user's partner profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('sales_partners').select('*').eq('user_id', user.id).single()
    setPartner(data)
  }

  async function loadSpecialists() {
    const url = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null
    if (!url) return
    try {
      const res = await fetch(url + '/api/specialists')
      if (res.ok) setSpecialists(await res.json())
    } catch {}
  }

  // ── AI SKIN ANALYSIS ──
  async function runAIAnalysis() {
    if (!skinType || concerns.length === 0) { toast.error('Select skin type and at least one concern'); return }
    setAiLoading(true)
    try {
      const prompt = `You are an expert Ayurvedic skincare specialist at Rabt Naturals.
Customer: ${customer.name}, Age: ${customer.age}
Skin Type: ${skinType}
Main Concerns: ${concerns.join(', ')}
Water Intake: ${skinQ.waterIntake} glasses/day
Sleep: ${skinQ.sleep} hours
Diet: ${skinQ.diet}
Stress Level: ${skinQ.stress}
Current Products: ${skinQ.currentProducts}
Sun Exposure: ${skinQ.outdoor}
Acne Frequency: ${skinQ.acneFrequency}
Skin Goal: ${skinQ.skinGoal}
Allergies: ${skinQ.allergies}

Analyze this customer's skin profile and provide a detailed personalized report in JSON format:
{
  "skinScore": 72,
  "skinSummary": "2-3 sentence summary of skin condition",
  "primaryConcern": "main issue",
  "skinCategory": "one of: Acne-Prone Oily | Dry Sensitive | Combination Normal | Pigmented Dull | Aging Mature",
  "recommendedRange": "one of: Moong Magic | Masoor Glow | Oats Care",
  "rangeReason": "why this range",
  "amRoutine": [{"step":1,"product":"Product Name","instruction":"how to use","time":"30 seconds"}],
  "pmRoutine": [{"step":1,"product":"Product Name","instruction":"how to use","time":"30 seconds"}],
  "dietAdvice": ["advice 1","advice 2","advice 3","advice 4"],
  "lifestyleAdvice": ["advice 1","advice 2","advice 3"],
  "ingredientsToLookFor": ["ingredient 1","ingredient 2","ingredient 3"],
  "ingredientsToAvoid": ["ingredient 1","ingredient 2"],
  "weeklyTreatment": "weekly treatment suggestion",
  "expectedResults": {"week4":"","week8":"","week12":""},
  "specialistNote": "brief note for specialist who will guide this customer",
  "productRecommendations": [
    {"productId":"mm-serum","reason":"why this product","priority":"must have","howToUse":"application instruction"}
  ]
}`
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()
      const parsed = JSON.parse(clean)
      setAiAnalysis(parsed)

      // Auto-populate cart with recommended products
      if (parsed.productRecommendations) {
        const newCart: CartItem[] = parsed.productRecommendations
          .map((rec: any) => {
            const prod = RABT_PRODUCTS.find(p => p.id === rec.productId)
            return prod ? { product: prod, qty: 1 } : null
          })
          .filter(Boolean)
          .slice(0, 4)
        setCart(newCart)
      }
      setStep(2)
    } catch (e) {
      toast.error('AI analysis failed. Please try again.')
      console.error(e)
    }
    setAiLoading(false)
  }

  // ── CART ──
  function addToCart(product: typeof RABT_PRODUCTS[0]) {
    setCart(prev => {
      const ex = prev.find(c => c.product.id === product.id)
      if (ex) return prev.map(c => c.product.id === product.id ? {...c, qty: c.qty+1} : c)
      return [...prev, { product, qty: 1 }]
    })
    toast.success(product.name + ' added!')
  }
  function removeFromCart(id: string) { setCart(prev => prev.filter(c => c.product.id !== id)) }
  function updateQty(id: string, qty: number) {
    if (qty <= 0) return removeFromCart(id)
    setCart(prev => prev.map(c => c.product.id === id ? {...c, qty} : c))
  }

  const cartTotal   = cart.reduce((s,c) => s+c.product.price*c.qty, 0)
  const commission  = partner ? Math.round(cartTotal * (partner.commission_pct||0) / 100) : 0

  // ── PLACE ORDER ──
  async function placeOrder() {
    if (cart.length === 0) { toast.error('Add at least one product'); return }
    setSubmitting(true)
    try {
      const url = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

      // Auto-assign specialist (round-robin or least load)
      const activeSpecialists = specialists.filter(s => s.isActive)
      const assignedSpecialist = activeSpecialists.length > 0 ? activeSpecialists[0] : null

      const orderPayload = {
        customerName: customer.name, customerPhone: customer.phone,
        customerEmail: customer.email, address: customer.address,
        city: customer.city, state: customer.state, pincode: customer.pincode,
        items: cart.map(c => ({ name: c.product.name, price: c.product.price, qty: c.qty, range: c.product.range })),
        amount: cartTotal, paymentMethod: payment === 'cod' ? 'COD' : 'Prepaid',
        status: 'new', source: 'sales_partner',
        partnerId: partner?.id, partnerName: partner?.name,
        commission: commission, commissionPct: partner?.commission_pct || 0,
        specialistId: assignedSpecialist?._id,
        skinProfile: {
          skinType, concerns, skinGoal: skinQ.skinGoal,
          skinScore: aiAnalysis?.skinScore,
          skinCategory: aiAnalysis?.skinCategory,
          recommendedRange: aiAnalysis?.recommendedRange,
          amRoutine: aiAnalysis?.amRoutine,
          pmRoutine: aiAnalysis?.pmRoutine,
          specialistNote: aiAnalysis?.specialistNote,
        }
      }

      let orderId = 'DEMO' + Date.now()
      if (url) {
        const res = await fetch(url + '/api/partner/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(orderPayload) })
        if (res.ok) { const d = await res.json(); orderId = d.orderNumber || orderId }
      }

      // Save to Supabase too
      await supabase.from('partner_orders').insert({
        partner_id: partner?.id, order_id: orderId,
        customer_name: customer.name, customer_phone: customer.phone,
        amount: cartTotal, commission, commission_pct: partner?.commission_pct || 0,
        status: 'new', payment_method: payment,
        skin_score: aiAnalysis?.skinScore, skin_category: aiAnalysis?.skinCategory,
        specialist_assigned: assignedSpecialist?._id || assignedSpecialist?.name,
      })

      // Update partner earnings
      if (partner?.id) {
        await supabase.from('sales_partners').update({
          total_orders: (partner.total_orders||0) + 1,
          total_earnings: (partner.total_earnings||0) + commission,
          pending_payout: (partner.pending_payout||0) + commission,
        }).eq('id', partner.id)
      }

      setOrderResult({ orderId, assignedSpecialist, commission })
      setPdfReady(true)
      setStep(4)
      toast.success('Order placed successfully!')
    } catch (e) {
      toast.error('Order failed. Please try again.')
      console.error(e)
    }
    setSubmitting(false)
  }

  // ── PDF GENERATION ──
  function generatePDF() {
    const printContent = document.getElementById('skin-profile-pdf')
    if (!printContent) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>Skin Profile - ${customer.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; }
        h1 { color: #0097A7; font-size: 24px; }
        h2 { color: #005F6A; font-size: 16px; margin-top: 20px; border-bottom: 2px solid #0097A7; padding-bottom: 5px; }
        .score { font-size: 48px; font-weight: 900; color: #0097A7; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
        .tag { background: #D4F1F4; color: #005F6A; padding: 3px 10px; border-radius: 20px; font-size: 12px; display: inline-block; margin: 3px; }
        .product { background: #f8f8f8; border-left: 3px solid #0097A7; padding: 10px; margin: 8px 0; }
        .routine-step { background: #f0fafa; padding: 8px 12px; margin: 5px 0; border-radius: 8px; }
        .footer { text-align: center; margin-top: 40px; color: #888; font-size: 12px; }
        @media print { button { display: none; } }
      </style></head><body>
      ${printContent.innerHTML}
      <div class="footer">
        <p>Rabt Naturals · rabtnaturals.com · support@rabtnaturals.in</p>
        <p>This skin profile is personalized and generated by Rabt AI. Consult your assigned specialist for guidance.</p>
      </div>
      <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    w.document.close()
  }

  function shareProfile() {
    const text = `🌿 My Rabt Naturals Skin Profile\n\nSkin Score: ${aiAnalysis?.skinScore}/100\nSkin Type: ${skinType}\nRecommended: ${aiAnalysis?.recommendedRange}\n\n✅ Personalized routine created by Rabt AI\n📦 Order: #${orderResult?.orderId}\n\nFor guidance, contact your Rabt Specialist.`
    if (navigator.share) {
      navigator.share({ title: 'My Rabt Skin Profile', text })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Profile copied to clipboard!')
    }
  }

  const inp: any = { width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, padding: '10px 13px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 12 }

  if (!mounted) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>🌿 Sales Partner <span style={{ color: 'var(--gold)' }}>Portal</span></h1>
            {partner && <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
              {partner.name} · {partner.commission_pct}% commission · ₹{(partner.total_earnings||0).toLocaleString('en-IN')} earned · Pending: ₹{(partner.pending_payout||0).toLocaleString('en-IN')}
            </p>}
          </div>
          {step > 0 && step < 4 && (
            <button onClick={() => { setStep(0); setAiAnalysis(null); setCart([]); setCustomer({name:'',phone:'',email:'',address:'',city:'',state:'',pincode:'',age:''}); setSkinType(''); setConcerns([]); setOrderResult(null) }}
              style={{ padding: '8px 16px', background: 'var(--rdL)', border: 'none', borderRadius: 8, color: 'var(--red)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
              ✕ Start Over
            </button>
          )}
        </div>
        {/* Step indicator */}
        {step < 4 && (
          <div style={{ display: 'flex', gap: 0, marginTop: 18 }}>
            {STEP_LABELS.slice(0,4).map((label, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {i > 0 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--teal)' : 'var(--b2)' }} />}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i ? 'var(--teal)' : step === i ? 'var(--gold)' : 'var(--s2)', border: `2px solid ${step >= i ? (step === i ? 'var(--gold)' : 'var(--teal)') : 'var(--b2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: step >= i ? '#fff' : 'var(--mu)', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                    {step > i ? '✓' : i+1}
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--teal)' : 'var(--b2)' }} />}
                </div>
                <div style={{ fontSize: 10, color: step === i ? 'var(--gold)' : step > i ? 'var(--teal)' : 'var(--mu)', marginTop: 5, textAlign: 'center', fontWeight: step === i ? 700 : 400 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ STEP 0: HOME ══════════ */}
      {step === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Create a New Customer Order</h2>
          <p style={{ color: 'var(--mu)', fontSize: 14, lineHeight: 1.75, marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            Fill customer details → Run AI Skin Analysis → Get personalized product recommendations → Place order → Download Skin Profile PDF
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, maxWidth: 700, margin: '0 auto 32px' }}>
            {[['🔬','AI Skin Analysis','32 parameters analyzed'],['📋','Personalized Routine','AM/PM schedule'],['🛒','Easy Checkout','COD or Online'],['📄','PDF Profile','Share with customer'],['💰','Your Commission',`${partner?.commission_pct||'—'}% on every sale`],['👩‍⚕️','Auto Specialist','Customer guided by expert']].map(([e,t,d],i)=>(
              <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 14, padding: '16px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{e}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>{d}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(1)} style={{ padding: '15px 40px', background: 'linear-gradient(135deg,var(--teal),var(--teal2,#097A6C))', border: 'none', borderRadius: 50, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'Outfit', boxShadow: '0 8px 24px rgba(0,151,167,.35)' }}>
            + Create New Customer Order →
          </button>
        </div>
      )}

      {/* ══════════ STEP 1: CUSTOMER DETAILS ══════════ */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 18 }}>👤 Customer Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[{k:'name',l:'Full Name *',p:'Priya Sharma'},{k:'phone',l:'Phone * (for WhatsApp)',p:'+91 9876543210'},{k:'email',l:'Email',p:'priya@email.com'},{k:'age',l:'Age',p:'25'}].map(f=>(
                <div key={f.k} style={{ gridColumn: f.k==='name'||f.k==='phone'?'span 1':'span 1' }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{f.l}</label>
                  <input value={(customer as any)[f.k]} onChange={e=>setCustomer(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={inp} />
                </div>
              ))}
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Address</label>
            <input value={customer.address} onChange={e=>setCustomer(p=>({...p,address:e.target.value}))} placeholder="House/Flat, Street, Colony" style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[{k:'city',l:'City',p:'Indore'},{k:'state',l:'State',p:'MP'},{k:'pincode',l:'Pincode',p:'452001'}].map(f=>(
                <div key={f.k}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{f.l}</label>
                  <input value={(customer as any)[f.k]} onChange={e=>setCustomer(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={inp} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 14 }}>🔬 Quick Skin Assessment</div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Skin Type *</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {SKIN_TYPES.map(s=>(
                <button key={s} onClick={()=>setSkinType(s)} style={{ padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: skinType===s?'var(--tealL,rgba(0,151,167,.12))':'var(--s2)', color: skinType===s?'var(--teal)':'var(--mu2)', border: `1.5px solid ${skinType===s?'var(--teal)':'var(--b2)'}` }}>{s}</button>
              ))}
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Main Concerns * (select all that apply)</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {SKIN_CONCERNS.map(c=>(
                <button key={c} onClick={()=>setConcerns(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])} style={{ padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: concerns.includes(c)?'var(--gL,rgba(212,168,83,.12))':'var(--s2)', color: concerns.includes(c)?'var(--gold)':'var(--mu2)', border: `1.5px solid ${concerns.includes(c)?'var(--gold)':'var(--b2)'}` }}>{c}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
              {[{k:'waterIntake',l:'Water Intake',p:'6-8 glasses'},{k:'sleep',l:'Sleep Hours',p:'7-8 hours'},{k:'stress',l:'Stress Level',p:'Low/Medium/High'},{k:'outdoor',l:'Sun Exposure',p:'Low/Medium/High'},{k:'diet',l:'Diet Type',p:'Vegetarian/Non-veg'},{k:'acneFrequency',l:'Acne Frequency',p:'Rarely/Sometimes/Often'}].map(f=>(
                <div key={f.k}>
                  <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>{f.l}</label>
                  <input value={(skinQ as any)[f.k]} onChange={e=>setSkinQ(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{ ...inp, marginBottom: 0 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Skin Goal</label>
              <input value={skinQ.skinGoal} onChange={e=>setSkinQ(p=>({...p,skinGoal:e.target.value}))} placeholder="Clear skin, Glow, Anti-aging, Even tone..." style={inp} />
            </div>
          </div>

          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={()=>setStep(0)} style={{ padding: '12px 24px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
            <button onClick={runAIAnalysis} disabled={aiLoading||!customer.name||!customer.phone||!skinType||concerns.length===0}
              style={{ padding: '12px 28px', background: aiLoading?'var(--s2)':'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 9, color: aiLoading?'var(--mu)':'#fff', fontWeight: 700, fontSize: 14, cursor: aiLoading?'default':'pointer', fontFamily: 'Outfit', boxShadow: '0 6px 20px rgba(0,151,167,.3)' }}>
              {aiLoading ? '🔬 AI Analyzing...' : '🔬 Run AI Skin Analysis →'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ STEP 2: AI REPORT + PRODUCTS ══════════ */}
      {step === 2 && aiAnalysis && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Skin Score */}
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 12 }}>AI Skin Score</div>
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--b2)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--teal)" strokeWidth="8" strokeLinecap="round" strokeDasharray="263.9" strokeDashoffset={263.9-(263.9*(aiAnalysis.skinScore||0)/100)} transform="rotate(-90 50 50)"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, color: 'var(--teal)' }}>{aiAnalysis.skinScore}</div>
                  <div style={{ fontSize: 9, color: 'var(--mu)' }}>/ 100</div>
                </div>
              </div>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{aiAnalysis.skinCategory}</div>
              <p style={{ fontSize: 12, color: 'var(--mu2)', lineHeight: 1.6 }}>{aiAnalysis.skinSummary}</p>
            </div>

            {/* Recommended Range */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14, color: 'var(--teal)' }}>🌿 Recommended Range</div>
              <div style={{ background: 'var(--s2)', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: 'var(--gold)', marginBottom: 6 }}>{aiAnalysis.recommendedRange}</div>
                <div style={{ fontSize: 12.5, color: 'var(--mu2)', lineHeight: 1.6 }}>{aiAnalysis.rangeReason}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 5 }}>Look For</div>
                  {(aiAnalysis.ingredientsToLookFor||[]).map((ing: string, i: number) => <div key={i} style={{ fontSize: 11.5, color: 'var(--green)', marginBottom: 3 }}>✓ {ing}</div>)}
                </div>
                <div style={{ background: 'var(--rdL,rgba(239,68,68,.06))', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 5 }}>Avoid</div>
                  {(aiAnalysis.ingredientsToAvoid||[]).map((ing: string, i: number) => <div key={i} style={{ fontSize: 11.5, color: 'var(--red)', marginBottom: 3 }}>✗ {ing}</div>)}
                </div>
              </div>
            </div>
          </div>

          {/* Routines */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[{title:'🌅 Morning Routine (AM)',routine:aiAnalysis.amRoutine},{title:'🌙 Night Routine (PM)',routine:aiAnalysis.pmRoutine}].map(({title,routine},i)=>(
              <div key={i} className="card">
                <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{title}</div>
                {(routine||[]).map((s: any, j: number) => (
                  <div key={j} style={{ display: 'flex', gap: 10, padding: '9px 11px', background: 'var(--s2)', borderRadius: 10, marginBottom: 7 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{j+1}</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.product}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu2)', marginTop: 2 }}>{s.instruction}</div>
                      {s.time && <div style={{ fontSize: 10, color: 'var(--mu)' }}>⏱ {s.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Diet + Lifestyle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>🥗 Diet Advice</div>
              {(aiAnalysis.dietAdvice||[]).map((d: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--b1)', fontSize: 12.5 }}><span style={{ color: 'var(--green)' }}>✓</span>{d}</div>
              ))}
            </div>
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>💡 Lifestyle Tips</div>
              {(aiAnalysis.lifestyleAdvice||[]).map((d: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--b1)', fontSize: 12.5 }}><span style={{ color: 'var(--blue)' }}>→</span>{d}</div>
              ))}
              {aiAnalysis.weeklyTreatment && <div style={{ marginTop: 10, background: 'var(--gL,rgba(212,168,83,.1))', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: 'var(--gold)' }}>🌟 Weekly: {aiAnalysis.weeklyTreatment}</div>}
            </div>
          </div>

          {/* Expected Results */}
          {aiAnalysis.expectedResults && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>📈 Expected Results</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[['Week 4',aiAnalysis.expectedResults.week4],['Week 8',aiAnalysis.expectedResults.week8],['Week 12',aiAnalysis.expectedResults.week12]].map(([w,r],i)=>(
                  <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 6 }}>{w}</div>
                    <div style={{ fontSize: 12, color: 'var(--mu2)', lineHeight: 1.5 }}>{r as string}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product recommendations + Cart */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 14 }}>🛒 AI Recommended Products</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginBottom: 14 }}>
              {(aiAnalysis.productRecommendations||[]).map((rec: any, i: number) => {
                const prod = RABT_PRODUCTS.find(p => p.id === rec.productId)
                if (!prod) return null
                const inCart = cart.find(c => c.product.id === prod.id)
                return (
                  <div key={i} style={{ background: 'var(--s2)', borderRadius: 12, padding: '14px', border: inCart?'1.5px solid var(--teal)':'1px solid var(--b1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 50, background: rec.priority==='must have'?'var(--rdL,rgba(239,68,68,.1))':'var(--blL,rgba(59,130,246,.1))', color: rec.priority==='must have'?'var(--red)':'var(--blue)', fontWeight: 700 }}>{rec.priority}</span>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 800, color: 'var(--teal)' }}>₹{prod.price}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{prod.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu2)', lineHeight: 1.5, marginBottom: 8 }}>{rec.reason}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--mu)', marginBottom: 10, fontStyle: 'italic' }}>{rec.howToUse}</div>
                    <button onClick={() => inCart ? removeFromCart(prod.id) : addToCart(prod)}
                      style={{ width: '100%', padding: '8px', background: inCart?'var(--rdL,rgba(239,68,68,.1))':'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 8, color: inCart?'var(--red)':'#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>
                      {inCart ? '✕ Remove' : '+ Add to Order'}
                    </button>
                  </div>
                )
              })}
            </div>
            {/* Additional products */}
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--teal)', padding: '8px 0' }}>➕ Add more products from catalog</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8, marginTop: 10 }}>
                {RABT_PRODUCTS.filter(p => !(aiAnalysis.productRecommendations||[]).find((r:any)=>r.productId===p.id)).map(prod=>{
                  const inCart = cart.find(c=>c.product.id===prod.id)
                  return (
                    <div key={prod.id} style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px', border: inCart?'1.5px solid var(--teal)':'1px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{prod.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--mu)' }}>{prod.range} · ₹{prod.price}</div>
                      </div>
                      <button onClick={() => inCart ? removeFromCart(prod.id) : addToCart(prod)} style={{ padding: '5px 10px', background: inCart?'var(--rdL,rgba(239,68,68,.1))':'var(--tealL,rgba(0,151,167,.1))', border: 'none', borderRadius: 6, color: inCart?'var(--red)':'var(--teal)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        {inCart ? '✕' : '+'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </details>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>
              🛒 {cart.length} products · ₹{cartTotal.toLocaleString('en-IN')}
              {commission > 0 && <span style={{ fontSize: 13, color: 'var(--green)', marginLeft: 10 }}>Your commission: ₹{commission}</span>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={()=>setStep(1)} style={{ padding: '12px 22px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
              <button onClick={()=>{ if(cart.length===0){toast.error('Add at least one product');return} setStep(3) }} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 9, color: '#08090C', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>
                Proceed to Checkout →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ STEP 3: CHECKOUT ══════════ */}
      {step === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
          <div>
            {/* Order summary */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>📦 Order Summary</div>
              {cart.map((c,i)=>(
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--b1)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{c.product.range}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={()=>updateQty(c.product.id, c.qty-1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--b2)', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--tx)' }}>−</button>
                    <span style={{ fontFamily: 'DM Mono', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{c.qty}</span>
                    <button onClick={()=>updateQty(c.product.id, c.qty+1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--b2)', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--tx)' }}>+</button>
                  </div>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)', minWidth: 60, textAlign: 'right' }}>₹{(c.product.price*c.qty).toLocaleString('en-IN')}</span>
                  <button onClick={()=>removeFromCart(c.product.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
                </div>
              ))}
            </div>

            {/* Delivery address */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>📍 Delivery Address</div>
              <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.8 }}>
                <strong>{customer.name}</strong> · {customer.phone}<br/>
                {customer.address}, {customer.city}, {customer.state} - {customer.pincode}
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>💳 Payment Method</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[{v:'cod',label:'💵 Cash on Delivery',desc:'Customer pays at delivery'},{v:'online',label:'💳 Online / Prepaid',desc:'UPI, Card, Netbanking'}].map(p=>(
                  <div key={p.v} onClick={()=>setPayment(p.v as any)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: payment===p.v?'var(--tealL,rgba(0,151,167,.08))':'var(--s2)', border: `1.5px solid ${payment===p.v?'var(--teal)':'var(--b2)'}`, borderRadius: 12, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payment===p.v?'var(--teal)':'var(--b2)'}`, background: payment===p.v?'var(--teal)':'transparent', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>💰 Price Breakdown</div>
              {[['Subtotal',`₹${cartTotal.toLocaleString('en-IN')}`],['Delivery','Free'],['Your Commission',`₹${commission} (${partner?.commission_pct||0}%)`]].map(([l,v],i)=>(
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--b1)', fontSize: 13 }}>
                  <span style={{ color: 'var(--mu2)' }}>{l}</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: i===0?700:600, color: i===2?'var(--green)':'var(--tx)' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--b2)', marginTop: 4 }}>
                <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>Total</span>
                <span style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <button onClick={placeOrder} disabled={submitting} style={{ width: '100%', padding: '14px', background: submitting?'var(--s2)':'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 9, color: submitting?'var(--mu)':'#fff', fontWeight: 800, fontSize: 15, cursor: submitting?'default':'pointer', fontFamily: 'Outfit', marginBottom: 8, boxShadow: submitting?'none':'0 6px 20px rgba(0,151,167,.3)' }}>
                {submitting ? 'Placing Order...' : `✅ Place Order · ₹${cartTotal.toLocaleString('en-IN')}`}
              </button>
              <button onClick={()=>setStep(2)} style={{ width: '100%', padding: '10px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ STEP 4: CONFIRMATION + PDF ══════════ */}
      {step === 4 && orderResult && (
        <div>
          {/* Success banner */}
          <div style={{ background: 'linear-gradient(135deg,rgba(0,151,167,.1),rgba(0,151,167,.05))', border: '1.5px solid rgba(0,151,167,.3)', borderRadius: 16, padding: '22px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--teal)', marginBottom: 6 }}>Order Placed Successfully!</div>
            <div style={{ fontSize: 14, color: 'var(--mu2)', marginBottom: 14 }}>Order #{orderResult.orderId} · ₹{cartTotal.toLocaleString('en-IN')}</div>
            {orderResult.assignedSpecialist && (
              <div style={{ background: 'var(--s1)', borderRadius: 12, padding: '12px 18px', display: 'inline-block', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--mu)' }}>Customer assigned to specialist for guidance</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--teal)' }}>{orderResult.assignedSpecialist.name}</div>
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>Your commission: ₹{orderResult.commission}</div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={generatePDF} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 9, color: '#08090C', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              📄 Download Skin Profile PDF
            </button>
            <button onClick={shareProfile} style={{ flex: 1, padding: '13px', background: 'var(--grL,rgba(34,197,94,.1))', border: '1px solid rgba(34,197,94,.3)', borderRadius: 9, color: 'var(--green)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              💬 Share with Customer
            </button>
            <button onClick={() => { setStep(0); setAiAnalysis(null); setCart([]); setCustomer({name:'',phone:'',email:'',address:'',city:'',state:'',pincode:'',age:''}); setSkinType(''); setConcerns([]); setOrderResult(null) }}
              style={{ flex: 1, padding: '13px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>
              + New Customer
            </button>
          </div>

          {/* PDF Preview — hidden section that gets printed */}
          <div id="skin-profile-pdf">
            <div style={{ fontFamily: 'Arial', padding: 20 }}>
              <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '3px solid #0097A7', marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0097A7', letterSpacing: 3, marginBottom: 6 }}>RABT NATURALS</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#003D40', marginBottom: 4 }}>Personalized Skin Profile</div>
                <div style={{ fontSize: 12, color: '#666' }}>Generated: {new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: '#f0fafa', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0097A7', textTransform: 'uppercase', marginBottom: 8 }}>Customer Details</div>
                  {[['Name',customer.name],['Phone',customer.phone],['Age',customer.age],['City',customer.city+', '+customer.state]].map(([l,v])=>(
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e5f7f7', fontSize: 12 }}>
                      <span style={{ color: '#666' }}>{l}</span><span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff7e6', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#B87C30', textTransform: 'uppercase', marginBottom: 8 }}>Skin Score</div>
                  <div style={{ fontSize: 52, fontWeight: 900, color: '#0097A7', lineHeight: 1 }}>{aiAnalysis.skinScore}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>out of 100</div>
                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#003D40' }}>{aiAnalysis.skinCategory}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: '#666' }}>Skin Type: {skinType}</div>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#003D40', borderBottom: '2px solid #0097A7', paddingBottom: 5, marginBottom: 10 }}>🌿 Recommended Range: {aiAnalysis.recommendedRange}</div>
                <p style={{ fontSize: 12.5, color: '#444', lineHeight: 1.6 }}>{aiAnalysis.skinSummary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                {[{title:'🌅 Morning Routine',routine:aiAnalysis.amRoutine},{title:'🌙 Night Routine',routine:aiAnalysis.pmRoutine}].map(({title,routine})=>(
                  <div key={title}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#003D40', marginBottom: 8 }}>{title}</div>
                    {(routine||[]).map((s:any,i:number)=>(
                      <div key={i} style={{ background: '#f0fafa', padding: '8px 10px', borderRadius: 8, marginBottom: 6, fontSize: 11.5 }}>
                        <span style={{ fontWeight: 800, color: '#0097A7', marginRight: 6 }}>Step {i+1}:</span>
                        <strong>{s.product}</strong><br/>
                        <span style={{ color: '#666' }}>{s.instruction}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#003D40', borderBottom: '2px solid #0097A7', paddingBottom: 5, marginBottom: 8 }}>🛒 Your Product Order (#{orderResult.orderId})</div>
                {cart.map((c,i)=>(
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: i%2===0?'#f9f9f9':'#fff', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                    <span>{c.product.name} × {c.qty}</span>
                    <span style={{ fontWeight: 700 }}>₹{(c.product.price*c.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#003D40', borderRadius: 8, marginTop: 8, color: '#fff' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#003D40', marginBottom: 8 }}>🥗 Diet & Lifestyle Recommendations</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>{(aiAnalysis.dietAdvice||[]).map((d:string,i:number)=><div key={i} style={{ fontSize: 11.5, padding: '4px 0', color: '#444' }}>✓ {d}</div>)}</div>
                  <div>{(aiAnalysis.lifestyleAdvice||[]).map((d:string,i:number)=><div key={i} style={{ fontSize: 11.5, padding: '4px 0', color: '#444' }}>→ {d}</div>)}</div>
                </div>
              </div>

              {orderResult.assignedSpecialist && (
                <div style={{ background: '#D4F1F4', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0097A7' }}>Your Rabt Skin Specialist for Guidance</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#003D40', marginTop: 4 }}>{orderResult.assignedSpecialist.name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Your specialist will guide you through your skincare journey — no extra cost.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
