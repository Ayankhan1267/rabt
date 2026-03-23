import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'

export async function GET() {
  try {
    const db = await getMongoDb()

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const consultationsCol = db.collection('consultations')
    const ordersCol = db.collection('orders')
    const usersCol = db.collection('users')

    // Run all counts in parallel
    const [
      totalConsultations,
      completedConsultations,
      pendingConsultations,
      totalOrders,
      paidOrders,
      totalUsers,
      recentUsers,
      recentOrders,
      recentConsultations,

      // This month
      thisMonthOrders,
      lastMonthOrders,

      // Channel breakdown
      ordersBySource,

      // Product performance
      topProducts,
    ] = await Promise.all([
      consultationsCol.countDocuments({}),
      consultationsCol.countDocuments({ status: 'completed' }),
      consultationsCol.countDocuments({ status: 'pending' }),
      ordersCol.countDocuments({}),
      ordersCol.countDocuments({ 'payment.status': 'paid' }),
      usersCol.countDocuments({}),
      usersCol.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      ordersCol.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, 'payment.status': 'paid' }),
      consultationsCol.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

      ordersCol.countDocuments({
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        'payment.status': 'paid',
      }),
      ordersCol.countDocuments({
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          $lt: new Date(now.getFullYear(), now.getMonth(), 1),
        },
        'payment.status': 'paid',
      }),

      ordersCol.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$source', count: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
        { $sort: { revenue: -1 } },
      ]).toArray(),

      ordersCol.aggregate([
        { $match: { 'payment.status': 'paid', createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productSnapshot.name', units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price.final', '$items.quantity'] } } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]).toArray(),
    ])

    // ── Build funnel steps from real data ──────────────────────────────────
    // Funnel: Registered Users → Consultation Started → Consultation Complete → Orders
    // We use totalUsers as the base for "entered funnel"
    const base = Math.max(totalUsers, totalConsultations * 5, 100) // estimate website visitors

    const funnelSteps = [
      {
        step: 1, name: 'Registered Users',
        count: totalUsers,
        pct: 100, drop: null, widthPct: 100, health: 'good',
      },
      {
        step: 2, name: 'Consultation Started',
        count: totalConsultations,
        pct: totalUsers > 0 ? Math.round((totalConsultations / totalUsers) * 100) : 0,
        drop: totalUsers > 0 ? Math.round(((totalUsers - totalConsultations) / totalUsers) * 100) : 0,
        widthPct: 82,
        health: (totalConsultations / Math.max(totalUsers, 1)) > 0.3 ? 'good' : 'warn',
      },
      {
        step: 3, name: 'Consultation Completed',
        count: completedConsultations,
        pct: totalUsers > 0 ? Math.round((completedConsultations / totalUsers) * 100) : 0,
        drop: totalConsultations > 0 ? Math.round(((totalConsultations - completedConsultations) / totalConsultations) * 100) : 0,
        widthPct: 65,
        health: (completedConsultations / Math.max(totalConsultations, 1)) > 0.5 ? 'good' : 'warn',
      },
      {
        step: 4, name: 'Orders Placed (Total)',
        count: totalOrders,
        pct: totalUsers > 0 ? Math.round((totalOrders / totalUsers) * 100) : 0,
        drop: completedConsultations > 0 ? Math.round(((completedConsultations - totalOrders) / completedConsultations) * 100) : 0,
        widthPct: 48,
        health: (totalOrders / Math.max(completedConsultations, 1)) > 0.3 ? 'good' : 'warn',
      },
      {
        step: 5, name: 'Paid Orders',
        count: paidOrders,
        pct: totalUsers > 0 ? Math.round((paidOrders / totalUsers) * 100) : 0,
        drop: totalOrders > 0 ? Math.round(((totalOrders - paidOrders) / totalOrders) * 100) : 0,
        widthPct: 34,
        health: (paidOrders / Math.max(totalOrders, 1)) > 0.7 ? 'good' : 'warn',
      },
    ]

    // ── Channel attribution ────────────────────────────────────────────────
    const channels = ordersBySource.map(s => ({
      channel: s._id || 'Direct',
      conversions: s.count || 0,
      revenue: Math.round(s.revenue || 0),
      visitors: Math.round((s.count || 0) * 8), // estimate
      cost: 0,
    }))

    // ── Recent activity (30 days) ─────────────────────────────────────────
    const recentMetrics = {
      newUsers: recentUsers,
      newConsultations: recentConsultations,
      newOrders: recentOrders,
      conversionRate: recentUsers > 0 ? ((recentOrders / recentUsers) * 100).toFixed(1) : '0',
    }

    // ── Month over month ──────────────────────────────────────────────────
    const orderGrowth = lastMonthOrders > 0
      ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
      : 0

    return NextResponse.json({
      funnelSteps,
      channels,
      recentMetrics,
      orderGrowth,
      topProducts: topProducts.filter(p => p._id).map(p => ({ name: p._id, units: p.units, revenue: Math.round(p.revenue || 0) })),
      summary: {
        totalUsers,
        totalConsultations,
        completedConsultations,
        totalOrders,
        paidOrders,
        pendingConsultations,
      },
      dataSource: 'live',
    })
  } catch (e: any) {
    console.error('Funnels data error:', e.message)
    return NextResponse.json({ error: e.message, dataSource: 'error' }, { status: 500 })
  }
}
