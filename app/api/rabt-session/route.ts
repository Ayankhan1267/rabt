import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { StreamClient } from '@stream-io/node-sdk'
import { getConfig } from '@/lib/config'

const RABT_API = 'https://rabtnaturals.com/hq-api'

function makeToken(userId: string, secret: string) {
  return jwt.sign({ userId }, secret, { expiresIn: '2h' })
}

// POST — Accept consultation + create session
export async function POST(req: NextRequest) {
  try {
    const cfg = await getConfig()
    const { consultationId, specialistMongoId } = await req.json()
    const MONGO_API = cfg.NEXT_PUBLIC_MONGO_API_URL || 'http://localhost:5000'
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
    const cfg = await getConfig()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const specialistUserId = searchParams.get('specialistUserId')

    if (!cfg.STREAM_API_KEY || !cfg.STREAM_API_SECRET) {
      return NextResponse.json({ error: 'Stream keys missing' }, { status: 500 })
    }
    if (!sessionId || !specialistUserId) {
      return NextResponse.json({ error: 'sessionId and specialistUserId required' }, { status: 400 })
    }

    const streamClient = new StreamClient(cfg.STREAM_API_KEY, cfg.STREAM_API_SECRET)
    const token = streamClient.generateUserToken({ user_id: specialistUserId })

    return NextResponse.json({
      success: true,
      streamToken: token,
      apiKey: cfg.STREAM_API_KEY,
      callId: sessionId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — Skin profile update (skin-data ya routine)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'skin-data' or 'routine'
    const skinProfileId = searchParams.get('skinProfileId')
    const specialistUserId = searchParams.get('specialistUserId')

    if (!skinProfileId || !specialistUserId || !type) {
      return NextResponse.json({ error: 'skinProfileId, specialistUserId, type required' }, { status: 400 })
    }
    const cfg = await getConfig()
    if (!cfg.RABT_JWT_SECRET) {
      return NextResponse.json({ error: 'JWT secret missing' }, { status: 500 })
    }

    const body = await req.json()
    const token = makeToken(specialistUserId, cfg.RABT_JWT_SECRET)

    const url = RABT_API + '/skin-profiles/' + skinProfileId + '/' + type

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message || 'Failed' }, { status: res.status })
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}



