import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AgentStatus {
  id: string
  name: string
  icon: string
  connected: boolean
  status: 'connected' | 'partial' | 'disconnected'
  details: string
  missingKeys: string[]
  setupUrl?: string
}

export async function GET() {
  try {
    const cfg = await getConfig()

    const agents: AgentStatus[] = []

    // 1. Claude AI (Anthropic) — used by ALL agents
    const hasAnthropic = !!cfg.ANTHROPIC_API_KEY
    agents.push({
      id: 'anthropic',
      name: 'Claude AI (Anthropic)',
      icon: '🧠',
      connected: hasAnthropic,
      status: hasAnthropic ? 'connected' : 'disconnected',
      details: hasAnthropic ? 'API key configured — all AI agents active' : 'API key missing — all AI agents will fail',
      missingKeys: hasAnthropic ? [] : ['ANTHROPIC_API_KEY'],
      setupUrl: 'https://console.anthropic.com/settings/keys',
    })

    // 2. WhatsApp (Twilio)
    const hasTwilio = !!(cfg.TWILIO_ACCOUNT_SID && cfg.TWILIO_AUTH_TOKEN)
    const hasWANumber = !!cfg.TWILIO_WHATSAPP_NUMBER
    agents.push({
      id: 'whatsapp',
      name: 'WhatsApp (Twilio)',
      icon: '💬',
      connected: hasTwilio,
      status: hasTwilio && hasWANumber ? 'connected' : hasTwilio ? 'partial' : 'disconnected',
      details: hasTwilio
        ? `Connected — From: ${cfg.TWILIO_WHATSAPP_NUMBER || 'not set'}`
        : 'Twilio credentials missing — WhatsApp messages will fail',
      missingKeys: [
        ...(!cfg.TWILIO_ACCOUNT_SID ? ['TWILIO_ACCOUNT_SID'] : []),
        ...(!cfg.TWILIO_AUTH_TOKEN ? ['TWILIO_AUTH_TOKEN'] : []),
        ...(!cfg.TWILIO_WHATSAPP_NUMBER ? ['TWILIO_WHATSAPP_NUMBER'] : []),
      ],
      setupUrl: 'https://console.twilio.com',
    })

    // 3. Vapi (AI Calling)
    const hasVapi = !!(cfg.VAPI_API_KEY && cfg.VAPI_PHONE_NUMBER_ID)
    agents.push({
      id: 'vapi',
      name: 'Vapi (AI Calling)',
      icon: '📞',
      connected: hasVapi,
      status: cfg.VAPI_API_KEY ? (hasVapi ? 'connected' : 'partial') : 'disconnected',
      details: hasVapi
        ? 'Calling Agent + Sales Agent calls active'
        : cfg.VAPI_API_KEY
        ? 'API key set but Phone Number ID missing'
        : 'Vapi not configured — AI calls disabled',
      missingKeys: [
        ...(!cfg.VAPI_API_KEY ? ['VAPI_API_KEY'] : []),
        ...(!cfg.VAPI_PHONE_NUMBER_ID ? ['VAPI_PHONE_NUMBER_ID'] : []),
      ],
      setupUrl: 'https://dashboard.vapi.ai',
    })

    // 4. ElevenLabs (Voice)
    const hasElevenLabs = !!cfg.ELEVENLABS_VOICE_ID
    agents.push({
      id: 'elevenlabs',
      name: 'ElevenLabs (Voice)',
      icon: '🎙️',
      connected: hasElevenLabs,
      status: hasElevenLabs ? 'connected' : 'partial',
      details: hasElevenLabs
        ? `Voice ID: ${cfg.ELEVENLABS_VOICE_ID}`
        : 'Using default neural voice — set custom voice ID for Indian accent',
      missingKeys: hasElevenLabs ? [] : ['ELEVENLABS_VOICE_ID'],
      setupUrl: 'https://elevenlabs.io/voice-lab',
    })

    // 5. MongoDB (rabtnaturals.com data)
    const hasMongo = !!(cfg.MONGO_URI || cfg.NEXT_PUBLIC_MONGO_API_URL)
    let mongoStatus: 'connected' | 'partial' | 'disconnected' = 'disconnected'
    if (cfg.MONGO_URI) mongoStatus = 'connected'
    else if (cfg.NEXT_PUBLIC_MONGO_API_URL) mongoStatus = 'partial'
    agents.push({
      id: 'mongodb',
      name: 'MongoDB (rabtnaturals.com)',
      icon: '🗄️',
      connected: hasMongo,
      status: mongoStatus,
      details: cfg.MONGO_URI
        ? 'Direct connection active — Retention Agent, Orders, Customers live'
        : cfg.NEXT_PUBLIC_MONGO_API_URL
        ? 'REST API connected — direct queries limited'
        : 'Not connected — Retention Agent using demo data',
      missingKeys: [
        ...(!cfg.MONGO_URI ? ['MONGO_URI'] : []),
        ...(!cfg.NEXT_PUBLIC_MONGO_API_URL ? ['NEXT_PUBLIC_MONGO_API_URL'] : []),
      ],
    })

    // 6. Supabase (HQ Database)
    const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
    let supabaseTables: string[] = []
    if (hasSupabase) {
      try {
        const [t1, t2, t3] = await Promise.all([
          supabase.from('rabt_tasks').select('id').limit(1),
          supabase.from('rabt_call_logs').select('id').limit(1),
          supabase.from('hq_settings').select('key').limit(1),
        ])
        if (!t1.error) supabaseTables.push('rabt_tasks')
        if (!t2.error) supabaseTables.push('rabt_call_logs')
        if (!t3.error) supabaseTables.push('hq_settings')
      } catch { /* skip */ }
    }
    agents.push({
      id: 'supabase',
      name: 'Supabase (HQ Database)',
      icon: '⚡',
      connected: hasSupabase,
      status: hasSupabase ? (supabaseTables.length >= 2 ? 'connected' : 'partial') : 'disconnected',
      details: hasSupabase
        ? `Connected — Tables ready: ${supabaseTables.join(', ') || 'checking...'}`
        : 'Supabase not configured',
      missingKeys: [],
    })

    // 7. Razorpay (Payments)
    const hasRazorpay = !!(cfg.RAZORPAY_KEY_ID && cfg.RAZORPAY_KEY_SECRET)
    agents.push({
      id: 'razorpay',
      name: 'Razorpay (Payments)',
      icon: '💳',
      connected: hasRazorpay,
      status: hasRazorpay ? 'connected' : 'disconnected',
      details: hasRazorpay
        ? 'Payment links active in WhatsApp Commerce Agent'
        : 'Not configured — payment links will be manual',
      missingKeys: [
        ...(!cfg.RAZORPAY_KEY_ID ? ['RAZORPAY_KEY_ID'] : []),
        ...(!cfg.RAZORPAY_KEY_SECRET ? ['RAZORPAY_KEY_SECRET'] : []),
      ],
      setupUrl: 'https://dashboard.razorpay.com/app/keys',
    })

    // 8. Shiprocket
    const hasShiprocket = !!(cfg.SHIPROCKET_EMAIL && cfg.SHIPROCKET_PASSWORD)
    agents.push({
      id: 'shiprocket',
      name: 'Shiprocket (Logistics)',
      icon: '🚚',
      connected: hasShiprocket,
      status: hasShiprocket ? 'connected' : 'disconnected',
      details: hasShiprocket ? 'Order tracking active' : 'Not configured',
      missingKeys: [
        ...(!cfg.SHIPROCKET_EMAIL ? ['SHIPROCKET_EMAIL'] : []),
        ...(!cfg.SHIPROCKET_PASSWORD ? ['SHIPROCKET_PASSWORD'] : []),
      ],
    })

    const summary = {
      total: agents.length,
      connected: agents.filter(a => a.status === 'connected').length,
      partial: agents.filter(a => a.status === 'partial').length,
      disconnected: agents.filter(a => a.status === 'disconnected').length,
    }

    return NextResponse.json({ agents, summary })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
