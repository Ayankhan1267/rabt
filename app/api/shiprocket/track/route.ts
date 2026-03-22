import { NextRequest, NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

const SR_BASE = 'https://apiv2.shiprocket.in/v1/external'
let srToken = ''; let srTokenAt = 0

async function getToken(email: string, password: string) {
  if (srToken && Date.now() - srTokenAt < 8 * 3600 * 1000) return srToken
  const r = await fetch(`${SR_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  const d = await r.json()
  if (!d.token) throw new Error('Shiprocket login failed')
  srToken = d.token; srTokenAt = Date.now(); return srToken
}

export async function GET(req: NextRequest) {
  const awb = req.nextUrl.searchParams.get('awb')
  if (!awb) return NextResponse.json({ error: 'awb required' }, { status: 400 })
  try {
    const cfg = await getConfig()
    if (!cfg.SHIPROCKET_EMAIL || !cfg.SHIPROCKET_PASSWORD)
      return NextResponse.json({ error: 'Shiprocket not configured' }, { status: 400 })
    const token = await getToken(cfg.SHIPROCKET_EMAIL, cfg.SHIPROCKET_PASSWORD)
    const r = await fetch(`${SR_BASE}/courier/track/awb/${awb}`, { headers: { Authorization: `Bearer ${token}` } })
    const d = await r.json()
    return NextResponse.json(d)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
