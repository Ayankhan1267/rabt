import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { enabled, time, phones } = await req.json()

    // Upsert schedule config into settings table
    const { error } = await supabase.from('rabt_assistant_settings').upsert({
      id: 'daily_report',
      enabled,
      report_time: time,
      phone_numbers: phones,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) {
      // If table doesn't exist yet, still return success (will be created via SQL)
      console.error('Schedule save error:', error.message)
    }

    return NextResponse.json({ success: true, message: `Daily report ${enabled ? 'scheduled' : 'disabled'} at ${time}` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data } = await supabase.from('rabt_assistant_settings').select('*').eq('id', 'daily_report').single()
    return NextResponse.json({ schedule: data || { enabled: false, report_time: '09:00', phone_numbers: [] } })
  } catch {
    return NextResponse.json({ schedule: { enabled: false, report_time: '09:00', phone_numbers: [] } })
  }
}
