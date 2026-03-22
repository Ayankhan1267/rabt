'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Tab = 'general' | 'whatsapp' | 'notifications' | 'crm' | 'integrations' | 'security' | 'apikeys'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'general',       icon: '🏢', label: 'General' },
  { id: 'whatsapp',      icon: '💬', label: 'WhatsApp' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'crm',           icon: '🎯', label: 'CRM Pipeline' },
  { id: 'integrations',  icon: '🔌', label: 'Integrations' },
  { id: 'security',      icon: '🔒', label: 'Security' },
  { id: 'apikeys',       icon: '🔑', label: 'API Keys' },
]

const CRM_STAGES = [
  { key: 'just_login',              label: 'Just Login',              color: '#94A3B8' },
  { key: 'new',                     label: 'New Lead',                color: '#60A5FA' },
  { key: 'contacted',               label: 'Contacted',               color: '#818CF8' },
  { key: 'consultation_pending',    label: 'Consultation Pending',    color: '#F59E0B' },
  { key: 'consultation_booked',     label: 'Consultation Booked',     color: '#FBBF24' },
  { key: 'consultation_accepted',   label: 'Consultation Accepted',   color: '#34D399' },
  { key: 'consultation_rescheduled',label: 'Consultation Rescheduled',color: '#FB923C' },
  { key: 'consultation_completed',  label: 'Consultation Completed',  color: '#10B981' },
  { key: 'routine_purchased',       label: 'Routine Purchased',       color: '#A78BFA' },
  { key: 'converted',               label: 'Converted',               color: '#22C55E' },
  { key: 'consultation_cancelled',  label: 'Cancelled',               color: '#F87171' },
  { key: 'lost',                    label: 'Lost',                    color: '#6B7280' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // General
  const [general, setGeneral] = useState({
    company_name: 'Rabt Naturals',
    tagline: 'Skin Science. Real Results.',
    email: 'hello@rabtnaturals.com',
    phone: '+91 9876543210',
    website: 'https://rabtnaturals.com',
    address: 'Mumbai, Maharashtra, India',
    gst: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    logo_url: '',
  })

  // WhatsApp
  const [waStatus, setWaStatus] = useState<any>(null)
  const [waLoading, setWaLoading] = useState(false)
  const waPollerRef = useRef<any>(null)

  // Notifications
  const [notifs, setNotifs] = useState({
    wa_new_order: true,
    wa_new_lead: true,
    wa_consultation: true,
    wa_payment: true,
    push_new_order: true,
    push_new_lead: false,
    email_daily_summary: false,
    email_weekly_report: true,
  })

  // CRM
  const [crmConfig, setCrmConfig] = useState({
    auto_assign: false,
    default_stage: 'new',
    auto_advance_on_consult: true,
    auto_advance_on_purchase: true,
    follow_up_days: '3',
  })

  // Security
  const [security, setSecurity] = useState({
    otp_expiry_minutes: '10',
    session_days: '30',
    require_phone_for_all: true,
  })

  // API Keys
  const [apiKeys, setApiKeys] = useState({
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    VAPID_EMAIL: '',
    STREAM_API_KEY: '',
    STREAM_API_SECRET: '',
    RABT_JWT_SECRET: '',
    NEXT_PUBLIC_MONGO_API_URL: '',
    NEXT_PUBLIC_APP_URL: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_WHATSAPP_NUMBER: '',
    TWILIO_PHONE_NUMBER: '',
    OTP_METHOD: 'wa_bridge',
  })
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [savingKeys, setSavingKeys] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 768))
    loadSettings()
    return () => { if (waPollerRef.current) clearInterval(waPollerRef.current) }
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('hq_settings').select('key,value')
    if (!data) return
    const map: Record<string, any> = {}
    data.forEach((r: any) => { map[r.key] = r.value })
    if (map.general)       setGeneral(g => ({ ...g, ...map.general }))
    if (map.notifications) setNotifs(n => ({ ...n, ...map.notifications }))
    if (map.crm_config)    setCrmConfig(c => ({ ...c, ...map.crm_config }))
    if (map.security)      setSecurity(s => ({ ...s, ...map.security }))
    if (map.api_keys)      setApiKeys(k => ({ ...k, ...map.api_keys }))
  }

  async function saveSetting(key: string, value: any) {
    setSaving(true)
    const { error } = await supabase.from('hq_settings').upsert({ key, value }, { onConflict: 'key' })
    setSaving(false)
    if (error) { toast.error('Save failed: ' + error.message); return }
    toast.success('Saved!')
  }

  // WhatsApp helpers
  async function loadWaStatus() {
    setWaLoading(true)
    try {
      const res = await fetch('/api/wa/status')
      const data = await res.json()
      setWaStatus(data)
      if (data.status === 'scanning' && !waPollerRef.current) {
        waPollerRef.current = setInterval(async () => {
          const r = await fetch('/api/wa/status')
          const d = await r.json()
          setWaStatus(d)
          if (d.status === 'connected') { clearInterval(waPollerRef.current); waPollerRef.current = null }
        }, 3000)
      }
    } catch { setWaStatus({ status: 'error' }) }
    setWaLoading(false)
  }

  async function initWa() {
    setWaLoading(true)
    try {
      const res = await fetch('/api/wa/init', { method: 'POST' })
      const data = await res.json()
      setWaStatus(data)
      if (data.status === 'scanning' && !waPollerRef.current) {
        waPollerRef.current = setInterval(async () => {
          const r = await fetch('/api/wa/status')
          const d = await r.json()
          setWaStatus(d)
          if (d.status === 'connected') { clearInterval(waPollerRef.current); waPollerRef.current = null; toast.success('WhatsApp connected!') }
        }, 3000)
      }
    } catch { toast.error('Init failed') }
    setWaLoading(false)
  }

  async function saveApiKeys() {
    setSavingKeys(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session?.access_token || ''),
        },
        body: JSON.stringify({ keys: apiKeys }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      toast.success('API keys saved & config cache cleared!')
    } catch (e: any) {
      toast.error(e.message)
    }
    setSavingKeys(false)
  }

  async function logoutWa() {
    if (!confirm('WhatsApp disconnect karein?')) return
    if (waPollerRef.current) { clearInterval(waPollerRef.current); waPollerRef.current = null }
    await fetch('/api/wa/logout', { method: 'POST' })
    setWaStatus({ status: 'disconnected', qr: null, phone: null })
    toast.success('WhatsApp logged out')
  }

  const sectionTitle = (title: string, sub?: string) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 800 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 3 }}>{sub}</div>}
    </div>
  )

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>{label}</label>
      {node}
    </div>
  )

  const inp = (value: string, onChange: (v: string) => void, placeholder?: string, type = 'text') => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', boxSizing: 'border-box' }} />
  )

  const sel = (value: string, onChange: (v: string) => void, options: {value: string; label: string}[]) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  const toggle = (label: string, sub: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--b1)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 2 }}>{sub}</div>
      </div>
      <div onClick={() => onChange(!checked)} style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
        background: checked ? 'linear-gradient(135deg,#D4A853,#B87C30)' : 'var(--b2)',
      }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  )

  const saveBtn = (onClick: () => void) => (
    <button onClick={onClick} disabled={saving}
      style={{ marginTop: 20, padding: '10px 28px', background: saving ? 'rgba(212,168,83,0.5)' : 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Syne' }}>
      {saving ? 'Saving...' : 'Save Changes'}
    </button>
  )

  const card = (children: React.ReactNode, style?: any) => (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 14, padding: '22px 24px', marginBottom: 16, ...style }}>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>
          ⚙️ <span style={{ color: 'var(--gold)' }}>Settings</span>
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--mu)', marginTop: 4 }}>HQ panel ka complete configuration</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid var(--b1)', paddingBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'whatsapp') loadWaStatus() }}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
              background: tab === t.id ? 'var(--gL)' : 'transparent',
              color: tab === t.id ? 'var(--gold)' : 'var(--mu2)',
              border: '1px solid ' + (tab === t.id ? 'rgba(212,168,83,0.3)' : 'var(--b1)'),
              transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {tab === 'general' && (
        <>
          {card(<>
            {sectionTitle('🏢 Brand & Company', 'Basic company information across the HQ panel')}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
              {field('Company Name', inp(general.company_name, v => setGeneral(g => ({ ...g, company_name: v })), 'Rabt Naturals'))}
              {field('Tagline', inp(general.tagline, v => setGeneral(g => ({ ...g, tagline: v })), 'Skin Science. Real Results.'))}
              {field('Business Email', inp(general.email, v => setGeneral(g => ({ ...g, email: v })), 'hello@rabtnaturals.com', 'email'))}
              {field('Business Phone', inp(general.phone, v => setGeneral(g => ({ ...g, phone: v })), '+91 9876543210'))}
              {field('Website', inp(general.website, v => setGeneral(g => ({ ...g, website: v })), 'https://rabtnaturals.com'))}
              {field('GST Number', inp(general.gst, v => setGeneral(g => ({ ...g, gst: v })), '27AABCU9603R1ZX'))}
            </div>
            {field('Address', inp(general.address, v => setGeneral(g => ({ ...g, address: v })), 'Mumbai, Maharashtra'))}
            {field('Logo URL', inp(general.logo_url, v => setGeneral(g => ({ ...g, logo_url: v })), 'https://...'))}
            {saveBtn(() => saveSetting('general', general))}
          </>)}

          {card(<>
            {sectionTitle('🌍 Regional Settings', 'Timezone, currency and locale')}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
              {field('Currency', sel(general.currency, v => setGeneral(g => ({ ...g, currency: v })), [
                { value: 'INR', label: '₹ INR — Indian Rupee' },
                { value: 'USD', label: '$ USD — US Dollar' },
                { value: 'AED', label: 'AED — UAE Dirham' },
              ]))}
              {field('Timezone', sel(general.timezone, v => setGeneral(g => ({ ...g, timezone: v })), [
                { value: 'Asia/Kolkata',  label: 'Asia/Kolkata (IST +5:30)' },
                { value: 'Asia/Dubai',    label: 'Asia/Dubai (GST +4:00)' },
                { value: 'UTC',           label: 'UTC +0:00' },
              ]))}
            </div>
            {saveBtn(() => saveSetting('general', general))}
          </>)}
        </>
      )}

      {/* ── WHATSAPP ── */}
      {tab === 'whatsapp' && (
        <>
          {card(<>
            {sectionTitle('💬 WhatsApp Bridge', 'OTP login aur notifications ke liye WhatsApp connect karen')}

            {waLoading && !waStatus && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--mu)', fontSize: 13 }}>Checking status...</div>
            )}

            {/* Status row */}
            {waStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--s2)', borderRadius: 10, marginBottom: 20, border: '1px solid var(--b1)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: waStatus.status === 'connected' ? '#22C55E' : waStatus.status === 'scanning' ? '#F59E0B' : '#EF4444' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>
                    {waStatus.status === 'connected' ? 'Connected' : waStatus.status === 'scanning' ? 'Waiting for QR scan...' : 'Disconnected'}
                  </div>
                  {waStatus.phone && <div style={{ fontSize: 11.5, color: 'var(--mu)', fontFamily: 'DM Mono', marginTop: 2 }}>+{waStatus.phone}</div>}
                </div>
                {waStatus.status === 'connected' && (
                  <span style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(34,197,94,0.12)', color: '#22C55E', borderRadius: 20, fontWeight: 700 }}>LIVE</span>
                )}
              </div>
            )}

            {/* QR Code */}
            {waStatus?.status === 'scanning' && waStatus?.qr && (
              <div style={{ textAlign: 'center', padding: '0 0 20px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--gold)', fontWeight: 600, marginBottom: 12 }}>
                  WhatsApp → Linked Devices → Link a Device → Scan QR
                </div>
                <img src={waStatus.qr} alt="WA QR Code" style={{ width: 230, height: 230, borderRadius: 14, border: '2px solid var(--b2)', display: 'block', margin: '0 auto' }} />
                <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 10 }}>Auto-refreshes every 3 seconds...</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {waStatus?.status !== 'connected' && (
                <button onClick={initWa} disabled={waLoading}
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: waLoading ? 'not-allowed' : 'pointer', fontFamily: 'Syne' }}>
                  {waLoading ? 'Connecting...' : waStatus?.status === 'scanning' ? 'Reinitialize' : 'Connect WhatsApp'}
                </button>
              )}
              {waStatus?.status === 'connected' && (
                <button onClick={logoutWa}
                  style={{ padding: '10px 22px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
                  Disconnect
                </button>
              )}
              <button onClick={loadWaStatus}
                style={{ padding: '10px 18px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu)', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
                Refresh Status
              </button>
            </div>
          </>)}

          {card(<>
            {sectionTitle('ℹ️ How It Works')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { step: '1', text: 'Click "Connect WhatsApp" — QR code appear hoga' },
                { step: '2', text: 'Apne phone pe WhatsApp open karen' },
                { step: '3', text: 'Settings → Linked Devices → Link a Device → QR scan karen' },
                { step: '4', text: 'Connected hone ke baad sab team members OTP se login kar sakte hain' },
                { step: '5', text: 'Agar Render restart ho toh session /tmp mein hota hai — phir se scan karna padega' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', color: 'var(--gold)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.step}</div>
                  <div style={{ fontSize: 13, color: 'var(--mu2)', paddingTop: 3 }}>{item.text}</div>
                </div>
              ))}
            </div>
          </>)}
        </>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifications' && (
        <>
          {card(<>
            {sectionTitle('📲 WhatsApp Notifications', 'Kaunsi events pe WA message bheja jaye')}
            {toggle('New Order', 'Har naye order pe founder/manager ko WA alert', notifs.wa_new_order, v => setNotifs(n => ({ ...n, wa_new_order: v })))}
            {toggle('New Lead', 'Naya CRM lead aane pe assigned specialist ko alert', notifs.wa_new_lead, v => setNotifs(n => ({ ...n, wa_new_lead: v })))}
            {toggle('Consultation Booked', 'Consultation book hone pe specialist ko WA', notifs.wa_consultation, v => setNotifs(n => ({ ...n, wa_consultation: v })))}
            {toggle('Payment Received', 'Payment confirm hone pe finance team ko alert', notifs.wa_payment, v => setNotifs(n => ({ ...n, wa_payment: v })))}
            {saveBtn(() => saveSetting('notifications', notifs))}
          </>)}

          {card(<>
            {sectionTitle('🔔 Push Notifications', 'Browser push notification preferences')}
            {toggle('New Order Alert', 'Browser notification on new order', notifs.push_new_order, v => setNotifs(n => ({ ...n, push_new_order: v })))}
            {toggle('New Lead Alert', 'Browser notification on new lead', notifs.push_new_lead, v => setNotifs(n => ({ ...n, push_new_lead: v })))}
            {saveBtn(() => saveSetting('notifications', notifs))}
          </>)}

          {card(<>
            {sectionTitle('📧 Email Reports', 'Scheduled email reports')}
            {toggle('Daily Summary Email', 'Roz subah revenue, orders, leads ka summary', notifs.email_daily_summary, v => setNotifs(n => ({ ...n, email_daily_summary: v })))}
            {toggle('Weekly Report Email', 'Har Somvar last week ka detailed report', notifs.email_weekly_report, v => setNotifs(n => ({ ...n, email_weekly_report: v })))}
            {saveBtn(() => saveSetting('notifications', notifs))}
          </>)}
        </>
      )}

      {/* ── CRM ── */}
      {tab === 'crm' && (
        <>
          {card(<>
            {sectionTitle('🎯 CRM Pipeline Config', 'Leads aur consultations ka automatic flow')}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
              {field('Default Stage for New Leads', sel(crmConfig.default_stage, v => setCrmConfig(c => ({ ...c, default_stage: v })),
                CRM_STAGES.map(s => ({ value: s.key, label: s.label }))))}
              {field('Follow-up Reminder (days)', inp(crmConfig.follow_up_days, v => setCrmConfig(c => ({ ...c, follow_up_days: v })), '3', 'number'))}
            </div>
            {toggle('Auto-advance on Consultation', 'Consultation book hone pe stage auto update ho', crmConfig.auto_advance_on_consult, v => setCrmConfig(c => ({ ...c, auto_advance_on_consult: v })))}
            {toggle('Auto-advance on Purchase', 'Order place hone pe stage "Routine Purchased" ho jaye', crmConfig.auto_advance_on_purchase, v => setCrmConfig(c => ({ ...c, auto_advance_on_purchase: v })))}
            {toggle('Auto-assign New Leads', 'Naye leads automatically available specialist ko assign ho', crmConfig.auto_assign, v => setCrmConfig(c => ({ ...c, auto_assign: v })))}
            {saveBtn(() => saveSetting('crm_config', crmConfig))}
          </>)}

          {card(<>
            {sectionTitle('📊 CRM Stage Reference', 'All stages in order')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {CRM_STAGES.map((s, i) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--s2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono', width: 20, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{s.key}</span>
                </div>
              ))}
            </div>
          </>)}
        </>
      )}

      {/* ── INTEGRATIONS ── */}
      {tab === 'integrations' && (
        <>
          {card(<>
            {sectionTitle('🗄️ Supabase', 'PostgreSQL database — profiles, leads, orders, settings')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Project URL', env: 'NEXT_PUBLIC_SUPABASE_URL' },
                { label: 'Anon Key', env: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
                { label: 'Service Role Key', env: 'SUPABASE_SERVICE_ROLE_KEY' },
              ].map(item => (
                <div key={item.env} style={{ background: 'var(--s2)', borderRadius: 9, padding: '11px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--mu2)' }}>{item.env}</div>
                  <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>✓ Set in Render environment variables</div>
                </div>
              ))}
            </div>
          </>)}

          {card(<>
            {sectionTitle('🍃 MongoDB', 'Orders, consultations, products — via Express API')}
            <div style={{ background: 'var(--s2)', borderRadius: 9, padding: '11px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>API URL</div>
              <div style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--mu2)' }}>NEXT_PUBLIC_MONGO_API_URL</div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>✓ Set in Render environment variables</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu)', padding: '10px 12px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)' }}>
              ⚠️ MongoDB API ek alag Express server pe run karta hai. Ensure karo woh bhi Render pe deployed hai.
            </div>
          </>)}

          {card(<>
            {sectionTitle('💬 WhatsApp Bridge')}
            <div style={{ background: 'var(--s2)', borderRadius: 9, padding: '11px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Built-in Baileys Bridge</div>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>WhatsApp is embedded inside this Next.js server using @whiskeysockets/baileys. No external service needed.</div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6 }}>✓ No extra API key required</div>
            </div>
            <button onClick={() => setTab('whatsapp')}
              style={{ padding: '9px 20px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 8, color: 'var(--gold)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit' }}>
              Manage WhatsApp →
            </button>
          </>)}

          {card(<>
            {sectionTitle('🔑 All Environment Variables', 'Render dashboard → Environment mein yeh set karo')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { key: 'NEXT_PUBLIC_SUPABASE_URL',      required: true,  desc: 'Supabase project URL' },
                { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true,  desc: 'Supabase anon/public key' },
                { key: 'SUPABASE_SERVICE_ROLE_KEY',     required: true,  desc: 'Supabase service role (admin)' },
                { key: 'NEXT_PUBLIC_MONGO_API_URL',     required: true,  desc: 'MongoDB Express API base URL' },
                { key: 'VAPID_PUBLIC_KEY',              required: false, desc: 'Push notifications public key' },
                { key: 'VAPID_PRIVATE_KEY',             required: false, desc: 'Push notifications private key' },
              ].map(v => (
                <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--s2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: v.required ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)', color: v.required ? '#EF4444' : 'var(--mu)' }}>
                    {v.required ? 'Required' : 'Optional'}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono', flex: 1 }}>{v.key}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--mu)' }}>{v.desc}</span>
                </div>
              ))}
            </div>
          </>)}
        </>
      )}

      {/* ── SECURITY ── */}
      {tab === 'apikeys' && (
        <>
          {card(<>
            {sectionTitle('🔑 API Keys & Secrets', 'Yahan se sab keys change hoti hain — DB mein save hoti hain, env vars override hoti hain')}

            <div style={{ padding: '10px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, marginBottom: 20, fontSize: 12.5, color: 'var(--gold)' }}>
              ⚠️ Yeh keys encrypted nahi hain — sirf founder/admin dekh sakte hain. Render env vars se zyada priority milti hai inhe.
            </div>

            {([
              { group: '🤖 AI Models', keys: [
                { key: 'OPENAI_API_KEY',     label: 'OpenAI API Key',     placeholder: 'sk-proj-...', hint: 'Skin analysis (GPT-4o Vision)' },
                { key: 'ANTHROPIC_API_KEY',  label: 'Anthropic API Key',  placeholder: 'sk-ant-...', hint: 'Claude AI features' },
              ]},
              { group: '🔔 Push Notifications (VAPID)', keys: [
                { key: 'VAPID_PUBLIC_KEY',   label: 'VAPID Public Key',   placeholder: 'BDTS...', hint: 'Browser push public key' },
                { key: 'VAPID_PRIVATE_KEY',  label: 'VAPID Private Key',  placeholder: '4MPS...', hint: 'Browser push private key' },
                { key: 'VAPID_EMAIL',        label: 'VAPID Contact Email', placeholder: 'mailto:support@...', hint: 'Contact email for VAPID' },
              ]},
              { group: '🎥 Video Calls (Stream.io)', keys: [
                { key: 'STREAM_API_KEY',     label: 'Stream API Key',     placeholder: 'wgpfcax...', hint: 'GetStream.io API key' },
                { key: 'STREAM_API_SECRET',  label: 'Stream API Secret',  placeholder: 'ngbtxq3...', hint: 'GetStream.io API secret' },
              ]},
              { group: '🌐 Endpoints & URLs', keys: [
                { key: 'NEXT_PUBLIC_MONGO_API_URL', label: 'MongoDB API URL', placeholder: 'https://rabt-api.onrender.com', hint: 'Express API server base URL' },
                { key: 'NEXT_PUBLIC_APP_URL',       label: 'App Base URL',    placeholder: 'https://admin.rabtnaturals.com', hint: 'This HQ panel URL' },
              ]},
              { group: '🔐 Security', keys: [
                { key: 'RABT_JWT_SECRET',    label: 'JWT Secret',         placeholder: 'random-long-secret', hint: 'For session tokens' },
              ]},
              { group: '📱 Twilio (SMS & WhatsApp OTP)', keys: [
                { key: 'TWILIO_ACCOUNT_SID',     label: 'Twilio Account SID',      placeholder: 'ACxxxxxx',              hint: 'Twilio console → Account SID' },
                { key: 'TWILIO_AUTH_TOKEN',       label: 'Twilio Auth Token',        placeholder: 'xxxxxxxx',              hint: 'Twilio console → Auth Token' },
                { key: 'TWILIO_PHONE_NUMBER',     label: 'Twilio Phone (SMS OTP)',   placeholder: '+12015551234',          hint: 'Twilio number for SMS — e.g. +12015551234' },
                { key: 'TWILIO_WHATSAPP_NUMBER',  label: 'Twilio WA Number',         placeholder: 'whatsapp:+14155238886', hint: 'Twilio sandbox WA number' },
              ]},
            ] as { group: string; keys: { key: string; label: string; placeholder: string; hint: string }[] }[]).map(section => (
              <div key={section.group} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--b1)' }}>
                  {section.group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {section.keys.map(({ key, label, placeholder, hint }) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
                        <span style={{ fontSize: 10.5, color: 'var(--mu)' }}>{hint}</span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showKeys[key] ? 'text' : 'password'}
                          value={(apiKeys as any)[key] || ''}
                          onChange={e => setApiKeys(k => ({ ...k, [key]: e.target.value }))}
                          placeholder={placeholder}
                          style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '9px 44px 9px 12px', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'DM Mono', outline: 'none', boxSizing: 'border-box' }}
                        />
                        <button
                          onClick={() => setShowKeys(s => ({ ...s, [key]: !s[key] }))}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--mu)', padding: 2 }}>
                          {showKeys[key] ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* OTP Delivery Method */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--b1)' }}>
                🔐 OTP Delivery Method
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>
                  Send OTP Via
                </label>
                {[
                  { value: 'wa_bridge',  label: '💬 WhatsApp Bridge (Baileys)',    hint: 'Built-in WA — connect from WhatsApp tab. Free, no API key needed.' },
                  { value: 'twilio_wa',  label: '📱 Twilio WhatsApp',              hint: 'Twilio sandbox WA. Needs TWILIO_ACCOUNT_SID + AUTH_TOKEN + WA NUMBER.' },
                  { value: 'twilio_sms', label: '📨 Twilio SMS',                   hint: 'Regular SMS OTP. Needs TWILIO_ACCOUNT_SID + AUTH_TOKEN + PHONE NUMBER.' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setApiKeys(k => ({ ...k, OTP_METHOD: opt.value }))}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                      marginBottom: 8, borderRadius: 10, cursor: 'pointer', border: '2px solid',
                      borderColor: (apiKeys as any).OTP_METHOD === opt.value ? 'var(--gold)' : 'var(--b1)',
                      background: (apiKeys as any).OTP_METHOD === opt.value ? 'var(--gL)' : 'var(--s2)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      border: '2px solid ' + ((apiKeys as any).OTP_METHOD === opt.value ? 'var(--gold)' : 'var(--b2)'),
                      background: (apiKeys as any).OTP_METHOD === opt.value ? 'var(--gold)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(apiKeys as any).OTP_METHOD === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#08090C' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 3 }}>{opt.hint}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={saveApiKeys} disabled={savingKeys}
              style={{ padding: '11px 32px', background: savingKeys ? 'rgba(212,168,83,0.5)' : 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 13, cursor: savingKeys ? 'not-allowed' : 'pointer', fontFamily: 'Syne' }}>
              {savingKeys ? 'Saving...' : 'Save All API Keys'}
            </button>
          </>)}

          {card(<>
            {sectionTitle('ℹ️ Priority Order', 'Key kahan se aati hai')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { priority: '1st', label: 'Settings Page (hq_settings DB)', color: 'var(--green)', note: 'Yahan save ki gayi values sabse pehle use hoti hain' },
                { priority: '2nd', label: 'Render Environment Variables', color: 'var(--gold)', note: 'Settings mein key blank ho toh env var use hoti hai' },
                { priority: '3rd', label: 'Default/Hardcoded Fallback', color: 'var(--mu)', note: 'Kuch keys ke liye default values hain (e.g. VAPID email)' },
              ].map(item => (
                <div key={item.priority} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'var(--s2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: item.color, width: 32, flexShrink: 0 }}>{item.priority}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 2 }}>{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </>)}
        </>
      )}

      {tab === 'security' && (
        <>
          {card(<>
            {sectionTitle('🔐 OTP & Session', 'Login security configuration')}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 20px' }}>
              {field('OTP Expiry (minutes)', inp(security.otp_expiry_minutes, v => setSecurity(s => ({ ...s, otp_expiry_minutes: v })), '10', 'number'))}
              {field('Session Duration (days)', inp(security.session_days, v => setSecurity(s => ({ ...s, session_days: v })), '30', 'number'))}
            </div>
            {toggle('Require Phone for All Users', 'Agar phone set nahi toh login nahi hoga', security.require_phone_for_all, v => setSecurity(s => ({ ...s, require_phone_for_all: v })))}
            {saveBtn(() => saveSetting('security', security))}
          </>)}

          {card(<>
            {sectionTitle('👥 Active Sessions', 'Currently logged in users')}
            <div style={{ fontSize: 12, color: 'var(--mu)', padding: '14px', background: 'var(--s2)', borderRadius: 8, textAlign: 'center' }}>
              Session management Supabase dashboard mein available hai.<br />
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
                style={{ color: 'var(--gold)', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
                Open Supabase Dashboard →
              </a>
            </div>
          </>)}

          {card(<>
            {sectionTitle('🛡️ Security Checklist')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { ok: true,  label: 'OTP Login enabled for all users' },
                { ok: true,  label: 'Service role key server-side only' },
                { ok: true,  label: 'Row Level Security enabled on Supabase' },
                { ok: true,  label: 'HTTPS enforced on Render' },
                { ok: false, label: 'Email 2FA for founder account (recommended)' },
                { ok: false, label: 'IP allowlist for admin APIs (optional)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{item.ok ? '✅' : '⚠️'}</span>
                  <span style={{ fontSize: 13, color: item.ok ? 'var(--tx)' : 'var(--mu)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </>)}
        </>
      )}
    </div>
  )
}
