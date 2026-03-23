'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// DermIQ Specialists are the same pool as Rabt specialists (shared profiles table)
// This page redirects to the shared specialists management page
export default function DermIQSpecialists() {
  const router = useRouter()
  useEffect(() => { router.replace('/specialists') }, [router])
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, fontFamily: 'DM Sans, sans-serif', color: '#6B7280', fontSize: 13 }}>
      Redirecting to shared specialists panel...
    </div>
  )
}
