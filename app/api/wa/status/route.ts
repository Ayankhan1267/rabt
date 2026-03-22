import { NextResponse } from 'next/server'
import { getWAStatus } from '@/lib/wa-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = getWAStatus()
  return NextResponse.json({ status: s.status, phone: s.phone })
}
