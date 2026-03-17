'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase, ROLE_CONFIG, UserProfile } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface NavItem {
  id: string
  label: string
  icon: string
  href: string
  badge?: string
  badgeColor?: string
  roles?: string[]
}

interface NavSection {
  label: string
  items: NavItem[]
  roles?: string[]
}

const NAV: NavSection[] = [
  {
    label: 'Command',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '⚡', href: '/dashboard', roles: ['founder', 'manager'] },
      { id: 'specialist-dashboard', label: 'Specialist HQ', icon: '🌿', href: '/specialist-dashboard', roles: ['specialist_manager', 'specialist'] },
      { id: 'admin', label: 'Admin Panel', icon: '🛡️', href: '/admin', roles: ['founder'] },
      { id: 'kanban', label: 'Kanban', icon: '⬜', href: '/kanban' },
      { id: 'calendar', label: 'Calendar', icon: '📅', href: '/calendar' },
    ]
  },
  {
    label: 'Sales',
    items: [
      { id: 'crm', label: 'CRM / Leads', icon: '👥', href: '/crm', roles: ['founder', 'manager', 'specialist_manager', 'specialist', 'support'] },
      { id: 'orders', label: 'Orders', icon: '📦', href: '/orders', roles: ['founder', 'manager', 'ops', 'support'] },
      { id: 'inventory', label: 'Inventory', icon: '🗄️', href: '/inventory', roles: ['founder', 'manager', 'ops'] },
    ]
  },
  {
    label: 'Specialist',
    roles: ['founder', 'specialist_manager', 'specialist'],
    items: [
      { id: 'consultations', label: 'Consultations', icon: '🧴', href: '/consultations' },
      { id: 'specialists', label: 'Specialists', icon: '👩‍⚕️', href: '/specialists', roles: ['founder', 'specialist_manager'] },
      { id: 'earnings', label: 'My Earnings', icon: '💰', href: '/earnings', roles: ['specialist'] },
    ]
  },
  {
    label: 'Support',
    items: [
      { id: 'support', label: 'Support Chat', icon: '💬', href: '/support', badge: '5', badgeColor: 'var(--red)' },
    
      
    ]
  },
  {
    label: 'Marketing',
    roles: ['founder', 'manager'],
    items: [
      { id: 'marketing', label: 'Marketing', icon: '📢', href: '/marketing' },
      { id: 'content', label: 'Content Studio', icon: '🎬', href: '/content' },
      { id: 'ads', label: 'Ads Manager', icon: '📊', href: '/ads' },
    ]
  },
  {
    label: 'Business',
    roles: ['founder', 'manager'],
    items: [
      { id: 'finance', label: 'Finance', icon: '💰', href: '/finance' },
      { id: 'productlab', label: 'Product Lab', icon: '🧪', href: '/productlab' },
      { id: 'goals', label: 'Goals & OKR', icon: '🎯', href: '/goals' },
      { id: 'team', label: 'Team', icon: '🤝', href: '/team' },
    ]
  },
  {
    label: 'AI System',
    items: [
      { id: 'automation', label: 'Automation', icon: '⚙️', href: '/automation', roles: ['founder', 'manager'] },
      { id: 'aiagents', label: 'AI Agents', icon: '🤖', href: '/aiagents', badge: 'Live', badgeColor: 'var(--green)' },
      { id: 'knowledge', label: 'Knowledge Base', icon: '📚', href: '/knowledge' },
    ]
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    loadProfile()
    setupRealtime()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) {
      // Auto-create profile
      const role = user.email === 'ayan@rabtnaturals.com' ? 'founder' : 'support'
      await supabase.from('profiles').upsert({ id: user.id, email: user.email, name: user.email?.split('@')[0] || 'User', role })
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      prof = data
    }
    setProfile(prof as UserProfile)
    loadNotifications(user.id)
  }

  async function loadNotifications(userId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setUnreadCount((data || []).filter((n: any) => !n.is_read).length)
  }

  function setupRealtime() {
    supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const notif = payload.new as any
        // Play sound for consultation notifications
        if (notif.type === 'consultation') {
          playNotificationSound()
        }
        setNotifications(prev => [notif, ...prev])
        setUnreadCount(prev => prev + 1)
        toast(notif.title, { icon: notif.type === 'consultation' ? '🌿' : notif.type === 'order' ? '📦' : '🔔' })
      })
      .subscribe()
  }

  function playNotificationSound() {
    // Create audio context for notification sound
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.setValueAtTime(440, ctx.currentTime)
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  async function markAllRead() {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out!')
  }

  const roleConfig = profile ? ROLE_CONFIG[profile.role] : null
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const hasAccess = (item: NavItem | NavSection) => {
    if (!profile) return false
    if (profile.role === 'founder') return true
    const roles = item.roles
    if (!roles) return true
    return roles.includes(profile.role)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', background: 'var(--s1)', borderRight: '1px solid var(--b1)',
        height: '100vh', position: 'fixed', top: 0, left: 0,
        display: 'flex', flexDirection: 'column', overflowY: 'auto', zIndex: 200
      }}>
        {/* Brand */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--b1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 34, height: 34, background: 'linear-gradient(135deg,#D4A853,#B87C30)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: '#08090C', flexShrink: 0
            }}>R</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>
                Rabt <span style={{ color: 'var(--gold)' }}>HQ</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Business OS</div>
            </div>
          </div>
          {roleConfig && (
            <div style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center',
              fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: roleConfig.color + '22', color: roleConfig.color,
              border: `1px solid ${roleConfig.color}44`, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {roleConfig.label}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '9px' }}>
          {NAV.map(section => {
            if (!hasAccess(section)) return null
            return (
              <div key={section.label} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--mu)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 8px 3px', fontWeight: 600 }}>
                  {section.label}
                </div>
                {section.items.map(item => {
                  if (!hasAccess(item)) return null
                  const active = isActive(item.href)
                  return (
                    <a key={item.id} href={item.href} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 9px', borderRadius: 8, cursor: 'pointer',
                      color: active ? 'var(--gold)' : 'var(--mu2)',
                      background: active ? 'var(--gL)' : 'transparent',
                      fontWeight: active ? 600 : 400, fontSize: 12.5,
                      transition: 'all 0.13s', marginBottom: 1, textDecoration: 'none'
                    }}>
                      <span style={{ fontSize: 14, width: 17, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                          background: item.badgeColor ? item.badgeColor + '22' : 'rgba(239,68,68,0.15)',
                          color: item.badgeColor || 'var(--red)',
                          fontFamily: 'DM Mono'
                        }}>{item.badge}</span>
                      )}
                    </a>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '11px 13px', borderTop: '1px solid var(--b1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: roleConfig?.bg || 'var(--s2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne', fontSize: 12, fontWeight: 800, color: '#fff'
            }}>
              {profile?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name || 'Loading...'}</div>
              <div style={{ fontSize: 10, color: 'var(--mu)' }}>{roleConfig?.label || ''}</div>
            </div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
          </div>
          <button onClick={logout} style={{
            width: '100%', marginTop: 9, padding: '6px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)',
            borderRadius: 8, color: 'var(--mu2)', fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit'
          }}>↩ Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          background: 'rgba(8,9,12,0.9)', backdropFilter: 'blur(18px)',
          borderBottom: '1px solid var(--b1)', padding: '0 24px', height: 52,
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800 }}>
            {NAV.flatMap(s => s.items).find(i => isActive(i.href))?.label || 'Dashboard'}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotif(!showNotif); if (!showNotif && unreadCount > 0) markAllRead() }}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
                }}
              >🔔</button>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 14, height: 14, borderRadius: '50%', background: 'var(--red)',
                  border: '2px solid var(--bg)', fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>

            {/* Date */}
            <div style={{
              fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono',
              padding: '5px 10px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--b1)', borderRadius: 6
            }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Notification Panel */}
        {showNotif && (
          <div style={{
            position: 'fixed', top: 52, right: 0, width: 320, height: 'calc(100vh - 52px)',
            background: 'var(--s1)', borderLeft: '1px solid var(--b2)', zIndex: 500,
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>Notifications</span>
              <button onClick={() => setShowNotif(false)} style={{ background: 'none', border: 'none', color: 'var(--mu)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mu)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                  <div style={{ fontSize: 13 }}>No notifications yet</div>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} style={{
                  background: 'var(--s2)', border: `1px solid ${n.is_read ? 'var(--b1)' : 'rgba(212,168,83,0.3)'}`,
                  borderLeft: n.is_read ? undefined : '3px solid var(--gold)',
                  borderRadius: 8, padding: '11px 13px', marginBottom: 8, cursor: 'pointer'
                }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--mu2)', lineHeight: 1.45 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: 'var(--mu)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div style={{ flex: 1, padding: '22px 24px 40px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
