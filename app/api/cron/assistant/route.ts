/**
 * /api/cron/assistant
 *
 * Automatic daily trigger for the Assistant Agent Auto Brain.
 * Called by a cron service (Render Cron Job, cron-job.org, etc.) every day.
 *
 * ACTIVATION STEPS:
 * 1. Set env var: CRON_SECRET=any_random_secret_string
 * 2. Call this URL daily: GET /api/cron/assistant?secret=YOUR_CRON_SECRET
 * 3. Schedule in Render → Cron Jobs → 0 4 * * * (9 AM IST = 4 AM UTC)
 *
 * The phones to send WhatsApp reports to are stored in:
 * Supabase → hq_settings → key: "auto_schedule" → value: { phones: ["+91..."] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────
  const secret = req.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── Load schedule settings ─────────────────────────────────────────
    const { data: scheduleRow } = await supabase
      .from('hq_settings')
      .select('value')
      .eq('key', 'auto_schedule')
      .single()

    const schedule = scheduleRow?.value || {}
    const phones: string[] = Array.isArray(schedule.phones) ? schedule.phones : []
    const enabled = schedule.enabled !== false // default true if no setting

    if (!enabled) {
      return NextResponse.json({ skipped: true, reason: 'Auto schedule disabled in settings' })
    }

    // ── Call the main auto-run ─────────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const runRes = await fetch(`${appUrl}/api/assistant/auto-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        createTasks: true,
        sendReport: phones.length > 0,
        phones,
      }),
    })

    const result = await runRes.json()

    // ── Save run log to Supabase ───────────────────────────────────────
    await supabase.from('hq_settings').upsert({
      key: 'last_auto_run',
      value: {
        runAt: new Date().toISOString(),
        situation: result.situation,
        tasksCreated: result.createdTasks?.length || 0,
        whatsappSent: result.whatsappSent || 0,
        focusForToday: result.focusForToday,
        analysis: result.analysis,
      },
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      runAt: new Date().toISOString(),
      situation: result.situation,
      tasksCreated: result.createdTasks?.length || 0,
      reportsSent: result.whatsappSent || 0,
      focusForToday: result.focusForToday,
    })
  } catch (e: any) {
    console.error('Cron error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Also support POST (some cron services use POST)
export async function POST(req: NextRequest) {
  return GET(req)
}
