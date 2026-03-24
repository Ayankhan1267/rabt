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
    const { createTasks = true, sendReport = false, phone, phones } = await req.json().catch(() => ({}))

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const todayISO = today.toISOString().split('T')[0]

    // ── 1. SUPABASE DATA ───────────────────────────────────────────────────
    const [
      { data: allTasks },
      { data: allProfiles },
      { data: recentCalls },
      { data: goalsRow },
      { data: scheduleRow },
    ] = await Promise.all([
      supabase.from('rabt_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, role, email, updated_at'),
      supabase.from('rabt_call_logs').select('*').gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }),
      supabase.from('hq_settings').select('value').eq('key', 'business_goals').single(),
      supabase.from('hq_settings').select('value').eq('key', 'auto_schedule').single(),
    ])

    const tasks = allTasks || []
    const profiles = allProfiles || []
    const calls = recentCalls || []
    const goals = goalsRow?.value || 'Default: ₹5L monthly revenue, 70%+ task completion, 50%+ call connection rate, < 20 at-risk customers'
    const schedule = scheduleRow?.value || {}

    // Per-person task breakdown
    const specialistProfiles = profiles.filter((p: any) => ['specialist', 'specialist_manager', 'ops', 'support'].includes(p.role))
    const managerProfiles = profiles.filter((p: any) => ['founder', 'admin', 'manager'].includes(p.role))

    const perPersonWork = profiles.map((p: any) => {
      const myTasks = tasks.filter((t: any) => t.assigned_to === p.id || t.assigned_role === p.role)
      const pending = myTasks.filter((t: any) => t.status === 'pending')
      const inProgress = myTasks.filter((t: any) => t.status === 'in_progress')
      const blocked = myTasks.filter((t: any) => t.status === 'blocked')
      const overdue = myTasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < today)
      const urgent = myTasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
      return {
        name: p.name || p.email,
        role: p.role,
        id: p.id,
        pending: pending.length,
        inProgress: inProgress.length,
        blocked: blocked.length,
        overdue: overdue.length,
        urgent: urgent.length,
        done: myTasks.filter((t: any) => t.status === 'done').length,
        total: myTasks.length,
        pendingTitles: pending.slice(0, 3).map((t: any) => t.title),
        urgentTitles: urgent.slice(0, 2).map((t: any) => t.title),
        overdueTitles: overdue.slice(0, 2).map((t: any) => `${t.title} (due: ${t.due_date})`),
      }
    })

    // Task stats
    const taskStats = {
      total: tasks.length,
      done: tasks.filter((t: any) => t.status === 'done').length,
      inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
      blocked: tasks.filter((t: any) => t.status === 'blocked').length,
      urgent: tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length,
      overdue: tasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < today).length,
    }

    // Call stats
    const callStats = {
      total: calls.length,
      today: calls.filter((c: any) => new Date(c.created_at) >= todayStart).length,
      connected: calls.filter((c: any) => ['connected', 'completed', 'interested', 'follow_up'].includes(c.outcome || c.status || '')).length,
      failed: calls.filter((c: any) => ['no_answer', 'failed', 'busy'].includes(c.outcome || '')).length,
    }

    // ── 2. MONGODB DATA ────────────────────────────────────────────────────
    let mongoData: any = null
    try {
      const db = await getMongoDb()

      const [
        todayOrders, monthOrders, totalOrders,
        pendingConsultationsArr, completedConsultations, todayConsultations,
        monthRevRes, pendingOrdersArr,
        atRiskArr, newUsersToday, totalUsers,
        consultationsBySpecialist,
        oldestPendingConsults,
        recentOrdersList,
      ] = await Promise.all([
        db.collection('orders').countDocuments({ createdAt: { $gte: todayStart }, 'payment.status': 'paid' }),
        db.collection('orders').countDocuments({ createdAt: { $gte: thisMonthStart }, 'payment.status': 'paid' }),
        db.collection('orders').countDocuments({ 'payment.status': 'paid' }),

        db.collection('consultations').find({ status: 'pending' }).sort({ createdAt: 1 }).limit(10).toArray(),
        db.collection('consultations').countDocuments({ status: 'completed' }),
        db.collection('consultations').countDocuments({ createdAt: { $gte: todayStart } }),

        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: thisMonthStart }, 'payment.status': 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' }, avg: { $avg: '$pricing.total' } } },
        ]).toArray(),

        db.collection('orders').find({ status: { $in: ['pending', 'processing', 'confirmed'] } })
          .sort({ createdAt: -1 }).limit(5).toArray(),

        // At-risk customers (no order in 30 days)
        db.collection('orders').aggregate([
          { $match: { 'payment.status': 'paid' } },
          { $group: { _id: '$userId', lastOrder: { $max: '$createdAt' }, totalOrders: { $sum: 1 } } },
          { $match: { lastOrder: { $lt: thirtyDaysAgo } } },
          { $count: 'count' },
        ]).toArray(),

        db.collection('users').countDocuments({ createdAt: { $gte: todayStart } }),
        db.collection('users').countDocuments({}),

        // Consultations grouped by specialist
        db.collection('consultations').aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$assignedTo', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } },
          { $sort: { count: -1 } },
        ]).toArray(),

        // Oldest pending consultations (most urgent follow-ups)
        db.collection('consultations').aggregate([
          { $match: { status: 'pending' } },
          { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
          { $sort: { createdAt: 1 } },
          { $limit: 5 },
          { $project: {
            createdAt: 1, status: 1, skinConcern: 1,
            'user.name': 1, 'user.phone': 1,
            assignedTo: 1,
            daysPending: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] }
          }},
        ]).toArray(),

        // Recent orders (today)
        db.collection('orders').find({ createdAt: { $gte: todayStart } })
          .sort({ createdAt: -1 }).limit(5).project({ 'pricing.total': 1, status: 1, 'payment.status': 1, createdAt: 1 }).toArray(),
      ])

      mongoData = {
        todayOrders,
        monthOrders,
        totalOrders,
        monthRevenue: monthRevRes[0]?.total || 0,
        avgOrderValue: monthRevRes[0]?.avg || 0,
        pendingConsultations: pendingConsultationsArr.length,
        completedConsultations,
        todayConsultations,
        pendingOrders: pendingOrdersArr.length,
        atRiskCustomers: atRiskArr[0]?.count || 0,
        newUsersToday,
        totalUsers,
        consultationsBySpecialist,
        oldestPendingConsults: oldestPendingConsults.map((c: any) => ({
          id: c._id?.toString(),
          customerName: c.user?.[0]?.name || 'Unknown Customer',
          customerPhone: c.user?.[0]?.phone || '',
          concern: c.skinConcern || 'General consultation',
          daysPending: Math.round(c.daysPending || 0),
          assignedTo: c.assignedTo || 'Unassigned',
        })),
        recentOrdersToday: recentOrdersList.length,
        pendingOrderDetails: pendingOrdersArr.slice(0, 3).map((o: any) => ({
          id: o._id?.toString(),
          status: o.status,
          amount: o.pricing?.total || 0,
        })),
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB fetch warning:', mongoErr.message)
      mongoData = null
    }

    // ── 3. AGENT STATUS ────────────────────────────────────────────────────
    let agentsData: any = null
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
      const agentRes = await fetch(`${appUrl}/api/agents/status`)
      if (agentRes.ok) agentsData = await agentRes.json()
    } catch { /* skip */ }

    const disconnectedAgents = agentsData?.agents?.filter((a: any) => a.status === 'disconnected').map((a: any) => a.name) || []
    const partialAgents = agentsData?.agents?.filter((a: any) => a.status === 'partial').map((a: any) => `${a.name}: ${a.details}`) || []

    // ── 4. BUILD PROMPT ────────────────────────────────────────────────────
    const specialistWorkload = perPersonWork
      .filter(p => ['specialist', 'ops', 'support', 'specialist_manager'].includes(p.role))
      .map(p => `  • ${p.name} (${p.role}): ${p.pending} pending | ${p.inProgress} in-progress | ${p.urgent} urgent | ${p.overdue} overdue
    Pending tasks: ${p.pendingTitles.join(', ') || 'none'}
    Urgent: ${p.urgentTitles.join(', ') || 'none'}
    Overdue: ${p.overdueTitles.join(', ') || 'none'}`)
      .join('\n')

    const managerWorkload = perPersonWork
      .filter(p => ['founder', 'admin', 'manager'].includes(p.role))
      .map(p => `  • ${p.name} (${p.role}): ${p.pending} pending | ${p.done} done out of ${p.total} total`)
      .join('\n')

    const oldConsultLines = mongoData?.oldestPendingConsults?.map((c: any) =>
      `  • ${c.customerName} — ${c.concern} — waiting ${c.daysPending} day(s) — assigned: ${c.assignedTo}`
    ).join('\n') || '  None'

    const prompt = `You are the autonomous AI Operations Brain for Rabt Naturals — Indian skincare/haircare D2C brand.
You have COMPLETE access to every data source. Think exactly like the founder's smartest COO.
Your job: monitor EVERYONE's work, find what's falling through the cracks, auto-assign tasks.

TODAY: ${dateStr}

══════════ RABTNATURALS.COM DATA (MongoDB) ══════════
ORDERS:
- Today's paid orders: ${mongoData?.todayOrders ?? 'N/A'}
- This month paid orders: ${mongoData?.monthOrders ?? 'N/A'}
- This month revenue: ₹${mongoData?.monthRevenue ? Math.round(mongoData.monthRevenue).toLocaleString('en-IN') : 'N/A'}
- Avg order value: ₹${mongoData?.avgOrderValue ? Math.round(mongoData.avgOrderValue) : 'N/A'}
- Orders pending fulfillment: ${mongoData?.pendingOrders ?? 0} (need immediate dispatch!)

CONSULTATIONS (LEADS):
- PENDING consultations needing follow-up: ${mongoData?.pendingConsultations ?? 'N/A'}
- Completed this month: ${mongoData?.completedConsultations ?? 'N/A'}
- New today: ${mongoData?.todayConsultations ?? 'N/A'}

OLDEST PENDING CONSULTATIONS (most urgent follow-up needed):
${oldConsultLines}

CUSTOMERS:
- At-risk (30+ days no reorder): ${mongoData?.atRiskCustomers ?? 'N/A'} customers
- New registrations today: ${mongoData?.newUsersToday ?? 'N/A'}
- Total users: ${mongoData?.totalUsers ?? 'N/A'}

══════════ HQ OPERATIONS (Supabase) ══════════
OVERALL TASKS: ${taskStats.total} total | ${taskStats.done} done | ${taskStats.inProgress} in-progress | ${taskStats.blocked} BLOCKED | ${taskStats.urgent} URGENT | ${taskStats.overdue} OVERDUE

SPECIALIST WORKLOAD (their pending work):
${specialistWorkload || '  No specialist data'}

MANAGER/ADMIN WORKLOAD:
${managerWorkload || '  No manager data'}

BLOCKED TASKS:
${tasks.filter((t: any) => t.status === 'blocked').map((t: any) => `  • [${t.area}] ${t.title} — assigned: ${t.assigned_role || 'none'}`).join('\n') || '  None'}

OVERDUE TASKS:
${tasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < today).map((t: any) => `  • [${t.area}] ${t.title} — due: ${t.due_date} — role: ${t.assigned_role || 'unassigned'}`).join('\n') || '  None'}

CALLS THIS WEEK: ${callStats.total} total | ${callStats.today} today | ${callStats.connected} connected | ${callStats.failed} failed

══════════ AI AGENTS STATUS ══════════
Disconnected (broken): ${disconnectedAgents.join(', ') || 'None'}
Partial/issues: ${partialAgents.join(', ') || 'None'}
Connected agents: ${agentsData?.summary?.connected || 0}/${agentsData?.summary?.total || 0}

══════════ BUSINESS GOALS ══════════
${typeof goals === 'string' ? goals : JSON.stringify(goals)}

══════════ YOUR TASKS ══════════
1. Analyze the COMPLETE picture — who is doing their job, who is falling behind
2. For EACH specialist: determine what they need to do TODAY and why
3. For pending consultations: assign follow-up tasks specifically
4. For at-risk customers: create retention task
5. For blocked/overdue: create unblock tasks for the right person
6. For each disconnected agent: create setup task
7. Create WhatsApp report for founder/admin/manager — very specific, name-by-name

TASK CREATION RULES:
- Pending consultations → urgent task for specialist (name the customer if known)
- At-risk customers → high priority for retention/marketing
- Blocked tasks → manager must unblock → assign to manager
- Overdue → escalate → assign to manager + original owner
- Orders pending dispatch → ops must fulfill → urgent
- No calls today → reminder task for sales/calling team
- Assign to specific role: specialist | ops | manager | marketing | sales | tech | finance

TODAY: ${todayISO} (use for due_date calculation)

Respond ONLY with valid JSON:
{
  "situation": "good|warning|critical",
  "analysis": "3-4 sentence sharp executive analysis — mention specific names/numbers",
  "perPersonSummary": [
    {
      "name": "person name or role",
      "role": "their role",
      "status": "on_track|needs_attention|critical",
      "whatTheyNeedToDo": "specific 1-2 sentence instruction for this person",
      "pendingCount": 0
    }
  ],
  "tasksToCreate": [
    {
      "title": "very specific actionable task title",
      "description": "detailed: what to do, why, how, reference customer name if relevant",
      "assigned_role": "specialist|ops|manager|marketing|sales|tech|finance",
      "area": "Sales|Marketing|Operations|Specialist|Support|Finance|Tech",
      "priority": "urgent|high|medium|low",
      "due_date": "YYYY-MM-DD",
      "ai_reason": "specific data point that triggered this task"
    }
  ],
  "agentAlerts": [
    { "agent": "agent name", "severity": "critical|warning", "action": "specific step to fix" }
  ],
  "goalProgress": [
    { "goal": "goal text", "status": "on_track|behind|ahead|unknown", "insight": "specific data-backed comment" }
  ],
  "whatsappReport": "Full WhatsApp report with *bold* and emojis. Include: situation, per-specialist pending work, orders status, consultation follow-ups needed, goals. Make it actionable for the founder.",
  "focusForToday": "The single most critical thing to do right now with reason"
}`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
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
        perPersonSummary: [],
        tasksToCreate: [],
        agentAlerts: [],
        goalProgress: [],
        whatsappReport: text.slice(0, 500),
        focusForToday: 'Review system data',
      }
    }

    // ── 5. AUTO-CREATE TASKS IN SUPABASE ───────────────────────────────────
    const createdTasks: any[] = []
    if (createTasks && brainResult.tasksToCreate?.length > 0) {
      for (const task of brainResult.tasksToCreate.slice(0, 10)) {
        const { data, error } = await supabase.from('rabt_tasks').insert({
          title: task.title,
          description: `${task.description}\n\n━━━\n🤖 AI Auto-Created\nReason: ${task.ai_reason}\nCreated at: ${new Date().toLocaleString('en-IN')}`,
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

    // ── 6. SEND WHATSAPP REPORTS ───────────────────────────────────────────
    const reportPhones = [
      ...(phones || []),
      ...(phone ? [phone] : []),
      ...(Array.isArray(schedule?.phones) ? schedule.phones : []),
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // dedupe

    let whatsappSent = 0
    if (sendReport && brainResult.whatsappReport && reportPhones.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      for (const p of reportPhones) {
        try {
          await fetch(`${appUrl}/api/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: p, message: brainResult.whatsappReport }),
          })
          whatsappSent++
        } catch { /* skip */ }
      }
    }

    return NextResponse.json({
      ...brainResult,
      createdTasks,
      whatsappSent,
      dataSnapshot: {
        tasks: taskStats,
        calls: callStats,
        mongo: mongoData || {},
        connectedAgents: agentsData?.summary?.connected || 0,
        totalAgents: agentsData?.summary?.total || 0,
        specialistCount: specialistProfiles.length,
        managerCount: managerProfiles.length,
      },
      runAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('Auto-run error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
