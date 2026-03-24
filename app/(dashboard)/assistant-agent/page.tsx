'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const C = {
  teal: '#2D5F5A', teal2: '#3D7A74', dark: '#1A2E2B',
  border: '#E5E7EB', bg: '#FAFAF8', green: '#10B981',
  red: '#EF4444', gold: '#D4A853', purple: '#8B5CF6',
  blue: '#3B82F6', orange: '#F59E0B',
}

type Tab = 'command' | 'monitor' | 'report' | 'tasks' | 'schedule' | 'auto'
type Priority = 'urgent' | 'high' | 'medium' | 'low'
type TaskStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

interface Task {
  id: string
  title: string
  description?: string
  assigned_to?: string
  assigned_role?: string
  priority: Priority
  status: TaskStatus
  due_date?: string
  area: string
  created_at: string
}

interface TeamMember {
  id: string
  name: string
  role: string
  email?: string
  lastActive?: string
  tasksTotal: number
  tasksDone: number
  tasksUrgent: number
}

interface ReportData {
  date: string
  summary: string
  highlights: string[]
  concerns: string[]
  teamStats: { name: string; done: number; pending: number }[]
  recommendations: string[]
  kpis: { label: string; value: string; trend: string }[]
}

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: C.red, high: C.orange, medium: C.gold, low: C.green,
}
const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: '#94A3B8', in_progress: C.blue, done: C.green, blocked: C.red,
}
const AREAS = ['Sales', 'Marketing', 'Operations', 'Specialist', 'Support', 'Finance', 'HR', 'Tech']
const ROLES = ['founder', 'admin', 'manager', 'ops', 'specialist', 'specialist_manager', 'support', 'marketing', 'finance', 'hr']

export default function AssistantAgentPage() {
  const [tab, setTab] = useState<Tab>('command')
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [report, setReport] = useState<ReportData | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [sendingWA, setSendingWA] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [aiInsight, setAiInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [schedulePhone, setSchedulePhone] = useState('')
  const [schedulePhone2, setSchedulePhone2] = useState('')
  const [newTask, setNewTask] = useState({
    title: '', description: '', assigned_to: '', assigned_role: '',
    priority: 'medium' as Priority, due_date: '', area: 'Operations',
  })
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterArea, setFilterArea] = useState<string>('all')
  const [callLogs, setCallLogs] = useState<any[]>([])
  const [orders, setOrders] = useState<{ total: number; today: number; pending: number }>({ total: 0, today: 0, pending: 0 })
  const [consultations, setConsultations] = useState<{ total: number; today: number; pending: number }>({ total: 0, today: 0, pending: 0 })
  const [autoBrain, setAutoBrain] = useState<any>(null)
  const [runningAuto, setRunningAuto] = useState(false)
  const [autoPhone, setAutoPhone] = useState('')
  const [autoSendWA, setAutoSendWA] = useState(false)

  useEffect(() => {
    loadTasks()
    loadTeam()
    loadCallLogs()
    loadAiInsight()
  }, [])

  async function loadTasks() {
    const { data } = await supabase.from('rabt_tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  async function loadTeam() {
    const { data } = await supabase.from('profiles').select('id, name, role, email, updated_at')
    if (data) {
      const members: TeamMember[] = await Promise.all(data.map(async (m: any) => {
        const { data: t } = await supabase.from('rabt_tasks')
          .select('id, status, priority').eq('assigned_to', m.id)
        const tasksArr = t || []
        return {
          id: m.id, name: m.name || m.email, role: m.role,
          email: m.email,
          lastActive: m.updated_at,
          tasksTotal: tasksArr.length,
          tasksDone: tasksArr.filter((x: any) => x.status === 'done').length,
          tasksUrgent: tasksArr.filter((x: any) => x.priority === 'urgent' && x.status !== 'done').length,
        }
      }))
      setTeam(members)
    }
  }

  async function loadCallLogs() {
    const { data } = await supabase.from('rabt_call_logs')
      .select('*').order('created_at', { ascending: false }).limit(10)
    if (data) setCallLogs(data)
  }

  async function runAutoBrain(createTasks = true) {
    setRunningAuto(true)
    try {
      const res = await fetch('/api/assistant/auto-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createTasks, sendReport: autoSendWA, phone: autoPhone }),
      })
      if (res.ok) {
        const d = await res.json()
        setAutoBrain(d)
        if (d.createdTasks?.length > 0) {
          await loadTasks()
          toast.success(`AI created ${d.createdTasks.length} task${d.createdTasks.length > 1 ? 's' : ''} automatically!`)
        } else {
          toast.success('AI analysis complete!')
        }
      } else {
        toast.error('Auto-brain failed')
      }
    } catch { toast.error('Failed to run Auto Brain') }
    setRunningAuto(false)
  }

  async function loadAiInsight() {
    setLoadingInsight(true)
    try {
      const res = await fetch('/api/assistant/insight', { method: 'GET' })
      if (res.ok) {
        const d = await res.json()
        setAiInsight(d.insight || '')
      }
    } catch { /* skip */ }
    setLoadingInsight(false)
  }

  async function generateReport() {
    setGeneratingReport(true)
    try {
      const taskStats = {
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        blocked: tasks.filter(t => t.status === 'blocked').length,
        urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length,
      }
      const teamStats = team.map(m => ({ name: m.name, done: m.tasksDone, pending: m.tasksTotal - m.tasksDone, role: m.role }))

      const res = await fetch('/api/assistant/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskStats, teamStats, callLogs: callLogs.slice(0, 5), tasks: tasks.slice(0, 20) }),
      })
      if (res.ok) {
        const d = await res.json()
        setReport(d.report)
        toast.success('Daily report generated!')
      }
    } catch { toast.error('Failed to generate report') }
    setGeneratingReport(false)
  }

  async function sendWhatsAppReport(phone: string) {
    if (!report || !phone) return
    setSendingWA(true)
    try {
      const msg = `*📊 Rabt HQ — Daily Report*\n*${report.date}*\n\n${report.summary}\n\n*✅ Highlights:*\n${report.highlights.map(h => `• ${h}`).join('\n')}\n\n*⚠️ Concerns:*\n${report.concerns.map(c => `• ${c}`).join('\n')}\n\n*🎯 Recommendations:*\n${report.recommendations.map(r => `• ${r}`).join('\n')}\n\n_Rabt HQ Assistant Agent_`
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: msg }),
      })
      if (res.ok) toast.success(`Report sent to ${phone}!`)
      else toast.error('WhatsApp send failed')
    } catch { toast.error('WhatsApp send failed') }
    setSendingWA(false)
  }

  async function createTask() {
    if (!newTask.title) return toast.error('Task title required')
    const { data, error } = await supabase.from('rabt_tasks').insert({
      ...newTask, status: 'pending', created_at: new Date().toISOString(),
    }).select().single()
    if (error) return toast.error('Failed to create task')
    setTasks(prev => [data, ...prev])
    setNewTask({ title: '', description: '', assigned_to: '', assigned_role: '', priority: 'medium', due_date: '', area: 'Operations' })
    setShowNewTask(false)
    toast.success('Task created!')
  }

  async function updateTaskStatus(id: string, status: TaskStatus) {
    await supabase.from('rabt_tasks').update({ status }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('rabt_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.success('Task deleted')
  }

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterArea !== 'all' && t.area !== filterArea) return false
    return true
  })

  const pendingUrgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const completionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'auto', label: 'Auto Brain', icon: '🤖' },
    { id: 'command', label: 'Command Center', icon: '⚡' },
    { id: 'monitor', label: 'Team Monitor', icon: '👥' },
    { id: 'report', label: 'Daily Report', icon: '📊' },
    { id: 'tasks', label: 'Task Manager', icon: '✅' },
    { id: 'schedule', label: 'Auto Schedule', icon: '⏰' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧠</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.dark }}>Assistant Agent</h1>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>AI-powered team monitor, task tracker & daily report engine</p>
            </div>
            <span style={{ background: C.teal, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>AI</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {pendingUrgent > 0 && (
            <div style={{ background: '#FEF2F2', border: `1px solid ${C.red}`, borderRadius: 8, padding: '6px 14px', fontSize: 13, color: C.red, fontWeight: 600 }}>
              🚨 {pendingUrgent} Urgent Task{pendingUrgent > 1 ? 's' : ''}
            </div>
          )}
          <button onClick={() => setShowNewTask(true)} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            + New Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t.id ? C.teal : 'transparent',
            color: tab === t.id ? '#fff' : '#6B7280',
            transition: 'all 0.15s',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* COMMAND CENTER */}
      {tab === 'command' && (
        <div>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Tasks', value: tasks.length, icon: '📋', color: C.teal, sub: `${inProgressTasks} in progress` },
              { label: 'Completed', value: `${completionRate}%`, icon: '✅', color: C.green, sub: `${doneTasks} done` },
              { label: 'Urgent Pending', value: pendingUrgent, icon: '🚨', color: C.red, sub: 'Need attention now' },
              { label: 'Team Members', value: team.length, icon: '👥', color: C.purple, sub: 'Active users' },
            ].map((k, i) => (
              <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `3px solid ${k.color}` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{k.label}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* AI Insight */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.dark }}>🧠 AI Daily Insight</h3>
                <button onClick={loadAiInsight} disabled={loadingInsight} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
                  {loadingInsight ? 'Thinking...' : 'Refresh'}
                </button>
              </div>
              {loadingInsight ? (
                <div style={{ color: '#9CA3AF', fontSize: 14 }}>Analyzing team performance...</div>
              ) : aiInsight ? (
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiInsight}</div>
              ) : (
                <div style={{ color: '#9CA3AF', fontSize: 14 }}>Click Refresh to get today's AI insight</div>
              )}
            </div>

            {/* Recent Activity */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>📡 Recent Calls</h3>
              {callLogs.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: 14 }}>No recent calls</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {callLogs.slice(0, 5).map((log, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{log.to_name || 'Unknown'}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{log.call_type?.replace(/_/g, ' ')} · {log.to_phone}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: log.status === 'completed' ? '#D1FAE5' : log.status === 'ringing' ? '#DBEAFE' : '#F3F4F6', color: log.status === 'completed' ? C.green : log.status === 'ringing' ? C.blue : '#6B7280', fontWeight: 600 }}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Urgent Tasks */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>🚨 Urgent Tasks</h3>
              {tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length === 0 ? (
                <div style={{ color: '#9CA3AF', fontSize: 14 }}>No urgent pending tasks</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').map(t => (
                    <div key={t.id} style={{ padding: '10px 12px', background: '#FEF2F2', borderRadius: 8, borderLeft: `3px solid ${C.red}` }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.area} · {t.assigned_role || 'Unassigned'}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        <button onClick={() => updateTaskStatus(t.id, 'in_progress')} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.blue}`, background: 'transparent', color: C.blue, cursor: 'pointer' }}>Start</button>
                        <button onClick={() => updateTaskStatus(t.id, 'done')} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, cursor: 'pointer' }}>Done</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Performance */}
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: C.dark }}>👥 Team Performance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {team.slice(0, 5).map((m, i) => {
                  const pct = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.teal, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {(m.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{m.name}</span>
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{m.tasksDone}/{m.tasksTotal}</span>
                        </div>
                        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 75 ? C.green : pct >= 40 ? C.gold : C.red, borderRadius: 3 }} />
                        </div>
                      </div>
                      {m.tasksUrgent > 0 && <span style={{ fontSize: 11, background: '#FEE2E2', color: C.red, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>🚨{m.tasksUrgent}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MONITOR */}
      {tab === 'monitor' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {team.map((m, i) => {
              const pct = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0
              return (
                <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `3px solid ${m.tasksUrgent > 0 ? C.red : pct >= 75 ? C.green : C.teal}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.teal, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                      {(m.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{m.role}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Total', value: m.tasksTotal, color: C.teal },
                      { label: 'Done', value: m.tasksDone, color: C.green },
                      { label: 'Urgent', value: m.tasksUrgent, color: m.tasksUrgent > 0 ? C.red : '#9CA3AF' },
                    ].map((s, j) => (
                      <div key={j} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                      <span>Completion</span><span>{pct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 75 ? C.green : pct >= 40 ? C.gold : C.red, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Assigned tasks */}
                  <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 6 }}>Active Tasks</div>
                  {tasks.filter(t => t.assigned_to === m.id && t.status !== 'done').slice(0, 3).map(t => (
                    <div key={t.id} style={{ fontSize: 12, padding: '4px 8px', background: '#F9FAFB', borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.dark }}>{t.title}</span>
                      <span style={{ color: PRIORITY_COLOR[t.priority], fontWeight: 600 }}>{t.priority}</span>
                    </div>
                  ))}
                  {tasks.filter(t => t.assigned_to === m.id && t.status !== 'done').length === 0 && (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No active tasks</div>
                  )}
                </div>
              )
            })}
          </div>
          {team.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 16 }}>No team members found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Team members will appear once they log in</div>
            </div>
          )}
        </div>
      )}

      {/* DAILY REPORT */}
      {tab === 'report' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: Generate */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: C.dark }}>📊 Generate Daily Report</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>AI analyzes all team tasks, calls, sales data and generates a leadership-grade daily brief.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tasks Today', value: tasks.filter(t => t.created_at?.startsWith(new Date().toISOString().split('T')[0])).length, icon: '📋' },
                { label: 'Completed', value: doneTasks, icon: '✅' },
                { label: 'Urgent Open', value: pendingUrgent, icon: '🚨' },
                { label: 'Calls Made', value: callLogs.length, icon: '📞' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={generateReport} disabled={generatingReport} style={{ width: '100%', background: generatingReport ? '#9CA3AF' : C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: generatingReport ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
              {generatingReport ? '🧠 Generating Report...' : '🧠 Generate AI Report'}
            </button>

            {report && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Send Report via WhatsApp</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={schedulePhone} onChange={e => setSchedulePhone(e.target.value)} placeholder="+91 98765 43210 (Founder)" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
                  <button onClick={() => sendWhatsAppReport(schedulePhone)} disabled={sendingWA || !schedulePhone} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {sendingWA ? 'Sending...' : '📱 Send'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={schedulePhone2} onChange={e => setSchedulePhone2(e.target.value)} placeholder="+91 98765 43211 (Manager)" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
                  <button onClick={() => sendWhatsAppReport(schedulePhone2)} disabled={sendingWA || !schedulePhone2} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {sendingWA ? 'Sending...' : '📱 Send'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Report Preview */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, maxHeight: 600, overflowY: 'auto' }}>
            {!report ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 15 }}>Generate a report to preview it here</div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>Rabt HQ Daily Report</h3>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{report.date}</span>
                </div>

                <div style={{ background: '#F0FDF4', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
                  {report.summary}
                </div>

                {/* KPIs */}
                {report.kpis && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    {report.kpis.map((k, i) => (
                      <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.teal }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{k.label}</div>
                        <div style={{ fontSize: 11, color: k.trend?.includes('+') ? C.green : C.red }}>{k.trend}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.green, marginBottom: 8 }}>✅ Highlights</div>
                  {report.highlights.map((h, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#374151', padding: '4px 0', paddingLeft: 16, borderLeft: `2px solid ${C.green}`, marginBottom: 4 }}>{h}</div>
                  ))}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.red, marginBottom: 8 }}>⚠️ Concerns</div>
                  {report.concerns.map((c, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#374151', padding: '4px 0', paddingLeft: 16, borderLeft: `2px solid ${C.red}`, marginBottom: 4 }}>{c}</div>
                  ))}
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.teal, marginBottom: 8 }}>🎯 AI Recommendations</div>
                  {report.recommendations.map((r, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#374151', padding: '4px 0', paddingLeft: 16, borderLeft: `2px solid ${C.teal}`, marginBottom: 4 }}>{r}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TASK MANAGER */}
      {tab === 'tasks' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff' }}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff' }}>
              <option value="all">All Areas</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 13, color: '#6B7280', alignItems: 'center' }}>
              Showing {filteredTasks.length} tasks
            </div>
          </div>

          {/* Task Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {(['pending', 'in_progress', 'blocked', 'done'] as TaskStatus[]).map(status => {
              const cols = filteredTasks.filter(t => t.status === status)
              return (
                <div key={status} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[status] }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.dark, textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                    </div>
                    <span style={{ background: '#F3F4F6', borderRadius: 12, fontSize: 12, padding: '2px 8px', fontWeight: 600, color: '#6B7280' }}>{cols.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cols.map(t => (
                      <div key={t.id} style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, borderLeft: `3px solid ${PRIORITY_COLOR[t.priority]}` }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.dark, marginBottom: 4 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>{t.area} · {t.assigned_role || 'Unassigned'}</div>
                        {t.due_date && (
                          <div style={{ fontSize: 11, color: new Date(t.due_date) < new Date() ? C.red : C.gold, marginBottom: 6 }}>
                            📅 {new Date(t.due_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {status !== 'in_progress' && status !== 'done' && (
                            <button onClick={() => updateTaskStatus(t.id, 'in_progress')} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.blue}`, background: 'transparent', color: C.blue, cursor: 'pointer' }}>Start</button>
                          )}
                          {status !== 'done' && (
                            <button onClick={() => updateTaskStatus(t.id, 'done')} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, cursor: 'pointer' }}>Done</button>
                          )}
                          {status !== 'blocked' && status !== 'done' && (
                            <button onClick={() => updateTaskStatus(t.id, 'blocked')} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.red}`, background: 'transparent', color: C.red, cursor: 'pointer' }}>Block</button>
                          )}
                          <button onClick={() => deleteTask(t.id)} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #E5E7EB', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}>Del</button>
                        </div>
                      </div>
                    ))}
                    {cols.length === 0 && (
                      <div style={{ fontSize: 12, color: '#D1D5DB', textAlign: 'center', padding: '20px 0' }}>No tasks</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AUTO SCHEDULE */}
      {tab === 'schedule' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: C.dark }}>⏰ Automated Daily Report</h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B7280' }}>Assistant Agent will automatically generate and send the daily report via WhatsApp every day at the set time.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: scheduleEnabled ? '#F0FDF4' : '#F9FAFB', borderRadius: 10, border: `1px solid ${scheduleEnabled ? C.green : C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>Auto Daily Report</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Send report automatically every day</div>
                </div>
                <div
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  style={{ width: 48, height: 26, borderRadius: 13, background: scheduleEnabled ? C.green : '#D1D5DB', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: scheduleEnabled ? 24 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {scheduleEnabled && (
                <>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Report Time</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Founder WhatsApp Number</label>
                    <input value={schedulePhone} onChange={e => setSchedulePhone(e.target.value)} placeholder="+91 98765 43210" style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Manager WhatsApp Number (optional)</label>
                    <input value={schedulePhone2} onChange={e => setSchedulePhone2(e.target.value)} placeholder="+91 98765 43211" style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, width: '100%' }} />
                  </div>
                  <button
                    onClick={async () => {
                      // Save to Supabase hq_settings so cron endpoint reads it
                      const { error } = await supabase.from('hq_settings').upsert({
                        key: 'auto_schedule',
                        value: {
                          enabled: true,
                          time: scheduleTime,
                          phones: [schedulePhone, schedulePhone2].filter(Boolean),
                        },
                        updated_at: new Date().toISOString(),
                      })
                      if (!error) toast.success(`Schedule saved! Daily report at ${scheduleTime}`)
                      else toast.error('Failed to save schedule')
                    }}
                    style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}
                  >
                    💾 Save Schedule
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Report Content Config */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.dark }}>📋 Report Sections</h3>
            {[
              { label: 'Task Summary', desc: 'Tasks done, pending, blocked by team', enabled: true },
              { label: 'Team Performance', desc: 'Who completed what, completion rates', enabled: true },
              { label: 'Sales & Revenue', desc: 'Orders, calls, leads pipeline', enabled: true },
              { label: 'Urgent Alerts', desc: 'Overdue, blocked, urgent items', enabled: true },
              { label: 'AI Recommendations', desc: 'Claude leadership suggestions', enabled: true },
              { label: 'Call Activity', desc: 'Calls made, outcomes, summaries', enabled: true },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 5 ? `1px solid #F3F4F6` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.desc}</div>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: s.enabled ? C.green : '#D1D5DB', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: s.enabled ? 20 : 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUTO BRAIN TAB */}
      {tab === 'auto' && (
        <div>
          {/* Run Panel */}
          <div style={{ background: `linear-gradient(135deg, #1A2E2B, #2D5F5A)`, borderRadius: 16, padding: 28, marginBottom: 24, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 40 }}>🤖</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Autonomous AI Brain</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>Analyzes all business data · Creates tasks automatically · Monitors all agents · Sends WhatsApp report</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.8 }}>WhatsApp Report To (optional)</div>
                <input
                  value={autoPhone}
                  onChange={e => setAutoPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13 }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', paddingBottom: 10 }}>
                <input type="checkbox" checked={autoSendWA} onChange={e => setAutoSendWA(e.target.checked)} />
                Send WhatsApp report
              </label>
              <button
                onClick={() => runAutoBrain(true)}
                disabled={runningAuto}
                style={{ padding: '12px 28px', background: runningAuto ? 'rgba(255,255,255,0.2)' : '#10B981', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: runningAuto ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {runningAuto ? '🧠 Thinking...' : '▶ Run Auto Brain'}
              </button>
              <button
                onClick={() => runAutoBrain(false)}
                disabled={runningAuto}
                style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: runningAuto ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
              >
                Analyze Only
              </button>
            </div>
          </div>

          {!autoBrain && !runningAuto && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Ready to Analyze Your Business</div>
              <div style={{ fontSize: 14, color: '#6B7280', maxWidth: 480, margin: '0 auto' }}>
                Click "Run Auto Brain" to let the AI analyze your MongoDB orders, Supabase tasks, team performance, agent statuses, and goals — then auto-create tasks for the team.
              </div>
            </div>
          )}

          {runningAuto && (
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1s infinite' }}>🧠</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Analyzing Everything...</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Reading MongoDB orders · Supabase tasks · Team performance · Agent statuses · Goals</div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                {['Fetching data...', 'Thinking...', 'Creating tasks...'].map((s, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '4px 12px', background: C.teal + '15', color: C.teal, borderRadius: 20 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {autoBrain && !runningAuto && (
            <div>
              {/* Situation Banner */}
              <div style={{
                background: autoBrain.situation === 'critical' ? '#FEF2F2' : autoBrain.situation === 'warning' ? '#FFFBEB' : '#F0FDF4',
                border: `1px solid ${autoBrain.situation === 'critical' ? C.red : autoBrain.situation === 'warning' ? C.gold : C.green}`,
                borderRadius: 14, padding: '16px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>
                  {autoBrain.situation === 'critical' ? '🚨' : autoBrain.situation === 'warning' ? '⚠️' : '✅'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.dark, marginBottom: 4 }}>
                    {autoBrain.situation === 'critical' ? 'Critical — Immediate Attention Needed' : autoBrain.situation === 'warning' ? 'Warning — Some Issues Need Attention' : 'All Good — Business Running Smoothly'}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{autoBrain.analysis}</div>
                  {autoBrain.focusForToday && (
                    <div style={{ marginTop: 10, padding: '8px 14px', background: C.teal + '15', borderRadius: 8, fontSize: 13, fontWeight: 700, color: C.teal }}>
                      🎯 Focus today: {autoBrain.focusForToday}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0, textAlign: 'right' }}>
                  {new Date(autoBrain.runAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  <br />
                  {autoBrain.dataSnapshot?.tasks?.total || 0} tasks · {autoBrain.dataSnapshot?.connectedAgents || 0}/{autoBrain.dataSnapshot?.totalAgents || 0} agents
                </div>
              </div>

              {/* Department Scores */}
              {autoBrain.departmentScores && Object.keys(autoBrain.departmentScores).length > 0 && (
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.dark, marginBottom: 12 }}>🏢 Department Health Check</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(autoBrain.departmentScores).map(([dept, score]: [string, any], i) => (
                      <div key={i} style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: score === 'good' ? C.green + '15' : score === 'warning' ? C.gold + '15' : C.red + '15',
                        color: score === 'good' ? C.green : score === 'warning' ? C.gold : C.red,
                        border: `1px solid ${score === 'good' ? C.green + '30' : score === 'warning' ? C.gold + '30' : C.red + '30'}`,
                      }}>
                        {score === 'good' ? '✅' : score === 'warning' ? '⚠️' : '🚨'} {dept}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Snapshot Row */}
              {autoBrain.dataSnapshot?.mongo && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Orders Today', value: autoBrain.dataSnapshot.mongo.todayOrders ?? '—', color: C.teal },
                    { label: 'Month Revenue', value: autoBrain.dataSnapshot.mongo.monthRevenue ? `₹${(autoBrain.dataSnapshot.mongo.monthRevenue/100000).toFixed(2)}L` : '—', color: C.gold },
                    { label: 'Pending Consults', value: autoBrain.dataSnapshot.mongo.pendingConsultations ?? '—', color: (autoBrain.dataSnapshot.mongo.pendingConsultations || 0) > 0 ? C.red : C.green },
                    { label: 'At-Risk Customers', value: autoBrain.dataSnapshot.mongo.atRiskCustomers ?? '—', color: (autoBrain.dataSnapshot.mongo.atRiskCustomers || 0) > 5 ? C.orange : C.green },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{k.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {autoBrain.dataSnapshot && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Pending Dispatch', value: autoBrain.dataSnapshot.mongo?.pendingDispatch ?? '—', color: (autoBrain.dataSnapshot.mongo?.pendingDispatch || 0) > 0 ? C.red : C.green },
                    { label: 'Calls This Week', value: autoBrain.dataSnapshot.calls?.total ?? '—', color: C.blue },
                    { label: 'Call Connect Rate', value: autoBrain.dataSnapshot.callConnectionRate != null ? autoBrain.dataSnapshot.callConnectionRate + '%' : '—', color: (autoBrain.dataSnapshot.callConnectionRate || 0) >= 50 ? C.green : C.orange },
                    { label: 'AI Agents Online', value: `${autoBrain.dataSnapshot.connectedAgents}/${autoBrain.dataSnapshot.totalAgents}`, color: autoBrain.dataSnapshot.disconnectedCount > 0 ? C.red : C.green },
                  ].map((k, i) => (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.value}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{k.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Auto-Created Tasks */}
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>🤖 AI-Created Tasks</div>
                    <span style={{ fontSize: 12, background: C.teal + '15', color: C.teal, padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                      {autoBrain.createdTasks?.length || 0} created
                    </span>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                    {(autoBrain.createdTasks?.length > 0 ? autoBrain.createdTasks : autoBrain.tasksToCreate || []).map((t: any, i: number) => (
                      <div key={i} style={{ padding: '10px 14px', background: t.id ? '#F0FDF4' : '#F8FAFC', borderRadius: 10, border: `1px solid ${t.id ? C.green + '30' : C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.dark, flex: 1 }}>{t.title}</div>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: t.priority === 'urgent' ? C.red + '15' : C.gold + '15', color: t.priority === 'urgent' ? C.red : C.gold, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {t.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                          {t.area} · {t.assigned_role || t.assigned_role} · {t.due_date}
                        </div>
                        {t.ai_reason && <div style={{ fontSize: 11, color: C.teal, marginTop: 4, fontStyle: 'italic' }}>💡 {t.ai_reason}</div>}
                        {t.id && <div style={{ fontSize: 10, color: C.green, marginTop: 4, fontWeight: 700 }}>✅ Created in Supabase</div>}
                      </div>
                    ))}
                    {autoBrain.createdTasks?.length === 0 && !autoBrain.tasksToCreate?.length && (
                      <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>No tasks needed — team is on track!</div>
                    )}
                  </div>
                </div>

                {/* Goal Progress + Agent Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Goal Progress */}
                  {autoBrain.goalProgress?.length > 0 && (
                    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15, color: C.dark }}>🎯 Goal Progress</div>
                      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {autoBrain.goalProgress.map((g: any, i: number) => (
                          <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: g.status === 'ahead' ? '#F0FDF4' : g.status === 'behind' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${g.status === 'ahead' ? C.green + '30' : g.status === 'behind' ? C.red + '30' : C.gold + '30'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, flex: 1 }}>{g.goal}</div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: g.status === 'ahead' ? C.green : g.status === 'behind' ? C.red : C.gold, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {g.status === 'ahead' ? '✅ Ahead' : g.status === 'behind' ? '⚠️ Behind' : '🎯 On track'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{g.insight}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent Alerts */}
                  {autoBrain.agentAlerts?.length > 0 && (
                    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 15, color: C.dark }}>🔌 Agent Alerts</div>
                      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {autoBrain.agentAlerts.map((a: any, i: number) => (
                          <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: a.severity === 'critical' ? '#FEF2F2' : '#FFFBEB', borderLeft: `3px solid ${a.severity === 'critical' ? C.red : C.gold}` }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{a.agent}</div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{a.action}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-Specialist / Per-Person Monitoring */}
              {autoBrain.perPersonSummary?.length > 0 && (
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>👥 Per Person — AI Monitoring</div>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>AI ne har person ka kaam check kiya</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, padding: 16 }}>
                    {autoBrain.perPersonSummary.map((p: any, i: number) => (
                      <div key={i} style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: p.status === 'critical' ? '#FEF2F2' : p.status === 'needs_attention' ? '#FFFBEB' : '#F0FDF4',
                        border: `1px solid ${p.status === 'critical' ? C.red + '40' : p.status === 'needs_attention' ? C.gold + '40' : C.green + '40'}`,
                        borderLeft: `4px solid ${p.status === 'critical' ? C.red : p.status === 'needs_attention' ? C.gold : C.green}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.teal, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {(p.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.role}</div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: p.status === 'critical' ? C.red : p.status === 'needs_attention' ? C.gold : C.green,
                            color: '#fff',
                          }}>
                            {p.status === 'critical' ? '🚨 Critical' : p.status === 'needs_attention' ? '⚠️ Attention' : '✅ On Track'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{p.whatTheyNeedToDo}</div>
                        {p.pendingCount > 0 && (
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{p.pendingCount} pending tasks</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Report Preview */}
              {autoBrain.whatsappReport && (
                <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>📱 WhatsApp Report</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={autoPhone}
                        onChange={e => setAutoPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, width: 160 }}
                      />
                      <button
                        onClick={async () => {
                          if (!autoPhone) return toast.error('Enter phone number')
                          const res = await fetch('/api/send-whatsapp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: autoPhone, message: autoBrain.whatsappReport }),
                          })
                          if (res.ok) { toast.success('Report sent!') } else { toast.error('Failed to send') }
                        }}
                        style={{ padding: '6px 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Send Now
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: 16, background: '#F9FAFB' }}>
                    <pre style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap', fontFamily: 'system-ui', lineHeight: 1.6, margin: 0 }}>
                      {autoBrain.whatsappReport}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ── Activation Guide ────────────────────────────────────── */}
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, marginTop: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 4 }}>⚡ Agent Ko Activate Kaise Karein</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>3 tarike hain — manual se lekar fully automatic tak</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Method 1 */}
              <div style={{ padding: '16px 20px', background: C.teal + '08', border: `1px solid ${C.teal}25`, borderRadius: 12, borderLeft: `4px solid ${C.teal}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 6 }}>1️⃣ Manual — Abhi Chalao (Already Working)</div>
                <div style={{ fontSize: 13, color: '#374151' }}>
                  Upar "▶ Run Auto Brain" button dabao → AI saara data read karega → Tasks banayega → WhatsApp report dega.<br />
                  <span style={{ color: '#9CA3AF' }}>Jab bhi chahein chalao — no setup needed.</span>
                </div>
              </div>

              {/* Method 2 */}
              <div style={{ padding: '16px 20px', background: C.gold + '08', border: `1px solid ${C.gold}25`, borderRadius: 12, borderLeft: `4px solid ${C.gold}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 6 }}>2️⃣ Auto Schedule — Daily Report (Auto Schedule Tab Mein Set Karo)</div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                  Auto Schedule tab mein jao → Time set karo (e.g. 9:00 AM) → Phone numbers dalo → Save karo.<br />
                  <span style={{ color: '#9CA3AF' }}>Phones save hote hain Supabase mein (hq_settings → auto_schedule).</span>
                </div>
              </div>

              {/* Method 3 — Render Cron */}
              <div style={{ padding: '16px 20px', background: C.purple + '08', border: `1px solid ${C.purple}25`, borderRadius: 12, borderLeft: `4px solid ${C.purple}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 6 }}>3️⃣ Render Cron Job — Fully Automatic (Best for Production)</div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                  Ye agent khud roz subah run ho jata hai bina kuch kiye.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { step: '1', text: 'Render Dashboard → Add env var: CRON_SECRET=koi_bhi_secret_string (e.g. rabt2024secure)' },
                    { step: '2', text: 'Render Dashboard → Cron Jobs → New Cron Job' },
                    { step: '3', text: 'Schedule: 0 4 * * * (9 AM IST = 4 AM UTC, roz subah)' },
                    { step: '4', text: 'Command: curl "https://YOUR_RENDER_URL/api/cron/assistant?secret=rabt2024secure"' },
                    { step: '5', text: 'Auto Schedule tab mein phones save karo jahan report bhejni hai' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: C.purple, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.step}</span>
                      <span style={{ fontSize: 12, color: '#374151', paddingTop: 2 }}>{s.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#1A2E2B', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Cron Endpoint URL:</div>
                  <code style={{ fontSize: 12, color: '#10B981' }}>
                    GET /api/cron/assistant?secret=YOUR_CRON_SECRET
                  </code>
                </div>
              </div>

              {/* Alternative: cron-job.org */}
              <div style={{ padding: '14px 18px', background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.dark, marginBottom: 4 }}>💡 Free Alternative: cron-job.org</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  cron-job.org pe free account banao → New Cronjob → URL: https://YOUR_SITE/api/cron/assistant?secret=YOUR_SECRET → Schedule: Daily 9 AM
                </div>
              </div>

              {/* What happens when it runs */}
              <div style={{ padding: '14px 18px', background: C.green + '08', border: `1px solid ${C.green}25`, borderRadius: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.dark, marginBottom: 8 }}>🔄 Jab Bhi Chale (Manual ya Auto) — Ye Hoga:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    '📦 MongoDB se orders + consultations read karega',
                    '👥 Har specialist ka pending kaam dekhega',
                    '✅ Supabase tasks check karega (blocked, overdue)',
                    '📞 Call logs review karega',
                    '🎯 Goals track karega',
                    '🤖 AI tasks auto-create karega Supabase mein',
                    '📱 WhatsApp report founder/manager ko bhejega',
                    '💾 Last run result save karega',
                  ].map((item, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', gap: 6 }}>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>Create New Task</h3>
              <button onClick={() => setShowNewTask(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Task Title *</label>
                <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="What needs to be done?" style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Additional details..." style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Area</label>
                  <select value={newTask.area} onChange={e => setNewTask(p => ({ ...p, area: e.target.value }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Priority }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                    <option value="urgent">🚨 Urgent</option>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Assign to Role</label>
                  <select value={newTask.assigned_role} onChange={e => setNewTask(p => ({ ...p, assigned_role: e.target.value }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                    <option value="">Select role...</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: 'block', marginBottom: 6 }}>Due Date</label>
                  <input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowNewTask(false)} style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#6B7280' }}>Cancel</button>
                <button onClick={createTask} style={{ flex: 2, padding: '12px 0', borderRadius: 8, border: 'none', background: C.teal, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Create Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
