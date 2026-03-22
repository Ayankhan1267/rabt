import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getConfig } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SR_BASE = 'https://apiv2.shiprocket.in/v1/external'

// Token cache (valid ~9h, refresh every 8h)
let srToken = ''
let srTokenAt = 0

async function getSRToken(email: string, password: string): Promise<string> {
  if (srToken && Date.now() - srTokenAt < 8 * 3600 * 1000) return srToken
  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('Shiprocket login failed: ' + (data.message || 'invalid credentials'))
  srToken = data.token
  srTokenAt = Date.now()
  return srToken
}

// Map Shiprocket status → our HQ status
function mapStatus(srStatus: string): string {
  const s = (srStatus || '').toLowerCase()
  if (s.includes('delivered') && !s.includes('rto')) return 'Delivered'
  if (s.includes('rto') || s.includes('return')) return 'RTO'
  if (s.includes('out for delivery')) return 'Shipped'
  if (s.includes('in transit') || s.includes('transit') || s.includes('picked up')) return 'Shipped'
  if (s.includes('pickup scheduled') || s.includes('pickup pending') || s.includes('manifest')) return 'Packed'
  if (s.includes('cancel')) return 'Cancelled'
  return ''  // Don't overwrite if unknown
}

export async function GET(req: NextRequest) {
  return syncOrders(req)
}
export async function POST(req: NextRequest) {
  return syncOrders(req)
}

async function syncOrders(req: NextRequest) {
  try {
    const cfg = await getConfig()
    if (!cfg.SHIPROCKET_EMAIL || !cfg.SHIPROCKET_PASSWORD) {
      return NextResponse.json({ error: 'Shiprocket credentials not configured. Settings → API Keys mein add karo.' }, { status: 400 })
    }

    const token = await getSRToken(cfg.SHIPROCKET_EMAIL, cfg.SHIPROCKET_PASSWORD)
    const mongoUrl = process.env.NEXT_PUBLIC_MONGO_API_URL || cfg.NEXT_PUBLIC_MONGO_API_URL

    // Fetch all Shiprocket orders (last 100, page 1)
    const srRes = await fetch(`${SR_BASE}/orders?per_page=100&page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!srRes.ok) throw new Error('Shiprocket orders fetch failed: ' + srRes.status)
    const srData = await srRes.json()
    const srOrders: any[] = srData.data || []

    const updated: any[] = []
    const errors: string[] = []

    for (const srOrder of srOrders) {
      try {
        const awb         = srOrder.shipments?.[0]?.awb || srOrder.awb_code || ''
        const srStatus    = srOrder.status || srOrder.shipments?.[0]?.status || ''
        const ourStatus   = mapStatus(srStatus)
        const srOrderId   = srOrder.id?.toString() || ''
        const srOrderNum  = srOrder.channel_order_id || srOrder.order_id || ''
        const courierName = srOrder.shipments?.[0]?.courier || srOrder.courier_name || ''
        const trackUrl    = awb ? `https://shiprocket.co/tracking/${awb}` : ''

        if (!awb && !srOrderId) continue

        // 1. Update MongoDB order matching by channel_order_id or mongo _id
        if (mongoUrl && srOrderNum) {
          try {
            await fetch(`${mongoUrl}/api/orders/shiprocket-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderNumber: srOrderNum,
                awbNumber: awb,
                shiprocketOrderId: srOrderId,
                shiprocketStatus: srStatus,
                courierName,
                trackUrl,
                ...(ourStatus ? { status: ourStatus.toLowerCase(), orderStatus: ourStatus.toLowerCase() } : {}),
              }),
            })
          } catch {}
        }

        // 2. Update Supabase hq_orders by tracking_id or order number
        if (ourStatus) {
          await supabase
            .from('hq_orders')
            .update({
              status: ourStatus,
              tracking_id: awb || undefined,
              courier: courierName || undefined,
            })
            .or(`tracking_id.eq.${awb},notes.ilike.%${srOrderNum}%`)
        }

        updated.push({
          srOrderId,
          orderNum: srOrderNum,
          awb,
          status: srStatus,
          mappedStatus: ourStatus,
          courier: courierName,
        })
      } catch (e: any) {
        errors.push(e.message)
      }
    }

    // Save last sync time
    await supabase.from('hq_settings').upsert({
      key: 'shiprocket_last_sync',
      value: JSON.stringify({ at: new Date().toISOString(), count: srOrders.length, updated: updated.length }),
    })

    return NextResponse.json({
      success: true,
      total: srOrders.length,
      updated: updated.length,
      errors: errors.slice(0, 5),
      orders: updated.slice(0, 20),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
