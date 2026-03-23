'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

const APPOINTMENTS = [
  { id: 1, time: '10:30 AM', patient: 'Aisha Patel', concern: 'Acne & Breakouts', mode: 'Video', status: 'completed', duration: 20, fee: 499 },
  { id: 2, time: '11:00 AM', patient: 'Rahul Sharma', concern: 'Pigmentation', mode: 'Audio', status: 'completed', duration: 20, fee: 499 },
  { id: 3, time: '12:00 PM', patient: 'Neha Gupta', concern: 'Dryness & Dehydration', mode: 'Chat', status: 'active', duration: 20, fee: 499 },
  { id: 4, time: '01:30 PM', patient: 'Zara Khan', concern: 'Anti-Aging', mode: 'Video', status: 'upcoming', duration: 20, fee: 499 },
  { id: 5, time: '03:00 PM', patient: 'Meera Joshi', concern: 'Oily Skin', mode: 'Video', status: 'upcoming', duration: 20, fee: 499 },
  { id: 6, time: '04:30 PM', patient: 'Aryan Kapoor', concern: 'Eczema', mode: 'Chat', status: 'upcoming', duration: 20, fee: 499 },
]

const PATIENTS = [
  { id: 1, name: 'Aisha Patel', lastVisit: 'Mar 20', concern: 'Acne', progress: 78, sessions: 6, avatar: 'AP', history: [{ date: 'Mar 20, 2025', notes: 'Improving significantly, prescribed Niacinamide 10% + Benzoyl Peroxide 2.5%', products: ['Niacinamide Serum', 'Gentle Cleanser'] }, { date: 'Feb 28, 2025', notes: 'Moderate acne, comedones on forehead. Started basic routine.', products: ['Salicylic Acid Wash'] }] },
  { id: 2, name: 'Rahul Sharma', lastVisit: 'Mar 18', concern: 'Pigmentation', progress: 45, sessions: 3, avatar: 'RS', history: [{ date: 'Mar 18, 2025', notes: 'Post-inflammatory hyperpigmentation improving. Added Vitamin C.', products: ['Vitamin C Serum', 'SPF 50'] }] },
  { id: 3, name: 'Neha Gupta', lastVisit: 'Mar 15', concern: 'Dryness', progress: 62, sessions: 4, avatar: 'NG', history: [{ date: 'Mar 15, 2025', notes: 'Skin barrier improving with ceramide routine.', products: ['Ceramide Moisturizer', 'Hyaluronic Acid'] }] },
  { id: 4, name: 'Zara Khan', lastVisit: 'Mar 10', concern: 'Anti-Aging', progress: 30, sessions: 2, avatar: 'ZK', history: [{ date: 'Mar 10, 2025', notes: 'Started retinol at low concentration. Monitoring irritation.', products: ['Retinol 0.025%', 'SPF 50+'] }] },
  { id: 5, name: 'Meera Joshi', lastVisit: 'Mar 08', concern: 'Oily Skin', progress: 55, sessions: 5, avatar: 'MJ', history: [{ date: 'Mar 08, 2025', notes: 'Sebum production reducing. Niacinamide effective.', products: ['Niacinamide 10%', 'Oil-free Moisturizer'] }] },
  { id: 6, name: 'Aryan Kapoor', lastVisit: 'Mar 05', concern: 'Eczema', progress: 40, sessions: 3, avatar: 'AK', history: [{ date: 'Mar 05, 2025', notes: 'Flare-up controlled. Prescribed topical corticosteroid short-term.', products: ['Ceramide Cream', 'Gentle Soap-free Wash'] }] },
  { id: 7, name: 'Priya Nair', lastVisit: 'Feb 28', concern: 'Rosacea', progress: 50, sessions: 4, avatar: 'PN', history: [{ date: 'Feb 28, 2025', notes: 'Redness reducing. Avoiding triggers.', products: ['Centella Serum', 'Mineral SPF'] }] },
  { id: 8, name: 'Kavya Singh', lastVisit: 'Feb 22', concern: 'Hyperpigmentation', progress: 68, sessions: 7, avatar: 'KS', history: [{ date: 'Feb 22, 2025', notes: 'Great progress with alpha arbutin.', products: ['Alpha Arbutin', 'AHA Toner'] }] },
]

const EARNINGS_TABLE = [
  { date: 'Mar 20', patient: 'Aisha Patel', duration: 20, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 20', patient: 'Rahul Sharma', duration: 18, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 19', patient: 'Neha Gupta', duration: 22, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 18', patient: 'Zara Khan', duration: 20, fee: 699, commission: 175, net: 524 },
  { date: 'Mar 17', patient: 'Meera Joshi', duration: 19, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 16', patient: 'Aryan Kapoor', duration: 25, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 15', patient: 'Priya Nair', duration: 20, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 14', patient: 'Kavya Singh', duration: 20, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 13', patient: 'Aisha Patel', duration: 21, fee: 499, commission: 125, net: 374 },
  { date: 'Mar 12', patient: 'Rahul Sharma', duration: 18, fee: 349, commission: 87, net: 262 },
]

const CHART_DATA = [
  { month: 'Oct', value: 14200 },
  { month: 'Nov', value: 16800 },
  { month: 'Dec', value: 19400 },
  { month: 'Jan', value: 21200 },
  { month: 'Feb', value: 22100 },
  { month: 'Mar', value: 18400 },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '6:30', '7:00']

function buildInitialSlots() {
  const slots: Record<string, string> = {}
  DAYS.forEach(d => {
    HOURS.forEach(h => {
      const key = `${d}-${h}`
      if (h === '1:00' || h === '1:30') { slots[key] = 'blocked' }
      else if (d === 'Sun') { slots[key] = 'blocked' }
      else if (['10:00', '10:30', '11:00', '2:00', '2:30'].includes(h) && ['Mon', 'Tue', 'Wed'].includes(d)) { slots[key] = 'booked' }
      else { slots[key] = 'available' }
    })
  })
  return slots
}

export default function SpecialistPanel() {
  const [tab, setTab] = useState<'schedule' | 'patients' | 'earnings' | 'availability'>('schedule')
  const [online, setOnline] = useState(true)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientNote, setPatientNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutUPI, setPayoutUPI] = useState('')
  const [slots, setSlots] = useState<Record<string, string>>(buildInitialSlots())
  const [maxPerDay, setMaxPerDay] = useState(8)
  const [lunchBreak, setLunchBreak] = useState(true)
  const [vacationMode, setVacationMode] = useState(false)
  const [vacationFrom, setVacationFrom] = useState('')
  const [vacationTo, setVacationTo] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayStats = {
    total: APPOINTMENTS.length,
    completed: APPOINTMENTS.filter(a => a.status === 'completed').length,
    upcoming: APPOINTMENTS.filter(a => a.status === 'upcoming').length,
    earnings: APPOINTMENTS.filter(a => a.status === 'completed').reduce((s, a) => s + a.fee, 0),
  }

  const filteredPatients = PATIENTS.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.concern.toLowerCase().includes(patientSearch.toLowerCase()))

  function toggleSlot(key: string) {
    setSlots(prev => {
      const cur = prev[key]
      if (cur === 'booked') return prev
      return { ...prev, [key]: cur === 'available' ? 'blocked' : 'available' }
    })
  }

  function saveSchedule() {
    setSavedMsg('Schedule saved successfully!')
    setTimeout(() => setSavedMsg(''), 3000)
  }

  const maxChart = Math.max(...CHART_DATA.map(d => d.value))

  const modeIcon = (mode: string) => mode === 'Video' ? '📹' : mode === 'Audio' ? '🎙️' : '💬'
  const statusBadge = (status: string) => {
    if (status === 'completed') return { bg: C.green + '18', color: C.green, label: '✅ Completed' }
    if (status === 'active') return { bg: C.red + '18', color: C.red, label: '🔴 LIVE' }
    return { bg: C.gold + '18', color: C.gold, label: '⏰ Upcoming' }
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '18px 24px', marginBottom: 24, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 700 }}>P</div>
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: 0 }}>Welcome, Dr. Priya Mehta</h1>
              <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>{today}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: online ? C.green : C.mu, boxShadow: online ? `0 0 0 3px ${C.green}33` : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: online ? C.green : C.mu }}>{online ? 'Online' : 'Offline'}</span>
            <div onClick={() => setOnline(!online)} style={{ width: 42, height: 22, borderRadius: 11, background: online ? C.green : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: online ? 23 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {([['schedule', "Today's Schedule"], ['patients', 'My Patients'], ['earnings', 'Earnings'], ['availability', 'Availability']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${tab === key ? C.teal : C.border}`, background: tab === key ? C.teal : '#fff', color: tab === key ? '#fff' : C.mu, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Today's Schedule */}
      {tab === 'schedule' && (
        <div>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: "Today's Consultations", value: todayStats.total, icon: '📋', color: C.teal },
              { label: 'Completed', value: todayStats.completed, icon: '✅', color: C.green },
              { label: 'Upcoming', value: todayStats.upcoming, icon: '⏰', color: C.gold },
              { label: 'Earnings Today', value: `₹${todayStats.earnings}`, icon: '💰', color: C.purple },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: C.dark }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: C.dark, margin: 0 }}>Today's Appointments</h3>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: C.teal + '15', color: C.teal, fontWeight: 700, marginLeft: 'auto' }}>Mar 23, 2026</span>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {APPOINTMENTS.map((appt, i) => {
                const badge = statusBadge(appt.status)
                return (
                  <div key={appt.id} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: i < APPOINTMENTS.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'flex-start' }}>
                    {/* Timeline dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: appt.status === 'active' ? C.red : appt.status === 'completed' ? C.green : C.gold, border: `2px solid #fff`, boxShadow: appt.status === 'active' ? `0 0 0 3px ${C.red}33` : 'none' }} />
                      {i < APPOINTMENTS.length - 1 && <div style={{ width: 2, height: 40, background: C.border, marginTop: 4 }} />}
                    </div>
                    {/* Time */}
                    <div style={{ width: 70, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{appt.time}</div>
                      <div style={{ fontSize: 10, color: C.mu }}>{appt.duration} min</div>
                    </div>
                    {/* Card */}
                    <div style={{ flex: 1, background: appt.status === 'active' ? '#FFF1F1' : C.bg, borderRadius: 12, padding: '12px 16px', border: `1px solid ${appt.status === 'active' ? C.red + '40' : C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{appt.patient}</div>
                          <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>{appt.concern}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{modeIcon(appt.mode)} {appt.mode}</span>
                          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: badge.bg, color: badge.color, fontWeight: 700 }}>{badge.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>₹{appt.fee}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {(appt.status === 'active' || appt.status === 'upcoming') && (
                          <button style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(16,185,129,0.35)' }}>
                            📹 Join Call
                          </button>
                        )}
                        <button style={{ padding: '6px 14px', background: '#fff', color: C.teal, border: `1px solid ${C.teal}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Notes</button>
                        <button style={{ padding: '6px 14px', background: '#fff', color: C.mu, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Write Report</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Patients */}
      {tab === 'patients' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
            <input
              type="text" placeholder="Search patients by name or concern..."
              value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
            />
            <span style={{ fontSize: 12, color: C.mu }}>{filteredPatients.length} patients</span>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                  {['Patient', 'Last Visit', 'Concern', 'Progress', 'Total Sessions', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < filteredPatients.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{p.avatar}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.mu }}>{p.lastVisit}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: C.dark }}>{p.concern}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
                          <div style={{ width: `${p.progress}%`, height: '100%', background: p.progress >= 70 ? C.green : p.progress >= 40 ? C.gold : C.red, borderRadius: 3, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: p.progress >= 70 ? C.green : p.progress >= 40 ? C.gold : C.red, minWidth: 32 }}>{p.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{p.sessions}</span>
                      <span style={{ fontSize: 11, color: C.mu }}> sessions</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setSelectedPatient(p)} style={{ padding: '5px 12px', background: C.teal, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>View</button>
                        <button style={{ padding: '5px 12px', background: '#fff', color: C.mu, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Message</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Earnings */}
      {tab === 'earnings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'This Month', value: '₹18,400', icon: '📅', color: C.teal },
              { label: 'Last Month', value: '₹22,100', icon: '📆', color: C.green },
              { label: 'Total Earnings', value: '₹1,84,000', icon: '💎', color: C.purple },
              { label: 'Pending Payout', value: '₹18,400', icon: '⏳', color: C.gold },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: C.dark }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Monthly Earnings — Last 6 Months</h3>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
              {CHART_DATA.map(d => (
                <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: C.mu, fontWeight: 600 }}>₹{(d.value / 1000).toFixed(0)}k</div>
                  <div style={{ width: '100%', background: `linear-gradient(180deg, ${C.teal}, ${C.teal2})`, borderRadius: '6px 6px 0 0', height: `${(d.value / maxChart) * 80}px`, transition: 'height 0.4s', minHeight: 4 }} />
                  <div style={{ fontSize: 11, color: C.mu, fontWeight: 600 }}>{d.month}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings Table */}
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Recent Consultations</h3>
              <button onClick={() => setShowPayoutModal(true)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                💸 Request Payout
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  {['Date', 'Patient', 'Duration', 'Fee', 'Platform Commission', 'Net Earnings'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EARNINGS_TABLE.map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: C.mu }}>{row.date}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>{row.patient}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: C.mu }}>{row.duration} min</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>₹{row.fee}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: C.red }}>-₹{row.commission}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: C.green }}>₹{row.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Availability */}
      {tab === 'availability' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
            {/* Grid */}
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Weekly Schedule Grid</h3>
                <p style={{ fontSize: 11, color: C.mu, margin: '4px 0 0' }}>Click available/blocked slots to toggle. Booked slots cannot be changed.</p>
              </div>
              <div style={{ overflowX: 'auto', padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)`, gap: 3, minWidth: 560 }}>
                  <div />
                  {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.dark, padding: '4px 0' }}>{d}</div>)}
                  {HOURS.map(h => (
                    <>
                      <div key={h} style={{ fontSize: 10, color: C.mu, display: 'flex', alignItems: 'center', paddingRight: 6, justifyContent: 'flex-end' }}>{h}</div>
                      {DAYS.map(d => {
                        const key = `${d}-${h}`
                        const s = slots[key]
                        const bg = s === 'booked' ? C.blue + '25' : s === 'blocked' ? C.red + '25' : C.green + '25'
                        const border = s === 'booked' ? C.blue : s === 'blocked' ? C.red : C.green
                        return (
                          <div key={key} onClick={() => toggleSlot(key)} style={{ height: 22, borderRadius: 4, background: bg, border: `1px solid ${border}40`, cursor: s === 'booked' ? 'default' : 'pointer', transition: 'background 0.15s' }} title={`${d} ${h} — ${s}`} />
                        )
                      })}
                    </>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  {[['Available', C.green], ['Blocked', C.red], ['Booked', C.blue]].map(([l, c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: c + '35', border: `1px solid ${c}60` }} />
                      <span style={{ fontSize: 11, color: C.mu }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Lunch break */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Lunch Break (1–2 PM)</span>
                  <div onClick={() => setLunchBreak(!lunchBreak)} style={{ width: 40, height: 22, borderRadius: 11, background: lunchBreak ? C.teal : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: lunchBreak ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: C.mu, margin: 0 }}>Automatically block 1:00–2:00 PM slots</p>
              </div>

              {/* Max per day */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Max Consultations / Day</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: C.teal }}>{maxPerDay}</span>
                </div>
                <input type="range" min={1} max={12} value={maxPerDay} onChange={e => setMaxPerDay(Number(e.target.value))} style={{ width: '100%', accentColor: C.teal }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.mu, marginTop: 4 }}>
                  <span>1</span><span>12</span>
                </div>
              </div>

              {/* Vacation Mode */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Vacation Mode</span>
                  <div onClick={() => setVacationMode(!vacationMode)} style={{ width: 40, height: 22, borderRadius: 11, background: vacationMode ? C.orange : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: 3, left: vacationMode ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </div>
                </div>
                {vacationMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: C.mu, display: 'block', marginBottom: 4 }}>From</label>
                      <input type="date" value={vacationFrom} onChange={e => setVacationFrom(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: C.mu, display: 'block', marginBottom: 4 }}>To</label>
                      <input type="date" value={vacationTo} onChange={e => setVacationTo(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={saveSchedule} style={{ padding: '11px', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                💾 Save Schedule
              </button>
              {savedMsg && <div style={{ fontSize: 12, color: C.green, fontWeight: 600, textAlign: 'center' }}>✅ {savedMsg}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div onClick={() => { setSelectedPatient(null); setShowNoteInput(false); setPatientNote('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{selectedPatient.avatar}</div>
                <div>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: C.dark, margin: 0 }}>{selectedPatient.name}</h2>
                  <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>{selectedPatient.sessions} sessions · Last visit {selectedPatient.lastVisit}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>

            {/* Skin Profile */}
            <div style={{ background: C.cream, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Skin Profile Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Primary Concern', selectedPatient.concern], ['Progress', `${selectedPatient.progress}% improved`], ['Sessions Completed', selectedPatient.sessions], ['Last Visit', selectedPatient.lastVisit]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: C.mu, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>Overall Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: selectedPatient.progress >= 70 ? C.green : selectedPatient.progress >= 40 ? C.gold : C.red }}>{selectedPatient.progress}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                <div style={{ width: `${selectedPatient.progress}%`, height: '100%', background: selectedPatient.progress >= 70 ? C.green : selectedPatient.progress >= 40 ? C.gold : C.red, borderRadius: 4 }} />
              </div>
            </div>

            {/* Consultation History */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Consultation History</div>
              {selectedPatient.history.map((h: any, i: number) => (
                <div key={i} style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{h.date}</div>
                  <div style={{ fontSize: 12, color: C.dark, marginBottom: 8, lineHeight: 1.5 }}>{h.notes}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {h.products.map((p: string) => (
                      <span key={p} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>💊 {p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Photos */}
            <div style={{ background: C.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: `1px dashed ${C.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 12, color: C.mu }}>Progress Photos — No photos uploaded yet</div>
            </div>

            {/* Write Note */}
            {!showNoteInput ? (
              <button onClick={() => setShowNoteInput(true)} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ✍️ Write Note
              </button>
            ) : (
              <div>
                <textarea
                  value={patientNote} onChange={e => setPatientNote(e.target.value)}
                  placeholder="Enter consultation notes, recommendations, next steps..."
                  style={{ width: '100%', height: 90, padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => { setShowNoteInput(false); setPatientNote('') }} style={{ flex: 1, padding: 9, background: '#fff', color: C.mu, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => { setShowNoteInput(false) }} style={{ flex: 2, padding: 9, background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save Note</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div onClick={() => setShowPayoutModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: 0 }}>Request Payout</h2>
              <button onClick={() => setShowPayoutModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.mu }}>✕</button>
            </div>
            <div style={{ background: C.cream, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mu, marginBottom: 4 }}>Amount to be paid out</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: C.dark }}>₹18,400</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>UPI ID</label>
              <input
                type="text" placeholder="yourname@upi"
                value={payoutUPI} onChange={e => setPayoutUPI(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Bank Account (optional)</label>
              <input type="text" placeholder="Account number" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <input type="text" placeholder="IFSC Code" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button onClick={() => setShowPayoutModal(false)} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              💸 Submit Payout Request
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
