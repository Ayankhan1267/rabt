import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const db = await getMongoDb()
    const ordersCol = db.collection('orders')

    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // ── 1. Monthly revenue last 6 months ─────────────────────────────────
    const monthlyRaw = await ordersCol.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          'payment.status': 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
          returns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'returned'] }, '$pricing.total', 0],
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]).toArray()

    const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthly = monthlyRaw.map(m => ({
      month: MONTH_NAMES[m._id.month],
      revenue: Math.round(m.revenue || 0),
      orders: m.orders || 0,
      returns: Math.round(m.returns || 0),
    }))

    // ── 2. Product breakdown (this month) ────────────────────────────────
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const productRaw = await ordersCol.aggregate([
      {
        $match: {
          createdAt: { $gte: thisMonthStart },
          'payment.status': 'paid',
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productSnapshot.name',
          category: { $first: '$items.productSnapshot.category' },
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price.final', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]).toArray()

    const products = productRaw
      .filter(p => p._id)
      .map(p => {
        const rev = Math.round(p.revenue || 0)
        const cogsRate = p.category === 'Bundles' ? 0.6 : 0.38
        const cogs = Math.round(rev * cogsRate)
        const margin = Math.round((1 - cogsRate) * 100)
        return {
          name: p._id || 'Unknown',
          category: p.category || 'Skincare',
          units: p.units || 0,
          revenue: rev,
          cogs,
          margin,
        }
      })

    // ── 3. Order sources (payment method → streams proxy) ────────────────
    const sourcesRaw = await ordersCol.aggregate([
      {
        $match: {
          createdAt: { $gte: thisMonthStart },
          'payment.status': 'paid',
        },
      },
      {
        $group: {
          _id: '$source',
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 },
        },
      },
    ]).toArray()

    const totalRevenue = sourcesRaw.reduce((s, r) => s + (r.revenue || 0), 0) || 1
    const streams = sourcesRaw.length > 0
      ? sourcesRaw.map(s => ({
          name: s._id || 'D2C Website',
          revenue: Math.round(s.revenue || 0),
          orders: s.orders || 0,
          pct: Math.round(((s.revenue || 0) / totalRevenue) * 100),
        })).sort((a, b) => b.revenue - a.revenue)
      : null

    // ── 4. This month totals ──────────────────────────────────────────────
    const thisMonth = monthly[monthly.length - 1] || { revenue: 0, orders: 0, returns: 0 }
    const lastMonth = monthly[monthly.length - 2] || { revenue: 0, orders: 0, returns: 0 }

    const growth = lastMonth.revenue > 0
      ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100)
      : 0

    // ── 5. HQ Operations data (Supabase) ──────────────────────────────────
    let hqData = null
    try {
      const [callRes, taskRes] = await Promise.all([
        supabase.from('rabt_call_logs').select('outcome, duration, created_at').gte('created_at', thisMonthStart.toISOString()),
        supabase.from('rabt_tasks').select('status, area, created_at').gte('created_at', thisMonthStart.toISOString()),
      ])

      const calls = callRes.data || []
      const tasks = taskRes.data || []

      const connectedCalls = calls.filter(c => ['connected', 'interested', 'follow_up'].includes(c.outcome || '')).length
      const completedTasks = tasks.filter(t => t.status === 'done').length
      const avgDuration = calls.length > 0
        ? Math.round(calls.reduce((s: number, c: any) => s + (c.duration || 0), 0) / calls.length)
        : 0

      const tasksByArea: Record<string, number> = {}
      tasks.forEach((t: any) => {
        const a = t.area || 'General'
        tasksByArea[a] = (tasksByArea[a] || 0) + 1
      })

      hqData = {
        totalCalls: calls.length,
        connectedCalls,
        callConnectionRate: calls.length > 0 ? Math.round((connectedCalls / calls.length) * 100) : 0,
        avgCallDuration: avgDuration,
        totalTasks: tasks.length,
        completedTasks,
        taskCompletionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        tasksByArea: Object.entries(tasksByArea).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
      }
    } catch { /* Supabase not configured */ }

    return NextResponse.json({
      monthly,
      products,
      streams,
      thisMonth,
      lastMonth,
      growth,
      hqData,
      dataSource: 'live',
    })
  } catch (e: any) {
    console.error('Revenue data error:', e.message)
    return NextResponse.json({ error: e.message, dataSource: 'error' }, { status: 500 })
  }
}
