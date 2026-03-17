'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [profRes, earnRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user?.id).single(),
      supabase.from('specialist_earnings').select('*').eq('specialist_id', user?.id).order('created_at', { ascending: false }),
    ])
    setProfile(profRes.data)
    setEarnings(earnRes.data || [])
    setLoading(false)
  }

  const totalEarned = earnings.reduce((s, e) => s + (e.amount || 0), 0)
  const pendingPayout = earnings.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0)
  const paidOut = earnings.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount || 0), 0)
  const consultationEarnings = earnings.filter(e => e.type === 'consultation').reduce((s, e) => s + (e.amount || 0), 0)
  const commissionEarnings = earnings.filter(e => e.type === 'order_commission').reduce((s, e) => s + (e.amount || 0), 0)

  async function requestPayout() {
    if (pendingPayout < 100) { toast.error('Minimum payout is ₹100'); return }
    toast.success(`Payout request of ₹${pendingPayout} submitted!`)
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>
          My <span style={{ color: 'var(--gold)' }}>Earnings</span>
        </h1>
        <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
          {profile?.name} · ₹30/consultation + 12% order commission
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Earned', value: `₹${totalEarned.toLocaleString('en-IN')}`, color: 'var(--green)' },
          { label: 'Pending Payout', value: `₹${pendingPayout.toLocaleString('en-IN')}`, color: 'var(--gold)' },
          { label: 'Paid Out', value: `₹${paidOut.toLocaleString('en-IN')}`, color: 'var(--teal)' },
          { label: 'Total Entries', value: earnings.length, color: 'var(--blue)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Earnings Breakdown</div>
          {[
            { label: 'Consultation Fees', value: consultationEarnings, color: 'var(--green)', desc: '₹30 per session' },
            { label: 'Order Commissions', value: commissionEarnings, color: 'var(--blue)', desc: '12% of order value' },
            { label: 'Bonuses', value: earnings.filter(e => e.type === 'bonus').reduce((s, e) => s + e.amount, 0), color: 'var(--gold)', desc: 'Performance bonuses' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>{item.desc}</div>
                </div>
                <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: item.color }}>₹{item.value.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                <div style={{ width: `${totalEarned > 0 ? (item.value / totalEarned) * 100 : 0}%`, height: '100%', background: item.color, borderRadius: 20 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Payout</div>
          <div style={{ background: 'var(--gL)', border: '1px solid rgba(212,168,83,0.3)', borderRadius: 12, padding: '16px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 6 }}>Available for Payout</div>
            <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>₹{pendingPayout.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: 'var(--mu2)', lineHeight: 1.6 }}>
            💡 Payouts are processed via UPI every week.<br />
            Minimum payout amount: <strong style={{ color: 'var(--gold)' }}>₹100</strong>
          </div>
          <button onClick={requestPayout} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 10, color: '#08090C', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
            💰 Request Payout
          </button>
        </div>
      </div>

      {/* Earnings Log */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--b1)', fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>
          Earnings Log
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>Loading...</div>
        ) : earnings.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--mu)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
            <div>No earnings yet. Complete consultations to start earning!</div>
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--mu)' }}>₹30 per consultation · 12% commission on orders</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Type', 'Description', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earnings.map((e, i) => (
                <tr key={i} onMouseOver={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={ev => (ev.currentTarget.style.background = '')}>
                  <td style={{ padding: '11px 14px', fontSize: 11.5, color: 'var(--mu)', fontFamily: 'DM Mono', whiteSpace: 'nowrap' }}>
                    {new Date(e.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: e.type === 'consultation' ? 'var(--grL)' : e.type === 'order_commission' ? 'var(--blL)' : 'var(--gL)', color: e.type === 'consultation' ? 'var(--green)' : e.type === 'order_commission' ? 'var(--blue)' : 'var(--gold)' }}>
                      {e.type === 'consultation' ? '🌿 Consultation' : e.type === 'order_commission' ? '🛒 Commission' : '⭐ Bonus'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--mu2)' }}>{e.description || '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: 'DM Mono', fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>+₹{e.amount}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: e.status === 'paid' ? 'var(--grL)' : 'var(--gL)', color: e.status === 'paid' ? 'var(--green)' : 'var(--gold)' }}>
                      {e.status === 'paid' ? '✓ Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
