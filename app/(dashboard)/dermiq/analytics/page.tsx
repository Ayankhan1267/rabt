'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const REVENUE_TREND = [
  { day: 'Mon', value: 18400, pct: 58 },
  { day: 'Tue', value: 22100, pct: 70 },
  { day: 'Wed', value: 16800, pct: 53 },
  { day: 'Thu', value: 29400, pct: 93 },
  { day: 'Fri', value: 31200, pct: 99 },
  { day: 'Sat', value: 27600, pct: 87 },
  { day: 'Sun', value: 19800, pct: 63 },
]

const SKIN_CONCERNS = [
  { concern: 'Acne & Pimples', sales: 87, pct: 85, color: '#EF4444' },
  { concern: 'Dark Spots / Hyperpigmentation', sales: 73, pct: 71, color: '#F59E0B' },
  { concern: 'Dry Skin / Dehydration', sales: 61, pct: 60, color: '#3B82F6' },
  { concern: 'Oily / Combination Skin', sales: 54, pct: 53, color: '#22C55E' },
  { concern: 'Anti-Aging / Fine Lines', sales: 38, pct: 37, color: '#A855F7' },
  { concern: 'Sensitive Skin', sales: 29, pct: 28, color: '#14B8A6' },
]

const TOP_AI_PRODUCTS = [
  { rank: 1, product: '10% Niacinamide Serum', brand: 'The Minimalist', aiSales: 64, totalSales: 78, aiPct: 82 },
  { rank: 2, product: 'Glycolic Acid 08%', brand: 'Plum', aiSales: 47, totalSales: 61, aiPct: 77 },
  { rank: 3, product: 'Sea Buckthorn Oil', brand: 'Pilgrim', aiSales: 31, totalSales: 41, aiPct: 76 },
  { rank: 4, product: 'Vitamin C 10% Serum', brand: 'Dot & Key', aiSales: 38, totalSales: 52, aiPct: 73 },
  { rank: 5, product: 'SPF 50 Sunscreen', brand: 'Dot & Key', aiSales: 22, totalSales: 34, aiPct: 65 },
]

function fmt(n: number) {
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n
}

export default function AnalyticsPage() {
  const maxRevenue = Math.max(...REVENUE_TREND.map(d => d.value))

  return (
    <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif', color: 'var(--tx)', minHeight: '100vh', background: 'var(--b1)' }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>📈 Marketplace Analytics</div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>AI-driven insights, conversion intelligence, and performance metrics</div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Conversion Rate', value: '4.2%', sub: '+0.4% this week', icon: '🎯', color: 'var(--teal)' },
          { label: 'AI-Driven Sales', value: '68%', sub: 'of total revenue', icon: '🧠', color: '#A855F7' },
          { label: 'Return Rate', value: '3.1%', sub: 'Industry avg 8%', icon: '↩️', color: 'var(--green)' },
          { label: 'Avg Session', value: '4m 32s', sub: '+28s vs last week', icon: '⏱️', color: '#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif', marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>{k.label}</div>
            <div style={{ fontSize: 11, color: k.color, marginTop: 5, fontWeight: 500 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Revenue Trend Chart */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>📊 7-Day Revenue Trend</div>
            <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>Total: ₹1.65L this week</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, paddingBottom: 8 }}>
            {REVENUE_TREND.map(d => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>{fmt(d.value)}</div>
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg, var(--teal), rgba(20,184,166,0.4))', height: `${d.pct}%`, minHeight: 6, transition: 'height 0.4s ease' }} />
                <div style={{ fontSize: 11, color: 'var(--mu)' }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Skin Concerns Driving Sales */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>🧠 AI Concerns → Sales</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {SKIN_CONCERNS.map(c => (
              <div key={c.concern}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{c.concern}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{c.sales} sales</span>
                </div>
                <div style={{ height: 7, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 3, opacity: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top AI-Recommended Products */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--s2)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--s2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Top Products by AI Recommendations</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--mu)', background: 'var(--s2)', padding: '3px 8px', borderRadius: 5 }}>Last 30 days</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--s2)' }}>
              {['#', 'Product', 'Brand', 'AI-Driven Sales', 'Total Sales', 'AI Attribution'].map(h => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOP_AI_PRODUCTS.map((p, i) => (
              <tr key={p.rank} style={{ borderBottom: i < TOP_AI_PRODUCTS.length - 1 ? '1px solid var(--s2)' : 'none' }}>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--mu)', fontSize: 13 }}>{p.rank}</span>
                </td>
                <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13 }}>{p.product}</td>
                <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--mu)' }}>{p.brand}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#A855F7' }}>{p.aiSales}</span>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13 }}>{p.totalSales}</td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 7, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.aiPct}%`, background: 'linear-gradient(90deg, #A855F7, #7C3AED)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#A855F7', minWidth: 32 }}>{p.aiPct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
