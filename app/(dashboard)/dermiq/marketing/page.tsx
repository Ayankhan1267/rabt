'use client'
import { useState } from 'react'

const C = { teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B', mu: '#6B7280', border: '#E5E7EB', cream: '#F7F3EE', green: '#10B981', red: '#EF4444', gold: '#D4A853' }

const CAMPAIGNS = [
  { name: 'Summer Glow Sale', type: 'Flash Sale', status: 'active', reach: '12.4K', clicks: 1840, conversions: 212, revenue: 84800, start: '2025-03-15', end: '2025-03-31' },
  { name: 'New Vendor Welcome', type: 'Email', status: 'active', reach: '3.2K', clicks: 420, conversions: 38, revenue: 15200, start: '2025-03-01', end: '2025-04-01' },
  { name: 'Niacinamide 101', type: 'Content', status: 'completed', reach: '8.7K', clicks: 1200, conversions: 89, revenue: 35600, start: '2025-02-01', end: '2025-02-28' },
  { name: 'Refer & Earn', type: 'Referral', status: 'paused', reach: '5.1K', clicks: 640, conversions: 55, revenue: 22000, start: '2025-01-20', end: '2025-03-20' },
]

export default function DermIQMarketing() {
  const [tab, setTab] = useState<'campaigns' | 'email' | 'social'>('campaigns')

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: C.dark, margin: '0 0 4px' }}>DermIQ Marketing</h1>
        <p style={{ fontSize: 13, color: C.mu, margin: 0 }}>Campaigns, emails, promotions and growth for DermIQ marketplace</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { icon: '📢', label: 'Active Campaigns', value: CAMPAIGNS.filter(c => c.status === 'active').length, color: C.teal },
          { icon: '👁️', label: 'Total Reach', value: '29.4K', color: '#3B82F6' },
          { icon: '🖱️', label: 'Total Clicks', value: '4,100', color: C.gold },
          { icon: '💰', label: 'Revenue Attributed', value: '₹1.57L', color: C.green },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['campaigns', 'email', 'social'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${tab === t ? C.teal : C.border}`, background: tab === t ? C.teal : '#fff', color: tab === t ? '#fff' : C.mu, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
                {['Campaign', 'Type', 'Reach', 'Clicks', 'Conversions', 'Revenue', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.mu, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c, i) => (
                <tr key={i} style={{ borderBottom: i < CAMPAIGNS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.mu }}>{c.start} → {c.end}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8, background: C.teal + '15', color: C.teal, fontWeight: 600 }}>{c.type}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.dark }}>{c.reach}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: C.dark }}>{c.clicks.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: C.dark }}>{c.conversions}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: C.green }}>₹{c.revenue.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: c.status === 'active' ? C.green + '18' : c.status === 'completed' ? C.mu + '18' : C.gold + '18', color: c.status === 'active' ? C.green : c.status === 'completed' ? C.mu : C.gold }}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'email' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: '0 0 8px' }}>Email Marketing</h3>
          <p style={{ fontSize: 13, color: C.mu, margin: '0 0 20px' }}>Connect your email provider (SendGrid / Mailchimp) to launch email campaigns for DermIQ customers.</p>
          <button style={{ padding: '10px 24px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Connect Email Provider</button>
        </div>
      )}

      {tab === 'social' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: `1px solid ${C.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: C.dark, margin: '0 0 8px' }}>Social Media</h3>
          <p style={{ fontSize: 13, color: C.mu, margin: '0 0 20px' }}>Schedule posts and track performance across Instagram, WhatsApp Broadcast, and other channels for DermIQ.</p>
          <button style={{ padding: '10px 24px', background: `linear-gradient(135deg,${C.teal},${C.teal2})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Connect Channels</button>
        </div>
      )}
    </div>
  )
}
