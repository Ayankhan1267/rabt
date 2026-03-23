'use client'
import { useState } from 'react'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6',
  orange: '#F97316',
}

type NotifType = 'orders' | 'vendors' | 'consultations' | 'reviews' | 'system'
type NotifFilter = 'all' | NotifType

interface Notification {
  id: number
  type: NotifType
  title: string
  description: string
  timeLabel: string
  group: 'today' | 'yesterday' | 'thisweek'
  read: boolean
  icon: string
}

const INITIAL_NOTIFS: Notification[] = [
  { id: 1, type: 'orders', title: 'New order #DQ-00891', description: '₹649 from Aisha Patel — Rose Hip Brightening Serum', timeLabel: '2 min ago', group: 'today', read: false, icon: '📦' },
  { id: 2, type: 'vendors', title: 'New product submitted for approval', description: 'Vendor GlowMart submitted "Peptide Repair Serum" — awaiting review', timeLabel: '15 min ago', group: 'today', read: false, icon: '🏪' },
  { id: 3, type: 'consultations', title: 'Consultation booked — Dr. Priya', description: 'Rahul Sharma booked a video consultation for today at 4:00 PM', timeLabel: '1 hr ago', group: 'today', read: false, icon: '🧴' },
  { id: 4, type: 'reviews', title: '5★ review posted for Vitamin C Serum', description: 'Neha Gupta left a 5-star review: "Amazing results in just 2 weeks!"', timeLabel: '2 hrs ago', group: 'today', read: true, icon: '⭐' },
  { id: 5, type: 'orders', title: 'Low stock alert: Niacinamide Serum', description: 'Only 8 units remaining — reorder from Minimalist vendor', timeLabel: '3 hrs ago', group: 'today', read: false, icon: '📦' },
  { id: 6, type: 'vendors', title: 'KYC submitted by HerbalRoots', description: 'HerbalRoots Organics uploaded KYC documents — pending verification', timeLabel: '5 hrs ago', group: 'today', read: false, icon: '🏪' },
  { id: 7, type: 'orders', title: 'Order #DQ-00878 dispatched', description: 'Bluedart picked up order for Aditya Roy — AWB: BD98731452', timeLabel: '6 hrs ago', group: 'today', read: true, icon: '📦' },
  { id: 8, type: 'consultations', title: 'Specialist Dr. Kavya went offline', description: 'Dr. Kavya Iyer is now offline — 1 patient in queue reassigned', timeLabel: '8 hrs ago', group: 'today', read: false, icon: '🧴' },
  { id: 9, type: 'orders', title: 'Payout of ₹18,400 processed', description: 'Payout to Minimalist India transferred via NEFT — UTR: ICI231234', timeLabel: 'Yesterday, 11:30 AM', group: 'yesterday', read: true, icon: '📦' },
  { id: 10, type: 'system', title: 'AI model retrained successfully', description: 'DermIQ AI model updated — +1.8% recommendation accuracy improvement', timeLabel: 'Yesterday, 2:15 PM', group: 'yesterday', read: true, icon: '⚙️' },
  { id: 11, type: 'reviews', title: '3★ review flagged for moderation', description: 'Saurabh Tiwari left a 3★ review with potential policy violation', timeLabel: 'Yesterday, 4:00 PM', group: 'yesterday', read: false, icon: '⭐' },
  { id: 12, type: 'vendors', title: 'Vendor NaturalCo updated catalog', description: '6 new products added by NaturalCo Wellness — review required', timeLabel: 'Yesterday, 6:20 PM', group: 'yesterday', read: true, icon: '🏪' },
  { id: 13, type: 'orders', title: '12 orders delivered today', description: 'Mar 22 delivery milestone: 12 orders completed, ₹6,840 in revenue', timeLabel: 'Yesterday, 8:00 PM', group: 'yesterday', read: true, icon: '📦' },
  { id: 14, type: 'system', title: 'Scheduled maintenance complete', description: 'Platform maintenance window (2:00–3:00 AM) completed without issues', timeLabel: 'Mon, Mar 21, 3:00 AM', group: 'thisweek', read: true, icon: '⚙️' },
  { id: 15, type: 'consultations', title: 'New specialist onboarded', description: 'Dr. Rohan Verma (Dermatologist) has completed profile setup — now active', timeLabel: 'Mon, Mar 21, 10:00 AM', group: 'thisweek', read: true, icon: '🧴' },
]

type NotifChannel = 'app' | 'email' | 'whatsapp'
interface NotifSetting {
  label: string
  key: string
  channels: NotifChannel[]
}

const NOTIF_SETTINGS: NotifSetting[] = [
  { label: 'New Orders', key: 'orders', channels: ['app', 'email'] },
  { label: 'Vendor Submissions', key: 'vendors', channels: ['app', 'whatsapp'] },
  { label: 'Consultations', key: 'consultations', channels: ['app'] },
  { label: 'Reviews', key: 'reviews', channels: ['email'] },
  { label: 'System Alerts', key: 'system', channels: ['app', 'email', 'whatsapp'] },
]

const TYPE_LABELS: Record<NotifFilter, string> = {
  all: 'All', orders: 'Orders', vendors: 'Vendors', consultations: 'Consultations', reviews: 'Reviews', system: 'System',
}

const TYPE_ICONS: Record<NotifType, string> = {
  orders: '📦', vendors: '🏪', consultations: '🧴', reviews: '⭐', system: '⚙️',
}

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS)
  const [filter, setFilter] = useState<NotifFilter>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [enabledChannels, setEnabledChannels] = useState<Record<string, NotifChannel[]>>(
    Object.fromEntries(NOTIF_SETTINGS.map(s => [s.key, s.channels]))
  )
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  function markRead(id: number) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  function dismiss(id: number) {
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  function toggleChannel(key: string, channel: NotifChannel) {
    setEnabledChannels(prev => {
      const current = prev[key] || []
      const next = current.includes(channel) ? current.filter(c => c !== channel) : [...current, channel]
      return { ...prev, [key]: next }
    })
  }

  const counts: Record<NotifFilter, number> = {
    all: notifs.length,
    orders: notifs.filter(n => n.type === 'orders').length,
    vendors: notifs.filter(n => n.type === 'vendors').length,
    consultations: notifs.filter(n => n.type === 'consultations').length,
    reviews: notifs.filter(n => n.type === 'reviews').length,
    system: notifs.filter(n => n.type === 'system').length,
  }

  const unreadCounts: Record<NotifFilter, number> = {
    all: notifs.filter(n => !n.read).length,
    orders: notifs.filter(n => n.type === 'orders' && !n.read).length,
    vendors: notifs.filter(n => n.type === 'vendors' && !n.read).length,
    consultations: notifs.filter(n => n.type === 'consultations' && !n.read).length,
    reviews: notifs.filter(n => n.type === 'reviews' && !n.read).length,
    system: notifs.filter(n => n.type === 'system' && !n.read).length,
  }

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter)

  const grouped: Record<string, Notification[]> = {
    today: filtered.filter(n => n.group === 'today'),
    yesterday: filtered.filter(n => n.group === 'yesterday'),
    thisweek: filtered.filter(n => n.group === 'thisweek'),
  }
  const GROUP_LABELS: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', thisweek: 'This Week' }

  const channelBadge = (ch: NotifChannel, active: boolean) => {
    const colors: Record<NotifChannel, string> = { app: C.teal, email: C.blue, whatsapp: C.green }
    return (
      <button
        key={ch}
        onClick={() => toggleChannel('', ch)}
        style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${active ? colors[ch] : C.border}`, background: active ? colors[ch] + '18' : '#fff', color: active ? colors[ch] : C.mu }}
      >
        {ch === 'app' ? '📱 App' : ch === 'email' ? '✉️ Email' : '💬 WhatsApp'}
      </button>
    )
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>Notification Center</h1>
          <p style={{ fontSize: 12, color: C.mu, margin: 0 }}>{notifs.filter(n => !n.read).length} unread notifications</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={markAllRead} style={{ padding: '8px 14px', background: '#fff', color: C.teal, border: `1px solid ${C.teal}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ✓ Mark All Read
          </button>
          <button onClick={() => setShowSettings(!showSettings)} style={{ padding: '8px 14px', background: showSettings ? C.teal : '#fff', color: showSettings ? '#fff' : C.dark, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showSettings ? '220px 1fr 300px' : '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Sidebar */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', position: 'sticky', top: 20 }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filter</div>
          </div>
          {(['all', 'orders', 'vendors', 'consultations', 'reviews', 'system'] as NotifFilter[]).map(f => (
            <div
              key={f}
              onClick={() => setFilter(f)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', cursor: 'pointer', background: filter === f ? C.teal + '10' : '#fff', borderLeft: filter === f ? `3px solid ${C.teal}` : '3px solid transparent', borderBottom: `1px solid ${C.border}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>{f === 'all' ? '🔔' : TYPE_ICONS[f as NotifType]}</span>
                <span style={{ fontSize: 13, fontWeight: filter === f ? 600 : 400, color: filter === f ? C.teal : C.dark }}>{TYPE_LABELS[f]}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {unreadCounts[f] > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: C.red, color: '#fff' }}>{unreadCounts[f]}</span>
                )}
                <span style={{ fontSize: 11, color: C.mu }}>({counts[f]})</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Notification List */}
        <div>
          {Object.entries(grouped).map(([group, items]) => {
            if (items.length === 0) return null
            return (
              <div key={group} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
                  {GROUP_LABELS[group]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map(n => (
                    <div
                      key={n.id}
                      onMouseEnter={() => setHoveredId(n.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        background: n.read ? C.cream : '#fff',
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: `1px solid ${C.border}`,
                        borderLeft: !n.read ? `3px solid ${C.teal}` : `3px solid transparent`,
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        transition: 'box-shadow 0.15s',
                        boxShadow: hoveredId === n.id ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                        position: 'relative',
                      }}
                    >
                      {/* Icon */}
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: n.read ? '#F3F4F6' : C.teal + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {n.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: C.dark }}>{n.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.teal }} />}
                            <span style={{ fontSize: 11, color: C.mu, whiteSpace: 'nowrap' }}>{n.timeLabel}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: C.mu, marginTop: 3, lineHeight: 1.5 }}>{n.description}</div>

                        {/* Action buttons — visible on hover */}
                        {hoveredId === n.id && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                            {!n.read && (
                              <button onClick={() => markRead(n.id)} style={{ padding: '4px 10px', background: C.teal + '15', color: C.teal, border: `1px solid ${C.teal}30`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                ✓ Mark Read
                              </button>
                            )}
                            <button style={{ padding: '4px 10px', background: C.blue + '15', color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              View
                            </button>
                            <button onClick={() => dismiss(n.id)} style={{ padding: '4px 10px', background: '#F3F4F6', color: C.mu, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '48px', textAlign: 'center', border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 6 }}>No notifications</div>
              <div style={{ fontSize: 13, color: C.mu }}>Nothing here for the selected filter.</div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', position: 'sticky', top: 20 }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.cream }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: C.dark, margin: 0 }}>Notification Settings</h3>
            </div>
            <div style={{ padding: '14px' }}>
              {NOTIF_SETTINGS.map(setting => {
                const active = enabledChannels[setting.key] || []
                return (
                  <div key={setting.key} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 8 }}>
                      {TYPE_ICONS[setting.key as NotifType]} {setting.label}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(['app', 'email', 'whatsapp'] as NotifChannel[]).map(ch => {
                        const isOn = active.includes(ch)
                        const colors: Record<NotifChannel, string> = { app: C.teal, email: C.blue, whatsapp: C.green }
                        const chLabel: Record<NotifChannel, string> = { app: '📱 App', email: '✉️ Email', whatsapp: '💬 WhatsApp' }
                        return (
                          <button
                            key={ch}
                            onClick={() => toggleChannel(setting.key, ch)}
                            style={{
                              padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              border: `1px solid ${isOn ? colors[ch] : C.border}`,
                              background: isOn ? colors[ch] + '18' : '#F9FAFB',
                              color: isOn ? colors[ch] : C.mu,
                              transition: 'all 0.15s',
                            }}
                          >
                            {chLabel[ch]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop: 4 }}>
                <button style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#2D5F5A,#3D7A74)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  💾 Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
