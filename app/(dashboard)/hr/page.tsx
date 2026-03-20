'use client'
import { useEffect, useState } from 'react'
import { supabase, ROLE_CONFIG, UserRole } from '@/lib/supabase'
import toast from 'react-hot-toast'

const DEPARTMENTS = ['Management', 'Sales', 'Specialist', 'Operations', 'Support', 'Marketing', 'Finance', 'Content', 'Partner']

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Work From Home', 'Half Day', 'Emergency']
const LEAVE_COLORS: Record<string, string> = {
  'Sick Leave':    'var(--red)',
  'Casual Leave':  'var(--blue)',
  'Work From Home':'var(--teal)',
  'Half Day':      'var(--gold)',
  'Emergency':     'var(--orange)',
}

const ATTENDANCE_STATUS = ['Present', 'Absent', 'Late', 'WFH', 'Half Day', 'Leave']
const ATTENDANCE_COLORS: Record<string, string> = {
  Present:  'var(--green)',
  Absent:   'var(--red)',
  Late:     'var(--orange)',
  WFH:      'var(--blue)',
  'Half Day':'var(--gold)',
  Leave:    'var(--purple)',
}

const ROLE_DEPT: Record<string, string> = {
  founder:           'Management',
  admin:             'Management',
  manager:           'Management',
  specialist_manager:'Specialist',
  specialist:        'Specialist',
  ops:               'Operations',
  support:           'Support',
  content_creator:   'Content',
  finance:           'Finance',
  partner:           'Partner',
}

export default function HRPage() {
  const [myProfile, setMyProfile]     = useState<any>(null)
  const [members, setMembers]         = useState<any[]>([])
  const [leaves, setLeaves]           = useState<any[]>([])
  const [attendance, setAttendance]   = useState<any[]>([])
  const [payroll, setPayroll]         = useState<any[]>([])
  const [tab, setTab]                 = useState<'overview'|'attendance'|'leaves'|'payroll'|'performance'>('overview')
  const [loading, setLoading]         = useState(true)
  const [showLeaveModal, setShowLeaveModal]   = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [selectedMember, setSelectedMember]   = useState<any>(null)

  const [leaveForm, setLeaveForm] = useState({
    member_id: '', leave_type: 'Casual Leave', from_date: '', to_date: '',
    reason: '', days: 1,
  })
  const [payrollForm, setPayrollForm] = useState({
    member_id: '', month: new Date().toISOString().slice(0, 7),
    basic: '', hra: '', allowances: '', deductions: '', bonus: '', notes: '',
  })

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [myProf, membersRes, leavesRes, attendanceRes, payrollRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user?.id).single(),
      supabase.from('profiles').select('*').eq('is_active', true).order('name'),
      supabase.from('hr_leaves').select('*, member:member_id(id,name,role,email)').order('created_at', { ascending: false }),
      supabase.from('hr_attendance').select('*, member:member_id(id,name,role)').eq('date', today).order('created_at'),
      supabase.from('hr_payroll').select('*, member:member_id(id,name,role)').order('month', { ascending: false }).limit(50),
    ])
    setMyProfile(myProf.data)
    setMembers(membersRes.data || [])
    setLeaves(leavesRes.data || [])
    setAttendance(attendanceRes.data || [])
    setPayroll(payrollRes.data || [])
    setLoading(false)
  }

  async function markAttendance(memberId: string, status: string) {
    const existing = attendance.find(a => a.member_id === memberId && a.date === today)
    if (existing) {
      await supabase.from('hr_attendance').update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('hr_attendance').insert({ member_id: memberId, date: today, status })
    }
    toast.success('Attendance marked!')
    loadAll()
  }

  async function submitLeave() {
    if (!leaveForm.member_id || !leaveForm.from_date || !leaveForm.to_date) {
      toast.error('Fill all required fields'); return
    }
    const days = Math.ceil((new Date(leaveForm.to_date).getTime() - new Date(leaveForm.from_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
    await supabase.from('hr_leaves').insert({ ...leaveForm, days, status: 'pending', applied_by: myProfile?.id })
    toast.success('Leave applied!')
    setShowLeaveModal(false)
    setLeaveForm({ member_id: '', leave_type: 'Casual Leave', from_date: '', to_date: '', reason: '', days: 1 })
    loadAll()
  }

  async function updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
    await supabase.from('hr_leaves').update({ status, reviewed_by: myProfile?.id, reviewed_at: new Date().toISOString() }).eq('id', id)
    toast.success(`Leave ${status}!`)
    loadAll()
  }

  async function savePayroll() {
    if (!payrollForm.member_id || !payrollForm.month) { toast.error('Member aur month required'); return }
    const basic      = parseFloat(payrollForm.basic) || 0
    const hra        = parseFloat(payrollForm.hra) || 0
    const allowances = parseFloat(payrollForm.allowances) || 0
    const deductions = parseFloat(payrollForm.deductions) || 0
    const bonus      = parseFloat(payrollForm.bonus) || 0
    const gross      = basic + hra + allowances + bonus
    const net        = gross - deductions

    const existing = payroll.find(p => p.member_id === payrollForm.member_id && p.month === payrollForm.month)
    if (existing) {
      await supabase.from('hr_payroll').update({ basic, hra, allowances, deductions, bonus, gross, net, notes: payrollForm.notes }).eq('id', existing.id)
    } else {
      await supabase.from('hr_payroll').insert({ ...payrollForm, basic, hra, allowances, deductions, bonus, gross, net, created_by: myProfile?.id })
    }
    toast.success('Payroll saved!')
    setShowPayrollModal(false)
    setPayrollForm({ member_id: '', month: currentMonth, basic: '', hra: '', allowances: '', deductions: '', bonus: '', notes: '' })
    loadAll()
  }

  // ── Computed stats ──
  const presentToday   = attendance.filter(a => a.status === 'Present').length
  const absentToday    = members.length - attendance.length
  const pendingLeaves  = leaves.filter(l => l.status === 'pending').length
  const thisMonthPayroll = payroll.filter(p => p.month === currentMonth)
  const totalPayrollCost = thisMonthPayroll.reduce((s, p) => s + (p.net || 0), 0)

  // Department breakdown
  const deptBreakdown = DEPARTMENTS.map(dept => ({
    dept,
    count: members.filter(m => ROLE_DEPT[m.role] === dept).length,
  })).filter(d => d.count > 0)

  // Leave balance per member (simple: 12 casual, 12 sick per year)
  function getLeaveBalance(memberId: string) {
    const approved = leaves.filter(l => l.member_id === memberId && l.status === 'approved' && new Date(l.from_date).getFullYear() === new Date().getFullYear())
    const sick     = approved.filter(l => l.leave_type === 'Sick Leave').reduce((s, l) => s + (l.days || 1), 0)
    const casual   = approved.filter(l => l.leave_type === 'Casual Leave').reduce((s, l) => s + (l.days || 1), 0)
    return { sick: Math.max(0, 12 - sick), casual: Math.max(0, 12 - casual) }
  }

  const isManager = ['founder', 'admin', 'manager'].includes(myProfile?.role || '')

  const inp: any = {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8,
    padding: '9px 12px', color: 'var(--tx)', fontSize: 13, fontFamily: 'Outfit', outline: 'none', marginBottom: 10,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 28, height: 28, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ color: 'var(--mu)', fontSize: 13 }}>Loading HR data...</div>
    </div>
  )

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>
            HR <span style={{ color: 'var(--gold)' }}>Management</span>
          </h1>
          <p style={{ color: 'var(--mu)', fontSize: 12.5, marginTop: 4 }}>
            {members.length} employees · {presentToday} present today · {pendingLeaves} pending leaves
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLeaveModal(true)} style={{ padding: '8px 16px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: 'var(--blue)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
            + Leave Request
          </button>
          {isManager && (
            <button onClick={() => setShowPayrollModal(true)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
              + Add Payroll
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Employees', value: members.length,            color: 'var(--blue)'   },
          { label: 'Present Today',   value: presentToday,              color: 'var(--green)'  },
          { label: 'Absent Today',    value: absentToday,               color: 'var(--red)'    },
          { label: 'Pending Leaves',  value: pendingLeaves,             color: 'var(--orange)' },
          { label: 'Payroll (Month)', value: `₹${totalPayrollCost.toLocaleString('en-IN')}`, color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--b1)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'overview',    label: '🏢 Overview'   },
          { id: 'attendance',  label: '📋 Attendance' },
          { id: 'leaves',      label: `🌴 Leaves${pendingLeaves > 0 ? ` (${pendingLeaves})` : ''}` },
          { id: 'payroll',     label: '💰 Payroll'    },
          { id: 'performance', label: '⭐ Performance' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit',
            background: tab === t.id ? 'var(--gL)' : 'transparent',
            color:      tab === t.id ? 'var(--gold)' : 'var(--mu2)',
            border:    `1px solid ${tab === t.id ? 'rgba(212,168,83,0.3)' : 'var(--b1)'}`,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════════════════════════════
          OVERVIEW TAB
      ════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Team list */}
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Team Directory</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {members.map((m, i) => {
                const roleCfg     = ROLE_CONFIG[m.role as UserRole]
                const todayAtt    = attendance.find(a => a.member_id === m.id)
                const balance     = getLeaveBalance(m.id)
                const memberPayroll = payroll.find(p => p.member_id === m.id && p.month === currentMonth)

                return (
                  <div key={i} onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                    style={{ background: 'var(--s1)', border: `1px solid ${selectedMember?.id === m.id ? 'var(--gold)' : 'var(--b1)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.13s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Avatar */}
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: roleCfg?.color || '#0097A7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {(m.name || 'U').charAt(0)}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                      </div>
                      {/* Role badge */}
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: (roleCfg?.color || '#0097A7') + '22', color: roleCfg?.color || '#0097A7', whiteSpace: 'nowrap' }}>
                        {roleCfg?.label || m.role}
                      </span>
                      {/* Today attendance */}
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: todayAtt ? (ATTENDANCE_COLORS[todayAtt.status] || 'var(--mu)') + '22' : 'rgba(255,255,255,0.05)', color: todayAtt ? ATTENDANCE_COLORS[todayAtt.status] || 'var(--mu)' : 'var(--mu)', whiteSpace: 'nowrap' }}>
                        {todayAtt?.status || 'Not Marked'}
                      </span>
                      {/* Dept */}
                      <span style={{ fontSize: 10, color: 'var(--mu)', whiteSpace: 'nowrap' }}>{ROLE_DEPT[m.role] || '—'}</span>
                    </div>

                    {/* Expanded details */}
                    {selectedMember?.id === m.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--b1)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                        {[
                          { label: 'Sick Leave Left',   value: balance.sick,                                      color: 'var(--red)'   },
                          { label: 'Casual Leave Left',  value: balance.casual,                                    color: 'var(--blue)'  },
                          { label: 'This Month Salary',  value: memberPayroll ? `₹${memberPayroll.net?.toLocaleString('en-IN')}` : '—', color: 'var(--green)' },
                          { label: 'Phone',              value: m.phone || '—',                                   color: 'var(--mu2)'   },
                        ].map((item, j) => (
                          <div key={j} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Department breakdown */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 14 }}>🏢 Departments</div>
              {deptBreakdown.map((d, i) => {
                const maxCount = Math.max(...deptBreakdown.map(x => x.count), 1)
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--mu2)' }}>{d.dept}</span>
                      <span style={{ fontSize: 12, fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--teal)' }}>{d.count}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(d.count / maxCount) * 100}%`, background: 'var(--teal)', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Today's attendance summary */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 14 }}>📋 Today's Summary</div>
              {Object.entries(ATTENDANCE_COLORS).map(([status, color]) => {
                const count = status === 'Absent'
                  ? members.length - attendance.length
                  : attendance.filter(a => a.status === status).length
                if (count === 0) return null
                return (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--b1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12.5, color: 'var(--mu2)' }}>{status}</span>
                    </div>
                    <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 700, color }}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Recent leaves */}
            <div className="card">
              <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 800, marginBottom: 14 }}>🌴 Recent Leaves</div>
              {leaves.slice(0, 5).map((l, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--b1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{l.member?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--mu)' }}>{l.leave_type} · {l.days} day{l.days > 1 ? 's' : ''}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 700, background: l.status === 'approved' ? 'var(--grL)' : l.status === 'rejected' ? 'var(--rdL)' : 'var(--gL)', color: l.status === 'approved' ? 'var(--green)' : l.status === 'rejected' ? 'var(--red)' : 'var(--gold)' }}>
                    {l.status}
                  </span>
                </div>
              ))}
              {leaves.length === 0 && <div style={{ textAlign: 'center', color: 'var(--mu)', fontSize: 12, padding: '16px 0' }}>No leaves yet</div>}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          ATTENDANCE TAB
      ════════════════════════════ */}
      {tab === 'attendance' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>
              📋 Attendance — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mu)' }}>{presentToday}/{members.length} present</div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Role', 'Department', 'Status Today', 'Mark Attendance'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const roleCfg  = ROLE_CONFIG[m.role as UserRole]
                  const todayAtt = attendance.find(a => a.member_id === m.id)
                  return (
                    <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: roleCfg?.color || '#0097A7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {(m.name || 'U').charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--mu)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: (roleCfg?.color || '#0097A7') + '22', color: roleCfg?.color || '#0097A7' }}>
                          {roleCfg?.label || m.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--mu2)' }}>{ROLE_DEPT[m.role] || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: todayAtt ? (ATTENDANCE_COLORS[todayAtt.status] || 'var(--mu)') + '22' : 'rgba(255,255,255,0.05)', color: todayAtt ? ATTENDANCE_COLORS[todayAtt.status] || 'var(--mu)' : 'var(--mu)' }}>
                          {todayAtt?.status || 'Not Marked'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {isManager ? (
                          <select
                            value={todayAtt?.status || ''}
                            onChange={e => markAttendance(m.id, e.target.value)}
                            style={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '5px 10px', color: 'var(--tx)', fontSize: 12, fontFamily: 'Outfit', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="">— Mark —</option>
                            {ATTENDANCE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          m.id === myProfile?.id ? (
                            <select
                              value={todayAtt?.status || ''}
                              onChange={e => markAttendance(m.id, e.target.value)}
                              style={{ background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '5px 10px', color: 'var(--tx)', fontSize: 12, fontFamily: 'Outfit', outline: 'none', cursor: 'pointer' }}
                            >
                              <option value="">— Mark —</option>
                              {['Present', 'WFH', 'Half Day'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : <span style={{ fontSize: 11, color: 'var(--mu)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          LEAVES TAB
      ════════════════════════════ */}
      {tab === 'leaves' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>🌴 Leave Requests</div>
            <button onClick={() => setShowLeaveModal(true)} style={{ padding: '8px 16px', background: 'var(--blL)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, color: 'var(--blue)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
              + Apply Leave
            </button>
          </div>

          {/* Pending leaves first */}
          {pendingLeaves > 0 && (
            <div style={{ background: 'var(--orL)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', marginBottom: 10 }}>⚠️ {pendingLeaves} Pending Approval</div>
              {leaves.filter(l => l.status === 'pending').map((l, i) => (
                <div key={i} style={{ background: 'var(--s1)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{l.member?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--mu2)', marginTop: 2 }}>
                      {l.leave_type} · {l.from_date} to {l.to_date} · {l.days} day{l.days > 1 ? 's' : ''}
                    </div>
                    {l.reason && <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 4, fontStyle: 'italic' }}>{l.reason}</div>}
                  </div>
                  {isManager && (
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={() => updateLeaveStatus(l.id, 'approved')} style={{ padding: '6px 14px', background: 'var(--grL)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 7, color: 'var(--green)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => updateLeaveStatus(l.id, 'rejected')} style={{ padding: '6px 14px', background: 'var(--rdL)', border: 'none', borderRadius: 7, color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit' }}>
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All leaves table */}
          <div className="card" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.filter(l => l.status !== 'pending').map((l, i) => (
                  <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{l.member?.name || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: (LEAVE_COLORS[l.leave_type] || 'var(--mu)') + '22', color: LEAVE_COLORS[l.leave_type] || 'var(--mu)' }}>
                        {l.leave_type}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: 'DM Mono', color: 'var(--mu2)' }}>{l.from_date}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: 'DM Mono', color: 'var(--mu2)' }}>{l.to_date}</td>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontFamily: 'DM Mono', fontWeight: 700 }}>{l.days}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--mu2)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason || '—'}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: l.status === 'approved' ? 'var(--grL)' : l.status === 'rejected' ? 'var(--rdL)' : 'var(--gL)', color: l.status === 'approved' ? 'var(--green)' : l.status === 'rejected' ? 'var(--red)' : 'var(--gold)' }}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaves.filter(l => l.status !== 'pending').length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>No leave history</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          PAYROLL TAB
      ════════════════════════════ */}
      {tab === 'payroll' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800 }}>💰 Payroll — {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
              <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 4 }}>Total cost: ₹{totalPayrollCost.toLocaleString('en-IN')}</div>
            </div>
            {isManager && (
              <button onClick={() => setShowPayrollModal(true)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>
                + Add Payroll
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Month', 'Basic', 'HRA', 'Allowances', 'Bonus', 'Deductions', 'Gross', 'Net (Take Home)'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--b1)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.map((p, i) => (
                  <tr key={i} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.018)')} onMouseOut={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 600 }}>{p.member?.name || '—'}</td>
                    <td style={{ padding: '12px 12px', fontSize: 12, fontFamily: 'DM Mono', color: 'var(--mu2)' }}>{p.month}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>₹{(p.basic || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>₹{(p.hra || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 12 }}>₹{(p.allowances || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--green)' }}>₹{(p.bonus || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 12, color: 'var(--red)' }}>-₹{(p.deductions || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 12, fontWeight: 700 }}>₹{(p.gross || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', fontFamily: 'DM Mono', fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>₹{(p.net || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {payroll.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--mu)' }}>
                    No payroll records. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setShowPayrollModal(true)}>Add first record →</span>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          PERFORMANCE TAB
      ════════════════════════════ */}
      {tab === 'performance' && (
        <div>
          <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 800, marginBottom: 16 }}>⭐ Performance Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {members.map((m, i) => {
              const roleCfg       = ROLE_CONFIG[m.role as UserRole]
              const memberLeaves  = leaves.filter(l => l.member_id === m.id && l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0)
              const monthAtt      = attendance.filter(a => a.member_id === m.id && a.status === 'Present').length
              const balance       = getLeaveBalance(m.id)
              const memberPayroll = payroll.find(p => p.member_id === m.id && p.month === currentMonth)

              return (
                <div key={i} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: roleCfg?.color || '#0097A7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {(m.name || 'U').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Syne', fontSize: 13.5, fontWeight: 800 }}>{m.name}</div>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: (roleCfg?.color || '#0097A7') + '22', color: roleCfg?.color || '#0097A7' }}>
                        {roleCfg?.label || m.role}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Leave Used', value: `${memberLeaves} days`, color: memberLeaves > 15 ? 'var(--red)' : 'var(--mu2)' },
                      { label: 'Leave Balance', value: `${balance.casual + balance.sick}`, color: 'var(--green)' },
                      { label: 'Dept', value: ROLE_DEPT[m.role] || '—', color: 'var(--mu2)' },
                      { label: 'Salary', value: memberPayroll ? `₹${memberPayroll.net?.toLocaleString('en-IN')}` : 'Not set', color: 'var(--gold)' },
                    ].map((item, j) => (
                      <div key={j} style={{ background: 'var(--s2)', borderRadius: 8, padding: '9px 10px' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {m.phone && (
                    <a href={`https://wa.me/${m.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          LEAVE MODAL
      ══════════════════════════════════ */}
      {showLeaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 460, maxWidth: '94vw' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>🌴 Apply Leave</div>

            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Employee*</label>
            <select value={leaveForm.member_id} onChange={e => setLeaveForm(p => ({ ...p, member_id: e.target.value }))} style={inp}>
              <option value="">— Select Employee —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>

            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Leave Type*</label>
            <select value={leaveForm.leave_type} onChange={e => setLeaveForm(p => ({ ...p, leave_type: e.target.value }))} style={inp}>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>From Date*</label>
                <input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm(p => ({ ...p, from_date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>To Date*</label>
                <input type="date" value={leaveForm.to_date} onChange={e => setLeaveForm(p => ({ ...p, to_date: e.target.value }))} style={inp} />
              </div>
            </div>

            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Reason</label>
            <textarea value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Reason for leave..." style={{ ...inp, resize: 'none' }} />

            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setShowLeaveModal(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={submitLeave} style={{ flex: 2, padding: 10, background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Submit Leave</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          PAYROLL MODAL
      ══════════════════════════════════ */}
      {showPayrollModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 16, padding: '26px 30px', width: 500, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, marginBottom: 20 }}>💰 Add Payroll</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Employee*</label>
                <select value={payrollForm.member_id} onChange={e => setPayrollForm(p => ({ ...p, member_id: e.target.value }))} style={inp}>
                  <option value="">— Select Employee —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Month*</label>
                <input type="month" value={payrollForm.month} onChange={e => setPayrollForm(p => ({ ...p, month: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Basic Salary (₹)</label>
                <input type="number" value={payrollForm.basic} onChange={e => setPayrollForm(p => ({ ...p, basic: e.target.value }))} placeholder="25000" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>HRA (₹)</label>
                <input type="number" value={payrollForm.hra} onChange={e => setPayrollForm(p => ({ ...p, hra: e.target.value }))} placeholder="5000" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Allowances (₹)</label>
                <input type="number" value={payrollForm.allowances} onChange={e => setPayrollForm(p => ({ ...p, allowances: e.target.value }))} placeholder="2000" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Bonus (₹)</label>
                <input type="number" value={payrollForm.bonus} onChange={e => setPayrollForm(p => ({ ...p, bonus: e.target.value }))} placeholder="0" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Deductions (₹)</label>
                <input type="number" value={payrollForm.deductions} onChange={e => setPayrollForm(p => ({ ...p, deductions: e.target.value }))} placeholder="1000" style={inp} />
              </div>
            </div>

            {/* Preview */}
            {payrollForm.basic && (
              <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', marginBottom: 10 }}>Preview</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--mu2)' }}>Gross</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 700 }}>₹{(
                    (parseFloat(payrollForm.basic) || 0) +
                    (parseFloat(payrollForm.hra) || 0) +
                    (parseFloat(payrollForm.allowances) || 0) +
                    (parseFloat(payrollForm.bonus) || 0)
                  ).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--red)' }}>Deductions</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 700, color: 'var(--red)' }}>-₹{(parseFloat(payrollForm.deductions) || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, borderTop: '1px solid var(--b1)', paddingTop: 8, marginTop: 6 }}>
                  <span style={{ fontWeight: 700 }}>Net (Take Home)</span>
                  <span style={{ fontFamily: 'DM Mono', fontWeight: 800, color: 'var(--green)', fontSize: 16 }}>₹{(
                    (parseFloat(payrollForm.basic) || 0) +
                    (parseFloat(payrollForm.hra) || 0) +
                    (parseFloat(payrollForm.allowances) || 0) +
                    (parseFloat(payrollForm.bonus) || 0) -
                    (parseFloat(payrollForm.deductions) || 0)
                  ).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--mu2)', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>Notes</label>
            <input value={payrollForm.notes} onChange={e => setPayrollForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." style={inp} />

            <div style={{ display: 'flex', gap: 9 }}>
              <button onClick={() => setShowPayrollModal(false)} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--mu2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={savePayroll} style={{ flex: 2, padding: 10, background: 'linear-gradient(135deg,#D4A853,#B87C30)', border: 'none', borderRadius: 8, color: '#08090C', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'Outfit' }}>Save Payroll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
