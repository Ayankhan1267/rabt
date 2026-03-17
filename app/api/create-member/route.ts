import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { name, email, role, phone } = await req.json()

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email aur role required hai' }, { status: 400 })
    }

    // Service role client — admin operations ke liye
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Generate password: FirstName@1234
    const firstName = name.split(' ')[0]
    const password = firstName + '@1234'

    // Step 1: Supabase Auth mein user banao
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Email confirmation skip
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Yeh email pehle se registered hai!' }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Step 2: Profile banao
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      name,
      email,
      role,
      phone: phone || '',
      is_active: true,
    })

    if (profileError) {
      // Auth user delete karo agar profile fail ho
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: { id: authData.user.id, name, email, role },
      credentials: { email, password },
      message: name + ' successfully added!'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Profile delete
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Auth user delete
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
