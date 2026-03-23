'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// DermIQ Calendar uses the shared calendar (consultations span both platforms)
export default function DermIQCalendar() {
  const router = useRouter()
  useEffect(() => { router.replace('/calendar') }, [router])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, fontFamily: 'DM Sans, sans-serif', color: '#6B7280', fontSize: 13 }}>
      Redirecting to shared calendar...
    </div>
  )
}
