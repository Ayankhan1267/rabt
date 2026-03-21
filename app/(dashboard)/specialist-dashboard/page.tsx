'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import SkinProfileModal from './SkinProfileModal'

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--orange)', accepted: 'var(--teal)', scheduled: 'var(--blue)',
  completed: 'var(--green)', cancelled: 'var(--red)', in_progress: 'var(--purple)',
}
const STATUS_BG: Record<string, string> = {
  pending: 'var(--orL)', accepted: 'rgba(20,184,166,0.15)', scheduled: 'var(--blL)',
  completed: 'var(--grL)', cancelled: 'var(--rdL)', in_progress: 'rgba(139,92,246,0.15)',
}

function getProductImg(p: any) {
  return p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url || p.image || ''
}

function getProductPrice(p: any, v?: any) {
  if (v) {
    const vp = v.price
    if (typeof vp === 'object') return vp?.discounted || vp?.original || 0
    return typeof vp === 'number' ? vp : 0
  }
  const vv = p.variants?.[0]
  if (vv) {
    const vp = vv.price
    if (typeof vp === 'object') return vp?.discounted || vp?.original || 0
    return typeof vp === 'number' ? vp : 0
  }
  const pp = p.price
  if (typeof pp === 'object') return pp?.discounted || pp?.original || 0
  return typeof pp === 'number' ? pp : 0
}

function playNotificationSound() {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioContext()
    ;[784, 880, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15)
      osc.start(ctx.currentTime + i * 0.1)
      osc.stop(ctx.currentTime + i * 0.1 + 0.18)
    })
  } catch {}
}

export default function SpecialistDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [mongoSpec, setMongoSpec] = useState<any>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [skinProfiles, setSkinProfiles] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [unassignedCons, setUnassignedCons] = useState<any[]>([])
  const [rejectedIds, setRejectedIds] = useState<string[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [coupons, setCoupons] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'overview' | 'consultations' | 'crm' | 'skinprofiles' | 'earnings'>('overview')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientFilter, setPatientFilter] = useState<'all' | 'online' | 'offline'>('all')

  // Consultation detail
  const [selectedCons, setSelectedCons] = useState<any>(null)
  const [rescheduleModal, setRescheduleModal] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  // Skin profile edit
  const [editSkinProfile, setEditSkinProfile] = useState<any>(null)
  const [skinProfileForm, setSkinProfileForm] = useState<any>({})
  const [skinProfileLoading, setSkinProfileLoading] = useState(false)
  const [showSkinProfileModal, setShowSkinProfileModal] = useState(false)
  const [selectedSkinProfile, setSelectedSkinProfile] = useState<any>(null)

  // Payout
  const [payoutModal, setPayoutModal] = useState(false)
  const [payoutForm, setPayoutForm] = useState({ amount: '', upiId: '', upiName: '', method: 'upi' })
  const [payoutLoading, setPayoutLoading] = useState(false)

  // Offline POS
  const [showPOS, setShowPOS] = useState(false)
  const [posStep, setPosStep] = useState<'customer' | 'skin' | 'analysis' | 'notes' | 'products' | 'payment'>('customer')
  const [offlineCustomer, setOfflineCustomer] = useState({ name: '', phone: '', email: '', city: '', state: '', pincode: '', address: '' })
  const [skinImages, setSkinImages] = useState<string[]>([])
  const [skinConcern, setSkinConcern] = useState('')
  const [skinAge, setSkinAge] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [specNotes, setSpecNotes] = useState({
    primaryConcern: '', secondaryConcern: '', skinSensitivity: 'medium',
    dietIntake: '', dietAvoid: '', lifestyle: '', waterIntake: '',
    skinGoal: '', additionalNotes: ''
  })
  const [cart, setCart] = useState<any[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'prepaid'>('prepaid')
  const [posLoading, setPosLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    loadAll()
    const channel = supabase.channel('specialist_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
        const notif = payload.new as any
        const { data: { user } } = await supabase.auth.getUser()
        if (notif.user_id !== user?.id) return
        if (notif.type === 'consultation') {
          playNotificationSound()
          toast('\uD83C\uDF3F New consultation request!', { duration: 10000 })
        }
      }).subscribe()

    const interval = setInterval(async () => {
      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
      if (!url) return
      try {
        await fetch('/api/check-consultations')
        const res = await fetch(url + '/api/consultations')
        if (!res.ok) return
        const all = await res.json()
        const unassigned = Array.isArray(all) ? all.filter((c: any) => c.status === 'pending' && !c.assignedSpecialist) : []
        setUnassignedCons(prev => {
          if (unassigned.length > prev.length) {
            playNotificationSound()
            toast('\uD83C\uDF3F New consultation request!', { duration: 10000 })
          }
          return unassigned
        })
      } catch {}
    }, 30000)

    return () => { channel.unsubscribe(); clearInterval(interval) }
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
      setProfile(prof)
      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
      if (!url) { setLoading(false); return }
      const [specRes, consRes, ordRes, prodRes, couponRes, skinRes, payoutRes, userRes, sessionRes] = await Promise.all([
        fetch(url + '/api/specialists').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/consultations').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/orders').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/products').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/coupons').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/skinprofiles').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/payouts').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/users').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/sessions').then(r => r.ok ? r.json() : []),
      ])
      const allSpecs = Array.isArray(specRes) ? specRes : []
      const mySpec = allSpecs.find((s: any) => s.email?.toLowerCase() === prof?.email?.toLowerCase())
      setMongoSpec(mySpec)
      const allCons = Array.isArray(consRes) ? consRes : []
      const allUsers = Array.isArray(userRes) ? userRes : []
      setAllUsers(allUsers)
      setConsultations(mySpec ? allCons.filter((c: any) => c.assignedSpecialist?.toString() === mySpec._id?.toString()) : [])
      setLeads(mySpec ? allCons.filter((c: any) => c.assignedSpecialist?.toString() === mySpec._id?.toString()) : [])
      setUnassignedCons(allCons.filter((c: any) => c.status === 'pending' && !c.assignedSpecialist && !rejectedIds.includes(c._id?.toString())))
      setOrders(Array.isArray(ordRes) ? ordRes : [])
      setProducts(Array.isArray(prodRes) ? prodRes : [])
      setCoupons(Array.isArray(couponRes) ? couponRes : [])
      setSkinProfiles(Array.isArray(skinRes) ? skinRes : [])
      setPayouts(Array.isArray(payoutRes) ? payoutRes : [])
      setSessions(Array.isArray(sessionRes) ? sessionRes : [])
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  function getSessionForCons(c: any) {
    return sessions.find((s: any) => s.consultation?.toString() === c._id?.toString())
  }

  function getSkinProfileForCons(c: any) {
    const uid = c.user?.toString() || c.userId?.toString()
    return skinProfiles.find((sp: any) =>
      sp.consultation?.toString() === c._id?.toString() ||
      sp.consultationId?.toString() === c._id?.toString() ||
      (uid && sp.user?.toString() === uid)
    )
  }

  function getUserForCons(c: any) {
    const uid = (typeof c.user === "object" ? c.user?._id?.toString() : c.user?.toString()) || c.userId?.toString()
    if (!uid) return null
    return allUsers.find((u: any) => u._id?.toString() === uid) || null
  }

  // Earnings
  const completedCons = consultations.filter(c => c.status === 'completed').length
  const consultationEarnings = completedCons * 30
  const myPatientIds = new Set(consultations.map(c => c.userId || c.user?.toString()).filter(Boolean))
  const myPatientOrders = orders.filter(o => {
    const uid = o.userId || o.user?.toString()
    const src = (o.source || o.orderSource || '').toLowerCase()
    if (src === 'partner') return false
    return (uid && myPatientIds.has(uid)) || o.specialistId?.toString() === mongoSpec?._id?.toString()
  })
  const myConsIds = new Set(consultations.map(c => c._id?.toString()).filter(Boolean))
  const mySkinProfiles = skinProfiles.filter(p =>
    (p.specialistId?.toString() === mongoSpec?._id?.toString()) ||
    (p.consultationId && myConsIds.has(p.consultationId?.toString()))
  )
  const deliveredOrders = myPatientOrders.filter(o => (o.orderStatus || o.status || '').toLowerCase() === 'delivered')
  const pendingCommissionOrders = myPatientOrders.filter(o => { const s = (o.orderStatus || o.status || '').toLowerCase(); return s !== 'delivered' && s !== 'cancelled' && s !== 'canceled' })
  const commissionEarned = Math.round(deliveredOrders.reduce((s, o) => s + (o.amount || 0) * 0.12, 0))
  const pendingCommission = Math.round(pendingCommissionOrders.reduce((s, o) => s + (o.amount || 0) * 0.12, 0))
  const totalEarnings = consultationEarnings + commissionEarned

  const patientMap = new Map<string, any>()
  consultations.forEach(c => {
    const user = getUserForCons(c)
    const uid = c.user?.toString() || c.userId?.toString() || c._id?.toString()
    const phone = c.phone || user?.phoneNumber || ''
    const name = c.fullName || c.name || (user?.firstName ? (user.firstName + ' ' + (user.lastName || '')).trim() : '') || 'Unknown'
    const key = phone || uid
    if (!key) return
    const existing = patientMap.get(key)
    const skinProfile = skinProfiles.find((sp: any) =>
      sp.specialistId?.toString() === mongoSpec?._id?.toString() &&
      (sp.phone === phone || sp.consultationId === c._id?.toString())
    )
    const patientOrders = orders.filter((o: any) => {
      const oUid = o.userId || o.user?.toString()
      const oPhone = o.customerPhone || o.customer_phone || ''
      return (oUid && oUid === uid) || (phone && oPhone === phone)
    })
    const spent = patientOrders.reduce((s: number, o: any) => s + (o.amount || 0), 0)
    if (!existing) {
      patientMap.set(key, {
        key, name, phone,
        email: c.email || user?.email || '',
        age: c.age || '',
        skinType: skinProfile?.skinType || '',
        skinConcerns: skinProfile?.skinConcerns || [],
        consults: 1, orders: patientOrders.length, spent,
        source: 'online', lastConsultation: c, userId: uid,
      })
    } else {
      patientMap.set(key, { ...existing, consults: existing.consults + 1, orders: patientOrders.length, spent })
    }
  })

  orders.filter((o: any) => {
    const src = (o.source || o.orderSource || '').toLowerCase()
    return src === 'specialist_offline' && o.specialistId?.toString() === mongoSpec?._id?.toString()
  }).forEach((o: any) => {
    const phone = o.customerPhone || o.customer_phone || ''
    const name = o.customerName || o.customer_name || 'Unknown'
    const key = phone || o._id?.toString()
    if (!key) return
    const skinProfile = skinProfiles.find((sp: any) =>
      sp.specialistId?.toString() === mongoSpec?._id?.toString() && sp.phone === phone
    )
    const patientOrders = orders.filter((po: any) => {
      const poPhone = po.customerPhone || po.customer_phone || ''
      return phone && poPhone === phone
    })
    const spent = patientOrders.reduce((s: number, po: any) => s + (po.amount || 0), 0)
    if (!patientMap.has(key)) {
      patientMap.set(key, {
        key, name, phone,
        email: o.customerEmail || o.customer_email || '',
        age: '',
        skinType: skinProfile?.skinType || '',
        skinConcerns: skinProfile?.skinConcerns || [],
        consults: 0, orders: patientOrders.length, spent,
        source: 'offline', lastConsultation: null, userId: null,
      })
    }
  })

  const allMyPatients = Array.from(patientMap.values())
  const filteredPatients = allMyPatients.filter(p => {
    if (patientFilter !== 'all' && p.source !== patientFilter) return false
    if (patientSearch) {
      const s = patientSearch.toLowerCase()
      return p.name.toLowerCase().includes(s) || p.phone.includes(s)
    }
    return true
  })

  function addToCart(product: any, variant: any) {
    const key = product._id + (variant?.sku || '')
    const existing = cart.find((c: any) => c._key === key)
    if (existing) setCart(cart.map((c: any) => c._key === key ? { ...c, qty: c.qty + 1 } : c))
    else setCart([...cart, {
      ...product, _key: key, variant, qty: 1,
      price: getProductPrice(product, variant),
      image: getProductImg(product)
    }])
  }

  function getCartTotal() {
    const subtotal = cart.reduce((s: number, i: any) => s + (Number(i.price) * Number(i.qty)), 0)
    let discount = 0
    if (couponApplied) {
      const discVal = Number(couponApplied.discount) || 0
      discount = couponApplied.discountType === 'percentage'
        ? Math.min(subtotal * discVal / 100, Number(couponApplied.maximumDiscount) || 99999)
        : discVal
    }
    return { subtotal: Math.round(subtotal), discount: Math.round(discount), total: Math.round(Math.max(0, subtotal - discount)) }
  }

  function applyCoupon() {
    const c = coupons.find((c: any) => c.code?.toLowerCase() === couponCode.toLowerCase() && c.isActive !== false)
    if (!c) { toast.error('Invalid coupon'); return }
    setCouponApplied(c); toast.success('Coupon applied!')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const newImages: string[] = []
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      const reader = new FileReader()
      await new Promise<void>(resolve => {
        reader.onload = () => { newImages.push(reader.result as string); resolve() }
        reader.readAsDataURL(files[i])
      })
    }
    setSkinImages(prev => [...prev, ...newImages].slice(0, 4))
  }

  async function analyzeSkin() {
    if (skinImages.length === 0) { toast.error('Skin photos add karo'); return }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/skin-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: skinImages, concern: skinConcern, age: skinAge })
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); setAnalyzing(false); return }
      setAiAnalysis(data.analysis)
      const allSuggested = [...(data.analysis.amRoutine || []), ...(data.analysis.pmRoutine || [])]
      const suggestedNames = allSuggested.map((r: any) => r.product.toLowerCase())
      const matchedProducts = products.filter(p => suggestedNames.some(name => p.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0])))
      if (matchedProducts.length > 0) {
        setCart(matchedProducts.slice(0, 6).map((p: any) => ({
          ...p, _key: p._id, variant: p.variants?.[0] || {}, qty: 1,
          price: getProductPrice(p, p.variants?.[0]),
          image: getProductImg(p)
        })))
      }
      setPosStep('analysis')
    } catch { toast.error('Analysis failed') }
    setAnalyzing(false)
  }

  async function acceptConsultation(c: any) {
    try {
      const res = await fetch('/api/rabt-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: c._id?.toString(), specialistMongoId: mongoSpec?._id?.toString() })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Consultation accepted! Session created! \u2705')
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('notifications').insert({
          user_id: user?.id,
          title: 'Consultation Accepted',
          message: 'You accepted consultation from ' + (c.fullName || c.name || 'Patient'),
          type: 'consultation',
          is_read: false,
        })
        loadAll()
      } else {
        toast.error(data.error || 'Failed to accept')
      }
    } catch { toast.error('Error') }
  }

  async function rejectConsultation(c: any) {
    const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
    setRejectedIds(r => [...r, c._id?.toString()])
    if (url) {
      try {
        await fetch(url + '/api/consultations/' + c._id, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rejectedBy: [{ specialist: mongoSpec?._id?.toString(), rejectedAt: new Date(), reason: "Not available" }]
          })
        })
      } catch {}
    }
    toast.success('Rejected!')
    loadAll()
  }

  async function confirmReschedule() {
    if (!rescheduleDate || !rescheduleTime) { toast.error('Date aur time required'); return }
    const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
    if (!url) return
    setRescheduleLoading(true)
    try {
      const res = await fetch(url + '/api/consultations/' + rescheduleModal._id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: new Date(rescheduleDate),
          scheduledTime: rescheduleTime,
          status: 'scheduled',
          rescheduledAt: new Date(),
        })
      })
      if (res.ok) {
        toast.success('Rescheduled successfully! \uD83D\uDCC5')
        setRescheduleModal(null); setRescheduleDate(''); setRescheduleTime('')
        loadAll()
      } else toast.error('Failed to reschedule')
    } catch { toast.error('Error') }
    setRescheduleLoading(false)
  }

  async function completeConsultation(c: any) {
    const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
    if (!url) return
    try {
      const res = await fetch(url + '/api/consultations/' + c._id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completedAt: new Date() })
      })
      if (res.ok) { toast.success('Consultation completed! \uD83C\uDF89'); setSelectedCons(null); loadAll() }
      else toast.error('Failed')
    } catch { toast.error('Error') }
  }

  async function cancelConsultation(c: any) {
    if (!confirm('Cancel karna chahte ho?')) return
    const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
    if (!url) return
    try {
      const res = await fetch(url + '/api/consultations/' + c._id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelledAt: new Date() })
      })
      if (res.ok) { toast.success('Consultation cancelled'); setSelectedCons(null); loadAll() }
      else toast.error('Failed')
    } catch { toast.error('Error') }
  }

  // âœ… UPDATED: Create or Update skin profile
  async function updateSkinProfile() {
    const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
    if (!url || !editSkinProfile) return
    setSkinProfileLoading(true)
    try {
      let res
      if (editSkinProfile._id) {
        // Update existing
        res = await fetch(url + '/api/skinprofiles/' + editSkinProfile._id, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...skinProfileForm, updatedAt: new Date(), updatedBy: mongoSpec?._id })
        })
      } else {
        // Create new
        res = await fetch(url + '/api/skinprofiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...skinProfileForm,
            skinConcerns: typeof skinProfileForm.skinConcerns === 'string'
              ? skinProfileForm.skinConcerns.split(',').map((s: string) => s.trim()).filter(Boolean)
              : skinProfileForm.skinConcerns,
            consultationId: editSkinProfile.consultationId,
            name: editSkinProfile.name,
            phone: editSkinProfile.phone || '',
            specialistId: mongoSpec?._id,
            source: 'online',
            createdAt: new Date(),
          })
        })
      }
      if (res.ok) {
        toast.success(editSkinProfile._id ? 'Skin profile updated! \u2705' : 'Skin profile created! \u2705')
        setEditSkinProfile(null)
        loadAll()
      } else toast.error('Failed to save')
    } catch { toast.error('Error') }
    setSkinProfileLoading(false)
  }

  function generatePDF() {
    const consNum = 'OFF' + Date.now().toString().slice(-10)
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Skin Profile - ${offlineCustomer.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 32px 16px; border-bottom: 2px solid #D4A853; }
  .logo { font-size: 22px; font-weight: 900; color: #1a1a2e; letter-spacing: 1px; }
  .logo span { color: #D4A853; }
  .logo-sub { font-size: 10px; color: #999; letter-spacing: 2px; margin-top: 3px; }
  .header-info { text-align: right; font-size: 12px; color: #555; line-height: 1.8; }
  .hero { background: linear-gradient(135deg, #1a1a2e, #2d1b4e); padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
  .hero-avatar { width: 50px; height: 50px; border-radius: 14px; background: #D4A853; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; color: #08090C; flex-shrink: 0; }
  .hero-name { font-size: 20px; font-weight: 800; color: #fff; }
  .hero-sub { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 3px; }
  .tags { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .tag { background: rgba(212,168,83,0.2); color: #D4A853; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .section { padding: 20px 32px 0; }
  .section-title { font-size: 10px; font-weight: 700; color: #D4A853; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
  .grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
  .card { background: #f8f8f8; border-radius: 8px; padding: 12px 14px; }
  .card-label { font-size: 9px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
  .card-value { font-size: 13px; font-weight: 700; color: #1a1a2e; }
  .text-box { background: #fffef5; border: 1px solid #f0e8c8; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; font-size: 13px; color: #444; line-height: 1.6; }
  .product-item { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; align-items: flex-start; }
  .product-img { width: 52px; height: 52px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #eee; }
  .product-name { font-size: 13px; font-weight: 700; color: #1a1a2e; margin-bottom: 3px; }
  .product-price { font-size: 13px; font-weight: 700; color: #D4A853; }
  .spec-section { background: #fffef5; margin: 20px 32px 0; border-radius: 10px; padding: 18px 20px; }
  .footer { text-align: center; padding: 20px; font-size: 10px; color: #aaa; border-top: 1px solid #eee; margin-top: 24px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <div><div class="logo">RABT <span>NATURALS</span></div><div class="logo-sub">PERSONALIZED SKIN CARE REPORT</div></div>
  <div class="header-info">
    <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div><strong>Consultation:</strong> ${consNum}</div>
    <div><strong>Specialist:</strong> ${mongoSpec?.name || 'Specialist'}</div>
  </div>
</div>
<div class="hero">
  <div class="hero-avatar">${offlineCustomer.name.charAt(0).toUpperCase()}</div>
  <div>
    <div class="hero-name">${offlineCustomer.name}</div>
    <div class="hero-sub">${offlineCustomer.phone} &middot; ${new Date().toLocaleDateString('en-IN')}</div>
    <div class="tags">${(aiAnalysis?.skinConcerns || [skinConcern]).filter(Boolean).map((c: string) => `<span class="tag">${c}</span>`).join('')}</div>
  </div>
</div>
<div class="section">
  <div class="section-title">Skin Analysis</div>
  <div class="grid3">
    <div class="card"><div class="card-label">Skin Type</div><div class="card-value">${aiAnalysis?.skinType || 'N/A'}</div></div>
    <div class="card"><div class="card-label">Skin Goals</div><div class="card-value">${specNotes.skinGoal || aiAnalysis?.skinCondition || 'N/A'}</div></div>
    <div class="card"><div class="card-label">Sensitivity</div><div class="card-value">${specNotes.skinSensitivity || 'Medium'}</div></div>
  </div>
</div>
<div class="section"><div class="section-title">Skin Concerns</div><div class="text-box">${(aiAnalysis?.skinConcerns || []).join(', ') || skinConcern || 'Not specified'}</div></div>
${cart.length > 0 ? `<div class="section"><div class="section-title">Recommended Products (${cart.length})</div>${cart.map((item: any) => `<div class="product-item">${item.image ? `<img class="product-img" src="${item.image}" alt="${item.name}">` : '<div class="product-img"></div>'}<div><div class="product-name">${item.name}</div><div class="product-price">Rs.${item.price}</div></div></div>`).join('')}</div>` : ''}
<div class="spec-section">
  <div class="spec-title">Specialist Recommendations</div>
  ${specNotes.primaryConcern ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#D4A853;margin-bottom:4px">Primary Concern</div><div style="background:white;border-radius:6px;padding:8px 12px;font-size:12px;color:#444">${specNotes.primaryConcern}</div></div>` : ''}
  ${specNotes.dietIntake ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#D4A853;margin-bottom:4px">Diet Intake</div><div style="background:white;border-radius:6px;padding:8px 12px;font-size:12px;color:#444">${specNotes.dietIntake}</div></div>` : ''}
  ${specNotes.additionalNotes ? `<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#D4A853;margin-bottom:4px">Additional Notes</div><div style="background:white;border-radius:6px;padding:8px 12px;font-size:12px;color:#444">${specNotes.additionalNotes}</div></div>` : ''}
</div>
<div class="footer">Rabt Naturals &middot; Personalized Skincare &middot; Generated on ${new Date().toLocaleString('en-IN')}</div>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800) }
  }

  async function createOfflineOrder() {
    if (!offlineCustomer.name || !offlineCustomer.phone) { toast.error('Name aur phone required'); return }
    if (cart.length === 0) { toast.error('Cart mein product add karo'); return }
    setPosLoading(true)
    try {
      const totals = getCartTotal()
      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
      if (!url) { toast.error('MongoDB URL not found'); setPosLoading(false); return }
      const productNames = cart.map((i: any) => i.name).join(', ')
      if (aiAnalysis) {
        await fetch(url + '/api/skinprofiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: offlineCustomer.name, phone: offlineCustomer.phone, age: skinAge,
            skinType: aiAnalysis.skinType, skinTone: aiAnalysis.skinTone,
            skinConcerns: aiAnalysis.skinConcerns, skinCondition: aiAnalysis.skinCondition,
            images: skinImages, specialistId: mongoSpec?._id, source: 'offline',
            recommendedProducts: cart.map(i => ({ name: i.name, productId: i._id })),
          })
        })
      }
      const orderPayload = {
        customerName: offlineCustomer.name, customerPhone: offlineCustomer.phone, customerEmail: offlineCustomer.email,
        address: offlineCustomer.address, city: offlineCustomer.city, state: offlineCustomer.state, pincode: offlineCustomer.pincode,
        products: productNames,
        items: cart.map((i: any) => ({ name: i.name, image: i.image || '', category: i.category || '', variant: i.variant || {}, qty: i.qty, price: Number(i.price) })),
        amount: totals.total, subtotal: totals.subtotal, couponDiscount: totals.discount,
        couponCode: couponApplied?.code || '', paymentMethod, status: 'new',
        source: 'specialist_offline', specialistId: mongoSpec?._id?.toString() || mongoSpec?._id || '', shippingCharges: 0, type: 'one_time',
      }
      let mongoOrderId = ''
      const orderRes = await fetch(url + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) })
      if (orderRes.ok) {
        const orderData = await orderRes.json()
        mongoOrderId = orderData.orderId?.toString() || ''
      } else {
        const errData = await orderRes.json()
        toast.error('Order error: ' + (errData.message || errData.error || 'Unknown'))
        setPosLoading(false); return
      }
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('hq_orders').insert({
        customer_name: offlineCustomer.name, customer_phone: offlineCustomer.phone, customer_email: offlineCustomer.email,
        product: productNames, amount: totals.total, status: 'New',
        payment_method: paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        notes: 'Specialist offline order by ' + (mongoSpec?.name || ''),
        mongo_id: mongoOrderId, source: 'specialist_offline', created_by: user?.id,
      })
      toast.success('Order created! 12% commission pending. \uD83C\uDF89')
      generatePDF()
      setShowPOS(false); resetPOS(); loadAll()
    } catch { toast.error('Error') }
    setPosLoading(false)
  }

  function resetPOS() {
    setCart([]); setSkinImages([]); setAiAnalysis(null); setSkinConcern(''); setSkinAge('')
    setOfflineCustomer({ name: '', phone: '', email: '', city: '', state: '', pincode: '', address: '' })
    setCouponCode(''); setCouponApplied(null); setPosStep('customer'); setPaymentMethod('prepaid')
    setSpecNotes({ primaryConcern: '', secondaryConcern: '', skinSensitivity: 'medium', dietIntake: '', dietAvoid: '', lifestyle: '', waterIntake: '', skinGoal: '', additionalNotes: '' })
  }

  async function requestPayout() {
    if (!payoutForm.amount || !payoutForm.upiId) { toast.error('Amount aur UPI ID required'); return }
    if (Number(payoutForm.amount) > totalEarnings) { toast.error('Amount earnings se zyada nahi ho sakta'); return }
    setPayoutLoading(true)
    try {
      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
      if (!url) { toast.error('MongoDB URL not found'); setPayoutLoading(false); return }
      const res = await fetch(url + '/api/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialistId: mongoSpec?._id, amount: Number(payoutForm.amount), paymentMethod: payoutForm.method, upiId: payoutForm.upiId, upiName: payoutForm.upiName })
      })
      if (res.ok) { toast.success('Payout request sent! Manager approve karega.'); setPayoutModal(false); setPayoutForm({ amount: '', upiId: '', upiName: '', method: 'upi' }) }
      else toast.error('Payout request failed')
    } catch { toast.error('Error') }
    setPayoutLoading(false)
  }

  const totals = getCartTotal()
  const inp: any = { width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 10px', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'Outfit', outline: 'none' }

  if (!mounted) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>
            Specialist <span style={{ color: 'var(--gold)' }}>Dashboard</span>
          </h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {mongoSpec?.name || profile?.name || 'Specialist'} &middot; {consultations.length} consultations &middot; Rs.{totalEarnings.toLocaleString('en-IN')} earned
          </p>
        </div>
        <button onClick={() => setShowPOS(true)} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
          + Offline Order
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Patients', value: allMyPatients.length, color: 'var(--blue)' },
          { label: 'Online', value: allMyPatients.filter(p => p.source === 'online').length, color: 'var(--teal)' },
          { label: 'Offline', value: allMyPatients.filter(p => p.source === 'offline').length, color: 'var(--orange)' },
          { label: 'Total Revenue', value: 'Rs.' + totalEarnings.toLocaleString('en-IN'), color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'consultations', label: 'Consultations' },
          { id: 'crm', label: 'My Patients' },
          { id: 'skinprofiles', label: 'Skin Profiles' },
          { id: 'earnings', label: 'Earnings' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', background: tab === t.id ? 'var(--gL)' : 'rgba(255,255,255,0.05)', color: tab === t.id ? 'var(--gold)' : 'var(--mu)', border: '1px solid ' + (tab === t.id ? 'rgba(212,168,83,0.3)' : 'var(--b1)') }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {unassignedCons.length > 0 && (
                <div style={{ gridColumn: '1/-1', background: 'var(--orL)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(251,146,60,0.3)' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, color: 'var(--orange)', marginBottom: 12 }}>
                    \uD83D\uDD14 New Consultation Requests ({unassignedCons.length}) &mdash; Website se aaye hain
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {unassignedCons.slice(0, 6).map((c: any, i: number) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{c.fullName || c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu2)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || c.concern || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 10 }}>
                          {c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : '-'} {c.scheduledTime}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => acceptConsultation(c)}
                            style={{ flex: 1, padding: '6px', background: 'var(--green)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                            Accept
                          </button>
                          <button onClick={() => rejectConsultation(c)}
                            style={{ flex: 1, padding: '6px', background: 'var(--rdL)', border: 'none', borderRadius: 6, color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Pending Consultations</div>
                {consultations.filter(c => c.status === 'pending' || c.status === 'accepted').slice(0, 5).map((c, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.fullName || c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{c.description || c.concern} &middot; {c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : '-'} {c.scheduledTime}</div>
                    </div>
                    <button onClick={() => { setTab('consultations'); setSelectedCons(c) }} style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit' }}>View</button>
                  </div>
                ))}
                {consultations.filter(c => c.status === 'pending' || c.status === 'accepted').length === 0 && <div style={{ textAlign: 'center', color: 'var(--mu)', padding: 20, fontSize: 12 }}>No pending consultations</div>}
              </div>

              <div className="card">
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Earnings Breakdown</div>
                {[
                  { label: 'Consultation Fee', sub: completedCons + ' \u00D7 Rs.30', value: consultationEarnings, color: 'var(--teal)' },
                  { label: 'Commission Earned', sub: '12% of delivered orders', value: commissionEarned, color: 'var(--green)' },
                  { label: 'Pending Commission', sub: 'Orders not yet delivered', value: pendingCommission, color: 'var(--orange)' },
                ].map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--b1)' }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{e.sub}</div>
                    </div>
                    <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: e.color }}>Rs.{e.value.toLocaleString('en-IN')}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>Total Earned</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>Rs.{totalEarnings.toLocaleString('en-IN')}</div>
                </div>
                <button onClick={() => setPayoutModal(true)} style={{ width: '100%', marginTop: 14, padding: '10px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Request Payout
                </button>
              </div>

              <div className="card" style={{ gridColumn: '1/-1' }}>
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Consultation Status Overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
                  {[
                    { label: 'Pending', count: consultations.filter(c => c.status === 'pending').length, color: 'var(--orange)', bg: 'var(--orL)' },
                    { label: 'Accepted', count: consultations.filter(c => c.status === 'accepted').length, color: 'var(--teal)', bg: 'rgba(20,184,166,0.15)' },
                    { label: 'Scheduled', count: consultations.filter(c => c.status === 'scheduled').length, color: 'var(--blue)', bg: 'var(--blL)' },
                    { label: 'Completed', count: consultations.filter(c => c.status === 'completed').length, color: 'var(--green)', bg: 'var(--grL)' },
                    { label: 'Cancelled', count: consultations.filter(c => c.status === 'cancelled').length, color: 'var(--red)', bg: 'var(--rdL)' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: s.bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ gridColumn: '1/-1', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }}>My Patient Orders &mdash; Commission Track</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Patient', 'Products', 'Amount', 'Status', 'Source', 'Commission'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {myPatientOrders.slice(0, 8).map((o, i) => {
                      const status = (o.orderStatus || o.status || '').toLowerCase()
                      const isDelivered = status === 'delivered'
                      const isCancelled = ['cancelled', 'canceled'].includes(status)
                      return (
                        <tr key={i} style={{ opacity: isCancelled ? 0.5 : 1 }}>
                          <td style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 500 }}>{o.customerName || o.customer_name || '-'}</td>
                          <td style={{ padding: '9px 12px', fontSize: 11.5, color: 'var(--mu2)', maxWidth: 180 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.products || o.product || o.items?.[0]?.name || '-'}</div>
                          </td>
                          <td style={{ padding: '9px 12px', fontFamily: 'DM Mono', fontWeight: 700 }}>Rs.{o.amount}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: isDelivered ? 'var(--grL)' : isCancelled ? 'var(--rdL)' : 'var(--gL)', color: isDelivered ? 'var(--green)' : isCancelled ? 'var(--red)' : 'var(--gold)', textTransform: 'capitalize' }}>{status}</span>
                          </td>
                          <td style={{ padding: '9px 12px', fontSize: 11 }}>{(() => { const src = (o.source || '').toLowerCase(); if (src === 'specialist_offline') return 'Offline'; if (src === 'partner') return 'Partner'; return 'Website' })()}</td>
                          <td style={{ padding: '9px 12px', fontFamily: 'DM Mono', fontWeight: 700, color: isDelivered ? 'var(--green)' : isCancelled ? 'var(--mu)' : 'var(--orange)', fontSize: 12 }}>
                            {isCancelled ? '-' : (isDelivered ? '+' : 'Pending ') + 'Rs.' + Math.round(o.amount * 0.12)}
                          </td>
                        </tr>
                      )
                    })}
                    {myPatientOrders.length === 0 && <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--mu)', fontSize: 12 }}>No patient orders yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONSULTATIONS TAB */}
          {tab === 'consultations' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedCons ? '1fr 380px' : '1fr', gap: 14 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Patient', 'Concern', 'Date/Time', 'Status', 'Images', 'Action'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {consultations.map((c, i) => (
                      <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.fullName || c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--mu)' }}>Age {c.age || '-'}</div>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--mu2)', maxWidth: 150 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || c.concern || '-'}</div>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 11, color: 'var(--mu)', whiteSpace: 'nowrap' }}>
                          {c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : '-'} {c.scheduledTime}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: STATUS_BG[c.status] || 'rgba(255,255,255,0.05)', color: STATUS_COLORS[c.status] || 'var(--mu)', textTransform: 'capitalize' }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          {c.images?.length > 0 ? (
                            <div style={{ display: 'flex', gap: 3 }}>
                              {c.images.slice(0, 2).map((img: any, ii: number) => (
                                <img key={ii} src={img.url} alt="" style={{ width: 26, height: 26, borderRadius: 4, objectFit: 'cover' }} />
                              ))}
                              {c.images.length > 2 && <span style={{ fontSize: 10, color: 'var(--mu)', alignSelf: 'center' }}>+{c.images.length - 2}</span>}
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <button onClick={() => setSelectedCons(selectedCons?._id === c._id ? null : c)} style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit' }}>View</button>
                        </td>
                      </tr>
                    ))}
                    {consultations.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>No consultations assigned yet</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* âœ… Detail Panel with new buttons */}
              {selectedCons && (
                <div style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 14, padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>{selectedCons.fullName || selectedCons.name}</div>
                    <button onClick={() => setSelectedCons(null)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 18 }}>&#x2715;</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { l: 'Age', v: selectedCons.age || '-' },
                      { l: 'Status', v: selectedCons.status },
                      { l: 'Date', v: selectedCons.scheduledDate ? new Date(selectedCons.scheduledDate).toLocaleDateString('en-IN') : '-' },
                      { l: 'Time', v: selectedCons.scheduledTime || '-' },
                      { l: 'Consultation #', v: selectedCons.consultationNumber || selectedCons._id?.slice(-8) },
                      { l: 'Phone', v: (() => { const u = getUserForCons(selectedCons); return selectedCons.phone || u?.phoneNumber || '-' })() },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'var(--s2)', borderRadius: 8, padding: '9px 11px' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 3 }}>{item.l}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  {(selectedCons.description || selectedCons.concern) && (
                    <div style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 5 }}>Concern</div>
                      <div style={{ fontSize: 12.5, color: 'var(--mu2)', lineHeight: 1.6 }}>{selectedCons.description || selectedCons.concern}</div>
                    </div>
                  )}

                  {selectedCons.images?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 8 }}>Skin Images</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {selectedCons.images.map((img: any, i: number) => (
                          <img key={i} src={img.url} alt="skin" style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--b1)', cursor: 'pointer' }} onClick={() => window.open(img.url, '_blank')} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                    {/* Accept / Reject â€” only for pending */}
                    {selectedCons.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ flex: 1, padding: '9px', background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: 'var(--green)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}
                          onClick={() => acceptConsultation(selectedCons)}>
                          Accept &#x2713;
                        </button>
                        <button style={{ flex: 1, padding: '9px', background: 'var(--rdL)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}
                          onClick={() => rejectConsultation(selectedCons)}>
                          Reject &#x2715;
                        </button>
                      </div>
                    )}

                    {/* âœ… START CONSULTATION â€” accepted or scheduled */}
                    {(selectedCons.status === 'accepted' || selectedCons.status === 'scheduled') && (
                      <button
                        onClick={() => {
                          const session = getSessionForCons(selectedCons)
                          if (session?.sessionUrl) {
                            window.open('/video-call?sessionId=' + session._id + '&specialistUserId=' + (mongoSpec?.user?.toString() || '') + '&specialistName=' + encodeURIComponent(mongoSpec?.name || 'Specialist') + '&consultationId=' + selectedCons._id, '_blank')
                          } else {
                            toast.error('Session URL nahi mila. Pehle consultation accept karo.')
                          }
                        }}
                        style={{ padding: '9px', background: 'linear-gradient(135deg,#14B8A6,#0F6E56)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        Start Consultation
                      </button>
                    )}

                    {/* âœ… UPDATE / CREATE SKIN PROFILE â€” accepted, scheduled, or completed */}
                    {(selectedCons.status === 'accepted' || selectedCons.status === 'scheduled' || selectedCons.status === 'completed') && (
                      <button
                        onClick={() => {
                          const sp = getSkinProfileForCons(selectedCons)
                          setSelectedSkinProfile(sp || { name: selectedCons.fullName || selectedCons.name, consultation: selectedCons._id })
                          setShowSkinProfileModal(true)
                        }}
                        style={{ padding: '9px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: 'var(--blue)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        {getSkinProfileForCons(selectedCons) ? 'Update Skin Profile' : 'Create Skin Profile'}
                      </button>
                    )}

                    {/* Mark as Completed */}
                    {(selectedCons.status === 'accepted' || selectedCons.status === 'scheduled') && (
                      <button onClick={() => completeConsultation(selectedCons)}
                        style={{ padding: '9px', background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: 'var(--green)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        Mark as Completed &#x2713;
                      </button>
                    )}

                    <button onClick={() => setRescheduleModal(selectedCons)}
                      style={{ padding: '9px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 8, color: 'var(--gold)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                      Reschedule &#x1F4C5;
                    </button>

                    {selectedCons.status !== 'completed' && selectedCons.status !== 'cancelled' && (
                      <button onClick={() => cancelConsultation(selectedCons)}
                        style={{ padding: '9px', background: 'var(--rdL)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--red)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        Cancel Consultation
                      </button>
                    )}

                    {(selectedCons.phone || getUserForCons(selectedCons)?.phoneNumber) && (
                      <a href={`https://wa.me/${(selectedCons.phone || getUserForCons(selectedCons)?.phoneNumber || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hi ' + (selectedCons.fullName || selectedCons.name) + '! Rabt Naturals se consultation reminder. Apni appointment confirm karein. \uD83C\uDF3F')}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ padding: '9px', background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, color: 'var(--green)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                        WhatsApp Reminder
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CRM / MY PATIENTS */}
          {tab === 'crm' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Patients', value: allMyPatients.length, color: 'var(--blue)' },
                  { label: 'Online', value: allMyPatients.filter(p => p.source === 'online').length, color: 'var(--teal)' },
                  { label: 'Offline', value: allMyPatients.filter(p => p.source === 'offline').length, color: 'var(--orange)' },
                  { label: 'Total Revenue', value: 'Rs.' + allMyPatients.reduce((s, p) => s + p.spent, 0).toLocaleString('en-IN'), color: 'var(--gold)' },
                ].map((s, i) => (
                  <div key={i} className="card">
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search by name or phone..." style={{ ...inp, flex: 1, minWidth: 200 }} />
                {(['all', 'online', 'offline'] as const).map(f => (
                  <button key={f} onClick={() => setPatientFilter(f)}
                    style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', background: patientFilter === f ? 'var(--gL)' : 'rgba(255,255,255,0.05)', color: patientFilter === f ? 'var(--gold)' : 'var(--mu)', border: '1px solid ' + (patientFilter === f ? 'rgba(212,168,83,0.3)' : 'var(--b1)') }}>
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Patient', 'Skin Type / Concerns', 'Consults', 'Orders', 'Spent', 'Source', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p, i) => (
                      <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 14, fontWeight: 800, color: '#08090C', flexShrink: 0 }}>
                              {(p.name || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{p.phone || p.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px', maxWidth: 160 }}>
                          {p.skinType ? (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'capitalize', marginBottom: 4 }}>{p.skinType}</div>
                              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                {(p.skinConcerns || []).slice(0, 2).map((c: string, ci: number) => (
                                  <span key={ci} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--orL)', color: 'var(--orange)', fontWeight: 600 }}>{c}</span>
                                ))}
                              </div>
                            </div>
                          ) : <span style={{ fontSize: 11, color: 'var(--mu)' }}>&mdash;</span>}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: 'var(--teal)' }}>{p.consults}</td>
                        <td style={{ padding: '11px 12px', fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: 'var(--blue)' }}>{p.orders}</td>
                        <td style={{ padding: '11px 12px', fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                          {p.spent > 0 ? 'Rs.' + p.spent.toLocaleString('en-IN') : <span style={{ color: 'var(--mu)' }}>Rs.0</span>}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: p.source === 'offline' ? 'var(--orL)' : 'var(--blL)', color: p.source === 'offline' ? 'var(--orange)' : 'var(--blue)' }}>
                            {p.source === 'offline' ? 'Offline' : 'Online'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {p.phone && (
                              <a href={'https://wa.me/' + p.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi ' + p.name + '! \uD83C\uDF3F Rabt Naturals ki taraf se aapko yaad dila rahe hain.')}
                                target="_blank" rel="noopener noreferrer"
                                style={{ padding: '5px 10px', background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, color: 'var(--green)', fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                WA
                              </a>
                            )}
                            {p.lastConsultation && (
                              <button onClick={() => { setTab('consultations'); setSelectedCons(p.lastConsultation) }}
                                style={{ padding: '5px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                                View
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPatients.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>No patients found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SKIN PROFILES */}
          {tab === 'skinprofiles' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>My Patient Skin Profiles</div>
                <span style={{ fontSize: 12, color: 'var(--mu)' }}>{mySkinProfiles.length} profiles</span>
              </div>
              {mySkinProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)', fontSize: 13 }}>No skin profiles yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {mySkinProfiles.map((p, i) => (
                    <div key={i} className="card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: '#08090C', flexShrink: 0 }}>
                          {(p.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Patient'}</div>
                          <div style={{ fontSize: 11, color: 'var(--mu)' }}>{p.phone || '-'}</div>
                        </div>
                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: p.source === 'offline' ? 'var(--orL)' : 'var(--blL)', color: p.source === 'offline' ? 'var(--orange)' : 'var(--blue)' }}>
                          {p.source === 'offline' ? 'Offline' : 'Online'}
                        </span>
                      </div>
                      {p.skinType && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase' }}>Skin Type: </span>
                          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, textTransform: 'capitalize' }}>{p.skinType}</span>
                        </div>
                      )}
                      {p.skinConcerns?.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                          {p.skinConcerns.slice(0, 3).map((c: string, ci: number) => (
                            <span key={ci} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--orL)', color: 'var(--orange)', fontWeight: 600 }}>{c}</span>
                          ))}
                        </div>
                      )}
                      {p.images?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                          {p.images.slice(0, 3).map((img: string, ii: number) => (
                            <img key={ii} src={img} alt="skin" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(img, '_blank')} />
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--b1)', paddingTop: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 10.5, color: 'var(--mu)' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <button onClick={() => { setEditSkinProfile(p); setSkinProfileForm({ skinType: p.skinType || '', skinConcerns: Array.isArray(p.skinConcerns) ? p.skinConcerns.join(', ') : p.skinConcerns || '', notes: p.notes || '' }) }}
                          style={{ padding: '4px 10px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EARNINGS */}
          {tab === 'earnings' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Total Earned', value: 'Rs.' + totalEarnings.toLocaleString('en-IN'), sub: 'Consultation + Commission', color: 'var(--gold)', big: true },
                  { label: 'Consultation Fee', value: 'Rs.' + consultationEarnings, sub: completedCons + ' \u00D7 Rs.30', color: 'var(--teal)' },
                  { label: 'Commission Earned', value: 'Rs.' + commissionEarned, sub: 'From delivered orders', color: 'var(--green)' },
                  { label: 'Pending Commission', value: 'Rs.' + pendingCommission, sub: 'Orders in transit', color: 'var(--orange)' },
                ].map((s: any, i) => (
                  <div key={i} className="card" style={{ border: s.big ? '1px solid var(--gold)' : undefined }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontFamily: 'Syne', fontSize: s.big ? 28 : 22, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }}>Payout History</div>
                  <button onClick={() => setPayoutModal(true)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>
                    + Request Payout
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Payout #', 'Amount', 'UPI ID', 'Requested', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {payouts.filter((p: any) => p.specialistId?.toString() === mongoSpec?._id?.toString()).map((p: any, i: number) => (
                      <tr key={i}>
                        <td style={{ padding: '9px 12px', fontFamily: 'DM Mono', fontSize: 11, color: 'var(--mu)' }}>{p.payoutNumber || p._id?.slice(-8)}</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>Rs.{p.amount}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--mu2)' }}>{p.upiId || '-'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--mu)' }}>{p.requestedAt ? new Date(p.requestedAt).toLocaleDateString('en-IN') : '-'}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: p.status === 'completed' ? 'var(--grL)' : p.status === 'rejected' ? 'var(--rdL)' : 'var(--orL)', color: p.status === 'completed' ? 'var(--green)' : p.status === 'rejected' ? 'var(--red)' : 'var(--orange)' }}>
                            {p.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payouts.filter((p: any) => p.specialistId?.toString() === mongoSpec?._id?.toString()).length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--mu)', fontSize: 12 }}>No payout requests yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* OFFLINE POS MODAL */}
      {showPOS && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, width: '96vw', maxWidth: 1060, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800 }}>Offline Order &mdash; AI Skin Analysis</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[
                    { id: 'customer', label: '1. Customer' }, { id: 'skin', label: '2. Skin Photos' },
                    { id: 'analysis', label: '3. AI Analysis' }, { id: 'notes', label: '4. Notes' },
                    { id: 'products', label: '5. Products' }, { id: 'payment', label: '6. Payment' },
                  ].map((step, i) => (
                    <span key={step.id} style={{ fontSize: 11, fontWeight: 700, color: posStep === step.id ? 'var(--gold)' : 'var(--mu)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: posStep === step.id ? 'var(--gold)' : 'var(--s2)', color: posStep === step.id ? '#08090C' : 'var(--mu)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{i + 1}</span>
                      {step.label.split('. ')[1]}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => { setShowPOS(false); resetPOS() }} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 20 }}>&#x2715;</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {posStep === 'customer' && (
                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Customer Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { k: 'name', l: 'Name*', p: 'Priya Sharma' }, { k: 'phone', l: 'Phone*', p: '+91 9876543210' },
                      { k: 'email', l: 'Email', p: 'priya@email.com' }, { k: 'address', l: 'Address', p: 'House No, Street' },
                      { k: 'city', l: 'City', p: 'Mumbai' }, { k: 'state', l: 'State', p: 'Maharashtra' },
                      { k: 'pincode', l: 'Pincode', p: '400001' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>{f.l}</label>
                        <input value={(offlineCustomer as any)[f.k]} onChange={e => setOfflineCustomer(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={inp} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { if (!offlineCustomer.name || !offlineCustomer.phone) { toast.error('Name aur phone required'); return } setPosStep('skin') }}
                    style={{ width: '100%', marginTop: 20, padding: '12px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Syne' }}>
                    Next: Skin Photos &#x2192;
                  </button>
                </div>
              )}
              {posStep === 'skin' && (
                <div style={{ maxWidth: 540, margin: '0 auto' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Skin Analysis</div>
                  <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 20 }}>Customer ki skin photos lo &mdash; AI analyze karega aur Rabt products suggest karega</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Age</label>
                      <input value={skinAge} onChange={e => setSkinAge(e.target.value)} placeholder="25" style={inp} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Main Concern</label>
                      <input value={skinConcern} onChange={e => setSkinConcern(e.target.value)} placeholder="Acne, pigmentation, dryness..." style={inp} />
                    </div>
                  </div>
                  <div style={{ border: '2px dashed var(--b2)', borderRadius: 12, padding: 30, textAlign: 'center', marginBottom: 16, cursor: 'pointer', background: 'var(--s2)' }}
                    onClick={() => fileInputRef.current?.click()}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>\uD83C\uDF3F</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Click to upload skin photos</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>Max 4 photos &mdash; Front, sides, close-up</div>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </div>
                  {skinImages.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      {skinImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt="skin" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--b1)' }} />
                          <button onClick={() => setSkinImages(skinImages.filter((_, ii) => ii !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10 }}>&#x2715;</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setPosStep('customer')} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--mu2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>&#x2190; Back</button>
                    <button onClick={analyzeSkin} disabled={analyzing || skinImages.length === 0}
                      style={{ flex: 2, padding: '11px', background: skinImages.length > 0 ? 'linear-gradient(135deg,#D4A853,#B87C30)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: skinImages.length > 0 ? '#08090C' : 'var(--mu)', fontWeight: 800, fontSize: 13, cursor: skinImages.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Syne' }}>
                      {analyzing ? 'Analyzing...' : 'Analyze Skin with AI \u2728'}
                    </button>
                    <button onClick={() => setPosStep('notes')} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--mu2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>Skip &#x2192;</button>
                  </div>
                </div>
              )}
              {posStep === 'analysis' && aiAnalysis && (
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 20 }}>AI Skin Analysis Results</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                    {[{ l: 'Skin Type', v: aiAnalysis.skinType }, { l: 'Skin Tone', v: aiAnalysis.skinTone }, { l: 'Condition', v: aiAnalysis.skinCondition }].map((item, i) => (
                      <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 6 }}>{item.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', textTransform: 'capitalize' }}>{item.v || '-'}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setPosStep('skin')} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--mu2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>&#x2190; Back</button>
                    <button onClick={() => setPosStep('notes')} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Syne' }}>Next: Add Notes &#x2192;</button>
                  </div>
                </div>
              )}
              {posStep === 'notes' && (
                <div style={{ maxWidth: 520, margin: '0 auto' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Specialist Notes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { k: 'primaryConcern', l: 'Primary Skin Concern', p: 'e.g. Acne, Pigmentation' },
                      { k: 'secondaryConcern', l: 'Secondary Concern', p: 'e.g. Dryness, Sensitivity' },
                      { k: 'dietIntake', l: 'Diet Intake', p: 'What does patient eat?' },
                      { k: 'dietAvoid', l: 'Diet to Avoid', p: 'What should patient avoid?' },
                      { k: 'lifestyle', l: 'Lifestyle / Stress', p: 'Sleep, stress, exercise...' },
                      { k: 'waterIntake', l: 'Water Intake', p: 'e.g. 2 liters/day' },
                      { k: 'skinGoal', l: 'Skin Goal', p: 'e.g. Clear skin, Glow' },
                      { k: 'additionalNotes', l: 'Additional Notes', p: 'Any other observations...' },
                    ].map(f => (
                      <div key={f.k}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{f.l}</label>
                        <input value={(specNotes as any)[f.k]} onChange={e => setSpecNotes(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={inp} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Skin Sensitivity</label>
                      <select value={specNotes.skinSensitivity} onChange={e => setSpecNotes(p => ({ ...p, skinSensitivity: e.target.value }))} style={inp}>
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={() => setPosStep(aiAnalysis ? 'analysis' : 'skin')} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--mu2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>&#x2190; Back</button>
                    <button onClick={() => setPosStep('products')} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'Syne' }}>Next: Products &#x2192;</button>
                  </div>
                </div>
              )}
              {posStep === 'products' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, height: '100%' }}>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Select Products ({products.length})</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {products.map((p: any, i: number) => {
                        const img = getProductImg(p)
                        const price = getProductPrice(p)
                        return (
                          <div key={i} style={{ background: 'var(--s2)', borderRadius: 10, padding: 10, border: '1px solid var(--b1)' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              {img ? <img src={img} alt={p.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, borderRadius: 6, background: 'var(--b1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>\uD83C\uDF3F</div>}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>Rs.{price}</div>
                              </div>
                            </div>
                            {p.variants && p.variants.length > 1 ? (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {p.variants.map((v: any, vi: number) => (
                                  <button key={vi} onClick={() => addToCart(p, v)} style={{ padding: '3px 7px', background: 'var(--gL)', border: 'none', borderRadius: 5, color: 'var(--gold)', fontSize: 10, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>{v.size} Rs.{getProductPrice(p, v)}</button>
                                ))}
                              </div>
                            ) : (
                              <button onClick={() => addToCart(p, p.variants?.[0])} style={{ width: '100%', padding: '5px', background: 'var(--gL)', border: 'none', borderRadius: 6, color: 'var(--gold)', fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>+ Add</button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }}>Cart ({cart.length})</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {cart.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 0', borderBottom: '1px solid var(--b1)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--mu)' }}>Rs.{item.price}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <button onClick={() => setCart(cart.map((c: any, ci: number) => ci === i ? { ...c, qty: Math.max(1, c.qty - 1) } : c))} style={{ width: 20, height: 20, background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', color: 'var(--tx)', fontSize: 13 }}>-</button>
                            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                            <button onClick={() => setCart(cart.map((c: any, ci: number) => ci === i ? { ...c, qty: c.qty + 1 } : c))} style={{ width: 20, height: 20, background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 4, cursor: 'pointer', color: 'var(--tx)', fontSize: 13 }}>+</button>
                            <button onClick={() => setCart(cart.filter((_: any, ci: number) => ci !== i))} style={{ width: 20, height: 20, background: 'var(--rdL)', border: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--red)', fontSize: 11 }}>&#x2715;</button>
                          </div>
                          <div style={{ fontFamily: 'DM Mono', fontSize: 12, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>Rs.{(Number(item.price) * Number(item.qty)).toFixed(0)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="COUPON CODE" style={{ ...inp, flex: 1 }} />
                      <button onClick={applyCoupon} style={{ padding: '8px 12px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 8, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>Apply</button>
                    </div>
                    {cart.length > 0 && (
                      <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--mu)', marginBottom: 4 }}><span>Subtotal</span><span>Rs.{totals.subtotal}</span></div>
                        {totals.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--green)', marginBottom: 4 }}><span>Discount</span><span>-Rs.{totals.discount}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, fontFamily: 'Syne', borderTop: '1px solid var(--b1)', paddingTop: 6, marginTop: 4 }}><span>Total</span><span style={{ color: 'var(--gold)' }}>Rs.{totals.total}</span></div>
                        <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 6, textAlign: 'center' }}>Your 12% commission: Rs.{Math.round(totals.total * 0.12)}</div>
                      </div>
                    )}
                    <button onClick={() => { if (cart.length === 0) { toast.error('Cart empty'); return } setPosStep('payment') }} disabled={cart.length === 0}
                      style={{ padding: '11px', background: cart.length > 0 ? 'linear-gradient(135deg,#D4A853,#B87C30)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: cart.length > 0 ? '#08090C' : 'var(--mu)', fontWeight: 800, fontSize: 13, cursor: cart.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Syne' }}>
                      Next: Payment &#x2192;
                    </button>
                  </div>
                </div>
              )}
              {posStep === 'payment' && (
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Payment</div>
                  <div style={{ background: 'var(--s2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 10 }}>Order Summary &mdash; {offlineCustomer.name}</div>
                    {cart.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
                        <span>{item.name} &times; {item.qty}</span>
                        <span style={{ fontFamily: 'DM Mono', fontWeight: 700 }}>Rs.{(Number(item.price) * item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, fontFamily: 'Syne', borderTop: '1px solid var(--b1)', paddingTop: 10, marginTop: 8 }}>
                      <span>Total</span><span style={{ color: 'var(--gold)' }}>Rs.{totals.total}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 10 }}>Payment Method</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[{ id: 'prepaid', label: 'Prepaid', sub: 'UPI / Online', icon: '\uD83D\uDCB3' }, { id: 'cod', label: 'Cash on Delivery', sub: 'Pay later', icon: '\uD83D\uDCB5' }].map(pm => (
                        <div key={pm.id} onClick={() => setPaymentMethod(pm.id as any)}
                          style={{ padding: 14, borderRadius: 10, cursor: 'pointer', border: '2px solid ' + (paymentMethod === pm.id ? 'var(--gold)' : 'var(--b1)'), background: paymentMethod === pm.id ? 'var(--gL)' : 'var(--s2)' }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{pm.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: paymentMethod === pm.id ? 'var(--gold)' : 'var(--tx)' }}>{pm.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{pm.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setPosStep('products')} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--mu2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>&#x2190; Back</button>
                    <button onClick={createOfflineOrder} disabled={posLoading}
                      style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Syne' }}>
                      {posLoading ? 'Creating...' : 'Confirm Order \u2192 Rs.' + totals.total}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 380, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, marginBottom: 18 }}>Reschedule &mdash; {rescheduleModal.fullName || rescheduleModal.name}</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>New Date</label>
              <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} style={inp} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>New Time</label>
              <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} style={inp} />
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setRescheduleModal(null)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={confirmReschedule} disabled={rescheduleLoading}
                style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                {rescheduleLoading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* âœ… Skin Profile Edit/Create Modal */}
      {editSkinProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
              {editSkinProfile._id ? 'Edit' : 'Create'} Skin Profile
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 18 }}>{editSkinProfile.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Skin Type</label>
                <select value={skinProfileForm.skinType || ''} onChange={e => setSkinProfileForm((p: any) => ({ ...p, skinType: e.target.value }))} style={inp}>
                  <option value="">Select...</option>
                  {['oily', 'dry', 'combination', 'normal', 'sensitive'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Skin Concerns (comma separated)</label>
                <input value={typeof skinProfileForm.skinConcerns === 'string' ? skinProfileForm.skinConcerns : (skinProfileForm.skinConcerns || []).join(', ')} onChange={e => setSkinProfileForm((p: any) => ({ ...p, skinConcerns: e.target.value }))} placeholder="acne, pigmentation, dryness" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Specialist Notes</label>
                <textarea value={skinProfileForm.notes || ''} onChange={e => setSkinProfileForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Specialist observations..." style={{ ...inp, height: 80, resize: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setEditSkinProfile(null)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={updateSkinProfile} disabled={skinProfileLoading}
                style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                {skinProfileLoading ? 'Saving...' : (editSkinProfile._id ? 'Save Changes' : 'Create Profile')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skin Profile Full Modal */}
      {showSkinProfileModal && selectedSkinProfile && (
        <SkinProfileModal
          skinProfile={selectedSkinProfile}
          products={products}
          mongoSpec={mongoSpec}
          onClose={() => { setShowSkinProfileModal(false); setSelectedSkinProfile(null) }}
          onSaved={() => { setShowSkinProfileModal(false); setSelectedSkinProfile(null); loadAll() }}
        />
      )}

      {/* Payout Modal */}
      {payoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 420, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Request Payout</div>
            <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 20 }}>Available: <strong style={{ color: 'var(--gold)' }}>Rs.{totalEarnings.toLocaleString('en-IN')}</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Amount*</label>
                <input value={payoutForm.amount} onChange={e => setPayoutForm(p => ({ ...p, amount: e.target.value }))} placeholder={'Max Rs.' + totalEarnings} style={inp} type="number" />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>UPI ID*</label>
                <input value={payoutForm.upiId} onChange={e => setPayoutForm(p => ({ ...p, upiId: e.target.value }))} placeholder="yourname@upi" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Account Name</label>
                <input value={payoutForm.upiName} onChange={e => setPayoutForm(p => ({ ...p, upiName: e.target.value }))} placeholder="Your full name" style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setPayoutModal(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={requestPayout} disabled={payoutLoading}
                style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                {payoutLoading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








