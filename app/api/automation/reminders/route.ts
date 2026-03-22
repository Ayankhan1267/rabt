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

// ── Template content (same as UI templates) ──────────────────────────────────
const TEMPLATES: Record<string, string> = {
  consultation_reminder: `Hi {name}! ⏰\n\n*Kal aapki skin consultation hai!* 🌿\n\n✅ Saaf chehra tayar karein\n✅ Achhi lighting wali jagah chuno\n✅ Skin concerns note kar lein\n\n*Join link:*\n👉 {joinLink}\n\nSee you tomorrow! 🌿\n~{specialist}`,

  consultation_5min: `Hi {name}! 🚨\n\n*Sirf 5 minute baad aapki consultation hai!* ⏰\n\n👩‍⚕️ *{specialist}* aapka intezaar kar rahi hain!\n\n*Abhi join karein:*\n👉 {joinLink}\n\n⚠️ rabtnaturals.com pe login zaroor karein pehle.\n\n~Rabt Naturals 🌿`,

  consultation_time_now: `Hi {name}! 🟢\n\n*Aapki consultation ka waqt aa gaya!* 🎉\n\n👩‍⚕️ *{specialist}* live hain — *ABHI join karein:*\n👉 {joinLink}\n\n⚠️ Join ke liye rabtnaturals.com pe login karein.\n\n~Rabt Naturals 🌿`,
}

function fillTemplate(text: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`\\{${k}\\}`, 'g'), v || ''),
    text
  )
}

// Parse scheduledAt from consultation — handles multiple field names
function getScheduledAt(c: any): Date | null {
  const raw = c.scheduledAt || c.scheduledDate || c.date || c.consultationDate || c.appointmentDate
  if (!raw) return null
  // If there's also a separate time field, combine
  if (c.time && typeof raw === 'string' && !raw.includes('T')) {
    try { return new Date(`${raw}T${c.time}`) } catch {}
  }
  try {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  } catch { return null }
}

// Dedup key stored in whatsapp_logs type field
function autoKey(type: string, consId: string) {
  return `auto_${type}_${consId}`
}

async function alreadySent(type: string, consId: string): Promise<boolean> {
  const key = autoKey(type, consId)
  const { data } = await supabase
    .from('whatsapp_logs')
    .select('id')
    .eq('type', key)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function sendAuto(phone: string, message: string, type: string, consId: string, cfg: any) {
  // Try WA Bridge first
  try {
    const result = await sendWAMessage(phone, message)
    if (result?.success) {
      await supabase.from('whatsapp_logs').insert({
        to_number: phone,
        message: message.substring(0, 500),
        status: 'sent_bridge',
        type: autoKey(type, consId),
      })
      return { sent: true, via: 'bridge' }
    }
  } catch {}

  // Fallback: Twilio WA
  if (cfg.TWILIO_ACCOUNT_SID && cfg.TWILIO_AUTH_TOKEN) {
    try {
      let toNumber = phone.replace(/[^0-9+]/g, '')
      if (!toNumber.startsWith('+')) toNumber = '+91' + toNumber
      const from = cfg.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
      const params = new URLSearchParams({ From: from, To: 'whatsapp:' + toNumber, Body: message })
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${cfg.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${cfg.TWILIO_ACCOUNT_SID}:${cfg.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      )
      if (res.ok) {
        await supabase.from('whatsapp_logs').insert({
          to_number: phone,
          message: message.substring(0, 500),
          status: 'sent_twilio',
          type: autoKey(type, consId),
        })
        return { sent: true, via: 'twilio' }
      }
    } catch {}
  }

  return { sent: false, via: 'none' }
}

export async function GET(req: NextRequest) {
  // Allow cron pings via GET (no auth needed for internal use)
  return runAutomation()
}

export async function POST(req: NextRequest) {
  return runAutomation()
}

async function runAutomation() {
  const started = new Date().toISOString()
  const results: any[] = []

  try {
    // ── Load automation settings ────────────────────────────────────────────
    const { data: settingsRow } = await supabase
      .from('hq_settings')
      .select('value')
      .eq('key', 'reminder_automations')
      .single()

    let settings = { enabled: false, day_before: true, min5_before: true, time_now: true }
    if (settingsRow?.value) {
      try { settings = { ...settings, ...JSON.parse(settingsRow.value) } } catch {}
    }

    if (!settings.enabled) {
      return NextResponse.json({ skipped: true, reason: 'Automation disabled', started })
    }

    const cfg = await getConfig()
    const mongoUrl = process.env.NEXT_PUBLIC_MONGO_API_URL || cfg.MONGO_API_URL
    if (!mongoUrl) return NextResponse.json({ error: 'No mongo URL configured' }, { status: 500 })

    // ── Fetch data ──────────────────────────────────────────────────────────
    const [consRes, sessionRes, specRes] = await Promise.all([
      fetch(mongoUrl + '/api/consultations').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/sessions').then(r => r.ok ? r.json() : []),
      fetch(mongoUrl + '/api/specialists').then(r => r.ok ? r.json() : []),
    ])

    const allCons     = Array.isArray(consRes)    ? consRes.filter(Boolean)    : []
    const allSessions = Array.isArray(sessionRes) ? sessionRes.filter(Boolean) : []
    const allSpecs    = Array.isArray(specRes)    ? specRes.filter(Boolean)    : []

    // sessionUrl lookup: consultationId → sessionUrl
    const sessionByConsId = new Map<string, string>()
    allSessions.forEach((s: any) => {
      if (s.consultation && s.sessionUrl) sessionByConsId.set(s.consultation.toString(), s.sessionUrl)
    })

    // specialist lookup: specId → name
    const specById = new Map<string, string>()
    allSpecs.forEach((s: any) => { if (s._id) specById.set(s._id.toString(), s.name || 'Specialist') })

    const now = new Date()

    for (const c of allCons) {
      const scheduledAt = getScheduledAt(c)
      if (!scheduledAt) continue

      // Only process accepted/booked consultations
      const status = (c.status || '').toLowerCase()
      if (!['accepted', 'booked', 'confirmed', 'scheduled'].includes(status)) continue

      const phone = (c.phone || c.customerPhone || '').replace(/[^0-9]/g, '')
      if (!phone || phone.length < 10) continue

      const consId    = c._id?.toString() || ''
      const name      = c.name || c.fullName || c.customerName || 'Customer'
      const specName  = specById.get(c.assignedSpecialist?.toString() || '') || 'Specialist'
      const joinLink  = sessionByConsId.get(consId) || ''

      const diffMs   = scheduledAt.getTime() - now.getTime()
      const diffMins = diffMs / 60000

      // ── 1 day before (between 23h and 25h before) ───────────────────────
      if (settings.day_before && diffMins >= 23 * 60 && diffMins <= 25 * 60) {
        if (!(await alreadySent('day_before', consId))) {
          const msg = fillTemplate(TEMPLATES.consultation_reminder, { name, specialist: specName, joinLink })
          const r = await sendAuto(phone, msg, 'day_before', consId, cfg)
          results.push({ consId, name, type: 'day_before', ...r })
        }
      }

      // ── 5 min before (between 3 and 7 mins before) ─────────────────────
      if (settings.min5_before && diffMins >= 3 && diffMins <= 7) {
        if (!(await alreadySent('5min_before', consId))) {
          const msg = fillTemplate(TEMPLATES.consultation_5min, { name, specialist: specName, joinLink })
          const r = await sendAuto(phone, msg, '5min_before', consId, cfg)
          results.push({ consId, name, type: '5min_before', ...r })
        }
      }

      // ── Time now (within 0-3 mins of start) ────────────────────────────
      if (settings.time_now && diffMins >= -3 && diffMins <= 1) {
        if (!(await alreadySent('time_now', consId))) {
          const msg = fillTemplate(TEMPLATES.consultation_time_now, { name, specialist: specName, joinLink })
          const r = await sendAuto(phone, msg, 'time_now', consId, cfg)
          results.push({ consId, name, type: 'time_now', ...r })
        }
      }
    }

    // Save last run time
    await supabase.from('hq_settings').upsert({
      key: 'reminder_automations',
      value: JSON.stringify({ ...settings, last_run: started, last_sent: results.filter(r => r.sent).length }),
    })

    return NextResponse.json({ success: true, started, checked: allCons.length, processed: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, started }, { status: 500 })
  }
}
