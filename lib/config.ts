/**
 * Central config loader.
 * Reads API keys from hq_settings (DB) first, falls back to process.env.
 * 60-second in-memory cache to avoid a DB call on every request.
 */
import { createServerClient } from '@/lib/supabase'

export interface AppConfig {
  // AI
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string
  // Push notifications
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_EMAIL: string
  // Video calls
  STREAM_API_KEY: string
  STREAM_API_SECRET: string
  // Session
  RABT_JWT_SECRET: string
  // Endpoints
  NEXT_PUBLIC_MONGO_API_URL: string
  NEXT_PUBLIC_APP_URL: string
  // Twilio
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_WHATSAPP_NUMBER: string  // for WA messages (whatsapp:+14155238886)
  TWILIO_PHONE_NUMBER: string     // for SMS OTP (+1234567890)
  // OTP delivery method
  OTP_METHOD: 'wa_bridge' | 'twilio_sms' | 'twilio_wa'
  // Shiprocket
  SHIPROCKET_EMAIL: string
  SHIPROCKET_PASSWORD: string
}

let cache: AppConfig | null = null
let cacheAt = 0
const CACHE_TTL = 60_000 // 60 seconds

export async function getConfig(): Promise<AppConfig> {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache

  // Defaults from env vars
  const defaults: AppConfig = {
    ANTHROPIC_API_KEY:      process.env.ANTHROPIC_API_KEY       || '',
    OPENAI_API_KEY:         process.env.OPENAI_API_KEY          || '',
    VAPID_PUBLIC_KEY:       process.env.VAPID_PUBLIC_KEY        || '',
    VAPID_PRIVATE_KEY:      process.env.VAPID_PRIVATE_KEY       || '',
    VAPID_EMAIL:            process.env.VAPID_EMAIL             || 'mailto:support@rabtnaturals.in',
    STREAM_API_KEY:         process.env.STREAM_API_KEY          || '',
    STREAM_API_SECRET:      process.env.STREAM_API_SECRET       || '',
    RABT_JWT_SECRET:        process.env.RABT_JWT_SECRET         || '',
    NEXT_PUBLIC_MONGO_API_URL: process.env.NEXT_PUBLIC_MONGO_API_URL || '',
    NEXT_PUBLIC_APP_URL:    process.env.NEXT_PUBLIC_APP_URL     || '',
    TWILIO_ACCOUNT_SID:     process.env.TWILIO_ACCOUNT_SID      || '',
    TWILIO_AUTH_TOKEN:      process.env.TWILIO_AUTH_TOKEN       || '',
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER  || 'whatsapp:+14155238886',
    TWILIO_PHONE_NUMBER:    process.env.TWILIO_PHONE_NUMBER     || '',
    OTP_METHOD:             (process.env.OTP_METHOD as AppConfig['OTP_METHOD']) || 'wa_bridge',
    SHIPROCKET_EMAIL:       process.env.SHIPROCKET_EMAIL    || '',
    SHIPROCKET_PASSWORD:    process.env.SHIPROCKET_PASSWORD || '',
  }

  try {
    const admin = createServerClient()
    const { data } = await admin
      .from('hq_settings')
      .select('value')
      .eq('key', 'api_keys')
      .maybeSingle()

    if (data?.value) {
      const saved = data.value as Partial<AppConfig>
      // Override defaults with any non-empty DB values
      for (const k of Object.keys(defaults) as (keyof AppConfig)[]) {
        if (saved[k] && (saved[k] as string).trim()) {
          (defaults as any)[k] = (saved[k] as string).trim()
        }
      }
    }
  } catch (e) {
    console.warn('[config] DB read failed, using env vars only:', e)
  }

  cache = defaults
  cacheAt = Date.now()
  return cache
}

/** Call this after saving new keys to force cache refresh */
export function invalidateConfigCache() {
  cache = null
  cacheAt = 0
}
