/**
 * /api/assistant/auto-run
 * COMPLETE 360° BUSINESS BRAIN — monitors every section of Rabt HQ
 *
 * Covers ALL 50 sidebar sections:
 * Dashboard, All AI Agents, Specialist Panel, Admin, Kanban, Calendar, Team Hub,
 * Partner Portal, Vendor, Website Analytics, Customers, CRM/Leads, Orders,
 * Inventory, Consultations, Skin Profiles, Specialists, Support, Communications,
 * Reminders, Marketing, SEO, Social, Video, Content, Ads, Finance,
 * Funnel Tracker, Revenue Flow, Product Lab, Goals & OKR, Reports, HR, Team,
 * Automation, AI Agents Status, Knowledge Base, Settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'
import { createClient } from '@supabase/supabase-js'
import { getMongoDb } from '@/lib/mongodb'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Safe Supabase query — returns data or [] without throwing
async function sq(table: string, query: (q: any) => any): Promise<any[]> {
  try {
    const { data } = await query(supabase.from(table))
    return data || []
  } catch { return [] }
}

// Safe count
async function sc(table: string, query?: (q: any) => any): Promise<number> {
  try {
    const q = supabase.from(table).select('id', { count: 'exact', head: true })
    const { count } = await (query ? query(q) : q)
    return count || 0
  } catch { return 0 }
}

export async function POST(req: NextRequest) {
  try {
    const { createTasks = true, sendReport = false, phone, phones } = await req.json().catch(() => ({}))

    const now           = new Date()
    const todayStart    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart     = new Date(now.getTime() - 7  * 86400000)
    const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const todayISO      = now.toISOString().split('T')[0]
    const dateStr       = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // ══════════════════════════════════════════════════════════════════════
    // SUPABASE — fetch all HQ tables in parallel
    // ══════════════════════════════════════════════════════════════════════
    const [
      allTasks, allProfiles, allCalls, goalsRow, scheduleRow, lastRunRow,
      // Goals & OKR
      sbGoals, sbKeyResults,
      // HR
      hrLeaves, hrPayroll,
      // CRM
      crmLeads,
      // Finance
      financeExpenses, partnerWithdrawals,
      // Partners
      salesPartners,
      // Reminders / WhatsApp logs
      whatsappLogs, remindersPending,
      // Support
      supportOpen,
    ] = await Promise.all([
      sq('rabt_tasks',    q => q.select('*').order('created_at', { ascending: false })),
      sq('profiles',      q => q.select('*')),
      sq('rabt_call_logs',q => q.select('*').gte('created_at', weekStart.toISOString()).order('created_at', { ascending: false })),
      supabase.from('hq_settings').select('value').eq('key', 'business_goals').single().then(r => r.data?.value || null),
      supabase.from('hq_settings').select('value').eq('key', 'auto_schedule').single().then(r => r.data?.value || {}),
      supabase.from('hq_settings').select('value').eq('key', 'last_auto_run').single().then(r => r.data?.value || null),

      sq('goals',            q => q.select('*').order('created_at', { ascending: false })),
      sq('goal_key_results', q => q.select('*')),

      sq('hr_leaves',    q => q.select('*').eq('status', 'pending')),
      sq('hr_payroll',   q => q.select('*').gte('created_at', monthStart.toISOString())),

      sq('leads',        q => q.select('*').order('created_at', { ascending: false }).limit(50)),

      sq('finance_expenses', q => q.select('*').gte('created_at', monthStart.toISOString())),
      sq('partner_withdrawal_requests', q => q.select('*').eq('status', 'pending')),

      sq('sales_partners', q => q.select('id, name, status, commission_rate, total_sales').order('total_sales', { ascending: false }).limit(10)),

      sq('whatsapp_logs',  q => q.select('*').gte('created_at', weekStart.toISOString()).order('created_at', { ascending: false }).limit(20)),
      sq('leads',          q => q.select('id, status, created_at').eq('status', 'new').limit(30)),

      sq('support_tickets',q => q.select('id, status, priority, created_at').in('status', ['open', 'pending']).limit(20)),
    ])

    const tasks    = allTasks
    const profiles = allProfiles
    const calls    = allCalls
    const goals    = goalsRow || 'Reach ₹5L monthly revenue, 70%+ task completion rate, 50%+ call connection rate, <20 at-risk customers, >60% consultation completion rate'
    const schedule = scheduleRow || {}
    const lastRun  = lastRunRow

    // — Task breakdown by all areas —
    const AREAS = ['Sales', 'Marketing', 'Operations', 'Specialist', 'Support', 'Finance', 'Tech', 'HR', 'Content', 'CRM', 'Partner', 'Product']
    const tasksByArea = AREAS.reduce((acc, area) => {
      const t = tasks.filter((x: any) => x.area === area)
      acc[area] = {
        total: t.length, done: t.filter((x: any) => x.status === 'done').length,
        pending: t.filter((x: any) => x.status === 'pending').length,
        blocked: t.filter((x: any) => x.status === 'blocked').length,
        urgent:  t.filter((x: any) => x.priority === 'urgent' && x.status !== 'done').length,
        overdue: t.filter((x: any) => x.due_date && x.status !== 'done' && new Date(x.due_date) < now).length,
      }
      return acc
    }, {} as Record<string, any>)

    const taskStats = {
      total: tasks.length,
      done: tasks.filter((t: any) => t.status === 'done').length,
      inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
      blocked: tasks.filter((t: any) => t.status === 'blocked').length,
      urgent: tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').length,
      overdue: tasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now).length,
      completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 'done').length / tasks.length) * 100) : 0,
    }

    // — Per-person workload —
    const perPersonWork = profiles.slice(0, 15).map((p: any) => {
      const myT     = tasks.filter((t: any) => t.assigned_to === p.id || t.assigned_role === p.role)
      const pending  = myT.filter((t: any) => t.status === 'pending')
      const overdue  = myT.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now)
      const urgent   = myT.filter((t: any) => t.priority === 'urgent' && t.status !== 'done')
      return {
        name: p.name || p.email || 'Unknown', role: p.role,
        pending: pending.length, overdue: overdue.length,
        urgent: urgent.length, done: myT.filter((t: any) => t.status === 'done').length, total: myT.length,
        urgentTasks:  urgent.slice(0, 2).map((t: any) => t.title),
        overdueTasks: overdue.slice(0, 2).map((t: any) => `${t.title} (due:${t.due_date})`),
        pendingTasks: pending.slice(0, 3).map((t: any) => t.title),
      }
    })

    // — Call stats —
    const callStats = {
      total: calls.length, today: calls.filter((c: any) => new Date(c.created_at) >= todayStart).length,
      connected: calls.filter((c: any) => ['connected', 'completed', 'interested', 'follow_up'].includes(c.outcome || c.status || '')).length,
      failed:    calls.filter((c: any) => ['no_answer', 'failed', 'busy'].includes(c.outcome || '')).length,
      noCallToday: calls.filter((c: any) => new Date(c.created_at) >= todayStart).length === 0,
    }
    const callRate = calls.length > 0 ? Math.round((callStats.connected / calls.length) * 100) : 0

    // — Goals & OKR —
    const goalsOKR = sbGoals.slice(0, 6).map((g: any) => {
      const krs = sbKeyResults.filter((k: any) => k.goal_id === g.id)
      const doneKRs = krs.filter((k: any) => k.status === 'completed' || (k.current_value >= k.target_value))
      return `${g.title} [${g.status || 'active'}] — ${doneKRs.length}/${krs.length} KRs done — ${g.progress || 0}% progress`
    })

    // — HR summary —
    const hrSummary = {
      pendingLeaves: hrLeaves.length,
      pendingPayroll: hrPayroll.filter((p: any) => p.status === 'pending').length,
      teamCount: profiles.length,
      specialistCount: profiles.filter((p: any) => p.role === 'specialist').length,
    }

    // — CRM Leads —
    const crmSummary = {
      total: crmLeads.length,
      newToday: crmLeads.filter((l: any) => new Date(l.created_at) >= todayStart).length,
      newThisWeek: crmLeads.filter((l: any) => new Date(l.created_at) >= weekStart).length,
      open: crmLeads.filter((l: any) => l.status === 'new' || l.status === 'contacted').length,
      converted: crmLeads.filter((l: any) => l.status === 'converted').length,
    }

    // — Finance —
    const totalExpenses = financeExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)

    // — Partners —
    const partnerSummary = {
      total: salesPartners.length,
      pendingWithdrawals: partnerWithdrawals.length,
      topPartner: salesPartners[0]?.name || 'None',
    }

    // — WhatsApp Activity —
    const waSummary = {
      sent: whatsappLogs.length,
      todaySent: whatsappLogs.filter((l: any) => new Date(l.created_at) >= todayStart).length,
    }

    // ══════════════════════════════════════════════════════════════════════
    // MONGODB — complete rabtnaturals.com data
    // ══════════════════════════════════════════════════════════════════════
    let mongo: any = {}
    try {
      const db = await getMongoDb()

      const [
        todayOrdersPaid, weekOrdersPaid, monthOrdersPaid,
        monthRevArr, lastMonthRevArr,
        pendingDispatch, returnedOrders, ordersByStatusArr, ordersBySourceArr,
        pendingConsultsArr, todayConsults, completedConsults, totalConsults,
        consultsBySpecArr, overdueConsultsArr,
        totalUsers, newUsersToday, newUsersWeek, atRiskArr,
        topProductsArr, totalProducts, lowStockArr,
        totalSpecialists, totalSkinProfiles, todayProfiles,
      ] = await Promise.all([
        db.collection('orders').countDocuments({ createdAt: { $gte: todayStart }, 'payment.status': 'paid' }),
        db.collection('orders').countDocuments({ createdAt: { $gte: weekStart },  'payment.status': 'paid' }),
        db.collection('orders').countDocuments({ createdAt: { $gte: monthStart }, 'payment.status': 'paid' }),
        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: monthStart }, 'payment.status': 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' }, avg: { $avg: '$pricing.total' } } },
        ]).toArray(),
        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: lastMonthStart, $lt: monthStart }, 'payment.status': 'paid' } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]).toArray(),
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

        db.collection('consultations').find({ status: 'pending' }).sort({ createdAt: 1 }).limit(8).toArray(),
        db.collection('consultations').countDocuments({ createdAt: { $gte: todayStart } }),
        db.collection('consultations').countDocuments({ status: 'completed' }),
        db.collection('consultations').countDocuments({}),
        db.collection('consultations').aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$assignedTo', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } },
          { $sort: { count: -1 } },
        ]).toArray(),
        db.collection('consultations').aggregate([
          { $match: { status: 'pending', createdAt: { $lt: new Date(now.getTime() - 2 * 86400000) } } },
          { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
          { $limit: 5 },
          { $project: { createdAt: 1, skinConcern: 1, assignedTo: 1, 'user.name': 1, 'user.phone': 1 } },
        ]).toArray(),

        db.collection('users').countDocuments({}),
        db.collection('users').countDocuments({ createdAt: { $gte: todayStart } }),
        db.collection('users').countDocuments({ createdAt: { $gte: weekStart } }),
        db.collection('orders').aggregate([
          { $match: { 'payment.status': 'paid' } },
          { $group: { _id: '$userId', lastOrder: { $max: '$createdAt' }, total: { $sum: 1 } } },
          { $match: { lastOrder: { $lt: thirtyDaysAgo } } },
          { $count: 'count' },
        ]).toArray(),

        db.collection('orders').aggregate([
          { $match: { createdAt: { $gte: monthStart }, 'payment.status': 'paid' } },
          { $unwind: '$items' },
          { $group: { _id: '$items.productSnapshot.name', units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price.final', '$items.quantity'] } } } },
          { $sort: { revenue: -1 } }, { $limit: 5 },
        ]).toArray(),
        db.collection('products').countDocuments({}).catch(() => 0),
        db.collection('products').find({ $or: [{ stock: { $lt: 10 } }, { stock: { $exists: false } }] }).limit(5).project({ name: 1, stock: 1 }).toArray().catch(() => []),

        db.collection('specialists').countDocuments({}).catch(() => 0),
        db.collection('skinprofiles').countDocuments({}).catch(() => 0),
        db.collection('skinprofiles').countDocuments({ createdAt: { $gte: todayStart } }).catch(() => 0),
      ])

      const monthRev     = monthRevArr[0]?.total || 0
      const lastMonthRev = lastMonthRevArr[0]?.total || 0
      const revGrowth    = lastMonthRev > 0 ? Math.round(((monthRev - lastMonthRev) / lastMonthRev) * 100) : 0
      const consultCompRate = totalConsults > 0 ? Math.round((completedConsults / totalConsults) * 100) : 0
      const atRisk = atRiskArr[0]?.count || 0
      const statusMap: Record<string, number> = {}
      ordersByStatusArr.forEach((s: any) => { statusMap[s._id] = s.count })

      const pendingConsultDetails = pendingConsultsArr.map((c: any) => {
        const days = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 86400000)
        return `${c.userId || 'Customer'} — ${c.skinConcern || 'skin consultation'} — ${days}d pending — assigned: ${c.assignedTo || 'nobody'}`
      })
      const overdueConsultDetails = overdueConsultsArr.map((c: any) => {
        const days = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 86400000)
        return `${c.user?.[0]?.name || 'Customer'} (${c.user?.[0]?.phone || ''}) — ${c.skinConcern || 'consult'} — ${days} days waiting`
      })

      mongo = {
        todayOrders: todayOrdersPaid, weekOrders: weekOrdersPaid, monthOrders: monthOrdersPaid,
        monthRevenue: Math.round(monthRev), lastMonthRevenue: Math.round(lastMonthRev),
        revGrowth, avgOrderValue: Math.round(monthRevArr[0]?.avg || 0),
        pendingDispatch, returnedThisMonth: returnedOrders,
        returnRate: monthOrdersPaid > 0 ? Math.round((returnedOrders / monthOrdersPaid) * 100) : 0,
        orderStatusMap: statusMap,
        revBySource: ordersBySourceArr.slice(0, 4).map((s: any) => `${s._id || 'Direct'}: ${s.count} orders ₹${Math.round(s.revenue || 0).toLocaleString('en-IN')}`),
        pendingConsultations: pendingConsultsArr.length, pendingConsultDetails,
        overdueConsultDetails, todayConsultations: todayConsults,
        completedConsultations: completedConsults, totalConsultations: totalConsults,
        consultCompRate, consultsBySpecialist: consultsBySpecArr,
        totalUsers, newUsersToday, newUsersWeek, atRiskCustomers: atRisk,
        topProducts: topProductsArr.filter((p: any) => p._id).map((p: any) => `${p._id}: ${p.units} units ₹${Math.round(p.revenue || 0).toLocaleString('en-IN')}`),
        totalProducts, lowStockProducts: lowStockArr.map((p: any) => `${p.name} (stock: ${p.stock ?? 'unknown'})`),
        totalSpecialists, totalSkinProfiles, todaySkinProfiles: todayProfiles,
      }
    } catch (e: any) {
      console.warn('MongoDB:', e.message)
    }

    // ══════════════════════════════════════════════════════════════════════
    // AI AGENT STATUS
    // ══════════════════════════════════════════════════════════════════════
    let agentsData: any = null
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const r = await fetch(`${base}/api/agents/status`)
      if (r.ok) agentsData = await r.json()
    } catch { /* skip */ }

    const allAgents    = agentsData?.agents || []
    const disconnected = allAgents.filter((a: any) => a.status === 'disconnected').map((a: any) => `${a.name}: ${a.details}`)
    const partial      = allAgents.filter((a: any) => a.status === 'partial').map((a: any) => `${a.name}: ${a.details}`)
    const connected    = allAgents.filter((a: any) => a.status === 'connected').map((a: any) => a.name)
    const missingKeys  = allAgents.flatMap((a: any) => (a.missingKeys || []).map((k: string) => `${a.name} needs ${k}`))

    // ══════════════════════════════════════════════════════════════════════
    // BUILD THE COMPLETE PROMPT
    // ══════════════════════════════════════════════════════════════════════
    const taskAreaLines = Object.entries(tasksByArea)
      .filter(([, v]: any) => v.total > 0)
      .map(([area, v]: any) => `  ${area}: ${v.total} total | ${v.done} done | ${v.pending} pending | ${v.blocked} blocked | ${v.urgent} urgent | ${v.overdue} overdue`)
      .join('\n')

    const personLines = perPersonWork
      .filter(p => p.total > 0 || ['specialist', 'ops', 'manager', 'founder', 'admin'].includes(p.role))
      .map(p => `  • ${p.name} (${p.role}): pending=${p.pending} urgent=${p.urgent} overdue=${p.overdue} done=${p.done}/${p.total}
    Urgent: ${p.urgentTasks.join('; ') || 'none'} | Overdue: ${p.overdueTasks.join('; ') || 'none'}`)
      .join('\n')

    const prompt = `You are the COMPLETE AUTONOMOUS OPERATIONS BRAIN for Rabt Naturals HQ.
You monitor EVERY single section of the admin panel. Think like founder + COO + CFO + CTO combined.

DATE: ${dateStr} | LAST RUN: ${lastRun ? `${lastRun.runAt?.slice(0,10)}, situation=${lastRun.situation}, tasks=${lastRun.tasksCreated}` : 'First run'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 SALES & REVENUE (MongoDB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Orders today: ${mongo.todayOrders ?? 'N/A'} | This week: ${mongo.weekOrders ?? 'N/A'} | This month: ${mongo.monthOrders ?? 'N/A'}
Month revenue: ₹${mongo.monthRevenue?.toLocaleString('en-IN') ?? 'N/A'} | Last month: ₹${mongo.lastMonthRevenue?.toLocaleString('en-IN') ?? 'N/A'} | Growth: ${mongo.revGrowth ?? 0}%
Avg order value: ₹${mongo.avgOrderValue ?? 'N/A'}
Revenue by channel: ${mongo.revBySource?.join(' | ') || 'N/A'}
TOP PRODUCTS: ${mongo.topProducts?.join(' | ') || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚚 OPERATIONS & ORDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pending dispatch (not shipped): ${mongo.pendingDispatch ?? 0} — URGENT if > 0
Returns this month: ${mongo.returnedThisMonth ?? 0} (return rate: ${mongo.returnRate ?? 0}%)
Order status: ${JSON.stringify(mongo.orderStatusMap || {})}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧴 INVENTORY / PRODUCT LAB
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total products: ${mongo.totalProducts ?? 'N/A'}
LOW STOCK (urgent!): ${mongo.lowStockProducts?.join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌿 CONSULTATIONS & SPECIALISTS (Key Revenue Driver)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
PENDING (unattended leads!): ${mongo.pendingConsultations ?? 'N/A'}
Overdue 48h+ (CRITICAL — customer waiting): ${mongo.overdueConsultDetails?.length ?? 0}
  ${mongo.overdueConsultDetails?.join('\n  ') || 'None'}
Pending list (oldest first):
  ${mongo.pendingConsultDetails?.join('\n  ') || 'None'}
New consultations today: ${mongo.todayConsultations ?? 0}
Completion rate: ${mongo.consultCompRate ?? 0}% (${mongo.completedConsultations} of ${mongo.totalConsultations})
Total specialists: ${mongo.totalSpecialists ?? 'N/A'}
Skin profiles today: ${mongo.todaySkinProfiles ?? 0} | Total: ${mongo.totalSkinProfiles ?? 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 CRM / LEADS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total leads: ${crmSummary.total} | New today: ${crmSummary.newToday} | This week: ${crmSummary.newThisWeek}
Open leads (need follow-up): ${crmSummary.open} | Converted: ${crmSummary.converted}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 CUSTOMERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total users: ${mongo.totalUsers ?? 'N/A'} | New today: ${mongo.newUsersToday ?? 0} | New this week: ${mongo.newUsersWeek ?? 0}
AT-RISK (30+ days no reorder): ${mongo.atRiskCustomers ?? 0} — need retention campaign!

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 CALLING AGENT & COMMUNICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Calls this week: ${callStats.total} | Today: ${callStats.today}${callStats.noCallToday ? ' ⚠️ NO CALLS TODAY' : ''}
Connected: ${callStats.connected} | Failed: ${callStats.failed} | Connection rate: ${callRate}%
WhatsApp messages sent (week): ${waSummary.sent} | Today: ${waSummary.todaySent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 FINANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Expenses this month: ₹${totalExpenses.toLocaleString('en-IN')}
Pending partner withdrawals: ${partnerSummary.pendingWithdrawals} — need approval!
Return/refund amount this month: ${mongo.returnedThisMonth ?? 0} orders

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤝 PARTNERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Active partners: ${partnerSummary.total}
Pending withdrawal requests: ${partnerSummary.pendingWithdrawals}
Top partner: ${partnerSummary.topPartner}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 GOALS & OKR
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business goals setting: ${typeof goals === 'string' ? goals : JSON.stringify(goals)}
Goals from Goals page:
${goalsOKR.join('\n') || '  No goals set in Goals page yet'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 HR & TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total team: ${hrSummary.teamCount} | Specialists: ${hrSummary.specialistCount}
Pending leave requests: ${hrSummary.pendingLeaves} — needs manager approval
Pending payroll this month: ${hrSummary.pendingPayroll}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open support tickets: ${supportOpen.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL TASKS — BY DEPARTMENT (Supabase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${taskAreaLines || '  No tasks yet'}
BLOCKED: ${tasks.filter((t: any) => t.status === 'blocked').slice(0,5).map((t: any) => `[${t.area}] ${t.title} → ${t.assigned_role}`).join(' | ') || 'None'}
OVERDUE: ${tasks.filter((t: any) => t.due_date && t.status !== 'done' && new Date(t.due_date) < now).slice(0,5).map((t: any) => `[${t.area}] ${t.title} due:${t.due_date}`).join(' | ') || 'None'}
URGENT:  ${tasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'done').slice(0,5).map((t: any) => `[${t.area}] ${t.title} → ${t.assigned_role}`).join(' | ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 TEAM — PER PERSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${personLines || '  No team data'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AI AGENTS (8 agents)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connected: ${connected.join(', ') || 'None'}
DISCONNECTED: ${disconnected.join(' | ') || 'None — all good!'}
Partial: ${partial.join(' | ') || 'None'}
Missing keys: ${missingKeys.slice(0,6).join(', ') || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SECTIONS TO MONITOR (check each one)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dashboard | Calling Agent | Sales Agent | WhatsApp Agent | Retention Agent | Skin Analysis AI | Content Agent | Marketing AI | Specialist Panel | My Patients | Admin | Kanban | Calendar | Team Hub | Partner Portal | Vendor | Website Analytics | Customers | CRM/Leads | Orders | Inventory | Consultations | Skin Profiles | Specialists | Support | Communications | Reminders | Marketing | SEO | Social Automation | Video Studio | Content Studio | Ads Manager | Finance | Funnel Tracker | Revenue Flow | Product Lab | Goals & OKR | Reports | HR | Team | Automation | AI Agents | Knowledge Base | Settings

TODAY: ${todayISO}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ACTION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Pending consultations → urgent specialist follow-up task (mention customer wait time)
✦ pendingDispatch > 0 → urgent ops dispatch task
✦ At-risk customers > 0 → marketing retention campaign task
✦ No calls today → urgent sales calling task
✦ Low stock products → ops/procurement task
✦ Pending partner withdrawals → finance task to process
✦ Pending HR leaves → manager approval task
✦ Open CRM leads → sales follow-up task
✦ Open support tickets → support resolution task
✦ Disconnected AI agents → tech setup task
✦ Blocked tasks → manager unblock task
✦ Revenue down MoM → strategy task for manager
✦ Low consultation completion rate → specialist improvement task

Respond ONLY with valid JSON:
{
  "situation": "good|warning|critical",
  "analysis": "5 sentence analysis covering ALL major areas — use specific numbers and names",
  "areasMonitored": ["list all areas checked"],
  "perPersonSummary": [
    { "name": "name", "role": "role", "status": "on_track|needs_attention|critical", "whatTheyNeedToDo": "specific instruction", "pendingCount": 0 }
  ],
  "tasksToCreate": [
    { "title": "specific task", "description": "detailed with reason + customer name if relevant", "assigned_role": "specialist|ops|manager|marketing|sales|tech|finance|hr|support", "area": "Sales|Marketing|Operations|Specialist|Support|Finance|Tech|CRM|Content|HR|Partner|Product", "priority": "urgent|high|medium|low", "due_date": "YYYY-MM-DD", "ai_reason": "exact metric that triggered this" }
  ],
  "agentAlerts": [{ "agent": "name", "severity": "critical|warning", "action": "fix step" }],
  "goalProgress": [{ "goal": "text", "status": "on_track|behind|ahead|unknown", "insight": "data comment" }],
  "departmentScores": { "Sales": "good|warning|critical", "Operations": "good|warning|critical", "Consultations": "good|warning|critical", "Marketing": "good|warning|critical", "Finance": "good|warning|critical", "Team": "good|warning|critical", "Agents": "good|warning|critical", "HR": "good|warning|critical", "Partners": "good|warning|critical", "CRM": "good|warning|critical" },
  "whatsappReport": "Complete WhatsApp report with *bold*, emojis, and sections for each major area. Name people. End with top 3 action items for today.",
  "focusForToday": "Most critical single action with reason and data"
}`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let brain: any = null
    if (jsonMatch) { try { brain = JSON.parse(jsonMatch[0]) } catch { } }

    if (!brain) {
      brain = {
        situation: 'warning', analysis: text.slice(0, 500),
        areasMonitored: [], perPersonSummary: [], tasksToCreate: [],
        agentAlerts: [], goalProgress: [], departmentScores: {},
        whatsappReport: text.slice(0, 600),
        focusForToday: 'Review system — incomplete data',
      }
    }

    // AUTO-CREATE TASKS
    const createdTasks: any[] = []
    if (createTasks && brain.tasksToCreate?.length > 0) {
      for (const task of brain.tasksToCreate.slice(0, 12)) {
        const { data, error } = await supabase.from('rabt_tasks').insert({
          title: task.title,
          description: `${task.description}\n\n━━━━━━━━━━━━━━━━\n🤖 AI Auto-Created — ${now.toLocaleString('en-IN')}\n📊 Reason: ${task.ai_reason}`,
          assigned_role: task.assigned_role, area: task.area,
          priority: task.priority, due_date: task.due_date || null,
          status: 'pending', created_at: now.toISOString(),
        }).select().single()
        if (!error && data) createdTasks.push(data)
      }
    }

    // SEND WHATSAPP REPORTS
    const reportPhones = [
      ...(phones || []), ...(phone ? [phone] : []),
      ...(Array.isArray(schedule?.phones) ? schedule.phones : []),
    ].filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)

    let whatsappSent = 0
    if (sendReport && brain.whatsappReport && reportPhones.length > 0) {
      const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      for (const p of reportPhones) {
        try {
          await fetch(`${base}/api/send-whatsapp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: p, message: brain.whatsappReport }),
          })
          whatsappSent++
        } catch { }
      }
    }

    // SAVE RUN LOG
    await supabase.from('hq_settings').upsert({
      key: 'last_auto_run',
      value: { runAt: now.toISOString(), situation: brain.situation, tasksCreated: createdTasks.length, whatsappSent, focusForToday: brain.focusForToday, analysis: brain.analysis, departmentScores: brain.departmentScores || {}, areasMonitored: brain.areasMonitored || [] },
      updated_at: now.toISOString(),
    }).catch(() => {})

    return NextResponse.json({
      ...brain, createdTasks, whatsappSent,
      dataSnapshot: {
        tasks: taskStats, tasksByArea, calls: callStats, callConnectionRate: callRate,
        mongo, connectedAgents: agentsData?.summary?.connected || 0,
        totalAgents: agentsData?.summary?.total || 0, disconnectedCount: disconnected.length,
        crmLeads: crmSummary, hrSummary, partnerSummary,
        financeExpenses: Math.round(totalExpenses),
        goalsCount: sbGoals.length, supportOpen: supportOpen.length,
      },
      runAt: now.toISOString(),
    })
  } catch (e: any) {
    console.error('Auto-run error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
