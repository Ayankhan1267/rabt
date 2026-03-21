'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import '@stream-io/video-react-sdk/dist/css/styles.css'
import toast from 'react-hot-toast'

function CallUI({ onEnd }: { onEnd: () => void }) {
  const { useCallEndedAt, useParticipantCount } = useCallStateHooks()
  const callEndedAt = useCallEndedAt()
  const participantCount = useParticipantCount()

  useEffect(() => {
    if (callEndedAt) onEnd()
  }, [callEndedAt])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#08090C' }}>
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: '#D4A853' }}>
          Rabt Naturals — Video Consultation
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <SpeakerLayout />
      </div>
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'center' }}>
        <CallControls />
      </div>
    </div>
  )
}

function VideoCallInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const clientRef = useRef<StreamVideoClient | null>(null)

  const sessionId = searchParams.get('sessionId')
  const specialistUserId = searchParams.get('specialistUserId')
  const specialistName = searchParams.get('specialistName') || 'Specialist'
  const consultationId = searchParams.get('consultationId')

  useEffect(() => {
    if (!sessionId || !specialistUserId) {
      setError('Session ID ya Specialist ID missing hai')
      setLoading(false)
      return
    }
    initCall()
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnectUser()
      }
    }
  }, [])

  async function initCall() {
    try {
      setLoading(true)
      const res = await fetch('/api/rabt-session?sessionId=' + sessionId + '&specialistUserId=' + specialistUserId)
      const data = await res.json()

      if (!res.ok || !data.streamToken) {
        setError(data.error || 'Token generate nahi hua')
        setLoading(false)
        return
      }

      const { streamToken, apiKey, callId } = data

      const streamClient = new StreamVideoClient({
        apiKey,
        user: {
          id: specialistUserId,
          name: specialistName,
          type: 'authenticated',
        },
        token: streamToken,
      })

      clientRef.current = streamClient

      const streamCall = streamClient.call('default', callId)
      await streamCall.join({ create: true, ring: false })

      setClient(streamClient)
      setCall(streamCall)
      setLoading(false)
      toast.success('Call join ho gaya!')
    } catch (err: any) {
      setError(err.message || 'Call join karne mein error')
      setLoading(false)
    }
  }

  async function handleEndCall() {
    try {
      if (consultationId) {
        const url = process.env.NEXT_PUBLIC_MONGO_API_URL || 'http://localhost:5000'
        await fetch(url + '/api/consultations/' + consultationId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', completedAt: new Date() })
        })
      }
      toast.success('Call ended! Consultation completed.')
    } catch {}
    router.push('/specialist-dashboard')
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08090C', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #D4A853', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: '#D4A853', fontFamily: 'Syne', fontSize: 16, fontWeight: 700 }}>Consultation join ho rahi hai...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08090C', gap: 16 }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ color: '#ef4444', fontFamily: 'Syne', fontSize: 16, fontWeight: 700 }}>{error}</div>
        <button onClick={() => router.push('/specialist-dashboard')}
          style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
          Dashboard pe wapas jao
        </button>
      </div>
    )
  }

  if (!client || !call) return null

  return (
    <StreamTheme>
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallUI onEnd={handleEndCall} />
        </StreamCall>
      </StreamVideo>
    </StreamTheme>
  )
}

export default function VideoCallPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08090C' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #D4A853', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <VideoCallInner />
    </Suspense>
  )
}
