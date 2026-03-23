'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

type WaitingItem = { id: number; patient: string; concern: string; mode: string; waitMin: number; avatar: string }
type ActiveItem = { id: number; patient: string; specialist: string; concern: string; mode: string; durationSec: number; avatar: string }
type CompletedItem = { id: number; patient: string; specialist: string; duration: string; productsCount: number; concern: string }

const SEED_WAITING: WaitingItem[] = [
  { id: 1, patient: 'Meera Joshi', concern: 'Acne & Breakouts', mode: 'Video', waitMin: 4, avatar: 'MJ' },
  { id: 2, patient: 'Aryan Kapoor', concern: 'Pigmentation', mode: 'Chat', waitMin: 11, avatar: 'AK' },
  { id: 3, patient: 'Sunita Rao', concern: 'Dryness & Sensitivity', mode: 'Audio', waitMin: 7, avatar: 'SR' },
]

const SEED_ACTIVE: ActiveItem[] = [
  { id: 4, patient: 'Aisha Patel', specialist: 'Dr. Priya Mehta', concern: 'Acne & Breakouts', mode: 'Video', durationSec: 754, avatar: 'AP' },
  { id: 5, patient: 'Rahul Sharma', specialist: 'Dr. Kavya Iyer', concern: 'Anti-Aging', mode: 'Chat', durationSec: 312, avatar: 'RS' },
]

const SEED_COMPLETED: CompletedItem[] = [
  { id: 6, patient: 'Neha Gupta', specialist: 'Dr. Arjun Kapoor', duration: '22 min', productsCount: 3, concern: 'Oily Skin' },
  { id: 7, patient: 'Zara Khan', specialist: 'Dr. Priya Mehta', duration: '19 min', productsCount: 2, concern: 'Pigmentation' },
  { id: 8, patient: 'Priya Nair', specialist: 'Dr. Kavya Iyer', duration: '18 min', productsCount: 4, concern: 'Anti-Aging' },
  { id: 9, patient: 'Kavya Singh', specialist: 'Dr. Arjun Kapoor', duration: '20 min', productsCount: 2, concern: 'Eczema' },
  { id: 10, patient: 'Dev Patel', specialist: 'Dr. Priya Mehta', duration: '15 min', productsCount: 1, concern: 'Acne' },
]

const SPECIALISTS = ['Dr. Priya Mehta', 'Dr. Kavya Iyer', 'Dr. Arjun Kapoor', 'Dr. Rohan Verma']

function fmtTimer(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const ModeIcon = ({ mode }: { mode: string }) => {
  const icons: Record<string, string> = { Video: '📹', Chat: '💬', Audio: '🎙️' }
  return <span>{icons[mode] || '📋'}</span>
}

export default function ConsultationQueue() {
  const [waiting, setWaiting] = useState<WaitingItem[]>(SEED_WAITING)
  const [active, setActive] = useState<ActiveItem[]>(SEED_ACTIVE)
  const [completed] = useState<CompletedItem[]>(SEED_COMPLETED)
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>(() => Object.fromEntries(SEED_ACTIVE.map(a => [a.id, a.durationSec])))
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [assignDropdown, setAssignDropdown] = useState<number | null>(null)
  const [selectedSpecialist, setSelectedSpecialist] = useState<Record<number, string>>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // live timer tick
  useEffect(() => {
    const t = setInterval(() => {
      setActiveTimers(prev => {
        const next = { ...prev }
        active.forEach(a => { next[a.id] = (next[a.id] || 0) + 1 })
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [active])

  // auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { setLastUpdated(new Date()) }, 30000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh])

  function assignSpecialist(waitId: number, specialist: string) {
    const item = waiting.find(w => w.id === waitId)
    if (!item) return
    setWaiting(prev => prev.filter(w => w.id !== waitId))
    const newActive: ActiveItem = { id: item.id, patient: item.patient, specialist, concern: item.concern, mode: item.mode, durationSec: 0, avatar: item.avatar }
    setActive(prev => [...prev, newActive])
    setActiveTimers(prev => ({ ...prev, [item.id]: 0 }))
    setAssignDropdown(null)
  }

  function cancelWaiting(id: number) {
    setWaiting(prev => prev.filter(w => w.id !== id))
  }

  function endSession(id: number) {
    setActive(prev => prev.filter(a => a.id !== id))
  }

  const alertItems = waiting.filter(w => w.waitMin > 10)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>Live Consultation Queue</h1>
          <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>Last updated: {lastUpdated.toLocaleTimeString('en-IN')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, color: C.mu }}>Auto-refresh (30s)</span>
            <div onClick={() => setAutoRefresh(!autoRefresh)} style={{ width: 40, height: 22, borderRadius: 11, background: autoRefresh ? C.teal : '#D1D5DB', cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 3, left: autoRefresh ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
          </div>
          <button onClick={() => setLastUpdated(new Date())} style={{ padding: '7px 14px', background: C.teal, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertItems.length > 0 && (
        <div style={{ background: '#FEF2F2', border: `1px solid ${C.red}40`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>
            {alertItems.length} consultation{alertItems.length > 1 ? 's' : ''} waiting {alertItems.map(a => `${a.waitMin} minutes`).join(', ')} — assign specialist now
          </span>
        </div>
      )}

      {/* Kanban Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>

        {/* Column 1: Waiting */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Waiting</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: C.red + '20', color: C.red }}>{waiting.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {waiting.map(w => (
              <div key={w.id} style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${w.waitMin > 10 ? C.red + '60' : C.border}`, boxShadow: w.waitMin > 10 ? `0 0 0 2px ${C.red}20` : '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{w.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.patient}</div>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{w.concern}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: C.mu }}><ModeIcon mode={w.mode} /> {w.mode}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: w.waitMin > 10 ? C.red : C.mu }}>{w.waitMin} min waiting</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <button
                      onClick={() => setAssignDropdown(assignDropdown === w.id ? null : w.id)}
                      style={{ width: '100%', padding: '6px 10px', background: C.teal, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Assign Specialist ▾
                    </button>
                    {assignDropdown === w.id && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4 }}>
                        {SPECIALISTS.map(sp => (
                          <div key={sp} onClick={() => assignSpecialist(w.id, sp)} style={{ padding: '9px 12px', fontSize: 12, color: C.dark, cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
                            onMouseOver={e => (e.currentTarget.style.background = C.cream)}
                            onMouseOut={e => (e.currentTarget.style.background = '#fff')}
                          >{sp}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => cancelWaiting(w.id)} style={{ padding: '6px 10px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ))}
            {waiting.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 14, padding: '24px', textAlign: 'center', border: `1px dashed ${C.border}`, color: C.mu, fontSize: 13 }}>
                No patients waiting
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Active */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Active</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: C.green + '20', color: C.green }}>{active.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(a => (
              <div key={a.id} style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${C.green}50`, boxShadow: '0 0 0 2px rgba(16,185,129,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0, position: 'relative' }}>
                    {a.avatar}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: C.red, border: '2px solid #fff' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{a.patient}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>{a.specialist}</div>
                  </div>
                </div>
                <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 12px', marginBottom: 10, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: C.green, letterSpacing: '0.05em' }}>{fmtTimer(activeTimers[a.id] || a.durationSec)}</div>
                  <div style={{ fontSize: 10, color: C.mu }}>Live Duration</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{a.concern}</span>
                  <span style={{ fontSize: 12, color: C.mu }}><ModeIcon mode={a.mode} /> {a.mode}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ flex: 1, padding: '6px', background: C.blue + '18', color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Monitor</button>
                  <button onClick={() => endSession(a.id)} style={{ flex: 1, padding: '6px', background: C.red + '15', color: C.red, border: `1px solid ${C.red}40`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>End Session</button>
                </div>
              </div>
            ))}
            {active.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 14, padding: '24px', textAlign: 'center', border: `1px dashed ${C.border}`, color: C.mu, fontSize: 13 }}>
                No active sessions
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Completed Today */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Completed Today</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: C.mu + '20', color: C.mu }}>{completed.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completed.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.mu, fontWeight: 700 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{c.patient}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>{c.specialist}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.mu }}>⏱ {c.duration}</span>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: C.purple + '15', color: C.purple, fontWeight: 600 }}>💊 {c.productsCount} products</span>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.cream, color: C.mu }}>{c.concern}</span>
                </div>
                <button style={{ width: '100%', padding: '6px', background: C.cream, color: C.dark, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  📋 View Report
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div style={{ background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', borderRadius: 16, padding: '16px 24px', color: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 20 }}>
          {[
            { label: 'Avg Wait Time', value: '3.2 min', icon: '⏳' },
            { label: 'Avg Consultation', value: '18 min', icon: '⏱' },
            { label: 'Satisfaction', value: '4.8 ★', icon: '⭐' },
            { label: 'Total Today', value: `${waiting.length + active.length + completed.length + 19}`, icon: '📋' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
