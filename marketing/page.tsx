'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function MarketingPage() {
  const campaigns = [
    { name: 'Spring Glow Sale', platform: 'Meta Ads', status: 'Live', budget: '₹500/day', leads: 68, roas: 4.1, spend: '₹3,200' },
    { name: 'Consultation Lead Gen', platform: 'Instagram', status: 'Live', budget: '₹300/day', leads: 112, roas: 3.8, spend: '₹5,800' },
    { name: 'Moong Magic Launch', platform: 'Meta Ads', status: 'Paused', budget: '₹200/day', leads: 24, roas: 2.9, spend: '₹1,400' },
  ]
  const influencers = [
    { name: '@skincarewithpriya', followers: '48K', stage: 'Negotiating', niche: 'Skincare' },
    { name: '@beautybyananya', followers: '22K', stage: 'Contacted', niche: 'Lifestyle' },
    { name: '@glow_with_sunita', followers: '15K', stage: 'Confirmed ✅', niche: 'Skincare' },
    { name: '@indianskincare_tips', followers: '92K', stage: 'Outreach Sent', niche: 'Skincare' },
  ]
  const launches = [
    { label: 'Reel #1 Go Live', date: 'Mar 13', color: 'var(--purple)' },
    { label: 'Scale Ads to ₹1K/day', date: 'Mar 16', color: 'var(--blue)' },
    { label: 'Influencer Post - Priya', date: 'Mar 20', color: 'var(--gold)' },
    { label: 'Oats Care Promo Launch', date: 'Mar 25', color: 'var(--orange)' },
    { label: 'Amazon Seller Go Live', date: 'Apr 1', color: 'var(--green)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>Marketing <span style={{ color: 'var(--gold)' }}>Center</span></h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Active Campaigns</div>
          {campaigns.map((c, i) => (
            <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{c.name}</div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: c.status === 'Live' ? 'var(--grL)' : 'var(--gL)', color: c.status === 'Live' ? 'var(--green)' : 'var(--gold)' }}>{c.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--mu)' }}>
                <span>{c.platform}</span><span>Spend: {c.spend}</span><span>ROAS: <strong style={{ color: 'var(--green)' }}>{c.roas}×</strong></span>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Influencer Pipeline</div>
          {influencers.map((inf, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--blue)' }}>{inf.name}</div>
                <span style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--mu)' }}>{inf.followers}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>{inf.stage} · {inf.niche}</div>
            </div>
          ))}
          <button onClick={() => toast('Coming soon!')} style={{ width: '100%', marginTop: 12, padding: '7px', background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 8, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>
            + Add Influencer
          </button>
        </div>
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Launch Calendar</div>
          {launches.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5 }}>{l.label}</span>
              <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--mu)' }}>{l.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
