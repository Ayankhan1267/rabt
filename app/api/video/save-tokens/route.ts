import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { tokens } = await req.json() as { tokens: Record<string, { access_token?: string; account_id?: string; extra?: Record<string, string>; status: string }> }
    // tokens = { instagram: { access_token, account_id, ... }, youtube: {...}, ... }
    for (const [platform, data] of Object.entries(tokens)) {
      await supabase.from('rabt_platform_tokens').upsert({
        platform,
        access_token: data.access_token || null,
        account_id: data.account_id || null,
        extra: data.extra || {},
        status: data.status || 'connected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform' })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  const { data } = await supabase.from('rabt_platform_tokens').select('platform,account_name,status,account_id,updated_at')
  return NextResponse.json(data || [])
}
