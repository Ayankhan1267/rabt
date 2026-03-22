import { NextResponse } from 'next/server'
import { initWA, getWAStatus } from '@/lib/wa-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const s = await initWA()
    return NextResponse.json(s)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(getWAStatus())
}
