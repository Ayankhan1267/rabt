import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendWAMessage } from '@/lib/wa-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const admin = createServerClient()

    // Try to find profile by phone (with or without +91 prefix)
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
      return NextResponse.json(
        { error: 'Phone not registered. Contact your admin.' },
        { status: 404 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Invalidate any previous unused OTPs for this phone
    await admin.from('phone_otps').update({ used: true }).eq('phone', cleanPhone).eq('used', false)

    // Insert new OTP
    const { error: insertError } = await admin.from('phone_otps').insert({
      phone: cleanPhone,
      otp,
      user_id: profile.id,
      expires_at: expiresAt,
      used: false,
    })

    if (insertError) {
      console.error('otp insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 })
    }

    // Send via WhatsApp bridge (directly — no internal HTTP call)
    try {
      await sendWAMessage(
        cleanPhone,
        `🔐 *Rabt HQ Login*\n\nHi ${profile.name}!\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this code.\n\n_Rabt Naturals HQ_`
      )
    } catch (waErr: any) {
      console.error('WA send failed:', waErr.message)
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please try again or use password login.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ success: true, name: profile.name })
  } catch (e: any) {
    console.error('send-otp error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
