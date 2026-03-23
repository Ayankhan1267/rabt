'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const SKIN_CONCERNS = ['Acne & Breakouts', 'Pigmentation & Dark Spots', 'Dryness & Dehydration', 'Oiliness & Shine', 'Sensitivity & Redness', 'Aging & Fine Lines', 'Dull Skin', 'Dark Circles', 'Large Pores', 'Uneven Skin Tone']
const STEP_LABELS   = ['Customer Details', 'Skin Analysis', 'AI Report & Products', 'Checkout', 'Confirmation']

// MongoDB products have images as [{url,isPrimary}] and price as object or in variants
function extractProductImg(p: any): string {
  return p.images?.find((img: any) => img?.isPrimary)?.url || p.images?.[0]?.url || p.images?.[0] || p.image || ''
}
function extractProductPrice(p: any): number {
  const fromVariant = (v: any) => {
    if (!v) return 0
    const vp = v.price
    if (typeof vp === 'object') return vp?.discounted || vp?.original || 0
    return typeof vp === 'number' ? vp : 0
  }
  if (p.variants?.length) return fromVariant(p.variants[0])
  const pp = p.price
  if (typeof pp === 'object') return pp?.discounted || pp?.original || 0
  return typeof pp === 'number' ? pp : 0
}
function normalizeProduct(p: any) {
  return { ...p, price: extractProductPrice(p), images: [extractProductImg(p)].filter(Boolean) }
}

interface Product { _id: string; name: string; slug: string; category: string; price: number; originalPrice: number; images: string[]; range?: string; sku?: string }
interface CartItem { product: Product; qty: number }
interface Coupon { _id: string; code: string; discount: number; discountType: string; minimumAmount: number; maximumDiscount: number }

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_MONGO_API_URL ||
  (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_MONGO_API_URL || process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url') : null) ||
  'https://rabt-api.onrender.com'

export default function PartnerPortalPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [view, setView]                   = useState<'dashboard'|'new-order'|'customer-detail'|'withdraw'>('dashboard')
  const [step, setStep]                   = useState(0)
  const [mounted, setMounted]             = useState(false)
  const [partner, setPartner]             = useState<any>(null)
  const [partnerOrders, setPartnerOrders] = useState<any[]>([])
  const [withdrawals, setWithdrawals]     = useState<any[]>([])
  const [aiLoading, setAiLoading]         = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [specialists, setSpecialists]     = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

  // Withdraw
  const [withdrawForm, setWithdrawForm]     = useState({ amount: '', upi_id: '', upi_name: '', bank_account: '', bank_ifsc: '', bank_name: '', bank_holder: '', method: 'upi' as 'upi'|'bank' })
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)

  // Products & Coupons
  const [products, setProducts]           = useState<Product[]>([])
  const [coupons, setCoupons]             = useState<Coupon[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [showProductDrawer, setShowProductDrawer] = useState(false)
  const [couponCode, setCouponCode]       = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon|null>(null)
  const [couponError, setCouponError]     = useState('')

  // Customer form
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', age: '' })
  const [concerns, setConcerns] = useState<string[]>([])
  const [skinQ, setSkinQ]       = useState({ waterIntake: '', sleep: '', diet: '', stress: '', outdoor: '', skinGoal: '', allergies: '' })

  // Photo
  const [photoBase64, setPhotoBase64]   = useState<string>('')
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [analysisMode, setAnalysisMode] = useState<'photo'|'text'>('photo')
  const [skinType, setSkinType]         = useState('')
  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // AI + Cart
  const [aiAnalysis, setAiAnalysis]   = useState<any>(null)
  const [cart, setCart]               = useState<CartItem[]>([])
  const [payment, setPayment]         = useState<'cod'|'online'>('cod')
  const [orderResult, setOrderResult] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 768)
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    loadAll()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: partnerData } = await supabase.from('sales_partners').select('*').eq('user_id', user.id).single()
    setPartner(partnerData)
    if (partnerData?.id) {
      const [{ data: orders }, { data: wData }] = await Promise.all([
        supabase.from('partner_orders').select('*').eq('partner_id', partnerData.id).order('created_at', { ascending: false }),
        supabase.from('partner_withdrawal_requests').select('*').eq('partner_id', partnerData.id).order('created_at', { ascending: false }),
      ])
      setPartnerOrders(orders || [])
      setWithdrawals(wData || [])
    }
    try {
      const res = await fetch(getApiUrl() + '/api/specialists')
      if (res.ok) { const d = await res.json(); setSpecialists(Array.isArray(d) ? d.filter((s:any) => s.isActive) : []) }
    } catch {}
    loadProducts()
    try {
      const res = await fetch(getApiUrl() + '/api/coupons')
      if (res.ok) { const d = await res.json(); setCoupons(Array.isArray(d) ? d : []) }
    } catch {}
  }

  async function loadProducts() {
    setProductsLoading(true)
    try {
      const res = await fetch(getApiUrl() + '/api/products')
      if (res.ok) { const d = await res.json(); setProducts((Array.isArray(d) ? d : []).map(normalizeProduct)) }
    } catch {}
    setProductsLoading(false)
  }

  // ── Coupon ──
  function applyCoupon() {
    setCouponError('')
    const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase())
    if (!coupon) { setCouponError('Invalid coupon code'); return }
    if (cartSubtotal < coupon.minimumAmount) { setCouponError(`Minimum order ₹${coupon.minimumAmount} required`); return }
    setAppliedCoupon(coupon)
    toast.success(`Coupon applied! ${coupon.discount}% off 🎉`)
  }
  function removeCoupon() { setAppliedCoupon(null); setCouponCode(''); setCouponError('') }

  // ── Photo ──
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo 5MB se chhoti honi chahiye'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { const r = ev.target?.result as string; setPhotoBase64(r); setPhotoPreview(r); toast.success('Photo selected! ✅') }
    reader.readAsDataURL(file)
  }

  // ── AI ──
  async function runAIAnalysis() {
    if (analysisMode === 'photo' && !photoBase64) { toast.error('Pehle photo upload karo'); return }
    if (analysisMode === 'text' && (!skinType || concerns.length === 0)) { toast.error('Skin type aur concerns select karo'); return }
    setAiLoading(true)
    toast.loading('🔬 AI skin analysis chal rahi hai...', { id: 'ai' })
    try {
      const payload = analysisMode === 'photo'
        ? { imageBase64: photoBase64, age: customer.age, concern: concerns.join(', '), customer, skinQ }
        : { skinType, concerns, customer, skinQ }
      const res = await fetch('/api/skin-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok || !data.analysis) { toast.error(data.error || 'AI analysis failed', { id: 'ai' }); setAiLoading(false); return }
      toast.success('Analysis complete! 🌿', { id: 'ai' })
      setAiAnalysis(data.analysis)
      if (data.analysis.productRecommendations && products.length > 0) {
        const range = data.analysis.recommendedRange?.toLowerCase().split(' ')[0] || ''
        const rangeProducts = products.filter(p => p.name.toLowerCase().includes(range)).slice(0, 4)
        setCart(rangeProducts.map(p => ({ product: p, qty: 1 })))
      }
      setStep(2)
    } catch (e: any) { toast.error('Analysis failed: ' + e.message, { id: 'ai' }) }
    setAiLoading(false)
  }

  // ── Cart ──
  function addToCart(product: Product) {
    setCart(prev => {
      const ex = prev.find(c => c.product._id === product._id)
      if (ex) return prev.map(c => c.product._id === product._id ? {...c, qty: c.qty+1} : c)
      return [...prev, { product, qty: 1 }]
    })
    toast.success(product.name.substring(0,25) + '... added!')
  }
  function removeFromCart(id: string) { setCart(prev => prev.filter(c => c.product._id !== id)) }
  function updateQty(id: string, qty: number) {
    if (qty <= 0) return removeFromCart(id)
    setCart(prev => prev.map(c => c.product._id === id ? {...c, qty} : c))
  }

  const cartSubtotal   = cart.reduce((s,c) => s+(c.product.price*c.qty), 0)
  const couponDiscount = appliedCoupon ? Math.min(appliedCoupon.discountType === 'percentage' ? Math.round(cartSubtotal * appliedCoupon.discount / 100) : appliedCoupon.discount, appliedCoupon.maximumDiscount || 99999) : 0
  const cartTotal      = cartSubtotal - couponDiscount
  const commission     = partner ? Math.round(cartTotal * (partner.commission_pct||0) / 100) : 0

  // ── Cancel Order — commission reverse ──
  async function cancelOrder(orderId: string) {
    if (!confirm('Is order ko cancel karna chahte ho?')) return
    const order = partnerOrders.find(o => o.id === orderId)
    if (!order) return
    const { error } = await supabase.from('partner_orders').update({ status: 'cancelled' }).eq('id', orderId)
    if (error) { toast.error('Cancel failed'); return }
    // ✅ pending_commission se minus karo (earnings nahi, kyunki deliver nahi hua)
    if (partner?.id && order.commission > 0) {
      await supabase.from('sales_partners').update({
        total_orders:       Math.max(0, (partner.total_orders       || 0) - 1),
        pending_commission: Math.max(0, (partner.pending_commission || 0) - order.commission),
      }).eq('id', partner.id)
      setPartner((p: any) => p ? {
        ...p,
        total_orders:       Math.max(0, (p.total_orders       || 0) - 1),
        pending_commission: Math.max(0, (p.pending_commission || 0) - order.commission),
      } : p)
    }
    setPartnerOrders(prev => prev.map(o => o.id === orderId ? {...o, status: 'cancelled'} : o))
    toast.success(`Order cancelled! ₹${order.commission} commission reversed.`)
  }

  // ── Place Order — commission goes to pending_commission only ──
  async function placeOrder() {
    if (cart.length === 0) { toast.error('Add at least one product'); return }
    setSubmitting(true)
    try {
      const apiUrl = getApiUrl()
      const assignedSpecialist = specialists.length > 0 ? specialists[partnerOrders.length % specialists.length] : null
      const orderPayload = {
        customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email,
        address: customer.address, city: customer.city, state: customer.state, pincode: customer.pincode,
        items: cart.map(c => ({ name: c.product.name, price: c.product.price, qty: c.qty, sku: c.product.sku, image: c.product.images?.[0] })),
        amount: cartTotal, subtotal: cartSubtotal, couponCode: appliedCoupon?.code || '', couponDiscount,
        paymentMethod: payment === 'cod' ? 'COD' : 'Prepaid',
        status: 'new', source: 'sales_partner',
        partnerId: partner?.id, partnerName: partner?.name,
        commission, commissionPct: partner?.commission_pct || 0,
        specialistId: assignedSpecialist?._id,
        skinProfile: {
          skinType: aiAnalysis?.skinType || skinType, concerns, skinGoal: skinQ.skinGoal,
          skinScore: aiAnalysis?.skinScore, skinCategory: aiAnalysis?.skinCategory,
          recommendedRange: aiAnalysis?.recommendedRange, specialistNote: aiAnalysis?.specialistNote,
        }
      }
      let orderId = 'PART' + Date.now()
      try {
        const res = await fetch(apiUrl + '/api/partner/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(orderPayload) })
        if (res.ok) { const d = await res.json(); orderId = d.orderNumber || orderId }
      } catch {}

      // Save full skin profile to MongoDB so specialist can see it (no commission)
      if (aiAnalysis) {
        try {
          await fetch(apiUrl + '/api/skinprofiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: customer.name, phone: customer.phone, email: customer.email,
              age: customer.age, city: customer.city, state: customer.state,
              skinType: aiAnalysis.skinType || skinType, skinScore: aiAnalysis.skinScore,
              skinCategory: aiAnalysis.skinCategory, skinSummary: aiAnalysis.skinSummary,
              skinConcerns: aiAnalysis.skinConcerns || concerns,
              recommendedRange: aiAnalysis.recommendedRange, rangeReason: aiAnalysis.rangeReason,
              amRoutine: aiAnalysis.amRoutine, pmRoutine: aiAnalysis.pmRoutine,
              dietAdvice: aiAnalysis.dietAdvice, lifestyleAdvice: aiAnalysis.lifestyleAdvice,
              weeklyTreatment: aiAnalysis.weeklyTreatment, expectedResults: aiAnalysis.expectedResults,
              ingredientsToLookFor: aiAnalysis.ingredientsToLookFor,
              ingredientsToAvoid: aiAnalysis.ingredientsToAvoid,
              specialistNote: aiAnalysis.specialistNote,
              productRecommendations: aiAnalysis.productRecommendations,
              specialistId: assignedSpecialist?._id, specialistName: assignedSpecialist?.name,
              source: 'sales_partner', partnerId: partner?.id, partnerName: partner?.name,
              orderId, createdAt: new Date().toISOString(),
            }),
          })
        } catch {}
      }

      await supabase.from('partner_orders').insert({
        partner_id: partner?.id, order_id: orderId,
        customer_name: customer.name, customer_phone: customer.phone,
        customer_email: customer.email, customer_city: customer.city, customer_state: customer.state,
        amount: cartTotal, commission, commission_pct: partner?.commission_pct || 0,
        status: 'new', payment_method: payment,
        skin_score: aiAnalysis?.skinScore, skin_category: aiAnalysis?.skinCategory,
        skin_type: aiAnalysis?.skinType || skinType, recommended_range: aiAnalysis?.recommendedRange,
        specialist_assigned: assignedSpecialist?.name || null, specialist_id: assignedSpecialist?._id || null,
        products: cart.map(c => c.product.name).join(', '), items_count: cart.length,
        skin_analysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      })

      // ✅ Commission sirf partner ko — specialist ko koi commission nahi (source: sales_partner)
      if (partner?.id) {
        await supabase.from('sales_partners').update({
          total_orders:       (partner.total_orders       || 0) + 1,
          pending_commission: (partner.pending_commission || 0) + commission,
        }).eq('id', partner.id)
        setPartner((p: any) => p ? {
          ...p,
          total_orders:       (p.total_orders       || 0) + 1,
          pending_commission: (p.pending_commission || 0) + commission,
        } : p)
      }

      // WA automation — customer ko specialist assigned ka notification
      if (customer.phone && assignedSpecialist) {
        try {
          await fetch('/api/auto-trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trigger: 'partner_specialist_assigned',
              customer: { name: customer.name, phone: customer.phone, email: customer.email },
              data: {
                specialist: assignedSpecialist.name,
                orderId,
                skinScore: String(aiAnalysis?.skinScore || ''),
                skinCategory: aiAnalysis?.skinCategory || '',
                recommendedRange: aiAnalysis?.recommendedRange || '',
              },
            }),
          })
        } catch {}
      }

      setOrderResult({ orderId, assignedSpecialist, commission })
      setStep(4)
      toast.success('Order placed! 🎉')
      loadAll()
    } catch (e) { toast.error('Order failed. Please try again.') }
    setSubmitting(false)
  }

  // ── Withdraw Request ──
  async function submitWithdraw() {
    const amt = Number(withdrawForm.amount)
    if (!amt || amt <= 0) { toast.error('Valid amount enter karo'); return }
    if (withdrawForm.method === 'upi' && !withdrawForm.upi_id) { toast.error('UPI ID required'); return }
    if (withdrawForm.method === 'bank' && (!withdrawForm.bank_account || !withdrawForm.bank_ifsc)) { toast.error('Bank account aur IFSC required'); return }
    if (amt > (partner?.pending_payout || 0)) { toast.error(`Max ₹${partner?.pending_payout || 0} withdraw kar sakte ho`); return }
    setWithdrawSubmitting(true)
    try {
      await supabase.from('partner_withdrawal_requests').insert({
        partner_id: partner?.id, amount: amt,
        upi_id: withdrawForm.method === 'upi' ? withdrawForm.upi_id : null,
        upi_name: withdrawForm.method === 'upi' ? withdrawForm.upi_name : null,
        bank_account: withdrawForm.method === 'bank' ? withdrawForm.bank_account : null,
        bank_ifsc: withdrawForm.method === 'bank' ? withdrawForm.bank_ifsc : null,
        bank_name: withdrawForm.method === 'bank' ? withdrawForm.bank_name : null,
        bank_holder: withdrawForm.method === 'bank' ? withdrawForm.bank_holder : null,
        payment_method: withdrawForm.method,
        status: 'pending',
      })
      toast.success('Withdraw request submitted! HQ process karega.')
      setWithdrawForm({ amount: '', upi_id: '', upi_name: '', bank_account: '', bank_ifsc: '', bank_name: '', bank_holder: '', method: 'upi' })
      setView('dashboard')
      loadAll()
    } catch { toast.error('Request failed') }
    setWithdrawSubmitting(false)
  }

  function resetOrder() {
    setStep(0); setAiAnalysis(null); setCart([]); setAppliedCoupon(null); setCouponCode('')
    setCustomer({name:'',phone:'',email:'',address:'',city:'',state:'',pincode:'',age:''})
    setSkinType(''); setConcerns([]); setPhotoBase64(''); setPhotoPreview('')
    setOrderResult(null); setView('dashboard')
  }

  function generatePDF(orderData?: any, analysisData?: any, customerData?: any) {
    const order    = orderData    || orderResult
    const analysis = analysisData || aiAnalysis
    const cust     = customerData || customer
    const w = window.open('', '_blank')
    if (!w) return
    const scoreColor = (analysis?.skinScore||0) >= 70 ? '#16A34A' : (analysis?.skinScore||0) >= 50 ? '#D97706' : '#DC2626'
    const routineStep = (s:any,j:number,accent:string) => `<div style="display:flex;gap:10px;padding:10px 12px;background:#f8fafa;border-radius:8px;margin-bottom:6px;border-left:3px solid ${accent}"><div style="width:22px;height:22px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex-shrink:0;line-height:22px;text-align:center">${j+1}</div><div><div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:2px">${s.product}</div><div style="font-size:11px;color:#555;line-height:1.5">${s.instruction}</div>${s.time?`<div style="font-size:10px;color:${accent};margin-top:2px;font-weight:600">⏱ ${s.time}</div>`:''}</div></div>`
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Skin Report — ${cust.name}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;max-width:820px;margin:0 auto;padding:0}
      .page{padding:32px}
      .header{background:linear-gradient(135deg,#003D40,#005F6A);border-radius:16px;padding:28px 32px;margin-bottom:24px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
      .brand-name{font-size:11px;font-weight:800;letter-spacing:0.15em;color:rgba(255,255,255,0.6);text-transform:uppercase;margin-bottom:6px}
      .brand-title{font-size:26px;font-weight:900;color:#fff;letter-spacing:1px;margin-bottom:2px}
      .brand-sub{font-size:13px;color:rgba(255,255,255,0.7)}
      .score-box{text-align:center;background:rgba(255,255,255,0.1);border-radius:14px;padding:14px 20px;flex-shrink:0}
      .score-num{font-size:48px;font-weight:900;color:${scoreColor};line-height:1}
      .score-label{font-size:10px;color:rgba(255,255,255,0.6);margin-top:4px}
      .customer-box{background:linear-gradient(135deg,#f0fafa,#e8f7f7);border-radius:12px;padding:18px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;border:1px solid rgba(1,151,166,0.15)}
      .tag{display:inline-block;background:rgba(1,151,166,0.12);color:#005F6A;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin:2px}
      .tag-red{background:rgba(220,38,38,0.08);color:#DC2626}
      .section-title{font-size:13px;font-weight:800;color:#005F6A;text-transform:uppercase;letter-spacing:0.08em;padding:10px 0 8px;border-bottom:2px solid #0097A7;margin-bottom:12px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
      .card{background:#f8fafa;border-radius:10px;padding:14px 16px;border:1px solid rgba(1,151,166,0.1)}
      .ing-good{color:#16A34A;font-size:11px;padding:2px 0}
      .ing-bad{color:#DC2626;font-size:11px;padding:2px 0}
      .diet-item{display:flex;gap:8px;padding:3px 0;font-size:11.5px;color:#333;line-height:1.5}
      .result-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb;align-items:flex-start}
      .result-week{background:rgba(1,151,166,0.1);color:#005F6A;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;flex-shrink:0;margin-top:2px}
      .product-row{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8fafa;border-left:3px solid #0097A7;border-radius:6px;margin-bottom:6px}
      .specialist-box{background:linear-gradient(135deg,rgba(1,151,166,0.08),rgba(0,63,64,0.05));border:1px solid rgba(1,151,166,0.25);border-radius:12px;padding:16px;text-align:center;margin-top:18px}
      .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#888;font-size:11px;line-height:1.8}
      @media print{body{padding:0}.page{padding:20px}button{display:none!important}}
    </style>
    </head><body><div class="page">

    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-name">Personalized Skin Care Report</div>
        <div class="brand-title">rabt naturals</div>
        <div class="brand-sub">rabtnaturals.com · AI-Powered Skin Analysis</div>
        <div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,0.6)">${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div class="score-box">
        <div class="score-num">${analysis?.skinScore||'—'}</div>
        <div class="score-label">/ 100 Skin Score</div>
      </div>
    </div>

    <!-- Customer -->
    <div class="customer-box">
      <div>
        <div style="font-size:20px;font-weight:800;color:#003D40;margin-bottom:4px">${cust.name}</div>
        <div style="font-size:12px;color:#666;margin-bottom:8px">${cust.phone||''} · Age: ${cust.age||'—'} · ${[cust.city,cust.state].filter(Boolean).join(', ')||'—'}</div>
        <div>${[analysis?.skinType&&`<span class="tag">${analysis.skinType}</span>`,analysis?.skinCategory&&`<span class="tag">${analysis.skinCategory}</span>`,...(analysis?.skinConcerns||[]).map((c:string)=>`<span class="tag tag-red">${c}</span>`)].filter(Boolean).join('')}</div>
      </div>
    </div>

    <!-- Summary -->
    <div class="section-title">🔬 Skin Assessment</div>
    <p style="font-size:13px;line-height:1.75;color:#333;margin-bottom:14px;padding:12px 14px;background:#f0fafa;border-radius:8px;border-left:3px solid #0097A7">${analysis?.skinSummary||'—'}</p>

    <!-- Range + Concerns -->
    <div class="grid2">
      <div class="card">
        <div style="font-size:11px;font-weight:800;color:#0097A7;text-transform:uppercase;margin-bottom:8px">🌿 Recommended Range</div>
        <div style="font-size:20px;font-weight:800;color:#003D40;margin-bottom:6px">${analysis?.recommendedRange||'—'}</div>
        <div style="font-size:11.5px;color:#555;line-height:1.6">${analysis?.rangeReason||''}</div>
      </div>
      <div class="card">
        <div style="font-size:11px;font-weight:800;color:#16A34A;text-transform:uppercase;margin-bottom:8px">Ingredients Guide</div>
        <div style="font-size:10px;font-weight:700;color:#16A34A;margin-bottom:4px">✓ Use</div>
        ${(analysis?.ingredientsToLookFor||[]).map((i:string)=>`<div class="ing-good">• ${i}</div>`).join('')}
        <div style="font-size:10px;font-weight:700;color:#DC2626;margin:8px 0 4px">✗ Avoid</div>
        ${(analysis?.ingredientsToAvoid||[]).map((i:string)=>`<div class="ing-bad">• ${i}</div>`).join('')}
      </div>
    </div>

    <!-- Routines -->
    <div class="section-title">🌅 Morning Routine</div>
    <div style="margin-bottom:18px">${(analysis?.amRoutine||[]).map((s:any,j:number)=>routineStep(s,j,'#F59E0B')).join('')}</div>

    <div class="section-title">🌙 Night Routine</div>
    <div style="margin-bottom:18px">${(analysis?.pmRoutine||[]).map((s:any,j:number)=>routineStep(s,j,'#818CF8')).join('')}</div>

    ${analysis?.weeklyTreatment?`<div class="section-title">📅 Weekly Treatment</div><p style="font-size:12.5px;color:#333;line-height:1.65;margin-bottom:18px;padding:10px 14px;background:#f8fafa;border-radius:8px">${analysis.weeklyTreatment}</p>`:''}

    <!-- Expected Results -->
    ${analysis?.expectedResults?`<div class="section-title">📈 Expected Results Timeline</div><div style="margin-bottom:18px">${[['Week 4',analysis.expectedResults.week4],['Week 8',analysis.expectedResults.week8],['Week 12',analysis.expectedResults.week12]].filter(([,v])=>v).map(([l,v])=>`<div class="result-row"><span class="result-week">${l}</span><span style="font-size:12px;color:#333;line-height:1.5">${v}</span></div>`).join('')}</div>`:''}

    <!-- Diet -->
    ${(analysis?.dietAdvice?.length||analysis?.lifestyleAdvice?.length)?`<div class="section-title">🥗 Diet & Lifestyle</div><div class="card" style="margin-bottom:18px">${(analysis.dietAdvice||[]).map((d:string)=>`<div class="diet-item"><span style="color:#16A34A;font-weight:700">✓</span>${d}</div>`).join('')}${(analysis.lifestyleAdvice||[]).map((d:string)=>`<div class="diet-item"><span style="color:#0097A7;font-weight:700">★</span>${d}</div>`).join('')}</div>`:''}

    ${analysis?.specialistNote?`<div class="section-title">🩺 Specialist Note</div><div style="background:rgba(1,151,166,0.06);border:1px solid rgba(1,151,166,0.2);border-radius:10px;padding:14px 16px;margin-bottom:18px;font-size:12.5px;line-height:1.7;color:#333">${analysis.specialistNote}</div>`:''}

    <!-- Products -->
    ${cart.length?`<div class="section-title">🛒 Order #${order?.orderId||'—'}</div><div style="margin-bottom:6px">${cart.map(c=>`<div class="product-row"><span style="font-size:13px">${c.product.name} <span style="color:#888">× ${c.qty}</span></span><strong style="color:#0097A7">₹${(c.product.price*c.qty).toLocaleString('en-IN')}</strong></div>`).join('')}</div><div style="background:#003D40;color:#fff;padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;margin-top:4px;margin-bottom:18px"><strong>Total Amount</strong><strong style="font-size:16px">₹${cartTotal.toLocaleString('en-IN')}</strong></div>`:''}

    <!-- Specialist -->
    ${order?.assignedSpecialist?`<div class="specialist-box"><div style="font-size:11px;font-weight:800;color:#0097A7;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Your Rabt Skin Specialist</div><div style="font-size:18px;font-weight:800;color:#003D40;margin-bottom:4px">${order.assignedSpecialist.name||order.assignedSpecialist}</div><div style="font-size:11px;color:#555">This specialist will guide your skincare journey</div></div>`:''}

    <div class="footer">
      <strong style="color:#003D40;font-size:13px">Rabt Naturals</strong><br>
      rabtnaturals.com · support@rabtnaturals.in<br>
      This report is AI-generated and personalized based on your skin analysis.<br>
      For best results, follow the routine consistently for 12 weeks.
    </div>

    <script>window.onload=()=>{window.print()}</script>
    </div></body></html>`)
    w.document.close()
  }

  const inp: any = { width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, padding: '10px 13px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 12 }
  const uniqueCustomers = [...new Set(partnerOrders.map(o => o.customer_phone).filter(Boolean))].length
  const customerMap: Record<string, any> = partnerOrders.reduce((acc: any, o) => {
    const key = o.customer_phone || o.customer_name
    if (!acc[key]) acc[key] = { name: o.customer_name, phone: o.customer_phone, email: o.customer_email, city: o.customer_city, state: o.customer_state, orders: [], totalSpent: 0, skinCategory: o.skin_category, skinType: o.skin_type, specialist: o.specialist_assigned }
    acc[key].orders.push(o)
    acc[key].totalSpent += o.amount || 0
    return acc
  }, {})

  if (!mounted) return null

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>🌿 Sales Partner <span style={{ color: 'var(--gold)' }}>Portal</span></h1>
          {partner && <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>{partner.name} · {partner.commission_pct}% commission · {specialists.length} specialists</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button onClick={() => { setView('dashboard'); setSelectedCustomer(null) }} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: view==='dashboard'?'var(--gL)':'rgba(255,255,255,0.05)', color: view==='dashboard'?'var(--gold)':'var(--mu2)', border: '1px solid '+(view==='dashboard'?'rgba(212,168,83,0.3)':'var(--b1)'), whiteSpace: 'nowrap', flexShrink: 0 }}>📊 Dashboard</button>
          <button onClick={() => setView('withdraw')} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: view==='withdraw'?'var(--grL)':'rgba(255,255,255,0.05)', color: view==='withdraw'?'var(--green)':'var(--mu2)', border: '1px solid '+(view==='withdraw'?'rgba(34,197,94,.3)':'var(--b1)'), whiteSpace: 'nowrap', flexShrink: 0 }}>💸 Withdraw</button>
          <button onClick={() => { setView('new-order'); setStep(1) }} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap', flexShrink: 0 }}>+ New Order</button>
        </div>
      </div>

      {/* ══════════ DASHBOARD ══════════ */}
      {view === 'dashboard' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { l: 'Total Earnings',     v: '₹'+(partner?.total_earnings    ||0).toLocaleString('en-IN'), c: 'var(--green)',  icon: '💰', tip: 'Delivered orders' },
              { l: 'Pending Commission', v: '₹'+(partner?.pending_commission||0).toLocaleString('en-IN'), c: 'var(--orange)', icon: '⏳', tip: 'Awaiting delivery' },
              { l: 'Pending Payout',     v: '₹'+(partner?.pending_payout    ||0).toLocaleString('en-IN'), c: 'var(--blue)',   icon: '💸', tip: 'Ready to withdraw' },
              { l: 'Total Orders',       v: partner?.total_orders||0,                                      c: 'var(--teal)',   icon: '📦', tip: '' },
              { l: 'My Customers',       v: uniqueCustomers,                                               c: 'var(--mu2)',   icon: '👥', tip: '' },
              { l: 'Commission %',       v: (partner?.commission_pct||0)+'%',                              c: 'var(--gold)',   icon: '🎯', tip: '' },
            ].map((s,i) => (
              <div key={i} className="card" title={s.tip}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9.5, color: 'var(--mu)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Commission Flow Info */}
          <div style={{ background: 'rgba(0,151,167,.06)', border: '1px solid rgba(0,151,167,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--mu2)', lineHeight: 1.8 }}>
            💡 <strong>Commission Flow:</strong> Order placed → <span style={{ color: 'var(--orange)' }}>Pending Commission</span> → Order delivered → <span style={{ color: 'var(--green)' }}>Total Earnings + Pending Payout</span> → Withdraw request → <span style={{ color: 'var(--blue)' }}>Paid</span>
          </div>

          {/* Orders Table */}
          <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--b1)', fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>📦 Recent Orders</div>
            {partnerOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
                <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Start Earning!</h2>
                <p style={{ color: 'var(--mu)', fontSize: 14, marginBottom: 24 }}>Create your first customer order and earn {partner?.commission_pct||0}% commission</p>
                <button onClick={() => { setView('new-order'); setStep(1) }} style={{ padding: '14px 36px', background: 'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 50, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Outfit' }}>+ Create First Order →</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Date','Customer','Amount','Commission','Status','Tracking','Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {partnerOrders.map((o,i) => {
                      const awb = o.tracking_id || o.awb_number || ''
                      const courier = o.courier_name || o.courier || ''
                      return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--mu)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <button onClick={() => { setSelectedCustomer(customerMap[o.customer_phone||o.customer_name]); setView('customer-detail') }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--teal)', textDecoration: 'underline' }}>{o.customer_name}</div>
                            {o.customer_phone && <div style={{ fontSize: 10, color: 'var(--mu)' }}>{o.customer_phone}</div>}
                          </button>
                        </td>
                        <td style={{ padding: '9px 14px', fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)' }}>₹{(o.amount||0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ fontFamily: 'DM Mono', fontWeight: 700, color: o.status==='delivered'?'var(--green)':'var(--orange)', fontSize: 13 }}>₹{(o.commission||0).toLocaleString('en-IN')}</div>
                          <div style={{ fontSize: 9.5, color: o.status==='delivered'?'var(--green)':'var(--orange)' }}>{o.status==='delivered'?'earned':'pending'}</div>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: o.status==='delivered'?'var(--grL)':o.status==='cancelled'?'var(--rdL)':o.status==='new'?'var(--blL)':'var(--orL)', color: o.status==='delivered'?'var(--green)':o.status==='cancelled'?'var(--red)':o.status==='new'?'var(--blue)':'var(--orange)' }}>
                            {o.status||'new'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          {awb ? (
                            <div>
                              <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--teal)', fontWeight: 700 }}>{awb}</div>
                              {courier && <div style={{ fontSize: 9.5, color: 'var(--mu)' }}>{courier}</div>}
                              <a href={`https://shiprocket.co/tracking/${awb}`} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 9, color: '#FF6B35', fontWeight: 700, textDecoration: 'none' }}>Track ↗</a>
                            </div>
                          ) : <span style={{ fontSize: 10, color: 'var(--mu)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {o.skin_category && (
                              <button onClick={() => generatePDF({orderId:o.order_id,assignedSpecialist:{name:o.specialist_assigned}},{skinScore:o.skin_score,skinCategory:o.skin_category,skinType:o.skin_type,recommendedRange:o.recommended_range},{name:o.customer_name,phone:o.customer_phone,age:'',city:o.customer_city||'',state:o.customer_state||''})}
                                style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>📄 PDF</button>
                            )}
                            {o.status === 'new' && (
                              <button onClick={() => cancelOrder(o.id)} style={{ padding: '4px 10px', background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customers */}
          {Object.keys(customerMap).length > 0 && (
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 16 }}>👥 My Customers ({uniqueCustomers})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                {Object.values(customerMap).map((c: any, i) => (
                  <div key={i} onClick={() => { setSelectedCustomer(c); setView('customer-detail') }}
                    style={{ background: 'var(--s2)', borderRadius: 12, padding: '14px', cursor: 'pointer', border: '1px solid var(--b1)' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor='var(--teal)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor='var(--b1)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0097A7,#005F6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>{c.phone}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--mu)' }}>{c.orders.length} orders</span>
                      <span style={{ fontWeight: 700, color: 'var(--teal)' }}>₹{c.totalSpent.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.skinCategory && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--s1)', color: 'var(--mu)', fontWeight: 600 }}>{c.skinCategory}</span>}
                      {c.specialist && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: 'var(--blL)', color: 'var(--blue)', fontWeight: 600 }}>👩‍⚕️ {c.specialist}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ WITHDRAW ══════════ */}
      {view === 'withdraw' && (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>💸 Withdraw Request</div>
            <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 20 }}>HQ ko payout request bhejo</div>

            {/* Balance summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ background: 'var(--grL)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>Available to Withdraw</div>
                <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>₹{(partner?.pending_payout||0).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: 'var(--orL)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 4 }}>Pending Commission</div>
                <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>₹{(partner?.pending_commission||0).toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 10, color: 'var(--orange)', marginTop: 2 }}>Order deliver hone par milega</div>
              </div>
            </div>

            {(partner?.pending_payout||0) === 0 ? (
              <div style={{ background: 'var(--s2)', borderRadius: 12, padding: '24px', textAlign: 'center', color: 'var(--mu)' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Koi balance nahi</div>
                <div style={{ fontSize: 12.5 }}>Orders deliver hone ke baad balance aayega</div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Amount *</label>
                <input type="number" value={withdrawForm.amount} onChange={e=>setWithdrawForm(p=>({...p,amount:e.target.value}))} placeholder={`Max ₹${partner?.pending_payout||0}`} max={partner?.pending_payout||0} style={inp} />

                {/* Payment Method Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {(['upi','bank'] as const).map(m => (
                    <button key={m} onClick={()=>setWithdrawForm(p=>({...p,method:m}))}
                      style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid '+(withdrawForm.method===m?'var(--teal)':'var(--b1)'), background:withdrawForm.method===m?'rgba(0,151,167,0.1)':'var(--s2)', color:withdrawForm.method===m?'var(--teal)':'var(--mu2)', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      {m === 'upi' ? '📲 UPI' : '🏦 Bank Transfer'}
                    </button>
                  ))}
                </div>

                {withdrawForm.method === 'upi' ? (
                  <>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>UPI ID *</label>
                    <input value={withdrawForm.upi_id} onChange={e=>setWithdrawForm(p=>({...p,upi_id:e.target.value}))} placeholder="yourname@upi" style={inp} />
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Account Holder Name</label>
                    <input value={withdrawForm.upi_name} onChange={e=>setWithdrawForm(p=>({...p,upi_name:e.target.value}))} placeholder="Name on UPI account" style={inp} />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Account Holder Name *</label>
                    <input value={withdrawForm.bank_holder} onChange={e=>setWithdrawForm(p=>({...p,bank_holder:e.target.value}))} placeholder="Name as on bank account" style={inp} />
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Bank Account Number *</label>
                    <input value={withdrawForm.bank_account} onChange={e=>setWithdrawForm(p=>({...p,bank_account:e.target.value}))} placeholder="Account number" style={inp} />
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>IFSC Code *</label>
                    <input value={withdrawForm.bank_ifsc} onChange={e=>setWithdrawForm(p=>({...p,bank_ifsc:e.target.value.toUpperCase()}))} placeholder="IFSC0001234" style={inp} />
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Bank Name</label>
                    <input value={withdrawForm.bank_name} onChange={e=>setWithdrawForm(p=>({...p,bank_name:e.target.value}))} placeholder="e.g. SBI, HDFC" style={inp} />
                  </>
                )}

                <button onClick={submitWithdraw} disabled={withdrawSubmitting} style={{ width: '100%', padding: '14px', background: withdrawSubmitting?'var(--s2)':'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 9, color: withdrawSubmitting?'var(--mu)':'#fff', fontWeight: 800, fontSize: 15, cursor: withdrawSubmitting?'default':'pointer', fontFamily: 'Outfit' }}>
                  {withdrawSubmitting ? 'Submitting...' : '💸 Submit Withdraw Request'}
                </button>
              </div>
            )}
          </div>

          {/* Past requests */}
          {withdrawals.length > 0 && (
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Past Requests</div>
              {withdrawals.map((w,i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--b1)' }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>₹{(w.amount||0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{w.upi_id} · {new Date(w.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: w.status==='approved'?'var(--grL)':w.status==='rejected'?'var(--rdL)':'var(--orL)', color: w.status==='approved'?'var(--green)':w.status==='rejected'?'var(--red)':'var(--orange)' }}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ CUSTOMER DETAIL ══════════ */}
      {view === 'customer-detail' && selectedCustomer && (
        <div>
          <button onClick={() => setView('dashboard')} style={{ marginBottom: 16, padding: '8px 16px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#0097A7,#005F6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 22 }}>
                {selectedCustomer.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>{selectedCustomer.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--mu)', marginTop: 2 }}>{selectedCustomer.phone} · {selectedCustomer.email}</div>
                <div style={{ fontSize: 12.5, color: 'var(--mu)' }}>{selectedCustomer.city}, {selectedCustomer.state}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
              {[
                { l: 'Total Orders',  v: selectedCustomer.orders.length,                              c: 'var(--blue)' },
                { l: 'Total Spent',   v: '₹'+selectedCustomer.totalSpent.toLocaleString('en-IN'),     c: 'var(--teal)' },
                { l: 'Skin Category', v: selectedCustomer.skinCategory || '—',                         c: 'var(--gold)' },
                { l: 'Skin Type',     v: selectedCustomer.skinType     || '—',                         c: 'var(--mu2)' },
                { l: 'Specialist',    v: selectedCustomer.specialist   || '—',                         c: 'var(--green)' },
              ].map((s,i) => (
                <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--b1)', fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }}>Order History</div>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Date','Order ID','Amount','Commission','Status','Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {selectedCustomer.orders.map((o: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--mu)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'DM Mono', fontSize: 11.5 }}>{o.order_id}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)' }}>₹{(o.amount||0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'DM Mono', fontWeight: 700, color: o.status==='delivered'?'var(--green)':'var(--orange)' }}>₹{(o.commission||0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: o.status==='delivered'?'var(--grL)':o.status==='cancelled'?'var(--rdL)':'var(--blL)', color: o.status==='delivered'?'var(--green)':o.status==='cancelled'?'var(--red)':'var(--blue)' }}>{o.status||'new'}</span></td>
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {o.skin_category && <button onClick={() => generatePDF({orderId:o.order_id,assignedSpecialist:{name:o.specialist_assigned}},{skinScore:o.skin_score,skinCategory:o.skin_category,skinType:o.skin_type,recommendedRange:o.recommended_range},{name:o.customer_name,phone:o.customer_phone,age:'',city:o.customer_city||'',state:o.customer_state||''})} style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>📄 Skin Profile</button>}
                        {o.status === 'new' && <button onClick={() => cancelOrder(o.id)} style={{ padding: '4px 10px', background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ NEW ORDER ══════════ */}
      {view === 'new-order' && (
        <div>
          {step < 4 && (
            <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
              {STEP_LABELS.slice(0,4).map((label, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
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

          {/* STEP 1 */}
          {step === 1 && (
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 18 }}>👤 Customer Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
                {[{k:'name',l:'Full Name *',p:'Priya Sharma'},{k:'phone',l:'Phone *',p:'+91 9876543210'},{k:'email',l:'Email',p:'priya@email.com'},{k:'age',l:'Age',p:'25'}].map(f=>(
                  <div key={f.k}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{f.l}</label>
                    <input value={(customer as any)[f.k]} onChange={e=>setCustomer(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={inp} />
                  </div>
                ))}
              </div>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Address</label>
              <input value={customer.address} onChange={e=>setCustomer(p=>({...p,address:e.target.value}))} placeholder="House/Flat, Street, Colony" style={inp} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10 }}>
                {[{k:'city',l:'City',p:'Indore'},{k:'state',l:'State',p:'MP'},{k:'pincode',l:'Pincode',p:'452001'}].map(f=>(
                  <div key={f.k}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{f.l}</label>
                    <input value={(customer as any)[f.k]} onChange={e=>setCustomer(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={inp} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button onClick={() => setView('dashboard')} style={{ padding: '12px 24px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
                <button onClick={() => { if(!customer.name||!customer.phone){toast.error('Name aur phone required');return} setStep(2) }} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Next: Skin Analysis →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && !aiAnalysis && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[{mode:'photo',icon:'📸',title:'Photo Analysis',desc:'AI scans skin from photo',color:'var(--teal)'},{mode:'text',icon:'📝',title:'Manual Assessment',desc:'Fill skin details manually',color:'var(--gold)'}].map(m=>(
                  <button key={m.mode} onClick={()=>setAnalysisMode(m.mode as any)} style={{ flex: 1, padding: '16px', borderRadius: 12, border: `2px solid ${analysisMode===m.mode?m.color:'var(--b2)'}`, background: analysisMode===m.mode?m.color+'18':'var(--s2)', cursor: 'pointer', fontFamily: 'Outfit', textAlign: 'center' as const }}>
                    <div style={{ fontSize: 30, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: analysisMode===m.mode?m.color:'var(--tx)', marginBottom: 4 }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{m.desc}</div>
                    {analysisMode===m.mode && <div style={{ fontSize: 10, color: m.color, marginTop: 6, fontWeight: 700 }}>✓ SELECTED</div>}
                  </button>
                ))}
              </div>

              {analysisMode === 'photo' && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 6 }}>📸 Customer Skin Photo</div>
                  <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16, lineHeight: 1.6 }}>Clearly lit face photo lo — AI scan karke personalized analysis dega 🔬</div>
                  {photoPreview ? (
                    <div style={{ marginBottom: 16 }}>
                      <img src={photoPreview} alt="Skin" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--teal)' }} />
                      <button onClick={()=>{setPhotoBase64('');setPhotoPreview('')}} style={{ marginTop: 10, padding: '7px 16px', background: 'var(--rdL)', border: 'none', borderRadius: 8, color: 'var(--red)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>🗑 Remove</button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div onClick={()=>cameraInputRef.current?.click()} style={{ border: '2px dashed var(--teal)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,151,167,.04)' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', marginBottom: 4 }}>Camera se Photo Lo</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>Mobile camera open hoga</div>
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                      </div>
                      <div onClick={()=>fileInputRef.current?.click()} style={{ border: '2px dashed var(--b2)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--s2)' }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>🖼</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--mu2)', marginBottom: 4 }}>Gallery se Upload</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>JPG, PNG — max 5MB</div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                      </div>
                    </div>
                  )}
                  <div style={{ background: 'rgba(0,151,167,.06)', borderRadius: 10, padding: '12px 14px', fontSize: 11.5, color: 'var(--mu2)', lineHeight: 1.7 }}>
                    💡 <strong>Best results:</strong> Natural light · Face clearly visible · No filters · Clean skin
                  </div>
                </div>
              )}

              {analysisMode === 'text' && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 14 }}>🔬 Skin Assessment</div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Skin Type *</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {['Oily','Dry','Combination','Normal','Sensitive'].map(s=>(
                      <button key={s} onClick={()=>setSkinType(s)} style={{ padding: '7px 16px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: skinType===s?'rgba(0,151,167,.12)':'var(--s2)', color: skinType===s?'var(--teal)':'var(--mu2)', border: `1.5px solid ${skinType===s?'var(--teal)':'var(--b2)'}` }}>{s}</button>
                    ))}
                  </div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Main Concerns *</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {SKIN_CONCERNS.map(c=>(
                      <button key={c} onClick={()=>setConcerns(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])} style={{ padding: '5px 12px', borderRadius: 50, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: concerns.includes(c)?'var(--gL)':'var(--s2)', color: concerns.includes(c)?'var(--gold)':'var(--mu2)', border: `1.5px solid ${concerns.includes(c)?'var(--gold)':'var(--b2)'}` }}>{c}</button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[{k:'waterIntake',l:'Water Intake',p:'6-8 glasses'},{k:'sleep',l:'Sleep Hours',p:'7-8 hours'},{k:'stress',l:'Stress Level',p:'Low/Medium/High'},{k:'outdoor',l:'Sun Exposure',p:'Low/Medium/High'},{k:'diet',l:'Diet Type',p:'Vegetarian/Non-veg'},{k:'skinGoal',l:'Skin Goal',p:'Clear skin, Glow...'}].map(f=>(
                      <div key={f.k}>
                        <label style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>{f.l}</label>
                        <input value={(skinQ as any)[f.k]} onChange={e=>setSkinQ(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{ ...inp, marginBottom: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={()=>setStep(1)} style={{ padding: '12px 24px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
                <button onClick={runAIAnalysis} disabled={aiLoading||(analysisMode==='photo'&&!photoBase64)||(analysisMode==='text'&&(!skinType||concerns.length===0))}
                  style={{ padding: '12px 28px', background: aiLoading?'var(--s2)':'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 9, color: aiLoading?'var(--mu)':'#fff', fontWeight: 700, fontSize: 14, cursor: aiLoading?'default':'pointer', fontFamily: 'Outfit' }}>
                  {aiLoading ? '🔬 AI Analyzing...' : '🔬 Run AI Analysis →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — AI SKIN ANALYSIS RESULTS */}
          {step === 2 && aiAnalysis && (
            <div>
              {/* Hero Score Banner */}
              <div style={{ background: 'linear-gradient(135deg,#003D40,#005F6A)', borderRadius: 16, padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(1,151,166,0.15)' }} />
                <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(1,151,166,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', position: 'relative' }}>
                  {photoPreview && <img src={photoPreview} alt="Customer" style={{ width: 70, height: 70, borderRadius: 14, objectFit: 'cover', border: '3px solid rgba(1,151,166,0.6)', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🔬 Rabt AI Skin Analysis</div>
                    <div style={{ fontFamily: 'Syne', fontSize: isMobile ? 18 : 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{customer.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {aiAnalysis.skinType && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(1,151,166,0.3)', color: '#7EEEF4', fontWeight: 700 }}>{aiAnalysis.skinType}</span>}
                      {aiAnalysis.skinCategory && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }}>{aiAnalysis.skinCategory}</span>}
                      {aiAnalysis.primaryConcern && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', fontWeight: 600 }}>⚠ {aiAnalysis.primaryConcern}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 52, fontWeight: 800, color: aiAnalysis.skinScore >= 70 ? '#4ADE80' : aiAnalysis.skinScore >= 50 ? '#FACC15' : '#F87171', lineHeight: 1 }}>{aiAnalysis.skinScore}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>/ 100 Skin Score</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, borderLeft: '3px solid rgba(1,151,166,0.6)' }}>
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0 }}>{aiAnalysis.skinSummary}</p>
                </div>
              </div>

              {/* Concerns + Range row */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="card">
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>⚠ Skin Concerns</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {(aiAnalysis.skinConcerns||[]).map((c:string,i:number) => (
                      <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: 'var(--red)', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)' }}>{c}</span>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>✓ Ingredients To Use</div>
                      {(aiAnalysis.ingredientsToLookFor||[]).map((ing:string,i:number) => <div key={i} style={{ fontSize: 11, color: 'var(--tx)', marginBottom: 3 }}>• {ing}</div>)}
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>✗ Avoid</div>
                      {(aiAnalysis.ingredientsToAvoid||[]).map((ing:string,i:number) => <div key={i} style={{ fontSize: 11, color: 'var(--tx)', marginBottom: 3 }}>• {ing}</div>)}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(160deg,rgba(1,151,166,0.06),rgba(0,63,64,0.1))', border: '1px solid rgba(1,151,166,0.25)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>🌿 Recommended Range</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: 'var(--teal)', marginBottom: 6 }}>{aiAnalysis.recommendedRange}</div>
                  <div style={{ fontSize: 12, color: 'var(--mu2)', lineHeight: 1.65, marginBottom: 14 }}>{aiAnalysis.rangeReason}</div>
                  {aiAnalysis.weeklyTreatment && (
                    <div style={{ background: 'rgba(1,151,166,0.1)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(1,151,166,0.2)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', marginBottom: 5 }}>📅 Weekly Treatment</div>
                      <div style={{ fontSize: 11.5, color: 'var(--tx)', lineHeight: 1.6 }}>{aiAnalysis.weeklyTreatment}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Routines */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {[{title:'🌅 Morning Routine', routine: aiAnalysis.amRoutine, accent: '#F59E0B'}, {title:'🌙 Night Routine', routine: aiAnalysis.pmRoutine, accent: '#818CF8'}].map(({title,routine,accent},i) => (
                  <div key={i} className="card">
                    <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12, color: accent }}>{title}</div>
                    {(routine||[]).map((s:any,j:number) => (
                      <div key={j} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--s2)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--b1)' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{j+1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{s.product}</div>
                          <div style={{ fontSize: 11, color: 'var(--mu2)', lineHeight: 1.5 }}>{s.instruction}</div>
                          {s.time && <div style={{ fontSize: 10, color: accent, marginTop: 3, fontWeight: 600 }}>⏱ {s.time}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Expected Results + Diet */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {aiAnalysis.expectedResults && (
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>📈 Expected Results</div>
                    {[['Week 4', aiAnalysis.expectedResults.week4], ['Week 8', aiAnalysis.expectedResults.week8], ['Week 12', aiAnalysis.expectedResults.week12]].map(([label, result], i) => result && (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--b1)' : 'none' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{label}</span>
                        <span style={{ fontSize: 12, color: 'var(--tx)', lineHeight: 1.5 }}>{result}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(aiAnalysis.dietAdvice?.length > 0 || aiAnalysis.lifestyleAdvice?.length > 0) && (
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>🥗 Diet & Lifestyle</div>
                    {(aiAnalysis.dietAdvice||[]).map((d:string,i:number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                        <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 11.5, color: 'var(--tx)', lineHeight: 1.5 }}>{d}</span>
                      </div>
                    ))}
                    {(aiAnalysis.lifestyleAdvice||[]).map((d:string,i:number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                        <span style={{ color: 'var(--teal)', fontWeight: 700, flexShrink: 0 }}>★</span>
                        <span style={{ fontSize: 11.5, color: 'var(--tx)', lineHeight: 1.5 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specialist Note */}
              {aiAnalysis.specialistNote && (
                <div style={{ background: 'linear-gradient(135deg,rgba(1,151,166,0.08),rgba(0,63,64,0.06))', border: '1px solid rgba(1,151,166,0.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>🩺 Specialist Note</div>
                  <p style={{ fontSize: 12.5, color: 'var(--tx)', lineHeight: 1.65, margin: 0 }}>{aiAnalysis.specialistNote}</p>
                </div>
              )}

              {/* Products */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>🛒 Recommended Products</div>
                {productsLoading ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--mu)' }}>Loading products...</div> : (
                  <>
                    {cart.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>✨ AI Selected for {customer.name}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
                          {cart.map((c,i) => (
                            <div key={i} style={{ background: 'var(--s2)', borderRadius: 12, padding: '12px', border: '1.5px solid rgba(1,151,166,0.4)', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 8, padding: '2px 6px', borderRadius: 20, background: 'rgba(1,151,166,0.15)', color: 'var(--teal)', fontWeight: 800 }}>AI PICK</div>
                              {c.product.images?.[0] && <img src={c.product.images[0]} alt={c.product.name} style={{ width: '100%', height: 85, objectFit: 'contain', borderRadius: 8, marginBottom: 8, background: '#fff', paddingTop: 16 }} />}
                              <div style={{ fontSize: 10.5, fontWeight: 700, marginBottom: 6, lineHeight: 1.35 }}>{c.product.name}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontFamily: 'DM Mono', fontWeight: 800, color: 'var(--teal)', fontSize: 13 }}>₹{c.product.price.toLocaleString('en-IN')}</span>
                                <button onClick={()=>removeFromCart(c.product._id)} style={{ padding: '3px 7px', background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--teal)', padding: '8px 0', userSelect: 'none' }}>➕ Add more products ({products.length - cart.length} available)</summary>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8, marginTop: 10, maxHeight: 380, overflowY: 'auto', padding: '4px 2px' }}>
                        {products.filter(p => !cart.find(c => c.product._id === p._id)).map(prod => (
                          <div key={prod._id} style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px', border: '1px solid var(--b1)' }}>
                            {prod.images?.[0] && <img src={prod.images[0]} alt={prod.name} style={{ width: '100%', height: 70, objectFit: 'contain', borderRadius: 6, marginBottom: 6, background: '#fff' }} />}
                            <div style={{ fontSize: 10.5, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{prod.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)', fontSize: 12 }}>₹{prod.price.toLocaleString('en-IN')}</span>
                              <button onClick={()=>addToCart(prod)} style={{ padding: '4px 10px', background: 'rgba(1,151,166,0.12)', border: '1px solid rgba(1,151,166,0.3)', borderRadius: 6, color: 'var(--teal)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                )}
              </div>

              {/* Bottom bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 12, padding: '14px 16px' }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>₹{cartTotal.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 1 }}>{cart.length} products · {commission > 0 ? `+₹${commission} your commission` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={()=>generatePDF()} style={{ padding: '10px 14px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--teal)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>📄 Skin PDF</button>
                  <button onClick={()=>{setAiAnalysis(null);setPhotoBase64('');setPhotoPreview('')}} style={{ padding: '10px 16px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>🔄 Re-analyze</button>
                  <button onClick={()=>{if(cart.length===0){toast.error('Add at least one product');return}setStep(3)}} style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#0197a6,#017a87)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>Proceed to Checkout →</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CHECKOUT */}
          {step === 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 400px', gap: 16 }}>
              <div>
                <div className="card" style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>📦 Order Summary</div>
                  {cart.map((c,i)=>(
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--b1)' }}>
                      {c.product.images?.[0] && <img src={c.product.images[0]} alt={c.product.name} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid var(--b1)' }} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.3 }}>{c.product.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)' }}>₹{c.product.price} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={()=>updateQty(c.product._id,c.qty-1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--b2)', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--tx)' }}>−</button>
                        <span style={{ fontFamily: 'DM Mono', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{c.qty}</span>
                        <button onClick={()=>updateQty(c.product._id,c.qty+1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--b2)', cursor: 'pointer', fontWeight: 800, fontSize: 14, color: 'var(--tx)' }}>+</button>
                      </div>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)', minWidth: 65, textAlign: 'right' }}>₹{(c.product.price*c.qty).toLocaleString('en-IN')}</span>
                      <button onClick={()=>removeFromCart(c.product._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
                    </div>
                  ))}
                </div>
                {specialists.length > 0 && (
                  <div style={{ background: 'rgba(0,151,167,.06)', border: '1px solid rgba(0,151,167,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>👩‍⚕️</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)' }}>Auto-assigned Specialist</div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{specialists[partnerOrders.length % specialists.length]?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)' }}>Will guide customer — free service</div>
                    </div>
                  </div>
                )}
                <div className="card">
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>📍 Delivery Address</div>
                  <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.8 }}>
                    <strong>{customer.name}</strong> · {customer.phone}<br/>{customer.address}, {customer.city}, {customer.state} - {customer.pincode}
                  </div>
                </div>
              </div>
              <div>
                <div className="card" style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>💳 Payment Method</div>
                  {[{v:'cod',label:'💵 Cash on Delivery',desc:'Customer pays at delivery'},{v:'online',label:'💳 Online / Prepaid',desc:'UPI, Card, Netbanking'}].map(p=>(
                    <div key={p.v} onClick={()=>setPayment(p.v as any)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 8, background: payment===p.v?'rgba(0,151,167,.08)':'var(--s2)', border: `1.5px solid ${payment===p.v?'var(--teal)':'var(--b2)'}`, borderRadius: 12, cursor: 'pointer' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payment===p.v?'var(--teal)':'var(--b2)'}`, background: payment===p.v?'var(--teal)':'transparent', flexShrink: 0 }} />
                      <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.label}</div><div style={{ fontSize: 11, color: 'var(--mu)' }}>{p.desc}</div></div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>🎟 Coupon Code</div>
                  {appliedCoupon ? (
                    <div style={{ background: 'var(--grL)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>✅ {appliedCoupon.code}</div>
                        <div style={{ fontSize: 11, color: 'var(--green)' }}>{appliedCoupon.discount}% off · Saving ₹{couponDiscount.toLocaleString('en-IN')}</div>
                      </div>
                      <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" style={{ ...inp, marginBottom: 0, flex: 1 }} onKeyDown={e=>e.key==='Enter'&&applyCoupon()} />
                        <button onClick={applyCoupon} style={{ padding: '10px 16px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,.3)', borderRadius: 9, color: 'var(--gold)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap' as const }}>Apply</button>
                      </div>
                      {couponError && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 6 }}>⚠️ {couponError}</div>}
                      {coupons.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          {coupons.slice(0,3).map((c,i) => (
                            <div key={i} onClick={()=>{setCouponCode(c.code);setTimeout(applyCoupon,100)}} style={{ background: 'var(--s2)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, cursor: 'pointer', border: '1px dashed var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div><span style={{ fontFamily: 'DM Mono', fontWeight: 800, color: 'var(--gold)', fontSize: 12 }}>{c.code}</span><span style={{ fontSize: 11, color: 'var(--mu)', marginLeft: 8 }}>{c.discount}% · Min ₹{c.minimumAmount}</span></div>
                              <span style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>Apply →</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="card">
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>💰 Price Breakdown</div>
                  {[
                    ['Subtotal', `₹${cartSubtotal.toLocaleString('en-IN')}`, ''],
                    ...(appliedCoupon ? [['Discount ('+appliedCoupon.code+')', `-₹${couponDiscount.toLocaleString('en-IN')}`, 'var(--green)']] : []),
                    ['Delivery', 'Free', ''],
                    ['Your Commission (pending)', `₹${commission}`, 'var(--orange)'],
                  ].map(([l,v,c],i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--b1)', fontSize: 13 }}>
                      <span style={{ color: c || 'var(--mu2)' }}>{l}</span>
                      <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: c || 'var(--tx)' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid var(--b2)', marginTop: 4 }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>Total</span>
                    <span style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <button onClick={placeOrder} disabled={submitting} style={{ width: '100%', padding: '14px', background: submitting?'var(--s2)':'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 9, color: submitting?'var(--mu)':'#fff', fontWeight: 800, fontSize: 15, cursor: submitting?'default':'pointer', fontFamily: 'Outfit', marginBottom: 8 }}>
                    {submitting ? 'Placing Order...' : `✅ Place Order · ₹${cartTotal.toLocaleString('en-IN')}`}
                  </button>
                  <button onClick={()=>setStep(2)} style={{ width: '100%', padding: '10px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>← Back</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 4 && orderResult && (
            <div>
              <div style={{ background: 'linear-gradient(135deg,rgba(0,151,167,.1),rgba(0,151,167,.05))', border: '1.5px solid rgba(0,151,167,.3)', borderRadius: 16, padding: '24px', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
                <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--teal)', marginBottom: 6 }}>Order Placed Successfully!</div>
                <div style={{ fontSize: 14, color: 'var(--mu2)', marginBottom: 14 }}>Order #{orderResult.orderId} · ₹{cartTotal.toLocaleString('en-IN')}</div>
                {appliedCoupon && <div style={{ fontSize: 13, color: 'var(--green)', marginBottom: 10 }}>🎟 Saved ₹{couponDiscount} with {appliedCoupon.code}</div>}
                <div style={{ background: 'var(--orL)', borderRadius: 10, padding: '10px 16px', display: 'inline-block', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--orange)' }}>⏳ Pending Commission (will move to earnings after delivery)</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--orange)', marginTop: 2 }}>₹{orderResult.commission}</div>
                </div>
                {orderResult.assignedSpecialist && (
                  <div style={{ background: 'var(--s1)', borderRadius: 12, padding: '12px 18px', display: 'inline-block', marginLeft: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--mu)' }}>Assigned Specialist</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--teal)', marginTop: 4 }}>👩‍⚕️ {orderResult.assignedSpecialist.name}</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => generatePDF()} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg,#0197a6,#017a87)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>📄 Download Skin Profile PDF</button>
                <button onClick={resetOrder} style={{ flex: 1, padding: '13px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 9, color: 'var(--mu2)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit' }}>+ New Customer</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
