'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORY_REVENUE = [
  { name: 'Serums', value: 72000, pct: 30 },
  { name: 'Moisturisers', value: 48000, pct: 20 },
  { name: 'Sunscreens', value: 36000, pct: 15 },
  { name: 'Toners', value: 28800, pct: 12 },
  { name: 'Face Wash', value: 24000, pct: 10 },
  { name: 'Others', value: 31200, pct: 13 },
]

const TOP_VENDORS = [
  { rank: 1, name: 'Plum Goodness', revenue: 174000, orders: 112, rating: 4.8, trend: '+12%' },
  { rank: 2, name: 'Dot & Key', revenue: 138000, orders: 94, rating: 4.7, trend: '+8%' },
  { rank: 3, name: 'The Minimalist', revenue: 92000, orders: 78, rating: 4.9, trend: '+18%' },
  { rank: 4, name: 'Mamaearth', revenue: 76000, orders: 58, rating: 4.2, trend: '-3%' },
]

const ACTIVITY = [
  { time: '10 min ago', icon: '📦', text: 'New order #DQ-2891 from Priya Sharma — Plum Serum ₹749' },
  { time: '34 min ago', icon: '🏪', text: 'Vendor Pilgrim India completed document upload for KYC' },
  { time: '1 hr ago', icon: '⭐', text: 'New 5-star review on The Minimalist Niacinamide Serum' },
  { time: '2 hr ago', icon: '💸', text: 'Payout of ₹17,400 processed for Plum Goodness' },
  { time: '3 hr ago', icon: '🚀', text: '3 new products listed by Dot & Key — pending AI mapping' },
]

function fmt(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}

export default function MarketplacePage() {
  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>🛍️ Marketplace Overview</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>DermIQ multi-vendor marketplace performance at a glance</div>
      </div>

      {/* Big KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Revenue', value: '₹2.4L', sub: '+24% vs last month', icon: '💰', color: 'var(--teal)' },
          { label: 'Total Orders', value: '342', sub: '12 today', icon: '📦', color: '#A855F7' },
          { label: 'Active Vendors', value: '10', sub: '2 onboarding', icon: '🏪', color: 'var(--green)' },
          { label: 'Avg Order Value', value: '₹698', sub: '+₹32 this week', icon: '📈', color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 26 }}>{k.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)', background: 'var(--s2)', padding: '3px 8px', borderRadius: 5 }}>MTD</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>{k.label}</div>
            <div style={{ fontSize: 11, color: k.color, marginTop: 6, fontWeight: 500 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Revenue by Category */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>📊 Revenue by Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CATEGORY_REVENUE.map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>{fmt(c.value)}</span>
                </div>
                <div style={{ height: 8, background: 'var(--s2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: 'linear-gradient(90deg, var(--teal), #5EEAD4)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 3 }}>{c.pct}% of total</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>⚡ Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--tx)', lineHeight: 1.5 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Vendors Table */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--s2)' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🏆 Top Performing Vendors</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['#', 'Vendor', 'Revenue', 'Orders', 'Avg Rating', 'Growth'].map(h => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOP_VENDORS.map((v, i) => (
              <tr key={v.rank} style={{ borderBottom: i < TOP_VENDORS.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 16 }}>{v.rank === 1 ? '🥇' : v.rank === 2 ? '🥈' : v.rank === 3 ? '🥉' : `#${v.rank}`}</span>
                </td>
                <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 14 }}>{v.name}</td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--teal)', fontSize: 14 }}>{fmt(v.revenue)}</td>
                <td style={{ padding: '14px 20px', fontSize: 14 }}>{v.orders}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 13, color: '#F59E0B' }}>⭐ {v.rating}</span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: v.trend.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{v.trend}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
