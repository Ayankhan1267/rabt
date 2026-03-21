import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { StreamClient } from '@stream-io/node-sdk'

export async function POST(req: NextRequest) {
  try {
    const { consultationId, specialistMongoId } = await req.json()
    const MONGO_API = process.env.NEXT_PUBLIC_MONGO_API_URL || 'http://localhost:5000'
    const res = await fetch(MONGO_API + '/api/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId, specialistId: specialistMongoId })
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error || 'Failed' }, { status: res.status })
    return NextResponse.json({ success: true, sessionUrl: data.sessionUrl, sessionId: data.sessionId, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — Stream.io token generate karo specialist ke liye
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const specialistUserId = searchParams.get('specialistUserId')

    const STREAM_API_KEY = process.env.STREAM_API_KEY
    const STREAM_API_SECRET = process.env.STREAM_API_SECRET

    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return NextResponse.json({ error: 'Stream keys missing' }, { status: 500 })
    }
    if (!sessionId || !specialistUserId) {
      return NextResponse.json({ error: 'sessionId and specialistUserId required' }, { status: 400 })
    }

    const streamClient = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET)
    const token = streamClient.generateUserToken({ user_id: specialistUserId })

    return NextResponse.json({
      success: true,
      streamToken: token,
      apiKey: STREAM_API_KEY,
      callId: sessionId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}