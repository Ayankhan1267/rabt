import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const cleanPhone = phone.replace(/[^0-9]/g, '')

    const admin = createServerClient()

    // Try to find profile by phone (with or without +91 prefix)
    const { data: profile } = await admin
      .from('profiles')
      .select('id,name,email,phone')
      .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.0${cleanPhone}`)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json(
        { error: 'Phone not registered. Contact your admin.' },
        { status: 404 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Invalidate any previous unused OTPs for this phone
    await admin
      .from('phone_otps')
      .update({ used: true })
      .eq('phone', cleanPhone)
      .eq('used', false)

    // Insert new OTP
    await admin.from('phone_otps').insert({
      phone: cleanPhone,
      otp,
      user_id: profile.id,
      expires_at: expiresAt,
      used: false,
    })

    // Send via WhatsApp bridge
    const waUrl = new URL('/api/wa/send', req.url).toString()
    await fetch(waUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        message: `🔐 *Rabt HQ Login*\n\nHi ${profile.name}!\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this code.\n\n_Rabt Naturals HQ_`,
      }),
    })

    return NextResponse.json({ success: true, name: profile.name })
  } catch (e: any) {
    console.error('send-otp error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
