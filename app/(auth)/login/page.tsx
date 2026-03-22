'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type Step = 'phone' | 'otp' | 'password'

export default function LoginPage() {
  const router = useRouter()

  // Phone OTP state
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [userName, setUserName] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otpVia, setOtpVia] = useState('WhatsApp')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Password fallback state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // Auto-focus first OTP box when step changes
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }, [step])

  async function handleSendOtp() {
    const cleaned = phone.replace(/[^0-9]/g, '')
    if (cleaned.length < 10) { toast.error('Enter valid mobile number'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to send OTP'); return }
      setUserName(data.name || '')
      setOtpVia(data.via || 'WhatsApp')
      setOtp(['', '', '', '', '', ''])
      setStep('otp')
      setResendTimer(60)
      toast.success(`OTP sent via ${data.via || 'WhatsApp'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    const otpStr = otp.join('')
    if (otpStr.length < 6) { toast.error('Enter 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/[^0-9]/g, ''), otp: otpStr }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Invalid OTP'); return }

      // Create real Supabase session via magiclink token
      const { error } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token,
        type: 'magiclink',
      })
      if (error) { toast.error(error.message); return }
      toast.success(`Welcome, ${data.name || 'back'}!`)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (otp[idx]) {
        const next = [...otp]; next[idx] = ''; setOtp(next)
      } else if (idx > 0) {
        otpRefs.current[idx - 1]?.focus()
      }
    } else if (e.key === 'Enter') {
      handleVerifyOtp()
    }
  }

  function handleOtpInput(idx: number, val: string) {
    const digit = val.replace(/[^0-9]/g, '').slice(-1)
    const next = [...otp]; next[idx] = digit; setOtp(next)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6)
    if (!digits) return
    const next = ['', '', '', '', '', '']
    digits.split('').forEach((d, i) => { next[i] = d })
    setOtp(next)
    const lastIdx = Math.min(digits.length, 5)
    otpRefs.current[lastIdx]?.focus()
  }

  async function handlePasswordLogin() {
    if (!email || !password) { toast.error('Fill all fields'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Welcome back!')
    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '10px 13px', color: 'var(--tx)', fontSize: 13.5, fontFamily: 'Outfit', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase',
    letterSpacing: '0.08em', display: 'block', marginBottom: 5,
  }

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: 12,
    background: disabled ? 'rgba(212,168,83,0.5)' : 'linear-gradient(135deg,#D4A853,#B87C30)',
    border: 'none', borderRadius: 8, color: '#08090C', fontSize: 14, fontWeight: 700,
    fontFamily: 'Syne', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,168,83,0.07), transparent 70%)',
    }}>
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 20,
        padding: '36px 38px', width: 400, maxWidth: '94vw',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 26 }}>
          <div style={{
            width: 40, height: 40, background: 'linear-gradient(135deg,#D4A853,#B87C30)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: '#08090C',
          }}>R</div>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>
            Rabt <span style={{ color: 'var(--gold)' }}>HQ</span>
          </div>
        </div>

        {step === 'phone' && (
          <>
            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Sign In</div>
            <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 24 }}>Enter your mobile number to continue</div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Mobile Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
                  padding: '10px 13px', fontSize: 13.5, color: 'var(--mu2)', fontFamily: 'DM Mono',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>+91</div>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="9876543210" maxLength={10}
                  style={{ ...inputStyle, flex: 1 }}
                  autoFocus
                />
              </div>
            </div>

            <button onClick={handleSendOtp} disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Sending OTP...' : 'Send OTP via WhatsApp →'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--b2)' }} />
              <span style={{ fontSize: 10, color: 'var(--mu)', fontWeight: 600 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--b2)' }} />
            </div>

            <button
              onClick={() => setStep('password')}
              style={{
                width: '100%', padding: '10px 12px', background: 'transparent',
                border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu)',
                fontSize: 13, fontWeight: 600, fontFamily: 'Outfit', cursor: 'pointer',
              }}
            >
              Sign in with password
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']) }}
              style={{
                background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ← Back
            </button>

            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
              {userName ? `Hi, ${userName.split(' ')[0]}!` : 'Enter OTP'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 24 }}>
              OTP sent via {otpVia} to +91 {phone.replace(/[^0-9]/g, '').slice(-10)}
            </div>

            {/* 6-digit OTP boxes */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center' }} onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpRefs.current[idx] = el }}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpInput(idx, e.target.value)}
                  onKeyDown={e => handleOtpKey(idx, e)}
                  style={{
                    width: 46, height: 54, textAlign: 'center', fontSize: 20, fontWeight: 700,
                    fontFamily: 'DM Mono', background: 'var(--s2)',
                    border: `2px solid ${digit ? 'var(--gold)' : 'var(--b2)'}`,
                    borderRadius: 10, color: 'var(--tx)', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
              ))}
            </div>

            <button onClick={handleVerifyOtp} disabled={loading || otp.join('').length < 6} style={btnStyle(loading || otp.join('').length < 6)}>
              {loading ? 'Verifying...' : 'Verify & Sign In →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: 'var(--mu)' }}>
              {resendTimer > 0 ? (
                <span>Resend OTP in {resendTimer}s</span>
              ) : (
                <span
                  onClick={handleSendOtp}
                  style={{ cursor: 'pointer', color: 'var(--gold)', fontWeight: 600 }}
                >
                  Resend OTP
                </span>
              )}
            </div>
          </>
        )}

        {step === 'password' && (
          <>
            <button
              onClick={() => setStep('phone')}
              style={{
                background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ← Back
            </button>

            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Password Login</div>
            <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 24 }}>Use email & password to sign in</div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                placeholder="email@rabtnaturals.com"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button onClick={handlePasswordLogin} disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>

            {/* Demo shortcuts */}
            <div style={{ marginTop: 16, background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Quick Demo Login
              </div>
              {[
                { email: 'ayan@rabtnaturals.com', pass: 'Rabt@2026', label: '⚡ Ayan — Founder' },
                { email: 'tofik@rabtnaturals.com', pass: 'Tofik@123', label: '📊 Tofik — Manager' },
                { email: 'rahima@rabtnaturals.com', pass: 'Rahima@123', label: '🌿 Rahima — Specialist Manager' },
                { email: 'ops@rabtnaturals.com', pass: 'Ops@2026', label: '📦 Operations' },
              ].map((acc, i, arr) => (
                <div
                  key={i}
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass) }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--b1)' : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{acc.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{acc.pass}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
