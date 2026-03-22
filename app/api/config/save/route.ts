import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { invalidateConfigCache } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { keys } = await req.json()
    if (!keys || typeof keys !== 'object') {
      return NextResponse.json({ error: 'keys object required' }, { status: 400 })
    }

    const admin = createServerClient()

    // Verify the caller is founder/admin
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (token) {
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) {
        const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (!profile || !['founder', 'admin'].includes(profile.role)) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      }
    }

    // Save to hq_settings
    const { error } = await admin
      .from('hq_settings')
      .upsert({ key: 'api_keys', value: keys }, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Bust the in-process config cache
    invalidateConfigCache()

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
