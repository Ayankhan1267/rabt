'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316', pink: '#EC4899',
}

type CallType = 'specialist_alert' | 'order_confirmation' | 'appointment_reminder' | 'appointment_confirmation'
type CallStatus = 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer'

interface CallLog {
  id: string
  call_type: CallType
  to_name: string
  to_phone: string
  status: CallStatus
  duration_seconds: number | null
  summary: string | null
  transcript: string | null
  created_at: string
  vapi_call_id: string | null
}

interface ManualCallForm {
  callType: CallType
  toName: string
  toPhone: string
  toRole: 'customer' | 'specialist'
  // contextual fields
  consultationId: string
  orderId: string
  appointmentDate: string
  appointmentTime: string
  specialistName: string
  productName: string
  customerName: string
}

const CALL_TYPE_META: Record<CallType, { label: string; icon: string; color: string; desc: string; role: 'customer' | 'specialist' }> = {
  specialist_alert:         { label: 'Specialist Alert',          icon: '👩‍⚕️', color: C.teal,   desc: 'Naya consultation available hone par specialist ko call karta hai', role: 'specialist' },
  order_confirmation:       { label: 'Order Confirmation',        icon: '📦', color: C.green,  desc: 'Customer ka order confirm karta hai aur delivery details leta hai',  role: 'customer' },
  appointment_reminder:     { label: 'Appointment Reminder',      icon: '⏰', color: C.gold,   desc: 'Appointment se 24 ghante pehle customer ko yaad dilata hai',         role: 'customer' },
  appointment_confirmation: { label: 'Appointment Confirmation',  icon: '✅', color: C.purple, desc: 'Customer se appointment confirm ya reschedule karta hai',            role: 'customer' },
}

const STATUS_META: Record<CallStatus, { label: string; color: string; dot: string }> = {
  queued:       { label: 'Queued',      color: C.mu,     dot: '⬜' },
  ringing:      { label: 'Ringing...',  color: C.gold,   dot: '🔔' },
  in_progress:  { label: 'Live',        color: C.green,  dot: '🟢' },
  completed:    { label: 'Completed',   color: C.teal,   dot: '✅' },
  failed:       { label: 'Failed',      color: C.red,    dot: '❌' },
  no_answer:    { label: 'No Answer',   color: C.orange, dot: '📵' },
}

const TABS = ['Dashboard', 'Queue', 'Call Logs', 'Settings']

const DEFAULT_FORM: ManualCallForm = {
  callType: 'order_confirmation',
  toName: '', toPhone: '', toRole: 'customer',
  consultationId: '', orderId: '', appointmentDate: '', appointmentTime: '',
  specialistName: '', productName: '', customerName: '',
}

// ── Mock data for demo ─────────────────────────────────────────────────────
const MOCK_LOGS: CallLog[] = [
  { id: '1', call_type: 'order_confirmation', to_name: 'Priya Sharma', to_phone: '+919876543210', status: 'completed', duration_seconds: 142, summary: 'Order #4821 confirmed. Delivery address: MG Road, Indore. Customer requested COD.', transcript: null, created_at: new Date(Date.now() - 3600000).toISOString(), vapi_call_id: 'vapi_abc123' },
  { id: '2', call_type: 'appointment_reminder', to_name: 'Rahul Verma', to_phone: '+919765432109', status: 'completed', duration_seconds: 68, summary: 'Reminded about tomorrow 11:00 AM consultation with Dr. Aisha. Customer confirmed attendance.', transcript: null, created_at: new Date(Date.now() - 7200000).toISOString(), vapi_call_id: 'vapi_def456' },
  { id: '3', call_type: 'specialist_alert', to_name: 'Dr. Aisha Khan', to_phone: '+919654321098', status: 'completed', duration_seconds: 45, summary: 'Notified about new consultation from Sneha Patel — hairfall issue. Specialist confirmed availability.', transcript: null, created_at: new Date(Date.now() - 10800000).toISOString(), vapi_call_id: 'vapi_ghi789' },
  { id: '4', call_type: 'appointment_confirmation', to_name: 'Anita Joshi', to_phone: '+919543210987', status: 'no_answer', duration_seconds: null, summary: null, transcript: null, created_at: new Date(Date.now() - 14400000).toISOString(), vapi_call_id: 'vapi_jkl012' },
  { id: '5', call_type: 'order_confirmation', to_name: 'Vikram Singh', to_phone: '+919432109876', status: 'in_progress', duration_seconds: null, summary: null, transcript: null, created_at: new Date(Date.now() - 120000).toISOString(), vapi_call_id: 'vapi_mno345' },
]

const MOCK_QUEUE = [
  { id: 'q1', type: 'appointment_reminder' as CallType, name: 'Meera Agarwal', phone: '+919321098765', scheduled: '2 min', context: 'Appointment tomorrow 3:00 PM' },
  { id: 'q2', type: 'order_confirmation' as CallType, name: 'Deepak Rao', phone: '+919210987654', scheduled: '8 min', context: 'Order #4830 — Glow Serum x2' },
  { id: 'q3', type: 'specialist_alert' as CallType, name: 'Dr. Priya Nair', phone: '+919109876543', scheduled: '15 min', context: 'New consultation — acne treatment' },
]

function fmtDur(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function CallingAgentPage() {
  const [tab, setTab] = useState('Dashboard')
  const [logs, setLogs] = useState<CallLog[]>(MOCK_LOGS)
  const [queue] = useState(MOCK_QUEUE)
  const [form, setForm] = useState<ManualCallForm>(DEFAULT_FORM)
  const [calling, setCalling] = useState(false)
  const [expandLog, setExpandLog] = useState<string | null>(null)
  const [autoSettings, setAutoSettings] = useState({
    autoSpecialistAlert: true,
    autoOrderConfirm: true,
    autoReminderHours: '24',
    autoConfirmHours: '2',
    voice: 'Riya (Hindi/English)',
    language: 'hinglish',
    workingHoursStart: '09:00',
    workingHoursEnd: '20:00',
    maxRetries: '2',
  })

  // Poll for live calls
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/calling/logs')
        if (res.ok) {
          const data = await res.json()
          if (data.logs?.length) setLogs(data.logs)
        }
      } catch { /* use mock */ }
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const triggerCall = useCallback(async () => {
    if (!form.toPhone || !form.toName) { toast.error('Name aur phone number daalo'); return }
    if (!/^\+91[6-9]\d{9}$/.test(form.toPhone.replace(/\s/g, ''))) {
      toast.error('Valid Indian phone number daalo (+91XXXXXXXXXX)')
      return
    }
    setCalling(true)
    try {
      const res = await fetch('/api/calling/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Call started — ${form.toName} ko call ho raha hai`)
        setForm(DEFAULT_FORM)
        // Add optimistic log
        setLogs(l => [{
          id: data.callId || Date.now().toString(),
          call_type: form.callType,
          to_name: form.toName,
          to_phone: form.toPhone,
          status: 'ringing',
          duration_seconds: null,
          summary: null,
          transcript: null,
          created_at: new Date().toISOString(),
          vapi_call_id: data.vapiCallId || null,
        }, ...l])
      } else {
        toast.error(data.error || 'Call failed')
      }
    } catch {
      toast.error('Server se connect nahi ho paya')
    } finally {
      setCalling(false)
    }
  }, [form])

  const liveCalls = logs.filter(l => l.status === 'in_progress' || l.status === 'ringing')
  const todayCalls = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())
  const completedToday = todayCalls.filter(l => l.status === 'completed')

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: C.dark }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.teal},${C.teal2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📞</div>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: C.dark, margin: 0 }}>AI Calling Agent</h1>
            <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Specialist alerts · Order confirmation · Appointment reminders · Auto follow-up</p>
          </div>
          {liveCalls.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.green + '15', border: `1px solid ${C.green}40`, borderRadius: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{liveCalls.length} Live Call{liveCalls.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Live Calls', value: liveCalls.length.toString(), color: liveCalls.length > 0 ? C.green : C.mu, icon: '📞' },
          { label: 'Today Calls', value: todayCalls.length.toString(), color: C.teal, icon: '📅' },
          { label: 'Completed Today', value: completedToday.length.toString(), color: C.green, icon: '✅' },
          { label: 'Queue', value: queue.length.toString(), color: C.gold, icon: '⏳' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: k.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 11, color: C.mu, marginTop: 1 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 6, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: tab === t ? 700 : 500, background: tab === t ? `linear-gradient(135deg,${C.teal},${C.teal2})` : 'transparent', color: tab === t ? '#fff' : C.mu, transition: 'all 0.2s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {tab === 'Dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
          <div>
            {/* Live calls */}
            {liveCalls.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🟢 Live Calls</div>
                {liveCalls.map(c => (
                  <div key={c.id} style={{ background: C.green + '08', border: `1.5px solid ${C.green}40`, borderRadius: 14, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: C.green + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {CALL_TYPE_META[c.call_type].icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.to_name}</div>
                      <div style={{ fontSize: 12, color: C.mu }}>{c.to_phone} · {CALL_TYPE_META[c.call_type].label}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{STATUS_META[c.status].label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent logs */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>Recent Calls</div>
                <button onClick={() => setTab('Call Logs')} style={{ fontSize: 12, color: C.teal, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>View All →</button>
              </div>
              {logs.slice(0, 6).map((c, i) => {
                const meta = CALL_TYPE_META[c.call_type]
                const sMeta = STATUS_META[c.status]
                return (
                  <div key={i} style={{ padding: '14px 20px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandLog(expandLog === c.id ? null : c.id)}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.to_name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', color: meta.color }}>{meta.label}</span>
                      </div>
                      {expandLog === c.id && c.summary ? (
                        <div style={{ fontSize: 12, color: C.mu, marginTop: 4, lineHeight: 1.5 }}>{c.summary}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: C.mu, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary || c.to_phone}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: sMeta.color }}>{sMeta.dot} {sMeta.label}</div>
                      <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{fmtDur(c.duration_seconds)} · {fmtTime(c.created_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Call Panel */}
          <div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, position: 'sticky', top: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>⚡ Quick Call</div>

              {/* Call Type */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 8 }}>Call Type</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(Object.entries(CALL_TYPE_META) as [CallType, typeof CALL_TYPE_META[CallType]][]).map(([key, meta]) => (
                    <div key={key} onClick={() => setForm(f => ({ ...f, callType: key, toRole: meta.role }))}
                      style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${form.callType === key ? meta.color : C.border}`, background: form.callType === key ? meta.color + '10' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 18 }}>{meta.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: form.callType === key ? meta.color : C.dark }}>{meta.label}</div>
                        <div style={{ fontSize: 10, color: C.mu }}>{meta.role === 'specialist' ? 'Specialist ko' : 'Customer ko'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                  {form.toRole === 'specialist' ? 'Specialist' : 'Customer'} Name
                </label>
                <input value={form.toName} onChange={e => setForm(f => ({ ...f, toName: e.target.value }))} placeholder={form.toRole === 'specialist' ? 'Dr. Aisha Khan' : 'Priya Sharma'} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Phone Number</label>
                <input value={form.toPhone} onChange={e => setForm(f => ({ ...f, toPhone: e.target.value }))} placeholder="+919876543210" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
              </div>

              {/* Context fields */}
              {form.callType === 'order_confirmation' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Order ID</label>
                    <input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} placeholder="#4821" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Product</label>
                    <input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="Glow Serum 30ml" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}
              {(form.callType === 'appointment_reminder' || form.callType === 'appointment_confirmation') && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Appointment Date</label>
                    <input type="date" value={form.appointmentDate} onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Time</label>
                    <input type="time" value={form.appointmentTime} onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Specialist Name</label>
                    <input value={form.specialistName} onChange={e => setForm(f => ({ ...f, specialistName: e.target.value }))} placeholder="Dr. Aisha Khan" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}
              {form.callType === 'specialist_alert' && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Customer Name</label>
                    <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Sneha Patel" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Consultation ID</label>
                    <input value={form.consultationId} onChange={e => setForm(f => ({ ...f, consultationId: e.target.value }))} placeholder="CONS-2024-001" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              <button onClick={triggerCall} disabled={calling} style={{ width: '100%', padding: '13px', background: calling ? C.mu : `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: calling ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', marginTop: 4 }}>
                {calling ? '⏳ Connecting...' : '📞 Start Call'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUEUE TAB ── */}
      {tab === 'Queue' && (
        <div>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>Pending Call Queue</div>
                <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{queue.length} calls scheduled · Auto-trigger enabled</div>
              </div>
            </div>
            {queue.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.mu, fontSize: 14 }}>Queue khali hai — sab calls complete ho gayi ✅</div>
            ) : (
              queue.map((q, i) => {
                const meta = CALL_TYPE_META[q.type]
                return (
                  <div key={i} style={{ padding: '16px 20px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: meta.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{q.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', color: meta.color }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.mu }}>{q.phone} · {q.context}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>⏰ {q.scheduled}</div>
                        <div style={{ fontSize: 11, color: C.mu }}>tak start hogi</div>
                      </div>
                      <button onClick={() => toast.success(`${q.name} ko abhi call ho rahi hai`)} style={{ padding: '8px 14px', background: meta.color, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        Call Now
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Auto-trigger info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {[
              { icon: '👩‍⚕️', title: 'Specialist Alert', desc: 'Jab bhi naya consultation book ho, specialist ko turant call jaayegi', status: 'Active', color: C.teal },
              { icon: '📦', title: 'Order Confirmation', desc: 'Naya order place hone ke 5 min baad customer ko call jaayegi', status: 'Active', color: C.green },
              { icon: '⏰', title: 'Appointment Reminder', desc: '24 ghante pehle customer ko reminder call jaayegi', status: 'Active', color: C.gold },
              { icon: '✅', title: 'Appointment Confirmation', desc: '2 ghante pehle confirmation call jaayegi', status: 'Active', color: C.purple },
            ].map((t, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{t.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: C.green + '15', color: C.green }}>{t.status}</span>
                </div>
                <div style={{ fontSize: 12, color: C.mu, lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CALL LOGS TAB ── */}
      {tab === 'Call Logs' && (
        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700 }}>All Call Logs</div>
            <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{logs.length} total calls</div>
          </div>
          {logs.map((c, i) => {
            const meta = CALL_TYPE_META[c.call_type]
            const sMeta = STATUS_META[c.status]
            const open = expandLog === c.id
            return (
              <div key={i} style={{ borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: open ? C.bg : 'transparent' }} onClick={() => setExpandLog(open ? null : c.id)}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.to_name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: meta.color + '15', color: meta.color }}>{meta.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.mu, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.to_phone}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: sMeta.color }}>{sMeta.dot} {sMeta.label}</div>
                    <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{fmtDur(c.duration_seconds)} · {fmtTime(c.created_at)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: C.mu, marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
                </div>
                {open && (
                  <div style={{ padding: '0 20px 16px 72px', background: C.bg }}>
                    {c.summary && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', marginBottom: 4 }}>AI Summary</div>
                        <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, padding: '10px 14px', background: '#fff', borderRadius: 10, border: `1px solid ${C.border}` }}>{c.summary}</div>
                      </div>
                    )}
                    {c.vapi_call_id && (
                      <div style={{ fontSize: 11, color: C.mu }}>Call ID: {c.vapi_call_id}</div>
                    )}
                    {!c.summary && <div style={{ fontSize: 13, color: C.mu, fontStyle: 'italic' }}>Koi summary available nahi hai</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'Settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Auto-triggers */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Auto-Trigger Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'autoSpecialistAlert', label: 'New consultation → Specialist call', icon: '👩‍⚕️' },
                { key: 'autoOrderConfirm', label: 'New order → Customer confirmation', icon: '📦' },
              ].map(({ key, label, icon }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: C.bg, borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                  </div>
                  <div onClick={() => setAutoSettings(s => ({ ...s, [key]: !s[key as keyof typeof s] }))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: autoSettings[key as keyof typeof autoSettings] ? C.teal : C.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: autoSettings[key as keyof typeof autoSettings] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Reminder (hours before appointment)</label>
                <select value={autoSettings.autoReminderHours} onChange={e => setAutoSettings(s => ({ ...s, autoReminderHours: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  {['12', '24', '48'].map(h => <option key={h} value={h}>{h} hours pehle</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Confirmation (hours before appointment)</label>
                <select value={autoSettings.autoConfirmHours} onChange={e => setAutoSettings(s => ({ ...s, autoConfirmHours: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  {['1', '2', '4'].map(h => <option key={h} value={h}>{h} hour{parseInt(h) > 1 ? 's' : ''} pehle</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Max Retries (no answer)</label>
                <select value={autoSettings.maxRetries} onChange={e => setAutoSettings(s => ({ ...s, maxRetries: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  {['1', '2', '3'].map(r => <option key={r} value={r}>{r} baar</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Voice & Working Hours */}
          <div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Voice & Language</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>AI Voice</label>
                <select value={autoSettings.voice} onChange={e => setAutoSettings(s => ({ ...s, voice: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  <option>Riya (Hindi/English)</option>
                  <option>Priya (English)</option>
                  <option>Arjun (Hindi Male)</option>
                  <option>Neerja (Hinglish Female)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Language</label>
                <select value={autoSettings.language} onChange={e => setAutoSettings(s => ({ ...s, language: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  <option value="hinglish">Hinglish (Hindi + English mix)</option>
                  <option value="hindi">Pure Hindi</option>
                  <option value="english">English</option>
                </select>
              </div>
            </div>

            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Working Hours</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>From</label>
                  <input type="time" value={autoSettings.workingHoursStart} onChange={e => setAutoSettings(s => ({ ...s, workingHoursStart: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>To</label>
                  <input type="time" value={autoSettings.workingHoursEnd} onChange={e => setAutoSettings(s => ({ ...s, workingHoursEnd: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.mu, marginTop: 10 }}>In hours hi auto calls trigger hongi</div>
            </div>

            <button onClick={() => toast.success('Settings save ho gayi!')} style={{ width: '100%', padding: '13px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              💾 Save Settings
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
