import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWAMessage } from '@/lib/wa-bridge'
import { getConfig } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── All automation-eligible templates ────────────────────────────────────────
export const AUTO_TEMPLATES: Record<string, { label: string; group: string; text: string }> = {
  // Pre-Consultation
  skin_analysis_pending: {
    label: '🔬 Skin Analysis Pending',
    group: 'Pre-Consultation',
    text: `Hi {name}! 👋\n\nAapne abhi tak apni free *Skin Analysis* nahi ki! 🔬\n\nSirf 2 minute mein jaano apna skin type aur concerns.\n\n👉 *Abhi karo:* rabtnaturals.com/skin-analysis\n\nBilkul free hai! 🌿\n~{specialist}`,
  },
  book_consultation: {
    label: '📅 Book Consultation',
    group: 'Pre-Consultation',
    text: `Hi {name}! 👋\n\nAapki skin ke liye *FREE Expert Consultation* available hai! 🌿\n\n✅ Personalized skin analysis\n✅ Custom routine\n✅ 1-on-1 specialist session\n\n📲 Book karo: rabtnaturals.com/consultation\n\n~{specialist} 🌿`,
  },

  // Consultation Journey
  consultation_booked_join: {
    label: '📅 Consultation Booked + Join Link',
    group: 'Consultation',
    text: `Hi {name}! 🎉\n\nAapki skin consultation confirm ho gayi hai!\n\n👩‍⚕️ *Specialist:* {specialist}\n\n*Video call join karne ke liye:*\n👉 {joinLink}\n\n⚠️ Join ke liye rabtnaturals.com pe login karein.\n\nKoi sawaal? Reply karein! 💚\n~Rabt Naturals 🌿`,
  },
  consultation_reminder: {
    label: '⏰ 1 Din Pehle Reminder',
    group: 'Consultation',
    text: `Hi {name}! ⏰\n\n*Kal aapki skin consultation hai!* 🌿\n\n✅ Saaf chehra tayar karein\n✅ Achhi lighting wali jagah chuno\n✅ Skin concerns note kar lein\n\n*Join link:*\n👉 {joinLink}\n\nSee you tomorrow! 🌿\n~{specialist}`,
  },
  consultation_5min: {
    label: '🚨 5 Minute Pehle',
    group: 'Consultation',
    text: `Hi {name}! 🚨\n\n*Sirf 5 minute baad aapki consultation hai!* ⏰\n\n👩‍⚕️ *{specialist}* aapka intezaar kar rahi hain!\n\n*Abhi join karein:*\n👉 {joinLink}\n\n⚠️ rabtnaturals.com pe login zaroor karein pehle.\n\n~Rabt Naturals 🌿`,
  },
  consultation_time_now: {
    label: '🟢 Time Ho Gayi — Join Karo!',
    group: 'Consultation',
    text: `Hi {name}! 🟢\n\n*Aapki consultation ka waqt aa gaya!* 🎉\n\n👩‍⚕️ *{specialist}* live hain — *ABHI join karein:*\n👉 {joinLink}\n\n⚠️ Join ke liye rabtnaturals.com pe login karein.\n\n~Rabt Naturals 🌿`,
  },

  // No Show Sequence
  no_show_1: {
    label: '😔 No Show — Day 1',
    group: 'No Show',
    text: `Hi {name}! 🌿\n\nAaj aapki consultation miss ho gayi — koi baat nahi!\n\nDobara schedule karein:\n👉 rabtnaturals.com/consultation\n\nYa reply karein — {specialist} aapke liye available hai! 💚\n~Rabt Naturals`,
  },
  no_show_2: {
    label: '😔 No Show — Day 3',
    group: 'No Show',
    text: `Hi {name}! 👋\n\n{specialist} aapka intezaar kar rahi hai! 🌿\n\nAapki skin consultation slot abhi bhi available hai.\n\nKab suit karega? Reply karein ya book karein:\n👉 rabtnaturals.com/consultation\n\n~Rabt Naturals 🌿`,
  },
  no_show_3: {
    label: '😔 No Show — Day 5',
    group: 'No Show',
    text: `Hi {name}! 🌿\n\nAapki FREE consultation slot abhi bhi reserve hai.\n\nSkin concerns akele solve karna mushkil hota hai — isliye hum hain! 💚\n\nEk baar zaroor try karein:\n📲 rabtnaturals.com/consultation\n\n~{specialist}, Rabt Naturals`,
  },
  no_show_4: {
    label: '😔 No Show — Day 7',
    group: 'No Show',
    text: `Hi {name}!\n\n*Special priority slot* sirf aapke liye! 🌿\n\nIss hafte mein book karein aur paayein:\n🎁 *Free skin assessment report*\n\n📅 rabtnaturals.com/consultation\n\n~Rabt Naturals 💚`,
  },
  no_show_5: {
    label: '😔 No Show — Day 10 (Final)',
    group: 'No Show',
    text: `Hi {name}! 🌿\n\nYeh hamara last message hai consultation ke baare mein.\n\nJab bhi ready hon — hum yahaan hain:\n🔗 rabtnaturals.com/consultation\n\nAapki skin hamesha better ho sakti hai! 💚\n~Rabt Naturals`,
  },

  // Post Consultation
  consultation_complete: {
    label: '✅ Consultation Done — Skin Profile',
    group: 'Post Consultation',
    text: `Hi {name}! 🎉\n\nAapki skin consultation complete ho gayi! 🌿\n\n*Aapka Skin Profile ready hai:*\n👉 {skinProfileLink}\n\n4-6 weeks consistently follow karein — results zaroor aayenge! ✨\n\nKoi sawaal? Reply karein! 💚\n~{specialist}, Rabt Naturals 🌿`,
  },

  // Purchase Sequence
  routine_not_purchased_1: {
    label: '🛒 Routine Ready — Day 1',
    group: 'Purchase Sequence',
    text: `Hi {name}! 🌿\n\nAapki *personalized skin routine* {specialist} ne ready kar di hai! ✨\n\n*Aapke liye curated products:*\n👉 {routineLink}\n\nYe products specifically aapki skin type ke liye choose ki gayi hain!\n\n~Rabt Naturals 🌿`,
  },
  routine_not_purchased_2: {
    label: '🛒 Routine Ready — Day 3',
    group: 'Purchase Sequence',
    text: `Hi {name}! 💚\n\nAapki routine abhi bhi wait kar rahi hai! 🌿\n\n✅ {specialist} ne personally recommend kiya\n✅ Aapki skin type ke liye tested\n\nAbhi order karein: {routineLink}\n\n~Rabt Naturals`,
  },
  routine_not_purchased_3: {
    label: '🛒 Routine Ready — Day 7 (Offer)',
    group: 'Purchase Sequence',
    text: `Hi {name}! 🎁\n\n*Special offer sirf aapke liye:*\n\n🎁 *15% off* — Code: *RABT15*\n📦 Free delivery\n\n👉 {routineLink}\n\nOffer limited time ke liye! ⏰\n~{specialist}, Rabt Naturals`,
  },
  routine_not_purchased_4: {
    label: '🛒 Routine Ready — Day 14 (Last)',
    group: 'Purchase Sequence',
    text: `Hi {name}! 🌿\n\nYeh aapke liye last reminder hai.\n\nAapki skin concerns ka solution aapki routine mein hai!\n\n*Abhi order karein:* {routineLink}\n\n~Rabt Naturals 🌿`,
  },

  // Shipping Update
  order_shipped: {
    label: '🚚 Order Shipped — Tracking Link',
    group: 'Post Purchase',
    text: `Hi {name}! 🚚\n\nAapka order ship ho gaya! 🎉\n\n📦 *Courier:* {courierName}\n🔍 *Track karo:* {trackingLink}\n\nDelivery: 2-4 working days\n\nKoi bhi sawaal ho toh reply karein! 💚\n~Rabt Naturals 🌿`,
  },

  // Post Purchase
  post_purchase_thankyou: {
    label: '🎉 Purchase Thank You',
    group: 'Post Purchase',
    text: `Hi {name}! 🎉\n\nAapka order place ho gaya! Shukriya! 🌿\n\n📦 Expected delivery: 3-5 working days\n🔍 Track: rabtnaturals.com/profile\n\nJab routine aaye — {specialist} aapko guide karenge! 💚\n~Rabt Naturals`,
  },
  post_purchase_education: {
    label: '📚 Skin Education + Diet',
    group: 'Post Purchase',
    text: `Hi {name}! 📚\n\nWelcome to your skin journey! 🌿\n\n🧴 *Routine Tips:*\n• Subah: Cleanser → Toner → Serum → Moisturizer → SPF\n• Raat: Double cleanse → Serum → Night cream\n• Consistency = Results (4-6 weeks!)\n\n🥗 *Diet for your skin:*\n• ✅ Hara saag, fruits, omega-3\n• ✅ Paani: 3-4 litre roz\n• ❌ Avoid: Sugar, dairy, junk food\n• 😴 Neend: 7-8 ghante\n\nKoi sawaal? Hum yahaan hain! 💚\n~{specialist}, Rabt Naturals 🌿`,
  },

  // Partner Automations
  partner_specialist_assigned: {
    label: '🤝 Partner Customer — Specialist Assigned',
    group: 'Partner',
    text: `Hi {name}! 🌿\n\nAapki Rabt Naturals AI Skin Analysis complete ho gayi! 🎉\n\n🩺 *Aapke Skin Specialist:* {specialist}\n\n📊 *Aapka Skin Report:*\n• Skin Score: {skinScore}/100\n• Category: {skinCategory}\n• Recommended Range: {recommendedRange}\n\nAapka specialist jald hi aapke skincare routine mein guide karenge! 💚\n\n🛍️ Products dekhein: rabtnaturals.com/products\nKoi sawaal ho toh reply karein!\n~Rabt Naturals 🌿`,
  },

  partner_order_placed: {
    label: '📦 Partner Order Placed',
    group: 'Partner',
    text: `Hi {name}! 🎉\n\nAapka order place ho gaya hai!\n\n📦 Order ID: {orderId}\n💰 Amount: ₹{amount}\n🚚 Payment: {paymentMethod}\n\nExpected delivery: 3-5 working days.\n\nTrack karein: rabtnaturals.com/track\n\nKoi sawaal ho toh reply karein! 💚\n~Rabt Naturals 🌿`,
  },
}

// ─────────────────────────────────────────────────────────────────────────────

function fill(text: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`\\{${k}\\}`, 'g'), v || ''),
    text
  )
}

function getScheduledAt(c: any): Date | null {
  const raw = c.scheduledAt || c.scheduledDate || c.date || c.consultationDate || c.appointmentDate
  if (!raw) return null
  if (c.time && typeof raw === 'string' && !raw.includes('T')) {
    try { const d = new Date(`${raw}T${c.time}`); if (!isNaN(d.getTime())) return d } catch {}
  }
  try { const d = new Date(raw); return isNaN(d.getTime()) ? null : d } catch { return null }
}

function hoursAgo(date: Date, now: Date) { return (now.getTime() - date.getTime()) / 3600000 }
function hoursBefore(date: Date, now: Date) { return (date.getTime() - now.getTime()) / 3600000 }

async function alreadySent(key: string): Promise<boolean> {
  const { data } = await supabase.from('whatsapp_logs').select('id').eq('type', key).limit(1)
  return (data?.length ?? 0) > 0
}

async function sendMsg(
  phone: string, text: string,
  dedupKey: string, cfg: any
): Promise<{ sent: boolean; via: string }> {
  if (await alreadySent(dedupKey)) return { sent: false, via: 'skipped_duplicate' }

  // 1. WA Bridge
  try {
    const r = await sendWAMessage(phone, text)
    if (r?.success) {
      await supabase.from('whatsapp_logs').insert({ to_number: phone, message: text.substring(0, 500), status: 'sent_bridge', type: dedupKey })
      return { sent: true, via: 'bridge' }
    }
  } catch {}

  // 2. Twilio
  if (cfg.TWILIO_ACCOUNT_SID && cfg.TWILIO_AUTH_TOKEN) {
    try {
      let num = phone.replace(/[^0-9+]/g, '')
      if (!num.startsWith('+')) num = '+91' + num
      const from = cfg.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${cfg.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${cfg.TWILIO_ACCOUNT_SID}:${cfg.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ From: from, To: 'whatsapp:' + num, Body: text }).toString(),
        }
      )
      if (res.ok) {
        await supabase.from('whatsapp_logs').insert({ to_number: phone, message: text.substring(0, 500), status: 'sent_twilio', type: dedupKey })
        return { sent: true, via: 'twilio' }
      }
    } catch {}
  }

  return { sent: false, via: 'no_channel' }
}

// ── Main automation runner ────────────────────────────────────────────────────
async function runAutomation() {
  const started = new Date().toISOString()
  const results: any[] = []

  try {
    // Load settings
    const { data: settingsRow } = await supabase.from('hq_settings').select('value').eq('key', 'reminder_automations').single()
    let settings: { enabled: boolean; templates: Record<string, boolean>; last_run?: string; last_sent?: number } = {
      enabled: false,
      templates: Object.fromEntries(Object.keys(AUTO_TEMPLATES).map(k => [k, true])),
    }
    if (settingsRow?.value) { try { settings = { ...settings, ...JSON.parse(settingsRow.value) } } catch {} }

    if (!settings.enabled) return NextResponse.json({ skipped: true, reason: 'Automation disabled', started })

    const cfg = await getConfig()
    const mongoUrl = process.env.NEXT_PUBLIC_MONGO_API_URL || cfg.MONGO_API_URL
    if (!mongoUrl) return NextResponse.json({ error: 'No mongo URL' }, { status: 500 })

    const isOn = (key: string) => settings.templates?.[key] !== false

    // Fetch all data
    const [consRes, sessionRes, specRes, orderRes, userRes, skinRes] = await Promise.all([
      fetch(mongoUrl + '/api/consultations').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/sessions').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/specialists').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/orders').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/users').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/skinprofiles').then(r => r.ok ? r.json() : []),
    ])

    const allCons     = Array.isArray(consRes)    ? consRes.filter(Boolean)    : []
    const allSessions = Array.isArray(sessionRes) ? sessionRes.filter(Boolean) : []
    const allSpecs    = Array.isArray(specRes)    ? specRes.filter(Boolean)    : []
    const allOrders   = Array.isArray(orderRes)   ? orderRes.filter(Boolean)   : []
    const allUsers    = Array.isArray(userRes)    ? userRes.filter(Boolean)    : []
    const allSkins    = Array.isArray(skinRes)    ? skinRes.filter(Boolean)    : []

    const now = new Date()

    // Lookup maps
    const sessionByConsId = new Map<string, string>()
    allSessions.forEach((s: any) => { if (s.consultation && s.sessionUrl) sessionByConsId.set(s.consultation.toString(), s.sessionUrl) })

    const specById = new Map<string, string>()
    allSpecs.forEach((s: any) => { if (s._id) specById.set(s._id.toString(), s.name || 'Specialist') })

    const orderedUserIds = new Set(allOrders.map((o: any) => o.userId?.toString()).filter(Boolean))
    const orderedPhones  = new Set(allOrders.map((o: any) => (o.customerPhone || '').replace(/[^0-9]/g, '')).filter((p: string) => p.length >= 10))

    const skinByUserId = new Map<string, any>()
    const skinByPhone  = new Map<string, any>()
    allSkins.forEach((s: any) => {
      if (s.userId) skinByUserId.set(s.userId.toString(), s)
      const ph = (s.phone || '').replace(/[^0-9]/g, '')
      if (ph) skinByPhone.set(ph, s)
    })

    // ── 1. Process Consultations ──────────────────────────────────────────
    for (const c of allCons) {
      const phone    = (c.phone || c.customerPhone || '').replace(/[^0-9]/g, '')
      if (!phone || phone.length < 10) continue

      const consId   = c._id?.toString() || ''
      const name     = c.name || c.fullName || c.customerName || 'Customer'
      const specName = specById.get(c.assignedSpecialist?.toString() || '') || 'Specialist'
      const joinLink = sessionByConsId.get(consId) || 'rabtnaturals.com/consultation'
      const skinProfileLink = 'rabtnaturals.com/skin-profile'
      const routineLink     = 'rabtnaturals.com/shop'
      const vars = { name, specialist: specName, joinLink, skinProfileLink, routineLink }

      const status       = (c.status || '').toLowerCase()
      const scheduledAt  = getScheduledAt(c)
      const createdAt    = c.createdAt ? new Date(c.createdAt) : null
      const completedAt  = c.completedAt ? new Date(c.completedAt) : null
      const isBooked     = ['accepted', 'booked', 'confirmed', 'scheduled'].includes(status)
      const isCompleted  = ['completed', 'done', 'finished'].includes(status)
      const isNoShow     = scheduledAt && scheduledAt < now && !isCompleted && !['cancelled', 'canceled'].includes(status)
      const hasOrder     = orderedUserIds.has(c.userId?.toString()) || orderedPhones.has(phone)

      // ── Consultation booked → send join link (within 2h of booking) ──
      if (isOn('consultation_booked_join') && isBooked && createdAt) {
        const h = hoursAgo(createdAt, now)
        if (h >= 0 && h <= 2) {
          const key = `auto_booked_join_${consId}`
          const r = await sendMsg(phone, fill(AUTO_TEMPLATES.consultation_booked_join.text, vars), key, cfg)
          if (r.sent || r.via === 'skipped_duplicate') results.push({ consId, name, type: 'consultation_booked_join', ...r })
        }
      }

      // ── 1 day before ──
      if (isOn('consultation_reminder') && isBooked && scheduledAt) {
        const h = hoursBefore(scheduledAt, now)
        if (h >= 23 && h <= 25) {
          const r = await sendMsg(phone, fill(AUTO_TEMPLATES.consultation_reminder.text, vars), `auto_day_before_${consId}`, cfg)
          results.push({ consId, name, type: 'consultation_reminder', ...r })
        }
      }

      // ── 5 min before ──
      if (isOn('consultation_5min') && isBooked && scheduledAt) {
        const m = (scheduledAt.getTime() - now.getTime()) / 60000
        if (m >= 3 && m <= 7) {
          const r = await sendMsg(phone, fill(AUTO_TEMPLATES.consultation_5min.text, vars), `auto_5min_${consId}`, cfg)
          results.push({ consId, name, type: 'consultation_5min', ...r })
        }
      }

      // ── Time now ──
      if (isOn('consultation_time_now') && isBooked && scheduledAt) {
        const m = (now.getTime() - scheduledAt.getTime()) / 60000
        if (m >= -1 && m <= 3) {
          const r = await sendMsg(phone, fill(AUTO_TEMPLATES.consultation_time_now.text, vars), `auto_time_now_${consId}`, cfg)
          results.push({ consId, name, type: 'consultation_time_now', ...r })
        }
      }

      // ── No Show sequence ──
      if (isNoShow && scheduledAt) {
        const h = hoursAgo(scheduledAt, now)
        const noShowMap: [string, number, number][] = [
          ['no_show_1',  0,   26],
          ['no_show_2',  47,  97],
          ['no_show_3',  95,  145],
          ['no_show_4',  143, 193],
          ['no_show_5',  215, 265],
        ]
        for (const [key, minH, maxH] of noShowMap) {
          if (isOn(key) && h >= minH && h <= maxH) {
            const r = await sendMsg(phone, fill(AUTO_TEMPLATES[key].text, vars), `auto_${key}_${consId}`, cfg)
            results.push({ consId, name, type: key, ...r })
          }
        }
      }

      // ── Consultation complete → skin profile ──
      if (isOn('consultation_complete') && isCompleted) {
        const r = await sendMsg(phone, fill(AUTO_TEMPLATES.consultation_complete.text, vars), `auto_complete_${consId}`, cfg)
        results.push({ consId, name, type: 'consultation_complete', ...r })
      }

      // ── Purchase sequence (consultation complete, no order yet) ──
      if (isCompleted && !hasOrder) {
        const baseDate = completedAt || (scheduledAt && scheduledAt < now ? scheduledAt : null)
        if (baseDate) {
          const h = hoursAgo(baseDate, now)
          const purchaseMap: [string, number, number][] = [
            ['routine_not_purchased_1',  0,   49],
            ['routine_not_purchased_2',  47,  97],
            ['routine_not_purchased_3',  143, 193],
            ['routine_not_purchased_4',  311, 361],
          ]
          for (const [key, minH, maxH] of purchaseMap) {
            if (isOn(key) && h >= minH && h <= maxH) {
              const r = await sendMsg(phone, fill(AUTO_TEMPLATES[key].text, vars), `auto_${key}_${consId}`, cfg)
              results.push({ consId, name, type: key, ...r })
            }
          }
        }
      }
    }

    // ── 2. Process Orders → Post Purchase ────────────────────────────────
    for (const o of allOrders) {
      const phone = (o.customerPhone || o.phone || '').replace(/[^0-9]/g, '')
      if (!phone || phone.length < 10) continue

      const orderId     = o._id?.toString() || ''
      const name        = o.customerName || o.name || 'Customer'
      const specName    = 'Rabt Naturals'
      const awb         = o.awbNumber || o.awb_code || o.tracking_id || o.shipments?.[0]?.awb || ''
      const trackingLink = awb ? `https://shiprocket.co/tracking/${awb}` : (o.trackUrl || 'rabtnaturals.com/profile')
      const courierName  = o.courierName || o.courier_name || o.courier || 'Courier'
      const vars        = { name, specialist: specName, joinLink: '', skinProfileLink: 'rabtnaturals.com/skin-profile', routineLink: 'rabtnaturals.com/shop', trackingLink, courierName }
      const createdAt   = o.createdAt ? new Date(o.createdAt) : null
      if (!createdAt) continue
      const h = hoursAgo(createdAt, now)

      const orderStatus = (o.status || o.orderStatus || '').toLowerCase()

      // Order shipped → send tracking link (once, as soon as status is shipped/in transit)
      if (isOn('order_shipped') && awb && ['shipped', 'in transit', 'in_transit', 'picked up', 'picked_up', 'out for delivery', 'out_for_delivery'].some(s => orderStatus.includes(s))) {
        const r = await sendMsg(phone, fill(AUTO_TEMPLATES.order_shipped.text, vars), `auto_order_shipped_${orderId}`, cfg)
        results.push({ orderId, name, type: 'order_shipped', ...r })
      }

      // Thank you — within 2h of order
      if (isOn('post_purchase_thankyou') && h >= 0 && h <= 2) {
        const r = await sendMsg(phone, fill(AUTO_TEMPLATES.post_purchase_thankyou.text, vars), `auto_purchase_thanks_${orderId}`, cfg)
        results.push({ orderId, name, type: 'post_purchase_thankyou', ...r })
      }

      // Education — 40-56h after order
      if (isOn('post_purchase_education') && h >= 40 && h <= 56) {
        const r = await sendMsg(phone, fill(AUTO_TEMPLATES.post_purchase_education.text, vars), `auto_purchase_edu_${orderId}`, cfg)
        results.push({ orderId, name, type: 'post_purchase_education', ...r })
      }
    }

    // ── 3. Users with skin profile but no consultation → book reminder ──
    for (const skin of allSkins) {
      const phone = (skin.phone || '').replace(/[^0-9]/g, '')
      if (!phone || phone.length < 10) continue

      const userId = skin.userId?.toString() || ''
      const hasConsultation = allCons.some((c: any) =>
        c.userId?.toString() === userId || (c.phone || '').replace(/[^0-9]/g, '') === phone
      )
      if (hasConsultation) continue

      const createdAt = skin.createdAt ? new Date(skin.createdAt) : null
      if (!createdAt) continue
      const h = hoursAgo(createdAt, now)

      // 24-48h after skin analysis, no consultation booked
      if (isOn('book_consultation') && h >= 24 && h <= 48) {
        const name = skin.name || skin.fullName || 'Customer'
        const vars = { name, specialist: 'Specialist', joinLink: '', skinProfileLink: '', routineLink: '' }
        const r = await sendMsg(phone, fill(AUTO_TEMPLATES.book_consultation.text, vars), `auto_book_cons_${phone}`, cfg)
        results.push({ phone, name, type: 'book_consultation', ...r })
      }
    }

    // ── 4. Users with no skin profile → analysis reminder ────────────────
    for (const u of allUsers) {
      const phone = (u.phoneNumber || u.phone || '').replace(/[^0-9]/g, '')
      if (!phone || phone.length < 10) continue

      const hasSkin = skinByPhone.has(phone) || (u._id && skinByUserId.has(u._id.toString()))
      if (hasSkin) continue

      const createdAt = u.createdAt || u.registeredAt ? new Date(u.createdAt || u.registeredAt) : null
      if (!createdAt) continue
      const h = hoursAgo(createdAt, now)

      // 24-48h after registration, no skin analysis done
      if (isOn('skin_analysis_pending') && h >= 24 && h <= 48) {
        const name = u.name || u.fullName || 'Customer'
        const vars = { name, specialist: 'Specialist', joinLink: '', skinProfileLink: '', routineLink: '' }
        const r = await sendMsg(phone, fill(AUTO_TEMPLATES.skin_analysis_pending.text, vars), `auto_skin_pending_${phone}`, cfg)
        results.push({ phone, name, type: 'skin_analysis_pending', ...r })
      }
    }

    // Save last run
    await supabase.from('hq_settings').upsert({
      key: 'reminder_automations',
      value: JSON.stringify({ ...settings, last_run: started, last_sent: results.filter(r => r.sent).length }),
    })

    return NextResponse.json({
      success: true,
      started,
      checked: { consultations: allCons.length, orders: allOrders.length, users: allUsers.length },
      processed: results.length,
      sent: results.filter(r => r.sent).length,
      details: results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, started }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) { return runAutomation() }
export async function POST(_req: NextRequest) { return runAutomation() }
