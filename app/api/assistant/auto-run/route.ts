import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { createClient } from '@supabase/supabase-js'
import { getMongoDb } from '@/lib/mongodb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { createTasks = true, sendReport = false, phone } = await req.json().catch(() => ({}))

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // ── 1. Fetch ALL data in parallel ──────────────────────────────────────
    const [supabaseData, mongoData, agentStatusData] = await Promise.allSettled([
      // Supabase: tasks + profiles + calls + goals
      Promise.all([
        supabase.from('rabt_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name, role, email'),
        supabase.from('rabt_call_logs').select('*').gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }),
        supabase.from('hq_settings').select('value').eq('key', 'business_goals').single(),
      ]),
      // MongoDB: orders + consultations + users
      (async () => {
        const db = await getMongoDb()
        const [todayOrders, monthOrders, pendingConsultations, totalUsers, atRiskCount] = await Promise.all([
          db.collection('orders').countDocuments({ createdAt: { $gte: todayStart }, 'payment.status': 'paid' }),
          db.collection('orders').countDocuments({ createdAt: { $gte: thisMonthStart }, 'payment.status': 'paid' }),
          db.collection('consultations').countDocuments({ status: 'pending' }),
          db.collection('users').countDocuments({}),
          db.collection('orders').aggregate([
            { $match: { 'payment.status': 'paid' } },
            { $group: { _id: '$userId', lastOrder: { $max: '$createdAt' } } },
            { $match: { lastOrder: { $lt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
            { $count: 'count' },
          ]).toArray(),
        ])
        const monthRevRes = await db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: thisMonthStart }, 'payment.status': 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]).toArray()
        return {
          todayOrders,
          monthOrders,
          monthRevenue: monthRevRes[0]?.total || 0,
          pendingConsultations,
          totalUsers,
          atRiskCustomers: atRiskCount[0]?.count || 0,
        }
      })(),
      // Agent status
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/status`)
        .then(r => r.json()).catch(() => null),
    ])

    // Extract data safely
    const sbTasks = supabaseData.status === 'fulfilled' ? (supabaseData.value[0].data || []) : []
    const sbProfiles = supabaseData.status === 'fulfilled' ? (supabaseData.value[1].data || []) : []
    const sbCalls = supabaseData.status === 'fulfilled' ? (supabaseData.value[2].data || []) : []
    const goalsRaw = supabaseData.status === 'fulfilled' ? supabaseData.value[3].data?.value : null
    const mongo = mongoData.status === 'fulfilled' ? mongoData.value : null
    const agents = agentStatusData.status === 'fulfilled' ? agentStatusData.value : null

    // Task stats
    const taskStats = {
      total: sbTasks.length,
      done: sbTasks.filter((t: any) => t.status === 'done').length,
      inProgress: sbTasks.filter((t: any) => t.status === 'in_progress').length,
      blocked: sbTasks.filter((t: any) => t.status === 'blocked').length,
      urgent: sbTasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length,
      overdue: sbTasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < today).length,
    }

    const blockedTasks = sbTasks.filter((t: any) => t.status === 'blocked').map((t: any) => `[${t.area}] ${t.title}`)
    const urgentTasks = sbTasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').map((t: any) => `[${t.area}] ${t.title} → assigned: ${t.assigned_role || 'nobody'}`)
    const overdueTasks = sbTasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < today).map((t: any) => `[${t.area}] ${t.title} (due: ${t.due_date})`)

    // Team summary
    const teamSummary = sbProfiles.slice(0, 8).map((p: any) => {
      const memberTasks = sbTasks.filter((t: any) => t.assigned_to === p.id)
      return `${p.name || p.email} (${p.role}): ${memberTasks.filter((t: any) => t.status === 'done').length} done / ${memberTasks.length} total tasks`
    })

    // Recent calls
    const callSummary = sbCalls.slice(0, 5).map((c: any) => `${c.call_type || 'call'} to ${c.to_name || 'unknown'}: ${c.outcome || c.status}`)

    // Disconnected agents
    const disconnectedAgents = agents?.agents?.filter((a: any) => a.status === 'disconnected').map((a: any) => a.name) || []
    const partialAgents = agents?.agents?.filter((a: any) => a.status === 'partial').map((a: any) => `${a.name} (${a.details})`) || []

    const goalsText = goalsRaw
      ? (typeof goalsRaw === 'string' ? goalsRaw : JSON.stringify(goalsRaw))
      : `Default goals: Reach ₹5L monthly revenue, Maintain 70%+ task completion rate, Reduce at-risk customers below 20, Keep call connection rate above 50%`

    // ── 2. Build Claude prompt ─────────────────────────────────────────────
    const prompt = `You are the autonomous AI Operations Brain for Rabt Naturals — an Indian skincare/haircare D2C brand. You have FULL access to all business data. Think like the founder's smartest COO.

TODAY: ${dateStr}

═══ BUSINESS DATA (rabtnaturals.com — MongoDB) ═══
- Orders today: ${mongo?.todayOrders ?? 'N/A'}
- Orders this month: ${mongo?.monthOrders ?? 'N/A'}
- Revenue this month: ₹${mongo?.monthRevenue ? Math.round(mongo.monthRevenue).toLocaleString('en-IN') : 'N/A'}
- Pending consultations: ${mongo?.pendingConsultations ?? 'N/A'} (unattended leads!)
- Total registered users: ${mongo?.totalUsers ?? 'N/A'}
- At-risk customers (30+ days no order): ${mongo?.atRiskCustomers ?? 'N/A'} customers

═══ HQ OPERATIONS (Supabase) ═══
Task Status: ${taskStats.total} total | ${taskStats.done} done | ${taskStats.inProgress} in-progress | ${taskStats.blocked} BLOCKED | ${taskStats.urgent} URGENT | ${taskStats.overdue} OVERDUE

BLOCKED TASKS:
${blockedTasks.length > 0 ? blockedTasks.join('\n') : 'None'}

URGENT TASKS:
${urgentTasks.length > 0 ? urgentTasks.join('\n') : 'None'}

OVERDUE TASKS:
${overdueTasks.length > 0 ? overdueTasks.join('\n') : 'None'}

TEAM PERFORMANCE:
${teamSummary.join('\n') || 'No team data'}

RECENT CALLS (last 7 days):
${callSummary.join('\n') || 'No calls logged'}

═══ AI AGENT STATUS ═══
Disconnected agents: ${disconnectedAgents.join(', ') || 'None — all good!'}
Partial/warning agents: ${partialAgents.join(', ') || 'None'}

═══ BUSINESS GOALS ═══
${goalsText}

═══ YOUR JOB ═══
1. Analyze the full situation — what's urgent, what's at risk, what's going well
2. Create SPECIFIC tasks for the team (be detailed — who, what, why, by when)
3. Alert on agent issues
4. Track goal progress
5. Write a WhatsApp report for the founder

IMPORTANT RULES:
- If pending consultations > 0 → create task for specialist to follow up
- If at-risk customers > 0 → create retention campaign task
- If blocked tasks > 0 → create unblock task for manager
- If agent disconnected → create setup task for tech/ops
- Assign tasks to appropriate roles: specialist (customer-facing), ops (operations), manager (leadership), marketing (campaigns), tech (technical)
- Due dates in YYYY-MM-DD format, relative to today (${today.toISOString().split('T')[0]})

Respond ONLY with valid JSON in this exact structure:
{
  "situation": "good|warning|critical",
  "analysis": "3-4 sentence executive analysis of the full situation",
  "tasksToCreate": [
    {
      "title": "specific task title",
      "description": "detailed description of what to do and why",
      "assigned_role": "specialist|ops|manager|marketing|tech|finance",
      "area": "Sales|Marketing|Operations|Specialist|Support|Finance|Tech",
      "priority": "urgent|high|medium|low",
      "due_date": "YYYY-MM-DD",
      "ai_reason": "brief reason why AI created this task"
    }
  ],
  "agentAlerts": [
    { "agent": "agent name", "severity": "critical|warning", "action": "what to do" }
  ],
  "goalProgress": [
    { "goal": "goal description", "status": "on_track|behind|ahead|unknown", "insight": "brief status comment" }
  ],
  "whatsappReport": "Full WhatsApp-formatted report using *bold* and emojis, for the founder",
  "focusForToday": "Single most important thing to focus on today"
}`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let brainResult: any = null

    if (jsonMatch) {
      try { brainResult = JSON.parse(jsonMatch[0]) } catch { /* fallback */ }
    }

    if (!brainResult) {
      brainResult = {
        situation: 'warning',
        analysis: text.slice(0, 400),
        tasksToCreate: [],
        agentAlerts: [],
        goalProgress: [],
        whatsappReport: text.slice(0, 500),
        focusForToday: 'Review system status',
      }
    }

    // ── 3. Auto-create tasks in Supabase ───────────────────────────────────
    const createdTasks: any[] = []
    if (createTasks && brainResult.tasksToCreate?.length > 0) {
      for (const task of brainResult.tasksToCreate.slice(0, 8)) {
        const { data, error } = await supabase.from('rabt_tasks').insert({
          title: task.title,
          description: `${task.description}\n\n[AI Created — Reason: ${task.ai_reason}]`,
          assigned_role: task.assigned_role,
          area: task.area,
          priority: task.priority,
          due_date: task.due_date || null,
          status: 'pending',
          created_at: new Date().toISOString(),
        }).select().single()

        if (!error && data) createdTasks.push(data)
      }
    }

    // ── 4. Send WhatsApp report if requested ───────────────────────────────
    let whatsappSent = false
    if (sendReport && phone && brainResult.whatsappReport) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: brainResult.whatsappReport }),
        })
        whatsappSent = true
      } catch { /* skip */ }
    }

    return NextResponse.json({
      ...brainResult,
      createdTasks,
      whatsappSent,
      dataSnapshot: {
        tasks: taskStats,
        mongo: mongo || {},
        connectedAgents: agents?.summary?.connected || 0,
        totalAgents: agents?.summary?.total || 0,
      },
      runAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('Auto-run error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
