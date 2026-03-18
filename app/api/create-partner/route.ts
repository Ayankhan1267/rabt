import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, partnerId } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Name aur email required hai' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const firstName = name.split(' ')[0]
    const password = firstName + '@' + Math.random().toString(36).slice(2, 6).toUpperCase()

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === email)

    let userId = ''
    let alreadyExisted = false

    if (existing) {
      // Reset password
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password })
      userId = existing.id
      alreadyExisted = true
      await supabaseAdmin.from('profiles').update({
        hq_login_created: true,
        partner_id: partnerId || '',
      }).eq('id', userId)
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'partner' }
      })
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
      userId = authData.user.id

      // Create profile
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        name,
        email,
        role: 'partner',
        phone: phone || '',
        partner_id: partnerId || '',
        hq_login_created: true,
        is_active: true,
      })
    }

    // Link user_id to sales_partners table
    await supabaseAdmin.from('sales_partners').update({ user_id: userId }).eq('id', partnerId)

    return NextResponse.json({
      success: true,
      alreadyExisted,
      credentials: { email, password },
      userId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
