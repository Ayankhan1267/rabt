import { NextRequest, NextResponse } from 'next/server'
import { sendWAMessage } from '@/lib/wa-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json()
    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message required' }, { status: 400 })
    }
    const result = await sendWAMessage(phone, message)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 })
  }
}
