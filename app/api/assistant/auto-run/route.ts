/**
 * /api/assistant/auto-run
 *
 * THE COMPLETE BUSINESS BRAIN for Rabt Naturals HQ.
 * Monitors EVERY area: Sales, Finance, Consultations, AI Agents, Operations,
 * Marketing, CRM, Team, Content, Calling, Retention, Goals, HR — everything.
 *
 * Data Sources: MongoDB (rabtnaturals.com) + Supabase (HQ) + All AI Agent statuses
 */

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

    const now = new Date()
    const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart    = new Date(now.getTime() - 7  * 86400000)
    const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const sevenDaysAgo  = new Date(now.getTime() - 7  * 86400000)
    const todayISO = now.toISOString().split('T')[0]
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // ══════════════════════════════════════════════════════════════════════
    // 1. SUPABASE — Full HQ Data
    // ══════════════════════════════════════════════════════════════════════
    const [
      { data: allTasks },
      { data: allProfiles },
      { data: allCalls },
      { data: goalsRow },
      { data: scheduleRow },
      { data: lastRunRow },
    ] = await Promise.all([
      supabase.from('rabt_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('rabt_call_logs').select('*').gte('created_at', weekStart.toISOString()).order('created_at', { ascending: false }),
      supabase.from('hq_settings').select('value').eq('key', 'business_goals').single(),
      supabase.from('hq_settings').select('value').eq('key', 'auto_schedule').single(),
      supabase.from('hq_settings').select('value').eq('key', 'last_auto_run').single(),
    ])

    const tasks     = allTasks    || []
    const profiles  = allProfiles || []
    const calls     = allCalls    || []
    const goals     = goalsRow?.value || 'Reach ₹5L monthly revenue, 70%+ task completion rate, 50%+ call connection rate, <20 at-risk customers, >60% consultation completion rate'
    const schedule  = scheduleRow?.value || {}
    const lastRun   = lastRunRow?.value || null

    // — Task breakdown by area —
    const AREAS = ['Sales', 'Marketing', 'Operations', 'Specialist', 'Support', 'Finance', 'Tech', 'HR', 'Content', 'CRM']
    const tasksByArea = AREAS.reduce((acc, area) => {
      const areaT = tasks.filter((t: any) => t.area === area)
      acc[area] = {
        total:      areaT.length,
        done:       areaT.filter((t: any) => t.status === 'done').length,
        pending:    areaT.filter((t: any) => t.status === 'pending').length,
        inProgress: areaT.filter((t: any) => t.status === 'in_progress').length,
        blocked:    areaT.filter((t: any) => t.status === 'blocked').length,
        urgent:     areaT.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length,
        overdue:    areaT.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now).length,
      }
      return acc
    }, {} as Record<string, any>)

    // — Overall task stats —
    const taskStats = {
      total:      tasks.length,
      done:       tasks.filter((t: any) => t.status === 'done').length,
      inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
      blocked:    tasks.filter((t: any) => t.status === 'blocked').length,
      urgent:     tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length,
      overdue:    tasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now).length,
      completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'done').length / tasks.length) * 100) : 0,
    }

    // — Per-person workload —
    const perPersonWork = profiles.map((p: any) => {
      const myTasks = tasks.filter((t: any) => t.assigned_to === p.id || t.assigned_role === p.role)
      const pending  = myTasks.filter((t: any) => t.status === 'pending')
      const overdue  = myTasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now)
      const urgent   = myTasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
      const blocked  = myTasks.filter((t: any) => t.status === 'blocked')
      return {
        name:          p.name || p.email || 'Unknown',
        role:          p.role,
        email:         p.email,
        pending:       pending.length,
        overdue:       overdue.length,
        urgent:        urgent.length,
        blocked:       blocked.length,
        done:          myTasks.filter((t: any) => t.status === 'done').length,
        total:         myTasks.length,
        urgentTasks:   urgent.slice(0, 3).map((t: any) => t.title),
        overdueTasks:  overdue.slice(0, 2).map((t: any) => `${t.title} (due: ${t.due_date})`),
        pendingTasks:  pending.slice(0, 3).map((t: any) => t.title),
      }
    })

    // — Call stats —
    const callStats = {
      total:       calls.length,
      today:       calls.filter((c: any) => new Date(c.created_at) >= todayStart).length,
      connected:   calls.filter((c: any) => ['connected', 'completed', 'interested', 'follow_up'].includes(c.outcome || c.status || '')).length,
      failed:      calls.filter((c: any) => ['no_answer', 'failed', 'busy'].includes(c.outcome || '')).length,
      noCallToday: calls.filter((c: any) => new Date(c.created_at) >= todayStart).length === 0,
    }
    const callConnectionRate = calls.length > 0 ? Math.round((callStats.connected / calls.length) * 100) : 0

    // — Blocked & Overdue details —
    const blockedTaskList = tasks.filter((t: any) => t.status === 'blocked')
      .slice(0, 5).map((t: any) => `[${t.area}] ${t.title} → ${t.assigned_role || 'unassigned'}`)
    const overdueTaskList = tasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now)
      .slice(0, 5).map((t: any) => `[${t.area}] ${t.title} — due: ${t.due_date} — ${t.assigned_role || 'unassigned'}`)
    const urgentTaskList  = tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
      .slice(0, 5).map((t: any) => `[${t.area}] ${t.title} → ${t.assigned_role || 'unassigned'}`)

    // ══════════════════════════════════════════════════════════════════════
    // 2. MONGODB — Full rabtnaturals.com Data
    // ══════════════════════════════════════════════════════════════════════
    let mongo: any = {}
    try {
      const db = await getMongoDb()

      const [
        // Sales & Revenue
        todayOrdersPaid, weekOrdersPaid, monthOrdersPaid,
        monthRevArr, lastMonthRevArr, allTimePaidOrders,
        pendingDispatch, returnedOrders,
        ordersByStatusArr, ordersBySourceArr,

        // Consultations
        pendingConsultsArr, todayConsults, completedConsults, totalConsults,
        consultsBySpecArr, overdueConsultsArr,

        // Customers
        totalUsers, newUsersToday, newUsersWeek,
        atRiskArr,

        // Products (top sellers)
        topProductsArr,

        // Skin profiles
        totalProfiles, todayProfiles,
      ] = await Promise.all([

        // ── Orders ──
        db.collection('orders').countDocuments({ createdAt: { $gte: todayStart }, 'payment.status': 'paid' }),
        db.collection('orders').countDocuments({ createdAt: { $gte: weekStart },  'payment.status': 'paid' }),
        db.collection('orders').countDocuments({ createdAt: { $gte: monthStart }, 'payment.status': 'paid' }),

        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: monthStart }, 'payment.status': 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' }, avg: { $avg: '$pricing.total' }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: lastMonthStart, $lt: monthStart }, 'payment.status': 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('orders').countDocuments({ 'payment.status': 'paid' }),

        db.collection('orders').countDocuments({ status: { $in: ['pending', 'confirmed', 'processing'] } }),
        db.collection('orders').countDocuments({ status: 'returned', createdAt: { $gte: monthStart } }),

        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: monthStart } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: monthStart }, 'payment.status': 'paid' } },
          { $group: { _id: '$source', count: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
          { $sort: { revenue: -1 } },
        ]).toArray(),

        // ── Consultations ──
        db.collection('consultations').find({ status: 'pending' }).sort({ createdAt: 1 }).limit(8).toArray(),
        db.collection('consultations').countDocuments({ createdAt: { $gte: todayStart } }),
        db.collection('consultations').countDocuments({ status: 'completed' }),
        db.collection('consultations').countDocuments({}),

        db.collection('consultations').aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$assignedTo', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } },
          { $sort: { count: -1 } },
        ]).toArray(),
        // Consultations pending > 48 hours (overdue follow-up)
        db.collection('consultations').aggregate([
          { $match: { status: 'pending', createdAt: { $lt: new Date(now.getTime() - 2 * 86400000) } } },
          { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
          { $limit: 5 },
          { $project: { createdAt: 1, skinConcern: 1, assignedTo: 1, 'user.name': 1, 'user.phone': 1 } },
        ]).toArray(),

        // ── Customers ──
        db.collection('users').countDocuments({}),
        db.collection('users').countDocuments({ createdAt: { $gte: todayStart } }),
        db.collection('users').countDocuments({ createdAt: { $gte: weekStart } }),

        // At-risk: paid orders but last one > 30 days ago
        db.collection('orders').aggregate([
          { $match: { 'payment.status': 'paid' } },
          { $group: { _id: '$userId', lastOrder: { $max: '$createdAt' }, total: { $sum: 1 } } },
          { $match: { lastOrder: { $lt: thirtyDaysAgo } } },
          { $count: 'count' },
        ]).toArray(),

        // ── Top Products ──
        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: monthStart }, 'payment.status': 'paid' } },
          { $unwind: '$items' },
          { $group: { _id: '$items.productSnapshot.name', units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price.final', '$items.quantity'] } } } },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
        ]).toArray(),

        // ── Skin Profiles ──
        db.collection('skinprofiles').countDocuments({}).catch(() => 0),
        db.collection('skinprofiles').countDocuments({ createdAt: { $gte: todayStart } }).catch(() => 0),
      ])

      const monthRev     = monthRevArr[0]?.total || 0
      const lastMonthRev = lastMonthRevArr[0]?.total || 0
      const revGrowth    = lastMonthRev > 0 ? Math.round(((monthRev - lastMonthRev) / lastMonthRev) * 100) : 0
      const avgOrderVal  = monthRevArr[0]?.avg || 0
      const consultCompRate = totalConsults > 0 ? Math.round((completedConsults / totalConsults) * 100) : 0
      const atRisk       = atRiskArr[0]?.count || 0

      // Status breakdown
      const statusMap: Record<string, number> = {}
      ordersByStatusArr.forEach((s: any) => { statusMap[s._id] = s.count })

      // Pending consultations formatted
      const pendingConsultDetails = pendingConsultsArr.map((c: any) => {
        const daysPending = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 86400000)
        return `${c.userId || 'Customer'} — ${c.skinConcern || 'skin consultation'} — ${daysPending}d pending — assigned: ${c.assignedTo || 'nobody'}`
      })

      // Overdue consultations
      const overdueConsultDetails = overdueConsultsArr.map((c: any) => {
        const daysPending = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 86400000)
        return `${c.user?.[0]?.name || 'Customer'} (${c.user?.[0]?.phone || ''}) — ${c.skinConcern || 'consult'} — ${daysPending} days waiting`
      })

      // Revenue by source
      const revBySource = ordersBySourceArr.slice(0, 4).map((s: any) =>
        `${s._id || 'Direct'}: ${s.count} orders, ₹${Math.round(s.revenue || 0).toLocaleString('en-IN')}`)

      mongo = {
        // Sales
        todayOrders:       todayOrdersPaid,
        weekOrders:        weekOrdersPaid,
        monthOrders:       monthOrdersPaid,
        monthRevenue:      Math.round(monthRev),
        lastMonthRevenue:  Math.round(lastMonthRev),
        revGrowth,
        avgOrderValue:     Math.round(avgOrderVal),
        allTimePaidOrders,
        pendingDispatch,
        returnedThisMonth: returnedOrders,
        returnRate:        monthOrdersPaid > 0 ? Math.round((returnedOrders / monthOrdersPaid) * 100) : 0,
        orderStatusMap:    statusMap,
        revBySource,

        // Consultations
        pendingConsultations:  pendingConsultsArr.length,
        pendingConsultDetails,
        overdueConsultDetails,
        todayConsultations:    todayConsults,
        completedConsultations: completedConsults,
        totalConsultations:    totalConsults,
        consultCompRate,
        consultsBySpecialist:  consultsBySpecArr,

        // Customers
        totalUsers,
        newUsersToday,
        newUsersWeek,
        atRiskCustomers: atRisk,

        // Products
        topProducts: topProductsArr.filter((p: any) => p._id).map((p: any) => `${p._id}: ${p.units} units, ₹${Math.round(p.revenue || 0).toLocaleString('en-IN')}`),

        // Skin profiles
        totalProfiles,
        todayProfiles,
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB:', mongoErr.message)
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. AGENT STATUS
    // ══════════════════════════════════════════════════════════════════════
    let agentsData: any = null
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const r = await fetch(`${base}/api/agents/status`)
      if (r.ok) agentsData = await r.json()
    } catch { /* skip */ }

    const allAgents       = agentsData?.agents || []
    const disconnected    = allAgents.filter((a: any) => a.status === 'disconnected').map((a: any) => `${a.name} — ${a.details}`)
    const partial         = allAgents.filter((a: any) => a.status === 'partial').map((a: any) => `${a.name} — ${a.details}`)
    const connected       = allAgents.filter((a: any) => a.status === 'connected').map((a: any) => a.name)
    const missingKeys     = allAgents.flatMap((a: any) => (a.missingKeys || []).map((k: string) => `${a.name}: missing ${k}`))

    // ══════════════════════════════════════════════════════════════════════
    // 4. BUILD THE MEGA-PROMPT
    // ══════════════════════════════════════════════════════════════════════
    const taskAreaLines = Object.entries(tasksByArea)
      .filter(([, v]: [string, any]) => v.total > 0)
      .map(([area, v]: [string, any]) => `  ${area}: ${v.total} total | ${v.done} done | ${v.pending} pending | ${v.blocked} blocked | ${v.urgent} urgent | ${v.overdue} overdue`)
      .join('\n')

    const personLines = perPersonWork
      .filter(p => p.total > 0 || ['specialist', 'ops', 'manager', 'founder'].includes(p.role))
      .slice(0, 12)
      .map(p => `  • ${p.name} (${p.role}): ${p.pending} pending | ${p.urgent} urgent | ${p.overdue} overdue | ${p.done}/${p.total} done
      Pending: ${p.pendingTasks.join('; ') || 'none'}
      Urgent: ${p.urgentTasks.join('; ') || 'none'}`)
      .join('\n')

    const prompt = `You are the COMPLETE AUTONOMOUS OPERATIONS BRAIN for Rabt Naturals — Indian skincare D2C brand.
You now have access to EVERY business metric across ALL departments.
Think exactly like the smartest founder + COO + CFO combined.

DATE: ${dateStr}
LAST RUN: ${lastRun ? `${lastRun.runAt?.slice(0,10)} — Situation: ${lastRun.situation}, Tasks created: ${lastRun.tasksCreated}` : 'First run'}

══════════════════════════════════
📦 SALES & REVENUE (MongoDB — rabtnaturals.com)
══════════════════════════════════
Today's paid orders: ${mongo.todayOrders ?? 'N/A'}
This week paid orders: ${mongo.weekOrders ?? 'N/A'}
This month paid orders: ${mongo.monthOrders ?? 'N/A'}
This month revenue: ₹${mongo.monthRevenue ? mongo.monthRevenue.toLocaleString('en-IN') : 'N/A'}
Last month revenue: ₹${mongo.lastMonthRevenue ? mongo.lastMonthRevenue.toLocaleString('en-IN') : 'N/A'}
Revenue growth MoM: ${mongo.revGrowth !== undefined ? mongo.revGrowth + '%' : 'N/A'}
Avg order value: ₹${mongo.avgOrderValue ?? 'N/A'}
All-time paid orders: ${mongo.allTimePaidOrders ?? 'N/A'}
Revenue by channel: ${mongo.revBySource?.join(' | ') || 'N/A'}

📦 OPERATIONS
Pending dispatch (not shipped yet): ${mongo.pendingDispatch ?? 0} orders — URGENT if > 0
Returned orders this month: ${mongo.returnedThisMonth ?? 0} (return rate: ${mongo.returnRate ?? 0}%)
Order status breakdown: ${JSON.stringify(mongo.orderStatusMap || {})}

══════════════════════════════════
🌿 CONSULTATIONS & SPECIALISTS (MongoDB)
══════════════════════════════════
Total pending consultations: ${mongo.pendingConsultations ?? 'N/A'} — each one is a LEAD
Overdue (48h+, never followed up): ${mongo.overdueConsultDetails?.length ?? 0}
Today's new consultations: ${mongo.todayConsultations ?? 'N/A'}
Consultation completion rate: ${mongo.consultCompRate ?? 0}%
Total completed: ${mongo.completedConsultations ?? 'N/A'} of ${mongo.totalConsultations ?? 'N/A'}

PENDING CONSULTATIONS (oldest first — most urgent):
${mongo.pendingConsultDetails?.join('\n') || '  None pending'}

OVERDUE CONSULTATIONS (48h+ no follow-up — CRITICAL):
${mongo.overdueConsultDetails?.join('\n') || '  None overdue'}

Skin profiles created today: ${mongo.todayProfiles ?? 0} | Total: ${mongo.totalProfiles ?? 0}

══════════════════════════════════
🛒 CRM & CUSTOMERS (MongoDB)
══════════════════════════════════
Total registered users: ${mongo.totalUsers ?? 'N/A'}
New users today: ${mongo.newUsersToday ?? 0}
New users this week: ${mongo.newUsersWeek ?? 0}
AT-RISK customers (30+ days no reorder): ${mongo.atRiskCustomers ?? 0} — need retention campaign

TOP PRODUCTS this month:
${mongo.topProducts?.join('\n') || '  No product data'}

══════════════════════════════════
📞 CALLING AGENT (Supabase call logs)
══════════════════════════════════
Calls this week: ${callStats.total}
Calls today: ${callStats.today}${callStats.noCallToday ? ' ⚠️ NO CALLS MADE TODAY' : ''}
Connected: ${callStats.connected} | Failed: ${callStats.failed}
Connection rate: ${callConnectionRate}%

══════════════════════════════════
✅ TASKS — ALL DEPARTMENTS (Supabase)
══════════════════════════════════
OVERALL: ${taskStats.total} total | ${taskStats.done} done (${taskStats.completionRate}%) | ${taskStats.blocked} BLOCKED | ${taskStats.urgent} URGENT | ${taskStats.overdue} OVERDUE

BY DEPARTMENT:
${taskAreaLines || '  No tasks'}

BLOCKED TASKS (must unblock):
${blockedTaskList.join('\n') || '  None'}

OVERDUE TASKS (deadline passed):
${overdueTaskList.join('\n') || '  None'}

URGENT TASKS (need same-day action):
${urgentTaskList.join('\n') || '  None'}

══════════════════════════════════
👥 TEAM — PER PERSON (Supabase)
══════════════════════════════════
${personLines || '  No team data'}

══════════════════════════════════
🤖 AI AGENTS STATUS
══════════════════════════════════
Connected (working): ${connected.join(', ') || 'None'}
DISCONNECTED (broken): ${disconnected.join('; ') || 'None — all good!'}
Partial/warning: ${partial.join('; ') || 'None'}
Missing API keys: ${missingKeys.slice(0, 6).join(', ') || 'None'}

══════════════════════════════════
🎯 BUSINESS GOALS
══════════════════════════════════
${typeof goals === 'string' ? goals : JSON.stringify(goals)}

══════════════════════════════════
🧠 YOUR COMPLETE JOB
══════════════════════════════════
Analyze EVERY section above. Create specific tasks for EACH area that needs attention:

SALES: If orders low today → task to run promotion/call
OPERATIONS: If pendingDispatch > 0 → urgent ops task to ship immediately
CONSULTATIONS: For EACH overdue/pending consult → specific specialist follow-up task
CUSTOMERS: If atRisk > 0 → retention campaign task for marketing
CALLING: If no calls today → task for calling agent team
TASKS: For each blocked/overdue task → create unblock/escalation task
AGENTS: For each disconnected agent → setup task for tech
FINANCE: If return rate high or revenue down → analysis task for manager
GOALS: Assess each goal → create tasks to stay on track

ASSIGNMENT RULES:
- Specialist consultation follow-up → assigned_role: "specialist"
- Orders to dispatch → assigned_role: "ops"
- Blocked task escalation → assigned_role: "manager"
- At-risk customer campaign → assigned_role: "marketing"
- Calling activity → assigned_role: "sales"
- Agent setup → assigned_role: "tech"
- Revenue analysis → assigned_role: "finance"
- Team management → assigned_role: "manager"

TODAY: ${todayISO}

Respond ONLY with valid JSON:
{
  "situation": "good|warning|critical",
  "analysis": "4-5 sentence sharp executive analysis covering ALL areas — sales, consultations, ops, team, agents",
  "areasMonitored": ["Sales", "Operations", "Consultations", "Calling", "Marketing", "Finance", "Team", "AI Agents", "CRM", "Goals"],
  "perPersonSummary": [
    {
      "name": "person name",
      "role": "role",
      "status": "on_track|needs_attention|critical",
      "whatTheyNeedToDo": "specific 1-2 sentence instruction for this person TODAY",
      "pendingCount": 0
    }
  ],
  "tasksToCreate": [
    {
      "title": "very specific actionable task",
      "description": "detailed: what, why, how, customer name if relevant",
      "assigned_role": "specialist|ops|manager|marketing|sales|tech|finance",
      "area": "Sales|Marketing|Operations|Specialist|Support|Finance|Tech|CRM|Content|HR",
      "priority": "urgent|high|medium|low",
      "due_date": "YYYY-MM-DD",
      "ai_reason": "exact data point that triggered this task (with numbers)"
    }
  ],
  "agentAlerts": [
    { "agent": "agent name", "severity": "critical|warning", "action": "specific fix step" }
  ],
  "goalProgress": [
    { "goal": "goal text", "status": "on_track|behind|ahead|unknown", "insight": "data-backed specific comment" }
  ],
  "departmentScores": {
    "Sales": "good|warning|critical",
    "Operations": "good|warning|critical",
    "Consultations": "good|warning|critical",
    "Marketing": "good|warning|critical",
    "Finance": "good|warning|critical",
    "Team": "good|warning|critical",
    "Agents": "good|warning|critical"
  },
  "whatsappReport": "Complete WhatsApp report with *bold* and emojis. Sections: 📊 Overview | 🌿 Consultations pending | 📦 Orders & dispatch | 👥 Team work pending | 🤖 Agents | 🎯 Goals. Name specific people and numbers. End with today's top 3 action items.",
  "focusForToday": "The single most critical action with specific reason and data"
}`

    // ══════════════════════════════════════════════════════════════════════
    // 5. CLAUDE ANALYSIS
    // ══════════════════════════════════════════════════════════════════════
    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let brain: any = null
    if (jsonMatch) {
      try { brain = JSON.parse(jsonMatch[0]) } catch { /* fallback */ }
    }

    if (!brain) {
      brain = {
        situation: 'warning',
        analysis: text.slice(0, 500),
        areasMonitored: [],
        perPersonSummary: [],
        tasksToCreate: [],
        agentAlerts: [],
        goalProgress: [],
        departmentScores: {},
        whatsappReport: text.slice(0, 600),
        focusForToday: 'Review system — data analysis incomplete',
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. AUTO-CREATE TASKS IN SUPABASE
    // ══════════════════════════════════════════════════════════════════════
    const createdTasks: any[] = []
    if (createTasks && brain.tasksToCreate?.length > 0) {
      for (const task of brain.tasksToCreate.slice(0, 12)) {
        const { data, error } = await supabase.from('rabt_tasks').insert({
          title: task.title,
          description: `${task.description}\n\n━━━━━━━━━━━━━━━━\n🤖 AI Auto-Created by Assistant Brain\n📊 Data trigger: ${task.ai_reason}\n🕐 Created: ${now.toLocaleString('en-IN')}`,
          assigned_role: task.assigned_role,
          area: task.area,
          priority: task.priority,
          due_date: task.due_date || null,
          status: 'pending',
          created_at: now.toISOString(),
        }).select().single()
        if (!error && data) createdTasks.push(data)
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. SEND WHATSAPP REPORTS TO FOUNDERS/MANAGERS
    // ══════════════════════════════════════════════════════════════════════
    const reportPhones = [
      ...(phones || []),
      ...(phone ? [phone] : []),
      ...(Array.isArray(schedule?.phones) ? schedule.phones : []),
    ].filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

    let whatsappSent = 0
    if (sendReport && brain.whatsappReport && reportPhones.length > 0) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      for (const p of reportPhones) {
        try {
          await fetch(`${base}/api/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: p, message: brain.whatsappReport }),
          })
          whatsappSent++
        } catch { /* skip */ }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 8. SAVE RUN LOG TO SUPABASE
    // ══════════════════════════════════════════════════════════════════════
    await supabase.from('hq_settings').upsert({
      key: 'last_auto_run',
      value: {
        runAt:         now.toISOString(),
        situation:     brain.situation,
        tasksCreated:  createdTasks.length,
        whatsappSent,
        focusForToday: brain.focusForToday,
        analysis:      brain.analysis,
        departmentScores: brain.departmentScores || {},
        areasMonitored:   brain.areasMonitored || [],
      },
      updated_at: now.toISOString(),
    }).catch(() => {})

    return NextResponse.json({
      ...brain,
      createdTasks,
      whatsappSent,
      dataSnapshot: {
        tasks:            taskStats,
        tasksByArea,
        calls:            callStats,
        callConnectionRate,
        mongo,
        connectedAgents:  agentsData?.summary?.connected || 0,
        totalAgents:      agentsData?.summary?.total || 0,
        disconnectedCount: disconnected.length,
      },
      runAt: now.toISOString(),
    })
  } catch (e: any) {
    console.error('Auto-run error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
