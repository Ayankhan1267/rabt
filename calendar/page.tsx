'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const EVENT_TYPES = ['task', 'meeting', 'launch', 'deadline', 'reminder', 'consultation']
const TYPE_COLORS: Record<string, string> = {
  task: 'var(--blue)', meeting: 'var(--purple)', launch: 'var(--gold)',
  deadline: 'var(--red)', reminder: 'var(--orange)', consultation: 'var(--green)'
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', start_at: '', end_at: '', type: 'task', assigned_to: '', is_all_day: true })

  useEffect(() => { loadAll() }, [currentDate])

  async function loadAll() {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const [eventsRes, profilesRes] = await Promise.all([
      supabase.from('events').select('*, assigned_to(id,name)').gte('start_at', start).lte('start_at', end),
      supabase.from('profiles').select('*'),
    ])
    setEvents(eventsRes.data || [])
    setProfiles(profilesRes.data || [])
  }

  async function addEvent() {
    if (!form.title || !form.start_at) { toast.error('Fill required fields'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('events').insert({
      title: form.title, description: form.description,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      type: form.type, assigned_to: form.assigned_to || null,
      is_all_day: form.is_all_day, color: TYPE_COLORS[form.type],
      created_by: user?.id,
    })
    toast.success('Event added!')
    setShowAdd(false)
    setForm({ title: '', description: '', start_at: '', end_at: '', type: 'task', assigned_to: '', is_all_day: true })
    loadAll()
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    toast.success('Event deleted')
    loadAll()
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    setSelectedDay(null)
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    setSelectedDay(null)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const getEventsForDay = (day: number) => events.filter(e => {
    const d = new Date(e.start_at)
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
  })

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  const inputStyle: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Calendar <span style={{ color: 'var(--gold)' }}>{MONTHS[month]} {year}</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>{events.length} events this month</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={prevMonth} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 14, cursor: 'pointer' }}>←</button>
          <button onClick={() => setCurrentDate(new Date())} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>Today</button>
          <button onClick={nextMonth} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 14, cursor: 'pointer' }}>→</button>
          <button onClick={() => setShowAdd(true)} style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>+ Event</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Calendar Grid */}
        <div className="card">
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 8 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--mu)', padding: '6px 0' }}>{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array(firstDay).fill(null).map((_, i) => <div key={'empty-' + i} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1
              const dayEvents = getEventsForDay(day)
              const isTodayDay = isToday(day)
              const isSelected = selectedDay === day
              return (
                <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)} style={{
                  minHeight: 70, padding: '6px 5px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${isTodayDay ? 'var(--gold)' : isSelected ? 'var(--blue)' : 'var(--b1)'}`,
                  background: isTodayDay ? 'var(--gL)' : isSelected ? 'var(--blL)' : 'transparent',
                  transition: 'all 0.12s'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', marginBottom: 3, fontFamily: 'DM Mono', color: isTodayDay ? 'var(--gold)' : 'var(--mu2)' }}>{day}</div>
                  {dayEvents.slice(0, 3).map((ev, ei) => (
                    <div key={ei} style={{
                      fontSize: 9.5, padding: '1px 5px', borderRadius: 4, marginBottom: 2,
                      background: TYPE_COLORS[ev.type] + '22', color: TYPE_COLORS[ev.type],
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600
                    }}>{ev.title}</div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: 9, color: 'var(--mu)', textAlign: 'center' }}>+{dayEvents.length - 3}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div>
          {/* Event Type Legend */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Event Types</div>
            {EVENT_TYPES.map(type => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[type] }} />
                <span style={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--mu2)' }}>{type}</span>
              </div>
            ))}
          </div>

          {/* Selected Day Events */}
          {selectedDay && (
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
                {MONTHS[month]} {selectedDay}
              </div>
              {selectedDayEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--mu)', fontSize: 12 }}>
                  No events<br />
                  <span style={{ color: 'var(--gold)', cursor: 'pointer', fontSize: 11 }} onClick={() => { setForm(p => ({ ...p, start_at: `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}T09:00` })); setShowAdd(true) }}>+ Add event</span>
                </div>
              ) : selectedDayEvents.map(ev => (
                <div key={ev.id} style={{ background: 'var(--s2)', borderLeft: `3px solid ${TYPE_COLORS[ev.type]}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 3 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 4 }}>{new Date(ev.start_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  {ev.description && <div style={{ fontSize: 11.5, color: 'var(--mu2)', marginBottom: 6 }}>{ev.description}</div>}
                  {ev.assigned_to?.name && <div style={{ fontSize: 11, color: 'var(--green)' }}>→ {ev.assigned_to.name}</div>}
                  <button onClick={() => deleteEvent(ev.id)} style={{ marginTop: 6, padding: '2px 8px', background: 'var(--rdL)', border: 'none', borderRadius: 5, color: 'var(--red)', fontSize: 10, cursor: 'pointer', fontFamily: 'Outfit' }}>Delete</button>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Events */}
          {!selectedDay && (
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Upcoming</div>
              {events.filter(e => new Date(e.start_at) >= new Date()).slice(0, 5).map(ev => (
                <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                  <div style={{ width: 3, background: TYPE_COLORS[ev.type], borderRadius: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{new Date(ev.start_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              ))}
              {events.filter(e => new Date(e.start_at) >= new Date()).length === 0 && (
                <p style={{ color: 'var(--mu)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No upcoming events</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>📅 New Event</div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Title*</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" style={inputStyle} autoFocus />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Start*</label>
                <input type="datetime-local" value={form.start_at} onChange={e => setForm(p => ({ ...p, start_at: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>End</label>
                <input type="datetime-local" value={form.end_at} onChange={e => setForm(p => ({ ...p, end_at: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Assign To</label>
                <select value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} style={inputStyle}>
                  <option value="">— All —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={addEvent} style={{ flex: 1, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Add Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
