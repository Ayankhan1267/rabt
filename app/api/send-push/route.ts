import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { getConfig } from '@/lib/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cfg = await getConfig()
    webpush.setVapidDetails(cfg.VAPID_EMAIL, cfg.VAPID_PUBLIC_KEY, cfg.VAPID_PRIVATE_KEY)

    const { user_ids, title, body, type, url } = await req.json()

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids || [])

    let sent = 0
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title, body, type, url: url || '/specialist-dashboard' })
        )
        sent++
      } catch (e: any) {
        if (e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
    return NextResponse.json({ sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}