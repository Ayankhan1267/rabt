'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function SpecialistDashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const mongoUrl = typeof window !== 'undefined' ? localStorage.getItem('rabt_mongo_url') : null

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [profRes, earnRes, leadsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user?.id).single(),
      supabase.from('specialist_earnings').select('*').eq('specialist_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('leads').select('*').eq('assigned_to', user?.id),
    ])
    setProfile(profRes.data)
    setEarnings(earnRes.data || [])
    setLeads(leadsRes.data || [])

    if (mongoUrl) {
      try {
        const res = await fetch(mongoUrl + '/api/consultations')
        if (res.ok) {
          const data = await res.json()
          const myId = profRes.data?.specialist_id
          setConsultations(myId ? data.filter((c: any) => c.assignedSpecialist === myId) : data.slice(0, 10))
        }
      } catch {}
    }
    setLoading(false)
  }

  const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0)
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0)
  const pending = consultations.filter(c => ['pending', 'scheduled', 'accepted'].includes(c.status))
  const completed = consultations.filter(c => c.status === 'completed')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>
          Specialist <span style={{ color: 'var(--gold)' }}>HQ</span>
        </h1>
        <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
          Welcome back, {profile?.name || 'Specialist'} 🌿
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Consultations', value: consultations.length, color: 'var(--blue)' },
          { label: 'Pending', value: pending.length, color: 'var(--orange)' },
          { label: 'Completed', value: completed.length, color: 'var(--green)' },
          { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString('en-IN')}`, color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pending Consultations */}
        <div className="card">
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
            🌿 Pending Consultations ({pending.length})
          </div>
          {pending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mu)', fontSize: 13 }}>
              No pending consultations
            </div>
          ) : pending.slice(0, 6).map((c, i) => (
            <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{c.name}</div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: 'var(--orL)', color: 'var(--orange)' }}>{c.status}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--mu)' }}>
                Age {c.age} · {c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString('en-IN') : 'Not scheduled'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--mu2)', marginTop: 2 }}>{c.concern}</div>
            </div>
          ))}
          <a href="/consultations" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
            View all consultations →
          </a>
        </div>

        {/* Earnings + Leads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>💰 Earnings Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: 'var(--grL)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>₹{totalEarnings.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>Total Earned</div>
              </div>
              <div style={{ background: 'var(--gL)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>₹{pendingEarnings.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>Pending Payout</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu2)', lineHeight: 1.6, background: 'var(--s2)', borderRadius: 8, padding: '10px 12px' }}>
              💡 You earn <strong style={{ color: 'var(--gold)' }}>₹30</strong> per consultation completed<br />
              + <strong style={{ color: 'var(--gold)' }}>12%</strong> commission on orders from your leads
            </div>
            <a href="/earnings" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              View full earnings →
            </a>
          </div>

          <div className="card">
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 12 }}>🎯 My Leads ({leads.length})</div>
            {leads.slice(0, 4).map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--b1)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mu)' }}>{l.concern || l.source}</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: l.stage === 'converted' ? 'var(--grL)' : 'var(--gL)', color: l.stage === 'converted' ? 'var(--green)' : 'var(--gold)', alignSelf: 'center' }}>{l.stage}</span>
              </div>
            ))}
            {leads.length === 0 && <p style={{ color: 'var(--mu)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No leads assigned yet</p>}
            <a href="/crm" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 12.5, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              View all leads →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
