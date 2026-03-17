import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, specialistId } = await req.json()
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

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === email)

    let userId = ''
    let alreadyExisted = false

    if (existing) {
      // Reset password
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { password })
      userId = existing.id
      alreadyExisted = true
      // Update profile
      await supabaseAdmin.from('profiles').update({
        hq_login_created: true,
        hq_specialist_mongo_id: specialistId || '',
      }).eq('id', userId)
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'specialist' }
      })
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
      userId = authData.user.id

      // Create profile
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        name,
        email,
        role: 'specialist',
        phone: phone || '',
        hq_specialist_mongo_id: specialistId || '',
        hq_login_created: true,
        is_active: true,
      })
    }

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