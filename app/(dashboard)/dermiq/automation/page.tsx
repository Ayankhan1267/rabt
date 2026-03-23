'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280',
  border: '#E5E7EB', cream: '#F7F3EE', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6', blue: '#3B82F6', orange: '#F97316'
}

const AUDIENCE_REACH: Record<string, number> = {
  'All users': 8420,
  'Post-analysis': 3210,
  'Post-consultation': 890,
  'Customers': 2140,
  'Inactive 30d+': 1870,
}

const INITIAL_WA_FLOWS = [
  {
    id: 1, active: true, name: 'Post Analysis',
    trigger: 'User completes AI skin analysis', delay: 'Immediate',
    message: 'Hi {name}! Your DermIQ Skin Report is ready 🌿 Your skin type: {skin_type}. Top concern: {top_concern}. View your personalized routine → {link}',
    variables: ['{name}', '{skin_type}', '{top_concern}', '{link}'],
  },
  {
    id: 2, active: true, name: 'Day 2 Reminder',
    trigger: 'User analyzed but did not book consultation', delay: '2 days',
    message: 'Hey {name}, your skin analysis showed {concern}. Our specialist Dr. {specialist} is available today. Book a FREE 15-min call → {link}',
    variables: ['{name}', '{concern}', '{specialist}', '{link}'],
  },
  {
    id: 3, active: false, name: 'Day 5 Offer',
    trigger: 'User analyzed but did not purchase', delay: '5 days',
    message: 'Special offer for you {name}! Products recommended for {concern} — get 15% off with code DQCARE15. Valid 24hrs only → {link}',
    variables: ['{name}', '{concern}', '{link}'],
  },
  {
    id: 4, active: true, name: 'Order Delivered',
    trigger: 'Order marked delivered', delay: '3 days after delivery',
    message: 'How\'s your skin doing, {name}? 🌿 Rate your experience and get ₹100 cashback on your next order → {link}',
    variables: ['{name}', '{link}'],
  },
]

const INITIAL_EMAIL_SEQS = [
  {
    id: 1, name: 'Skin Analysis Report Email',
    subject: 'Your DermIQ Skin Report — {name}',
    emails: [
      { day: 0, label: 'Report', subject: 'Your DermIQ Skin Report is Ready, {name}!', preview: 'Based on your 32-point analysis, here\'s your personalized skin profile...', expanded: false },
      { day: 3, label: 'Education', subject: 'Understanding Your Skin Type: A Guide by DermIQ', preview: 'Now that you know your skin type, here\'s how to build a routine...', expanded: false },
      { day: 7, label: 'Products', subject: 'Top Picks for {concern} — Curated Just for You', preview: 'Our AI matched 8 products for your skin profile with 90%+ confidence...', expanded: false },
    ]
  },
  {
    id: 2, name: 'Post-Consultation',
    subject: 'Your Personalized Routine from Dr. {specialist}',
    emails: [
      { day: 0, label: 'Routine Summary', subject: 'Your Personalized Skincare Routine from Dr. {specialist}', preview: 'Here is your 3-step AM/PM routine recommended by your specialist...', expanded: false },
      { day: 14, label: 'Follow-up Check', subject: 'How is your skin doing, {name}?', preview: 'It\'s been 2 weeks since your consultation. Time to check in...', expanded: false },
    ]
  },
  {
    id: 3, name: 'Cart Abandonment',
    subject: 'Your cart is waiting, {name} 🌿',
    emails: [
      { day: 1, label: 'Reminder', subject: 'You left something behind, {name}', preview: 'Your cart has items waiting — your personalized picks are still available...', expanded: false },
      { day: 3, label: 'Discount', subject: 'Here\'s 10% off to complete your order', preview: 'We noticed you haven\'t checked out yet. Use code CART10 for 10% off...', expanded: false },
    ]
  },
]

const INITIAL_NOTIF_RULES = [
  { id: 1, event: 'New user registered', channel: 'Admin WhatsApp', delay: 'Immediate', active: true },
  { id: 2, event: 'Consultation booked', channel: 'Specialist app notification', delay: 'Immediate', active: true },
  { id: 3, event: 'Order placed', channel: 'Vendor WhatsApp', delay: 'Immediate', active: true },
  { id: 4, event: 'KYC submitted', channel: 'Admin email', delay: 'Immediate', active: true },
  { id: 5, event: 'Low stock (≤10 units)', channel: 'Vendor WhatsApp', delay: 'Daily digest', active: true },
  { id: 6, event: 'Review posted', channel: 'Admin notification', delay: 'Immediate', active: true },
]

export default function AutomationPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [globalActive, setGlobalActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const [waFlows, setWaFlows] = useState(INITIAL_WA_FLOWS.map(f => ({ ...f })))
  const [editingFlow, setEditingFlow] = useState<number | null>(null)

  const [emailSeqs, setEmailSeqs] = useState(INITIAL_EMAIL_SEQS.map(s => ({
    ...s, emails: s.emails.map(e => ({ ...e }))
  })))

  const [notifRules, setNotifRules] = useState(INITIAL_NOTIF_RULES.map(r => ({ ...r })))

  const [campaign, setCampaign] = useState({
    name: '', audience: 'All users', channel: 'WhatsApp', message: '', subject: '', scheduleType: 'Immediate', scheduledAt: ''
  })

  const TABS = ['WhatsApp Flows', 'Email Funnels', 'Notification Rules', 'Campaign Builder']

  async function saveAll() {
    setSaving(true)
    try {
      await supabase.from('dermiq_automation').upsert({
        id: 1, wa_flows: waFlows, email_sequences: emailSeqs, notif_rules: notifRules,
        global_active: globalActive, updated_at: new Date().toISOString()
      })
      toast.success('Automation settings saved!')
    } catch {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  async function launchCampaign() {
    if (!campaign.name || !campaign.message) { toast.error('Fill campaign name and message'); return }
    setSaving(true)
    const { error } = await supabase.from('dermiq_campaigns').insert({
      name: campaign.name, audience: campaign.audience, channel: campaign.channel,
      message: campaign.message, subject: campaign.subject,
      schedule_type: campaign.scheduleType, scheduled_at: campaign.scheduledAt || null,
      status: 'scheduled', created_at: new Date().toISOString()
    })
    setSaving(false)
    if (error) { toast.error('Failed to launch campaign'); return }
    toast.success(`Campaign "${campaign.name}" launched!`)
    setCampaign({ name: '', audience: 'All users', channel: 'WhatsApp', message: '', subject: '', scheduleType: 'Immediate', scheduledAt: '' })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
    fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: C.dark, background: '#fff',
    outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6, display: 'block' }
  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 44, height: 24, borderRadius: 12, background: on ? C.teal : C.border, position: 'relative',
    cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
  })
  const toggleKnob = (on: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute',
    top: 3, left: on ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
  })

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: C.bg, minHeight: '100vh', padding: '32px 24px' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontWeight: 700, color: C.dark, margin: 0 }}>Marketing Automation</h1>
          <p style={{ color: C.mu, fontSize: 14, marginTop: 6 }}>Configure WhatsApp flows, email funnels, and campaigns</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 16px' }}>
            <div style={toggleStyle(globalActive)} onClick={() => setGlobalActive(!globalActive)}>
              <div style={toggleKnob(globalActive)} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: globalActive ? C.green : C.mu }}>
              {globalActive ? 'Live' : 'Paused'}
            </span>
          </div>
          <button onClick={saveAll} disabled={saving} style={{
            background: C.teal, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px',
            fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.7 : 1
          }}>
            {saving ? 'Saving...' : '💾 Save All'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 14, padding: 6, border: `1px solid ${C.border}`, marginBottom: 24, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
            background: activeTab === i ? C.teal : 'transparent',
            color: activeTab === i ? '#fff' : C.mu,
          }}>{t}</button>
        ))}
      </div>

      {/* ===== TAB 1: WhatsApp Flows ===== */}
      {activeTab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {waFlows.map((flow, fi) => (
            <div key={flow.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${flow.active ? C.teal + '40' : C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `#25D36615`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Flow {flow.id}: {flow.name}</div>
                    <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>Trigger: {flow.trigger}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: '4px 12px', borderRadius: 20, background: `${C.gold}20`, color: C.gold, fontSize: 12, fontWeight: 700 }}>⏱ {flow.delay}</div>
                  <div style={toggleStyle(flow.active)} onClick={() => {
                    const updated = [...waFlows]; updated[fi] = { ...updated[fi], active: !updated[fi].active }; setWaFlows(updated)
                  }}>
                    <div style={toggleKnob(flow.active)} />
                  </div>
                  <button onClick={() => setEditingFlow(editingFlow === flow.id ? null : flow.id)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>
                    {editingFlow === flow.id ? 'Close' : 'Edit'}
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px 22px' }}>
                {/* Variables */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {flow.variables.map(v => (
                    <span key={v} style={{ padding: '4px 10px', borderRadius: 20, background: `${C.purple}15`, color: C.purple, fontSize: 11, fontWeight: 700 }}>{v}</span>
                  ))}
                </div>

                {editingFlow === flow.id ? (
                  <div>
                    <label style={labelStyle}>Message</label>
                    <textarea value={flow.message} onChange={e => {
                      const updated = [...waFlows]; updated[fi] = { ...updated[fi], message: e.target.value }; setWaFlows(updated)
                    }} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                ) : (
                  <div style={{ background: `#25D36610`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: C.dark, lineHeight: 1.7, borderLeft: `3px solid #25D366` }}>
                    {flow.message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== TAB 2: Email Funnels ===== */}
      {activeTab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {emailSeqs.map((seq, si) => (
            <div key={seq.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.blue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📧</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>Sequence {seq.id}: {seq.name}</div>
                    <div style={{ fontSize: 12, color: C.mu, marginTop: 2 }}>Subject: {seq.subject}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, background: `${C.blue}15`, color: C.blue, fontSize: 12, fontWeight: 700 }}>{seq.emails.length} emails</div>
                </div>
              </div>

              <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {seq.emails.map((email, ei) => (
                  <div key={ei} style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div
                      onClick={() => {
                        const updated = emailSeqs.map((s, sIdx) => sIdx === si ? {
                          ...s, emails: s.emails.map((e, eIdx) => eIdx === ei ? { ...e, expanded: !e.expanded } : e)
                        } : s)
                        setEmailSeqs(updated)
                      }}
                      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: email.expanded ? `${C.teal}08` : '#fff', transition: 'background 0.15s' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.teal}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.teal, flexShrink: 0 }}>D{email.day}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{email.label}</div>
                        <div style={{ fontSize: 12, color: C.mu, marginTop: 1 }}>{email.subject}</div>
                      </div>
                      <span style={{ color: C.mu, fontSize: 16 }}>{email.expanded ? '▲' : '▼'}</span>
                    </div>
                    {email.expanded && (
                      <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
                        <div style={{ fontSize: 12, color: C.mu, marginBottom: 8 }}>Preview: {email.preview}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.teal}`, background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.teal }}>Edit Email</button>
                          <button style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>Preview</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== TAB 3: Notification Rules ===== */}
      {activeTab === 2 && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700, color: C.dark, margin: 0 }}>Automated Notification Rules</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Event', 'Channel', 'Delay', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.mu, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notifRules.map((rule, ri) => (
                <tr key={rule.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: C.dark }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: rule.active ? C.green : C.border, flexShrink: 0 }} />
                      {rule.event}
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: C.mu }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: `${C.blue}15`, color: C.blue, fontSize: 11, fontWeight: 700 }}>{rule.channel}</span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: C.mu }}>{rule.delay}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={toggleStyle(rule.active)} onClick={() => {
                        const updated = [...notifRules]; updated[ri] = { ...updated[ri], active: !updated[ri].active }; setNotifRules(updated)
                      }}>
                        <div style={toggleKnob(rule.active)} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: rule.active ? C.green : C.mu }}>{rule.active ? 'Active' : 'Paused'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== TAB 4: Campaign Builder ===== */}
      {activeTab === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 24 }}>Create Campaign</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Campaign Name</label>
                <input style={inputStyle} value={campaign.name} onChange={e => setCampaign({ ...campaign, name: e.target.value })} placeholder="Summer Glow Campaign" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={campaign.audience} onChange={e => setCampaign({ ...campaign, audience: e.target.value })}>
                    {Object.keys(AUDIENCE_REACH).map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Channel</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={campaign.channel} onChange={e => setCampaign({ ...campaign, channel: e.target.value })}>
                    <option>WhatsApp</option>
                    <option>Email</option>
                    <option>Both</option>
                  </select>
                </div>
              </div>

              {(campaign.channel === 'Email' || campaign.channel === 'Both') && (
                <div>
                  <label style={labelStyle}>Email Subject</label>
                  <input style={inputStyle} value={campaign.subject} onChange={e => setCampaign({ ...campaign, subject: e.target.value })} placeholder="Subject line for your campaign..." />
                </div>
              )}

              <div>
                <label style={labelStyle}>Message</label>
                <textarea value={campaign.message} onChange={e => setCampaign({ ...campaign, message: e.target.value })} rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} placeholder="Hi {name}! Here's something special for you..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Schedule</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={campaign.scheduleType} onChange={e => setCampaign({ ...campaign, scheduleType: e.target.value })}>
                    <option>Immediate</option>
                    <option>Scheduled</option>
                  </select>
                </div>
                {campaign.scheduleType === 'Scheduled' && (
                  <div>
                    <label style={labelStyle}>Date & Time</label>
                    <input type="datetime-local" style={inputStyle} value={campaign.scheduledAt} onChange={e => setCampaign({ ...campaign, scheduledAt: e.target.value })} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: C.mu }}>
                  Preview
                </button>
                <button onClick={launchCampaign} disabled={saving} style={{
                  flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: C.teal, color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif', opacity: saving ? 0.7 : 1
                }}>
                  {saving ? 'Launching...' : '🚀 Launch Campaign'}
                </button>
              </div>
            </div>
          </div>

          {/* Estimated Reach */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Estimated Reach</h3>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 52, fontWeight: 800, color: C.teal }}>{(AUDIENCE_REACH[campaign.audience] || 0).toLocaleString()}</div>
                <div style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>users will receive this campaign</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                {Object.entries(AUDIENCE_REACH).map(([seg, count]) => (
                  <div key={seg} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: campaign.audience === seg ? `${C.teal}10` : C.bg, border: `1px solid ${campaign.audience === seg ? C.teal + '40' : C.border}`, cursor: 'pointer', transition: 'all 0.15s' }}
                    onClick={() => setCampaign({ ...campaign, audience: seg })}>
                    <span style={{ fontSize: 13, color: C.dark }}>{seg}</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: campaign.audience === seg ? C.teal : C.mu }}>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: `${C.gold}15`, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 6 }}>💡 Best Time to Send</div>
              <div style={{ fontSize: 12, color: C.mu, lineHeight: 1.6 }}>WhatsApp: Tue–Thu, 7–9 PM<br />Email: Tue–Thu, 10–11 AM<br />Avoid: Mon mornings, weekends</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
