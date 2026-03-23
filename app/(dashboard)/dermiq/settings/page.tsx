'use client'
import { useState } from 'react'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

export default function DermIQSettings() {
  const [platformName, setPlatformName] = useState('DermIQ')
  const [commissionRate, setCommissionRate] = useState('15')
  const [aiEnabled, setAiEnabled] = useState(true)
  const [autoKyc, setAutoKyc] = useState(false)
  const [minPayout, setMinPayout] = useState('500')
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? C.teal : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  )

  const Section = ({ title, children }: any) => (
    <div style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', border: `1px solid ${C.border}`, marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: C.dark, margin: '0 0 18px', paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>{title}</h3>
      {children}
    </div>
  )

  const Field = ({ label, desc, children }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{desc}</div>}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Settings</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Configure DermIQ platform settings — independent of Rabt settings</p>
      </div>

      <Section title="Platform Identity">
        <Field label="Platform Name" desc="Display name used across the DermIQ marketplace">
          <input value={platformName} onChange={e => setPlatformName(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 160 }} />
        </Field>
        <Field label="Support Email" desc="Email shown to vendors and customers">
          <input defaultValue="support@dermiq.in" style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 200 }} />
        </Field>
      </Section>

      <Section title="Marketplace Rules">
        <Field label="Default Commission Rate (%)" desc="Platform commission on all vendor sales">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input value={commissionRate} onChange={e => setCommissionRate(e.target.value)} type="number" min={0} max={50} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 80 }} />
            <span style={{ fontSize: 13, color: C.mu }}>%</span>
          </div>
        </Field>
        <Field label="Minimum Payout (₹)" desc="Minimum vendor balance before payout is processed">
          <input value={minPayout} onChange={e => setMinPayout(e.target.value)} type="number" min={100} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 100 }} />
        </Field>
        <Field label="Auto-approve KYC" desc="Automatically approve vendor KYC if documents are complete">
          <Toggle value={autoKyc} onChange={setAutoKyc} />
        </Field>
      </Section>

      <Section title="AI Features">
        <Field label="AI Skin Matching" desc="Enable AI-powered product recommendations for customers">
          <Toggle value={aiEnabled} onChange={setAiEnabled} />
        </Field>
        <Field label="AI Consultation Routing" desc="Automatically route consultations to best-match specialist">
          <Toggle value={true} onChange={() => {}} />
        </Field>
        <Field label="Vendor AI Mapping" desc="Allow vendors to map products to skin concerns for AI engine">
          <Toggle value={true} onChange={() => {}} />
        </Field>
      </Section>

      <Section title="Notifications">
        <Field label="New Vendor Registration" desc="Notify admins when a new vendor registers">
          <Toggle value={true} onChange={() => {}} />
        </Field>
        <Field label="Order Alerts" desc="Real-time alerts for new orders above ₹1,000">
          <Toggle value={true} onChange={() => {}} />
        </Field>
        <Field label="KYC Submission" desc="Alert when vendor submits KYC documents">
          <Toggle value={true} onChange={() => {}} />
        </Field>
      </Section>

      {/* SQL */}
      <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '14px 18px', border: '1px solid #BFDBFE', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0, lineHeight: 1.6 }}>
          📋 <strong>Run in Supabase SQL Editor to complete DermIQ setup:</strong><br />
          <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dermiq_role text;</code><br />
          <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>CREATE TABLE IF NOT EXISTS dermiq_consultations (...)</code><br />
          <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>CREATE TABLE IF NOT EXISTS dermiq_customers (...)</code><br />
          See <strong>/dermiq/team</strong> page for full SQL.
        </p>
      </div>

      <button onClick={save} style={{ padding: '12px 32px', background: saved ? C.green : `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background 0.3s' }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
