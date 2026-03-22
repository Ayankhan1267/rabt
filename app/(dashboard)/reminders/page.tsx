'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// ── TEMPLATES ────────────────────────────────────────────────────────────────
// Use {name} {specialist} {skinType} as placeholders — user can edit inline
const DEFAULT_TEMPLATES: Record<string, { label: string; category: string; color: string; text: string }> = {
  routine_morning: {
    label: '🌅 Morning Routine',
    category: 'Routine',
    color: 'var(--gold)',
    text: `Good morning {name}! ☀️\n\nTime for your Rabt Naturals morning routine! 🌿\n\n*Your AM Routine:*\n1️⃣ Cleanser\n2️⃣ Toner\n3️⃣ Serum\n4️⃣ Moisturizer\n5️⃣ Sunscreen ☀️\n\nConsistency = Results! 💪\n~{specialist} 🌿`,
  },
  routine_night: {
    label: '🌙 Night Routine',
    category: 'Routine',
    color: 'var(--purple)',
    text: `Good night {name}! 🌙\n\nDon't forget your night routine! 💤\n\n*Your PM Routine:*\n1️⃣ Cleanser 🧴\n2️⃣ Serum ✨\n3️⃣ Moisturizer 💧\n\nSweet dreams and glowing skin! 🌿\n~{specialist}`,
  },
  followup_7day: {
    label: '📊 7-Day Follow Up',
    category: 'Follow Up',
    color: 'var(--teal)',
    text: `Hi {name}! 🌿\n\nIt's been 7 days since your consultation! How's your skin doing? 😊\n\n*Quick check-in — Reply:*\n1️⃣ Amazing! Seeing results\n2️⃣ Good, adjusting to it\n3️⃣ Need some help\n\nYour specialist {specialist} is here! 💚\n~Rabt Naturals 🌿`,
  },
  followup_14day: {
    label: '📊 14-Day Progress',
    category: 'Follow Up',
    color: 'var(--blue)',
    text: `Hi {name}! 🌿\n\n2 weeks into your Rabt Naturals journey! 🎉\n\nYou should start seeing:\n✨ More even skin tone\n✨ Better hydration\n✨ Natural glow\n\n📸 Take a selfie and compare!\n\nStill have concerns? Reply anytime!\n~Rabt Naturals 🌿`,
  },
  followup_30day: {
    label: '🎯 30-Day Review',
    category: 'Follow Up',
    color: 'var(--gold)',
    text: `Hi {name}! 🌟\n\n30 DAYS of consistent skincare! You're amazing! 🎉\n\n⭐ Rate your results and get 15% off!\nCode: RABT30 at rabtnaturals.com/shop\n\nThank you for trusting Rabt Naturals! 🌿`,
  },
  consultation_reminder: {
    label: '⏰ Consultation Reminder',
    category: 'Consultation',
    color: 'var(--orange)',
    text: `Hi {name}! ⏰\n\nYour skin consultation is coming up! 🌿\n\nQuick checklist:\n✅ Clean face ready?\n✅ Good lighting?\n✅ Skin concerns noted?\n\nSee you soon! 🌿\n~{specialist}`,
  },
  purchase_reminder: {
    label: '🛒 Complete Your Purchase',
    category: 'Lead',
    color: 'var(--green)',
    text: `Hi {name}! 🌿\n\nAapki skin ke liye specially curated routine ready hai! 🌿\n\n🛒 Abhi order karo: rabtnaturals.com/shop\n🎁 15% off first order: *RABT15*\n✨ Free delivery above ₹999\n\nKoi sawaal? Reply karein! 💚\n~{specialist} 🌿`,
  },
  book_consultation: {
    label: '📅 Book Consultancy',
    category: 'Lead',
    color: 'var(--teal)',
    text: `Hi {name}! 👋\n\nAapki skin ke liye FREE expert consultation available hai! 🌿\n\n*Kya milega:*\n✅ Personalized skin analysis\n✅ Custom routine recommendation\n✅ 1-on-1 specialist session\n\n📲 Book karo: rabtnaturals.com/consultation\nYa reply karein "BOOK" 👇\n\n~{specialist} 🌿`,
  },
  skin_profile_view: {
    label: '🔬 See Your Skin Profile',
    category: 'Lead',
    color: 'var(--purple)',
    text: `Hi {name}! 🌿\n\nAapka *Skin Profile* ready hai! ✨\n\nApna complete skin analysis dekho:\n👉 rabtnaturals.com/skin-profile\n\nPersonalized recommendations bhi available hain! 💚\n\n~{specialist} 🌿`,
  },
  diet_tip: {
    label: '🥗 Diet & Lifestyle Tip',
    category: 'Routine',
    color: 'var(--green)',
    text: `Hi {name}! 🥗\n\nWeekly skin health tip from {specialist}!\n\n🥗 Eat: Leafy greens, fruits, omega-3\n❌ Avoid: Dairy, sugar, junk food\n💧 Water: 3-4 litres daily!\n😴 Sleep: 7-8 hours minimum\n\nSkincare + Diet + Sleep = Glowing skin! ✨\n~Rabt Naturals 🌿`,
  },
  routine_purchased: {
    label: '🛍️ Purchase Start Guide',
    category: 'Order',
    color: 'var(--blue)',
    text: `Hi {name}! 🎉\n\nThank you for your purchase from Rabt Naturals! 🌿\n\nYour routine will arrive in 3-5 days.\n\n*Your personalized routine:*\n🌅 Morning: Cleanser → Serum → Moisturizer → Sunscreen\n🌙 Night: Cleanser → Serum → Moisturizer\n\nI'll send you daily reminders! 💪\n~{specialist}`,
  },
}

function fillTemplate(text: string, data: { name?: string; specialist?: string; skinType?: string }) {
  return text
    .replace(/\{name\}/g, data.name || 'there')
    .replace(/\{specialist\}/g, data.specialist || 'Rabt Naturals')
    .replace(/\{skinType\}/g, data.skinType || '')
}

async function callWhatsAppAPI(phone: string, message: string, cfg: { apiKey: string; phoneNumberId: string }) {
  const digits = phone.replace(/[^0-9]/g, '')
  const to = digits.length === 10 ? '91' + digits : digits
  const res = await fetch(`https://graph.facebook.com/v18.0/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message, preview_url: false } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'WhatsApp API error')
  return data
}

async function sendWhatsApp(phone: string, message: string, cfg?: { apiKey: string; phoneNumberId: string }) {
  const clean = phone.replace(/[^0-9]/g, '')
  if (cfg?.apiKey && cfg?.phoneNumberId) {
    try {
      await callWhatsAppAPI(phone, message, cfg)
      await supabase.from('whatsapp_logs').insert({ to_number: phone, message: message.substring(0, 500), status: 'sent_api', type: 'api' })
      return
    } catch (e: any) {
      toast.error('WA API failed: ' + e.message + ' — opening wa.me')
    }
  }
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank')
  await supabase.from('whatsapp_logs').insert({ to_number: phone, message: message.substring(0, 500), status: 'opened', type: 'manual' })
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export default function RemindersPage() {
  const [mongoSpec, setMongoSpec]               = useState<any>(null)
  const [myProfile, setMyProfile]               = useState<any>(null)
  const [patients, setPatients]                 = useState<any[]>([])
  const [notPurchasedLeads, setNotPurchasedLeads] = useState<any[]>([])
  const [notBookedLeads, setNotBookedLeads]     = useState<any[]>([])
  const [skinProfiles, setSkinProfiles]         = useState<any[]>([])
  const [logs, setLogs]                         = useState<any[]>([])
  const [loading, setLoading]                   = useState(true)
  const [mounted, setMounted]                   = useState(false)

  const [pageTab, setPageTab]       = useState<'patients'|'followup'|'logs'|'settings'>('patients')
  const [followupTab, setFollowupTab] = useState<'not_purchased'|'not_booked'>('not_purchased')
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch]         = useState('')
  const [bulkMode, setBulkMode]     = useState(false)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])

  const [selectedTemplate, setSelectedTemplate] = useState('routine_morning')
  const [selectedPerson, setSelectedPerson]     = useState<any>(null)
  const [editedMsg, setEditedMsg]               = useState('')

  // Template editing
  const [templates, setTemplates]           = useState(DEFAULT_TEMPLATES)
  const [editingTemplate, setEditingTemplate] = useState<string|null>(null)
  const [editTemplateText, setEditTemplateText] = useState('')

  // WA Business config
  const [waConfig, setWaConfig]       = useState({ apiKey: '', phoneNumberId: '' })
  const [savingWa, setSavingWa]       = useState(false)

  useEffect(() => { setMounted(true); loadAll(); loadConfig() }, [])

  useEffect(() => {
    if (selectedPerson) {
      const tmpl = templates[selectedTemplate as keyof typeof templates]
      if (!tmpl) return
      const sp = skinProfiles.find((s: any) => s.name?.toLowerCase() === selectedPerson.name?.toLowerCase() || s.phone === selectedPerson.phone)
      setEditedMsg(fillTemplate(tmpl.text, {
        name: selectedPerson.name || 'there',
        specialist: mongoSpec?.name || 'Your Specialist',
        skinType: sp?.skinType || selectedPerson.skinType || '',
      }))
    }
  }, [selectedPerson, selectedTemplate, templates])

  async function loadConfig() {
    const { data: waCfg } = await supabase.from('app_settings').select('*').eq('key', 'wa_business_config').single()
    if (waCfg?.value) { try { setWaConfig(JSON.parse(waCfg.value)) } catch {} }
    const { data: tmplData } = await supabase.from('app_settings').select('*').eq('key', 'reminder_templates').single()
    if (tmplData?.value) { try { setTemplates(t => ({ ...t, ...JSON.parse(tmplData.value) })) } catch {} }
  }

  async function saveWaConfig() {
    setSavingWa(true)
    await supabase.from('app_settings').upsert({ key: 'wa_business_config', value: JSON.stringify(waConfig) })
    toast.success('WhatsApp Business config saved!')
    setSavingWa(false)
  }

  async function saveTemplate(key: string) {
    const updated = { ...templates, [key]: { ...templates[key as keyof typeof templates], text: editTemplateText } }
    setTemplates(updated as any)
    setEditingTemplate(null)
    const custom: any = {}
    Object.entries(updated).forEach(([k, v]) => {
      if ((v as any).text !== DEFAULT_TEMPLATES[k as keyof typeof DEFAULT_TEMPLATES]?.text) custom[k] = v
    })
    await supabase.from('app_settings').upsert({ key: 'reminder_templates', value: JSON.stringify(custom) })
    toast.success('Template saved!')
  }

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
      setMyProfile(prof)
      const url = process.env.NEXT_PUBLIC_MONGO_API_URL || localStorage.getItem('rabt_mongo_url')
      if (!url) { setLoading(false); return }

      const [specRes, consRes, ordRes, skinRes, userRes, leadsRes] = await Promise.all([
        fetch(url + '/api/specialists').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/consultations').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/orders').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/skinprofiles').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/users').then(r => r.ok ? r.json() : []),
        fetch(url + '/api/leads').then(r => r.ok ? r.json() : []).catch(() => []),
      ])

      const allSpecs  = Array.isArray(specRes)  ? specRes.filter(Boolean)  : []
      const allCons   = Array.isArray(consRes)   ? consRes.filter(Boolean)  : []
      const allOrders = Array.isArray(ordRes)    ? ordRes.filter(Boolean)   : []
      const allSkins  = Array.isArray(skinRes)   ? skinRes.filter(Boolean)  : []
      const allUsers  = Array.isArray(userRes)   ? userRes.filter(Boolean)  : []
      const allLeads  = Array.isArray(leadsRes)  ? leadsRes.filter(Boolean) : []

      const mySpec = allSpecs.find((s: any) => s.email?.toLowerCase() === prof?.email?.toLowerCase())
      setMongoSpec(mySpec)

      const isManager = ['founder', 'admin', 'manager', 'specialist_manager'].includes(prof?.role || '')
      const myCons    = isManager ? allCons : allCons.filter((c: any) => c.assignedSpecialist?.toString() === mySpec?._id?.toString())
      const mySkins   = isManager ? allSkins : allSkins.filter((s: any) => s.specialistId?.toString() === mySpec?._id?.toString())
      setSkinProfiles(mySkins)

      // Build patients map
      const patientMap: Record<string, any> = {}
      myCons.forEach((c: any) => {
        if (!c) return
        const u = allUsers.find((u: any) => u._id?.toString() === c.userId?.toString())
        const phone = (c.phone || u?.phoneNumber || u?.phone || '').replace(/[^0-9]/g, '')
        const key = phone || c.name?.toLowerCase().trim()
        if (!key) return
        if (!patientMap[key]) patientMap[key] = { name: c.name, phone, skinType: '', consultations: [], orders: [] }
        patientMap[key].consultations.push(c)
        if (phone) patientMap[key].phone = phone
      })
      mySkins.forEach((sp: any) => {
        if (!sp?.name) return
        const phone = (sp.phone || '').replace(/[^0-9]/g, '')
        const key = phone || sp.name?.toLowerCase().trim()
        if (!patientMap[key]) patientMap[key] = { name: sp.name, phone, skinType: sp.skinType || '', consultations: [], orders: [] }
        if (sp.skinType) patientMap[key].skinType = sp.skinType
        if (phone) patientMap[key].phone = phone
      })
      const myConsUserIds = new Set(myCons.map((c: any) => c.userId?.toString()).filter(Boolean))
      const myOrdersFiltered = isManager ? allOrders : allOrders.filter((o: any) => {
        const uid = o.userId?.toString() || o.user?.toString()
        return myConsUserIds.has(uid) || o.specialistId?.toString() === mySpec?._id?.toString()
      })
      myOrdersFiltered.forEach((o: any) => {
        if (!o?.customerName) return
        const phone = (o.customerPhone || '').replace(/[^0-9]/g, '')
        const key = phone || o.customerName?.toLowerCase().trim()
        if (!patientMap[key]) patientMap[key] = { name: o.customerName, phone, skinType: '', consultations: [], orders: [] }
        patientMap[key].orders.push(o)
        if (phone) patientMap[key].phone = phone
      })
      setPatients(Object.values(patientMap))

      // ── FOLLOW-UP LISTS ───────────────────────────────────────────────────
      const orderedPhones    = new Set(allOrders.map((o: any) => (o.customerPhone || '').replace(/[^0-9]/g, '')).filter((p: string) => p.length >= 10))
      const orderedUserIds   = new Set(allOrders.map((o: any) => o.userId?.toString()).filter(Boolean))
      const consultedPhones  = new Set(allCons.map((c: any) => (c.phone || '').replace(/[^0-9]/g, '')).filter((p: string) => p.length >= 10))
      const consultedUserIds = new Set(allCons.map((c: any) => c.userId?.toString()).filter(Boolean))

      // Aggregate all known leads (users + CRM leads + skin profiles)
      const leadsByPhone: Record<string, any> = {}
      const addLead = (name: string, phone: string, email: string, userId: string, source: string) => {
        const p = phone.replace(/[^0-9]/g, '')
        if (!name || p.length < 10) return
        if (!leadsByPhone[p]) leadsByPhone[p] = { name, phone: p, email, userId, source }
      }
      allUsers.forEach((u: any) => {
        const name = (u.firstName && u.lastName) ? u.firstName + ' ' + u.lastName : u.firstName || u.name || ''
        addLead(name, u.phoneNumber || u.phone || '', u.email || '', u._id?.toString(), 'user')
      })
      allLeads.forEach((l: any) => addLead(l.name || l.customerName || '', l.phone || l.customerPhone || '', l.email || '', l.userId || l._id?.toString(), 'lead'))
      allSkins.forEach((sp: any) => addLead(sp.name || '', sp.phone || '', sp.email || '', sp.userId || sp._id?.toString(), 'skin'))

      const uniqueLeads = Object.values(leadsByPhone)
      setNotPurchasedLeads(uniqueLeads.filter(l => !orderedPhones.has(l.phone) && !orderedUserIds.has(l.userId)))
      setNotBookedLeads(uniqueLeads.filter(l => !consultedPhones.has(l.phone) && !consultedUserIds.has(l.userId)))

      const { data: logsData } = await supabase.from('whatsapp_logs').select('*').order('created_at', { ascending: false }).limit(50)
      setLogs(logsData || [])
    } catch (e: any) { toast.error('Load failed: ' + e.message) }
    setLoading(false)
  }

  async function handleSend(phone: string, msg: string) {
    if (!phone) { toast.error('Phone number required'); return }
    await sendWhatsApp(phone, msg, waConfig.apiKey ? waConfig : undefined)
    toast.success('Message sent!')
    loadAll()
  }

  async function handleBulkSend(list: any[]) {
    const tmpl = templates[selectedTemplate as keyof typeof templates]
    if (!tmpl) return
    const targets = bulkSelected.length > 0 ? list.filter(l => bulkSelected.includes(l.phone)) : list.filter(l => l.phone)
    let sent = 0
    for (const p of targets) {
      const sp = skinProfiles.find((s: any) => s.phone === p.phone || s.name?.toLowerCase() === p.name?.toLowerCase())
      const msg = fillTemplate(tmpl.text, { name: p.name, specialist: mongoSpec?.name || 'Your Specialist', skinType: sp?.skinType || p.skinType || '' })
      await sendWhatsApp(p.phone, msg, waConfig.apiKey ? waConfig : undefined)
      sent++
      await new Promise(r => setTimeout(r, 600))
    }
    toast.success(`Broadcast sent to ${sent} people!`)
    setBulkSelected([])
    loadAll()
  }

  const CATEGORIES = ['All', 'Routine', 'Follow Up', 'Consultation', 'Order', 'Lead']
  const filteredTemplates  = Object.entries(templates).filter(([, t]) => activeCategory === 'All' || t.category === activeCategory)
  const filteredPatients   = patients.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search))
  const followupList       = (followupTab === 'not_purchased' ? notPurchasedLeads : notBookedLeads).filter(l => !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search))

  const inp: any = { background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 10px', color: 'var(--tx)', fontSize: 12.5, fontFamily: 'Outfit', outline: 'none' }

  if (!mounted) return null

  // ── SHARED: template picker sidebar ──────────────────────────────────────
  const TemplateSidebar = () => (
    <div>
      <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Templates</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: activeCategory === cat ? 'var(--gL)' : 'transparent', color: activeCategory === cat ? 'var(--gold)' : 'var(--mu)', border: '1px solid ' + (activeCategory === cat ? 'rgba(212,168,83,0.3)' : 'var(--b1)') }}>
            {cat}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
        {filteredTemplates.map(([key, tmpl]) => (
          <div key={key} style={{ background: selectedTemplate === key ? tmpl.color + '18' : 'var(--s1)', border: `1px solid ${selectedTemplate === key ? tmpl.color + '44' : 'var(--b1)'}`, borderRadius: 10, padding: '10px 12px' }}>
            <div onClick={() => setSelectedTemplate(key)} style={{ fontSize: 12, fontWeight: 600, color: selectedTemplate === key ? tmpl.color : 'var(--tx)', cursor: 'pointer', marginBottom: 2 }}>{tmpl.label}</div>
            <div style={{ fontSize: 10, color: 'var(--mu)', marginBottom: 6 }}>{tmpl.category}</div>
            {editingTemplate === key ? (
              <div>
                <textarea value={editTemplateText} onChange={e => setEditTemplateText(e.target.value)}
                  style={{ ...inp, width: '100%', height: 130, fontSize: 11, resize: 'vertical', marginBottom: 6, lineHeight: 1.5 }} />
                <div style={{ fontSize: 10, color: 'var(--mu)', marginBottom: 6 }}>Variables: {'{name}'} {'{specialist}'} {'{skinType}'}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => saveTemplate(key)} style={{ flex: 1, padding: '4px', background: 'var(--teal)', border: 'none', borderRadius: 5, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingTemplate(null)} style={{ flex: 1, padding: '4px', background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 5, color: 'var(--mu)', fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => { setEditTemplateText(DEFAULT_TEMPLATES[key as keyof typeof DEFAULT_TEMPLATES]?.text || '') }} style={{ padding: '4px 6px', background: 'var(--rdL)', border: 'none', borderRadius: 5, color: 'var(--red)', fontSize: 9, cursor: 'pointer' }}>Reset</button>
                </div>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setEditingTemplate(key); setEditTemplateText((tmpl as any).text) }} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'var(--s2)', border: '1px solid var(--b1)', color: 'var(--mu)', cursor: 'pointer' }}>✏️ Edit Template</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  // ── SHARED: preview + send panel ─────────────────────────────────────────
  const PreviewPanel = () => (
    <div>
      <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Preview & Send</div>
      <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 12, overflow: 'hidden' }}>
        {selectedPerson ? (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--b1)', background: 'var(--s2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>To: {selectedPerson.name}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{selectedPerson.phone || 'No phone'}</div>
            </div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: waConfig.apiKey ? 'var(--grL)' : 'rgba(0,151,167,0.1)', color: waConfig.apiKey ? 'var(--green)' : 'var(--teal)', fontWeight: 700 }}>
              {waConfig.apiKey ? '🟢 WA API' : '🔗 WA Link'}
            </span>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--b1)', background: 'var(--s2)', fontSize: 12, color: 'var(--mu)' }}>
            Select a person to preview message
          </div>
        )}
        <div style={{ padding: 14 }}>
          <textarea
            value={editedMsg}
            onChange={e => setEditedMsg(e.target.value)}
            placeholder="Select person + template to generate message. You can edit before sending."
            style={{ ...inp, width: '100%', height: 260, resize: 'vertical', fontSize: 12, lineHeight: 1.7, fontFamily: 'system-ui', padding: '12px 14px' }}
          />
        </div>
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => { if (selectedPerson?.phone && editedMsg.trim()) handleSend(selectedPerson.phone, editedMsg) }}
            disabled={!selectedPerson?.phone || !editedMsg.trim()}
            style={{ width: '100%', padding: 10, background: selectedPerson?.phone && editedMsg.trim() ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: selectedPerson?.phone && editedMsg.trim() ? '#fff' : 'var(--mu)', fontSize: 13, fontWeight: 700, cursor: selectedPerson?.phone && editedMsg.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Outfit' }}>
            💬 Send WhatsApp
          </button>
          <button onClick={() => { if (editedMsg) { navigator.clipboard.writeText(editedMsg); toast.success('Copied!') } }}
            style={{ width: '100%', padding: 8, background: 'transparent', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit' }}>
            📋 Copy Message
          </button>
        </div>
      </div>

      {/* Recent logs mini */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: 'Syne', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Recent Sent</div>
        {logs.slice(0, 3).map((log, i) => (
          <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 8, padding: '8px 12px', marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--teal)' }}>{log.to_number}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: log.type === 'api' ? 'var(--grL)' : 'var(--blL)', color: log.type === 'api' ? 'var(--green)' : 'var(--blue)', fontWeight: 700 }}>{log.type === 'api' ? 'API' : 'Link'}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.message}</div>
          </div>
        ))}
        {logs.length === 0 && <div style={{ fontSize: 11, color: 'var(--mu)', textAlign: 'center', padding: 12 }}>No messages sent yet</div>}
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Reminders & <span style={{ color: 'var(--gold)' }}>Follow-Up</span></h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>WhatsApp Business · Bulk Broadcast · Lead Follow-Up System</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setBulkMode(!bulkMode)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', background: bulkMode ? 'rgba(0,151,167,0.15)' : 'var(--s2)', color: bulkMode ? 'var(--teal)' : 'var(--mu)', border: '1px solid var(--b1)' }}>
            {bulkMode ? '✓ Bulk ON' : '📢 Bulk Broadcast'}
          </button>
          <button onClick={loadAll} style={{ padding: '8px 14px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: 'var(--blue)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'My Patients',    value: patients.length,            color: 'var(--blue)'   },
          { label: 'Not Purchased',  value: notPurchasedLeads.length,   color: 'var(--orange)' },
          { label: 'Not Booked',     value: notBookedLeads.length,      color: 'var(--red)'    },
          { label: 'Messages Sent',  value: logs.length,                color: 'var(--gold)'   },
          { label: 'WA Status',      value: waConfig.apiKey ? '🟢 API' : '🔗 Link', color: waConfig.apiKey ? 'var(--green)' : 'var(--mu)', txt: true },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: (s as any).txt ? 14 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Page tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'patients',  l: '👥 My Patients' },
          { id: 'followup',  l: `🔄 Follow Up (${notPurchasedLeads.length + notBookedLeads.length})` },
          { id: 'logs',      l: `📊 WA Logs (${logs.length})` },
          { id: 'settings',  l: '⚙️ Settings' },
        ].map(t => (
          <button key={t.id} onClick={() => setPageTab(t.id as any)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid ' + (pageTab === t.id ? 'rgba(0,151,167,0.3)' : 'var(--b1)'), background: pageTab === t.id ? 'rgba(0,151,167,0.1)' : 'transparent', color: pageTab === t.id ? 'var(--teal)' : 'var(--mu2)', fontWeight: pageTab === t.id ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── MY PATIENTS ────────────────────────────────────────────────────── */}
      {pageTab === 'patients' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 340px', gap: 14 }}>
          <TemplateSidebar />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800 }}>Patients ({filteredPatients.length})</div>
              {bulkMode && bulkSelected.length > 0 && (
                <button onClick={() => handleBulkSend(patients.filter(p => bulkSelected.includes(p.phone)))}
                  style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  📢 Send to {bulkSelected.length}
                </button>
              )}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..." style={{ ...inp, width: '100%', marginBottom: 10 }} />

            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)' }}>Loading...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 520, overflowY: 'auto' }}>
                {filteredPatients.map((p: any, i: number) => {
                  const isSelected = selectedPerson?.phone === p.phone
                  const isBulk = bulkSelected.includes(p.phone)
                  return (
                    <div key={i} onClick={() => {
                      if (bulkMode) setBulkSelected(prev => prev.includes(p.phone) ? prev.filter(x => x !== p.phone) : [...prev, p.phone])
                      else setSelectedPerson(isSelected ? null : p)
                    }} style={{ background: isSelected || isBulk ? 'var(--gL)' : 'var(--s1)', border: `1px solid ${isSelected || isBulk ? 'rgba(212,168,83,0.4)' : 'var(--b1)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {bulkMode && (
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isBulk ? 'var(--gold)' : 'var(--b2)'}`, background: isBulk ? 'var(--gold)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isBulk && <div style={{ width: 8, height: 8, borderRadius: 2, background: '#08090C' }} />}
                        </div>
                      )}
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{p.phone || 'No phone'}</div>
                        {p.skinType && <div style={{ fontSize: 10, color: 'var(--teal)' }}>🔬 {p.skinType}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        {p.orders.length > 0 && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700, background: 'var(--grL)', color: 'var(--green)' }}>🛍️ Purchased</span>}
                        {p.consultations.length > 0 && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, fontWeight: 700, background: 'rgba(0,151,167,0.1)', color: 'var(--teal)' }}>📅 {p.consultations.length} cons</span>}
                      </div>
                    </div>
                  )
                })}
                {filteredPatients.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--mu)', fontSize: 12 }}>No patients found</div>}
              </div>
            )}
          </div>

          <PreviewPanel />
        </div>
      )}

      {/* ── FOLLOW UP ──────────────────────────────────────────────────────── */}
      {pageTab === 'followup' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'not_purchased', l: '🛒 Not Purchased', count: notPurchasedLeads.length, color: 'var(--orange)' },
              { id: 'not_booked',    l: '📅 Not Booked',    count: notBookedLeads.length,    color: 'var(--red)'    },
            ].map(t => (
              <button key={t.id} onClick={() => setFollowupTab(t.id as any)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid ' + (followupTab === t.id ? t.color + '55' : 'var(--b1)'), background: followupTab === t.id ? t.color + '15' : 'transparent', color: followupTab === t.id ? t.color : 'var(--mu2)', fontWeight: followupTab === t.id ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit' }}>
                {t.l} <span style={{ fontSize: 10, background: t.color + '22', color: t.color, padding: '1px 7px', borderRadius: 20, marginLeft: 4 }}>{t.count}</span>
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inp, width: 180 }} />
              {bulkMode && (
                <button onClick={() => handleBulkSend(followupList)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  📢 Broadcast All ({followupList.filter(l => l.phone).length})
                </button>
              )}
            </div>
          </div>

          {/* Quick template bar */}
          <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--mu)', flexShrink: 0 }}>Template:</span>
            {(['purchase_reminder','book_consultation','skin_profile_view','followup_7day'] as const).map(key => (
              <button key={key} onClick={() => setSelectedTemplate(key)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', background: selectedTemplate === key ? 'rgba(0,151,167,0.15)' : 'transparent', color: selectedTemplate === key ? 'var(--teal)' : 'var(--mu2)', border: '1px solid ' + (selectedTemplate === key ? 'rgba(0,151,167,0.35)' : 'var(--b1)') }}>
                {templates[key]?.label || key}
              </button>
            ))}
          </div>

          {/* Alert banner */}
          <div style={{ background: followupTab === 'not_purchased' ? 'rgba(249,115,22,0.08)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (followupTab === 'not_purchased' ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)'), borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 12.5, color: followupTab === 'not_purchased' ? 'var(--orange)' : 'var(--red)' }}>
            ⚠️ <strong>{followupList.length} leads</strong> — {followupTab === 'not_purchased' ? 'inhe purchase reminder bhejo' : 'inhe consultation book karwao'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
            {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--mu)' }}>Loading...</div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8, alignContent: 'start' }}>
                {followupList.map((lead: any, i: number) => {
                  const isSelected = selectedPerson?.phone === lead.phone
                  const isBulk = bulkSelected.includes(lead.phone)
                  return (
                    <div key={i} onClick={() => {
                      if (bulkMode) setBulkSelected(prev => prev.includes(lead.phone) ? prev.filter(x => x !== lead.phone) : [...prev, lead.phone])
                      else setSelectedPerson(isSelected ? null : lead)
                    }} style={{ background: isSelected || isBulk ? 'rgba(0,151,167,0.1)' : 'var(--s1)', border: `1px solid ${isSelected || isBulk ? 'rgba(0,151,167,0.3)' : 'var(--b1)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                      {bulkMode && (
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isBulk ? 'var(--teal)' : 'var(--b2)'}`, background: isBulk ? 'var(--teal)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isBulk && <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fff' }} />}
                        </div>
                      )}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--teal),#005F6A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {(lead.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'DM Mono' }}>{lead.phone}</div>
                        {lead.email && <div style={{ fontSize: 10, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.email}</div>}
                      </div>
                      <button onClick={e => {
                        e.stopPropagation()
                        if (!lead.phone) { toast.error('No phone number'); return }
                        const tmpl = templates[selectedTemplate as keyof typeof templates]
                        const msg = tmpl ? fillTemplate(tmpl.text, { name: lead.name, specialist: mongoSpec?.name || 'Your Specialist', skinType: '' }) : ''
                        if (msg) sendWhatsApp(lead.phone, msg, waConfig.apiKey ? waConfig : undefined).then(() => { toast.success('Sent!'); loadAll() })
                      }} style={{ padding: '5px 10px', background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        💬
                      </button>
                    </div>
                  )
                })}
                {followupList.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--mu)' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {followupTab === 'not_purchased' ? 'Sabne purchase kar li hai!' : 'Sabne consultation book kar li hai!'}
                    </div>
                  </div>
                )}
              </div>
            )}
            <PreviewPanel />
          </div>
        </div>
      )}

      {/* ── WA LOGS ────────────────────────────────────────────────────────── */}
      {pageTab === 'logs' && (
        <div>
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>WhatsApp Message Logs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map((log, i) => (
              <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)' }}>{log.to_number}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: log.type === 'api' ? 'var(--grL)' : 'var(--blL)', color: log.type === 'api' ? 'var(--green)' : 'var(--blue)', fontWeight: 700 }}>
                      {log.type === 'api' ? '🟢 WA Business API' : '🔗 WA Link'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--mu)' }}>{log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : ''}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--mu2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{log.message}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--mu)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 14 }}>No messages sent yet</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS ───────────────────────────────────────────────────────── */}
      {pageTab === 'settings' && (
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 4 }}>📱 WhatsApp Business API</div>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 16, lineHeight: 1.6 }}>
              Meta WhatsApp Cloud API se direct messages bhejo bina wa.me link ke. Empty raho toh wa.me link automatically use hoga.
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', marginBottom: 4 }}>Access Token (Bearer)</div>
                <input value={waConfig.apiKey} onChange={e => setWaConfig(p => ({ ...p, apiKey: e.target.value }))}
                  placeholder="EAAG..." type="password"
                  style={{ ...inp, width: '100%', fontFamily: 'DM Mono', fontSize: 11 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', marginBottom: 4 }}>Phone Number ID</div>
                <input value={waConfig.phoneNumberId} onChange={e => setWaConfig(p => ({ ...p, phoneNumberId: e.target.value }))}
                  placeholder="123456789012345"
                  style={{ ...inp, width: '100%', fontFamily: 'DM Mono', fontSize: 11 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'var(--s2)', borderRadius: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: waConfig.apiKey && waConfig.phoneNumberId ? 'var(--green)' : 'var(--mu)', flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: waConfig.apiKey && waConfig.phoneNumberId ? 'var(--green)' : 'var(--mu)' }}>
                  {waConfig.apiKey && waConfig.phoneNumberId ? '✅ WhatsApp Business API configured' : 'Not configured — will use wa.me links'}
                </div>
              </div>
              <button onClick={saveWaConfig} disabled={savingWa}
                style={{ padding: '10px', background: 'linear-gradient(135deg,#0097A7,#005F6A)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                {savingWa ? 'Saving...' : '💾 Save WhatsApp Config'}
              </button>
            </div>
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--s2)', borderRadius: 8, fontSize: 11.5, color: 'var(--mu)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--tx)' }}>How to get credentials:</div>
              <div>1. Go to <span style={{ color: 'var(--teal)', fontWeight: 600 }}>developers.facebook.com</span></div>
              <div>2. Create a WhatsApp Business app → WhatsApp → API Setup</div>
              <div>3. Copy <strong>Temporary access token</strong> and <strong>Phone number ID</strong></div>
              <div style={{ marginTop: 6, color: 'var(--orange)' }}>⚠️ For production, use a permanent System User token from Business Manager</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
