import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()
    if (!phone || !otp) return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })

    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const admin = createServerClient()

    // Find valid OTP
    const { data: record } = await admin
      .from('phone_otps')
      .select('*')
      .eq('phone', cleanPhone)
      .eq('otp', otp.toString().trim())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 })
    }

    // Mark OTP as used
    await admin.from('phone_otps').update({ used: true }).eq('id', record.id)

    // Get profile to find email
    const { data: profile } = await admin
      .from('profiles')
      .select('id,email,name,role')
      .eq('id', record.user_id)
      .maybeSingle()

    if (!profile?.email) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 })
    }

    // Generate magic link token so client can create a real Supabase session
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    })

    if (linkError || !linkData?.properties?.email_otp) {
      console.error('generateLink error:', linkError)
      return NextResponse.json({ error: 'Failed to create session token' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: profile.email,
      token: linkData.properties.email_otp,
      name: profile.name,
      role: profile.role,
    })
  } catch (e: any) {
    console.error('verify-otp error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
