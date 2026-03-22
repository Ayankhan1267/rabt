import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWAMessage } from '@/lib/wa-bridge'
import { getConfig } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function sendViaTwilioSMS(to: string, body: string, cfg: Awaited<ReturnType<typeof getConfig>>) {
  const from = cfg.TWILIO_PHONE_NUMBER
  if (!cfg.TWILIO_ACCOUNT_SID || !cfg.TWILIO_AUTH_TOKEN || !from) {
    throw new Error('Twilio SMS credentials not configured in Settings')
  }
  const toE164 = '+91' + to.slice(-10)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.TWILIO_ACCOUNT_SID}/Messages.json`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${cfg.TWILIO_ACCOUNT_SID}:${cfg.TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: toE164, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Twilio SMS failed')
  }
}

async function sendViaTwilioWA(to: string, body: string, cfg: Awaited<ReturnType<typeof getConfig>>) {
  if (!cfg.TWILIO_ACCOUNT_SID || !cfg.TWILIO_AUTH_TOKEN || !cfg.TWILIO_WHATSAPP_NUMBER) {
    throw new Error('Twilio WhatsApp credentials not configured in Settings')
  }
  const toE164 = '+91' + to.slice(-10)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.TWILIO_ACCOUNT_SID}/Messages.json`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${cfg.TWILIO_ACCOUNT_SID}:${cfg.TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: cfg.TWILIO_WHATSAPP_NUMBER, To: 'whatsapp:' + toE164, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Twilio WhatsApp failed')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const admin = createServerClient()
    const cfg = await getConfig()

    // Find profile by phone
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id,name,email,phone')
      .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.0${cleanPhone}`)
      .maybeSingle()

    if (profileError) {
      console.error('profile lookup error:', profileError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json({ error: 'Phone not registered. Contact your admin.' }, { status: 404 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Invalidate old OTPs
    await admin.from('phone_otps').update({ used: true }).eq('phone', cleanPhone).eq('used', false)

    // Insert new OTP
    const { error: insertError } = await admin.from('phone_otps').insert({
      phone: cleanPhone, otp, user_id: profile.id, expires_at: expiresAt, used: false,
    })
    if (insertError) {
      console.error('otp insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 })
    }

    const smsText = `Rabt HQ OTP: ${otp}\nValid 10 mins. Do not share.`
    const waText  = `🔐 *Rabt HQ Login*\n\nHi ${profile.name}!\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share.\n\n_Rabt Naturals HQ_`

    try {
      const method = cfg.OTP_METHOD || 'wa_bridge'

      if (method === 'twilio_sms') {
        await sendViaTwilioSMS(cleanPhone, smsText, cfg)
      } else if (method === 'twilio_wa') {
        await sendViaTwilioWA(cleanPhone, waText, cfg)
      } else {
        // Default: Baileys WhatsApp bridge
        await sendWAMessage(cleanPhone, waText)
      }
    } catch (sendErr: any) {
      console.error('OTP send failed:', sendErr.message)
      return NextResponse.json({ error: sendErr.message }, { status: 503 })
    }

    const methodLabel = cfg.OTP_METHOD === 'twilio_sms' ? 'SMS' : 'WhatsApp'
    return NextResponse.json({ success: true, name: profile.name, via: methodLabel })
  } catch (e: any) {
    console.error('send-otp error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
